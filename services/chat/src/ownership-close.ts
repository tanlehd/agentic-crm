import { writeChatOutbox } from './event-store.js';
import { randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { OwnerCommandBinding, OwnerResource } from '@agentic-crm/contracts';
import { nextOwnerCounter, ownerCanonical, ownerFail } from '@agentic-crm/workload-transport';
import { ownershipActivity, ownershipControlEvent, advanceOwnershipDatasets } from './ownership-effects.js';
import {saveTransitionReceipt,type TransitionResponse} from './transition-receipt.js';

/** Runs only under the Chat command/registry transaction. All effects are Chat-owned. */
export async function closeOwnership(c: PoolConnection, b: OwnerCommandBinding, request: Record<string, unknown>,
  snapshot: (c: PoolConnection, tenant: string, id: string) => Promise<{ resource: OwnerResource; session: string; status: string; registryRevision: string }>) {
  const tenant = b.tenant_id, id = b.resource.resource_id;
  if (b.operation !== 'conversation-close' || !b.target || (request.body as { target_status: string }).target_status !== 'closed' ||
      b.target.principal_id !== b.resource.owner_principal_id || b.target.team_id !== b.resource.team_id) ownerFail('INVALID_REQUEST');
  const live = await snapshot(c, tenant, id);
  if (ownerCanonical(live.resource) !== ownerCanonical(b.resource) || live.session !== b.session_id) ownerFail('STALE_VERSION');
  const version = nextOwnerCounter(live.resource.record_version), registry = nextOwnerCounter(live.registryRevision), control = nextOwnerCounter(live.resource.control_revision);
  // Progress head must be imported/initialized; never fabricate a process definition during close.
  const [heads] = await c.execute<RowDataPacket[]>('SELECT tenant_id FROM session_process_head WHERE tenant_id=? FOR UPDATE', [tenant]);
  if (!heads.length) ownerFail('PRECONDITION_REQUIRED');
  await c.execute('UPDATE session_process_head SET updated_at=GREATEST(UTC_TIMESTAMP(3),updated_at+INTERVAL 1000 MICROSECOND) WHERE tenant_id=?', [tenant]);
  const [clocks] = await c.execute<RowDataPacket[]>('SELECT updated_at FROM session_process_head WHERE tenant_id=?', [tenant]);
  const [episodes] = await c.execute<RowDataPacket[]>('SELECT * FROM conversation_acquisition_session WHERE tenant_id=? AND id=? FOR UPDATE', [tenant, b.session_id]);
  const episode = episodes[0]!;
  await c.execute('UPDATE crm_record SET version=?,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?', [version, tenant, id]);
  await c.execute("UPDATE conversation SET status='closed',closed_at=? WHERE tenant_id=? AND record_id=?", [clocks[0]!.updated_at, tenant, id]);
  await c.execute("UPDATE conversation_acquisition_session SET status='closed',closed_at=?,close_reason='agent_closed',version=version+1 WHERE tenant_id=? AND id=?", [clocks[0]!.updated_at, tenant, b.session_id]);
  await c.execute(`UPDATE chat_control_head SET registry_revision=?,control_revision=?,cancel_through=GREATEST(cancel_through,?),
    pause_through=GREATEST(pause_through,?),version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND conversation_id=?`,
  [registry, control, live.resource.control_revision, live.resource.control_revision, tenant, id]);
  await ownershipActivity(c, b, live.resource.owner_revision, version, (request.body as { reason: string }).reason, live.status);
  await c.execute("UPDATE conversation_workspace SET waiting_since=NULL,waiting_metric_state='ready' WHERE tenant_id=? AND conversation_id=?", [tenant, id]);
  await c.execute(`UPDATE message m JOIN outbound_intent i ON i.tenant_id=m.tenant_id AND i.id=m.outbound_intent_id
    SET m.status='cancelled',i.status='cancelled',i.error_code='OWNER_OR_STATE_CHANGED'
    WHERE i.tenant_id=? AND i.conversation_id=? AND i.status IN ('queued','remote_queued')`, [tenant, id]);
  const event = async (type: string, schema: number, aggregate: string, aggregateId: string, revision: string, payload: Record<string, unknown>, system = false) => {
    await writeChatOutbox(c, `INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')`,
    [randomUUID(), tenant, type, schema, aggregate, aggregateId, revision, ownerCanonical(payload), b.command_id, system ? 'system' : b.actor.kind, system ? tenant : b.actor.principal_id]);
  };
  await event('acquisition_session.closed', 1, 'acquisition_session', episode.id, nextOwnerCounter(String(episode.version)), {
    session_id: episode.id, conversation_id: id, status: 'closed', source_classification: episode.source_classification, source_ad_id: episode.source_ad_id, sequence: String(episode.sequence),
  });
  const [assessments] = await c.execute<RowDataPacket[]>('SELECT need_id,version FROM need_assessment WHERE tenant_id=? AND session_id=?', [tenant, b.session_id]);
  const [conversations] = await c.execute<RowDataPacket[]>('SELECT contact_id,connection_id FROM conversation WHERE tenant_id=? AND record_id=?', [tenant, id]);
  for (const assessment of assessments) await event('need.assessed', 2, 'conversation_need', assessment.need_id, String(assessment.version), {
    conversation_id: id, session_id: b.session_id, need_id: assessment.need_id, assessment_version: String(assessment.version), contact_id: conversations[0]!.contact_id, connection_id: conversations[0]!.connection_id,
  }, true);
  await c.execute(`INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,correlation_id,occurred_at,created_at)
    VALUES (?,?,?,?, 'transition','conversation',?,'accepted',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,
  [randomUUID(), tenant, b.actor.kind, b.actor.principal_id, id, ownerCanonical(['target_status', 'reason']), b.command_id]);
  await ownershipControlEvent(c, b, version, live.resource.owner_revision, registry, control);
  await advanceOwnershipDatasets(c, tenant);
  if(request.public_response){
    const response=structuredClone(request.public_response) as TransitionResponse;
    const value=clocks[0]!.updated_at,closedAt=value instanceof Date?value.toISOString():new Date(String(value).replace(' ','T').replace(/Z?$/,'Z')).toISOString();
    Object.assign(response.data,{status:'closed',closed_at:closedAt,version,need_response:false,allowed_actions:[]});
    await saveTransitionReceipt(c,b,request,response);
  }
  return { effect_id: id, effect_revision: version };
}
