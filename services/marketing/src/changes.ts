import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { PoolConnection } from 'mysql2/promise';
import { MarketingDatabase, MarketingError, positive, rows, tenant, uuid } from './database.js';
import { canonical } from './receipts.js';

interface Cursor {
  version: 1; tenant: string; audience: string; query: 'changes' | 'snapshots';
  watermark: string; after: string; expires: number;
}
const sequence = (v: unknown): v is string => typeof v === 'string' && /^(0|[1-9][0-9]{0,19})$/.test(v) && BigInt(v) <= 18446744073709551615n;
export class MarketingCursors {
  constructor(private readonly key: string) { if (!/^[a-f0-9]{64}$/.test(key)) throw new MarketingError('CURSOR_KEY_REQUIRED', 503); }
  encode(value: Cursor): string {
    const data = Buffer.from(canonical(value)).toString('base64url');
    return data + '.' + createHmac('sha256', Buffer.from(this.key, 'hex')).update(data).digest('base64url');
  }
  decode(value: string, tenantId: string, audience: string, query: Cursor['query']): Cursor {
    try {
      if (typeof value !== 'string' || value.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(value)) throw new Error();
      const [data, signature] = value.split('.');
      const expected = createHmac('sha256', Buffer.from(this.key, 'hex')).update(data!).digest();
      if (!timingSafeEqual(expected, Buffer.from(signature!, 'base64url'))) throw new Error();
      const c = JSON.parse(Buffer.from(data!, 'base64url').toString('utf8')) as Cursor;
      if (c.version !== 1 || c.tenant !== tenantId || c.audience !== audience || c.query !== query ||
        !sequence(c.watermark) || !sequence(c.after) || BigInt(c.after) > BigInt(c.watermark) ||
        !Number.isSafeInteger(c.expires) || c.expires <= Date.now() || c.expires > Date.now() + 86400000) throw new Error();
      return c;
    } catch { throw new MarketingError('INVALID_CURSOR', 400); }
  }
}

