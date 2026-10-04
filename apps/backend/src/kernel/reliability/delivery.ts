import type { DataSource } from 'typeorm';
import { UnitOfWork, type TransactionScope } from '../tenancy/unit-of-work.js';
export interface Delivery { tenantId: string; eventId: string; token: string }
export interface Envelope {
  event_id: string; tenant_id: string; event_type: string; schema_version: number;
  aggregate_type: string; aggregate_id: string; aggregate_version: string;
  occurred_at: string; correlation_id: string; causation_id: string | null;
  actor: {kind: string; id: string}; data: Record<string, unknown>;
}
export class DeliveryError extends Error {
  constructor(readonly code: 'INVALID_EVENT' | 'FORBIDDEN' | 'UNSUPPORTED_EVENT' | 'LEASE_LOST') { super(code); }
}
export interface Consumer { name: string; type: string; handle(scope: TransactionScope, event: Envelope): Promise<void> }
const delays = [1, 5, 30, 120, 600];
export class DurableDelivery {
  private readonly uow: UnitOfWork;
  constructor(private readonly source: DataSource) { this.uow = new UnitOfWork(source); }
  async claim(): Promise<Delivery[]> {
    const runner = this.source.createQueryRunner();
    try {
      await runner.connect(); await runner.startTransaction('READ COMMITTED');
      const rows = await runner.query(`SELECT tenant_id,id FROM outbox_event WHERE
        (status='pending' AND (next_attempt_at IS NULL OR next_attempt_at<=UTC_TIMESTAMP(6)))
        OR (status='processing' AND lease_until<=UTC_TIMESTAMP(6))
        ORDER BY created_at,id LIMIT 100 FOR UPDATE SKIP LOCKED`);
      const claimed: Delivery[] = [];
      for (const row of rows) {
        await runner.query("UPDATE outbox_event SET status='processing',lease_until=TIMESTAMPADD(SECOND,60,UTC_TIMESTAMP(6)),fencing_token=fencing_token+1 WHERE tenant_id=? AND id=?", [row.tenant_id,row.id]);
        const [current] = await runner.query('SELECT fencing_token FROM outbox_event WHERE tenant_id=? AND id=?',[row.tenant_id,row.id]);
        claimed.push({tenantId:row.tenant_id,eventId:row.id,token:String(current.fencing_token)});
      }
      await runner.commitTransaction(); return claimed;
    } catch (error) { if (runner.isTransactionActive) await runner.rollbackTransaction(); throw error; }
    finally { await runner.release(); }
  }
  private async locked(scope: TransactionScope, delivery: Delivery) {
    const [row] = await scope.query("SELECT * FROM outbox_event WHERE tenant_id=? AND id=? AND fencing_token=? AND status='processing' AND lease_until>UTC_TIMESTAMP(6) FOR UPDATE",[scope.context.tenantId,delivery.eventId,delivery.token]);
    if (!row) throw new DeliveryError('LEASE_LOST');
    return row;
  }
  private envelope(row: any): Envelope {
    const data = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
    if (!data || Array.isArray(data) || typeof data !== 'object' || String(row.schema_version)!=='1') throw new DeliveryError('INVALID_EVENT');
    return {event_id:row.id,tenant_id:row.tenant_id,event_type:row.event_type,schema_version:1,
      aggregate_type:row.aggregate_type,aggregate_id:row.aggregate_id,aggregate_version:String(row.aggregate_version),
      occurred_at:new Date(row.occurred_at).toISOString(),correlation_id:row.correlation_id,causation_id:row.causation_id,
      actor:{kind:row.actor_kind,id:row.actor_id},data};
  }
  async consume(delivery: Delivery, consumer: Consumer): Promise<void> {
    if (!/^[a-z][a-z0-9_.-]{0,127}$/.test(consumer.name)) throw new DeliveryError('INVALID_EVENT');
    await this.uow.run({tenantId:delivery.tenantId},async scope => {
      const row = await this.locked(scope,delivery);
      if (row.event_type !== consumer.type) throw new DeliveryError('UNSUPPORTED_EVENT');
      const [existing] = await scope.query('SELECT status FROM consumer_inbox WHERE tenant_id=? AND consumer_name=? AND event_id=?',[delivery.tenantId,consumer.name,delivery.eventId]);
      if (existing?.status === 'completed') return;
      await scope.query("INSERT INTO consumer_inbox(tenant_id,consumer_name,event_id,status) VALUES (?,?,?,'processing')",[delivery.tenantId,consumer.name,delivery.eventId]);
      await consumer.handle(scope,this.envelope(row));
      // Re-check DB time after handler, while holding the same row lock.
      await this.locked(scope,delivery);
      await scope.query("UPDATE consumer_inbox SET status='completed',processed_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND consumer_name=? AND event_id=?",[delivery.tenantId,consumer.name,delivery.eventId]);
    });
  }
  async finish(delivery: Delivery, error?: unknown): Promise<void> {
    await this.uow.run({tenantId:delivery.tenantId},async scope => {
      const row = await this.locked(scope,delivery);
      const attempts = Number(row.attempts) + 1;
      const terminal = error instanceof DeliveryError && error.code !== 'LEASE_LOST';
      const failed = error !== undefined;
      const retry = failed && !terminal && attempts <= delays.length;
      await scope.query(`UPDATE outbox_event SET status=?,attempts=?,lease_until=NULL,next_attempt_at=${retry?'TIMESTAMPADD(SECOND,?,UTC_TIMESTAMP(6))':'NULL'} WHERE tenant_id=? AND id=? AND fencing_token=?`,
        [failed?(retry?'pending':'failed'):'dispatched',attempts,...(retry?[delays[attempts-1]]:[]),delivery.tenantId,delivery.eventId,delivery.token]);
    });
  }
  async dispatch(delivery: Delivery, consumers: readonly Consumer[]): Promise<void> {
    try {
      // Fetch type from durable state; callers never supply an envelope.
      const [row] = await this.source.query('SELECT event_type FROM outbox_event WHERE tenant_id=? AND id=?',[delivery.tenantId,delivery.eventId]);
      const targets = consumers.filter(c => c.type === row?.event_type);
      if (!targets.length) throw new DeliveryError('UNSUPPORTED_EVENT');
      for (const consumer of targets) await this.consume(delivery,consumer);
      await this.finish(delivery);
    } catch (error) {
      if (error instanceof DeliveryError && error.code === 'LEASE_LOST') return;
      try { await this.finish(delivery,error); }
      catch (failure) { if (!(failure instanceof DeliveryError && failure.code === 'LEASE_LOST')) throw failure; }
    }
  }
  async expireReceipts(): Promise<void> {
    await this.source.query("DELETE FROM idempotency_record WHERE status='completed' AND expires_at<=UTC_TIMESTAMP(6) LIMIT 100");
  }
}
