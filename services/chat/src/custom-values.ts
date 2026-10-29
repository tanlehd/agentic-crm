import { randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { OwnerActor, OwnerAdmission, OwnerCommandBinding, OwnerCommandProof, OwnerCommandRef, OwnerCustomProperty, OwnerMetadataSnapshot, OwnerReference, OwnerResource } from '@agentic-crm/contracts';
import { nextOwnerCounter, ownerCanonical, ownerCounter, ownerDigest, ownerFail, ownerRoute, validateOwnerValue, type WorkloadRoute } from '@agentic-crm/workload-transport';
import { ChatOwnerCommands } from './owner-command.js';
import { advanceOwnershipDatasets } from './ownership-effects.js';
import {recordProjection,recordStandardFields,readableValues} from './record-projection.js';

export type CustomValuesInput = { schema_version: 1; request_id: string; correlation_id: string; tenant_id: string; operation: 'custom-values-patch';
  actor: OwnerActor; command_id: string; payload: { conversation_id: string; expected_version: string; schema_revision: string; hydrate_record?:true; input: { fields?: Record<string, unknown>; custom_values?: Record<string, unknown> } } };
export type CustomValuesPeers = {
  metadata(tenant: string, revision: string|null): Promise<OwnerMetadataSnapshot>;
  reserve(tenant: string, command: OwnerCommandRef, snapshot: OwnerMetadataSnapshot): Promise<OwnerReference>;
  release(tenant: string, command: OwnerCommandRef, snapshot: OwnerMetadataSnapshot): Promise<unknown>;
  admit(tenant: string, command: OwnerCommandRef): Promise<OwnerAdmission>;
  settle(tenant: string, command: OwnerCommandRef, admission: string): Promise<unknown>;
};
const parse = <T>(v: string | T): T => typeof v === 'string' ? JSON.parse(v) as T : v;

/** Matches the existing CRM scalar semantics. No authority is inferred from schema metadata. */
export function customPropertyValue(property: OwnerCustomProperty, value: unknown): string | number | boolean {
  let valid = false;
  switch (property.type) {
    case 'string': case 'text': valid = typeof value === 'string' && value.length <= (property.type === 'text' ? 4000 : 255); break;
    case 'integer': valid = Number.isSafeInteger(value); break;
    case 'decimal': valid = typeof value === 'string' && /^-?(?:0|[1-9]\d{0,13})(?:\.\d{1,6})?$/.test(value); break;
    case 'boolean': valid = typeof value === 'boolean'; break;
    case 'enum': valid = typeof value === 'string' && Boolean(property.options?.includes(value)); break;
    case 'date': valid = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '1000-01-01' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value; break;
    case 'datetime': valid = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) && value >= '1000-01-01' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 19) === value.slice(0, 19); break;
  }
  if (!valid) ownerFail('INVALID_REQUEST');
  return property.type === 'datetime' ? new Date(value as string).toISOString() : value as string | number | boolean;
}

function metadataSnapshot(raw: OwnerMetadataSnapshot, tenant: string, revision: string) {
  const snapshot = validateOwnerValue<OwnerMetadataSnapshot>('OwnerMetadataSnapshot', raw);
  const { snapshot_digest: digest, ...body } = snapshot;
  if (snapshot.tenant_id !== tenant || snapshot.object_key !== 'conversation' || snapshot.schema_revision !== revision || ownerDigest(body) !== digest) ownerFail('FORBIDDEN');
  ownerCounter(snapshot.schema_revision, true);
  if (new Set(snapshot.properties.map(p => p.key)).size !== snapshot.properties.length || new Set(snapshot.properties.map(p => p.id)).size !== snapshot.properties.length) ownerFail('INVALID_REQUEST');
  for (const p of snapshot.properties) {
    ownerCounter(p.version, true);
    if (p.type === 'text' && p.indexed || p.type === 'enum' && (!p.options?.length || new Set(p.options).size !== p.options.length) || p.type !== 'enum' && p.options !== null) ownerFail('INVALID_REQUEST');
  }
  return snapshot;
}

/** Candidate application port. Full generic record response/public routing is composed separately. */
export class ChatCustomValues {
  constructor(private readonly commands: ChatOwnerCommands, private readonly peers: CustomValuesPeers) {}

