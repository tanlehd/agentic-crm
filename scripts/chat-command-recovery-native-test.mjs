import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { parseEnv } from 'node:util';
import { createPool } from './lib/chat-native.mjs';
import { ChatOwnerCommands } from '../services/chat/dist/owner-command.js';
import { ChatCommandRecovery } from '../services/chat/dist/command-recovery.js';
import { ownerDigest } from '../packages/workload-transport/dist/index.js';

const cfg = JSON.parse(await readFile('.local/chat-ownership/credentials.json', 'utf8'));
assert.equal(cfg.database, 'test_crm_chat_owner'); assert.equal(cfg.host, '127.0.0.1'); assert.equal(cfg.port, 13306);
const env = parseEnv(await readFile('.local/native-auth-test.env', 'utf8'));
assert.equal(env.APP_ENV, 'test'); assert.equal(env.MYSQL_DATABASE, 'native_identity_test'); assert.equal(env.MYSQL_HOST, '127.0.0.1'); assert.equal(env.MYSQL_PORT, '13306');
const options = { host: cfg.host, port: cfg.port, database: cfg.database, timezone: 'Z', dateStrings: true, supportBigNumbers: true, bigNumberStrings: true, jsonStrings: true };
const pool = createPool({ ...options, user: 'chat_owner_test_runtime', password: cfg.runtime });
const operator = createPool({ ...options, user: 'chat_owner_test_operator', password: cfg.operator });
const registry = createPool({ host: env.MYSQL_HOST, port: Number(env.MYSQL_PORT), database: env.MYSQL_DATABASE, user: env.MYSQL_MIGRATION_USER, password: env.MYSQL_MIGRATION_PASSWORD });
const tenant = '01900000-0000-7000-8000-000000004104', other = '01900000-0000-7000-8000-000000004105';
const out = 'artifacts/chat-extraction/t06-delivery'; await mkdir(out, { recursive: true });
for (const t of [tenant, other]) {
  await registry.execute("INSERT INTO tenant(id,name,status,created_at,updated_at) VALUES (?,'Synthetic Chat command recovery','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id", [t]);
  await operator.execute("INSERT INTO chat_writer_gate(tenant_id,mode,epoch,manifest_digest,updated_at) VALUES (?,'active',1,?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE tenant_id=tenant_id", [t, 'e'.repeat(64)]);
}
const commands = new ChatOwnerCommands(pool, '1'), results = [];
let fail = false, pending = false, called = 0;
const handlers = new Map([['record-get', async (t, ref) => {
  called++; if (fail) throw new Error('Synthetic source outage'); if (!pending) await commands.abort(t, ref);
}]]);
const scanner = new ChatCommandRecovery(commands, [tenant], handlers);
async function prepare(t = tenant, operation = 'record-get', aged = true) {
  const id = randomUUID(), request = { synthetic: true }, actor = randomUUID();
  const proof = await commands.prepare({ tenant_id: t, command_id: id, owner: 'chat', operation,
    actor: { kind: 'human', principal_id: actor, delegation_id: actor },
    resource: { resource_id: randomUUID(), object_key: 'conversation', record_version: '1', owner_revision: '1', control_revision: '1', owner_principal_id: actor, team_id: null, shared_team_ids: [], archived: false },
    target: null, session_id: null, fields: [], payload_digest: ownerDigest(request), legacy_receipt_key: 'recovery-fixture:' + id, graph: null, dependencies: [],
  }, request);
  if (aged) await operator.execute('UPDATE chat_owner_command SET updated_at=UTC_TIMESTAMP(6)-INTERVAL 31 SECOND WHERE tenant_id=? AND command_id=?', [t, id]);
  return { command_id: id, binding_digest: proof.binding_digest };
}
async function slot(ref) { return (await pool.execute("SELECT state,lease_token,request_json,receipt_id FROM chat_owner_dependency WHERE tenant_id=? AND command_id=? AND slot='recovery'", [tenant, ref.command_id]))[0][0]; }
async function due(ref) { await operator.execute("UPDATE chat_owner_dependency SET next_attempt_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND command_id=? AND slot='recovery'", [tenant, ref.command_id]); }
async function check(name, fn) { await fn(); results.push({ name, status: 'PASS' }); console.log('PASS ' + name); }
try {
  // Retained completed work remains untouched; retrying older synthetic failures is safe and idempotent.
  await scanner.tick();
  await check('recovery discovers only aged configured-tenant commands and never creates business effects', async () => {
    const old = await prepare(), foreign = await prepare(other), fresh = await prepare(tenant, 'record-get', false);
    await scanner.tick(); assert.equal((await commands.proof(tenant, old)).state, 'aborted');
    assert.equal((await commands.proof(other, foreign)).state, 'prepared'); assert.equal((await commands.proof(tenant, fresh)).state, 'prepared');
    const s = await slot(old); assert.equal(s.state, 'released'); assert.equal(s.receipt_id, null); assert.deepEqual(JSON.parse(s.request_json), old);
    assert.deepEqual((await commands.proof(tenant, old)).binding.dependencies, []);
  });
  await check('handler outage and nonterminal result retain recoverable work across restart', async () => {
    const ref = await prepare(); fail = true;
    try { await scanner.tick(); assert.equal((await slot(ref)).state, 'prepared'); assert.equal((await commands.proof(tenant, ref)).state, 'prepared'); } finally { fail = false; }
    pending = true; try { await due(ref); await scanner.tick(); assert.equal((await slot(ref)).state, 'prepared'); } finally { pending = false; }
    await due(ref); await new ChatCommandRecovery(commands, [tenant], handlers).tick(); assert.equal((await slot(ref)).state, 'released');
    assert.equal((await commands.proof(tenant, ref)).state, 'aborted');
  });
  await check('unknown operation remains pending and reports unsupported without generic replay', async () => {
    const ref = await prepare(tenant, 'unregistered-recovery-fixture'); const before = called, report = await scanner.tick();
    assert(report.unsupported >= 1); assert.equal((await slot(ref)).state, 'prepared'); assert.equal((await commands.proof(tenant, ref)).state, 'prepared'); assert.equal(called, before);
  });
  await check('concurrent recovery claims and stale completion preserve newer lease and terminal proof', async () => {
    const ref = await prepare(); await scanner.discover(tenant, 100);
    const stale = await scanner.claim(tenant); assert.equal(stale.command_id, ref.command_id);
    assert.equal(await scanner.claim(tenant), null);
    await operator.execute("UPDATE chat_owner_dependency SET lease_until=UTC_TIMESTAMP(6)-INTERVAL 1 SECOND WHERE tenant_id=? AND command_id=? AND slot='recovery'", [tenant, ref.command_id]);
    const fresh = await scanner.claim(tenant); assert.equal(fresh.command_id, ref.command_id); assert.notEqual(fresh.lease_token, stale.lease_token);
    assert.equal(await scanner.finish(tenant, stale, true), false); assert.equal((await slot(ref)).lease_token, fresh.lease_token);
    await scanner.recover(tenant, fresh); assert.equal(await scanner.finish(tenant, fresh, true), true);
    assert.equal((await commands.proof(tenant, ref)).state, 'aborted');
  });
  await check('lost completion repeats the original abort proof and keeps permanent command identity', async () => {
    const ref = await prepare(); await scanner.discover(tenant, 100); const claim = await scanner.claim(tenant); assert.equal(claim.command_id, ref.command_id);
    await scanner.recover(tenant, claim); const before = await commands.proof(tenant, ref);
    await operator.execute("UPDATE chat_owner_dependency SET lease_until=UTC_TIMESTAMP(6)-INTERVAL 1 SECOND WHERE tenant_id=? AND command_id=? AND slot='recovery'", [tenant, ref.command_id]);
    await new ChatCommandRecovery(commands, [tenant], handlers).tick(); assert.deepEqual(await commands.proof(tenant, ref), before); assert.equal((await slot(ref)).state, 'released');
  });
  await writeFile(out + '/command-recovery-native.json', JSON.stringify({ scope: 'native own MySQL scheduler and original abort proof; synthetic registered recovery callback; full runtime handler composition pending', results }, null, 2));
} finally { await Promise.all([pool.end(), operator.end(), registry.end()]); }
