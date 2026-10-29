import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { OwnerAdmission, OwnerCommandRef, OwnerCommandProof, OwnerTouchpointReceipt } from '@agentic-crm/contracts';
import { ownerBindingDigest, ownerCanonical, ownerDigest, ownerFail, ownerRoute, validateOwnerValue, type WorkloadRoute } from '@agentic-crm/workload-transport';
import type { ReferenceProofReader } from '../../kernel/reliability/owner-reference.js';

/** Channels-owned staged evidence. All remote proof reads finish before local SQL. */
export class NativeChannelTouchpoints {
  constructor(private readonly pool: Pool, private readonly proof: ReferenceProofReader,
    private readonly admission: (tenant: string, command: OwnerCommandRef, id: string) => Promise<OwnerAdmission>) {}

  private async transaction<T>(tenant: string, work: (c: PoolConnection) => Promise<T>) {
    if (['01900000-0000-7000-8000-000000000001', '00000000-0000-0000-0000-000000000000'].includes(tenant)) ownerFail('FORBIDDEN');
    const c = await this.pool.getConnection();
    try { await c.query("SET time_zone='+00:00'"); await c.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED'); await c.beginTransaction(); const r = await work(c); await c.commit(); return r; }
    catch (e) { await c.rollback(); throw e; } finally { c.release(); }
  }
  private result(row: RowDataPacket): OwnerTouchpointReceipt {
    return validateOwnerValue<OwnerTouchpointReceipt>('OwnerTouchpointReceipt', { id: row.id, command: { command_id: row.command_id, binding_digest: row.binding_digest }, state: row.state, conversation_id: row.conversation_id, message_id: row.message_id, session_id: row.session_id });
  }
  async apply(tenant: string, operation: 'touchpoint-prepare' | 'touchpoint-finalize', raw: OwnerCommandRef): Promise<OwnerTouchpointReceipt> {
    const command = validateOwnerValue<OwnerCommandRef>('OwnerCommandRef', raw);
    const observed = validateOwnerValue<OwnerCommandProof>('OwnerCommandProof', await this.proof(tenant, command, false));
    const b = observed.binding, pin = b.ingress_touchpoint, refs = b.references, channel = b.ingress_channel;
    if (b.tenant_id !== tenant || b.owner !== 'chat' || b.operation !== 'ingress-process' || b.command_id !== command.command_id || observed.binding_digest !== command.binding_digest || ownerBindingDigest(b) !== command.binding_digest || !pin || !refs || !channel || !b.metadata || b.actor.kind !== 'service' || b.actor.principal_id !== channel.service_actor_id || b.actor.delegation_id !== channel.service_actor_id) ownerFail('FORBIDDEN');
    const preparing = operation === 'touchpoint-prepare';
    if (preparing) {
      if (observed.state !== 'prepared') ownerFail('INVALID_TRANSITION');
      const dep = b.dependencies.find(d => d.owner === 'identity' && d.binding_digest === command.binding_digest);
      if (!dep) ownerFail('FORBIDDEN');
      const admission = validateOwnerValue<OwnerAdmission>('OwnerAdmission', await this.admission(tenant, command, dep.receipt_id));
      if (admission.admission_id !== dep.receipt_id || admission.command_id !== command.command_id || admission.binding_digest !== command.binding_digest || admission.state !== 'admitted' || admission.allowed_fields.length) ownerFail('REVOKED');
    } else if (observed.state === 'prepared') ownerFail('DEPENDENCY_UNAVAILABLE');
    const result = observed.ingress_result;
    if (!preparing && observed.state === 'committed' && (!result || result.receipt_id !== pin.receipt_id || observed.effect_id !== pin.receipt_id)) ownerFail('FORBIDDEN');
    if (result?.touchpoint_id && (result.touchpoint_id !== pin.id || result.state !== 'processed' || !result.conversation_id || !result.message_id)) ownerFail('FORBIDDEN');
    const state = preparing ? 'prepared' : observed.state === 'aborted' ? 'cancelled' : result?.touchpoint_id ? 'bound' : 'discarded';
    const conversation = state === 'bound' ? result!.conversation_id : null, message = state === 'bound' ? result!.message_id : null, session = state === 'bound' ? result!.session_id : null;
    // Dependencies may settle later; terminal identity consists only of immutable command/outcome.
    const terminal = preparing ? null : ownerDigest({ command, state: observed.state, effect_id: observed.effect_id, result: result ?? null });
    const evidence = ownerCanonical({ ...pin, channel_id: channel.channel_id, platform: refs.platform });
    return this.transaction(tenant, async c => {
      if (preparing) {
        const [[hold]] = await c.execute<RowDataPacket[]>("SELECT id FROM connector_reference_reservation WHERE tenant_id=? AND caller_owner='chat' AND command_id=? AND binding_digest=? AND resource_kind='connection' AND resource_id=? AND state='held' FOR SHARE", [tenant, command.command_id, command.binding_digest, refs.connection_id]);
        const [[connection]] = await c.execute<RowDataPacket[]>("SELECT service_actor_id,team_id,external_account_id FROM channel_connection WHERE tenant_id=? AND id=? AND status='active' AND provider='mock_messenger' FOR SHARE", [tenant, refs.connection_id]);
        if (!hold || !connection || connection.service_actor_id !== channel.service_actor_id || connection.team_id !== channel.team_id || connection.external_account_id !== channel.channel_id) ownerFail('REFERENCE_INVALID');
      }
      await c.execute(`INSERT INTO channel_ingress_touchpoint(tenant_id,id,command_id,receipt_id,connection_id,contact_id,identity_id,binding_digest,provider_message_digest,evidence,state,conversation_id,message_id,session_id,terminal_digest,version,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id`,
      [tenant, pin.id, command.command_id, pin.receipt_id, refs.connection_id, refs.crm_contact_id, refs.crm_identity_id, command.binding_digest, pin.provider_message_digest, evidence, state, conversation, message, session, terminal]);
      const [[row]] = await c.execute<RowDataPacket[]>('SELECT * FROM channel_ingress_touchpoint WHERE tenant_id=? AND id=? FOR UPDATE', [tenant, pin.id]);
      if (!row || row.command_id !== command.command_id || row.binding_digest !== command.binding_digest) ownerFail('CONFLICT');
      if (row.state !== 'prepared') { if (!preparing && row.terminal_digest !== terminal) ownerFail('CONFLICT'); return this.result(row); }
      if (!preparing) {
        await c.execute('UPDATE channel_ingress_touchpoint SET state=?,conversation_id=?,message_id=?,session_id=?,terminal_digest=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?', [state, conversation, message, session, terminal, tenant, pin.id]);
        Object.assign(row, { state, conversation_id: conversation, message_id: message, session_id: session });
      }
      return this.result(row);
    });
  }
}

export function channelTouchpointRoutes(owner: NativeChannelTouchpoints): Record<string, WorkloadRoute> {
  return Object.fromEntries((['touchpoint-prepare', 'touchpoint-finalize'] as const).map(operation => ['/internal/v1/owners/connector/' + operation,
    ownerRoute('connector', operation, ['chat'], r => owner.apply(r.tenant_id, operation, validateOwnerValue<OwnerCommandRef>('OwnerCommandRef', r.payload)))]));
}