  private async snapshot(c: PoolConnection, tenant: string, id: string) {
    const [rows] = await c.execute<RowDataPacket[]>(`SELECT r.*,h.control_revision,h.registry_revision FROM crm_record r
      JOIN conversation v ON v.tenant_id=r.tenant_id AND v.record_id=r.id
      JOIN chat_control_head h ON h.tenant_id=r.tenant_id AND h.conversation_id=r.id WHERE r.tenant_id=? AND r.id=? FOR UPDATE`, [tenant, id]);
    const row = rows[0]; if (!row || row.archived_at !== null) ownerFail('NOT_FOUND');
    const [teams] = await c.execute<RowDataPacket[]>('SELECT team_id FROM record_team_access WHERE tenant_id=? AND record_id=? ORDER BY team_id FOR UPDATE', [tenant, id]);
    const resource: OwnerResource = { resource_id: id, object_key: 'conversation', record_version: String(row.version), owner_revision: String(row.owner_revision), control_revision: String(row.control_revision), owner_principal_id: row.owner_principal_id, team_id: row.team_id, shared_team_ids: teams.map(t => String(t.team_id)), archived: false };
    return { resource, object: String(row.object_type_id), values: parse<Record<string, unknown>>(row.custom_values), registry: String(row.registry_revision) };
  }

  async prepare(raw: CustomValuesInput): Promise<OwnerCommandProof> {
    const input = validateOwnerValue<CustomValuesInput>('Request_chat-custom-values-patch', raw);
    if (input.actor.kind !== 'human') ownerFail('FORBIDDEN');
    ownerCounter(input.payload.expected_version, true); ownerCounter(input.payload.schema_revision, true);
    if (Object.keys(input.payload.input.fields ?? {}).length || !input.payload.input.custom_values || !Object.keys(input.payload.input.custom_values).length) ownerFail('INVALID_REQUEST');
    const fields = Object.keys(input.payload.input.custom_values).sort();
    const previous = await this.commands.existing(input.tenant_id, input.command_id);
    if (previous) {
      if (!('binding' in previous) || previous.state === 'aborted') ownerFail('INVALID_TRANSITION');
      const original = await this.commands.request(input.tenant_id, { command_id: input.command_id, binding_digest: previous.binding_digest });
      if (previous.binding.operation !== input.operation || previous.binding.actor.kind !== input.actor.kind || previous.binding.actor.principal_id !== input.actor.principal_id || ownerDigest(original.payload) !== ownerDigest(input.payload)) ownerFail('CONFLICT');
      return previous;
    }
    const metadata = metadataSnapshot(await this.peers.metadata(input.tenant_id, input.payload.schema_revision), input.tenant_id, input.payload.schema_revision);
    const snapshot = await this.commands.transaction(input.tenant_id, c => this.snapshot(c, input.tenant_id, input.payload.conversation_id));
    if (snapshot.resource.record_version !== input.payload.expected_version) ownerFail('STALE_VERSION');
    if (snapshot.object !== metadata.object_type_id) ownerFail('REFERENCE_INVALID');
    const proposed=this.merge(metadata, snapshot.values, input.payload.input.custom_values);
    const readFields=input.payload.hydrate_record?[...new Set([...recordStandardFields,...Object.keys(proposed)])].sort():undefined;
    if(readFields&&readFields.length>200)ownerFail('LIMIT_EXCEEDED');
    const request = { payload: input.payload, metadata };
    const binding: OwnerCommandBinding = { tenant_id: input.tenant_id, command_id: input.command_id, owner: 'chat', operation: input.operation, actor: input.actor,
      resource: snapshot.resource, target: null, session_id: null, fields, payload_digest: ownerDigest(request),
      legacy_receipt_key: 'custom-values:' + input.command_id, graph: null, dependencies: [],
      metadata: { object_type_id: metadata.object_type_id, schema_revision: metadata.schema_revision, snapshot_digest: metadata.snapshot_digest },
      ...(readFields?{record_read_fields:readFields}:{}) };
    try { return await this.commands.prepare(binding, request); }
    catch (error) {
      if ((error as { code?: string }).code === 'CONFLICT' && await this.commands.existing(input.tenant_id, input.command_id)) return this.prepare(input);
      throw error;
    }
  }

  private merge(metadata: OwnerMetadataSnapshot, old: Record<string, unknown>, patch: Record<string, unknown>) {
    const result = { ...old };
    for (const [key, value] of Object.entries(patch)) {
      const p = metadata.properties.find(p => p.key === key); if (!p) ownerFail('INVALID_REQUEST');
      if (value === null) { if (p.required) ownerFail('INVALID_REQUEST'); delete result[key]; }
      else Object.defineProperty(result, key, { value: customPropertyValue(p, value), enumerable: true, writable: true, configurable: true });
    }
    for (const p of metadata.properties) if (p.required && (!Object.hasOwn(result, p.key) || result[p.key] === null)) ownerFail('INVALID_REQUEST');
    if (Buffer.byteLength(ownerCanonical(result)) > 262144) ownerFail('LIMIT_EXCEEDED');
    return result;
  }

