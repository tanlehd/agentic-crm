import { randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { OwnerActor, OwnerAdmission, OwnerCapacity, OwnerCommandBinding, OwnerCommandProof, OwnerCommandRef, OwnerResource, OwnerTarget } from '@agentic-crm/contracts';
import { ownerCanonical, ownerCounter, ownerDigest, ownerFail, nextOwnerCounter, validateOwnerValue } from '@agentic-crm/workload-transport';
import { ChatOwnerCommands } from './owner-command.js';
import { ownershipActivity, localEvent, ownershipControlEvent, advanceOwnershipDatasets } from './ownership-effects.js';
import { closeOwnership } from './ownership-close.js';
import type {TransitionResponse} from './transition-receipt.js';

export type AssignmentInput = {
  schema_version: 1; request_id: string; correlation_id: string; tenant_id: string;
  operation: 'routing-assignment' | 'routing-takeover'; actor: OwnerActor; command_id: string;
  payload: { id: string; body: { owner_principal_id?: string | null; team_id?: string | null; reason: string }; expected_version: string | null; idempotency_key: string };
};
export type CloseInput = Omit<AssignmentInput, 'operation' | 'payload'> & {
  operation: 'conversation-post-conversations-id-transition';
  payload: { id: string; body: { target_status: 'open' | 'pending' | 'closed'; reason: string }; expected_version: string | null; idempotency_key: string };
};
export type OwnershipPeers = {
  // All methods are authenticated owner adapters, never client-supplied callbacks.
  admit(tenant: string, command: OwnerCommandRef): Promise<OwnerAdmission>;
  reserve(tenant: string, command: OwnerCommandRef, session: string): Promise<OwnerCapacity>;
  settle(tenant: string, command: OwnerCommandRef, admission: string): Promise<void>;
  confirm(tenant: string, command: OwnerCommandRef, reservation: string): Promise<void>;
};
type Snapshot = { resource: OwnerResource; session: string; status: string; registryRevision: string };

export async function chatOwnershipSnapshot(c: PoolConnection, tenant: string, id: string): Promise<Snapshot> {
  const [records] = await c.execute<RowDataPacket[]>(`SELECT r.*,v.status,h.control_revision,h.registry_revision
    FROM crm_record r JOIN conversation v ON v.tenant_id=r.tenant_id AND v.record_id=r.id
    JOIN chat_control_head h ON h.tenant_id=r.tenant_id AND h.conversation_id=r.id
    WHERE r.tenant_id=? AND r.id=? FOR UPDATE`, [tenant, id]);
  const record = records[0];
  if (!record) ownerFail('NOT_FOUND');
  const [teams] = await c.execute<RowDataPacket[]>('SELECT team_id FROM record_team_access WHERE tenant_id=? AND record_id=? ORDER BY team_id FOR UPDATE', [tenant, id]);
  const [episodes] = await c.execute<RowDataPacket[]>("SELECT id FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=? AND status='active' FOR UPDATE", [tenant, id]);
  if (episodes.length !== 1 || record.status === 'closed' || record.archived_at !== null) ownerFail('INVALID_TRANSITION');
  return {
    resource: { resource_id: id, object_key: 'conversation', record_version: String(record.version), owner_revision: String(record.owner_revision),
      control_revision: String(record.control_revision), owner_principal_id: record.owner_principal_id, team_id: record.team_id,
      shared_team_ids: teams.map(row => String(row.team_id)), archived: false },
    session: String(episodes[0]!.id), status: String(record.status), registryRevision: String(record.registry_revision),
  };
}

/** Candidate application composition. No public controller/main binding is enabled here. */
export class ChatOwnership {
  constructor(private readonly commands: ChatOwnerCommands, private readonly peers: OwnershipPeers) {}

  /** Ownership part of transition. Full public response assembly belongs to workspace composition. */
  async prepareClose(input: CloseInput, resolveKind: (tenant: string, principal: string | null) => Promise<OwnerTarget['kind']>, publicResponse?: TransitionResponse) {
    const request = validateOwnerValue<CloseInput>('Request_chat-conversation-post-conversations-id-transition', input);
    if (request.actor.kind !== 'human') ownerFail('FORBIDDEN');
    if (request.payload.body.target_status !== 'closed') ownerFail('INVALID_TRANSITION');
    if (request.payload.expected_version === null) ownerFail('PRECONDITION_REQUIRED');
    ownerCounter(request.payload.expected_version, true);
    const prior = await this.commands.existing(request.tenant_id, request.command_id);
    if (prior) {
      if (!('binding' in prior) || prior.state === 'aborted') ownerFail('INVALID_TRANSITION');
      const sameActor = prior.binding.actor.kind === request.actor.kind && prior.binding.actor.principal_id === request.actor.principal_id;
      const saved=await this.commands.request(request.tenant_id,{command_id:request.command_id,binding_digest:prior.binding_digest});
      const {public_response:response,...payload}=saved;
      if (prior.binding.operation !== 'conversation-close' || !sameActor || ownerDigest(payload) !== ownerDigest(request.payload) || Boolean(response)!==Boolean(publicResponse)) ownerFail('CONFLICT');
      return prior;
    }
    const snapshot = await this.commands.transaction(request.tenant_id, c => chatOwnershipSnapshot(c, request.tenant_id, request.payload.id));
    if (snapshot.resource.record_version !== request.payload.expected_version) ownerFail('STALE_VERSION');
    const principal = snapshot.resource.owner_principal_id;
    const kind = await resolveKind(request.tenant_id, principal);
    if ((principal === null) !== (kind === null)) ownerFail('FORBIDDEN');
    const payload={...request.payload,...(publicResponse?{public_response:publicResponse}:{})};
    const binding: OwnerCommandBinding = {
      tenant_id: request.tenant_id, command_id: request.command_id, owner: 'chat', operation: 'conversation-close', actor: request.actor,
      resource: snapshot.resource, target: { principal_id: principal, team_id: snapshot.resource.team_id, kind }, session_id: snapshot.session,
      fields: ['status'], payload_digest: ownerDigest(payload), legacy_receipt_key: `POST /api/v1/conversations/${request.payload.id}/transition:${request.payload.idempotency_key}`,
      graph: null, dependencies: [],
    };
    return this.commands.prepare(binding, payload);
  }

  async prepareResolved(input: AssignmentInput, resolve: (tenant: string, principal: string | null, team: string | null) => Promise<OwnerTarget>) {
    const request = validateOwnerValue<AssignmentInput>('Request_chat-' + input.operation, input);
    const prior = await this.commands.existing(request.tenant_id, request.command_id);
    if (prior && 'binding' in prior && prior.binding.target) return this.prepare(request, prior.binding.target);
    const snapshot = await this.commands.transaction(request.tenant_id, c => chatOwnershipSnapshot(c, request.tenant_id, request.payload.id));
    const team = Object.hasOwn(request.payload.body, 'team_id') ? request.payload.body.team_id! : snapshot.resource.team_id;
    const principal = request.operation === 'routing-takeover' ? request.actor.principal_id : request.payload.body.owner_principal_id!;
    return this.prepare(request, await resolve(request.tenant_id, principal, team));
  }

  async prepare(input: AssignmentInput, targetInput: OwnerTarget): Promise<OwnerCommandProof> {
    const request = validateOwnerValue<AssignmentInput>('Request_chat-' + input.operation, input);
    const target = validateOwnerValue<OwnerTarget>('OwnerTarget', targetInput);
    if (request.payload.expected_version === null) ownerFail('PRECONDITION_REQUIRED');
    ownerCounter(request.payload.expected_version, true);
    if (request.operation === 'routing-takeover') {
      if (request.actor.kind !== 'human' || target.principal_id !== request.actor.principal_id || target.kind !== 'human') ownerFail('FORBIDDEN');
    } else if (target.principal_id !== request.payload.body.owner_principal_id) ownerFail('CONFLICT');
    if ((target.principal_id === null) !== (target.kind === null)) ownerFail('INVALID_REQUEST');
    const body = structuredClone(request.payload);
    const prior = await this.commands.existing(request.tenant_id, request.command_id);
    if (prior) {
      if (!('binding' in prior) || prior.state === 'aborted') ownerFail('INVALID_TRANSITION');
      // Keep the original immutable delegation. A new session reference is used
      // only for response admission; it cannot revive a revoked prepared command.
      const sameActor = prior.binding.actor.kind === request.actor.kind && prior.binding.actor.principal_id === request.actor.principal_id;
      if (prior.binding.operation !== request.operation || !sameActor ||
          ownerCanonical(prior.binding.target) !== ownerCanonical(target) || prior.binding.payload_digest !== ownerDigest(body)) ownerFail('CONFLICT');
      return prior;
    }
    const snapshot = await this.commands.transaction(request.tenant_id, c => chatOwnershipSnapshot(c, request.tenant_id, body.id));
    if (snapshot.resource.record_version !== body.expected_version) ownerFail('STALE_VERSION');
    const team = Object.hasOwn(body.body, 'team_id') ? body.body.team_id : snapshot.resource.team_id;
    if (target.team_id !== team) ownerFail('CONFLICT');
    const binding: OwnerCommandBinding = {
      tenant_id: request.tenant_id, command_id: request.command_id, owner: 'chat', operation: request.operation, actor: request.actor,
      resource: snapshot.resource, target, session_id: snapshot.session, fields: ['owner_principal_id', 'team_id'],
      payload_digest: ownerDigest(body), legacy_receipt_key: `POST /api/v1/${request.operation === 'routing-takeover' ? 'conversations' : 'records'}/${body.id}/${request.operation === 'routing-takeover' ? 'takeover' : 'assignment'}:${body.idempotency_key}`,
      graph: null, dependencies: [],
    };
    try { return await this.commands.prepare(binding, body); }
    catch (error) {
      // Concurrent public retries may enroll different references before either
      // sees the prepared row. Recheck immutable business identity against winner.
      if ((error as { code?: string }).code === 'CONFLICT' && await this.commands.existing(request.tenant_id, request.command_id)) return this.prepare(request, target);
      throw error;
    }
  }

  /** Fresh admission for immutable response data; original command grants no replay authority. */
  async readReceipt(tenant: string, command: OwnerCommandRef, actorInput: OwnerActor) {
    const actor = validateOwnerValue<OwnerActor>('OwnerActor', actorInput);
    const original = await this.commands.proof(tenant, command);
    if (!('binding' in original) || original.state !== 'committed' || !original.binding.target ||
        !['routing-assignment', 'routing-takeover'].includes(original.binding.operation)) ownerFail('INVALID_TRANSITION');
    if (original.binding.actor.principal_id !== actor.principal_id || original.binding.actor.kind !== actor.kind) ownerFail('FORBIDDEN');
    const id = original.binding.resource.resource_id;
    const snapshot = async (c: PoolConnection): Promise<OwnerResource> => {
      const [rows] = await c.execute<RowDataPacket[]>(`SELECT r.*,h.control_revision FROM crm_record r
        JOIN chat_control_head h ON h.tenant_id=r.tenant_id AND h.conversation_id=r.id WHERE r.tenant_id=? AND r.id=? FOR UPDATE`, [tenant, id]);
      const r = rows[0]; if (!r || r.archived_at !== null) ownerFail('NOT_FOUND');
      const [teams] = await c.execute<RowDataPacket[]>('SELECT team_id FROM record_team_access WHERE tenant_id=? AND record_id=? ORDER BY team_id FOR UPDATE', [tenant, id]);
      return { resource_id: id, object_key: 'conversation', record_version: String(r.version), owner_revision: String(r.owner_revision), control_revision: String(r.control_revision), owner_principal_id: r.owner_principal_id, team_id: r.team_id, shared_team_ids: teams.map(t => String(t.team_id)), archived: false };
    };
    const resource = await this.commands.transaction(tenant, snapshot);
    const data = { id, tenant_id: tenant, object_key: 'conversation', version: nextOwnerCounter(original.binding.resource.record_version), owner_revision: nextOwnerCounter(original.binding.resource.owner_revision), owner_principal_id: original.binding.target.principal_id, team_id: original.binding.target.team_id };
    const readCommand = randomUUID(), request = { original: command, data };
    const binding: OwnerCommandBinding = { tenant_id: tenant, command_id: readCommand, owner: 'chat', operation: original.binding.operation + '-receipt', actor, resource, target: null, session_id: null,
      fields: ['owner_principal_id', 'team_id'], payload_digest: ownerDigest(request), legacy_receipt_key: 'routing-receipt:' + readCommand, graph: null, dependencies: [] };
    const prepared = await this.commands.prepare(binding, request), ref = { command_id: readCommand, binding_digest: prepared.binding_digest };
    const admission = validateOwnerValue<OwnerAdmission>('OwnerAdmission', await this.peers.admit(tenant, ref));
    if (admission.command_id !== ref.command_id || admission.binding_digest !== ref.binding_digest || admission.state !== 'admitted' || ownerCanonical([...admission.allowed_fields].sort()) !== ownerCanonical([...binding.fields].sort())) ownerFail('FORBIDDEN');
    await this.commands.rememberDependency(tenant, ref, 'identity-admission', admission);
    await this.commands.commit(tenant, ref, admission.admission_id, async c => {
      if (ownerCanonical(await snapshot(c)) !== ownerCanonical(resource)) ownerFail('STALE_VERSION');
      return { effect_id: id, effect_revision: resource.record_version };
    });
    await this.peers.settle(tenant, ref, admission.admission_id);
    return data;
  }

  async execute(tenant: string, command: OwnerCommandRef) {
    try { return await this.run(tenant, command); }
    catch (error) {
      // Another coordinator may have committed while this RPC/dependency write
      // was in flight. Only a durable committed proof can turn that into success.
      const terminal = await this.commands.proof(tenant, command);
      if (terminal.state === 'committed') return this.run(tenant, command);
      throw error;
    }
  }

  private async run(tenant: string, command: OwnerCommandRef) {
    const proof = await this.commands.proof(tenant, command);
    if (!('binding' in proof) || proof.state === 'aborted') ownerFail('INVALID_TRANSITION');
    if (proof.state === 'committed') {
      const reservation = await this.commands.dependency(tenant, command, 'routing-capacity') as OwnerCapacity | null;
      const admission = await this.commands.dependency(tenant, command, 'identity-admission') as OwnerAdmission | null;
      if (!reservation || !admission) ownerFail('DEPENDENCY_UNAVAILABLE');
      return { proof, reconciliation: await this.reconcile(tenant, command, reservation.reservation_id, admission.admission_id) };
    }
    const binding = proof.binding;
    if (!binding.session_id || !binding.target) ownerFail('INVALID_REQUEST');
    // These RPCs complete before taking the Chat transaction locks.
    const reservation = validateOwnerValue<OwnerCapacity>('OwnerCapacity', await this.commands.dependency(tenant, command, 'routing-capacity') ?? await this.peers.reserve(tenant, command, binding.session_id));
    if (reservation.command_id !== command.command_id || reservation.binding_digest !== command.binding_digest ||
        reservation.session_id !== binding.session_id || reservation.principal_id !== binding.target.principal_id ||
        reservation.owner_revision !== (binding.operation === 'conversation-close' ? binding.resource.owner_revision : nextOwnerCounter(binding.resource.owner_revision)) ||
        !['reserved', 'not-managed'].includes(reservation.state)) ownerFail('FORBIDDEN');
    await this.commands.rememberDependency(tenant, command, 'routing-capacity', reservation);
    const admission = validateOwnerValue<OwnerAdmission>('OwnerAdmission', await this.commands.dependency(tenant, command, 'identity-admission') ?? await this.peers.admit(tenant, command));
    if (admission.command_id !== command.command_id || admission.binding_digest !== command.binding_digest || admission.state !== 'admitted' ||
        ownerCanonical([...admission.allowed_fields].sort()) !== ownerCanonical([...binding.fields].sort())) ownerFail('FORBIDDEN');
    await this.commands.rememberDependency(tenant, command, 'identity-admission', admission);
    const committed = await this.commands.commit(tenant, command, admission.admission_id, (c, b, request) =>
      b.operation === 'conversation-close' ? closeOwnership(c, b, request, chatOwnershipSnapshot) : this.assign(c, b, request));
    return { proof: committed, reconciliation: await this.reconcile(tenant, command, reservation.reservation_id, admission.admission_id) };
  }

  private async reconcile(tenant: string, command: OwnerCommandRef, reservation: string, admission: string) {
    // A lost confirmation cannot undo the committed owner. Retry same durable IDs.
    let reconciliation: 'pending' | 'complete' = 'complete';
    try {
      await this.peers.confirm(tenant, command, reservation);
      await this.peers.settle(tenant, command, admission);
    } catch { reconciliation = 'pending'; }
    return reconciliation;
  }

  private async assign(c: PoolConnection, binding: OwnerCommandBinding, request: Record<string, unknown>) {
    if (!['routing-assignment', 'routing-takeover'].includes(binding.operation) || !binding.target) ownerFail('INVALID_REQUEST');
    const tenant = binding.tenant_id, id = binding.resource.resource_id, target = binding.target;
    const live = await chatOwnershipSnapshot(c, tenant, id);
    if (ownerCanonical(live.resource) !== ownerCanonical(binding.resource) || live.session !== binding.session_id) ownerFail('STALE_VERSION');
    const version = nextOwnerCounter(live.resource.record_version), ownerRevision = nextOwnerCounter(live.resource.owner_revision);
    const control = nextOwnerCounter(live.resource.control_revision), registry = nextOwnerCounter(live.registryRevision);
    const reason = (request.body as { reason: string }).reason;
    await c.execute(`UPDATE crm_record SET owner_principal_id=?,team_id=?,version=?,owner_revision=?,updated_at=UTC_TIMESTAMP(6)
      WHERE tenant_id=? AND id=?`, [target.principal_id, target.team_id, version, ownerRevision, tenant, id]);
    await c.execute(`UPDATE chat_control_head SET registry_revision=?,control_revision=?,cancel_through=GREATEST(cancel_through,?),
      pause_through=GREATEST(pause_through,?),version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND conversation_id=?`,
    [registry, control, live.resource.control_revision, live.resource.control_revision, tenant, id]);
    await c.execute(`INSERT INTO ownership_history(id,tenant_id,record_id,from_owner_id,to_owner_id,from_team_id,to_team_id,owner_revision,reason,actor_kind,actor_id,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))`,
    [randomUUID(), tenant, id, live.resource.owner_principal_id, target.principal_id, live.resource.team_id, target.team_id, ownerRevision, reason, binding.actor.kind, binding.actor.principal_id]);
    // Only queued effects are cancelled. Sending/unknown retain their original reconciliation state.
    await c.execute(`UPDATE message m JOIN outbound_intent i ON i.tenant_id=m.tenant_id AND i.id=m.outbound_intent_id
      SET m.status='cancelled',i.status='cancelled',i.error_code='OWNER_OR_STATE_CHANGED'
      WHERE i.tenant_id=? AND i.conversation_id=? AND i.status IN ('queued','remote_queued')`, [tenant, id]);
    await c.execute(`INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,correlation_id,occurred_at,created_at)
      VALUES (?,?,?,?,?,'conversation',?,'accepted',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,
    [randomUUID(), tenant, binding.actor.kind, binding.actor.principal_id, 'assign', id, ownerCanonical(binding.fields), binding.command_id]);
    await ownershipActivity(c, binding, ownerRevision, version, reason);
    await localEvent(c, binding, 'record.assigned', version, { record_id: id, object_type: 'conversation', from_owner_id: live.resource.owner_principal_id,
      to_owner_id: target.principal_id, team_id: target.team_id, owner_revision: ownerRevision, reason });
    await ownershipControlEvent(c, binding, version, ownerRevision, registry, control);
    await advanceOwnershipDatasets(c, tenant);
    // No remote consumer runs in this transaction; T06 supplies authenticated delivery/recovery.
    return { effect_id: id, effect_revision: version };
  }
}
