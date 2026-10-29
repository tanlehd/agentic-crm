import { randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { OwnerAdmission, OwnerCommandBinding, OwnerCommandRef } from '@agentic-crm/contracts';
import { ownerCanonical, ownerDigest, ownerFail, ownerRoute, validateOwnerValue, type OwnerCommandRequest, type WorkloadRoute } from '@agentic-crm/workload-transport';
import { ChatOwnerCommands } from './owner-command.js';
import { detailSnapshot } from './detail.js';
import type { RecordPeers } from './record-action.js';

const fields = ['assessment_status', 'need_clarity', 'intent', 'product_interest', 'unresolved_reason'] as const;
type Input = { conversation_id: string; session_id: string; need_id: string; assessment_version: string };
type Peers = RecordPeers & { contact(tenant: string, ref: OwnerCommandRef, admission: string): Promise<{contact_id: string; version: string}> };
export class ChatNeedSource {
  constructor(private readonly commands: ChatOwnerCommands, private readonly peers: Peers) {}
  private async snapshot(c: PoolConnection, tenant: string, input: Input) {
    const base = await detailSnapshot(c, tenant, input.conversation_id);
    const [[assessment]] = await c.execute<RowDataPacket[]>('SELECT version,values_json FROM need_assessment WHERE tenant_id=? AND conversation_id=? AND session_id=? AND need_id=?',
      [tenant, input.conversation_id, input.session_id, input.need_id]);
    return { ...base, assessment: assessment ? { version: String(assessment.version), values: typeof assessment.values_json === 'string' ? JSON.parse(assessment.values_json) : assessment.values_json } : null };
  }
  async read(raw: OwnerCommandRequest) {
    const request = validateOwnerValue<OwnerCommandRequest>('Request_chat-read-need', raw);
    if (request.actor.kind !== 'service' || request.actor.principal_id !== request.actor.delegation_id) ownerFail('FORBIDDEN');
    const tenant = request.tenant_id, input = request.payload as Input, snapshot = await this.commands.transaction(tenant, c => this.snapshot(c, tenant, input));
    const id = randomUUID(), payload = { payload: input };
    const binding: OwnerCommandBinding = { tenant_id: tenant, command_id: id, owner: 'chat', operation: 'read-need', actor: request.actor,
      resource: snapshot.resource, projection: snapshot.projection, session_id: input.session_id, need: { need_id: input.need_id, assessment_version: input.assessment_version },
      fields: [...fields], target: null, graph: null, dependencies: [], payload_digest: ownerDigest(payload), legacy_receipt_key: 'need-source:' + id };
    const prepared = await this.commands.prepare(binding, payload), ref = { command_id: id, binding_digest: prepared.binding_digest };
    let admission: OwnerAdmission | undefined;
    try {
      admission = validateOwnerValue<OwnerAdmission>('OwnerAdmission', await this.peers.admit(tenant, ref));
      if (admission.state !== 'admitted' || admission.command_id !== id || admission.binding_digest !== ref.binding_digest || ownerCanonical(admission.allowed_fields) !== ownerCanonical(fields)) ownerFail('FORBIDDEN');
      await this.commands.rememberDependency(tenant, ref, 'identity-admission', admission);
      const contact = await this.peers.contact(tenant, ref, admission.admission_id);
      if (contact.contact_id !== snapshot.projection.contact_id) ownerFail('FORBIDDEN');
      const current = snapshot.assessment?.version === input.assessment_version;
      const result = { current, ...Object.fromEntries(fields.map(field => [field, current ? String(snapshot.assessment!.values[field] ?? '') : ''])) };
      validateOwnerValue('Reply_chat-read-need', { schema_version: 1, request_id: request.request_id, tenant_id: tenant, result });
      await this.commands.commit(tenant, ref, admission.admission_id, async c => {
        if (ownerCanonical(await this.snapshot(c, tenant, input)) !== ownerCanonical(snapshot)) ownerFail('STALE_VERSION');
        return { effect_id: input.conversation_id, effect_revision: snapshot.resource.record_version };
      });
      await this.peers.settle(tenant, ref, admission.admission_id);
      return result;
    } catch (error) {
      try { await this.commands.abort(tenant, ref); if (admission) await this.peers.settle(tenant, ref, admission.admission_id); } catch { /* Original proof remains recoverable; no response is disclosed on uncertainty. */ }
      throw error;
    }
  }
}
export function chatNeedSourceRoutes(source: ChatNeedSource): Record<string, WorkloadRoute> {
  return { '/internal/v1/owners/chat/read-need': ownerRoute('chat', 'read-need', ['workflow'], r => source.read(r as OwnerCommandRequest)) };
}
