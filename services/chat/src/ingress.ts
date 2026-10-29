import { randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { ExchangeRequest, ExchangeIngressBinding, OwnerCommandBinding, OwnerCommandRef, OwnerAdmission, OwnerReference, OwnerContactBinding, OwnerMetadataSnapshot, OwnerIngressTouchpoint, OwnerTouchpointReceipt } from '@agentic-crm/contracts';
import { ExchangeError, OwnerError, ownerCanonical, ownerDigest, ownerFail, validateOwnerValue, validateExchangeValue, type WorkloadRoute } from '@agentic-crm/workload-transport';
import type { ChatOwnerCommands } from './owner-command.js';
import { diagnoseIngress, diagnosableIngressError, type IngressVerdictReader, type IngressDenial } from './ingress-denial.js';

type Accept = Extract<ExchangeRequest, { operation: 'ingress-accept' }>;
type Read = Extract<ExchangeRequest, { operation: 'ingress-read' }>;
type Channel = { connection_id: string; platform: 'mock_messenger'; connection_revision: '1'; channel_id: string; team_id: string; service_actor_id: string };
type RefInput = { command: OwnerCommandRef; kind: 'contact' | 'mapping' | 'connection' | 'metadata'; resource_id: string; expected_revision: string; reservation_id: null };
export type IngressEffect = (c: PoolConnection, binding: OwnerCommandBinding, intake: Accept['intake']) => Promise<{ conversation_id: string; message_id: string; duplicate: boolean; touchpoint_id?: string; session_id?: string | null }>;
export interface IngressPeers {
  contact(tenant: string, input: Record<string, unknown>): Promise<OwnerContactBinding>;
  channel(tenant: string, id: string): Promise<Channel>;
  reference(tenant: string, owner: 'crm' | 'connector', operation: 'reference-reserve' | 'reference-release', input: RefInput): Promise<OwnerReference>;
  admit(tenant: string, command: OwnerCommandRef): Promise<OwnerAdmission>;
  settle(tenant: string, command: OwnerCommandRef, admission: string): Promise<OwnerAdmission>;
  metadata?(tenant: string): Promise<OwnerMetadataSnapshot>;
  touchpoint?(tenant: string, operation: 'touchpoint-prepare' | 'touchpoint-finalize', command: OwnerCommandRef): Promise<OwnerTouchpointReceipt>;
  verdict?: IngressVerdictReader;
}
const parse = <T>(v: string | T): T => typeof v === 'string' ? JSON.parse(v) as T : v;
const kinds = ['contact', 'mapping', 'connection'] as const;
const slot = { contact: 'crm-contact', mapping: 'crm-mapping', connection: 'connector-connection', metadata: 'crm-metadata' } as const;
async function insertOnce(c: PoolConnection, sql: string, values: (string | number | null)[]) {
  try { await c.execute(sql, values); } catch (error) { if ((error as { code?: string }).code !== 'ER_DUP_ENTRY') throw error; }
}

export function canonicalIngress(raw: unknown): Accept {
  const request = validateExchangeValue<Accept>('ExchangeIngressAccept', raw);
  if (Buffer.byteLength(ownerCanonical(request)) > 98304 || Buffer.byteLength(ownerCanonical(request.intake)) > 65536) throw new ExchangeError('INVALID_REQUEST');
  const at = request.intake.occurred_at;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(at) || !Number.isFinite(Date.parse(at))) throw new ExchangeError('INVALID_REQUEST');
  const normalized = new Date(at).toISOString();
  if (normalized.slice(0, 19) !== at.slice(0, 19)) throw new ExchangeError('INVALID_REQUEST');
  request.intake.occurred_at = normalized;
  return request;
}

/** Accept/read wire stays stable; processing requires an explicitly supplied local lifecycle writer. */
export class ChatIngress {
  constructor(private readonly commands: ChatOwnerCommands, private readonly peers: IngressPeers, private readonly processor?: IngressEffect) {}

