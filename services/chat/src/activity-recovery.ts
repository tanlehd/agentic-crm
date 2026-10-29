import { randomInt, randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { nextOwnerCounter, ownerCanonical, ownerFail, validateOwnerValue } from '@agentic-crm/workload-transport';
import { ChatActivityNotifications, activityEventDigest } from './activity-notifications.js';
import { ChatOwnerCommands } from './owner-command.js';
import { businessTenant } from './database.js';
import { decodeEvent, type EventNotice } from './event-store.js';

export type ActivityReplayTransport = {
  call(tenant: string, producer: 'crm' | 'workflow', operation: 'event-read' | 'event-replay', payload: unknown): Promise<unknown>;
};
type Pending = RowDataPacket & { tenant_id: string; producer: 'crm' | 'workflow'; consumer_name: string; event_id: string;
  aggregate_type: string; aggregate_id: string; sequence: string; envelope_json: unknown; lease_token: string; attempts: number };

/** Retries only Chat's two Activity subscriptions; source owners retain their own business work. */
export class ChatActivityRecovery {
  private running = false;
  private cursor = 0;
  readonly tenants: readonly string[];
  constructor(private readonly commands: ChatOwnerCommands, private readonly consumer: ChatActivityNotifications,
    tenants: readonly string[], private readonly source: ActivityReplayTransport) {
    this.tenants = Object.freeze([...new Set(tenants.map(businessTenant))].sort());
    if (!this.tenants.length) throw new Error('CHAT_EVENT_TENANTS_REQUIRED');
  }

  private async claim(tenant: string): Promise<Pending | null> {
    return this.commands.transaction(tenant, async c => {
      const [[row]] = await c.execute<Pending[]>(`SELECT i.* FROM chat_event_inbox i WHERE i.tenant_id=? AND i.state='pending'
        AND ((i.producer='crm' AND i.consumer_name='chat.activity.note.v1') OR (i.producer='workflow' AND i.consumer_name='chat.activity.automation.v1'))
        AND i.next_attempt_at<=UTC_TIMESTAMP(6) AND (i.lease_until IS NULL OR i.lease_until<=UTC_TIMESTAMP(6))
        AND NOT EXISTS (SELECT 1 FROM chat_event_inbox prior WHERE prior.tenant_id=i.tenant_id AND prior.producer=i.producer
          AND prior.consumer_name=i.consumer_name AND prior.aggregate_type=i.aggregate_type AND prior.aggregate_id=i.aggregate_id
          AND prior.sequence<i.sequence AND prior.state<>'applied')
        ORDER BY i.next_attempt_at,i.created_at,i.event_id LIMIT 1 FOR UPDATE SKIP LOCKED`, [tenant]);
      if (!row) return null;
      const token = randomUUID();
      await c.execute(`UPDATE chat_event_inbox SET lease_token=?,lease_until=UTC_TIMESTAMP(6)+INTERVAL 30 SECOND,
        attempts=attempts+1,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND producer=? AND consumer_name=? AND event_id=?`,
      [token, tenant, row.producer, row.consumer_name, row.event_id]);
      return { ...row, lease_token: token, attempts: Number(row.attempts) + 1 } as Pending;
    });
  }

  private async fence(c: PoolConnection, row: Pending) {
    const [[live]] = await c.execute<RowDataPacket[]>(`SELECT lease_token,lease_until>UTC_TIMESTAMP(6) valid FROM chat_event_inbox
      WHERE tenant_id=? AND producer=? AND consumer_name=? AND event_id=? FOR UPDATE`,
    [row.tenant_id, row.producer, row.consumer_name, row.event_id]);
    if (!live || live.lease_token !== row.lease_token || !Number(live.valid)) ownerFail('STALE_VERSION');
  }

  private async recover(row: Pending) {
    const tenant = row.tenant_id, event = decodeEvent(row.envelope_json);
    const watermark = await this.commands.transaction(tenant, async c => {
      await this.fence(c, row);
      const [[head]] = await c.execute<RowDataPacket[]>(`SELECT COALESCE(MAX(sequence),0) high FROM chat_event_inbox
        WHERE tenant_id=? AND producer=? AND consumer_name=? AND aggregate_type=? AND aggregate_id=? AND state='applied' AND sequence<?`,
      [tenant, row.producer, row.consumer_name, row.aggregate_type, row.aggregate_id, row.sequence]);
      return String(head!.high);
    });
    if (nextOwnerCounter(watermark) !== String(row.sequence)) {
      const page = await this.source.call(tenant, row.producer, 'event-replay', {
        consumer: row.consumer_name, aggregate_id: row.aggregate_id, after_sequence: watermark,
        limit: Number(BigInt(row.sequence) - BigInt(watermark) > 100n ? 100n : BigInt(row.sequence) - BigInt(watermark)),
      }) as { events: unknown[]; high_watermark: string };
      if (!page || !Array.isArray(page.events) || page.events.length > 100 || !/^(0|[1-9]\d{0,19})$/.test(page.high_watermark)
        || BigInt(page.high_watermark) < BigInt(row.sequence)) ownerFail('CONFLICT');
      let previous = watermark;
      for (const raw of page.events) {
        const notice = validateOwnerValue<EventNotice>('OwnerEventNotice', raw);
        if (notice.producer !== row.producer || notice.consumer !== row.consumer_name || notice.aggregate_id !== row.aggregate_id
          || notice.stream_sequence !== nextOwnerCounter(previous) || BigInt(notice.stream_sequence) > BigInt(row.sequence)) ownerFail('CONFLICT');
        const envelope = validateOwnerValue<any>('OwnerChatEvent', await this.source.call(tenant, row.producer, 'event-read', notice));
        const actual = { producer: envelope.producer, consumer: envelope.consumer, event_id: envelope.event_id,
          event_type: envelope.event_type, schema_version: envelope.schema_version, aggregate_id: envelope.aggregate_id,
          stream_sequence: envelope.stream_sequence, digest: activityEventDigest(envelope) };
        if (envelope.tenant_id !== tenant || envelope.aggregate_type !== row.aggregate_type || ownerCanonical(actual) !== ownerCanonical(notice)) ownerFail('CONFLICT');
        const receipt = await this.consumer.deliver(tenant, row.producer, envelope, c => this.fence(c, row));
        if (!['applied', 'duplicate'].includes(receipt.state)) return;
        previous = notice.stream_sequence;
      }
      if (nextOwnerCounter(previous) !== String(row.sequence) && previous !== String(row.sequence)) return;
    }
    await this.consumer.deliver(tenant, row.producer, event, c => this.fence(c, row));
  }

  private async finish(row: Pending) {
    return this.commands.transaction(row.tenant_id, async c => {
      try { await this.fence(c, row); } catch (error) { if ((error as {code?: string}).code === 'STALE_VERSION') return; throw error; }
      const delay = Math.max(1, Math.round([1, 5, 30, 120, 600][Math.min(4, row.attempts - 1)]! * randomInt(80, 121) / 100));
      await c.execute(`UPDATE chat_event_inbox SET state=CASE WHEN state='pending' AND attempts>=10 THEN 'quarantined' ELSE state END,
        next_attempt_at=TIMESTAMPADD(SECOND,?,UTC_TIMESTAMP(6)),lease_token=NULL,lease_until=NULL,version=version+1,updated_at=UTC_TIMESTAMP(6)
        WHERE tenant_id=? AND producer=? AND consumer_name=? AND event_id=?`, [delay, row.tenant_id, row.producer, row.consumer_name, row.event_id]);
    });
  }

  async tick(limit = 100) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) ownerFail('INVALID_REQUEST');
    if (this.running) return { attempted: 0 };
    this.running = true;
    let attempted = 0, empty = 0;
    try {
      while (attempted < limit && empty < this.tenants.length) {
        const tenant = this.tenants[this.cursor++ % this.tenants.length]!;
        const row = await this.claim(tenant);
        if (!row) { empty++; continue; }
        empty = 0; attempted++;
        try { await this.recover(row); } catch { /* Network gaps retain the durable envelope; never skip or synthesize an event. */ }
        await this.finish(row);
      }
      return { attempted };
    } finally { this.running = false; }
  }
}