  async execute(tenant: string, command: OwnerCommandRef) {
    const proof = await this.commands.proof(tenant, command);
    if (!('binding' in proof) || proof.binding.operation !== 'custom-values-patch' || !proof.binding.metadata || proof.state === 'aborted') ownerFail('INVALID_TRANSITION');
    const request = await this.commands.request(tenant, command);
    const payload = request.payload as CustomValuesInput['payload'];
    const metadata = metadataSnapshot(request.metadata as OwnerMetadataSnapshot, tenant, proof.binding.metadata.schema_revision);
    if (metadata.object_type_id !== proof.binding.metadata.object_type_id || metadata.snapshot_digest !== proof.binding.metadata.snapshot_digest) ownerFail('CONFLICT');
    let admission = await this.commands.dependency(tenant, command, 'identity-admission') as OwnerAdmission | null;
    try {
      if (proof.state === 'committed') {
        if (!admission) ownerFail('DEPENDENCY_UNAVAILABLE');
        await this.peers.release(tenant, command, metadata); await this.peers.settle(tenant, command, admission.admission_id);
        return proof;
      }
      const reservation = validateOwnerValue<OwnerReference>('OwnerReference', await this.commands.dependency(tenant, command, 'crm-metadata') ?? await this.peers.reserve(tenant, command, metadata));
      if (reservation.command_id !== command.command_id || reservation.binding_digest !== command.binding_digest || reservation.resource_id !== metadata.object_type_id || reservation.revision !== metadata.schema_revision || reservation.state !== 'reserved') ownerFail('FORBIDDEN');
      await this.commands.rememberDependency(tenant, command, 'crm-metadata', reservation);
      admission = validateOwnerValue<OwnerAdmission>('OwnerAdmission', admission ?? await this.peers.admit(tenant, command));
      if (admission.command_id !== command.command_id || admission.binding_digest !== command.binding_digest || admission.state !== 'admitted' ||
          (proof.binding.record_read_fields ? admission.allowed_fields.some(f=>!proof.binding.record_read_fields!.includes(f)) : ownerCanonical([...admission.allowed_fields].sort()) !== ownerCanonical(proof.binding.fields))) ownerFail('FORBIDDEN');
      await this.commands.rememberDependency(tenant, command, 'identity-admission', admission);
      const committed = await this.commands.commit(tenant, command, admission.admission_id, async (c, binding) => {
        const live = await this.snapshot(c, tenant, binding.resource.resource_id);
        if (ownerCanonical(live.resource) !== ownerCanonical(binding.resource) || live.object !== metadata.object_type_id) ownerFail('STALE_VERSION');
        const values = this.merge(metadata, live.values, payload.input.custom_values!);
        const version = nextOwnerCounter(live.resource.record_version);
        await c.execute('UPDATE crm_record SET custom_values=?,version=?,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?', [ownerCanonical(values), version, tenant, binding.resource.resource_id]);
        await c.execute('DELETE FROM property_index_value WHERE tenant_id=? AND record_id=?', [tenant, binding.resource.resource_id]);
        for (const p of metadata.properties) if (p.indexed && Object.hasOwn(values, p.key) && values[p.key] !== null) {
          const value = customPropertyValue(p, values[p.key]), kind = p.type === 'enum' ? 'string' : p.type;
          if (kind === 'text') ownerFail('INVALID_REQUEST');
          await c.execute('INSERT INTO property_index_value(tenant_id,record_id,property_id,value_kind,' + kind + '_value) VALUES (?,?,?,?,?)',
            [tenant, binding.resource.resource_id, p.id, kind, kind === 'datetime' ? (value as string).replace('T', ' ').replace('Z', '') : kind === 'boolean' ? (value ? 1 : 0) : value]);
        }
        await c.execute('UPDATE chat_control_head SET registry_revision=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND conversation_id=?', [nextOwnerCounter(live.registry), tenant, binding.resource.resource_id]);
        await c.execute(`INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,correlation_id,occurred_at,created_at)
          VALUES (?,?,'human',?,'records.patch','conversation',?,'accepted',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, [randomUUID(), tenant, binding.actor.principal_id, binding.resource.resource_id, ownerCanonical(binding.fields), binding.command_id]);
        await advanceOwnershipDatasets(c, tenant);
        const fields=binding.record_read_fields?readableValues((await recordProjection(c,tenant,binding.resource.resource_id)).fields,admission!.allowed_fields):{};
        return { effect_id: binding.resource.resource_id, effect_revision: version,
          data: { id: binding.resource.resource_id, tenant_id: tenant, object_key: 'conversation', version, owner_revision: live.resource.owner_revision,
            owner_principal_id: live.resource.owner_principal_id, team_id: live.resource.team_id, archived: false, fields, custom_values: binding.record_read_fields?readableValues(values,admission!.allowed_fields):values } };
      });
      await this.peers.release(tenant, command, metadata); await this.peers.settle(tenant, command, admission.admission_id);
      return committed;
    } catch (error) {
      if (['INVALID_TRANSITION', 'CONFLICT', 'FORBIDDEN'].includes((error as { code?: string }).code ?? '')) {
        // A concurrent same-key request can commit while this one awaits a remote receipt.
        const terminal = await this.commands.proof(tenant, command);
        if (terminal.state === 'committed') {
          const storedAdmission = await this.commands.dependency(tenant, command, 'identity-admission') as OwnerAdmission | null;
          if (!storedAdmission) ownerFail('DEPENDENCY_UNAVAILABLE');
          await this.peers.release(tenant, command, metadata); await this.peers.settle(tenant, command, storedAdmission.admission_id);
          return terminal;
        }
      }
      try { await this.commands.abort(tenant, command); await this.peers.release(tenant, command, metadata); if (admission) await this.peers.settle(tenant, command, admission.admission_id); } catch { /* Retained command/dependencies remain available to owner drain/recovery. */ }
      throw error;
    }
  }

  /** Returns the immutable custom-field result only after a fresh Identity admission and local ACL CAS. */
  async readReceipt(tenant: string, command: OwnerCommandRef, actorInput: OwnerActor, correlation: string) {
    const actor = validateOwnerValue<OwnerActor>('OwnerActor', actorInput), original = await this.commands.proof(tenant, command);
    if (!('binding' in original) || original.state !== 'committed' || original.binding.operation !== 'custom-values-patch') ownerFail('INVALID_TRANSITION');
    if (actor.kind !== 'human' || original.binding.actor.kind !== actor.kind || original.binding.actor.principal_id !== actor.principal_id) ownerFail('FORBIDDEN');
    const stored = await this.commands.result(tenant, command), data = stored.data as Record<string, unknown> | undefined;
    if (!data) ownerFail('DEPENDENCY_UNAVAILABLE');
    const response = validateOwnerValue<{ result: { data: Record<string, unknown>; meta: { correlation_id: string } } }>('Reply_chat-custom-values-patch', {
      schema_version: 1, request_id: randomUUID(), tenant_id: tenant, result: { data, meta: { correlation_id: correlation } },
    }).result;
    const live = await this.commands.transaction(tenant, c => this.snapshot(c, tenant, original.binding.resource.resource_id));
    const id = randomUUID(), request = { original: command, result_digest: ownerDigest(data) };
    const binding: OwnerCommandBinding = { tenant_id: tenant, command_id: id, owner: 'chat', operation: 'custom-values-receipt', actor,
      resource: live.resource, target: null, session_id: null, fields: [...new Set([...Object.keys(data.custom_values as Record<string, unknown>),...Object.keys(data.fields as Record<string,unknown>)])].sort(),
      payload_digest: ownerDigest(request), legacy_receipt_key: 'custom-values-receipt:' + id, graph: null, dependencies: [] };
    const prepared = await this.commands.prepare(binding, request), ref = { command_id: id, binding_digest: prepared.binding_digest };
    let admission: OwnerAdmission | undefined;
    try {
      admission = validateOwnerValue<OwnerAdmission>('OwnerAdmission', await this.peers.admit(tenant, ref));
      if (admission.command_id !== id || admission.binding_digest !== ref.binding_digest || admission.state !== 'admitted' || ownerCanonical([...admission.allowed_fields].sort()) !== ownerCanonical(binding.fields)) ownerFail('FORBIDDEN');
      await this.commands.rememberDependency(tenant, ref, 'identity-admission', admission);
      await this.commands.commit(tenant, ref, admission.admission_id, async c => {
        if (ownerCanonical((await this.snapshot(c, tenant, live.resource.resource_id)).resource) !== ownerCanonical(live.resource)) ownerFail('STALE_VERSION');
        return { effect_id: live.resource.resource_id, effect_revision: live.resource.record_version };
      });
      await this.peers.settle(tenant, ref, admission.admission_id);
      return response;
    } catch (error) {
      try { await this.commands.abort(tenant, ref); if (admission) await this.peers.settle(tenant, ref, admission.admission_id); } catch { /* Native Identity drain retains responsibility. */ }
      throw error;
    }
  }
}

/** Private CRM adapter. Public generic Conversation hydration is a separate T05 boundary. */
export function chatCustomValuesRoutes(values: ChatCustomValues): Record<string, WorkloadRoute> {
  return { '/internal/v1/owners/chat/custom-values-patch': ownerRoute('chat', 'custom-values-patch', ['crm'], async request => {
    const input = request as CustomValuesInput, prepared = await values.prepare(input);
    const command = { command_id: prepared.binding.command_id, binding_digest: prepared.binding_digest };
    await values.execute(input.tenant_id, command);
    return values.readReceipt(input.tenant_id, command, input.actor, input.correlation_id);
  }) };
}
