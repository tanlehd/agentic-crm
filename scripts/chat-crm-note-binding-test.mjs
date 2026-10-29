import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createPool } from './lib/chat-native.mjs';
import { CrmActivityPort } from '../services/core-baseline/dist/modules/crm/activity-port.js';

const env = parseEnv(await readFile('.local/native-auth-test.env', 'utf8'));
assert.equal(env.APP_ENV, 'test');
assert.equal(env.MYSQL_DATABASE, 'native_identity_test');
assert.equal(env.MYSQL_HOST, '127.0.0.1');
assert.equal(env.MYSQL_PORT, '13306');
const pool = createPool({ host: env.MYSQL_HOST, port: Number(env.MYSQL_PORT), database: env.MYSQL_DATABASE,
  user: env.MYSQL_MIGRATION_USER, password: env.MYSQL_MIGRATION_PASSWORD });
const connection = await pool.getConnection();
try {
  await connection.query('SET TRANSACTION READ ONLY');
  await connection.beginTransaction();
  const [notes] = await connection.query("SELECT a.tenant_id,a.record_id,a.related_record_id FROM activity a WHERE a.kind='note' AND EXISTS(SELECT 1 FROM audit_entry p WHERE p.tenant_id=a.tenant_id AND p.resource_type='activity' AND p.resource_id=a.record_id AND p.action='note' AND p.outcome='accepted') ORDER BY a.tenant_id,a.record_id LIMIT 50");
  assert(notes.length, 'Run retained native note-write acceptance first');
  const port = new CrmActivityPort();
  const scope = tenant => ({ context: { tenantId: tenant }, query: async (sql, args) => {
    assert(!/JOIN crm_record target|FROM conversation\b/.test(sql), 'No retained Chat authority');
    return (await connection.query(sql, args))[0];
  } });
  for (const note of notes) {
    assert.equal((await port.binding(scope(note.tenant_id), note.record_id))?.conversation_id, note.related_record_id);
    assert.equal(await port.binding(scope('01900000-0000-7000-8000-000000004199'), note.record_id), undefined);
  }
  await connection.commit();
  const evidence = { scope: 'T09 CRM note binding uses own audit/event evidence', notes: notes.length,
    sameTenant: 'PASS', crossTenant: 'PASS', database: env.MYSQL_DATABASE, readOnly: true };
  await writeFile('artifacts/chat-extraction/t09-20261026/crm-note-binding.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence));
} finally { await connection.rollback(); connection.release(); await pool.end(); }
