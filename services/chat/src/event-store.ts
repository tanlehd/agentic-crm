import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { nextOwnerCounter, ownerCanonical, ownerDigest, ownerFail, validateOwnerValue } from '@agentic-crm/workload-transport';
import { businessTenant, session } from './database.js';
import { markRealtimeChange } from './realtime.js';

export const chatSubscriptions = [
  ['chat.read-marker.v1', 'chat', 'chat.read_marker.updated', [1]],
  ['chat.snooze.v1', 'chat', 'chat.snooze.changed', [1]],
  ['chat.inbox.changed.v1', 'chat', 'chat.inbox.changed', [1]],
  ['chat.snippet.changed.v1', 'chat', 'chat.snippet.changed', [1]],
  ['chat.tag_definition.changed.v1', 'chat', 'chat.tag_definition.changed', [1]],
  ['chat.conversation-tag.v1', 'chat', 'chat.conversation_tag.changed', [1]],
  ['human.routing.acquisition_session.opened.v1', 'routing', 'acquisition_session.opened', [1]],
  ['human.routing.acquisition_session.closed.v1', 'routing', 'acquisition_session.closed', [1]],
  ['human.routing.record.assigned.v1', 'routing', 'record.assigned', [1]],
  ['workflow.starter.v1', 'workflow', 'conversation.created', [1]],
  ['workflow.need.starter.v1', 'workflow', 'need.assessed', [1, 2]],
  ['crm.chat-registry.v1', 'crm', 'chat.registry.changed.v1', [1]],
  ['ai-runtime.chat-control.v1', 'ai-runtime', 'chat.registry.changed.v1', [1]],
  ['workflow.chat-control.v1', 'workflow', 'chat.registry.changed.v1', [1]],
] as const;

export type Subscription = typeof chatSubscriptions[number];
export type EventNotice = { producer: string; consumer: string; event_id: string; event_type: string; schema_version: number; aggregate_id: string; stream_sequence: string; digest: string };
export type EventReceipt = { producer: string; consumer: string; event_id: string; digest: string; state: 'pending' | 'applied' | 'duplicate' | 'reconciled' | 'quarantined'; watermark: string };
export type Delivery = RowDataPacket & { tenant_id: string; consumer_name: string; aggregate_type: string; aggregate_id: string; sequence: string; event_id: string; event_digest: string; envelope_json: string; registration_digest: string; state: string; lease_token: string; attempts: number };
export const decodeEvent = <T = Record<string, any>>(value: unknown): T => (typeof value === 'string' ? JSON.parse(value) : value) as T;
export function subscription(consumer: string, peer?: string): Subscription {
  const found = chatSubscriptions.find(s => s[0] === consumer);
  if (!found || peer !== undefined && found[1] !== peer) ownerFail('FORBIDDEN');
  return found;
}
export function registrationDigest(s: Subscription) {
  return ownerDigest({ version: 1, producer: 'chat', consumer: s[0], event_type: s[2], schema_versions: [...s[3]] });
}
export function eventNotice(row: Delivery): EventNotice {
  const event = decodeEvent(row.envelope_json);
  return { producer: 'chat', consumer: row.consumer_name, event_id: row.event_id, event_type: event.event_type,
    schema_version: event.schema_version, aggregate_id: row.aggregate_id, stream_sequence: String(row.sequence), digest: row.event_digest };
}

type EventConnection = { execute(sql: string, values: any[]): Promise<any> };
/** Called by Chat effect writers inside the same transaction, never from a remote owner. */
export async function writeChatOutbox(c: EventConnection, sql: string, values: any[]) {
  await c.execute(sql, values);
  await stageChatEvent(c, String(values[1]), String(values[0]));
  markRealtimeChange();
}

