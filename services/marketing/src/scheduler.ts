import { createHash, randomInt, randomUUID } from 'node:crypto';
import type { PoolConnection, ResultSetHeader } from 'mysql2/promise';
import { MarketingDatabase, MarketingError, positive, rows, tenant, uuid, type Row } from './database.js';

const profile = 'object_metadata_v1';
export interface Lease {
  tenantId: string; scheduleId: string; accountId: string; bindingId: string;
  runId: string; owner: string; fence: string;
}
interface Schedule extends Row {
  tenant_id: string; id: string; account_id: string; binding_id: string; active_run_id: string | null;
  enabled: number; state: string; fence: string; version: string; consecutive_errors: number; interval_seconds: number;
}
export interface Checkpoint {
  profile_version: 'object_metadata_v1'; after: string | null; last_committed_ad_id: string | null;
  page_digest: string | null; scanned_count: string; completed_pages: number;
}
export function checkpoint(value: Checkpoint): string {
  const keys = ['profile_version', 'after', 'last_committed_ad_id', 'page_digest', 'scanned_count', 'completed_pages'];
  if (!value || Object.keys(value).length !== keys.length || Object.keys(value).some(k => !keys.includes(k)) || value.profile_version !== profile ||
    (value.after !== null && (typeof value.after !== 'string' || !/^[\x21-\x7e]{1,2048}$/.test(value.after) || /:\/\//.test(value.after))) ||
    (value.last_committed_ad_id !== null && (typeof value.last_committed_ad_id !== 'string' || !/^[A-Za-z0-9_-]{1,255}$/.test(value.last_committed_ad_id))) ||
    (value.page_digest !== null && (typeof value.page_digest !== 'string' || !/^[a-f0-9]{64}$/.test(value.page_digest))) ||
    typeof value.scanned_count !== 'string' || !/^(0|[1-9][0-9]{0,19})$/.test(value.scanned_count) || BigInt(value.scanned_count) > 18446744073709551615n ||
    !Number.isSafeInteger(value.completed_pages) || value.completed_pages < 0 || value.completed_pages > 1000) throw new MarketingError('INVALID_CHECKPOINT', 400);
  return JSON.stringify(value);
}
export const emptyCheckpoint = (): Checkpoint => ({ profile_version: profile, after: null, last_committed_ad_id: null, page_digest: null, scanned_count: '0', completed_pages: 0 });

/** All network work happens before/after these transactions. This class has no provider transport. */
export class MarketingScheduler {
  constructor(readonly db: MarketingDatabase) {}

  /** Called only inside a verified binding installation transaction. */
  async install(c: PoolConnection, tenantId: string, accountId: string, bindingId: string): Promise<string> {
    tenant(tenantId); uuid(accountId); uuid(bindingId);
    const id = randomUUID();
    await c.execute(`INSERT INTO marketing_sync_schedule
      (tenant_id,id,account_id,binding_id,profile,enabled,state,next_due_at,created_at,updated_at)
      VALUES (?,?,?,?,?,1,'idle',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, [tenantId, id, accountId, bindingId, profile]);
    await c.execute(`INSERT INTO marketing_change_clock (tenant_id,created_at,updated_at) VALUES (?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))
      ON DUPLICATE KEY UPDATE tenant_id=VALUES(tenant_id)`, [tenantId]);
    return id;
  }

  /** The sole bounded cross-tenant query: a claim immediately becomes an explicit tenant context. */
  async claim(owner: string): Promise<Lease | null> {
    uuid(owner);
    return this.db.transaction(async c => {
      const [s] = await rows<Schedule>(c, `SELECT * FROM marketing_sync_schedule FORCE INDEX(ix_marketing_dispatch)
        WHERE enabled=1 AND state IN ('idle','retry','running') AND next_due_at<=UTC_TIMESTAMP(6)
          AND (lease_until IS NULL OR lease_until<=UTC_TIMESTAMP(6))
        ORDER BY state,next_due_at,tenant_id,id LIMIT 1 FOR UPDATE SKIP LOCKED`);
      if (!s) return null;
      tenant(s.tenant_id);
      const [binding] = await rows(c, 'SELECT status FROM marketing_account_binding WHERE tenant_id=? AND account_id=? AND id=? FOR UPDATE', [s.tenant_id, s.account_id, s.binding_id]);
      if (binding?.status !== 'active') {
        await c.execute("UPDATE marketing_sync_schedule SET enabled=0,state='paused',fence=fence+1,lease_owner=NULL,lease_until=NULL,error_code='BINDING_DISABLED',version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?", [s.tenant_id, s.id]);
        return null;
      }
      const fence = positive(String(BigInt(s.fence) + 1n));
      let runId = s.active_run_id;
      if (runId) {
        const [run] = await rows(c, 'SELECT status FROM marketing_sync_run WHERE tenant_id=? AND account_id=? AND id=? FOR UPDATE', [s.tenant_id, s.account_id, runId]);
        if (!run || !['running', 'pending'].includes(String(run.status))) runId = null;
      }
      if (!runId) {
        runId = randomUUID();
        await c.execute(`INSERT INTO marketing_sync_run (tenant_id,id,account_id,binding_id,profile,status,fence,checkpoint,created_at,updated_at)
          VALUES (?,?,?,?,?,'running',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, [s.tenant_id, runId, s.account_id, s.binding_id, profile, fence, checkpoint(emptyCheckpoint())]);
      } else {
        await c.execute("UPDATE marketing_sync_run SET status='running',fence=?,error_code=NULL,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND account_id=? AND id=?", [fence, s.tenant_id, s.account_id, runId]);
      }
      await c.execute(`UPDATE marketing_sync_schedule SET state='running',active_run_id=?,fence=?,lease_owner=?,
        lease_until=TIMESTAMPADD(SECOND,60,UTC_TIMESTAMP(6)),version=version+1,updated_at=UTC_TIMESTAMP(6)
        WHERE tenant_id=? AND id=?`, [runId, fence, owner, s.tenant_id, s.id]);
      return { tenantId: s.tenant_id, scheduleId: s.id, accountId: s.account_id, bindingId: s.binding_id, runId, fence, owner };
    });
  }

  async lock(c: PoolConnection, lease: Lease): Promise<Schedule> {
    tenant(lease.tenantId); for (const id of [lease.scheduleId, lease.accountId, lease.bindingId, lease.runId, lease.owner]) uuid(id); positive(lease.fence);
    const [s] = await rows<Schedule>(c, `SELECT * FROM marketing_sync_schedule WHERE tenant_id=? AND id=? AND account_id=? AND binding_id=?
      AND active_run_id=? AND fence=? AND lease_owner=? AND enabled=1 AND state='running' AND lease_until>UTC_TIMESTAMP(6) FOR UPDATE`,
    [lease.tenantId, lease.scheduleId, lease.accountId, lease.bindingId, lease.runId, lease.fence, lease.owner]);
    if (!s) throw new MarketingError('LEASE_LOST');
    const [binding] = await rows(c, 'SELECT status FROM marketing_account_binding WHERE tenant_id=? AND account_id=? AND id=? FOR UPDATE', [lease.tenantId, lease.accountId, lease.bindingId]);
    if (binding?.status !== 'active') throw new MarketingError('BINDING_DISABLED');
    return s;
  }

  async heartbeat(lease: Lease): Promise<void> {
    await this.db.transaction(async c => {
      await this.lock(c, lease);
      await c.execute('UPDATE marketing_sync_schedule SET lease_until=TIMESTAMPADD(SECOND,60,UTC_TIMESTAMP(6)),updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?', [lease.tenantId, lease.scheduleId]);
    });
  }

  /** Accepted projection writer uses this same transaction for object/history/events AND progress. */
  async commit<T>(lease: Lease, next: Checkpoint, outcome: 'admitted' | 'skip' | 'defer' | 'page', write: (c: PoolConnection) => Promise<T>): Promise<T> {
    const encoded = checkpoint(next);
    if (!['admitted', 'skip', 'defer', 'page'].includes(outcome)) throw new MarketingError('INVALID_OUTCOME', 400);
    return this.db.transaction(async c => {
      await this.lock(c, lease);
      const [previous] = await rows(c, 'SELECT scanned_ads,checkpoint FROM marketing_sync_run WHERE tenant_id=? AND account_id=? AND id=? AND fence=? FOR UPDATE', [lease.tenantId, lease.accountId, lease.runId, lease.fence]);
      if (!previous) throw new MarketingError('LEASE_LOST');
      const expected = BigInt(String(previous.scanned_ads)) + (outcome === 'page' ? 0n : 1n);
      if (expected !== BigInt(next.scanned_count)) throw new MarketingError('CHECKPOINT_CONFLICT');
      const result = await write(c);
      await c.execute(`UPDATE marketing_sync_run SET checkpoint=?,scanned_ads=?,admitted_ads=admitted_ads+?,
        skipped_page_mismatch=skipped_page_mismatch+?,unresolved_page=unresolved_page+?,version=version+1,updated_at=UTC_TIMESTAMP(6)
        WHERE tenant_id=? AND account_id=? AND id=? AND fence=?`, [encoded, next.scanned_count, Number(outcome === 'admitted'), Number(outcome === 'skip'), Number(outcome === 'defer'), lease.tenantId, lease.accountId, lease.runId, lease.fence]);
      // Reset backoff only after a whole page is committed.
      if (outcome === 'page') await c.execute('UPDATE marketing_sync_schedule SET consecutive_errors=0,error_code=NULL,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?', [lease.tenantId, lease.scheduleId]);
      return result;
    });
  }

  async complete(lease: Lease): Promise<void> {
    await this.db.transaction(async c => {
      const s = await this.lock(c, lease);
      const spread = createHash('sha256').update(lease.scheduleId).digest().readUInt32BE() % (Math.floor(s.interval_seconds / 10) + 1);
      await c.execute("UPDATE marketing_sync_run SET status='complete',error_code=NULL,completed_at=UTC_TIMESTAMP(6),version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND account_id=? AND id=? AND fence=?", [lease.tenantId, lease.accountId, lease.runId, lease.fence]);
      await c.execute(`UPDATE marketing_sync_schedule SET state='idle',active_run_id=NULL,lease_owner=NULL,lease_until=NULL,consecutive_errors=0,
        error_code=NULL,last_success_at=UTC_TIMESTAMP(6),next_due_at=TIMESTAMPADD(SECOND,?,UTC_TIMESTAMP(6)),version=version+1,updated_at=UTC_TIMESTAMP(6)
        WHERE tenant_id=? AND id=?`, [s.interval_seconds + spread, lease.tenantId, lease.scheduleId]);
    });
  }

  async fail(lease: Lease, code: 'TRANSPORT' | 'RATE_LIMIT' | 'CREDENTIAL_REVOKED' | 'CAPABILITY_UNAVAILABLE' | 'PAGE_LIMIT' | 'PROVIDER_INVALID', retryAfter = 0): Promise<void> {
    if (!['TRANSPORT', 'RATE_LIMIT', 'CREDENTIAL_REVOKED', 'CAPABILITY_UNAVAILABLE', 'PAGE_LIMIT', 'PROVIDER_INVALID'].includes(code) || !Number.isFinite(retryAfter) || retryAfter < 0) throw new MarketingError('INVALID_FAILURE', 400);
    await this.db.transaction(async c => {
      const s = await this.lock(c, lease), attempt = s.consecutive_errors + 1;
      const attention = attempt >= 8 || !['TRANSPORT', 'RATE_LIMIT'].includes(code);
      const seconds = Math.max(randomInt(Math.min(15 * 2 ** Math.min(attempt - 1, 10), 900) + 1), Math.min(Math.ceil(retryAfter), 3600));
      await c.execute(`UPDATE marketing_sync_schedule SET state=?,lease_owner=NULL,lease_until=NULL,consecutive_errors=?,error_code=?,
        next_due_at=TIMESTAMPADD(SECOND,?,UTC_TIMESTAMP(6)),version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?`,
      [attention ? 'attention' : 'retry', attempt, code, seconds, lease.tenantId, lease.scheduleId]);
      await c.execute("UPDATE marketing_sync_run SET status='pending',error_code=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND account_id=? AND id=? AND fence=?", [code, lease.tenantId, lease.accountId, lease.runId, lease.fence]);
    });
  }

  /** Management layer has already authenticated the tenant and, on resume, verified remote capability. */
  async setEnabled(c: PoolConnection, tenantId: string, bindingId: string, expected: string, enabled: boolean): Promise<void> {
    tenant(tenantId); uuid(bindingId); positive(expected);
    if (typeof enabled !== 'boolean') throw new MarketingError('INVALID_ENABLED', 400);
    const [s] = await rows<Schedule>(c, 'SELECT * FROM marketing_sync_schedule WHERE tenant_id=? AND binding_id=? AND profile=? FOR UPDATE', [tenantId, bindingId, profile]);
    if (!s) throw new MarketingError('NOT_FOUND', 404);
    if (String(s.version) !== expected) throw new MarketingError('VERSION_CONFLICT');
    const [result] = await c.execute<ResultSetHeader>(`UPDATE marketing_account_binding SET status=?,version=version+1,updated_at=UTC_TIMESTAMP(6)
      WHERE tenant_id=? AND account_id=? AND id=? AND status<>'revoked'`, [enabled ? 'active' : 'disabled', tenantId, s.account_id, bindingId]);
    if (!result.affectedRows) throw new MarketingError('BINDING_REVOKED');
    await c.execute(`UPDATE marketing_sync_schedule SET enabled=?,state=?,fence=fence+1,lease_owner=NULL,lease_until=NULL,
      consecutive_errors=0,error_code=NULL,next_due_at=UTC_TIMESTAMP(6),version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?`,
    [Number(enabled), enabled ? 'idle' : 'paused', tenantId, s.id]);
  }

  async request(c: PoolConnection, tenantId: string, bindingId: string): Promise<{ run_id: string; queued: boolean }> {
    tenant(tenantId); uuid(bindingId);
    const [s] = await rows<Schedule>(c, 'SELECT * FROM marketing_sync_schedule WHERE tenant_id=? AND binding_id=? AND profile=? FOR UPDATE', [tenantId, bindingId, profile]);
    if (!s) throw new MarketingError('NOT_FOUND', 404);
    if (!s.enabled || ['paused', 'attention'].includes(s.state)) throw new MarketingError('BINDING_NOT_READY');
    if (s.active_run_id) return { run_id: s.active_run_id, queued: s.state !== 'running' };
    const runId = randomUUID(), fence = positive(String(BigInt(s.fence) + 1n));
    await c.execute(`INSERT INTO marketing_sync_run (tenant_id,id,account_id,binding_id,profile,status,fence,checkpoint,created_at,updated_at)
      VALUES (?,?,?,?,?,'pending',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, [tenantId, runId, s.account_id, bindingId, profile, fence, checkpoint(emptyCheckpoint())]);
    await c.execute('UPDATE marketing_sync_schedule SET active_run_id=?,next_due_at=UTC_TIMESTAMP(6),version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?', [runId, tenantId, s.id]);
    return { run_id: runId, queued: true };
  }
}
