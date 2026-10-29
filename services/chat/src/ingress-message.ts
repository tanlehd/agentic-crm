import { writeChatOutbox } from './event-store.js';
import { randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { MessageContent, OwnerCommandBinding, OwnerTarget } from '@agentic-crm/contracts';
import { nextOwnerCounter, ownerCanonical, ownerDigest, ownerFail } from '@agentic-crm/workload-transport';
import { IngressPayloadConflict, type IngressEffect } from './ingress.js';
import { advanceOwnershipDatasets, localEvent, ownershipControlEvent } from './ownership-effects.js';

const json = <T>(value: string | T): T => typeof value === 'string' ? JSON.parse(value) as T : value;
const utc = (value: string) => new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z').toISOString();
const defaultProcess = { stages: [{ key: 'received', label: 'Tiếp nhận' }, { key: 'consulting', label: 'Tư vấn' }, { key: 'next_step', label: 'Bước tiếp theo' }], milestones: [{ key: 'need_confirmed', label: 'Đã xác nhận nhu cầu' }, { key: 'next_step_agreed', label: 'Đã thống nhất bước tiếp theo' }] };

/** Compatibility projection of validated canonical rich content; exact original JSON is retained. */
export function ingressText(content: MessageContent): string {
  if (content.message_type === 'text') return content.text;
  if (content.text !== null) return content.text;
  const preview = content.message_type === 'media' ? '[Media] ' + content.attachment.items.map(item => item.name ?? item.media_type).join(' | ')
    : content.message_type === 'template' ? content.attachment.kind === 'gallery' ? '[Gallery] ' + content.attachment.cards.map(card => [card.title, card.subtitle].filter(Boolean).join(' — ')).join(' | ')
      : '[CSAT] ' + content.attachment.title + ': ' + content.attachment.prompt
      : '[Unsupported message] ' + content.attachment.label;
  return preview.slice(0, 4000);
}

async function audit(c: PoolConnection, b: OwnerCommandBinding, type: string, id: string, action: string, fields: string[], actor = { kind: String(b.actor.kind), id: b.actor.principal_id }) {
  await c.execute(`INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,correlation_id,occurred_at,created_at)
    VALUES (?,?,?,?,?,?,?,'accepted',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,
  [randomUUID(), b.tenant_id, actor.kind, actor.id, action, type, id, ownerCanonical(fields), b.command_id]);
}

async function activity(c: PoolConnection, tenant: string, id: string, kind: string, source: string, revision: string, payload: Record<string, unknown>, occurred: string | null = null, actor: { kind: string; id: string } | null = null) {
  const [[counter]] = await c.execute<RowDataPacket[]>('SELECT last_seq,backfilled FROM conversation_activity_counter WHERE tenant_id=? AND conversation_id=? FOR UPDATE', [tenant, id]);
  if (!counter?.backfilled) ownerFail('PRECONDITION_REQUIRED');
  const seq = nextOwnerCounter(String(counter.last_seq));
  await c.execute(`INSERT INTO conversation_activity(tenant_id,id,conversation_id,activity_seq,source_service,source_kind,source_id,source_revision,kind,actor_kind,actor_id,occurred_at,recorded_at,payload)
    VALUES (?,?,?,?,'chat',?,?,?,?,?,?,COALESCE(?,UTC_TIMESTAMP(6)),UTC_TIMESTAMP(6),?)`,
  [tenant, randomUUID(), id, seq, kind, source, revision, kind, actor?.kind ?? null, actor?.id ?? null, occurred, ownerCanonical(payload)]);
  await c.execute('UPDATE conversation_activity_counter SET last_seq=? WHERE tenant_id=? AND conversation_id=?', [seq, tenant, id]);
}

/** Chat-only writer. Called under Contact/inbox and durable admission command locks. */
export const processIngressMessage: IngressEffect = async (c, b, intake) => {
  if (b.operation !== 'ingress-process' || !b.references || !b.ingress_channel || !b.metadata) ownerFail('PRECONDITION_REQUIRED');
  const touch = b.ingress_touchpoint;
  if (Boolean(touch) !== Boolean(intake.referral) || touch && (touch.provider_message_digest !== ownerDigest(intake.provider_message_id) || touch.occurred_at !== intake.occurred_at || touch.ad_id !== (intake.referral?.ad_id ?? null) || touch.campaign_id !== (intake.referral?.campaign_id ?? null))) ownerFail('FORBIDDEN');
  const tenant = b.tenant_id, pin = b.references, channel = b.ingress_channel;
  const content = intake.message.type === 'rich' ? intake.message.content : null;
  const text = content ? ingressText(content) : intake.message.type === 'text' ? intake.message.text : '';
  if (!text.trim() || text.length > 4000) ownerFail('INVALID_REQUEST');
  const occurred = utc(intake.occurred_at).replace('T', ' ').replace('Z', '');
  const [existing] = await c.execute<RowDataPacket[]>(`SELECT m.*,v.contact_identity_id,v.contact_id,mc.content
    FROM message m JOIN conversation v ON v.tenant_id=m.tenant_id AND v.record_id=m.conversation_id
    LEFT JOIN message_content mc ON mc.tenant_id=m.tenant_id AND mc.message_id=m.id
    WHERE m.tenant_id=? AND m.connection_id=? AND m.provider_message_id=?`, [tenant, pin.connection_id, intake.provider_message_id]);
  if (existing[0]) {
    const old = existing[0];
    if (old.direction !== 'inbound' || old.contact_identity_id !== pin.crm_identity_id || old.contact_id !== pin.crm_contact_id || old.text !== text || utc(old.occurred_at) !== intake.occurred_at || ownerCanonical(old.content === null ? null : json(old.content)) !== ownerCanonical(content)) throw new IngressPayloadConflict();
    return { conversation_id: old.conversation_id as string, message_id: old.id as string, duplicate: true };
  }
  const [[selected]] = await c.execute<RowDataPacket[]>(`SELECT v.record_id FROM conversation v JOIN crm_record r ON r.tenant_id=v.tenant_id AND r.id=v.record_id
    WHERE v.tenant_id=? AND v.contact_identity_id=? AND r.archived_at IS NULL ORDER BY (v.active_identity_key IS NOT NULL) DESC,v.opened_at DESC,v.record_id DESC LIMIT 1`, [tenant, pin.crm_identity_id]);
  const id = selected?.record_id as string | undefined ?? randomUUID(), fresh = !selected;
  if (fresh) {
    await c.execute('INSERT INTO crm_record(id,tenant_id,object_type_id,team_id,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))', [id, tenant, b.metadata.object_type_id, channel.team_id]);
    await c.execute('INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,opened_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))', [tenant, id, pin.crm_contact_id, pin.crm_identity_id, pin.connection_id]);
    await c.execute('INSERT INTO chat_control_head(tenant_id,conversation_id,registry_revision,control_revision,cancel_through,pause_through,version,created_at,updated_at) VALUES (?,?,1,1,0,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))', [tenant, id]);
    await c.execute('INSERT INTO conversation_workspace(tenant_id,conversation_id,last_message_at) VALUES (?,?,UTC_TIMESTAMP(6))', [tenant, id]);
    await c.execute('INSERT INTO conversation_activity_counter(tenant_id,conversation_id,backfilled) VALUES (?,?,TRUE)', [tenant, id]);
    await c.execute("INSERT INTO ownership_history(id,tenant_id,record_id,to_team_id,owner_revision,reason,actor_kind,actor_id,created_at) VALUES (?,?,?,?,1,'inbound',?,?,UTC_TIMESTAMP(6))", [randomUUID(), tenant, id, channel.team_id, b.actor.kind, b.actor.principal_id]);
    await activity(c, tenant, id, 'assignment', id, '1', { from_principal_id: null, to_principal_id: null, owner_revision: '1', reason: 'inbound' }, null, { kind: b.actor.kind, id: b.actor.principal_id });
    await audit(c, b, 'conversation', id, 'create', ['team_id']);
  }
  const [[row]] = await c.execute<RowDataPacket[]>(`SELECT r.*,v.contact_id,v.contact_identity_id,v.connection_id,v.status,h.registry_revision,h.control_revision,h.pause_through,h.cancel_through
    FROM crm_record r JOIN conversation v ON v.tenant_id=r.tenant_id AND v.record_id=r.id JOIN chat_control_head h ON h.tenant_id=r.tenant_id AND h.conversation_id=r.id
    WHERE r.tenant_id=? AND r.id=? FOR UPDATE`, [tenant, id]);
  if (!row || row.archived_at !== null || row.object_type_id !== b.metadata.object_type_id || row.contact_id !== pin.crm_contact_id || row.connection_id !== pin.connection_id) ownerFail('PRECONDITION_REQUIRED');
  const [[workspace]] = await c.execute<RowDataPacket[]>('SELECT conversation_id FROM conversation_workspace WHERE tenant_id=? AND conversation_id=? FOR UPDATE', [tenant, id]);
  const [[counter]] = await c.execute<RowDataPacket[]>('SELECT backfilled FROM conversation_activity_counter WHERE tenant_id=? AND conversation_id=? FOR UPDATE', [tenant, id]);
  if (!workspace || !counter?.backfilled) ownerFail('PRECONDITION_REQUIRED');
  const [lastRows] = await c.execute<RowDataPacket[]>('SELECT * FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=? ORDER BY sequence DESC LIMIT 1 FOR UPDATE', [tenant, id]);
  const last = lastRows[0];
  if (last && (last.status === 'active') === (row.status === 'closed')) ownerFail('PRECONDITION_REQUIRED');
  const late = !!last && (last.status === 'active' ? intake.occurred_at < utc(last.opening_occurred_at) : intake.occurred_at <= utc(last.closed_at));
  const version = fresh ? '1' : nextOwnerCounter(String(row.version));
  const registryRevision = fresh ? '1' : nextOwnerCounter(String(row.registry_revision));
  const nextStatus = late && row.status === 'closed' ? 'closed' : 'open';
  if (!fresh) {
    await c.execute('UPDATE crm_record SET version=?,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?', [version, tenant, id]);
    await c.execute('UPDATE chat_control_head SET registry_revision=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND conversation_id=?', [registryRevision, tenant, id]);
    if (nextStatus !== row.status) {
      await c.execute("UPDATE conversation SET status='open',closed_at=NULL WHERE tenant_id=? AND record_id=?", [tenant, id]);
      await activity(c, tenant, id, 'lifecycle', id, version, { from_status: row.status, to_status: 'open' }, null, { kind: b.actor.kind, id: b.actor.principal_id });
    }
  }
  const message = randomUUID();
  await c.execute("INSERT INTO message(id,tenant_id,conversation_id,connection_id,provider_message_id,direction,text,occurred_at,received_at,status) VALUES (?,?,?,?,?,'inbound',?,?,UTC_TIMESTAMP(6),'received')", [message, tenant, id, pin.connection_id, intake.provider_message_id, text, occurred]);
  if (content) await c.execute('INSERT INTO message_content(tenant_id,message_id,content) VALUES (?,?,?)', [tenant, message, ownerCanonical(content)]);
  let session = last?.status === 'active' ? String(last.id) : null;
  if (!late && !session) {
    await c.execute('INSERT INTO session_process_head(tenant_id,version,created_at,updated_at) VALUES (?,1,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE tenant_id=tenant_id', [tenant]);
    const [[head]] = await c.execute<RowDataPacket[]>('SELECT version FROM session_process_head WHERE tenant_id=? FOR UPDATE', [tenant]);
    const [[initialVersion]] = await c.execute<RowDataPacket[]>('SELECT version FROM session_process_version WHERE tenant_id=? AND version=1', [tenant]);
    if (!initialVersion) await c.execute('INSERT INTO session_process_version(tenant_id,version,definition,created_at) VALUES (?,1,?,UTC_TIMESTAMP(3))', [tenant, ownerCanonical(defaultProcess)]);
    const [[process]] = await c.execute<RowDataPacket[]>('SELECT definition FROM session_process_version WHERE tenant_id=? AND version=?', [tenant, head!.version]);
    const definition = process && json<{ stages: { key: string }[] }>(process.definition);
    if (!definition?.stages?.[0]?.key) ownerFail('PRECONDITION_REQUIRED');
    await c.execute('UPDATE session_process_head SET updated_at=GREATEST(UTC_TIMESTAMP(3),updated_at+INTERVAL 1000 MICROSECOND) WHERE tenant_id=?', [tenant]);
    const [[clock]] = await c.execute<RowDataPacket[]>('SELECT updated_at FROM session_process_head WHERE tenant_id=?', [tenant]);
    session = randomUUID(); const sequence = nextOwnerCounter(String(last?.sequence ?? '0'));
    await c.execute(`INSERT INTO conversation_acquisition_session(tenant_id,id,conversation_id,sequence,status,opening_reason,opened_at,opening_occurred_at,source_classification,source_channel,source_page_id,source_connection_id,source_ad_id,source_campaign_id,source_touchpoint_id,policy_version)
      VALUES (?,?,?,?,'active',?,?,?,?,?,?,?,?,?,?,'inbox_v2')`, [tenant, session, id, sequence, last ? 'after_close' : 'first_inbound', clock!.updated_at, occurred, touch ? 'paid' : 'organic', pin.platform, channel.channel_id, pin.connection_id, touch?.ad_id ?? null, touch?.campaign_id ?? null, touch?.id ?? null]);
    await c.execute('INSERT INTO session_progress(tenant_id,session_id,process_version,stage_key,coverage,created_at,updated_at) VALUES (?,?,?,?,\'full\',?,?)', [tenant, session, head!.version, definition.stages[0].key, clock!.updated_at, clock!.updated_at]);
    await c.execute(`INSERT INTO session_contribution(tenant_id,session_id,id,conversation_id,revision,kind,source_id,source_revision,actor_kind,actor_id,owner_id,team_id,owner_revision,payload,recorded_at)
      VALUES (?,?,?,?,1,'opened',?,'1',?,?,?,?,?,'{}',UTC_TIMESTAMP(6))`, [tenant, session, randomUUID(), id, session, b.actor.kind, b.actor.principal_id, row.owner_principal_id, row.team_id, row.owner_revision]);
    await writeChatOutbox(c, `INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status)
      VALUES (?,?,'acquisition_session.opened',1,'acquisition_session',?,'1',?,?,?, ?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')`, [randomUUID(), tenant, session, ownerCanonical({ session_id: session, conversation_id: id, status: 'active', source_classification: touch ? 'paid' : 'organic', source_ad_id: touch?.ad_id ?? null, sequence }), b.command_id, b.actor.kind, b.actor.principal_id]);
    await audit(c, b, 'acquisition_session', session, 'acquisition.open', ['status', 'source']);
  }
  await c.execute('INSERT INTO message_acquisition_membership(tenant_id,message_id,conversation_id,session_id,resolution,created_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))', [tenant, message, id, late ? null : session, late ? 'unresolved_late' : 'assigned']);
  if (touch && !late) await c.execute('INSERT INTO session_touchpoint(tenant_id,touchpoint_id,session_id,conversation_id,occurred_at,recorded_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))', [tenant, touch.id, session, id, occurred]);
  const eventBinding = { ...b, resource: { ...b.resource, resource_id: id } };
  if (!late) {
    const [[snooze]] = await c.execute<RowDataPacket[]>('SELECT until_at,revision FROM conversation_snooze WHERE tenant_id=? AND conversation_id=? FOR UPDATE', [tenant, id]);
    if (snooze?.until_at) {
      const revision = nextOwnerCounter(String(snooze.revision));
      await c.execute("UPDATE conversation_snooze SET until_at=NULL,revision=?,actor_principal_id=NULL,reason=NULL,last_cause='inbound',updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND conversation_id=?", [revision, tenant, id]);
      await c.execute('UPDATE conversation_workspace SET snoozed_until=NULL,snooze_revision=? WHERE tenant_id=? AND conversation_id=?', [revision, tenant, id]);
      await activity(c, tenant, id, 'snooze', id, revision, { until: null, cause: 'inbound' }, null, { kind: 'system', id: tenant });
      await localEvent(c, eventBinding, 'chat.snooze.changed', version, { conversation_id: id, until: null, snooze_revision: revision, cause: 'inbound' }, { kind: 'system', id: tenant });
      await audit(c, b, 'conversation', id, 'snooze.inbound', ['snoozed_until'], { kind: 'system', id: tenant });
    }
    await activity(c, tenant, id, 'message', message, '1', { message_id: message }, occurred);
    await c.execute('UPDATE conversation_workspace SET latest_inbound_seq=latest_inbound_seq+1 WHERE tenant_id=? AND conversation_id=?', [tenant, id]);
    await c.execute('INSERT INTO message_workspace(tenant_id,message_id,conversation_id,inbound_seq) SELECT tenant_id,?,conversation_id,latest_inbound_seq FROM conversation_workspace WHERE tenant_id=? AND conversation_id=?', [message, tenant, id]);
    await c.execute("UPDATE conversation_workspace w JOIN message m ON m.tenant_id=w.tenant_id AND m.id=? SET w.last_message_at=m.received_at,w.waiting_since=IF(w.waiting_metric_state='ready',COALESCE(w.waiting_since,m.received_at),NULL) WHERE w.tenant_id=? AND w.conversation_id=?", [message, tenant, id]);
  }
  if (fresh) await localEvent(c, eventBinding, 'conversation.created', version, { contact_id: pin.crm_contact_id, connection_id: pin.connection_id });
  await audit(c, b, 'conversation', id, 'message.receive', ['message_id']);
  await localEvent(c, eventBinding, 'message.received', version, { conversation_id: id, message_id: message, connection_id: pin.connection_id });
  let kind: OwnerTarget['kind'] = null;
  if (row.owner_principal_id !== null) {
    const [[previous]] = await c.execute<RowDataPacket[]>("SELECT payload FROM outbox_event WHERE tenant_id=? AND aggregate_id=? AND event_type='chat.registry.changed.v1' ORDER BY aggregate_version DESC LIMIT 1", [tenant, id]);
    const snapshot = previous && json<{ snapshot: { owner_principal_id: string; owner_revision: string; owner_kind: OwnerTarget['kind'] } }>(previous.payload).snapshot;
    if (!snapshot || snapshot.owner_principal_id !== row.owner_principal_id || snapshot.owner_revision !== String(row.owner_revision) || !['human', 'ai'].includes(String(snapshot.owner_kind))) ownerFail('PRECONDITION_REQUIRED');
    kind = snapshot.owner_kind;
  }
  const [shared] = await c.execute<RowDataPacket[]>('SELECT team_id FROM record_team_access WHERE tenant_id=? AND record_id=? ORDER BY team_id', [tenant, id]);
  await ownershipControlEvent(c, { ...eventBinding, resource: { ...eventBinding.resource, shared_team_ids: shared.map(r => r.team_id as string) }, target: { kind, principal_id: row.owner_principal_id, team_id: row.team_id }, session_id: session }, version, String(row.owner_revision), registryRevision, String(row.control_revision), { pause: String(row.pause_through), cancel: String(row.cancel_through) });
  await advanceOwnershipDatasets(c, tenant);
  return { conversation_id: id, message_id: message, duplicate: false, ...(touch ? { touchpoint_id: touch.id, session_id: late ? null : session } : {}) };
};
