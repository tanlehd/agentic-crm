import { createPool, type PoolConnection, type RowDataPacket } from 'mysql2/promise';

export class MarketingError extends Error {
  constructor(public readonly code: string, public readonly status = 409) { super(code); }
}
export function tenant(value: string): string {
  uuid(value);
  if (['01900000-0000-7000-8000-000000000001', '00000000-0000-0000-0000-000000000000'].includes(value)) throw new MarketingError('TENANT_DENIED', 403);
  return value;
}
export function uuid(value: string): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value)) throw new MarketingError('INVALID_ID', 400);
  return value;
}
export function positive(value: string): string {
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,19}$/.test(value) || BigInt(value) > 18446744073709551615n) throw new MarketingError('INVALID_VERSION', 400);
  return value;
}
export type Row = RowDataPacket & Record<string, unknown>;
export async function rows<T extends Row>(c: PoolConnection, sql: string, args: (string | number | boolean | null | Buffer)[] = []): Promise<T[]> {
  const [result] = await c.execute<T[]>(sql, args); return result;
}
export class MarketingDatabase {
  readonly pool;
  constructor(env: NodeJS.ProcessEnv) {
    for (const key of ['MARKETING_DB_HOST', 'MARKETING_DB_PORT', 'MARKETING_DB_NAME', 'MARKETING_RUNTIME_USER', 'MARKETING_RUNTIME_PASSWORD']) {
      if (!env[key]) throw new MarketingError('DATABASE_CONFIG_REQUIRED', 503);
    }
    if (!['crm_marketing', 'test_crm_marketing'].includes(env.MARKETING_DB_NAME!)) throw new MarketingError('DATABASE_CONFIG_DENIED', 503);
    this.pool = createPool({ host: env.MARKETING_DB_HOST, port: Number(env.MARKETING_DB_PORT), database: env.MARKETING_DB_NAME,
      user: env.MARKETING_RUNTIME_USER, password: env.MARKETING_RUNTIME_PASSWORD, connectionLimit: 8,
      supportBigNumbers: true, bigNumberStrings: true, dateStrings: true, timezone: 'Z', multipleStatements: false });
  }
  async connection(): Promise<PoolConnection> {
    const c = await this.pool.getConnection();
    try {
      await c.query("SET SESSION time_zone='+00:00'");
      await c.query("SET SESSION sql_mode='STRICT_ALL_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
      await c.query('SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED');
      return c;
    } catch (e) { c.release(); throw e; }
  }
  async transaction<T>(work: (c: PoolConnection) => Promise<T>): Promise<T> {
    const c = await this.connection();
    try { await c.beginTransaction(); const result = await work(c); await c.commit(); return result; }
    catch (e) { await c.rollback(); throw e; } finally { c.release(); }
  }
  async close(): Promise<void> { await this.pool.end(); }
}