/** Per-tenant clock lock is held until the observation/event transaction commits. */
export class MarketingChanges {
  constructor(private readonly db: MarketingDatabase, private readonly cursors: MarketingCursors) {}
  async lockClock(c: PoolConnection, tenantId: string): Promise<string> {
    tenant(tenantId);
    const [clock] = await rows(c, 'SELECT last_sequence FROM marketing_change_clock WHERE tenant_id=? FOR UPDATE', [tenantId]);
    if (!clock) throw new MarketingError('CLOCK_NOT_INITIALIZED');
    return String(clock.last_sequence);
  }
  /** Called after the schedule then clock locks, and after inserting the immutable observation. */
  async append(c: PoolConnection, tenantId: string, accountId: string, observationId: string): Promise<string> {
    tenant(tenantId); uuid(accountId); uuid(observationId);
    const previous = await this.lockClock(c, tenantId);
    const [existing] = await rows(c, 'SELECT sequence FROM marketing_change_event WHERE tenant_id=? AND account_id=? AND observation_id=? AND event_type=?', [tenantId, accountId, observationId, 'marketing.object.observed.v1']);
    if (existing) return String(existing.sequence);
    const [obs] = await rows(c, `SELECT object_type,external_object_id,revision,fetched_at,mapping_version,admission_receipt_ref,page_binding_ref,
      page_binding_revision,field_coverage FROM marketing_object_observation WHERE tenant_id=? AND account_id=? AND id=?`, [tenantId, accountId, observationId]);
    if (!obs) throw new MarketingError('OBSERVATION_NOT_FOUND');
    const next = positive(String(BigInt(previous) + 1n)), id = randomUUID();
    const payload = { event_id: id, tenant_id: tenantId, type: 'marketing.object.observed.v1', object_type: obs.object_type,
      external_object_id: obs.external_object_id, account_id: accountId, observation_id: observationId, revision: String(obs.revision),
      observed_at: obs.fetched_at, mapping_version: obs.mapping_version, page_binding_ref: obs.page_binding_ref,
      page_binding_revision: obs.page_binding_revision, admission_receipt_ref: obs.admission_receipt_ref,
      field_coverage: obs.field_coverage,
      scope: 'tenant_metadata', admission_verified: obs.admission_receipt_ref !== null };
    await c.execute(`INSERT INTO marketing_change_event (tenant_id,id,sequence,account_id,object_type,external_object_id,observation_id,revision,event_type,payload,created_at)
      VALUES (?,?,?,?,?,?,?,?,'marketing.object.observed.v1',?,UTC_TIMESTAMP(6))`,
    [tenantId, id, next, accountId, String(obs.object_type), String(obs.external_object_id), observationId, String(obs.revision), canonical(payload)]);
    await c.execute('UPDATE marketing_change_clock SET last_sequence=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=?', [next, tenantId]);
    return next;
  }
  async page(tenantId: string, audience: string, kind: Cursor['query'], limit: number, token?: string) {
    tenant(tenantId);
    if (typeof audience !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(audience) || !['snapshots', 'changes'].includes(kind) || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new MarketingError('INVALID_QUERY', 400);
    const c = await this.db.connection();
    try {
      let cursor = token ? this.cursors.decode(token, tenantId, audience, kind) : undefined;
      const [clock] = await rows(c, 'SELECT last_sequence FROM marketing_change_clock WHERE tenant_id=?', [tenantId]);
      const current = String(clock?.last_sequence ?? '0');
      if (!cursor) cursor = { version: 1, tenant: tenantId, audience, query: kind, watermark: current, after: '0', expires: Date.now() + 86400000 };
      // An exhausted change page is a tail cursor. A subsequent pull pins a new committed watermark.
      if (kind === 'changes' && cursor.after === cursor.watermark) cursor = { ...cursor, watermark: current, expires: Date.now() + 86400000 };
      if (BigInt(cursor.watermark) > BigInt(current)) throw new MarketingError('CURSOR_HISTORY_UNAVAILABLE', 409);
      const args = [tenantId, cursor.after, cursor.watermark];
      const data = kind === 'changes'
        ? await rows(c, `SELECT sequence,payload FROM marketing_change_event WHERE tenant_id=? AND sequence>? AND sequence<=? ORDER BY sequence LIMIT ${limit + 1}`, args)
        : await rows(c, `SELECT e.sequence,e.payload,o.selected_payload,o.field_coverage,o.admission_receipt_ref FROM marketing_change_event e
          JOIN marketing_object_observation o ON o.tenant_id=e.tenant_id AND o.account_id=e.account_id AND o.id=e.observation_id
          WHERE e.tenant_id=? AND e.sequence>? AND e.sequence<=? AND NOT EXISTS (
            SELECT 1 FROM marketing_change_event newer WHERE newer.tenant_id=e.tenant_id AND newer.account_id=e.account_id
            AND newer.object_type=e.object_type AND newer.external_object_id=e.external_object_id AND newer.sequence>e.sequence AND newer.sequence<=?)
          ORDER BY e.sequence LIMIT ${limit + 1}`, [...args, cursor.watermark]);
      const more = data.length > limit, page = data.slice(0, limit);
      const after = more ? String(page.at(-1)!.sequence) : cursor.watermark;
      const next = this.cursors.encode({ ...cursor, after });
      const changesAfter = this.cursors.encode({ ...cursor, query: 'changes', after: cursor.watermark });
      return { items: page.map(row => kind === 'changes' ? row.payload : { ...(row.payload as object), selected_payload: row.selected_payload,
        field_coverage: row.field_coverage, admission_verified: row.admission_receipt_ref !== null }), watermark: cursor.watermark,
        has_more: more, next_cursor: next, changes_after: changesAfter };
    } finally { c.release(); }
  }
}
