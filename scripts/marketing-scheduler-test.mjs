import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import { connect } from './lib/marketing-database.mjs';
import { MarketingDatabase } from '../services/marketing/dist/database.js';
import { MarketingScheduler, emptyCheckpoint } from '../services/marketing/dist/scheduler.js';
import { OperationReceipts } from '../services/marketing/dist/receipts.js';

const env = parseEnv(await readFile('.local/marketing-test.env', 'utf8'));
assert.equal(env.MARKETING_DB_NAME, 'test_crm_marketing');
const operator = await connect(env), db = new MarketingDatabase(env), scheduler = new MarketingScheduler(db), receipts = new OperationReceipts();
const tenants = [randomUUID(), randomUUID()], accounts = [randomUUID(), randomUUID()], bindings = [randomUUID(), randomUUID()];
const schedules = [], passed = [], retained = { tenants, accounts, bindings, schedules };
const group = async (name, fn) => { await fn(); passed.push(name); console.log('PASS ' + name); };
const denied = async (fn, code) => assert.rejects(fn, e => e.code === code);
const read = async (sql, args = []) => (await operator.execute(sql, args))[0];
const forceDue = async lease => operator.execute('UPDATE marketing_sync_schedule SET next_due_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?', [lease.tenantId, lease.scheduleId]);
let first, second;
try {
  // Never steal prior fixture jobs: this dedicated test schema should have no enabled schedules at test start.
  assert.equal(Number((await read('SELECT COUNT(*) n FROM marketing_sync_schedule WHERE enabled=1'))[0].n), 0, 'Existing enabled jobs: inspect before running; no automatic cleanup');
  await group('runtime creates own schedule/clock and shared account tenant replicas', async () => {
    for (let i = 0; i < 2; i++) {
      await db.transaction(async c => {
        await c.execute(`INSERT INTO marketing_account (tenant_id,id,provider_node_id,external_account_id,created_at,updated_at,last_seen_at,availability,field_coverage)
          VALUES (?,?,'act_scheduler_fixture','scheduler_fixture',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'available','{}')`, [tenants[i], accounts[i]]);
        await c.execute(`INSERT INTO marketing_account_binding (tenant_id,id,account_id,credential_ref,credential_owner,status,created_at,updated_at)
          VALUES (?,?,?,?,'channels-v1','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, [tenants[i], bindings[i], accounts[i], randomUUID()]);
        schedules.push(await scheduler.install(c, tenants[i], accounts[i], bindings[i]));
      });
    }
  });
  await group('two concurrent dispatchers claim different jobs, then no extra writer', async () => {
    [first, second] = await Promise.all([scheduler.claim(randomUUID()), scheduler.claim(randomUUID())]);
    assert(first && second); assert.notEqual(first.scheduleId, second.scheduleId);
    assert.equal(await scheduler.claim(randomUUID()), null);
    assert.equal((await read('SELECT COUNT(*) n FROM marketing_sync_run WHERE tenant_id IN (?,?) AND status=\'running\'', tenants))[0].n, '2');
  });
  await group('lease heartbeat; foreign tenant/account/fence/owner denied', async () => {
    await scheduler.heartbeat(first);
    for (const lease of [{ ...first, tenantId: second.tenantId }, { ...first, accountId: second.accountId }, { ...first, fence: '999' }, { ...first, owner: randomUUID() }]) await denied(() => scheduler.heartbeat(lease), 'LEASE_LOST');
  });
  await group('skip/defer counters and checkpoint atomic; rollback leaves no progress', async () => {
    const next = { ...emptyCheckpoint(), scanned_count: '1', last_committed_ad_id: null };
    await assert.rejects(() => scheduler.commit(first, next, 'skip', async c => {
      await c.execute("UPDATE marketing_account SET name='rollback-marker' WHERE tenant_id=? AND id=?", [first.tenantId, first.accountId]);
      throw new Error('synthetic failure before commit');
    }));
    assert.equal((await read('SELECT name FROM marketing_account WHERE tenant_id=? AND id=?', [first.tenantId, first.accountId]))[0].name, null);
    await scheduler.commit(first, next, 'skip', async () => {});
    await denied(() => scheduler.commit(first, next, 'skip', async () => {}), 'CHECKPOINT_CONFLICT');
    await scheduler.commit(first, { ...next, scanned_count: '2' }, 'defer', async () => {});
    const [run] = await read('SELECT * FROM marketing_sync_run WHERE tenant_id=? AND id=?', [first.tenantId, first.runId]);
    assert.equal(String(run.scanned_ads), '2'); assert.equal(String(run.skipped_page_mismatch), '1'); assert.equal(String(run.unresolved_page), '1');
    assert.equal((await read('SELECT COUNT(*) n FROM marketing_object_observation WHERE tenant_id=?', [first.tenantId]))[0].n, '0');
    assert.equal((await read('SELECT COUNT(*) n FROM marketing_change_event WHERE tenant_id=?', [first.tenantId]))[0].n, '0');
    await denied(() => scheduler.commit(first, { ...next, after: 'https://graph.example/secret' }, 'page', async () => {}), 'INVALID_CHECKPOINT');
  });
  await group('manual sync coalesces active run; durable receipt replay/conflict', async () => {
    const op = randomUUID(), body = { operation_id: op };
    await db.transaction(async c => {
      const data = await scheduler.request(c, first.tenantId, first.bindingId);
      assert.equal(data.run_id, first.runId); assert.equal(data.queued, false);
      await receipts.write(c, first.tenantId, op, 'binding.sync', first.bindingId, body, { status: 202, data });
    });
    await db.transaction(async c => {
      const replay = await receipts.read(c, first.tenantId, op, 'binding.sync', first.bindingId, body);
      assert.equal(replay.data.run_id, first.runId);
      assert.equal(await receipts.read(c, second.tenantId, op, 'binding.sync', first.bindingId, body), null);
      await denied(() => receipts.read(c, first.tenantId, op, 'binding.sync', first.bindingId, { ...body, changed: true }), 'IDEMPOTENCY_CONFLICT');
      await denied(() => receipts.write(c, first.tenantId, randomUUID(), 'binding.sync', first.bindingId, {}, { status: 202, data: { token: 'synthetic' } }), 'INVALID_RECEIPT');
    });
  });
  await group('expired lease takeover preserves run/checkpoint, old worker commit denied', async () => {
    await operator.execute('UPDATE marketing_sync_schedule SET lease_until=TIMESTAMPADD(SECOND,-1,UTC_TIMESTAMP(6)) WHERE tenant_id=? AND id=?', [first.tenantId, first.scheduleId]);
    const next = await scheduler.claim(randomUUID()); assert(next); assert.equal(next.runId, first.runId); assert(BigInt(next.fence) > BigInt(first.fence));
    await denied(() => scheduler.commit(first, { ...emptyCheckpoint(), scanned_count: '3' }, 'skip', async () => { throw new Error('must not run'); }), 'LEASE_LOST');
    first = next;
    assert.equal(String((await read('SELECT scanned_ads FROM marketing_sync_run WHERE tenant_id=? AND id=?', [first.tenantId, first.runId]))[0].scanned_ads), '2');
  });
  await group('pause CAS invalidates lease; explicit resume retains progress', async () => {
    let [s] = await read('SELECT version FROM marketing_sync_schedule WHERE tenant_id=? AND id=?', [first.tenantId, first.scheduleId]);
    await db.transaction(c => scheduler.setEnabled(c, first.tenantId, first.bindingId, String(s.version), false));
    await denied(() => scheduler.heartbeat(first), 'LEASE_LOST');
    await denied(() => db.transaction(c => scheduler.setEnabled(c, first.tenantId, first.bindingId, String(s.version), true)), 'VERSION_CONFLICT');
    await denied(() => db.transaction(c => scheduler.request(c, first.tenantId, first.bindingId)), 'BINDING_NOT_READY');
    [s] = await read('SELECT version FROM marketing_sync_schedule WHERE tenant_id=? AND id=?', [first.tenantId, first.scheduleId]);
    await db.transaction(c => scheduler.setEnabled(c, first.tenantId, first.bindingId, String(s.version), true));
    const next = await scheduler.claim(randomUUID()); assert.equal(next.runId, first.runId); first = next;
  });
  await group('retry bounded delay and eight consecutive failures require attention', async () => {
    for (let attempt = 1; attempt <= 8; attempt++) {
      await scheduler.fail(first, 'RATE_LIMIT', 99999);
      const [s] = await read('SELECT state,consecutive_errors,TIMESTAMPDIFF(SECOND,UTC_TIMESTAMP(6),next_due_at) delay FROM marketing_sync_schedule WHERE tenant_id=? AND id=?', [first.tenantId, first.scheduleId]);
      assert.equal(s.consecutive_errors, attempt); assert(Number(s.delay) >= 3598 && Number(s.delay) <= 3600);
      if (attempt < 8) { assert.equal(s.state, 'retry'); await forceDue(first); first = await scheduler.claim(randomUUID()); }
      else { assert.equal(s.state, 'attention'); await forceDue(first); assert.equal(await scheduler.claim(randomUUID()), null); }
    }
    await denied(() => db.transaction(c => scheduler.request(c, first.tenantId, first.bindingId)), 'BINDING_NOT_READY');
  });
  await group('permission/capability failures require attention immediately', async () => {
    await scheduler.fail(second, 'CAPABILITY_UNAVAILABLE');
    const [s] = await read('SELECT state,consecutive_errors FROM marketing_sync_schedule WHERE tenant_id=? AND id=?', [second.tenantId, second.scheduleId]);
    assert.equal(s.state, 'attention'); assert.equal(s.consecutive_errors, 1);
  });
  await group('whole page progress resets retry streak; completion schedules six-hour reconciliation', async () => {
    const [s] = await read('SELECT version FROM marketing_sync_schedule WHERE tenant_id=? AND id=?', [first.tenantId, first.scheduleId]);
    await db.transaction(c => scheduler.setEnabled(c, first.tenantId, first.bindingId, String(s.version), true));
    first = await scheduler.claim(randomUUID());
    await scheduler.fail(first, 'TRANSPORT'); await forceDue(first); first = await scheduler.claim(randomUUID());
    await scheduler.commit(first, { ...emptyCheckpoint(), scanned_count: '2', completed_pages: 1 }, 'page', async () => {});
    assert.equal((await read('SELECT consecutive_errors FROM marketing_sync_schedule WHERE tenant_id=? AND id=?', [first.tenantId, first.scheduleId]))[0].consecutive_errors, 0);
    await scheduler.complete(first);
    const [finished] = await read('SELECT *,TIMESTAMPDIFF(SECOND,UTC_TIMESTAMP(6),next_due_at) delay FROM marketing_sync_schedule WHERE tenant_id=? AND id=?', [first.tenantId, first.scheduleId]);
    assert.equal(finished.state, 'idle'); assert.equal(finished.active_run_id, null); assert(Number(finished.delay) >= 21598 && Number(finished.delay) <= 23760);
    const [run] = await read('SELECT status,completed_at,unresolved_page FROM marketing_sync_run WHERE tenant_id=? AND id=?', [first.tenantId, first.runId]);
    assert.equal(run.status, 'complete'); assert(run.completed_at); assert.equal(String(run.unresolved_page), '1');
    await denied(() => scheduler.complete(first), 'LEASE_LOST');
  });
  await group('manual next run survives connection pool restart and coalesces', async () => {
    const [a, b] = await Promise.all([db.transaction(c => scheduler.request(c, first.tenantId, first.bindingId)), db.transaction(c => scheduler.request(c, first.tenantId, first.bindingId))]);
    assert.equal(a.run_id, b.run_id); assert.notEqual(a.run_id, first.runId);
    const restarted = new MarketingDatabase(env);
    try { const next = await new MarketingScheduler(restarted).claim(randomUUID()); assert.equal(next.runId, a.run_id); assert(BigInt(next.fence) > BigInt(first.fence)); }
    finally { await restarted.close(); }
  });
  await group('runtime immutable receipts/events, no DDL/journal/CRM read; indexed dispatcher', async () => {
    const c = await db.connection();
    try {
      for (const sql of ['UPDATE marketing_operation_receipt SET http_status=200', 'DELETE FROM marketing_change_event', 'SELECT * FROM schema_migration', 'SELECT * FROM agentic_crm.tenant', 'CREATE TABLE forbidden_scheduler (id INT)']) await assert.rejects(() => c.query(sql), e => ['ER_TABLEACCESS_DENIED_ERROR', 'ER_DBACCESS_DENIED_ERROR'].includes(e.code));
      const [plan] = await c.query("EXPLAIN SELECT id FROM marketing_sync_schedule FORCE INDEX(ix_marketing_dispatch) WHERE enabled=1 AND state IN ('idle','retry','running') AND next_due_at<=UTC_TIMESTAMP(6) ORDER BY state,next_due_at,tenant_id,id LIMIT 1");
      assert.equal(plan[0].key, 'ix_marketing_dispatch');
      assert(!String(plan[0].Extra).includes('filesort'));
    } finally { c.release(); }
  });
  await mkdir('artifacts/marketing-scheduler', { recursive: true });
  await writeFile('artifacts/marketing-scheduler/mysql-latest.json', JSON.stringify({ groups: passed.length, passed, environment: 'persistent test_crm_marketing / MySQL 8.4 / runtime grants', retained, liveMeta: 'NOT_RUN', workerIngestion: 'NOT_IMPLEMENTED' }, null, 2));
  console.log(`PASS ${passed.length} scheduler groups; retained synthetic data`);
} finally {
  // Disable only this invocation's schedules; retain every row and all test tenants.
  for (const t of tenants) await operator.execute("UPDATE marketing_sync_schedule SET enabled=0,state='paused',lease_owner=NULL,lease_until=NULL,fence=fence+1 WHERE tenant_id=?", [t]);
  await db.close(); await operator.end();
}
