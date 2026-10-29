import { randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { OwnerActor, OwnerAdmission, OwnerCommandBinding, OwnerResource } from '@agentic-crm/contracts';
import { ownerCanonical, ownerDigest, ownerFail, ownerRoute, validateOwnerValue, type WorkloadRoute } from '@agentic-crm/workload-transport';
import { ChatOwnerCommands } from './owner-command.js';
import type { OwnershipPeers } from './ownership.js';

type HistoryInput = { schema_version: 1; request_id: string; correlation_id: string; tenant_id: string;
  operation: 'routing-history'; actor: OwnerActor; command_id: string; payload: { id: string } };
type Entry = { from_owner_id: string | null; to_owner_id: string | null; from_team_id: string | null;
  to_team_id: string | null; owner_revision: string; reason: string; actor_kind: string; actor_id: string };

/** Fixed legacy audit projection; no foreign SQL, directory hydration or message contents. */
export class ChatOwnershipHistory {
  constructor(private readonly commands: ChatOwnerCommands, private readonly peers: Pick<OwnershipPeers, 'admit' | 'settle'>) {}

  private async snapshot(c: PoolConnection, tenant: string, id: string): Promise<OwnerResource> {
    const [rows] = await c.execute<RowDataPacket[]>(`SELECT r.version,r.owner_revision,r.owner_principal_id,r.team_id,r.archived_at,h.control_revision
      FROM crm_record r JOIN conversation v ON v.tenant_id=r.tenant_id AND v.record_id=r.id
      JOIN chat_control_head h ON h.tenant_id=r.tenant_id AND h.conversation_id=r.id
      WHERE r.tenant_id=? AND r.id=? FOR UPDATE`, [tenant, id]);
    const row = rows[0]; if (!row) ownerFail('NOT_FOUND');
    const [teams] = await c.execute<RowDataPacket[]>('SELECT team_id FROM record_team_access WHERE tenant_id=? AND record_id=? ORDER BY team_id FOR UPDATE', [tenant, id]);
    return { resource_id: id, object_key: 'conversation', record_version: String(row.version), owner_revision: String(row.owner_revision),
      control_revision: String(row.control_revision), owner_principal_id: row.owner_principal_id, team_id: row.team_id,
      shared_team_ids: teams.map(t => String(t.team_id)), archived: row.archived_at !== null };
  }

  async read(raw: HistoryInput) {
    const input = validateOwnerValue<HistoryInput>('Request_chat-routing-history', raw);
    if (input.actor.kind !== 'human') ownerFail('FORBIDDEN');
    const tenant = input.tenant_id, id = input.payload.id;
    const resource = await this.commands.transaction(tenant, c => this.snapshot(c, tenant, id));
    // Read retries never reuse a terminal command/admission as current authority.
    const commandId = randomUUID(), request = { id, request_command_id: input.command_id };
    const binding: OwnerCommandBinding = { tenant_id: tenant, command_id: commandId, owner: 'chat', operation: 'routing-history',
      actor: input.actor, resource, target: null, session_id: null, fields: [], payload_digest: ownerDigest(request),
      legacy_receipt_key: 'routing-history:' + commandId, graph: null, dependencies: [] };
    const prepared = await this.commands.prepare(binding, request), ref = { command_id: commandId, binding_digest: prepared.binding_digest };
    let admission: OwnerAdmission | undefined;
    try {
      admission = validateOwnerValue<OwnerAdmission>('OwnerAdmission', await this.peers.admit(tenant, ref));
      if (admission.command_id !== commandId || admission.binding_digest !== ref.binding_digest || admission.state !== 'admitted' || admission.allowed_fields.length) ownerFail('FORBIDDEN');
      await this.commands.rememberDependency(tenant, ref, 'identity-admission', admission);
      let data: Entry[] | undefined;
      await this.commands.commit(tenant, ref, admission.admission_id, async c => {
        if (ownerCanonical(await this.snapshot(c, tenant, id)) !== ownerCanonical(resource)) ownerFail('STALE_VERSION');
        const [rows] = await c.execute<RowDataPacket[]>(`SELECT from_owner_id,to_owner_id,from_team_id,to_team_id,owner_revision,reason,actor_kind,actor_id
          FROM ownership_history WHERE tenant_id=? AND record_id=? ORDER BY owner_revision DESC LIMIT 100`, [tenant, id]);
        data = rows.map(row => ({ from_owner_id: row.from_owner_id, to_owner_id: row.to_owner_id, from_team_id: row.from_team_id,
          to_team_id: row.to_team_id, owner_revision: String(row.owner_revision), reason: row.reason, actor_kind: row.actor_kind, actor_id: row.actor_id }));
        return { effect_id: id, effect_revision: resource.record_version };
      });
      if (!data) ownerFail('DEPENDENCY_UNAVAILABLE');
      await this.peers.settle(tenant, ref, admission.admission_id);
      return { data, meta: { correlation_id: input.correlation_id } };
    } catch (error) {
      // Recovery remains durable if Identity is down; no failure releases history.
      try { await this.commands.abort(tenant, ref); if (admission) await this.peers.settle(tenant, ref, admission.admission_id); } catch { /* Native drain resolves the retained proof. */ }
      throw error;
    }
  }
}

export function chatOwnershipHistoryRoutes(history: ChatOwnershipHistory): Record<string, WorkloadRoute> {
  return { '/internal/v1/owners/chat/routing-history': ownerRoute('chat', 'routing-history', ['bff'], request => history.read(request as HistoryInput)) };
}