/** Also used by the fenced legacy catch-up; existing envelopes are immutable. */
export async function stageChatEvent(c: EventConnection, tenant: string, id: string) {
  const [[row]] = await c.execute("SELECT *,DATE_FORMAT(occurred_at,'%Y-%m-%dT%H:%i:%s.%fZ') event_at FROM outbox_event WHERE tenant_id=? AND id=? FOR UPDATE", [tenant, id]);
  if (!row) ownerFail('NOT_FOUND');
  const registrations = chatSubscriptions.filter(s => s[2] === row.event_type);
  for (const s of registrations) {
    if (!(s[3] as readonly number[]).includes(Number(row.schema_version))) ownerFail('CONFLICT');
    const registration = registrationDigest(s);
    await c.execute(`INSERT INTO chat_event_stream(tenant_id,consumer_name,aggregate_type,aggregate_id,next_sequence,acked_through,retained_from,registration_digest,version,created_at,updated_at)
      VALUES (?,?,?,?,1,0,1,?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE aggregate_id=aggregate_id`, [tenant, s[0], row.aggregate_type, row.aggregate_id, registration]);
    const [[stream]] = await c.execute('SELECT next_sequence,registration_digest FROM chat_event_stream WHERE tenant_id=? AND consumer_name=? AND aggregate_type=? AND aggregate_id=? FOR UPDATE', [tenant, s[0], row.aggregate_type, row.aggregate_id]);
    if (stream.registration_digest !== registration) ownerFail('CONFLICT');
    const [[old]] = await c.execute('SELECT * FROM chat_event_delivery WHERE tenant_id=? AND consumer_name=? AND event_id=? FOR UPDATE', [tenant, s[0], id]);
    const sequence = String(old?.sequence ?? stream.next_sequence);
    const control = row.event_type === 'chat.registry.changed.v1';
    const wire = control ? decodeEvent(row.payload) : {
      event_id: id, tenant_id: tenant, producer: 'chat', event_type: row.event_type, schema_version: Number(row.schema_version),
      aggregate_id: row.aggregate_id, aggregate_type: row.aggregate_type, aggregate_version: String(row.aggregate_version),
      occurred_at: row.event_at, correlation_id: row.correlation_id, causation_id: row.causation_id,
      actor: { kind: row.actor_kind, id: row.actor_id }, data: decodeEvent(row.payload),
    };
    const digest = ownerDigest(wire);
    const envelope = control ? wire : { ...wire, stream_sequence: sequence, ...(s[1] === 'chat' ? { consumer: s[0] } : {}) };
    validateOwnerValue(control ? 'OwnerControlEvent' : s[1] === 'chat' ? 'OwnerChatEvent' : 'OwnerDomainEvent', envelope);
    if (Buffer.byteLength(ownerCanonical(envelope)) > 262144) ownerFail('LIMIT_EXCEEDED');
    if (old) {
      if (old.event_digest !== digest || old.registration_digest !== registration || ownerCanonical(decodeEvent(old.envelope_json)) !== ownerCanonical(envelope)) ownerFail('CONFLICT');
      continue;
    }
    await c.execute(`INSERT INTO chat_event_delivery(tenant_id,consumer_name,aggregate_type,aggregate_id,sequence,event_id,event_digest,registration_digest,envelope_json,state,next_attempt_at,attempts,version,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,'pending',UTC_TIMESTAMP(6),0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, [tenant, s[0], row.aggregate_type, row.aggregate_id, sequence, id, digest, registration, ownerCanonical(envelope)]);
    await c.execute('UPDATE chat_event_stream SET next_sequence=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND consumer_name=? AND aggregate_type=? AND aggregate_id=?', [nextOwnerCounter(sequence), tenant, s[0], row.aggregate_type, row.aggregate_id]);
  }
}

export async function lockedDelivery(c: PoolConnection, tenant: string, consumer: string, event: string) {
  const [[row]] = await c.execute<Delivery[]>('SELECT * FROM chat_event_delivery WHERE tenant_id=? AND consumer_name=? AND event_id=? FOR UPDATE', [tenant, consumer, event]);
  return row;
}

/** Explicit operator/candidate catch-up before enabling writers, never a startup migration. */
export async function catchUpChatEvents(pool: Pool, tenant: string, epoch: string, limit = 100) {
  businessTenant(tenant);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) ownerFail('INVALID_REQUEST');
  const c = await pool.getConnection();
  try {
    await session(c);
    await c.beginTransaction();
    const [[gate]] = await c.execute<RowDataPacket[]>('SELECT mode,epoch FROM chat_writer_gate WHERE tenant_id=? FOR UPDATE', [tenant]);
    if (gate?.mode !== 'frozen' || String(gate.epoch) !== epoch) ownerFail('PRECONDITION_REQUIRED');
    const missing = chatSubscriptions.map(() => `(o.event_type=? AND NOT EXISTS (SELECT 1 FROM chat_event_delivery d WHERE d.tenant_id=o.tenant_id AND d.event_id=o.id AND d.consumer_name=?))`).join(' OR ');
    const [rows] = await c.execute<RowDataPacket[]>(`SELECT o.id FROM outbox_event o WHERE o.tenant_id=? AND (${missing}) ORDER BY o.created_at,o.id LIMIT ${limit} FOR UPDATE`, [tenant, ...chatSubscriptions.flatMap(s => [s[2], s[0]])]);
    for (const row of rows) {
      // Never append historical gaps after already-sequenced newer events. Operator must reconcile the export.
      const [[later]] = await c.execute<RowDataPacket[]>(`SELECT d.event_id FROM outbox_event o JOIN chat_event_delivery d
        ON d.tenant_id=o.tenant_id AND d.aggregate_type=o.aggregate_type AND d.aggregate_id=o.aggregate_id
        JOIN outbox_event n ON n.tenant_id=d.tenant_id AND n.id=d.event_id
        WHERE o.tenant_id=? AND o.id=? AND NOT EXISTS (SELECT 1 FROM chat_event_delivery old WHERE old.tenant_id=o.tenant_id AND old.event_id=o.id AND old.consumer_name=d.consumer_name)
        AND n.event_type=o.event_type AND (n.created_at>o.created_at OR (n.created_at=o.created_at AND n.id>o.id)) LIMIT 1`, [tenant, row.id]);
      if (later) ownerFail('CONFLICT');
      await stageChatEvent(c, tenant, String(row.id));
    }
    await c.commit();
    return rows.length;
  } catch (error) { await c.rollback(); throw error; }
  finally { c.release(); }
}
