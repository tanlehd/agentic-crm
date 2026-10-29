import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomUUID, randomBytes, createHash, X509Certificate } from 'node:crypto';
import { once } from 'node:events';
import { createPool, rootSQL } from './lib/chat-native.mjs';
import { workloadCertificates } from './lib/workload-certificates.mjs';
import { NativeOwnerCapacity } from '../services/core-baseline/dist/modules/agents/owner-capacity.js';
import { routingOwnerRoutes } from '../services/core-baseline/dist/modules/agents/owner-http.js';
import { NativeRoutingConfiguration } from '../services/core-baseline/dist/modules/agents/owner-config.js';
import { ChatOwnerCommands } from '../services/chat/dist/owner-command.js';
import { chatOwnerRecoveryRoutes } from '../services/chat/dist/owner-http.js';
import { createWorkloadServer, ownerClient, ownerDigest, ownerBindingDigest, OwnerError } from '../packages/workload-transport/dist/index.js';

const env = parseEnv(await readFile('.local/native-auth-test.env', 'utf8'));
assert.equal(env.APP_ENV, 'test'); assert.equal(env.MYSQL_DATABASE, 'native_identity_test');
assert.equal(env.MYSQL_HOST, '127.0.0.1'); assert.equal(env.MYSQL_PORT, '13306');
const dir = '.local/chat-ownership', out = 'artifacts/chat-extraction/t04';
const tenant = '01900000-0000-7000-8000-000000004101', other = '01900000-0000-7000-8000-000000004102';
let f;
try { f = JSON.parse(await readFile(dir + '/routing-fixture.json', 'utf8')); }
catch (e) {
  if (e.code !== 'ENOENT') throw e;
  f = { environment: 'retained-test', database: env.MYSQL_DATABASE, tenant, runtime: randomBytes(32).toString('hex'), principal: randomUUID(), second: randomUUID(), team: randomUUID(), skill: randomUUID(), queue: randomUUID(), queueVersion: randomUUID() };
  await writeFile(dir + '/routing-fixture.json', JSON.stringify(f), { flag: 'wx', mode: 0o600 });
}
assert.equal(f.environment, 'retained-test'); assert.equal(f.database, env.MYSQL_DATABASE); assert.equal(f.tenant, tenant); assert.match(f.runtime, /^[a-f0-9]{64}$/);
const settings = { host: env.MYSQL_HOST, port: Number(env.MYSQL_PORT), database: env.MYSQL_DATABASE, timezone: 'Z', supportBigNumbers: true, bigNumberStrings: true, jsonStrings: true, connectionLimit: 8 };
const operator = createPool({ ...settings, user: env.MYSQL_MIGRATION_USER, password: env.MYSQL_MIGRATION_PASSWORD });
const pool = createPool({ ...settings, user: 'routing_owner_test_runtime', password: f.runtime });
const cfg = JSON.parse(await readFile(dir + '/credentials.json', 'utf8'));
assert.equal(cfg.database, 'test_crm_chat_owner'); assert.equal(cfg.host, '127.0.0.1'); assert.equal(cfg.port, 13306);
const chatPool = createPool({ ...settings, database: cfg.database, user: 'chat_owner_test_runtime', password: cfg.runtime });
const commands = new ChatOwnerCommands(chatPool, '1'), results = [], servers = [];
const tables = ['routing_capacity_reservation', 'routing_allocation_head', 'routing_capacity_gate'];
const definitions = await readFile('docs/data/chat-extraction/owner-additions-v1.sql', 'utf8');
const ddl = tables.map(name => {
  const sql = definitions.match(new RegExp('CREATE TABLE `crm_routing`\\.`' + name + '` \\([\\s\\S]*?;(?=\\r?\\n|$)'))?.[0];
  assert(sql); return sql.replace('`crm_routing`.', '');
});
const digest = createHash('sha256').update(ddl.join('\n')).digest('hex');
const configDDL = definitions.match(/CREATE TABLE `crm_routing`\.`routing_owner_command` \([\s\S]*?;(?=\r?\n|$)/)?.[0].replace('`crm_routing`.', '');
assert(configDDL); const configDigest = createHash('sha256').update(configDDL).digest('hex');
const deny = (promise, code) => assert.rejects(promise, e => e.code === code);
const check = async (name, work) => { await work(); results.push({ name, status: 'PASS' }); console.log('PASS ' + name); };
async function prepare(mutate = () => {}) {
  const request = { purpose: 'synthetic-routing-capacity' };
  const b = { tenant_id: tenant, command_id: randomUUID(), owner: 'chat', operation: 'routing-assignment',
    actor: { kind: 'human', principal_id: f.principal, delegation_id: randomUUID() },
    resource: { resource_id: randomUUID(), object_key: 'conversation', record_version: '1', owner_revision: '1', control_revision: '1', owner_principal_id: null, team_id: null, shared_team_ids: [], archived: false },
    target: { principal_id: f.principal, kind: 'human', team_id: f.team }, session_id: randomUUID(), fields: ['owner_principal_id', 'team_id'], payload_digest: ownerDigest(request), legacy_receipt_key: 'routing-test:' + randomUUID(), graph: null, dependencies: [] };
  mutate(b); await commands.prepare(b, request); return { b, command: { command_id: b.command_id, binding_digest: ownerBindingDigest(b) } };
}
let client, unavailable = false;
const call = (action, x, id = null, t = tenant) => client(t, 'capacity-' + action, { command: x.command, session_id: x.b.session_id, reservation_id: id });
const commit = x => commands.commit(tenant, x.command, randomUUID(), async () => ({ effect_id: x.b.resource.resource_id, effect_revision: String(BigInt(x.b.resource.record_version) + 1n) }));
async function release(x, r) { await commands.abort(tenant, x.command); return call('release', x, r.reservation_id); }
async function unassign(x, revision) {
  const next = await prepare(b => { b.resource = { ...x.b.resource, owner_revision: revision, owner_principal_id: x.b.target.principal_id }; b.session_id = x.b.session_id; b.target = { principal_id: null, kind: null, team_id: f.team }; });
  const r = await call('reserve', next); await commit(next); await call('confirm', next, r.reservation_id);
}
try {
  const stamp = dir + '/routing-schema.json';
  if (process.argv.includes('--provision')) {
    let pinned; try { pinned = JSON.parse(await readFile(stamp, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (pinned) assert.equal(pinned.digest, digest);
    for (let i = 0; i < tables.length; i++) {
      const [rows] = await operator.execute('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?', [env.MYSQL_DATABASE, tables[i]]);
      if (!rows.length) await operator.query(ddl[i]);
    }
    const configStamp = dir + '/routing-config-schema.json';
    let configPin; try { configPin = JSON.parse(await readFile(configStamp, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (configPin) assert.equal(configPin.digest, configDigest);
    if (!(await operator.execute("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME='routing_owner_command'", [env.MYSQL_DATABASE]))[0].length) await operator.query(configDDL);
    const read = ['routing_skill', 'routing_team_skill', 'routing_human_profile', 'routing_queue', 'routing_queue_version'];
    const write = ['routing_work_item', 'routing_queue_entry', 'routing_assignment_attempt', 'routing_human_allocation', ...tables];
    rootSQL(`CREATE USER IF NOT EXISTS 'routing_owner_test_runtime'@'%' IDENTIFIED BY '${f.runtime}';\n` + [...read.map(t => `GRANT SELECT,INSERT,UPDATE ON native_identity_test.\`${t}\` TO 'routing_owner_test_runtime'@'%';`), ...[...write, 'routing_owner_command'].map(t => `GRANT SELECT,INSERT,UPDATE ON native_identity_test.\`${t}\` TO 'routing_owner_test_runtime'@'%';`)].join('\n'));
    await writeFile(stamp, JSON.stringify({ database: env.MYSQL_DATABASE, tables, digest }));
    await writeFile(configStamp, JSON.stringify({ database: env.MYSQL_DATABASE, tables: ['routing_owner_command'], digest: configDigest }));
  }
  assert.equal(JSON.parse(await readFile(stamp, 'utf8')).digest, digest);
  assert.equal(JSON.parse(await readFile(dir + '/routing-config-schema.json', 'utf8')).digest, configDigest);
  for (const t of [tenant, other]) await operator.execute("INSERT INTO routing_capacity_gate(tenant_id,barrier_command_id,state,version,created_at,updated_at) VALUES (?,?,'open',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE tenant_id=tenant_id", [t, randomUUID()]);
  for (const principal of [f.principal, f.second]) await operator.execute('INSERT INTO routing_human_profile(tenant_id,principal_id,capacity,enabled) VALUES (?,?,1,1) ON DUPLICATE KEY UPDATE principal_id=principal_id', [tenant, principal]);
  const certs = await workloadCertificates(), chat = await certs.material('capacity-chat', 'chat'), routing = await certs.material('capacity-routing', 'routing');
  const fingerprints = new Set([chat, routing].map(m => new X509Certificate(m.cert).fingerprint256.replaceAll(':', '').toLowerCase()));
  const transport = async (peer, t) => { if (![tenant, other].includes(t) || !fingerprints.has(peer.fingerprint)) throw new OwnerError('FORBIDDEN'); };
  const chatServer = createWorkloadServer(chat, transport, chatOwnerRecoveryRoutes(commands)); servers.push(chatServer); chatServer.listen(0, '127.0.0.1'); await once(chatServer, 'listening');
  const proof = ownerClient(routing, transport, 'chat', new URL('https://127.0.0.1:' + chatServer.address().port + '/'));
  const capacity = new NativeOwnerCapacity(pool, (t, key, abort) => { if (unavailable) throw new OwnerError('DEPENDENCY_UNAVAILABLE'); return proof(t, abort ? 'command-abort' : 'command-proof', key); });
  const server = createWorkloadServer(routing, transport, routingOwnerRoutes(capacity)); servers.push(server); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  client = ownerClient(chat, transport, 'routing', new URL('https://127.0.0.1:' + server.address().port + '/'));

  await check('real TLS concurrent capacity-one reservations cannot overbook; replay and lost ACK status are stable', async () => {
    const a = await prepare(), b = await prepare(), outcomes = await Promise.allSettled([call('reserve', a), call('reserve', b)]);
    assert.equal(outcomes.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(outcomes.find(r => r.status === 'rejected').reason.code, 'CAPACITY');
    const i = outcomes[0].status === 'fulfilled' ? 0 : 1, x = [a, b][i], r = outcomes[i].value;
    assert.deepEqual(await call('reserve', x), r); assert.deepEqual(await call('status', x), r);
    await deny(call('status', x, r.reservation_id, other), 'NOT_FOUND');
    await deny(call('status', x, randomUUID()), 'CONFLICT');
    await deny(call('release', x, r.reservation_id), 'DEPENDENCY_UNAVAILABLE');
    unavailable = true; try { await deny(call('confirm', x, r.reservation_id), 'DEPENDENCY_UNAVAILABLE'); } finally { unavailable = false; }
    assert.equal((await call('status', x)).state, 'reserved');
    await release(x, r); await commands.abort(tenant, [a, b][1 - i].command);
  });
  await check('same-owner assignment at full capacity and reordered confirmations preserve newest allocation', async () => {
    const first = await prepare(), r1 = await call('reserve', first); await commit(first); await call('confirm', first, r1.reservation_id);
    const second = await prepare(b => { b.session_id = first.b.session_id; b.resource = { ...first.b.resource, owner_revision: '2', owner_principal_id: f.principal }; });
    const r2 = await call('reserve', second); await commit(second);
    const third = await prepare(b => { b.session_id = first.b.session_id; b.resource = { ...first.b.resource, owner_revision: '3', owner_principal_id: f.principal }; b.target.principal_id = f.second; });
    const r3 = await call('reserve', third); await commit(third); await call('confirm', third, r3.reservation_id); await call('confirm', second, r2.reservation_id);
    const [[head]] = await operator.execute('SELECT * FROM routing_allocation_head WHERE tenant_id=? AND session_id=?', [tenant, first.b.session_id]);
    assert.equal(head.principal_id, f.second); assert.equal(String(head.owner_revision), '4');
    assert.equal((await call('release', second, r2.reservation_id)).state, 'released');
    const [[newest]] = await operator.execute('SELECT principal_id,owner_revision FROM routing_allocation_head WHERE tenant_id=? AND session_id=?', [tenant, first.b.session_id]);
    assert.equal(newest.principal_id, f.second); assert.equal(String(newest.owner_revision), '4');
    await unassign(third, '4');
  });
  await check('close keeps owner revision and wins equal-revision late assignment confirmation without reopening capacity', async () => {
    const first = await prepare(), r1 = await call('reserve', first); await commit(first);
    const closing = await prepare(b => {
      b.operation = 'conversation-close'; b.fields = ['status']; b.session_id = first.b.session_id;
      b.resource = { ...first.b.resource, record_version: '2', owner_revision: '2', owner_principal_id: f.principal, team_id: f.team };
    });
    const rc = await call('reserve', closing); assert.equal(rc.owner_revision, '2'); await commit(closing);
    await call('confirm', closing, rc.reservation_id);
    await call('confirm', first, r1.reservation_id);
    assert.equal((await call('release', first, r1.reservation_id)).state, 'released');
    assert.equal((await call('confirm', closing, rc.reservation_id)).state, 'confirmed');
    const [[head]] = await operator.execute('SELECT state,owner_revision,reservation_id FROM routing_allocation_head WHERE tenant_id=? AND session_id=?', [tenant, first.b.session_id]);
    assert.equal(head.state, 'closed'); assert.equal(String(head.owner_revision), '2'); assert.equal(head.reservation_id, rc.reservation_id);
    const [[load]] = await operator.execute('SELECT COUNT(*) n FROM routing_human_allocation WHERE tenant_id=? AND principal_id=? AND released_at IS NULL', [tenant, f.principal]); assert.equal(Number(load.n), 0);
    const late = await prepare(b => { b.session_id = first.b.session_id; b.resource = { ...closing.b.resource, record_version: '3' }; });
    await deny(call('reserve', late), 'STALE_VERSION'); await commands.abort(tenant, late.command);
  });
  await check('Routing enrollment distinguishes managed and unmanaged work and enforces pinned skills', async () => {
    const unmanaged = await prepare(b => { b.target.principal_id = randomUUID(); });
    const ru = await call('reserve', unmanaged); assert.equal(ru.state, 'not-managed'); await release(unmanaged, ru);
    const x = await prepare(b => { b.target.principal_id = randomUUID(); }); const work = randomUUID();
    await operator.execute("INSERT INTO routing_work_item(tenant_id,id,session_id,conversation_id,state) VALUES (?,?,?,?,'waiting')", [tenant, work, x.b.session_id, x.b.resource.resource_id]);
    await deny(call('reserve', x), 'CAPACITY'); await commands.abort(tenant, x.command);
    await operator.execute("INSERT INTO routing_skill(tenant_id,id,skill_key,name) VALUES (?,?,'owner_capacity_test','Synthetic skill') ON DUPLICATE KEY UPDATE id=id", [tenant, f.skill]);
    await operator.execute("INSERT INTO routing_queue(tenant_id,id,name,enabled) VALUES (?,?,'Synthetic capacity queue',0) ON DUPLICATE KEY UPDATE id=id", [tenant, f.queue]);
    await operator.execute('INSERT INTO routing_queue_version(tenant_id,id,queue_id,version,team_id,connection_id,skill_ids,priority) VALUES (?,?,?,1,?,NULL,?,1) ON DUPLICATE KEY UPDATE id=id', [tenant, f.queueVersion, f.queue, f.team, JSON.stringify([f.skill])]);
    await operator.execute('UPDATE routing_queue SET enabled=1 WHERE tenant_id=? AND id=?', [tenant, f.queue]);
    try {
      const y = await prepare(); await deny(call('reserve', y), 'REFERENCE_INVALID');
      const workId = randomUUID(); await operator.execute("INSERT INTO routing_work_item(tenant_id,id,session_id,conversation_id,state) VALUES (?,?,?,?,'waiting')", [tenant, workId, y.b.session_id, y.b.resource.resource_id]);
      await operator.execute("INSERT INTO routing_queue_entry(tenant_id,id,work_id,queue_version_id,state) VALUES (?,?,?,?,'waiting')", [tenant, randomUUID(), workId, f.queueVersion]);
      await operator.execute("INSERT INTO routing_team_skill(tenant_id,team_id,skill_ids) VALUES (?,?,'[]') ON DUPLICATE KEY UPDATE skill_ids='[]',version=version+1", [tenant, f.team]);
      await deny(call('reserve', y), 'CAPACITY');
      await operator.execute('UPDATE routing_team_skill SET skill_ids=?,version=version+1 WHERE tenant_id=? AND team_id=?', [JSON.stringify([f.skill]), tenant, f.team]);
      const r = await call('reserve', y); assert.equal(r.queue_version_id, f.queueVersion); await release(y, r);
    } finally { await operator.execute('UPDATE routing_queue SET enabled=0 WHERE tenant_id=? AND id=?', [tenant, f.queue]); }
  });
  await check('closing gate blocks new reservation while terminal recovery remains available; foreign SQL denied', async () => {
    const x = await prepare(), r = await call('reserve', x);
    await operator.execute("UPDATE routing_capacity_gate SET state='closing' WHERE tenant_id=?", [tenant]);
    try { await deny(call('reserve', await prepare()), 'REVOKED'); await release(x, r); }
    finally { await operator.execute("UPDATE routing_capacity_gate SET state='open' WHERE tenant_id=?", [tenant]); }
    for (const sql of ['SELECT id FROM tenant LIMIT 1', 'SELECT id FROM account LIMIT 1', 'SELECT id FROM test_crm_chat_owner.crm_record LIMIT 1', 'CREATE TABLE routing_forbidden(tenant_id CHAR(36))']) await assert.rejects(pool.query(sql), e => ['ER_TABLEACCESS_DENIED_ERROR', 'ER_DBACCESS_DENIED_ERROR', 'ER_SPECIFIC_ACCESS_DENIED_ERROR'].includes(e.code));
  });
  await check('native configuration reduction drains pending and committed reservations, survives outage/restart and preserves historical load', async () => {
    const config = new NativeRoutingConfiguration(pool, capacity);
    const a = await prepare(), ra = await call('reserve', a); await commit(a);
    const b = await prepare(x => { x.target.principal_id = f.second; }), rb = await call('reserve', b);
    const [[profile]] = await operator.execute('SELECT version FROM routing_human_profile WHERE tenant_id=? AND principal_id=?', [tenant, f.principal]);
    const operation = randomUUID(), input = { kind: 'profile', id: f.principal, expected_version: String(profile.version), capacity: 0, enabled: false };
    await config.begin(tenant, operation, f.principal, input);
    await deny(config.begin(tenant, operation, f.principal, { ...input, capacity: 1 }), 'CONFLICT');
    unavailable = true; try { await deny(config.complete(tenant, operation), 'DEPENDENCY_UNAVAILABLE'); } finally { unavailable = false; }
    const [[unchanged]] = await operator.execute('SELECT capacity,version FROM routing_human_profile WHERE tenant_id=? AND principal_id=?', [tenant, f.principal]); assert.equal(Number(unchanged.capacity), 1); assert.equal(String(unchanged.version), String(profile.version));
    await deny(call('reserve', await prepare()), 'REVOKED');
    const result = await new NativeRoutingConfiguration(pool, capacity).complete(tenant, operation); assert(result.version);
    assert.deepEqual(await config.complete(tenant, operation), result);
    assert.equal((await call('status', a, ra.reservation_id)).state, 'confirmed'); assert.equal((await call('status', b, rb.reservation_id)).state, 'released');
    const [[load]] = await operator.execute('SELECT COUNT(*) n FROM routing_human_allocation WHERE tenant_id=? AND principal_id=? AND released_at IS NULL', [tenant, f.principal]); assert.equal(Number(load.n), 1);
    await deny(call('reserve', await prepare()), 'CAPACITY');
    const restore = randomUUID(); await config.begin(tenant, restore, f.principal, { ...input, expected_version: result.version, capacity: 1, enabled: true }); const restored = await config.complete(tenant, restore); assert(restored.version);
    const stale = randomUUID(); await config.begin(tenant, stale, f.principal, input); assert.deepEqual(await config.complete(tenant, stale), { error: 'STALE_VERSION' });
    assert.deepEqual(await config.complete(tenant, stale), { error: 'STALE_VERSION' });
    await unassign(a, '2');
  });
  await writeFile(out + '/routing.json', JSON.stringify({ results, digest, configDigest, scope: 'native Routing tables/config drain and Chat command ledger over actual TLS, synthetic enrollment and terminal Chat effect; public configuration authorization/dispatch composition pending' }, null, 2));
} catch (e) {
  await writeFile(out + '/routing-failure-' + Date.now() + '.json', JSON.stringify({ results, code: e.code ?? e.message, stack: e.stack }, null, 2));
  throw new Error(e.code ?? 'ROUTING_OWNER_TEST_FAILED');
} finally {
  for (const server of servers.reverse()) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  await Promise.all([operator.end(), pool.end(), chatPool.end()]);
}
