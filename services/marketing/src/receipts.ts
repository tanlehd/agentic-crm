import { createHash } from 'node:crypto';
import type { PoolConnection } from 'mysql2/promise';
import { MarketingError, rows, tenant, uuid } from './database.js';

export function canonical(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return '{' + Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}';
  }
  throw new MarketingError('INVALID_REQUEST', 400);
}
export const sha256 = (value: unknown): Buffer => createHash('sha256').update(canonical(value)).digest();
export interface Receipt { status: number; data: Record<string, unknown> }

/** Caller locks the command's schedule/account before writing. Concurrent first creation
 * may lose the unique receipt race: roll back the entire transaction and read the winner. */
export class OperationReceipts {
  async read(c: PoolConnection, tenantId: string, operationId: string, action: string, target: string | null, body: unknown): Promise<Receipt | null> {
    tenant(tenantId); uuid(operationId); if (target !== null) uuid(target);
    const [row] = await rows(c, 'SELECT action,target_id,request_sha256,http_status,response_json FROM marketing_operation_receipt WHERE tenant_id=? AND id=?', [tenantId, operationId]);
    if (!row) return null;
    if (row.action !== action || row.target_id !== target || !Buffer.isBuffer(row.request_sha256) || !row.request_sha256.equals(sha256(body))) throw new MarketingError('IDEMPOTENCY_CONFLICT');
    return { status: Number(row.http_status), data: row.response_json as Record<string, unknown> };
  }
  async write(c: PoolConnection, tenantId: string, operationId: string, action: string, target: string | null, body: unknown, result: Receipt): Promise<void> {
    tenant(tenantId); uuid(operationId); if (target !== null) uuid(target);
    if (!['binding.create', 'binding.sync', 'binding.configure'].includes(action) || ![200, 201, 202].includes(result.status)) throw new MarketingError('INVALID_RECEIPT', 400);
    // Only public command result references/counters; provider payloads and tokens have no place here.
    if (Object.keys(result.data).some(k => !['binding_id', 'account_id', 'schedule_id', 'run_id', 'version', 'enabled', 'queued'].includes(k))) throw new MarketingError('INVALID_RECEIPT', 400);
    const response = canonical(result.data);
    if (Buffer.byteLength(response) > 65536) throw new MarketingError('INVALID_RECEIPT', 400);
    await c.execute(`INSERT INTO marketing_operation_receipt (tenant_id,id,action,target_id,request_sha256,http_status,response_json,created_at)
      VALUES (?,?,?,?,?,?,?,UTC_TIMESTAMP(6))`, [tenantId, operationId, action, target, sha256(body), result.status, response]);
  }
}