  private reference(binding: OwnerCommandBinding, command: OwnerCommandRef, kind: RefInput['kind']): RefInput {
    if (kind === 'metadata') return { command, kind, resource_id: binding.metadata!.object_type_id, expected_revision: binding.metadata!.schema_revision, reservation_id: null };
    const pin = binding.references!;
    return { command, kind, resource_id: kind === 'contact' ? pin.crm_contact_id : kind === 'mapping' ? pin.crm_identity_id : pin.connection_id,
      expected_revision: kind === 'contact' ? pin.contact_revision : kind === 'mapping' ? pin.mapping_revision : pin.connection_revision, reservation_id: null };
  }
  private async contactMutex(c: PoolConnection, tenant: string, contact: string) {
    await c.execute('INSERT INTO chat_ingress_contact_head(tenant_id,contact_id,created_at) VALUES (?,?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE contact_id=contact_id', [tenant, contact]);
    await c.execute('SELECT contact_id FROM chat_ingress_contact_head WHERE tenant_id=? AND contact_id=? FOR UPDATE', [tenant, contact]);
  }
  private async fence(c: PoolConnection, tenant: string, contact: string) {
    await this.contactMutex(c, tenant, contact);
    const [guards] = await c.execute<RowDataPacket[]>('SELECT state FROM chat_contact_guard WHERE tenant_id=? AND contact_id=? FOR SHARE', [tenant, contact]);
    if (guards[0] && guards[0].state !== 'released') ownerFail('REVOKED');
  }
  private async prepare(binding: ExchangeIngressBinding, subject: string, operation: 'ingress-accept' | 'ingress-receipt' | 'ingress-process', request: Record<string, unknown>, touchpoint?: OwnerIngressTouchpoint) {
    const tenant = binding.tenant_id;
    const [contact, channel] = await Promise.all([
      this.peers.contact(tenant, { connection_id: binding.connection_id, crm_contact_id: binding.crm_contact_id, crm_identity_id: binding.crm_identity_id, external_subject_id: subject }),
      this.peers.channel(tenant, binding.connection_id),
    ]);
    validateOwnerValue('OwnerContactBinding', contact);
    let metadata: OwnerMetadataSnapshot | undefined;
    if (operation === 'ingress-process') {
      if (!this.peers.metadata) ownerFail('DEPENDENCY_UNAVAILABLE');
      metadata = validateOwnerValue<OwnerMetadataSnapshot>('OwnerMetadataSnapshot', await this.peers.metadata(tenant));
      const { snapshot_digest, ...body } = metadata;
      if (metadata.tenant_id !== tenant || metadata.object_key !== 'conversation' || ownerDigest(body) !== snapshot_digest) ownerFail('FORBIDDEN');
    }
    if (contact.connection_id !== binding.connection_id || contact.crm_contact_id !== binding.crm_contact_id || contact.crm_identity_id !== binding.crm_identity_id || contact.external_subject_digest !== ownerDigest(subject) || contact.mapping_revision !== binding.mapping_revision || channel.connection_id !== binding.connection_id || channel.platform !== binding.platform) ownerFail('FORBIDDEN');
    const commandId = randomUUID();
    const proof = await this.commands.prepare({ tenant_id: tenant, command_id: commandId, owner: 'chat', operation,
      actor: { kind: 'service', principal_id: channel.service_actor_id, delegation_id: channel.service_actor_id },
      resource: { resource_id: commandId, object_key: 'conversation', record_version: '0', owner_revision: '0', control_revision: '0', owner_principal_id: null, team_id: channel.team_id, shared_team_ids: [], archived: false },
      target: null, session_id: null, fields: [], payload_digest: ownerDigest(request), legacy_receipt_key: operation + '/' + commandId, graph: null, dependencies: [],
      references: { ...contact, platform: channel.platform, connection_revision: channel.connection_revision },
      ingress_channel: { service_actor_id: channel.service_actor_id, team_id: channel.team_id, channel_id: channel.channel_id },
      ...(metadata ? { metadata: { object_type_id: metadata.object_type_id, schema_revision: metadata.schema_revision, snapshot_digest: metadata.snapshot_digest } } : {}),
      ...(touchpoint ? { ingress_touchpoint: touchpoint } : {}),
    }, request);
    return { proof, command: { command_id: commandId, binding_digest: proof.binding_digest } };
  }
  /** Explicit recovery of a lost ACK/interrupted attempt. Keeps holds on unknown remote outcome. */
  async recover(tenant: string, command: OwnerCommandRef) {
    let proof = await this.commands.proof(tenant, command);
    if (!('binding' in proof) || !proof.binding.ingress_channel || !['ingress-accept', 'ingress-receipt', 'ingress-process'].includes(proof.binding.operation)) ownerFail('FORBIDDEN');
    let admission = await this.commands.dependency(tenant, command, 'identity-admission') as OwnerAdmission | null;
    if (proof.state === 'prepared') {
      if (!admission) {
        try { admission = await this.peers.admit(tenant, command); await this.commands.rememberDependency(tenant, command, 'identity-admission', admission); }
        catch (error) { if (!['FORBIDDEN', 'REVOKED', 'REFERENCE_INVALID', 'INVALID_TRANSITION'].includes(String((error as { code?: string }).code))) throw error; }
      }
      await this.commands.abort(tenant, command); proof = await this.commands.proof(tenant, command);
    }
    if (proof.state === 'prepared' || !('binding' in proof)) ownerFail('DEPENDENCY_UNAVAILABLE');
    if (proof.binding.ingress_touchpoint) {
      if (!this.peers.touchpoint) ownerFail('DEPENDENCY_UNAVAILABLE');
      const receipt = validateOwnerValue<OwnerTouchpointReceipt>('OwnerTouchpointReceipt', await this.peers.touchpoint(tenant, 'touchpoint-finalize', command));
      const expected = proof.state === 'aborted' ? 'cancelled' : proof.ingress_result?.touchpoint_id ? 'bound' : 'discarded';
      if (receipt.id !== proof.binding.ingress_touchpoint.id || ownerCanonical(receipt.command) !== ownerCanonical(command) || receipt.state !== expected) ownerFail('FORBIDDEN');
    }
    const heldKinds: RefInput['kind'][] = [...kinds, ...(proof.binding.metadata ? ['metadata' as const] : [])];
    const releases = await Promise.allSettled(heldKinds.map(async kind => {
      try { await this.peers.reference(tenant, kind === 'connection' ? 'connector' : 'crm', 'reference-release', this.reference(proof.binding, command, kind)); }
      catch (error) { if ((error as { code?: string }).code !== 'NOT_FOUND') throw error; }
    }));
    for (const release of releases) if (release.status === 'rejected') throw release.reason;
    if (admission) await this.peers.settle(tenant, command, admission.admission_id);
  }
  private async run(binding: ExchangeIngressBinding, subject: string, operation: 'ingress-accept' | 'ingress-receipt' | 'ingress-process', payload: Record<string, unknown>, effect: (c: PoolConnection, proof: OwnerCommandBinding) => Promise<Record<string, unknown> & { receipt_id: string }>, signal?: AbortSignal, touchpoint?: OwnerIngressTouchpoint, onCommand?: (command: OwnerCommandRef) => void) {
    const { proof, command } = await this.prepare(binding, subject, operation, payload, touchpoint), tenant = binding.tenant_id;
    onCommand?.(command);
    try {
      const heldKinds: RefInput['kind'][] = [...kinds, ...(proof.binding.metadata ? ['metadata' as const] : [])];
      const reservations = await Promise.allSettled(heldKinds.map(async kind => {
        const input = this.reference(proof.binding, command, kind);
        const hold = validateOwnerValue<OwnerReference>('OwnerReference', await this.peers.reference(tenant, kind === 'connection' ? 'connector' : 'crm', 'reference-reserve', input));
        if (hold.state !== 'reserved' || hold.command_id !== command.command_id || hold.binding_digest !== command.binding_digest || hold.resource_id !== input.resource_id || hold.revision !== input.expected_revision) ownerFail('FORBIDDEN');
        await this.commands.rememberDependency(tenant, command, slot[kind], hold);
      }));
      for (const reservation of reservations) if (reservation.status === 'rejected') throw reservation.reason;
      const admission = validateOwnerValue<OwnerAdmission>('OwnerAdmission', await this.peers.admit(tenant, command));
      if (admission.command_id !== command.command_id || admission.binding_digest !== command.binding_digest || admission.state !== 'admitted' || admission.allowed_fields.length) ownerFail('FORBIDDEN');
      await this.commands.rememberDependency(tenant, command, 'identity-admission', admission);
      if (touchpoint) {
        if (!this.peers.touchpoint) ownerFail('DEPENDENCY_UNAVAILABLE');
        const receipt = validateOwnerValue<OwnerTouchpointReceipt>('OwnerTouchpointReceipt', await this.peers.touchpoint(tenant, 'touchpoint-prepare', command));
        if (receipt.id !== touchpoint.id || ownerCanonical(receipt.command) !== ownerCanonical(command) || receipt.state !== 'prepared') ownerFail('FORBIDDEN');
      }
      if (signal?.aborted) ownerFail('DEPENDENCY_UNAVAILABLE');
      await this.commands.commit(tenant, command, admission.admission_id, async c => {
        await this.fence(c, tenant, binding.crm_contact_id);
        const data = await effect(c, proof.binding); return { effect_id: data.receipt_id, effect_revision: '1', data };
      });
      await this.recover(tenant, command);
      return (await this.commands.result(tenant, command)).data as Record<string, unknown>;
    } catch (error) {
      // Unknown admission/SQL commit keeps the command for explicit recovery. Never guess absence.
      if (error instanceof OwnerError && error.code !== 'DEPENDENCY_UNAVAILABLE' || error instanceof ExchangeError && error.code !== 'DEPENDENCY_UNAVAILABLE') {
        try { await this.recover(tenant, command); } catch { /* Durable command/holds remain recoverable; preserve original rejection. */ }
      }
      throw error;
    }
  }
  /** Constrained local cleanup, never a successful business admission or public failure route. */
  private async recordDenial(request: Read, version: string, intake: Accept['intake'], denial: IngressDenial, command?: OwnerCommandRef) {
    const tenant = request.binding.tenant_id;
    await this.commands.transaction(tenant, async c => {
      await this.contactMutex(c, tenant, request.binding.crm_contact_id);
      const [[row]] = await c.execute<RowDataPacket[]>('SELECT state,version,binding_json,intake_json FROM chat_ingress_inbox WHERE tenant_id=? AND connection_id=? AND id=? FOR UPDATE', [tenant, request.binding.connection_id, request.receipt_id]);
      if (!row || row.state !== 'received' || String(row.version) !== version) return;
      if (ownerCanonical(parse(row.binding_json)) !== ownerCanonical(request.binding) || ownerDigest(parse(row.intake_json)) !== ownerDigest(intake)) ownerFail('CONFLICT');
      await c.execute("UPDATE chat_ingress_inbox SET state='failed',error_code=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?", [denial.error_code, tenant, request.receipt_id]);
      await c.execute(`INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,reason,correlation_id,occurred_at,created_at)
        VALUES (?,?,'system',?,'ingress.fail','chat_ingress_inbox',?,'denied',?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,
      [randomUUID(), tenant, tenant, request.receipt_id, ownerCanonical(['state', 'error_code']), ownerCanonical({ ...denial, receipt_version: version, intake_digest: ownerDigest(intake), command: command ?? null }), command?.command_id ?? request.request_id]);
    });
  }
  /** Caller-driven internal work. No new exchange route or autonomous worker. */
  async process(raw: unknown, signal?: AbortSignal): Promise<Record<string, unknown>> {
    const request = validateExchangeValue<Read>('ExchangeIngressRead', raw), tenant = request.binding.tenant_id;
    if (!this.processor) ownerFail('DEPENDENCY_UNAVAILABLE');
    const loaded = await this.commands.transaction(tenant, async c => {
      const [[row]] = await c.execute<RowDataPacket[]>('SELECT binding_json,intake_json,state,version FROM chat_ingress_inbox WHERE tenant_id=? AND connection_id=? AND id=?', [tenant, request.binding.connection_id, request.receipt_id]);
      if (!row || ownerCanonical(parse(row.binding_json)) !== ownerCanonical(request.binding)) throw new ExchangeError('NOT_FOUND');
      return { intake: parse<Accept['intake']>(row.intake_json), state: row.state as string, version: String(row.version) };
    });
    const initial = loaded.intake;
    if (initial.referral && !this.peers.touchpoint) ownerFail('DEPENDENCY_UNAVAILABLE');
    const touchpoint = initial.referral ? { id: randomUUID(), receipt_id: request.receipt_id, provider_message_digest: ownerDigest(initial.provider_message_id), occurred_at: initial.occurred_at, ad_id: initial.referral.ad_id ?? null, campaign_id: initial.referral.campaign_id ?? null } : undefined;
    let attempt: OwnerCommandRef | undefined;
    try { return await this.run(request.binding, initial.external_subject_id, 'ingress-process', { receipt_id: request.receipt_id, intake_digest: ownerDigest(initial) }, async (c, proof) => {
      const [[row]] = await c.execute<RowDataPacket[]>('SELECT state,conversation_id,message_id,duplicate,error_code FROM chat_ingress_inbox WHERE tenant_id=? AND id=? FOR UPDATE', [tenant, request.receipt_id]);
      if (!row) throw new ExchangeError('NOT_FOUND');
      if (row.state === 'received') {
        try {
          const result = await this.processor!(c, proof, initial);
          await c.execute("UPDATE chat_ingress_inbox SET state='processed',conversation_id=?,message_id=?,duplicate=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?", [result.conversation_id, result.message_id, Number(result.duplicate), tenant, request.receipt_id]);
          Object.assign(row, result, { state: 'processed' });
        } catch (error) {
          // The lifecycle writer raises payload conflict before any mutation.
          if (!(error instanceof IngressPayloadConflict)) throw error;
          await c.execute("UPDATE chat_ingress_inbox SET state='failed',error_code='MESSAGE_PAYLOAD_CONFLICT',version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?", [tenant, request.receipt_id]);
          Object.assign(row, { state: 'failed', error_code: 'MESSAGE_PAYLOAD_CONFLICT' });
        }
      }
      return { schema_version: 1, request_id: request.request_id, receipt_id: request.receipt_id, state: row.state,
        ...(row.touchpoint_id ? { touchpoint_id: row.touchpoint_id, session_id: row.session_id ?? null } : {}),
        ...(row.state === 'processed' ? { conversation_id: row.conversation_id, message_id: row.message_id, duplicate: Boolean(row.duplicate) } : { error_code: row.error_code }) };
    }, signal, touchpoint, command => { attempt = command; }); }
    catch (error) {
      if (loaded.state === 'received' && !signal?.aborted && this.peers.verdict && diagnosableIngressError(error)) {
        try {
          if (attempt) {
            await this.recover(tenant, attempt);
            if ((await this.commands.proof(tenant, attempt)).state !== 'aborted') throw error;
          }
          const denial = await diagnoseIngress(request.binding, initial.external_subject_id, this.peers.verdict);
          if (denial && !signal?.aborted) await this.recordDenial(request, loaded.version, initial, denial, attempt);
        } catch { /* Unknown cleanup, diagnostic or failure commit keeps durable state for a fresh retry. */ }
      }
      // Never disclose a receipt through failed current admission, including after failure was stored.
      throw error;
    }
  }
  async accept(raw: unknown, signal?: AbortSignal): Promise<Record<string, unknown>> {
    const request = canonicalIngress(raw), { binding, intake } = request, tenant = binding.tenant_id;
    const eventDigest = ownerDigest({ binding, intake }), requestDigest = ownerDigest(request);
    return this.run(binding, intake.external_subject_id, 'ingress-accept', { request_digest: requestDigest, event_digest: eventDigest }, async c => {
      const candidate = randomUUID();
      await c.execute(`INSERT INTO chat_ingress_inbox(tenant_id,id,connection_id,contact_id,identity_id,provider_event_id,event_digest,binding_json,intake_json,state,version,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,'received',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id`, [tenant, candidate, binding.connection_id, binding.crm_contact_id, binding.crm_identity_id, intake.provider_event_id, eventDigest, ownerCanonical(binding), ownerCanonical(intake)]);
      const [events] = await c.execute<RowDataPacket[]>('SELECT id,event_digest FROM chat_ingress_inbox WHERE tenant_id=? AND connection_id=? AND provider_event_id=? FOR UPDATE', [tenant, binding.connection_id, intake.provider_event_id]);
      const event = events[0]!;
      if (event.event_digest !== eventDigest) throw new ExchangeError('CONFLICT');
      await insertOnce(c, 'INSERT INTO chat_ingress_delivery(tenant_id,connection_id,source_delivery_id,receipt_id,event_digest,created_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))', [tenant, binding.connection_id, request.source_delivery_id, event.id, eventDigest]);
      const [[alias]] = await c.execute<RowDataPacket[]>('SELECT receipt_id,event_digest FROM chat_ingress_delivery WHERE tenant_id=? AND connection_id=? AND source_delivery_id=? FOR SHARE', [tenant, binding.connection_id, request.source_delivery_id]);
      if (alias!.receipt_id !== event.id || alias!.event_digest !== eventDigest) throw new ExchangeError('CONFLICT');
      await insertOnce(c, "INSERT INTO chat_ingress_request(tenant_id,connection_id,operation,request_id,receipt_id,request_digest,created_at) VALUES (?,?,'ingress-accept',?,?,?,UTC_TIMESTAMP(6))", [tenant, binding.connection_id, request.request_id, event.id, requestDigest]);
      const [[prior]] = await c.execute<RowDataPacket[]>("SELECT receipt_id,request_digest FROM chat_ingress_request WHERE tenant_id=? AND connection_id=? AND operation='ingress-accept' AND request_id=? FOR SHARE", [tenant, binding.connection_id, request.request_id]);
      if (prior!.receipt_id !== event.id || prior!.request_digest !== requestDigest) throw new ExchangeError('CONFLICT');
      return { schema_version: 1, request_id: request.request_id, receipt_id: event.id as string, state: 'received' };
    }, signal);
  }
  async read(raw: unknown, signal?: AbortSignal): Promise<Record<string, unknown>> {
    const request = validateExchangeValue<Read>('ExchangeIngressRead', raw), tenant = request.binding.tenant_id;
    if (Buffer.byteLength(ownerCanonical(request)) > 16384) throw new ExchangeError('INVALID_REQUEST');
    const initial = await this.commands.transaction(tenant, async c => {
      const [rows] = await c.execute<RowDataPacket[]>('SELECT binding_json,intake_json FROM chat_ingress_inbox WHERE tenant_id=? AND connection_id=? AND id=?', [tenant, request.binding.connection_id, request.receipt_id]);
      if (!rows[0] || ownerCanonical(parse(rows[0].binding_json)) !== ownerCanonical(request.binding)) throw new ExchangeError('NOT_FOUND'); return rows[0];
    });
    return this.run(request.binding, parse<Accept['intake']>(initial.intake_json).external_subject_id, 'ingress-receipt', { receipt_id: request.receipt_id }, async c => {
      const digest = ownerDigest(request);
      await insertOnce(c, "INSERT INTO chat_ingress_request(tenant_id,connection_id,operation,request_id,receipt_id,request_digest,created_at) VALUES (?,?,'ingress-read',?,?,?,UTC_TIMESTAMP(6))", [tenant, request.binding.connection_id, request.request_id, request.receipt_id, digest]);
      const [[prior]] = await c.execute<RowDataPacket[]>("SELECT receipt_id,request_digest FROM chat_ingress_request WHERE tenant_id=? AND connection_id=? AND operation='ingress-read' AND request_id=? FOR SHARE", [tenant, request.binding.connection_id, request.request_id]);
      if (prior!.receipt_id !== request.receipt_id || prior!.request_digest !== digest) throw new ExchangeError('CONFLICT');
      const [[row]] = await c.execute<RowDataPacket[]>('SELECT state,conversation_id,message_id,duplicate,error_code FROM chat_ingress_inbox WHERE tenant_id=? AND connection_id=? AND id=? FOR SHARE', [tenant, request.binding.connection_id, request.receipt_id]);
      if (!row) throw new ExchangeError('NOT_FOUND');
      return { schema_version: 1, request_id: request.request_id, receipt_id: request.receipt_id, state: row.state,
        ...(row.state === 'processed' ? { conversation_id: row.conversation_id, message_id: row.message_id, duplicate: Boolean(row.duplicate) } : {}), ...(row.state === 'failed' ? { error_code: row.error_code } : {}) };
    }, signal);
  }
}

export class IngressPayloadConflict extends Error {}

export function chatIngressRoutes(ingress: ChatIngress): Record<string, WorkloadRoute> {
  return Object.fromEntries(['ingress-accept', 'ingress-read'].map(operation => ['/internal/v1/chat-exchange/' + operation, {
    callers: ['connector'], bodyLimit: operation === 'ingress-accept' ? 98304 : 16384,
    validate(value: Record<string, unknown>) {
      const r = validateExchangeValue<Accept | Read>(operation === 'ingress-accept' ? 'ExchangeIngressAccept' : 'ExchangeIngressRead', value);
      return { tenant_id: r.binding.tenant_id, request_id: r.request_id };
    },
    async handle(value: Record<string, unknown>, _peer: unknown, signal: AbortSignal) {
      try {
        const result = operation === 'ingress-accept' ? await ingress.accept(value, signal) : await ingress.read(value, signal);
        return validateExchangeValue<Record<string, unknown>>('ExchangeIngressReply', result);
      } catch (error) {
        if (error instanceof OwnerError) {
          if (['REFERENCE_INVALID', 'STALE_VERSION', 'CONFLICT'].includes(error.code)) throw new ExchangeError('CONFLICT');
          if (['FORBIDDEN', 'REVOKED', 'NOT_FOUND', 'INVALID_TRANSITION', 'INVALID_REQUEST'].includes(error.code)) throw new ExchangeError(error.code as 'FORBIDDEN');
          throw new ExchangeError('DEPENDENCY_UNAVAILABLE');
        }
        throw error;
      }
    },
  }]));
}
