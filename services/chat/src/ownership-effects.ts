import { writeChatOutbox } from './event-store.js';
import { randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { OwnerCommandBinding } from '@agentic-crm/contracts';
import { nextOwnerCounter, ownerCanonical, ownerDigest, ownerFail } from '@agentic-crm/workload-transport';

/** Ownership and lifecycle affect current ACL across every Chat fact dataset. */
export async function advanceOwnershipDatasets(c: PoolConnection, tenant: string) {
  const names = ['conversion', 'progress', 'registry', 'routing', 'stage'];
  const [heads] = await c.execute<RowDataPacket[]>('SELECT dataset,revision,version FROM chat_dataset_head WHERE tenant_id=? ORDER BY dataset FOR UPDATE', [tenant]);
  if (ownerCanonical(heads.map(h => h.dataset)) !== ownerCanonical(names)) ownerFail('PRECONDITION_REQUIRED');
  for (const head of heads) await c.execute('UPDATE chat_dataset_head SET revision=?,version=?,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND dataset=?',
    [nextOwnerCounter(String(head.revision)), nextOwnerCounter(String(head.version)), tenant, head.dataset]);
}

/** Chat-local effects only; caller already holds registry and command locks. */
export async function ownershipActivity(c: PoolConnection, b: OwnerCommandBinding, revision: string, recordVersion: string, reason: string, closingFrom?: string) {
  const tenant = b.tenant_id, id = b.resource.resource_id, target = b.target!;
  const cause = closingFrom ? 'closed' : 'assignment';
  const [counters] = await c.execute<RowDataPacket[]>('SELECT last_seq,backfilled FROM conversation_activity_counter WHERE tenant_id=? AND conversation_id=? FOR UPDATE', [tenant, id]);
  // Imported history must be complete before adding new events; never silently skip backfill.
  if (!counters[0]?.backfilled) ownerFail('PRECONDITION_REQUIRED');
  let seq = String(counters[0].last_seq);
  const append = async (kind: string, sourceRevision: string, payload: Record<string, unknown>, actorKind: string = b.actor.kind, actor = b.actor.principal_id) => {
    seq = nextOwnerCounter(seq);
    await c.execute(`INSERT INTO conversation_activity
      (tenant_id,id,conversation_id,activity_seq,source_service,source_kind,source_id,source_revision,kind,actor_kind,actor_id,occurred_at,recorded_at,payload)
      VALUES (?,?,?,?,'chat',?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?)`,
    [tenant, randomUUID(), id, seq, kind, id, sourceRevision, kind, actorKind, actor, ownerCanonical(payload)]);
  };
  const [snoozes] = await c.execute<RowDataPacket[]>('SELECT until_at,revision FROM conversation_snooze WHERE tenant_id=? AND conversation_id=? FOR UPDATE', [tenant, id]);
  if (snoozes[0]?.until_at) {
    const snoozeRevision = nextOwnerCounter(String(snoozes[0].revision));
    await c.execute('UPDATE conversation_snooze SET until_at=NULL,revision=?,actor_principal_id=NULL,reason=NULL,last_cause=?,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND conversation_id=?', [snoozeRevision, cause, tenant, id]);
    await c.execute('UPDATE conversation_workspace SET snoozed_until=NULL,snooze_revision=? WHERE tenant_id=? AND conversation_id=?', [snoozeRevision, tenant, id]);
    await append('snooze', snoozeRevision, { until: null, cause }, 'system', tenant);
    await localEvent(c, b, 'chat.snooze.changed', recordVersion, { conversation_id: id, until: null, snooze_revision: snoozeRevision, cause }, {kind:'system',id:tenant});
    await c.execute(`INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,correlation_id,occurred_at,created_at)
      VALUES (?,?,'system',?,?,'conversation',?,'accepted',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,
    [randomUUID(),tenant,tenant,'snooze.' + cause,id,ownerCanonical(['snoozed_until']),b.command_id]);
  }
  const payload = { from_principal_id: b.resource.owner_principal_id, to_principal_id: target.principal_id, owner_revision: revision, reason };
  if (closingFrom) await append('lifecycle', recordVersion, { from_status: closingFrom, to_status: 'closed' });
  else await append('assignment', revision, payload);
  await c.execute('UPDATE conversation_activity_counter SET last_seq=? WHERE tenant_id=? AND conversation_id=?', [seq, tenant, id]);
  const [last] = await c.execute<RowDataPacket[]>('SELECT MAX(revision) AS revision FROM session_contribution WHERE tenant_id=? AND session_id=?', [tenant, b.session_id]);
  await c.execute(`INSERT INTO session_contribution
    (tenant_id,session_id,id,conversation_id,revision,kind,source_id,source_revision,actor_kind,actor_id,owner_id,team_id,owner_revision,payload,recorded_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))`,
  [tenant, b.session_id, randomUUID(), id, nextOwnerCounter(String(last[0]?.revision ?? '0')), closingFrom ? 'closed' : 'assignment', closingFrom ? b.session_id : id, closingFrom ? '1' : revision, b.actor.kind, b.actor.principal_id,
    target.principal_id, target.team_id, revision, ownerCanonical(closingFrom ? { reason: 'agent_closed' } : { from_owner_id: b.resource.owner_principal_id, to_owner_id: target.principal_id,
      from_team_id: b.resource.team_id, to_team_id: target.team_id, reason })]);
}

export async function localEvent(c: PoolConnection, b: OwnerCommandBinding, type: string, version: string, payload: Record<string, unknown>, actor = {kind: String(b.actor.kind), id:b.actor.principal_id}) {
  await writeChatOutbox(c, `INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status)
    VALUES (?,?,?,1,'conversation',?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')`,
  [randomUUID(), b.tenant_id, type, b.resource.resource_id, version, ownerCanonical(payload), b.command_id, actor.kind, actor.id]);
}

export async function ownershipControlEvent(c: PoolConnection, b: OwnerCommandBinding, recordVersion: string, ownerRevision: string, registryRevision: string, controlRevision: string, watermarks?: { pause: string; cancel: string }) {
  const tenant = b.tenant_id, id = b.resource.resource_id, target = b.target!;
  const [rows] = await c.execute<RowDataPacket[]>("SELECT contact_id,contact_identity_id,connection_id,status,DATE_FORMAT(UTC_TIMESTAMP(6),'%Y-%m-%dT%H:%i:%s.%fZ') AS at FROM conversation WHERE tenant_id=? AND record_id=?", [tenant, id]);
  const row = rows[0]!;
  const eventId = randomUUID();
  const wire = { schema_version: 1, event_type: 'chat.registry.changed.v1', producer: 'chat', event_id: eventId, tenant_id: tenant,
    conversation_id: id, registry_revision: registryRevision, occurred_at: row.at, correlation_id: b.command_id,
    snapshot: { tenant_id: tenant, conversation_id: id, registry_revision: registryRevision, record_version: recordVersion, owner_revision: ownerRevision,
      control_revision: controlRevision, pause_through_revision: watermarks?.pause ?? b.resource.control_revision, cancel_through_revision: watermarks?.cancel ?? b.resource.control_revision,
      crm_contact_id: row.contact_id, crm_identity_id: row.contact_identity_id, connection_id: row.connection_id, owner_principal_id: target.principal_id,
      owner_kind: target.kind, team_id: target.team_id, shared_team_ids: b.resource.shared_team_ids, active_session_id: row.status === 'closed' ? null : b.session_id, status: row.status, archived: false } };
  const envelope = ownerCanonical(wire), eventDigest = ownerDigest(wire);
  await c.execute(`INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status)
    VALUES (?,?,'chat.registry.changed.v1',1,'conversation',?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')`,
  [eventId, tenant, id, registryRevision, envelope, b.command_id, b.actor.kind, b.actor.principal_id]);
  for (const consumer of ['crm.chat-registry.v1', 'ai-runtime.chat-control.v1', 'workflow.chat-control.v1']) {
    const registration = ownerDigest({ version: 1, producer: 'chat', consumer, event_type: 'chat.registry.changed.v1', schema_versions: [1] });
    await c.execute(`INSERT INTO chat_event_stream(tenant_id,consumer_name,aggregate_type,aggregate_id,next_sequence,acked_through,retained_from,registration_digest,version,created_at,updated_at)
      VALUES (?,?,'conversation',?,1,0,1,?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE aggregate_id=aggregate_id`, [tenant, consumer, id, registration]);
    const [streams] = await c.execute<RowDataPacket[]>("SELECT next_sequence,registration_digest FROM chat_event_stream WHERE tenant_id=? AND consumer_name=? AND aggregate_type='conversation' AND aggregate_id=? FOR UPDATE", [tenant, consumer, id]);
    if (streams[0]!.registration_digest !== registration) ownerFail('CONFLICT');
    const sequence = String(streams[0]!.next_sequence);
    await c.execute(`INSERT INTO chat_event_delivery(tenant_id,consumer_name,aggregate_type,aggregate_id,sequence,event_id,event_digest,registration_digest,envelope_json,state,next_attempt_at,attempts,version,created_at,updated_at)
      VALUES (?,?,'conversation',?,?,?,?,?,?,'pending',UTC_TIMESTAMP(6),0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, [tenant, consumer, id, sequence, eventId, eventDigest, registration, envelope]);
    await c.execute("UPDATE chat_event_stream SET next_sequence=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND consumer_name=? AND aggregate_type='conversation' AND aggregate_id=?", [nextOwnerCounter(sequence), tenant, consumer, id]);
  }
}
