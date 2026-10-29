import { randomInt, randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { nextOwnerCounter, ownerCanonical, ownerFail, ownerRoute, validateOwnerValue, type WorkloadRoute } from '@agentic-crm/workload-transport';
import { businessTenant } from './database.js';
import { ChatOwnerCommands } from './owner-command.js';
import type { ChatActivityNotifications } from './activity-notifications.js';
import { chatSubscriptions, decodeEvent, eventNotice, lockedDelivery, registrationDigest, subscription, type Delivery, type EventNotice, type EventReceipt } from './event-store.js';

export type EventTransport = {
  configured(owner: string): boolean;
  call(tenant: string, owner: string, operation: 'event-deliver' | 'event-status', payload: unknown): Promise<unknown>;
};

export class ChatEventDelivery {
  private running = false;
  private cursor = 0;
  readonly tenants: readonly string[];
  constructor(private readonly commands: ChatOwnerCommands, tenants: readonly string[], private readonly transport: EventTransport) {
    this.tenants = Object.freeze([...new Set(tenants.map(businessTenant))].sort());
    if (!this.tenants.length) throw new Error('CHAT_EVENT_TENANTS_REQUIRED');
  }

  private tenant(tenant: string) {
    if (!this.tenants.includes(businessTenant(tenant))) ownerFail('FORBIDDEN');
  }

  async read(tenant: string, peer: string, input: unknown) {
    this.tenant(tenant);
    const notice = validateOwnerValue<EventNotice>('OwnerEventNotice', input);
    subscription(notice.consumer, peer);
    return this.commands.transaction(tenant, async c => {
      const row = await lockedDelivery(c, tenant, notice.consumer, notice.event_id);
      if (!row) ownerFail('NOT_FOUND');
      if (ownerCanonical(eventNotice(row)) !== ownerCanonical(notice)) ownerFail('CONFLICT');
      return validateOwnerValue('OwnerEventReadResult', decodeEvent(row.envelope_json));
    });
  }

  async replay(tenant: string, peer: string, input: { consumer: string; aggregate_id: string; after_sequence: string; limit: number }) {
    this.tenant(tenant);
    subscription(input.consumer, peer);
    if (!/^(0|[1-9]\d{0,19})$/.test(input.after_sequence) || !Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > 100) ownerFail('INVALID_REQUEST');
    return this.commands.transaction(tenant, async c => {
      const [streams] = await c.execute<RowDataPacket[]>('SELECT aggregate_type,next_sequence,retained_from FROM chat_event_stream WHERE tenant_id=? AND consumer_name=? AND aggregate_id=?', [tenant, input.consumer, input.aggregate_id]);
      if (!streams.length) return { events: [], high_watermark: '0' };
      if (streams.length !== 1 || BigInt(input.after_sequence) + 1n < BigInt(streams[0]!.retained_from)) ownerFail('CONFLICT');
      const [rows] = await c.execute<Delivery[]>(`SELECT * FROM chat_event_delivery WHERE tenant_id=? AND consumer_name=? AND aggregate_type=? AND aggregate_id=? AND sequence>? ORDER BY sequence LIMIT ${input.limit}`, [tenant, input.consumer, streams[0]!.aggregate_type, input.aggregate_id, input.after_sequence]);
      return { events: rows.map(eventNotice), high_watermark: (BigInt(streams[0]!.next_sequence) - 1n).toString() };
    });
  }

  private async claim(tenant: string): Promise<Delivery | null> {
    const available = chatSubscriptions.filter(s => s[1] === 'chat' || this.transport.configured(s[1])).map(s => s[0]);
    return this.commands.transaction(tenant, async c => {
      const [[row]] = await c.query<Delivery[]>(`SELECT d.* FROM chat_event_stream s JOIN chat_event_delivery d
        ON d.tenant_id=s.tenant_id AND d.consumer_name=s.consumer_name AND d.aggregate_type=s.aggregate_type AND d.aggregate_id=s.aggregate_id AND d.sequence=s.acked_through+1
        WHERE d.tenant_id=? AND d.consumer_name IN (?) AND d.state='pending' AND d.next_attempt_at<=UTC_TIMESTAMP(6)
        AND (d.lease_until IS NULL OR d.lease_until<=UTC_TIMESTAMP(6))
        ORDER BY d.next_attempt_at,d.created_at,d.consumer_name,d.sequence LIMIT 1 FOR UPDATE SKIP LOCKED`, [tenant, available]);
      if (!row) return null;
      if (row.registration_digest !== registrationDigest(subscription(row.consumer_name))) ownerFail('CONFLICT');
      const token = randomUUID();
      await c.execute('UPDATE chat_event_delivery SET lease_token=?,lease_until=UTC_TIMESTAMP(6)+INTERVAL 30 SECOND,attempts=attempts+1,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND consumer_name=? AND event_id=?', [token, tenant, row.consumer_name, row.event_id]);
      return { ...row, lease_token: token, attempts: Number(row.attempts) + 1 } as Delivery;
    });
  }

  private receipt(row: Delivery, input: unknown) {
    const r = validateOwnerValue<EventReceipt>('OwnerEventReceipt', input);
    if (r.producer !== 'chat' || r.consumer !== row.consumer_name || r.event_id !== row.event_id || r.digest !== row.event_digest) ownerFail('CONFLICT');
    if (['applied', 'duplicate', 'reconciled'].includes(r.state) && BigInt(r.watermark) < BigInt(row.sequence)) ownerFail('CONFLICT');
    return r;
  }

  private async finish(row: Delivery, receipt: EventReceipt | null) {
    return this.commands.transaction(row.tenant_id, async c => {
      await c.execute('SELECT id FROM outbox_event WHERE tenant_id=? AND id=? FOR UPDATE', [row.tenant_id, row.event_id]);
      const [[stream]] = await c.execute<RowDataPacket[]>('SELECT acked_through FROM chat_event_stream WHERE tenant_id=? AND consumer_name=? AND aggregate_type=? AND aggregate_id=? FOR UPDATE', [row.tenant_id, row.consumer_name, row.aggregate_type, row.aggregate_id]);
      const live = await lockedDelivery(c, row.tenant_id, row.consumer_name, row.event_id);
      if (!live || live.state !== 'pending' || live.lease_token !== row.lease_token) return false;
      const [[lease]] = await c.execute<RowDataPacket[]>('SELECT lease_until>UTC_TIMESTAMP(6) valid FROM chat_event_delivery WHERE tenant_id=? AND consumer_name=? AND event_id=?', [row.tenant_id, row.consumer_name, row.event_id]);
      if (!Number(lease?.valid)) return false;
      const ack = receipt && ['applied', 'duplicate', 'reconciled'].includes(receipt.state);
      if (ack) {
        if (!stream || nextOwnerCounter(String(stream.acked_through)) !== String(row.sequence)) ownerFail('CONFLICT');
        await c.execute("UPDATE chat_event_delivery SET state='acked',acked_at=UTC_TIMESTAMP(6),lease_token=NULL,lease_until=NULL,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND consumer_name=? AND event_id=?", [row.tenant_id, row.consumer_name, row.event_id]);
        await c.execute('UPDATE chat_event_stream SET acked_through=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND consumer_name=? AND aggregate_type=? AND aggregate_id=?', [row.sequence, row.tenant_id, row.consumer_name, row.aggregate_type, row.aggregate_id]);
        const [[remaining]] = await c.execute<RowDataPacket[]>("SELECT COUNT(*) n FROM chat_event_delivery WHERE tenant_id=? AND event_id=? AND state<>'acked'", [row.tenant_id, row.event_id]);
        if (!Number(remaining!.n)) await c.execute("UPDATE outbox_event SET status='dispatched',lease_until=NULL WHERE tenant_id=? AND id=?", [row.tenant_id, row.event_id]);
      } else {
        const quarantine = receipt?.state === 'quarantined' || Number(live.attempts) >= 10;
        const base = [1, 5, 30, 120, 600][Math.min(4, Number(live.attempts) - 1)]!;
        const delay = Math.max(1, Math.round(base * randomInt(80, 121) / 100));
        await c.execute('UPDATE chat_event_delivery SET state=?,next_attempt_at=TIMESTAMPADD(SECOND,?,UTC_TIMESTAMP(6)),lease_token=NULL,lease_until=NULL,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND consumer_name=? AND event_id=?', [quarantine ? 'quarantined' : 'pending', delay, row.tenant_id, row.consumer_name, row.event_id]);
      }
      return !!ack;
    });
  }

  private async localWatermark(c: PoolConnection, tenant: string, consumer: string, aggregate: string) {
    const [[head]] = await c.execute<RowDataPacket[]>("SELECT MAX(CASE WHEN state='applied' THEN sequence ELSE 0 END) high,MIN(CASE WHEN state<>'applied' THEN sequence END) blocked FROM chat_event_inbox WHERE tenant_id=? AND producer='chat' AND consumer_name=? AND aggregate_id=?", [tenant, consumer, aggregate]);
    let high = BigInt(head?.high ?? '0');
    if (head?.blocked != null && high >= BigInt(head.blocked)) high = BigInt(head.blocked) - 1n;
    return high.toString();
  }

  async tick(limit = 100) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) ownerFail('INVALID_REQUEST');
    if (this.running) return { attempted: 0, acknowledged: 0 };
    this.running = true;
    let attempted = 0, acknowledged = 0, empty = 0;
    try {
      while (attempted < limit && empty < this.tenants.length) {
          const tenant = this.tenants[this.cursor++ % this.tenants.length]!;
          const row = await this.claim(tenant);
          if (!row) { empty++; continue; }
          empty = 0;
          attempted++;
          const s = subscription(row.consumer_name), notice = eventNotice(row);
          let receipt: EventReceipt | null = null;
          try {
            if (s[1] === 'chat') receipt = await this.localDeliver(tenant, 'chat', decodeEvent(row.envelope_json));
            else {
              if (row.attempts > 1) {
                try { receipt = this.receipt(row, await this.transport.call(tenant, s[1], 'event-status', notice)); }
                catch (error) { if ((error as { code?: string }).code !== 'NOT_FOUND') throw error; }
              }
              if (!receipt || receipt.state === 'pending') receipt = this.receipt(row, await this.transport.call(tenant, s[1], 'event-deliver', { notice }));
            }
          } catch { /* Retain the immutable delivery; no network uncertainty can advance ACK. */ }
          if (await this.finish(row, receipt)) acknowledged++;
      }
      return { attempted, acknowledged };
    } finally { this.running = false; }
  }

  async localDeliver(tenant: string, peer: string, input: unknown): Promise<EventReceipt> {
    this.tenant(tenant);
    const e = validateOwnerValue<Record<string, any>>('OwnerChatEvent', input);
    subscription(e.consumer, peer);
    if (peer !== 'chat' || e.producer !== 'chat' || e.tenant_id !== tenant) ownerFail('FORBIDDEN');
    return this.commands.transaction(tenant, async c => {
      const source = await lockedDelivery(c, tenant, e.consumer, e.event_id);
      if (!source) ownerFail('NOT_FOUND');
      const [old] = await c.execute<RowDataPacket[]>('SELECT * FROM chat_event_inbox WHERE tenant_id=? AND producer=\'chat\' AND consumer_name=? AND (event_id=? OR (aggregate_type=? AND aggregate_id=? AND sequence=?)) FOR UPDATE', [tenant, e.consumer, e.event_id, e.aggregate_type, e.aggregate_id, e.stream_sequence]);
      const mismatch = ownerCanonical(decodeEvent(source.envelope_json)) !== ownerCanonical(e) || old.some(r => r.event_id !== e.event_id || r.event_digest !== source.event_digest || String(r.sequence) !== String(e.stream_sequence));
      if (mismatch && old.length) await c.execute("UPDATE chat_event_inbox SET state='quarantined',applied_at=NULL,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND producer='chat' AND consumer_name=? AND (event_id=? OR (aggregate_type=? AND aggregate_id=? AND sequence=?))", [tenant, e.consumer, e.event_id, e.aggregate_type, e.aggregate_id, e.stream_sequence]);
      const result = (state: EventReceipt['state'], watermark: string): EventReceipt => ({ event_id: e.event_id, consumer: e.consumer, producer: 'chat', digest: source.event_digest, state, watermark });
      if (mismatch) return result('quarantined', '0');
      if (old[0]?.state === 'quarantined') return result('quarantined', '0');
      const high = await this.localWatermark(c, tenant, e.consumer, e.aggregate_id);
      if (old[0]?.state === 'applied') return result('duplicate', high);
      if (!old.length) await c.execute(`INSERT INTO chat_event_inbox(tenant_id,producer,consumer_name,event_id,aggregate_type,aggregate_id,sequence,event_digest,envelope_json,state,next_attempt_at,attempts,version,created_at,updated_at)
        VALUES (?,'chat',?,?,?,?,?,?,?,'pending',UTC_TIMESTAMP(6),0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, [tenant, e.consumer, e.event_id, e.aggregate_type, e.aggregate_id, e.stream_sequence, source.event_digest, source.envelope_json]);
      if (nextOwnerCounter(high) !== String(e.stream_sequence)) return result('pending', high);
      const d = e.data;
      if (e.event_type === 'chat.read_marker.updated') {
        if (e.actor.kind !== 'human' || e.actor.id !== d.principal_id || e.aggregate_type !== 'conversation_read_state' || e.aggregate_version !== d.read_state_revision) ownerFail('CONFLICT');
      } else if (e.event_type === 'chat.snooze.changed' || e.event_type === 'chat.conversation_tag.changed') {
        if (e.aggregate_type !== 'conversation' || d.conversation_id !== e.aggregate_id || e.event_type === 'chat.conversation_tag.changed' && e.actor.kind !== 'human') ownerFail('CONFLICT');
      } else {
        const kind = e.event_type === 'chat.inbox.changed' ? ['chat_inbox', 'inbox_id'] : e.event_type === 'chat.snippet.changed' ? ['chat_snippet', 'snippet_id'] : ['conversation_tag', 'tag_id'];
        if (e.aggregate_type !== kind[0] || d[kind[1]!] !== e.aggregate_id || e.actor.kind !== 'human') ownerFail('CONFLICT');
      }
      await c.execute("UPDATE chat_event_inbox SET state='applied',applied_at=UTC_TIMESTAMP(6),attempts=attempts+1,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND producer='chat' AND consumer_name=? AND event_id=?", [tenant, e.consumer, e.event_id]);
      return result('applied', String(e.stream_sequence));
    });
  }

  async localStatus(tenant: string, peer: string, input: unknown): Promise<EventReceipt> {
    const notice = validateOwnerValue<EventNotice>('OwnerEventNotice', input);
    if (peer !== 'chat') ownerFail('FORBIDDEN');
    await this.read(tenant, peer, notice);
    return this.commands.transaction(tenant, async c => {
      const [[row]] = await c.execute<RowDataPacket[]>("SELECT state,sequence FROM chat_event_inbox WHERE tenant_id=? AND producer='chat' AND consumer_name=? AND event_id=?", [tenant, notice.consumer, notice.event_id]);
      if (!row) ownerFail('NOT_FOUND');
      return { producer: 'chat', consumer: notice.consumer, event_id: notice.event_id, digest: notice.digest, state: row.state, watermark: await this.localWatermark(c, tenant, notice.consumer, notice.aggregate_id) };
    });
  }
}

export function chatEventSourceRoutes(events: ChatEventDelivery): Record<string, WorkloadRoute> {
  const peers = [...new Set(chatSubscriptions.map(s => s[1]))];
  return {
    '/internal/v1/owners/chat/event-read': ownerRoute('chat', 'event-read', peers, (r, p) => events.read(r.tenant_id, p.service, r.payload)),
    '/internal/v1/owners/chat/event-replay': ownerRoute('chat', 'event-replay', peers, (r, p) => events.replay(r.tenant_id, p.service, r.payload as any)),
  };
}

/** One authenticated route map; composing factories must never overwrite either consumer group. */
export function chatEventRoutes(events: ChatEventDelivery, activity: ChatActivityNotifications): Record<string, WorkloadRoute> {
  return {
    ...chatEventSourceRoutes(events),
    '/internal/v1/owners/chat/event-deliver': ownerRoute('chat', 'event-deliver', ['chat', 'crm', 'workflow'],
      (r, p) => p.service === 'chat' ? events.localDeliver(r.tenant_id, p.service, r.payload) : activity.deliver(r.tenant_id, p.service, r.payload)),
    '/internal/v1/owners/chat/event-status': ownerRoute('chat', 'event-status', ['chat', 'crm', 'workflow'],
      (r, p) => p.service === 'chat' ? events.localStatus(r.tenant_id, p.service, r.payload) : activity.status(r.tenant_id, p.service, r.payload)),
  };
}
