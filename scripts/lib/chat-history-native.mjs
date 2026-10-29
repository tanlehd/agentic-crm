import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID, randomBytes, createHmac } from 'node:crypto';
import { once } from 'node:events';
import { createPool, rootSQL } from './chat-native.mjs';
import { ChatHistory, chatHistoryRoutes, historyOperations } from '../../services/chat/dist/history.js';
import { ChatHistoryBff, createChatHistoryBff } from '../../services/core-baseline/dist/gateway/chat-history-bff.js';
import { channelHistoryOwnerRoutes } from '../../services/core-baseline/dist/modules/channels/history-owner.js';
import { HumanDispatchEnrollment } from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';
import { hash } from '../../services/core-baseline/dist/modules/identity/auth/security.js';
import { createWorkloadServer, ownerCommandClient, ownerClient, remoteRegistryAuthority, OwnerError } from '../../packages/workload-transport/dist/index.js';
import {nativeChatParity} from './chat-runtime-parity.mjs';

export async function chatHistoryNative(ctx) {
  const { check, operator, chatOperator, chatPool, commands, tenant, other, f, ds, auth, actorSession, adminSession, enrollment,
    identity, identityClient, chatMaterial, bffMaterial, connectorMaterial, chatAuthority, registryConfig, protocol, servers, drainingAuth, login, grants } = ctx;
  const path = '.local/chat-ownership/history-fixture.json'; let fixture;
  try { fixture = JSON.parse(await readFile(path, 'utf8')); }
  catch (e) {
    if (e.code !== 'ENOENT') throw e;
    fixture = { tenant, database: 'native_identity_test', chatDatabase: 'test_crm_chat_owner', team: randomUUID(), connection: randomUUID(),
      conversation: randomUUID(), sibling: randomUUID(), contact: randomUUID(), identity: randomUUID(), siblingIdentity: randomUUID(), intent: randomUUID(),
      messages: Array.from({ length: 4 }, () => randomUUID()).sort(), foreignMessage: randomUUID(), sessions: [randomUUID(), randomUUID()],
      channelsPassword: randomBytes(32).toString('hex'), cursorKey: randomBytes(32).toString('hex') };
    await writeFile(path, JSON.stringify(fixture), { flag: 'wx', mode: 0o600 });
  }
  assert.equal(fixture.tenant, tenant); assert.equal(fixture.database, 'native_identity_test'); assert.equal(fixture.chatDatabase, 'test_crm_chat_owner');
  assert.match(fixture.channelsPassword, /^[a-f0-9]{64}$/);
  await operator.execute("INSERT INTO team(id,tenant_id,name,purpose,created_at,updated_at) VALUES (?,?,'Synthetic history','chat',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id", [fixture.team, tenant]);
  await operator.execute("INSERT INTO channel_connection(id,tenant_id,provider,external_account_id,status,team_id) VALUES (?,?,'mock_messenger',?,'active',?) ON DUPLICATE KEY UPDATE id=id", [fixture.connection, tenant, fixture.connection, fixture.team]);
  rootSQL(`CREATE USER IF NOT EXISTS 'chat_history_channels_test'@'%' IDENTIFIED BY '${fixture.channelsPassword}';\nGRANT SELECT ON native_identity_test.channel_connection TO 'chat_history_channels_test'@'%';`);
  const channels = createPool({ host: '127.0.0.1', port: 13306, database: fixture.database, user: 'chat_history_channels_test', password: fixture.channelsPassword });
  const transcript = 'Synthetic history boundary';
  for (const [id, contactIdentity] of [[fixture.conversation, fixture.identity], [fixture.sibling, fixture.siblingIdentity]]) {
    await chatOperator.execute("INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,version,owner_revision,custom_values,created_at,updated_at) VALUES (?,?,?,?,7,3,'{}',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id", [id, tenant, f.object, f.principal]);
    await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at) VALUES (?,?,?,?,?,'open',UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE record_id=record_id", [tenant, id, fixture.contact, contactIdentity, fixture.connection]);
    await chatOperator.execute('INSERT INTO chat_control_head(tenant_id,conversation_id,registry_revision,control_revision,cancel_through,pause_through,version,created_at,updated_at) VALUES (?,?,1,1,0,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE conversation_id=conversation_id', [tenant, id]);
  }
  await chatOperator.execute("INSERT INTO outbound_intent(id,tenant_id,conversation_id,actor_kind,actor_id,account_id,owner_revision,text,status,idempotency_key,error_code,created_at) VALUES (?,?,?,'human',?,?,3,?,'remote_unknown',?,'DELIVERY_UNKNOWN',UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id", [fixture.intent, tenant, fixture.conversation, f.principal, f.account, transcript, fixture.intent]);
  for (let n = 0; n < fixture.messages.length; n++) {
    const outbound = n === 3, id = fixture.messages[n];
    await chatOperator.execute(`INSERT INTO message(id,tenant_id,conversation_id,connection_id,provider_message_id,outbound_intent_id,direction,text,occurred_at,received_at,status)
      VALUES (?,?,?,?,?,?,?,?, '2026-10-19 01:00:00.000001','2026-10-19 01:00:00.123456',?) ON DUPLICATE KEY UPDATE id=id`,
    [id, tenant, fixture.conversation, fixture.connection, outbound ? null : id, outbound ? fixture.intent : null, outbound ? 'outbound' : 'inbound', transcript, outbound ? 'unknown' : 'received']);
  }
  await chatOperator.execute("INSERT INTO message(id,tenant_id,conversation_id,connection_id,provider_message_id,direction,text,occurred_at,received_at,status) VALUES (?,?,?,?,?,'inbound',?,'2026-10-19 01:00:00.000001','2026-10-19 01:00:00.123456','received') ON DUPLICATE KEY UPDATE id=id", [fixture.foreignMessage, tenant, fixture.sibling, fixture.connection, fixture.foreignMessage, transcript]);
  for (const [message, target] of [[fixture.messages[1], fixture.messages[0]], [fixture.messages[2], fixture.foreignMessage]]) await chatOperator.execute('INSERT INTO message_content(tenant_id,message_id,content) VALUES (?,?,?) ON DUPLICATE KEY UPDATE message_id=message_id', [tenant, message, JSON.stringify({ version: 1, message_type: 'text', text: transcript, reply_to: { external_msg_id: target }, attachment: null })]);
  for (let n = 0; n < 2; n++) await chatOperator.execute(`INSERT INTO conversation_acquisition_session(tenant_id,id,conversation_id,sequence,version,status,opening_reason,close_reason,opened_at,opening_occurred_at,closed_at,source_classification,policy_version)
    VALUES (?,?,?,?,1,'closed','first_inbound','agent_closed','2026-10-19 01:00:00','2026-10-19 01:00:00','2026-10-19 02:00:00','unknown','inbox_v2') ON DUPLICATE KEY UPDATE id=id`, [tenant, fixture.sessions[n], fixture.conversation, String(9007199254740999n + BigInt(n))]);
  let unavailable = false, lost = false, mode = null, observed;
  const connectorAuthority = remoteRegistryAuthority(connectorMaterial, registryConfig);
  const connectorServer = createWorkloadServer(connectorMaterial, connectorAuthority, channelHistoryOwnerRoutes(channels)); servers.push(connectorServer);
  connectorServer.listen(0, '127.0.0.1'); await once(connectorServer, 'listening');
  const connector = ownerClient(chatMaterial, chatAuthority, 'connector', new URL(protocol + '//127.0.0.1:' + connectorServer.address().port + '/'));
  const peers = {
    admit: async (t, command) => {
      if (unavailable) throw new OwnerError('DEPENDENCY_UNAVAILABLE');
      const receipt = await identityClient(t, 'admit', { owner: 'chat', command }); observed = { command, receipt };
      if (mode === 'race') {
        const c = await chatOperator.getConnection();
        try { await c.query('SET innodb_lock_wait_timeout=1'); await c.execute('UPDATE crm_record SET version=version+1 WHERE tenant_id=? AND id=?', [tenant, fixture.conversation]); } finally { c.release(); }
      }
      if (mode === 'revoke') {
        const barrier = randomUUID(); await identity.beginRoleChange(tenant, hash(adminSession), barrier, f.role, []); await identity.drainRoleChange(tenant, barrier);
      }
      return receipt;
    },
    settle: async (t, command, admission_id) => {
      const receipt = await identityClient(t, 'settle', { owner: 'chat', command, admission_id });
      if (lost) { lost = false; throw new OwnerError('DEPENDENCY_UNAVAILABLE'); } return receipt;
    },
    subject: (t, command, admission_id) => identityClient(t, 'admission-cursor-subject', { command, admission_id }),
    platform: (t, connection_id) => connector(t, 'history-platform-read', { connection_id }),
  };
  const history = new ChatHistory(commands, peers, fixture.cursorKey);
  const chatServer = createWorkloadServer(chatMaterial, chatAuthority, chatHistoryRoutes(history)); servers.push(chatServer);
  chatServer.listen(0, '127.0.0.1'); await once(chatServer, 'listening');
  const send = ownerCommandClient(bffMaterial, remoteRegistryAuthority(bffMaterial, registryConfig), 'chat', new URL(protocol + '//127.0.0.1:' + chatServer.address().port + '/'));
  const publicServer = createChatHistoryBff(new ChatHistoryBff(auth, new HumanDispatchEnrollment(ds), send)); servers.push(publicServer);
  publicServer.listen(0, '127.0.0.1'); await once(publicServer, 'listening');
  const headers = { 'X-Tenant-Id': tenant, Cookie: 'crm_session=' + actorSession };
  const request = (operation = historyOperations.messages, payload = { id: fixture.conversation }) => ({ schema_version: 1, request_id: randomUUID(), correlation_id: randomUUID(), tenant_id: tenant, operation, command_id: randomUUID(), actor: { kind: 'human', principal_id: f.principal, delegation_id: enrollment.delegationId }, payload });
  async function get(suffix = 'messages', override = headers, parent = fixture.conversation) {
    const r = await fetch('http://127.0.0.1:' + publicServer.address().port + '/api/v1/conversations/' + parent + '/' + suffix, { headers: override });
    return { status: r.status, cache: r.headers.get('cache-control'), body: await r.json() };
  }
  const ok = r => { assert.equal(r.status, 200, r.body.error?.code); return r.body; };
  async function changePolicy(fields, work) {
    const [[old]] = await operator.execute('SELECT property_key,denied_actions FROM field_policy WHERE tenant_id=? AND id=?', [tenant, f.policy]);
    try { await operator.execute('UPDATE field_policy SET property_key=?,denied_actions=? WHERE tenant_id=? AND id=?', [fields[0], JSON.stringify(fields[1]), tenant, f.policy]); await work(); }
    finally { await operator.execute('UPDATE field_policy SET property_key=?,denied_actions=? WHERE tenant_id=? AND id=?', [old.property_key, typeof old.denied_actions === 'string' ? old.denied_actions : JSON.stringify(old.denied_actions), tenant, f.policy]); }
  }
  try {
    if(process.argv.includes('--with-runtime'))await check('Chat messaging runtime public history cursors envelopes acquisition and unknown send status',async()=>{
      const candidate=await nativeChatParity(ctx,{connector:new URL(protocol+'//127.0.0.1:'+connectorServer.address().port+'/')},fixture.cursorKey);
      try{
        const http=createChatHistoryBff(new ChatHistoryBff(auth,new HumanDispatchEnrollment(ds),candidate.call));servers.push(http);http.listen(0,'127.0.0.1');await once(http,'listening');
        const getRuntime=async suffix=>{const r=await fetch('http://127.0.0.1:'+http.address().port+'/api/v1/conversations/'+fixture.conversation+'/'+suffix,{headers});return {status:r.status,body:await r.json(),cache:r.headers.get('cache-control')};};
        const first=ok(await getRuntime('messages?limit=2'));assert.deepEqual(first.data.map(m=>m.id),fixture.messages.slice(0,2));assert(first.next_cursor);
        const next=ok(await getRuntime('message-envelopes-v3?limit=2&cursor='+first.next_cursor));assert.deepEqual(next.data.map(m=>m.id),fixture.messages.slice(2));
        const v2=ok(await getRuntime('message-envelopes'));assert(v2.data.every(m=>m.schema_version===2));
        assert.equal((await getRuntime('messages')).cache,'no-store');assert.equal((await getRuntime('messages?cursor='+first.next_cursor+'bad')).status,400);
        assert.equal((await getRuntime('acquisition-sessions')).status,200);assert.equal((await getRuntime('outbound-intents/'+fixture.intent)).status,200);
        await changePolicy(['text',['read']],async()=>{for(const row of ok(await getRuntime('messages')).data)assert(!('text'in row));});
        assert(candidate.proofCount()>0);
      }finally{await candidate.stop();}
    });
    await check('Chat messaging native public history retains IDs microsecond cursors and v1/v2/v3 reply semantics', async () => {
      const first = ok(await get('messages?limit=2')); assert.deepEqual(first.data.map(m => m.id), fixture.messages.slice(0, 2)); assert(first.next_cursor);
      const cursorBody = { binding: { account: f.account, tenant, id: fixture.conversation, state: null, owner: null, team: null }, position: { time: '2026-10-19 01:00:00.123456', id: fixture.messages[1] } };
      const payload = Buffer.from(JSON.stringify(cursorBody)).toString('base64url');
      const legacy = payload + '.' + createHmac('sha256', fixture.cursorKey).update(payload).digest('base64url'); assert.equal(first.next_cursor, legacy);
      const second = ok(await get('message-envelopes-v3?limit=2&cursor=' + legacy)); assert.deepEqual(second.data.map(m => m.id), fixture.messages.slice(2)); assert.equal(second.next_cursor, null);
      const rich = ok(await get('message-envelopes-v3')).data; assert.equal(rich[1].reply_to.internal_message_id, fixture.messages[0]); assert.equal(rich[2].reply_to.internal_message_id, null);
      const v2 = ok(await get('message-envelopes')).data; assert(v2.every(m => m.schema_version === 2 && m.platform === 'mock_messenger')); assert.equal(v2[1].reply_to, null);
      assert.equal((await get()).cache, 'no-store');
      for (const suffix of ['messages?limit=2&limit=3', 'messages?unexpected=1', 'messages?limit=0']) assert.equal((await get(suffix)).status, 400);
      assert.equal((await get('messages', { 'X-Tenant-Id': tenant })).status, 401);
      assert.equal((await get('messages', { ...headers, 'X-Tenant-Id': other })).status, 404);
      assert.equal((await get('messages?cursor=' + legacy, headers, fixture.sibling)).body.error.code, 'INVALID_CURSOR');
      assert.equal((await get('messages?cursor=' + legacy + 'bad')).body.error.code, 'INVALID_CURSOR');
      const admin = await login(f.adminAccount); assert.equal((await get('messages?cursor=' + legacy, { ...headers, Cookie: 'crm_session=' + admin })).body.error.code, 'INVALID_CURSOR');
      await assert.rejects(send({ ...request(), actor: { ...request().actor, kind: 'service' } }), { code: 'FORBIDDEN' });
      await assert.rejects(identity.cursorSubject(tenant, observed.command, observed.receipt.admission_id), { code: 'FORBIDDEN' });
    });
    await check('Chat messaging field denial removes text reply attachment and rejects acquisition source fields', async () => {
      await changePolicy(['text', ['read']], async () => {
        for (const suffix of ['messages', 'message-envelopes', 'message-envelopes-v3']) for (const row of ok(await get(suffix)).data) {
          for (const key of ['text', 'reply_to', 'attachment']) assert.equal(Object.hasOwn(row, key), false);
        }
      });
      await changePolicy(['attribution', ['read']], async () => { const r = await get('acquisition-sessions'); assert.equal(r.status, 403); assert.equal(r.body.error.code, 'FIELD_FORBIDDEN'); });
    });
    await check('Chat messaging acquisition uint64 pages and original unknown intent lookup never dispatch', async () => {
      const first = ok(await get('acquisition-sessions?limit=1')); assert.equal(first.data[0].sequence, '9007199254741000'); assert.equal(first.next_before_sequence, '9007199254741000');
      const next = ok(await get('acquisition-sessions?limit=1&before_sequence=' + first.next_before_sequence)); assert.equal(next.data[0].sequence, '9007199254740999'); assert.equal(next.next_before_sequence, null);
      const before = (await chatOperator.execute('SELECT * FROM outbound_intent WHERE tenant_id=? AND id=?', [tenant, fixture.intent]))[0];
      for (let n = 0; n < 2; n++) assert.equal(ok(await get('outbound-intents/' + fixture.intent)).data.status, 'unknown');
      assert.deepEqual((await chatOperator.execute('SELECT * FROM outbound_intent WHERE tenant_id=? AND id=?', [tenant, fixture.intent]))[0], before);
      assert.equal((await get('outbound-intents/' + fixture.intent, headers, fixture.sibling)).status, 404);
    });
    await check('Chat messaging native outages lost ACK fresh retry ACL race and completed revoke release no stale data', async () => {
      unavailable = true; try { assert.equal((await get()).status, 503); } finally { unavailable = false; }
      lost = true; const rejected = await get(); assert.equal(rejected.status, 503); assert.equal(rejected.body.data, undefined); assert.equal(ok(await get()).data.length, 4);
      mode = 'race'; try { await assert.rejects(send(request()), { code: 'STALE_VERSION' }); } finally { mode = null; }
      assert.equal((await commands.proof(tenant, observed.command)).state, 'aborted');
      mode = 'revoke'; try { await assert.rejects(send(request()), e => ['FORBIDDEN', 'INVALID_TRANSITION', 'REVOKED'].includes(e.code)); }
      finally { mode = null; const barrier = randomUUID(); await identity.beginRoleChange(tenant, hash(adminSession), barrier, f.role, grants); await identity.drainRoleChange(tenant, barrier); }
      assert.equal((await commands.proof(tenant, observed.command)).state, 'aborted'); assert.equal((await identity.read(tenant, observed.command, observed.receipt.admission_id)).state, 'settled');
      const loggedIn = await login(f.account); const logoutHeaders = { ...headers, Cookie: 'crm_session=' + loggedIn }; ok(await get('messages', logoutHeaders));
      await drainingAuth.logout(loggedIn, 'http://localhost:18080', await auth.csrf(loggedIn)); assert.equal((await get('messages', logoutHeaders)).status, 401);
    });
    await check('Chat messaging owner credentials deny foreign SQL and read ledger excludes transcript', async () => {
      const denied = e => ['ER_TABLEACCESS_DENIED_ERROR', 'ER_DBACCESS_DENIED_ERROR'].includes(e.code);
      await assert.rejects(chatPool.query('SELECT id FROM native_identity_test.channel_connection LIMIT 1'), denied);
      await assert.rejects(channels.query('SELECT id FROM test_crm_chat_owner.message LIMIT 1'), denied);
      const [rows] = await chatOperator.execute("SELECT state,request_json,result_json FROM chat_owner_command WHERE tenant_id=? AND resource_id=? AND legacy_route LIKE 'history:%'", [tenant, fixture.conversation]);
      assert(rows.length); assert(rows.every(r => r.state !== 'prepared')); assert(!JSON.stringify(rows).includes(transcript));
    });
    await check('Chat messaging historical inactive channel and maximum100 item response retain public compatibility', async () => {
      const port = connectorServer.address().port;
      connectorServer.closeAllConnections(); await new Promise(resolve => connectorServer.close(resolve));
      try {
        const outage = await get('message-envelopes-v3'); assert.equal(outage.status, 503); assert.equal(outage.body.data, undefined);
        ok(await get('messages'));
      } finally { connectorServer.listen(port, '127.0.0.1'); await once(connectorServer, 'listening'); }
      const [[prior]] = await operator.execute('SELECT status,provider FROM channel_connection WHERE tenant_id=? AND id=?', [tenant, fixture.connection]);
      try {
        await operator.execute("UPDATE channel_connection SET status='disabled' WHERE tenant_id=? AND id=?", [tenant, fixture.connection]);
        ok(await get('message-envelopes-v3'));
      } finally { await operator.execute('UPDATE channel_connection SET status=? WHERE tenant_id=? AND id=?', [prior.status, tenant, fixture.connection]); }
      // Retain a separate synthetic page so replay tests above keep stable four-message fixtures.
      if (!fixture.largeConversation) {
        fixture.largeConversation = randomUUID(); fixture.largeIdentity = randomUUID(); fixture.largeMessages = Array.from({ length: 100 }, () => randomUUID()).sort();
        await writeFile(path, JSON.stringify(fixture), { mode: 0o600 });
      }
      await chatOperator.execute("INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,version,owner_revision,custom_values,created_at,updated_at) VALUES (?,?,?,?,1,1,'{}',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id", [fixture.largeConversation, tenant, f.object, f.principal]);
      await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at) VALUES (?,?,?,?,?,'open',UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE record_id=record_id", [tenant, fixture.largeConversation, fixture.contact, fixture.largeIdentity, fixture.connection]);
      await chatOperator.execute('INSERT INTO chat_control_head(tenant_id,conversation_id,registry_revision,control_revision,cancel_through,pause_through,version,created_at,updated_at) VALUES (?,?,1,1,0,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE conversation_id=conversation_id', [tenant, fixture.largeConversation]);
      for (const id of fixture.largeMessages) await chatOperator.execute("INSERT INTO message(id,tenant_id,conversation_id,connection_id,provider_message_id,direction,text,occurred_at,received_at,status) VALUES (?,?,?,?,?,'inbound',?,'2026-10-19 01:00:00','2026-10-19 01:00:00','received') ON DUPLICATE KEY UPDATE id=id", [id, tenant, fixture.largeConversation, fixture.connection, id, 'Synthetic'.padEnd(4000, 'x')]);
      for (const route of ['messages', 'message-envelopes', 'message-envelopes-v3']) {
        const response = ok(await get(route + '?limit=100', headers, fixture.largeConversation));
        assert.deepEqual(response.data.map(m => m.id), fixture.largeMessages); assert.equal(response.next_cursor, null); assert(Buffer.byteLength(JSON.stringify(response)) > 262144);
      }
    });
    await mkdir('artifacts/chat-extraction/t05', { recursive: true });
    await writeFile('artifacts/chat-extraction/t05/history-fixture.json', JSON.stringify({ tenant, source: fixture.database, chat: fixture.chatDatabase, tables: ['message', 'message_content', 'outbound_intent', 'conversation_acquisition_session'], fixture: path, schemas: { chat: 2, baseline: 'retained native Identity fixture' }, reset: false, scope: 'Five candidate public read routes; no ingress/send/workspace writer or main mounting' }, null, 2));
  } finally { await channels.end(); }
}
