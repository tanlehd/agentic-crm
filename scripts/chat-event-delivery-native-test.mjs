import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomUUID, X509Certificate } from 'node:crypto';
import { once } from 'node:events';
import { createPool } from './lib/chat-native.mjs';
import { workloadCertificates } from './lib/workload-certificates.mjs';
import { ChatOwnerCommands } from '../services/chat/dist/owner-command.js';
import { ChatEventDelivery, chatEventSourceRoutes } from '../services/chat/dist/event-delivery.js';
import { writeChatOutbox, stageChatEvent, catchUpChatEvents, eventNotice, decodeEvent } from '../services/chat/dist/event-store.js';
import { createWorkloadServer, ownerClient, ownerRoute, OwnerError } from '../packages/workload-transport/dist/index.js';

const cfg = JSON.parse(await readFile('.local/chat-ownership/credentials.json', 'utf8'));
assert.equal(cfg.database, 'test_crm_chat_owner'); assert.equal(cfg.host, '127.0.0.1'); assert.equal(cfg.port, 13306);
const env = parseEnv(await readFile('.local/native-auth-test.env', 'utf8'));
assert.equal(env.APP_ENV, 'test'); assert.equal(env.MYSQL_DATABASE, 'native_identity_test'); assert.equal(env.MYSQL_HOST, '127.0.0.1'); assert.equal(env.MYSQL_PORT, '13306');
const options = { host: cfg.host, port: cfg.port, database: cfg.database, timezone: 'Z', dateStrings: true, supportBigNumbers: true, bigNumberStrings: true, jsonStrings: true };
const pool = createPool({ ...options, user: 'chat_owner_test_runtime', password: cfg.runtime });
const operator = createPool({ ...options, user: 'chat_owner_test_operator', password: cfg.operator });
const registry = createPool({ host: env.MYSQL_HOST, port: Number(env.MYSQL_PORT), database: env.MYSQL_DATABASE, user: env.MYSQL_MIGRATION_USER, password: env.MYSQL_MIGRATION_PASSWORD });
const dir = '.local/chat-event-delivery', out = 'artifacts/chat-extraction/t06-delivery', tenant = '01900000-0000-7000-8000-000000004103';
await mkdir(dir, { recursive: true }); await mkdir(out, { recursive: true });
let fixture;
try { fixture = JSON.parse(await readFile(dir + '/fixture.json', 'utf8')); }
catch (e) { if (e.code !== 'ENOENT') throw e; fixture = { tenant, aggregate: randomUUID(), actor: randomUUID(), receivers: {} }; await writeFile(dir + '/fixture.json', JSON.stringify(fixture), { flag: 'wx' }); }
assert.equal(fixture.tenant, tenant);
await registry.execute("INSERT INTO tenant(id,name,status,created_at,updated_at) VALUES (?,'Synthetic Chat event delivery','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id", [tenant]);
await operator.execute("INSERT INTO chat_writer_gate(tenant_id,mode,epoch,manifest_digest,updated_at) VALUES (?,'active',1,?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE tenant_id=tenant_id", [tenant, 'e'.repeat(64)]);
const commands = new ChatOwnerCommands(pool, '1'), results = [], servers = [];
const certs = await workloadCertificates(), chat = await certs.material('event-chat', 'chat'), workflow = await certs.material('event-workflow', 'workflow'), routing = await certs.material('event-routing', 'routing');
const enrolled = new Set([chat, workflow, routing].map(m => new X509Certificate(m.cert).fingerprint256.replaceAll(':', '').toLowerCase()));
const authority = async (peer, t) => { if (t !== tenant || !enrolled.has(peer.fingerprint)) throw new OwnerError('FORBIDDEN'); };
let lostAck = false, wrongReceipt = false, receiverCalls = 0;
const receiverFile = dir + '/receiver.json';
let receipts = {};
try { receipts = JSON.parse(await readFile(receiverFile, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
// Durable synthetic receiver, no Workflow business implementation or subscription ACK outside this isolated tenant.
async function persist() { await writeFile(receiverFile + '.next', JSON.stringify(receipts)); await rename(receiverFile + '.next', receiverFile); }
const receiver = createWorkloadServer(workflow, authority, {
  '/internal/v1/owners/workflow/event-deliver': ownerRoute('workflow', 'event-deliver', ['chat'], async r => {
    receiverCalls++;
    const n = r.payload.notice, key = n.consumer + ':' + n.event_id;
    const value = { producer: 'chat', consumer: n.consumer, event_id: n.event_id, digest: wrongReceipt ? 'a'.repeat(64) : n.digest, state: receipts[key] ? 'duplicate' : 'applied', watermark: n.stream_sequence };
    if (!wrongReceipt) { receipts[key] = value; await persist(); }
    if (lostAck) { lostAck = false; throw new OwnerError('DEPENDENCY_UNAVAILABLE'); }
    return value;
  }),
  '/internal/v1/owners/workflow/event-status': ownerRoute('workflow', 'event-status', ['chat'], async r => {
    const value = receipts[r.payload.consumer + ':' + r.payload.event_id];
    if (!value) throw new OwnerError('NOT_FOUND'); return value;
  }),
});
servers.push(receiver); receiver.listen(0, '127.0.0.1'); await once(receiver, 'listening');
const send = ownerClient(chat, authority, 'workflow', new URL('https://127.0.0.1:' + receiver.address().port + '/'));
const transport = { configured: owner => owner === 'workflow', call: (t, _owner, operation, payload) => send(t, operation, payload) };
const relay = new ChatEventDelivery(commands, [tenant], transport);
const source = createWorkloadServer(chat, authority, {
  ...chatEventSourceRoutes(relay),
  '/internal/v1/owners/chat/event-deliver': ownerRoute('chat', 'event-deliver', ['chat'], (r, p) => relay.localDeliver(r.tenant_id, p.service, r.payload)),
  '/internal/v1/owners/chat/event-status': ownerRoute('chat', 'event-status', ['chat'], (r, p) => relay.localStatus(r.tenant_id, p.service, r.payload)),
});
servers.push(source); source.listen(0, '127.0.0.1'); await once(source, 'listening');
const sourceUrl = new URL('https://127.0.0.1:' + source.address().port + '/');
const client = ownerClient(workflow, authority, 'chat', sourceUrl), local = ownerClient(chat, authority, 'chat', sourceUrl), stranger = ownerClient(routing, authority, 'chat', sourceUrl);
const insert = "INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,?,1,?,?,1,?,?,'human',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')";
async function emit(type = 'conversation.created', aggregate = randomUUID(), data, aggregateType) {
  const id = randomUUID();
  const payload = data ?? (type === 'conversation.created' ? { contact_id: randomUUID(), connection_id: randomUUID() } : { snippet_id: aggregate, operation: 'created' });
  await commands.transaction(tenant, c => writeChatOutbox(c, insert, [id, tenant, type, aggregateType ?? (type === 'conversation.created' ? 'conversation' : 'chat_snippet'), aggregate, JSON.stringify(payload), id, fixture.actor]));
  return id;
}
async function row(id) { return (await pool.execute('SELECT * FROM chat_event_delivery WHERE tenant_id=? AND event_id=?', [tenant, id]))[0][0]; }
async function due(id) { await operator.execute('UPDATE chat_event_delivery SET next_attempt_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND event_id=?', [tenant, id]); }
async function check(name, fn) { await fn(); results.push({ name, status: 'PASS' }); console.log('PASS ' + name); }
try {
  await check('legacy catch-up requires frozen exact epoch and preserves missing source identity and sequence', async () => {
    await assert.rejects(catchUpChatEvents(operator, tenant, '1'), e => e.code === 'PRECONDITION_REQUIRED');
    const aggregate = randomUUID(), ids = [randomUUID(), randomUUID()];
    await operator.execute("UPDATE chat_writer_gate SET mode='frozen' WHERE tenant_id=?", [tenant]);
    try {
      await assert.rejects(commands.transaction(tenant, async () => {}), e => e.code === 'DEPENDENCY_UNAVAILABLE');
      await assert.rejects(catchUpChatEvents(operator, tenant, '2'), e => e.code === 'PRECONDITION_REQUIRED');
      for (const id of ids) await operator.execute(insert, [id, tenant, 'conversation.created', 'conversation', aggregate, JSON.stringify({ contact_id: randomUUID(), connection_id: randomUUID() }), id, fixture.actor]);
      assert.equal(await catchUpChatEvents(operator, tenant, '1'), 2);
      const rows = await Promise.all(ids.map(row)); assert.equal(String(rows[0].sequence), '1'); assert.equal(String(rows[1].sequence), '2');
      assert.equal(await catchUpChatEvents(operator, tenant, '1'), 0);
    } finally { await operator.execute("UPDATE chat_writer_gate SET mode='active' WHERE tenant_id=?", [tenant]); }
    await relay.tick();
  });
  await check('atomic mutation outbox and delivery rollback; concurrent stream sequences and idempotent catch-up', async () => {
    const id = randomUUID();
    await assert.rejects(commands.transaction(tenant, async c => { await writeChatOutbox(c, insert, [id, tenant, 'conversation.created', 'conversation', fixture.aggregate, JSON.stringify({ contact_id: randomUUID(), connection_id: randomUUID() }), id, fixture.actor]); throw new Error('fixture rollback'); }), /fixture rollback/);
    assert.equal((await pool.execute('SELECT id FROM outbox_event WHERE tenant_id=? AND id=?', [tenant, id]))[0].length, 0); assert.equal(await row(id), undefined);
    const ids = await Promise.all(Array.from({ length: 4 }, () => emit('conversation.created', fixture.aggregate)));
    const rows = await Promise.all(ids.map(row)); const sequences = rows.map(r => BigInt(r.sequence)).sort((a, b) => a < b ? -1 : 1);
    assert.equal(new Set(sequences).size, 4); assert.equal(sequences.at(-1) - sequences[0], 3n);
    await commands.transaction(tenant, c => stageChatEvent(c, tenant, ids[0])); assert.equal((await row(ids[0])).sequence, rows[0].sequence);
  });
  await check('native authenticated producer read replay and wrong subscriber tenant digest denial', async () => {
    const id = await emit(), d = await row(id), n = eventNotice(d);
    assert.equal((await client(tenant, 'event-read', n)).event_id, id);
    const page = await client(tenant, 'event-replay', { consumer: n.consumer, aggregate_id: n.aggregate_id, after_sequence: '0', limit: 1 }); assert.deepEqual(page.events, [n]); assert.equal(page.high_watermark, '1');
    await assert.rejects(stranger(tenant, 'event-read', n), e => e.code === 'FORBIDDEN');
    await assert.rejects(client(randomUUID(), 'event-read', n), e => e.code === 'FORBIDDEN');
    await assert.rejects(client(tenant, 'event-read', { ...n, digest: '0'.repeat(64) }), e => e.code === 'CONFLICT');
    await relay.tick(); assert.equal((await row(id)).state, 'acked');
  });
  await check('lost ACK restart resolves durable receiver status without repeating effect', async () => {
    const id = await emit(); lostAck = true; const calls = receiverCalls; await relay.tick(1); assert.equal((await row(id)).state, 'pending');
    const d = await row(id); assert(receipts[d.consumer_name + ':' + id]); await due(id);
    const restarted = new ChatEventDelivery(new ChatOwnerCommands(pool, '1'), [tenant], transport); await restarted.tick(1);
    assert.equal((await row(id)).state, 'acked'); assert.equal(receiverCalls, calls + 1);
  });
  await check('six local notification receipts do not repeat business writes and are durable across replay', async () => {
    const conversation = randomUUID(), tag = randomUUID(), inbox = randomUUID(), snippet = randomUUID(), marker = randomUUID();
    const cases = [
      ['chat.read_marker.updated','conversation_read_state',marker,{conversation_id:conversation,principal_id:fixture.actor,through_inbound_seq:'3',read_state_revision:'1'}],
      ['chat.snooze.changed','conversation',conversation,{conversation_id:conversation,until:null,snooze_revision:'1',cause:'deadline'}],
      ['chat.inbox.changed','chat_inbox',inbox,{inbox_id:inbox,operation:'created'}],
      ['chat.snippet.changed','chat_snippet',snippet,{snippet_id:snippet,operation:'created'}],
      ['chat.tag_definition.changed','conversation_tag',tag,{tag_id:tag,operation:'created'}],
      ['chat.conversation_tag.changed','conversation',conversation,{conversation_id:conversation,tag_id:tag,operation:'attached',tag_set_revision:'1'}],
    ];
    for (const [type,aggregateType,aggregate,data] of cases) {
      const id = await emit(type,aggregate,data,aggregateType), d = await row(id), e = decodeEvent(d.envelope_json), n = eventNotice(d);
      const before = (await pool.execute('SELECT id,payload,aggregate_version FROM outbox_event WHERE tenant_id=? AND id=?', [tenant, id]))[0];
      assert.equal((await local(tenant, 'event-deliver', e)).state, 'applied'); assert.equal((await local(tenant, 'event-deliver', e)).state, 'duplicate');
      assert.equal((await local(tenant, 'event-status', n)).state, 'applied'); await relay.tick(); assert.equal((await row(id)).state, 'acked');
      assert.deepEqual((await pool.execute('SELECT id,payload,aggregate_version FROM outbox_event WHERE tenant_id=? AND id=?', [tenant, id]))[0], before);
    }
  });
  await check('local ordered gaps wait for predecessor; conflicting envelope quarantines', async () => {
    const aggregate = randomUUID(), one = await emit('chat.snippet.changed', aggregate), two = await emit('chat.snippet.changed', aggregate);
    const first = decodeEvent((await row(one)).envelope_json), second = decodeEvent((await row(two)).envelope_json);
    assert.equal((await local(tenant, 'event-deliver', second)).state, 'pending');
    assert.equal((await local(tenant, 'event-deliver', first)).state, 'applied'); assert.equal((await local(tenant, 'event-deliver', second)).state, 'applied');
    assert.equal((await local(tenant, 'event-deliver', { ...second, data: { ...second.data, operation: 'updated' } })).state, 'quarantined');
    await relay.tick(); assert.equal((await row(two)).state, 'quarantined');
  });
  await check('unconfigured downstream retains backlog without gating producer publication', async () => {
    const id = randomUUID(), session = randomUUID();
    await commands.transaction(tenant, c => writeChatOutbox(c, insert, [id, tenant, 'acquisition_session.opened', 'acquisition_session', session, JSON.stringify({ session_id: session, conversation_id: randomUUID(), status: 'active', source_classification: 'organic', source_ad_id: null, sequence: '1' }), id, fixture.actor]));
    await relay.tick(); const d = await row(id); assert.equal(d.state, 'pending'); assert.equal(Number(d.attempts), 0);
  });
  await check('mismatched receipt and failed retry remain pending then quarantine after ten attempts', async () => {
    const id = await emit(); wrongReceipt = true; await relay.tick(); assert.equal((await row(id)).state, 'pending');
    for (let attempt = 1; attempt < 10; attempt++) { await due(id); await relay.tick(); }
    const d = await row(id); assert.equal(d.state, 'quarantined'); assert.equal(Number(d.attempts), 10); wrongReceipt = false;
  });
  await check('expired lease reclaimed after restart; stale worker cannot acknowledge newer lease', async () => {
    const id = await emit();
    const stale = await relay.claim(tenant); assert.equal(stale.event_id, id);
    await operator.execute('UPDATE chat_event_delivery SET lease_until=UTC_TIMESTAMP(6)-INTERVAL 1 SECOND WHERE tenant_id=? AND event_id=?', [tenant, id]);
    const fresh = await relay.claim(tenant); assert.equal(fresh.event_id, id); assert.notEqual(fresh.lease_token, stale.lease_token);
    const n = eventNotice(fresh), proof = { event_id: id, producer: 'chat', consumer: n.consumer, digest: n.digest, state: 'applied', watermark: n.stream_sequence };
    assert.equal(await relay.finish(stale, proof), false); assert.equal((await row(id)).state, 'pending');
    // Only the durable synthetic receiver can supply the successful receipt.
    const actual = await send(tenant, 'event-deliver', { notice: n }); assert.equal(await relay.finish(fresh, actual), true);
    assert.equal((await row(id)).state, 'acked');
  });
  await writeFile(out + '/native.json', JSON.stringify({ scope: 'native Chat MySQL and actual authenticated HTTPS; durable synthetic Workflow receipt receiver; no downstream business acceptance or main activation', results }, null, 2));
} finally {
  for (const server of servers) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  await Promise.all([pool.end(), operator.end(), registry.end()]);
}
