import { readFile } from 'node:fs/promises';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { SYSTEM_TENANT, session } from './database.js';
import { artifacts, sha } from './schema.js';
import {retirementStep,retirementChecksum} from './retirement-step.js';

export const ingressTables = ['chat_ingress_contact_head', 'chat_ingress_inbox', 'chat_ingress_delivery', 'chat_ingress_request'];
const name = 'chat003-ingress.sql';
const folder = new URL('../migrations/', import.meta.url);
async function source() {
  const sql = (await readFile(new URL(name, folder), 'utf8')).replaceAll('\r\n', '\n');
  const checksum = (await readFile(new URL('chat003-ingress.sha256', folder), 'utf8')).trim();
  if (sha(sql) !== checksum) throw new Error('IMMUTABLE_INGRESS_MIGRATION_DRIFT');
  return { checksum, statements: sql.split(/;\s*(?:\n|$)/).map(s => s.trim()).filter(Boolean) };
}

/** Operator-only forward migration. Old T03 runners keep rejecting newer storage. */
export async function migrateIngress(pool: Pool, afterStatement?: (index: number) => Promise<void>) {
  const baseline = await artifacts(), step = await source(), c = await pool.getConnection(); let lock = '';
  try {
    await session(c);
    const [[db]] = await c.query<RowDataPacket[]>('SELECT DATABASE() name');
    if (!['crm_chat', 'test_crm_chat_owner'].includes(db!.name)) throw new Error('INGRESS_MIGRATION_TARGET_DENIED');
    lock = 'chat:migrate:' + db!.name;
    const [[locked]] = await c.query<RowDataPacket[]>('SELECT GET_LOCK(?,0) ok', [lock]); if (Number(locked!.ok) !== 1) throw new Error('MIGRATION_BUSY');
    const [journal] = await c.query<RowDataPacket[]>('SELECT * FROM schema_migration ORDER BY version');
    if (journal.length < 2 || journal.length > 4) throw new Error('JOURNAL_DRIFT');
    if(journal[3]){const row=journal[3];if(row.tenant_id!==SYSTEM_TENANT||Number(row.version)!==4||row.name!==retirementStep.name||row.checksum!==retirementChecksum||row.state!=='applied')throw new Error('RETIREMENT_JOURNAL_REPAIR_REQUIRED');}
    for (const [i, row] of journal.slice(0, 2).entries()) if (row.tenant_id !== SYSTEM_TENANT || Number(row.version) !== i + 1 || row.name !== baseline.steps[i]!.name || row.checksum !== baseline.steps[i]!.checksum || row.state !== 'applied') throw new Error('JOURNAL_DRIFT');
    const previous = journal[2];
    if (previous && (previous.tenant_id !== SYSTEM_TENANT || Number(previous.version) !== 3 || previous.name !== name || previous.checksum !== step.checksum || !['started', 'failed', 'applied'].includes(previous.state))) throw new Error('JOURNAL_DRIFT');
    const [inventory] = await c.query<RowDataPacket[]>('SELECT TABLE_NAME,TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
    if (inventory.some(row => row.TABLE_TYPE !== 'BASE TABLE' || ![...baseline.tables.map(t => t.name), ...ingressTables].includes(row.TABLE_NAME))) throw new Error('SCHEMA_DRIFT_UNEXPECTED_TABLE');
    if (!previous && inventory.some(row => ingressTables.includes(row.TABLE_NAME))) throw new Error('UNJOURNALED_INGRESS_STORAGE');
    if (!previous) await c.execute("INSERT INTO schema_migration(tenant_id,version,name,checksum,state,started_at) VALUES (?,3,?,?,'started',UTC_TIMESTAMP(6))", [SYSTEM_TENANT, name, step.checksum]);
    try {
      for (const [i, sql] of step.statements.entries()) {
        const table = ingressTables[i]!;
        if (!sql.startsWith('CREATE TABLE ' + table + ' (')) throw new Error('INGRESS_MIGRATION_FORMAT');
        const [exists] = await c.query<RowDataPacket[]>('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?', [table]);
        if (!exists.length) { if (previous?.state === 'applied') throw new Error('APPLIED_TABLE_MISSING'); await c.query(sql); }
        await verify(c, table, sql);
        await afterStatement?.(i);
      }
      if (previous?.state !== 'applied') await c.execute("UPDATE schema_migration SET state='applied',applied_at=UTC_TIMESTAMP(6),error_code=NULL WHERE tenant_id=? AND version=3", [SYSTEM_TENANT]);
      return previous?.state === 'applied' ? 0 : 1;
    } catch (error) {
      if (previous?.state !== 'applied') await c.execute("UPDATE schema_migration SET state='failed',error_code='OPERATOR_REVIEW' WHERE tenant_id=? AND version=3", [SYSTEM_TENANT]);
      throw error;
    }
  } finally { try { if (lock) await c.query('SELECT RELEASE_LOCK(?)', [lock]); } finally { c.release(); } }
}

async function verify(c: PoolConnection, table: string, sql: string) {
  const [[storage]] = await c.query<RowDataPacket[]>('SELECT ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?', [table]);
  if (storage?.ENGINE !== 'InnoDB' || storage.TABLE_COLLATION !== 'utf8mb4_0900_as_cs') throw new Error('INGRESS_STORAGE_DRIFT');
  const [columns] = await c.query<RowDataPacket[]>('SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA,COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION', [table]);
  const definitions = sql.split('\n').map(line => /^  ([a-z_]+) (CHAR\(\d+\)|VARCHAR\(\d+\)|DATETIME\(6\)|JSON|TINYINT UNSIGNED|BIGINT UNSIGNED)(?: CHARACTER SET ascii COLLATE ascii_bin)? (NOT NULL|NULL),?$/.exec(line)).filter(match => match !== null);
  if (columns.length !== definitions.length) throw new Error('INGRESS_COLUMN_DRIFT');
  for (const [i, d] of definitions.entries()) {
    const row = columns[i]!;
    const collation = /CHAR/.test(d[2]!) ? d[0].includes('ascii_bin') ? 'ascii_bin' : 'utf8mb4_0900_as_cs' : null;
    if (row.COLUMN_NAME !== d[1] || row.COLUMN_TYPE.toLowerCase() !== d[2]!.toLowerCase() || row.IS_NULLABLE !== (d[3] === 'NULL' ? 'YES' : 'NO') || row.COLUMN_DEFAULT !== null || row.EXTRA !== '' || row.COLLATION_NAME !== collation) throw new Error('INGRESS_COLUMN_DRIFT');
  }
  const [indexes] = await c.query<RowDataPacket[]>('SELECT INDEX_NAME,NON_UNIQUE,GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) cols FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? GROUP BY INDEX_NAME,NON_UNIQUE ORDER BY INDEX_NAME', [table]);
  const expected = [...sql.matchAll(/(?:PRIMARY KEY|(?:(UNIQUE) )?KEY ([a-z_]+)) \(([^)]+)\)/g)].map(m => ({ name: m[2] ?? 'PRIMARY', unique: m[0].startsWith('PRIMARY') || !!m[1], cols: m[3] })).sort((a, b) => a.name.localeCompare(b.name));
  if (JSON.stringify(indexes.map(r => [r.INDEX_NAME, Number(r.NON_UNIQUE) === 0, r.cols]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))) !== JSON.stringify(expected.map(e => [e.name, e.unique, e.cols]))) throw new Error('INGRESS_INDEX_DRIFT');
  const [foreign] = await c.query<RowDataPacket[]>('SELECT CONSTRAINT_NAME,REFERENCED_TABLE_SCHEMA,REFERENCED_TABLE_NAME,GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION) cols,GROUP_CONCAT(REFERENCED_COLUMN_NAME ORDER BY ORDINAL_POSITION) refs FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND REFERENCED_TABLE_NAME IS NOT NULL GROUP BY CONSTRAINT_NAME,REFERENCED_TABLE_SCHEMA,REFERENCED_TABLE_NAME', [table]);
  const [[db]] = await c.query<RowDataPacket[]>('SELECT DATABASE() name');
  const expectedForeign = [...sql.matchAll(/CONSTRAINT ([a-z_]+) FOREIGN KEY \(([^)]+)\) REFERENCES ([a-z_]+)\(([^)]+)\)/g)];
  if (foreign.length !== expectedForeign.length || foreign.some(row => !expectedForeign.some(m => row.CONSTRAINT_NAME === m[1] && row.cols === m[2] && row.REFERENCED_TABLE_SCHEMA === db!.name && row.REFERENCED_TABLE_NAME === m[3] && row.refs === m[4]))) throw new Error('INGRESS_FK_DRIFT');
  const [rules] = await c.query<RowDataPacket[]>('SELECT CONSTRAINT_NAME,UPDATE_RULE,DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=?', [table]);
  if (rules.length !== expectedForeign.length || rules.some(row => row.UPDATE_RULE !== 'RESTRICT' || row.DELETE_RULE !== 'RESTRICT')) throw new Error('INGRESS_FK_RULE_DRIFT');
  const [checks] = await c.query<RowDataPacket[]>('SELECT tc.CONSTRAINT_NAME,tc.ENFORCED FROM information_schema.TABLE_CONSTRAINTS tc WHERE tc.TABLE_SCHEMA=DATABASE() AND tc.TABLE_NAME=? AND tc.CONSTRAINT_TYPE=\'CHECK\'', [table]);
  const expectedChecks = [...sql.matchAll(/CONSTRAINT ([a-z_]+) CHECK/g)].map(m => m[1]);
  if (checks.length !== expectedChecks.length || checks.some(row => row.ENFORCED !== 'YES' || !expectedChecks.includes(row.CONSTRAINT_NAME))) throw new Error('INGRESS_CHECK_DRIFT');
}
