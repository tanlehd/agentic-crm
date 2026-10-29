import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { once } from 'node:events';
import { createPool, rootSQL } from './chat-native.mjs';
import { NativeCrmOwnerMetadata, crmOwnerMetadataRoutes } from '../../services/core-baseline/dist/modules/crm/owner-metadata.js';
import { ChatCustomValues, chatCustomValuesRoutes } from '../../services/chat/dist/custom-values.js';
import {ChatGenericRecords,chatGenericRecordRoutes} from '../../services/chat/dist/generic-record.js';
import {chatRecordNative} from './chat-record-native.mjs';
import { createWorkloadServer, remoteRegistryAuthority, ownerClient, ownerCommandClient, ownerDigest, OwnerError } from '../../packages/workload-transport/dist/index.js';

/** Extends the retained native Identity harness; all business boundaries use actual configured HTTP/SQL owners. */
export async function chatCustomNative(ctx) {
  const { protocol = 'https:', check, operator, chatOperator, chatPool, commands, tenant, other, f, enrollment, env,
    crmMaterial, chatMaterial, registryConfig, chatAuthority, chatServer, identityClient, servers, identity, adminSessionHash, grants, reEnroll, retryCommand } = ctx;
  const path = '.local/chat-ownership/crm-metadata-fixture.json';
  let fixture;
  try { fixture = JSON.parse(await readFile(path, 'utf8')); }
  catch (e) {
    if (e.code !== 'ENOENT') throw e;
    fixture = { database: 'native_identity_test', tenant, object: f.object, runtime: randomBytes(32).toString('hex'),
      properties: Object.fromEntries(['owner_note', 'owner_amount', 'owner_integer', 'owner_flag', 'owner_date', 'owner_datetime', 'owner_enum', 'owner_text'].map(key => [key, randomUUID()])), policy: randomUUID() };
    await writeFile(path, JSON.stringify(fixture), { flag: 'wx', mode: 0o600 });
  }
  assert.equal(fixture.database, 'native_identity_test'); assert.equal(fixture.tenant, tenant); assert.equal(fixture.object, f.object); assert.match(fixture.runtime, /^[a-f0-9]{64}$/);
  const definitions = await readFile('docs/data/chat-extraction/owner-additions-v1.sql', 'utf8');
  const tables = ['crm_reference_gate', 'crm_reference_reservation'];
  const ddl = tables.map(table => {
    const sql = definitions.match(new RegExp('CREATE TABLE `crm_core`\\.`' + table + '` \\([\\s\\S]*?;(?=\\r?\\n|$)'))?.[0];
    assert(sql); return sql.replaceAll('`crm_core`.', '');
  });
  const fk = definitions.match(/ALTER TABLE `crm_core`\.`crm_reference_reservation` ADD CONSTRAINT[^;]+;/)?.[0].replaceAll('`crm_core`.', ''); assert(fk);
  const digest = createHash('sha256').update([...ddl, fk].join('\n')).digest('hex'), pinPath = '.local/chat-ownership/crm-metadata-schema.json';
  let pin; try { pin = JSON.parse(await readFile(pinPath, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (pin) assert.equal(pin.digest, digest);
  if (process.argv.includes('--provision')) {
    for (let i = 0; i < tables.length; i++) if (!(await operator.execute('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?', [env.MYSQL_DATABASE, tables[i]]))[0].length) await operator.query(ddl[i]);
    if (!(await operator.execute("SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=? AND CONSTRAINT_NAME='fk_crm_reference_reservation_1'", [env.MYSQL_DATABASE]))[0].length) await operator.query(fk);
    rootSQL(`CREATE USER IF NOT EXISTS 'crm_owner_test_runtime'@'%' IDENTIFIED BY '${fixture.runtime}';\n` +
      Object.entries({ object_type: 'SELECT', property_definition: 'SELECT', crm_reference_gate: 'SELECT,INSERT,UPDATE', crm_reference_reservation: 'SELECT,INSERT,UPDATE' }).map(([table, grants]) => `GRANT ${grants} ON native_identity_test.\`${table}\` TO 'crm_owner_test_runtime'@'%';`).join('\n'));
    if (!pin) await writeFile(pinPath, JSON.stringify({ database: env.MYSQL_DATABASE, digest, tables }), { flag: 'wx' });
  }
  assert.equal(JSON.parse(await readFile(pinPath, 'utf8')).digest, digest);
  const pool = createPool({ host: env.MYSQL_HOST, port: Number(env.MYSQL_PORT), database: env.MYSQL_DATABASE, user: 'crm_owner_test_runtime', password: fixture.runtime, timezone: 'Z', supportBigNumbers: true, bigNumberStrings: true });
  try {
    const c = await operator.getConnection();
    try {
      await c.beginTransaction();
      await c.execute('SELECT id FROM object_type WHERE tenant_id=? AND id=? FOR UPDATE', [tenant, f.object]);
      const types = ['string', 'decimal', 'integer', 'boolean', 'date', 'datetime', 'enum', 'text']; let added = false;
      for (const [i, [key, id]] of Object.entries(fixture.properties).entries()) if (!(await c.execute('SELECT id FROM property_definition WHERE tenant_id=? AND id=?', [tenant, id]))[0].length) {
        await c.execute('INSERT INTO property_definition(id,tenant_id,object_type_id,`key`,label,type,required,default_value,options,indexed,`sensitive`,created_at,updated_at) VALUES (?,?,?,?,?,?,0,NULL,?,?,0,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))', [id, tenant, f.object, key, 'Synthetic ' + key, types[i], types[i] === 'enum' ? '["alpha","beta"]' : null, types[i] === 'text' ? 0 : 1]); added = true;
      }
      if (added) await c.execute('UPDATE object_type SET schema_version=schema_version+1,version=version+1 WHERE tenant_id=? AND id=?', [tenant, f.object]);
      if (!(await c.execute('SELECT id FROM field_policy WHERE tenant_id=? AND id=?', [tenant, fixture.policy]))[0].length) await c.execute("INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,'owner_note','[]',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [fixture.policy, tenant, f.role, f.object]);
      await c.commit();
    } catch (e) { await c.rollback(); throw e; } finally { c.release(); }
    const crmAuthority = remoteRegistryAuthority(crmMaterial, registryConfig);
    const proofClient = ownerClient(crmMaterial, crmAuthority, 'chat', new URL(protocol + '//127.0.0.1:' + chatServer.address().port + '/'));
    let unavailable = false;
    const proof = (t, command, abort) => { if (unavailable) throw new OwnerError('DEPENDENCY_UNAVAILABLE'); return proofClient(t, abort ? 'command-abort' : 'command-proof', command); };
    const metadata = new NativeCrmOwnerMetadata(pool, proof);
    const server = createWorkloadServer(crmMaterial, crmAuthority, crmOwnerMetadataRoutes(metadata)); servers.push(server);
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const client = ownerClient(chatMaterial, chatAuthority, 'crm', new URL(protocol + '//127.0.0.1:' + server.address().port + '/'));
    const schema = await client(tenant, 'metadata-schema-read', { object_key: 'conversation', schema_revision: null });
    const reference = (command, snapshot) => ({ command, resource_id: snapshot.object_type_id, kind: 'metadata', expected_revision: snapshot.schema_revision, reservation_id: null });
    const peers = {
      metadata: (t, revision) => client(t, 'metadata-schema-read', { object_key: 'conversation', schema_revision: revision }),
      reserve: (t, command, snapshot) => client(t, 'reference-reserve', reference(command, snapshot)),
      release: (t, command, snapshot) => client(t, 'reference-release', reference(command, snapshot)),
      admit: (t, command) => identityClient(t, 'admit', { owner: 'chat', command }),
      settle: (t, command, admission_id) => identityClient(t, 'settle', { owner: 'chat', command, admission_id }),
    };
    const candidate = new ChatCustomValues(commands, peers);
    const records=new ChatGenericRecords(commands,peers);
    const patchServer = createWorkloadServer(chatMaterial, chatAuthority, {...chatCustomValuesRoutes(candidate),...chatGenericRecordRoutes(records)}); servers.push(patchServer);
    patchServer.listen(0, '127.0.0.1'); await once(patchServer, 'listening');
    const transport = ownerCommandClient(crmMaterial, crmAuthority, 'chat', new URL(protocol + '//127.0.0.1:' + patchServer.address().port + '/'));
    const send = request => retryCommand(transport, request);
    for (const dataset of ['conversion', 'stage', 'progress', 'routing', 'registry']) await chatOperator.execute('INSERT INTO chat_dataset_head(tenant_id,dataset,revision,version,created_at,updated_at) VALUES (?,?,1,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE tenant_id=tenant_id', [tenant, dataset]);
    const rejects = (work, code) => assert.rejects(work, e => e.code === code);
    const ref = prepared => ({ command_id: prepared.binding.command_id, binding_digest: prepared.binding_digest });
    async function input(patch = { owner_note: 'Synthetic metadata test' }) {
      const id = randomUUID();
      await chatOperator.execute("INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,version,owner_revision,custom_values,created_at,updated_at) VALUES (?,?,?,?,7,3,'{}',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [id, tenant, f.object, f.principal]);
      await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at,closed_at) VALUES (?,?,?,?,?,'closed',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [tenant, id, randomUUID(), randomUUID(), randomUUID()]);
      await chatOperator.execute('INSERT INTO chat_control_head(tenant_id,conversation_id,registry_revision,control_revision,cancel_through,pause_through,version,created_at,updated_at) VALUES (?,?,1,1,0,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))', [tenant, id]);
      return { schema_version: 1, request_id: randomUUID(), correlation_id: randomUUID(), tenant_id: tenant, operation: 'custom-values-patch', command_id: randomUUID(), actor: { kind: 'human', principal_id: f.principal, delegation_id: enrollment.delegationId }, payload: { conversation_id: id, expected_version: '7', schema_revision: schema.schema_revision, input: { custom_values: patch } } };
    }
    async function row(id) { return (await chatOperator.execute('SELECT version,owner_revision,custom_values FROM crm_record WHERE tenant_id=? AND id=?', [tenant, id]))[0][0]; }

    await check('Chat custom native metadata snapshot, tenant and least-privilege boundaries', async () => {
      const { snapshot_digest, ...body } = schema; assert.equal(snapshot_digest, ownerDigest(body)); assert.equal(schema.object_type_id, f.object);
      assert.equal(schema.properties.filter(p => Object.hasOwn(fixture.properties, p.key)).length, 8);
      assert.equal(Object.hasOwn(schema.properties[0], 'writable'), false);
      await rejects(() => client(tenant, 'metadata-schema-read', { object_key: 'conversation', schema_revision: '999999' }), 'STALE_VERSION');
      const foreign = await client(other, 'metadata-schema-read', { object_key: 'conversation', schema_revision: null }); assert.notEqual(foreign.object_type_id, f.object);
      assert.equal(foreign.properties.some(p => Object.hasOwn(fixture.properties, p.key)), false);
      for (const sql of ['SELECT * FROM principal LIMIT 1', 'SELECT * FROM crm_record LIMIT 1', 'SELECT * FROM test_crm_chat_owner.crm_record LIMIT 1', 'UPDATE object_type SET version=version']) await assert.rejects(pool.query(sql));
      await assert.rejects(chatPool.query('SELECT * FROM native_identity_test.property_definition LIMIT 1'));
    });
    await check('Chat custom composes native CRM and Identity transport with exact typed indexes and one-time replay', async () => {
      const request = await input({ owner_note: 'Synthetic', owner_amount: '99999999999999.123456', owner_integer: 9007199254740991, owner_flag: false, owner_date: '2024-02-29', owner_datetime: '2026-10-19T03:04:05Z', owner_enum: 'beta', owner_text: 'Synthetic text' });
      const prepared = await candidate.prepare(request), command = ref(prepared);
      const reservations = await Promise.all([peers.reserve(tenant, command, schema), peers.reserve(tenant, command, schema)]); assert.equal(reservations[0].reservation_id, reservations[1].reservation_id);
      await rejects(() => client(other, 'reference-status', reference(command, schema)), 'NOT_FOUND');
      const result = await candidate.execute(tenant, command); assert.equal(result.effect_revision, '8');
      const after = await row(request.payload.conversation_id); assert.equal(String(after.owner_revision), '3');
      const [indexes] = await chatOperator.execute('SELECT * FROM property_index_value WHERE tenant_id=? AND record_id=?', [tenant, request.payload.conversation_id]); assert.equal(indexes.length, 7);
      assert.equal(indexes.find(p => p.property_id === fixture.properties.owner_amount).decimal_value, '99999999999999.123456');
      assert.equal(String(indexes.find(p => p.property_id === fixture.properties.owner_integer).integer_value), '9007199254740991');
      const [heads] = await chatOperator.execute('SELECT dataset,revision FROM chat_dataset_head WHERE tenant_id=? ORDER BY dataset', [tenant]);
      const restarted = new ChatCustomValues(commands, peers); await restarted.prepare(request); await restarted.execute(tenant, command);
      assert.deepEqual(await row(request.payload.conversation_id), after); assert.deepEqual((await chatOperator.execute('SELECT dataset,revision FROM chat_dataset_head WHERE tenant_id=? ORDER BY dataset', [tenant]))[0], heads);
      assert.equal((await peers.release(tenant, command, schema)).state, 'released');
      await rejects(() => candidate.prepare({ ...request, payload: { ...request.payload, input: { custom_values: { owner_note: 'Changed request' } } } }), 'CONFLICT');
      const nullRequest = { ...request, command_id: randomUUID(), payload: { ...request.payload, expected_version: '8', input: { custom_values: { owner_note: null } } } };
      await candidate.execute(tenant, ref(await candidate.prepare(nullRequest)));
      assert.equal((await chatOperator.execute('SELECT property_id FROM property_index_value WHERE tenant_id=? AND record_id=? AND property_id=?', [tenant, request.payload.conversation_id, fixture.properties.owner_note]))[0].length, 0);
    });
    await check('Chat custom rejects invalid scalars, current field deny and stale resource without writes', async () => {
      for (const patch of [{ owner_date: '2025-02-29' }, { owner_integer: 9007199254740992 }, { owner_amount: 1.5 }, { owner_enum: 'missing' }, { unknown_field: 'x' }]) await rejects(() => input(patch).then(r => candidate.prepare(r)), 'INVALID_REQUEST');
      const request = await input(), prepared = await candidate.prepare(request);
      await operator.execute('UPDATE field_policy SET denied_actions=? WHERE tenant_id=? AND id=?', ['["write"]', tenant, fixture.policy]);
      try { await rejects(() => candidate.execute(tenant, ref(prepared)), 'FORBIDDEN'); }
      finally { await operator.execute('UPDATE field_policy SET denied_actions=? WHERE tenant_id=? AND id=?', ['[]', tenant, fixture.policy]); }
      assert.equal(String((await row(request.payload.conversation_id)).version), '7'); assert.equal((await commands.proof(tenant, ref(prepared))).state, 'aborted');
      const stale = await input(), preparedStale = await candidate.prepare(stale);
      await chatOperator.execute('UPDATE crm_record SET version=version+1 WHERE tenant_id=? AND id=?', [tenant, stale.payload.conversation_id]);
      await rejects(() => candidate.execute(tenant, ref(preparedStale)), 'STALE_VERSION');
      assert.equal((await peers.release(tenant, ref(preparedStale), schema)).state, 'released');
    });
    await check('Chat custom schema publication pins held metadata and rejects an unreserved old snapshot', async () => {
      const held = await input(), heldProof = await candidate.prepare(held); const receipt = await peers.reserve(tenant, ref(heldProof), schema); assert.equal(receipt.state, 'reserved');
      const stale = await input(), staleProof = await candidate.prepare(stale);
      await operator.execute('UPDATE object_type SET schema_version=schema_version+1,version=version+1 WHERE tenant_id=? AND id=?', [tenant, f.object]);
      // An additive schema publication cannot change the snapshot already reserved by a command.
      assert.equal((await candidate.execute(tenant, ref(heldProof))).state, 'committed');
      await rejects(() => candidate.execute(tenant, ref(staleProof)), 'STALE_VERSION');
      const current = await client(tenant, 'metadata-schema-read', { object_key: 'conversation', schema_revision: null }); Object.assign(schema, current);
    });
    await check('Chat custom native role revoke after admission aborts the write before completing revocation', async () => {
      const request = await input(), prepared = await candidate.prepare(request);
      const racing = new ChatCustomValues(commands, { ...peers, admit: async (t, command) => {
        const receipt = await peers.admit(t, command), barrier = randomUUID();
        await identity.beginRoleChange(t, adminSessionHash, barrier, f.role, grants.filter(g => g.action === 'read'));
        assert.equal((await identity.drainRoleChange(t, barrier)).state, 'completed'); return receipt;
      } });
      try { await rejects(() => racing.execute(tenant, ref(prepared)), 'INVALID_TRANSITION'); }
      finally {
        const restore = randomUUID(); await identity.beginRoleChange(tenant, adminSessionHash, restore, f.role, grants);
        await identity.drainRoleChange(tenant, restore); Object.assign(enrollment, await reEnroll());
      }
      assert.equal(String((await row(request.payload.conversation_id)).version), '7');
      assert.equal((await commands.proof(tenant, ref(prepared))).state, 'aborted');
    });
    await check('Chat custom private HTTP concurrent patch and replay reauthorize immutable values without old field grants', async () => {
      const request = await input({ owner_note: 'Synthetic private result', owner_amount: '1.123456' });
      const [first, second] = await Promise.all([send(request), send({ ...request, request_id: randomUUID() })]);
      assert.deepEqual(first.data, second.data); assert.equal(first.data.version, '8');
      assert.equal(first.data.custom_values.owner_note, 'Synthetic private result'); assert.deepEqual(first.data.fields, {});
      await operator.execute('UPDATE field_policy SET denied_actions=? WHERE tenant_id=? AND id=?', ['["read"]', tenant, fixture.policy]);
      try { await rejects(() => send(request), 'FORBIDDEN'); }
      finally { await operator.execute('UPDATE field_policy SET denied_actions=? WHERE tenant_id=? AND id=?', ['[]', tenant, fixture.policy]); }
      const next = { ...request, command_id: randomUUID(), payload: { ...request.payload, expected_version: '8', input: { custom_values: { owner_note: 'Later value' } } } };
      assert.equal((await send(next)).data.version, '9');
      assert.deepEqual((await send(request)).data, first.data);
      await rejects(() => send({ ...request, actor: { ...request.actor, delegation_id: randomUUID() } }), 'FORBIDDEN');
      assert.equal(String((await row(request.payload.conversation_id)).version), '9');
    });
    await check('Chat custom retirement drains native command race, preserves outage and denies late reservation', async () => {
      const request = await input(), prepared = await candidate.prepare(request); await peers.reserve(tenant, ref(prepared), schema);
      const barrier = randomUUID(); unavailable = true;
      try { await rejects(() => metadata.close(tenant, f.object, barrier), 'DEPENDENCY_UNAVAILABLE'); }
      finally { unavailable = false; }
      try {
        assert.equal((await metadata.close(tenant, f.object, barrier)).state, 'drained');
        assert.equal((await commands.proof(tenant, ref(prepared))).state, 'aborted');
        await rejects(() => peers.reserve(tenant, ref(prepared), schema), 'INVALID_TRANSITION');
        assert.equal(String((await row(request.payload.conversation_id)).version), '7');
      } finally { await metadata.cancelClose(tenant, f.object, barrier); }
      const committed = await input(), p = await candidate.prepare(committed); await candidate.execute(tenant, ref(p));
      const barrier2 = randomUUID(); try { assert.equal((await metadata.close(tenant, f.object, barrier2)).state, 'drained'); } finally { await metadata.cancelClose(tenant, f.object, barrier2); }
      assert.equal((await commands.proof(tenant, ref(p))).state, 'committed');
    });
    await check('Chat custom typed index failure rolls back JSON/version/audit and lost settlement recovers', async () => {
      const request = await input(), prepared = await candidate.prepare(request);
      // Use a separate retained credential with SELECT but no index INSERT; never revoke the shared runtime role.
      const user = 'chat_custom_rollback_test';
      rootSQL(`CREATE USER IF NOT EXISTS '${user}'@'%' IDENTIFIED BY '${fixture.runtime}';\n` +
        ['crm_record', 'conversation', 'chat_control_head', 'record_team_access', 'chat_writer_gate', 'chat_owner_command', 'chat_owner_dependency', 'property_index_value', 'audit_entry', 'chat_dataset_head'].map(table => `GRANT ${table === 'property_index_value' ? 'SELECT,DELETE' : 'SELECT,INSERT,UPDATE'} ON test_crm_chat_owner.\`${table}\` TO '${user}'@'%';`).join('\n'));
      const rollbackPool = createPool({ host: '127.0.0.1', port: 13306, database: 'test_crm_chat_owner', user, password: fixture.runtime, supportBigNumbers: true, bigNumberStrings: true });
      try {
        const rollbackCommands = new commands.constructor(rollbackPool, '1');
        await assert.rejects(new ChatCustomValues(rollbackCommands, peers).execute(tenant, ref(prepared)), e => e.code === 'ER_TABLEACCESS_DENIED_ERROR');
      } finally { await rollbackPool.end(); }
      assert.equal(String((await row(request.payload.conversation_id)).version), '7');
      assert.equal((await chatOperator.execute("SELECT id FROM audit_entry WHERE tenant_id=? AND correlation_id=? AND action='records.patch'", [tenant, request.command_id]))[0].length, 0);
      const lost = await input(), lostProof = await candidate.prepare(lost); let drop = true;
      const lossy = new ChatCustomValues(commands, { ...peers, release: async (...args) => { const receipt = await peers.release(...args); if (drop) { drop = false; throw new OwnerError('DEPENDENCY_UNAVAILABLE'); } return receipt; } });
      await rejects(() => lossy.execute(tenant, ref(lostProof)), 'DEPENDENCY_UNAVAILABLE');
      assert.equal((await commands.proof(tenant, ref(lostProof))).state, 'committed');
      await candidate.execute(tenant, ref(lostProof)); assert.equal(String((await row(lost.payload.conversation_id)).version), '8');
      const [held] = await operator.execute("SELECT id FROM crm_reference_reservation WHERE tenant_id=? AND resource_id=? AND state='held'", [tenant, f.object]); assert.equal(held.length, 0);
    });
    if(process.argv.includes('--with-records'))await chatRecordNative({...ctx,crmServer:server,input,row,send,peers,records,fixture,schema,client});
  } finally { await pool.end(); }
}
