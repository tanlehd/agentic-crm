import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { MarketingDatabase } from '../services/marketing/dist/database.js';
import { MarketingChanges, MarketingCursors } from '../services/marketing/dist/changes.js';
import { sha256 } from '../services/marketing/dist/receipts.js';

const env = parseEnv(await readFile('.local/marketing-test.env', 'utf8')); assert.equal(env.MARKETING_DB_NAME, 'test_crm_marketing');
const db = new MarketingDatabase(env), cursors = new MarketingCursors(randomBytes(32).toString('hex')), changes = new MarketingChanges(db, cursors);
const t = randomUUID(), other = randomUUID(), account = randomUUID(), binding = randomUUID(), run = randomUUID();
const passed = [], audience = 'reporting-v1';
const group = async (name, fn) => { await fn(); passed.push(name); console.log('PASS ' + name); };
const observation = async (c, external, revision, name) => {
  const id = randomUUID(), body = { id: external, name };
  await c.execute(`INSERT INTO marketing_object_observation (tenant_id,id,account_id,object_type,external_object_id,revision,sync_run_id,fetched_at,payload_hash,mapping_version,api_version,field_coverage,selected_payload)
    VALUES (?,?,?,'campaign',?,?,?,UTC_TIMESTAMP(6),?,'object_metadata_v1','fixture','{}',?)`, [t, id, account, external, revision, run, sha256(body), JSON.stringify(body)]);
  return id;
};
const add = async (external, revision, name) => db.transaction(async c => {
  await changes.lockClock(c, t); const id = await observation(c, external, revision, name);
  return { id, sequence: await changes.append(c, t, account, id) };
});
let snapshot, stream;
try {
  await db.transaction(async c => {
    await c.execute(`INSERT INTO marketing_account (tenant_id,id,provider_node_id,external_account_id,created_at,updated_at,last_seen_at,availability,field_coverage)
      VALUES (?,?,'act_changes_fixture','changes_fixture',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'available','{}')`, [t, account]);
    await c.execute(`INSERT INTO marketing_account_binding (tenant_id,id,account_id,credential_ref,credential_owner,status,created_at,updated_at)
      VALUES (?,?,?,?,'channels-v1','disabled',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, [t, binding, account, randomUUID()]);
    await c.execute(`INSERT INTO marketing_sync_run (tenant_id,id,account_id,binding_id,profile,status,fence,created_at,updated_at)
      VALUES (?,?,?,?,'object_metadata_v1','complete',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, [t, run, account, binding]);
    await c.execute('INSERT INTO marketing_change_clock (tenant_id,created_at,updated_at) VALUES (?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))', [t]);
  });
  await group('clock row serializes concurrent commits; uncommitted changes invisible', async () => {
    let release, ready, started;
    const gate = new Promise(r => release = r), entered = new Promise(r => ready = r), attempting = new Promise(r => started = r);
    const a = db.transaction(async c => {
      await changes.lockClock(c, t); const id = await observation(c, 'campaign-a', '1', 'initial A');
      assert.equal(await changes.append(c, t, account, id), '1'); ready(); await gate;
    });
    await entered;
    const b = db.transaction(async c => {
      started(); await changes.lockClock(c, t); const id = await observation(c, 'campaign-b', '1', 'initial B');
      assert.equal(await changes.append(c, t, account, id), '2');
    });
    await attempting;
    try { const page = await changes.page(t, audience, 'changes', 100); assert.equal(page.watermark, '0'); assert.equal(page.items.length, 0); }
    finally { release(); }
    await Promise.all([a, b]);
    const page = await changes.page(t, audience, 'changes', 100); assert.equal(page.watermark, '2'); assert.equal(page.items.length, 2);
    assert(page.items.every(x => !Object.hasOwn(x, 'selected_payload')));
  });
  await group('snapshot pins immutable revisions across rename and new object', async () => {
    snapshot = await changes.page(t, audience, 'snapshots', 1); assert.equal(snapshot.watermark, '2'); assert.equal(snapshot.has_more, true);
    await add('campaign-b', '2', 'renamed B'); await add('campaign-c', '1', 'new C');
    const next = await changes.page(t, audience, 'snapshots', 1, snapshot.next_cursor);
    assert.equal(next.watermark, '2'); assert.equal(next.items.length, 1); assert.equal(next.items[0].selected_payload.name, 'initial B'); assert.equal(next.has_more, false);
    const fresh = await changes.page(t, audience, 'snapshots', 100);
    assert.equal(fresh.items.length, 3); assert.equal(fresh.items.find(x => x.external_object_id === 'campaign-b').selected_payload.name, 'renamed B');
  });
  await group('snapshot change tail fills updates without gaps; replay stable event IDs', async () => {
    stream = await changes.page(t, audience, 'changes', 1, snapshot.changes_after);
    assert.equal(stream.watermark, '4'); assert.equal(stream.items[0].external_object_id, 'campaign-b'); assert.equal(stream.has_more, true);
    const next = await changes.page(t, audience, 'changes', 1, stream.next_cursor);
    const repeat = await changes.page(t, audience, 'changes', 1, stream.next_cursor);
    assert.deepEqual(next.items, repeat.items); assert.equal(next.items[0].external_object_id, 'campaign-c'); assert.equal(next.has_more, false);
    await add('campaign-c', '2', 'changed C');
    const tail = await changes.page(t, audience, 'changes', 100, next.next_cursor);
    assert.equal(tail.items.length, 1); assert.equal(tail.items[0].revision, '2'); assert.equal(tail.watermark, '5');
  });
  await group('tenant/audience/query/tampered/expired cursor rejection', async () => {
    const invalid = async (tenant, aud, kind, token) => assert.rejects(() => changes.page(tenant, aud, kind, 10, token), e => e.code === 'INVALID_CURSOR');
    await invalid(other, audience, 'snapshots', snapshot.next_cursor);
    await invalid(t, 'other-consumer', 'snapshots', snapshot.next_cursor);
    await invalid(t, audience, 'changes', snapshot.next_cursor);
    await invalid(t, audience, 'snapshots', snapshot.next_cursor.slice(0, -3) + 'bad');
    const expired = cursors.encode({ version: 1, tenant: t, audience, query: 'snapshots', watermark: '2', after: '1', expires: Date.now() - 1 });
    await invalid(t, audience, 'snapshots', expired);
    assert.equal((await changes.page(other, audience, 'snapshots', 100)).items.length, 0);
  });
  await group('rollback keeps clock/event/observation atomic; duplicate event idempotent', async () => {
    await assert.rejects(() => db.transaction(async c => {
      await changes.lockClock(c, t); const id = await observation(c, 'rollback', '1', 'uncommitted');
      assert.equal(await changes.append(c, t, account, id), '6'); throw new Error('synthetic rollback');
    }));
    assert.equal((await changes.page(t, audience, 'changes', 100)).watermark, '5');
    const committed = await add('after-rollback', '1', 'committed'); assert.equal(committed.sequence, '6');
    await db.transaction(async c => { assert.equal(await changes.append(c, t, account, committed.id), '6'); });
    assert.equal((await changes.page(t, audience, 'changes', 100)).items.length, 6);
  });
  await mkdir('artifacts/marketing-changes', { recursive: true });
  await writeFile('artifacts/marketing-changes/mysql-latest.json', JSON.stringify({ passed, groups: passed.length, tenant: t, account, environment: 'persistent MySQL test_crm_marketing/runtime role', reset: false, liveMeta: 'NOT_RUN' }, null, 2));
  console.log(`PASS ${passed.length} durable change/snapshot groups`);
} finally { await db.close(); }
