import { PLATFORM_TENANT_ID } from './system-scope.js';
import type { DataSource } from 'typeorm';
import { checksum, migrations, type Migration } from './migrations.js';
type Journal = { version: number; name: string; checksum: string; state: string };
export function validateJournal(rows: Journal[], manifest: readonly Migration[], complete = false): void {
  for (const [i, row] of rows.entries()) {
    const expected = manifest[i];
    if (!expected || row.version !== expected.version || row.name !== expected.name || row.checksum !== checksum(expected) || row.state !== 'applied') {
      throw new Error('Schema journal requires operator inspection/forward repair');
    }
  }
  if (complete && rows.length !== manifest.length) throw new Error('Schema version not ready');
}
export async function migrate(source: DataSource, manifest: readonly Migration[] = migrations): Promise<number> {
  const runner = source.createQueryRunner();
  let locked = false;
  let lockName = '';
  try {
    await runner.connect();
    const [db] = await runner.query('SELECT DATABASE() AS db');
    lockName = `crm:migrate:${db.db}`;
    const [lock] = await runner.query('SELECT GET_LOCK(?, 0) AS acquired', [lockName]);
    if (Number(lock.acquired) !== 1) throw new Error('Migration lock busy');
    locked = true;
    await runner.query("SET time_zone = '+00:00'");
    await runner.query(`CREATE TABLE IF NOT EXISTS schema_migration (
      version INT NOT NULL PRIMARY KEY, name VARCHAR(128) NOT NULL,
      checksum CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      state VARCHAR(16) NOT NULL, started_at DATETIME(6) NOT NULL,
      applied_at DATETIME(6) NULL, error_code VARCHAR(64) NULL,
      CONSTRAINT ck_schema_migration_state CHECK (state IN ('started','applied','failed'))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs`);
    const columns = await runner.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='schema_migration' AND COLUMN_NAME='tenant_id'");
    if (!columns.length) await runner.query(`ALTER TABLE schema_migration ADD tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '${PLATFORM_TENANT_ID}', ADD CONSTRAINT ck_journal_tenant CHECK(tenant_id='${PLATFORM_TENANT_ID}')`);
    const rows: Journal[] = await runner.query('SELECT version,name,checksum,state FROM schema_migration ORDER BY version');
    validateJournal(rows, manifest);
    if (rows.length === 0) {
      const existing = await runner.query("SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN ('account','tenant')");
      if (existing.length) throw new Error('Unjournaled foundation schema; operator inspection required');
    }
    let applied = 0;
    for (const m of manifest.slice(rows.length)) {
      await runner.query("INSERT INTO schema_migration(tenant_id,version,name,checksum,state,started_at) VALUES (?,?,?,?,'started',UTC_TIMESTAMP(6))", [PLATFORM_TENANT_ID,m.version,m.name,checksum(m)]);
      try {
        for (const sql of m.statements) await runner.query(sql);
        await runner.query("UPDATE schema_migration SET state='applied',applied_at=UTC_TIMESTAMP(6) WHERE version=?", [m.version]);
        applied++;
      } catch {
        await runner.query("UPDATE schema_migration SET state='failed',error_code='DDL_FAILED' WHERE version=?", [m.version]);
        throw new Error(`Migration ${m.version} failed; partial DDL requires operator inspection`);
      }
    }
    return applied;
  } finally {
    try { if (locked) await runner.query('SELECT RELEASE_LOCK(?)', [lockName]); }
    finally { await runner.release(); }
  }
}
