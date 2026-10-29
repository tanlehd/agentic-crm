import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { once } from 'node:events';
import { createPool, rootSQL } from './chat-native.mjs';
import {chatChannelStatusNative} from './chat-channel-status-native.mjs';
import { NativeCrmContactReferences, crmContactOwnerRoutes } from '../../services/core-baseline/dist/modules/crm/owner-contact.js';
import { NativeChannelReferences, channelReferenceOwnerRoutes } from '../../services/core-baseline/dist/modules/channels/owner-reference.js';
import { NativeChannelTouchpoints, channelTouchpointRoutes } from '../../services/core-baseline/dist/modules/channels/owner-touchpoint.js';
import { NativeCrmOwnerMetadata, crmOwnerMetadataRoutes } from '../../services/core-baseline/dist/modules/crm/owner-metadata.js';
import { createWorkloadServer, remoteRegistryAuthority, ownerClient, ownerDigest, OwnerError,workloadReadiness } from '../../packages/workload-transport/dist/index.js';

export async function chatReferenceNative(ctx) {
  const { check, operator, chatPool, commands, tenant, other, f, env, crmMaterial, connectorMaterial, chatMaterial, chatAuthority, registryConfig, chatServer, protocol, servers } = ctx;
  const path = '.local/chat-ownership/reference-fixture.json'; let fixture;
  try { fixture = JSON.parse(await readFile(path, 'utf8')); }
  catch (e) {
    if (e.code !== 'ENOENT') throw e;
    fixture = { database: 'native_identity_test', tenant, ...Object.fromEntries(['team', 'connection', 'contact', 'identity', 'contactObject'].map(k => [k, randomUUID()])),
      crmPassword: randomBytes(32).toString('hex'), channelPassword: randomBytes(32).toString('hex') };
    await writeFile(path, JSON.stringify(fixture), { flag: 'wx', mode: 0o600 });
  }
  assert.equal(fixture.database, 'native_identity_test'); assert.equal(fixture.tenant, tenant);
  for (const key of ['crmPassword', 'channelPassword']) assert.match(fixture[key], /^[a-f0-9]{64}$/);
  const definitions = await readFile('docs/data/chat-extraction/owner-additions-v1.sql', 'utf8');
  const tables = ['connector_reference_gate', 'connector_reference_reservation'];
  const ddl = tables.map(table => { const sql = definitions.match(new RegExp('CREATE TABLE `crm_connector`\\.`' + table + '` \\([\\s\\S]*?;(?=\\r?\\n|$)'))?.[0]; assert(sql); return sql.replaceAll('`crm_connector`.', ''); });
  const fk = definitions.match(/ALTER TABLE `crm_connector`\.`connector_reference_reservation` ADD CONSTRAINT[^;]+;/)?.[0].replaceAll('`crm_connector`.', ''); assert(fk);
  const digest = createHash('sha256').update([...ddl, fk].join('\n')).digest('hex'), pinPath = '.local/chat-ownership/reference-schema.json';
  let pin; try { pin = JSON.parse(await readFile(pinPath, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (pin) assert.equal(pin.digest, digest);
  if (process.argv.includes('--provision')) {
    for (let i = 0; i < tables.length; i++) if (!(await operator.execute('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?', [fixture.database, tables[i]]))[0].length) await operator.query(ddl[i]);
    if (!(await operator.execute("SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=? AND CONSTRAINT_NAME='fk_connector_reference_reservation_1'", [fixture.database]))[0].length) await operator.query(fk);
    for (const [owner, password, grants] of [
      ['crm', fixture.crmPassword, { contact_identity: 'SELECT', contact: 'SELECT', crm_record: 'SELECT', object_type: 'SELECT', property_definition: 'SELECT', crm_reference_gate: 'SELECT,INSERT,UPDATE', crm_reference_reservation: 'SELECT,INSERT,UPDATE' }],
      ['channel', fixture.channelPassword, { channel_connection: 'SELECT', connector_reference_gate: 'SELECT,INSERT,UPDATE', connector_reference_reservation: 'SELECT,INSERT,UPDATE' }],
    ]) rootSQL(`CREATE USER IF NOT EXISTS 't05_${owner}_reference_test'@'%' IDENTIFIED BY '${password}';\n` + Object.entries(grants).map(([table, privileges]) => `GRANT ${privileges} ON native_identity_test.\`${table}\` TO 't05_${owner}_reference_test'@'%';`).join('\n'));
    if (!pin) await writeFile(pinPath, JSON.stringify({ database: fixture.database, digest, tables }), { flag: 'wx' });
  }
  assert.equal(JSON.parse(await readFile(pinPath, 'utf8')).digest, digest);
  if (process.argv.includes('--with-referral')) {
    const source = (await readFile('services/crm-connector/migrations/channels001-touchpoint.sql', 'utf8')).replaceAll('\r\n', '\n');
    const sourceHash = createHash('sha256').update(source).digest('hex');
    assert.equal(sourceHash, (await readFile('services/crm-connector/migrations/channels001-touchpoint.sha256', 'utf8')).trim());
    const shapePath = '.local/chat-ownership/touchpoint-schema.json'; let prior;
    try { prior = JSON.parse(await readFile(shapePath, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (prior) assert.equal(prior.sourceHash, sourceHash, 'Immutable Channels migration changed');
    if (process.argv.includes('--provision')) {
      if (!(await operator.execute("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME='channel_ingress_touchpoint'", [fixture.database]))[0].length) await operator.query(source);
      rootSQL("GRANT SELECT,INSERT,UPDATE ON native_identity_test.channel_ingress_touchpoint TO 't05_channel_reference_test'@'%';");
    }
    const [[shape]] = await operator.query('SHOW CREATE TABLE channel_ingress_touchpoint');
    const shapeHash = createHash('sha256').update(shape['Create Table']).digest('hex');
    if (prior) assert.equal(prior.shapeHash, shapeHash, 'Channels schema drift');
    else { assert(process.argv.includes('--provision')); await writeFile(shapePath, JSON.stringify({ sourceHash, shapeHash, database: fixture.database }), { flag: 'wx' }); }
  }
  const pools = Object.fromEntries(['crm', 'channel'].map(owner => [owner, createPool({ host: env.MYSQL_HOST, port: Number(env.MYSQL_PORT), database: fixture.database, user: 't05_' + owner + '_reference_test', password: fixture[owner + 'Password'], timezone: 'Z', supportBigNumbers: true, bigNumberStrings: true })]));
  try {
    await operator.execute("INSERT INTO team(id,tenant_id,name,purpose,created_at,updated_at) VALUES (?,?,'Synthetic references','chat',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id", [fixture.team, tenant]);
    await operator.execute("INSERT INTO channel_connection(id,tenant_id,provider,external_account_id,status,team_id) VALUES (?,?,'mock_messenger',?,'active',?) ON DUPLICATE KEY UPDATE id=id", [fixture.connection, tenant, fixture.connection, fixture.team]);
    const [[existingType]] = await operator.execute("SELECT id FROM object_type WHERE tenant_id=? AND `key`='contact'", [tenant]);
    if (!existingType) await operator.execute("INSERT INTO object_type(id,tenant_id,`key`,label,kind,created_at,updated_at) VALUES (?,?,'contact','Synthetic Contact','standard',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [fixture.contactObject, tenant]);
    const contactObject = existingType?.id ?? fixture.contactObject;
    await operator.execute("INSERT INTO crm_record(id,tenant_id,object_type_id,team_id,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id", [fixture.contact, tenant, contactObject, fixture.team]);
    await operator.execute("INSERT INTO contact(tenant_id,record_id,display_name) VALUES (?,?,'Synthetic reference') ON DUPLICATE KEY UPDATE record_id=record_id", [tenant, fixture.contact]);
    const subject = 'synthetic-reference-' + fixture.identity;
    await operator.execute('INSERT INTO contact_identity(id,tenant_id,connection_id,contact_id,external_subject_id) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id', [fixture.identity, tenant, fixture.connection, fixture.contact, subject]);
    let unavailable = false;
    const proofClients = {}, clients = {}, owners = {}, urls = {};
    for (const [owner, material, pool] of [['crm', crmMaterial, pools.crm], ['connector', connectorMaterial, pools.channel]]) {
      const authority = remoteRegistryAuthority(material, registryConfig);
      proofClients[owner] = ownerClient(material, authority, 'chat', new URL(protocol + '//127.0.0.1:' + chatServer.address().port + '/'));
      const proof = (t, ref, abort) => { if (unavailable) throw new OwnerError('DEPENDENCY_UNAVAILABLE'); return proofClients[owner](t, abort ? 'command-abort' : 'command-proof', ref); };
      owners[owner] = owner === 'crm' ? new NativeCrmContactReferences(pool, proof) : new NativeChannelReferences(pool, proof);
      const routes = owner === 'crm' ? crmContactOwnerRoutes(owners[owner]) : channelReferenceOwnerRoutes(owners[owner]);
      routes['/internal/v1/workloads/ready']=workloadReadiness(owner,()=>pool.query('SELECT 1'));
      if (owner === 'connector' && process.argv.includes('--with-referral')) {
        const client = ownerClient(material, authority, 'identity', new URL('/', registryConfig.url));
        clients.connectorIdentity = client;
        const touchpoints = new NativeChannelTouchpoints(pool, proof, (t, command, admission_id) => client(t, 'admission-read', { owner: 'chat', command, admission_id }));
        Object.assign(routes, channelTouchpointRoutes(touchpoints));
      }
      if (owner === 'crm' && process.argv.includes('--with-processor')) {
        const metadata = new NativeCrmOwnerMetadata(pool, proof), metadataRoutes = crmOwnerMetadataRoutes(metadata);
        for (const [path, route] of Object.entries(metadataRoutes)) {
          const previous = routes[path];
          routes[path] = previous ? { ...previous, handle: (value, peer, signal) => value.payload.kind === 'metadata' ? route.handle(value, peer, signal) : previous.handle(value, peer, signal) } : route;
        }
      }
      const server = createWorkloadServer(material, authority, routes); servers.push(server); server.listen(0, '127.0.0.1'); await once(server, 'listening');
      urls[owner]=new URL(protocol + '//127.0.0.1:' + server.address().port + '/');clients[owner] = ownerClient(chatMaterial, chatAuthority, owner, urls[owner]);
    }
    const contactInput = { connection_id: fixture.connection, crm_contact_id: fixture.contact, crm_identity_id: fixture.identity, external_subject_id: subject };
    const binding = await clients.crm(tenant, 'contact-binding-read', contactInput);
    const connection = await clients.connector(tenant, 'connection-binding-read', { connection_id: fixture.connection });
    const references = { ...binding, platform: connection.platform, connection_revision: connection.connection_revision };
    const refOf = p => ({ command_id: p.binding.command_id, binding_digest: p.binding_digest });
    async function prepare(overrides = {}) {
      const command = randomUUID(), request = { synthetic: command };
      const binding = { tenant_id: tenant, command_id: command, owner: 'chat', operation: 'ingress-process',
        actor: { kind: 'service', principal_id: f.routingService, delegation_id: randomUUID() }, resource: { resource_id: randomUUID(), object_key: 'conversation', record_version: '0', owner_revision: '0', control_revision: '0', owner_principal_id: null, team_id: null, shared_team_ids: [], archived: false },
        target: null, session_id: null, fields: [], payload_digest: ownerDigest(request), legacy_receipt_key: 'reference-native/' + command, graph: null, dependencies: [], references, ...overrides };
      if (binding.references === undefined) delete binding.references;
      return refOf(await commands.prepare(binding, request));
    }
    const input = (command, kind) => ({ command, kind, resource_id: kind === 'connection' ? fixture.connection : kind === 'contact' ? fixture.contact : fixture.identity,
      expected_revision: kind === 'contact' ? references.contact_revision : '1', reservation_id: null });
    const clientFor = kind => clients[kind === 'connection' ? 'connector' : 'crm'];
    const rejects = (work, code) => assert.rejects(work, error => error.code === code);
    const allKinds = ['contact', 'mapping', 'connection'];
    await check('Chat references canonical live reads and separate least-privilege owners', async () => {
      assert.equal(binding.external_subject_digest, ownerDigest(subject)); assert.equal(connection.channel_id, fixture.connection);
      assert.equal(JSON.stringify(binding).includes(subject), false);
      for (const change of [{ crm_contact_id: randomUUID() }, { crm_identity_id: randomUUID() }, { connection_id: randomUUID() }, { external_subject_id: subject + 'x' }]) await rejects(() => clients.crm(tenant, 'contact-binding-read', { ...contactInput, ...change }), 'REFERENCE_INVALID');
      await rejects(() => clients.crm(other, 'contact-binding-read', contactInput), 'REFERENCE_INVALID');
      await rejects(() => clients.connector(other, 'connection-binding-read', { connection_id: fixture.connection }), 'REFERENCE_INVALID');
      for (const sql of ['SELECT * FROM channel_connection LIMIT 1', 'SELECT * FROM principal LIMIT 1', 'SELECT * FROM test_crm_chat_owner.chat_owner_command LIMIT 1', 'UPDATE contact SET display_name=display_name']) await assert.rejects(pools.crm.query(sql));
      await assert.rejects(pools.channel.query('SELECT * FROM contact_identity LIMIT 1'));
      await assert.rejects(chatPool.query('SELECT * FROM native_identity_test.contact_identity LIMIT 1'));
    });
    await check('Chat references concurrent reserve lost ACK replay terminal release and no rearm', async () => {
      const command = await prepare();
      for (const kind of allKinds) {
        const request = input(command, kind), client = clientFor(kind);
        const [first, replay] = await Promise.all([client(tenant, 'reference-reserve', request), client(tenant, 'reference-reserve', request)]);
        assert.deepEqual(first, replay);
        // The caller discards the first ACK; a new client call recovers the exact durable reservation.
        assert.deepEqual(await client(tenant, 'reference-reserve', request), first);
        await rejects(() => client(tenant, 'reference-release', request), 'DEPENDENCY_UNAVAILABLE');
        await rejects(() => client(other, 'reference-status', request), 'NOT_FOUND');
        for (const change of [{ expected_revision: '99' }, { reservation_id: randomUUID() }, { command: { ...command, binding_digest: '0'.repeat(64) } }]) await rejects(() => client(tenant, 'reference-status', { ...request, ...change }), 'CONFLICT');
      }
      await commands.abort(tenant, command);
      for (const kind of allKinds) {
        const request = input(command, kind), client = clientFor(kind), released = await client(tenant, 'reference-release', request);
        assert.equal(released.state, 'released'); assert.deepEqual(await client(tenant, 'reference-reserve', request), released);
      }
    });
    await check('Chat references exact proof subject resource revision and recovery allowlist', async () => {
      const wrongSubject = await prepare({ references: { ...references, external_subject_digest: '0'.repeat(64) } });
      await rejects(() => clients.crm(tenant, 'reference-reserve', input(wrongSubject, 'mapping')), 'REFERENCE_INVALID'); await commands.abort(tenant, wrongSubject);
      const stale = await prepare({ references: { ...references, contact_revision: '999999' } });
      await rejects(() => clients.crm(tenant, 'reference-reserve', { ...input(stale, 'contact'), expected_revision: '999999' }), 'STALE_VERSION'); await commands.abort(tenant, stale);
      const command = await prepare();
      for (const kind of allKinds) await rejects(() => clientFor(kind)(tenant, 'reference-reserve', { ...input(command, kind), resource_id: randomUUID() }), 'FORBIDDEN');
      await commands.abort(tenant, command);
      for (const overrides of [{ operation: 'custom-values-patch' }, { references: undefined }, { actor: { kind: 'human', principal_id: f.principal, delegation_id: randomUUID() } }]) {
        const invalid = await prepare(overrides);
        for (const owner of ['crm', 'connector']) await rejects(() => proofClients[owner](tenant, 'command-proof', invalid), 'FORBIDDEN');
        await commands.abort(tenant, invalid);
      }
    });
    await check('Chat references archived Contact and disabled connection deny new holds', async () => {
      const command = await prepare();
      const [[old]] = await operator.execute('SELECT archived_at,version FROM crm_record WHERE tenant_id=? AND id=?', [tenant, fixture.contact]);
      try {
        await operator.execute('UPDATE crm_record SET archived_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?', [tenant, fixture.contact]);
        await rejects(() => clients.crm(tenant, 'contact-binding-read', contactInput), 'REFERENCE_INVALID');
        for (const kind of ['contact', 'mapping']) await rejects(() => clients.crm(tenant, 'reference-reserve', input(command, kind)), 'REFERENCE_INVALID');
      } finally { await operator.execute('UPDATE crm_record SET archived_at=? WHERE tenant_id=? AND id=?', [old.archived_at, tenant, fixture.contact]); }
      const [[channel]] = await operator.execute('SELECT status FROM channel_connection WHERE tenant_id=? AND id=?', [tenant, fixture.connection]);
      try {
        await operator.execute("UPDATE channel_connection SET status='disabled' WHERE tenant_id=? AND id=?", [tenant, fixture.connection]);
        await rejects(() => clients.connector(tenant, 'connection-binding-read', { connection_id: fixture.connection }), 'REFERENCE_INVALID');
        await rejects(() => clients.connector(tenant, 'reference-reserve', input(command, 'connection')), 'REFERENCE_INVALID');
      } finally { await operator.execute('UPDATE channel_connection SET status=? WHERE tenant_id=? AND id=?', [channel.status, tenant, fixture.connection]); }
      await commands.abort(tenant, command);
    });
    await check('Chat references closing barriers survive owner outage drain actual Chat abort and deny late admission', async () => {
      for (const kind of allKinds) {
        const owner = kind === 'connection' ? 'connector' : 'crm', ledger = owners[owner].ledger, command = await prepare(), request = input(command, kind), barrier = randomUUID();
        await clients[owner](tenant, 'reference-reserve', request);
        try {
          unavailable = true;
          await rejects(() => ledger.close(tenant, kind, request.resource_id, request.expected_revision, barrier), 'DEPENDENCY_UNAVAILABLE');
          assert.equal((await clients[owner](tenant, 'reference-status', request)).state, 'reserved');
          unavailable = false;
          const late = await prepare();
          await rejects(() => clients[owner](tenant, 'reference-reserve', input(late, kind)), 'INVALID_TRANSITION'); await commands.abort(tenant, late);
          if (kind === 'contact') {
            const mapping = await prepare(); await rejects(() => clients.crm(tenant, 'reference-reserve', input(mapping, 'mapping')), 'INVALID_TRANSITION'); await commands.abort(tenant, mapping);
          }
          await rejects(() => ledger.cancelClose(tenant, kind, request.resource_id, randomUUID()), 'CONFLICT');
          assert.equal((await ledger.close(tenant, kind, request.resource_id, request.expected_revision, barrier)).state, 'drained');
          assert.equal((await commands.proof(tenant, command)).state, 'aborted');
          assert.equal((await clients[owner](tenant, 'reference-status', request)).state, 'released');
        } finally { unavailable = false; await ledger.cancelClose(tenant, kind, request.resource_id, barrier); }
        await rejects(() => ledger.close(tenant, kind, request.resource_id, request.expected_revision, barrier), 'INVALID_TRANSITION');
      }
    });
    await check('Chat references close before first reserve and committed race preserve terminal proof', async () => {
      for (const kind of allKinds) {
        const owner = kind === 'connection' ? 'connector' : 'crm', ledger = owners[owner].ledger, id = randomUUID(), barrier = randomUUID();
        assert.equal((await ledger.close(tenant, kind, id, '1', barrier)).state, 'drained');
        const blocked = await prepare({ references: { ...references, ...(kind === 'contact' ? { crm_contact_id: id, contact_revision: '1' } : kind === 'mapping' ? { crm_identity_id: id } : { connection_id: id }) } });
        await rejects(() => clients[owner](tenant, 'reference-reserve', { ...input(blocked, kind), resource_id: id, expected_revision: '1' }), 'INVALID_TRANSITION');
        await commands.abort(tenant, blocked);
        await ledger.cancelClose(tenant, kind, id, barrier);
        const command = await prepare(), request = input(command, kind);
        await clients[owner](tenant, 'reference-reserve', request);
        // No message side effect is fabricated: this tests only the durable command/ref commit race.
        await commands.commit(tenant, command, randomUUID(), async () => ({ effect_id: command.command_id, effect_revision: '1' }));
        const closeBarrier = randomUUID();
        try {
          assert.equal((await ledger.close(tenant, kind, request.resource_id, request.expected_revision, closeBarrier)).state, 'drained');
          assert.equal((await commands.proof(tenant, command)).state, 'committed');
          const restarted = owner === 'crm' ? new NativeCrmContactReferences(pools.crm, (t, ref, abort) => proofClients.crm(t, abort ? 'command-abort' : 'command-proof', ref)) : new NativeChannelReferences(pools.channel, (t, ref, abort) => proofClients.connector(t, abort ? 'command-abort' : 'command-proof', ref));
          assert.equal((await restarted.ledger.reference(tenant, 'reference-status', request)).state, 'released');
        } finally { await ledger.cancelClose(tenant, kind, request.resource_id, closeBarrier); }
      }
    });
    await check('Chat references concurrent close reserve and commit serialize without stranded holds', async () => {
      for (const kind of allKinds) {
        const owner = kind === 'connection' ? 'connector' : 'crm', ledger = owners[owner].ledger, command = await prepare(), request = input(command, kind), barrier = randomUUID();
        try {
          const results = await Promise.allSettled([
            clients[owner](tenant, 'reference-reserve', request),
            ledger.close(tenant, kind, request.resource_id, request.expected_revision, barrier),
          ]);
          assert.equal(results[1].status, 'fulfilled'); assert.equal(results[1].value.state, 'drained');
          if (results[0].status === 'fulfilled') {
            assert.equal((await commands.proof(tenant, command)).state, 'aborted');
            assert.equal((await clients[owner](tenant, 'reference-status', request)).state, 'released');
          } else { assert.equal(results[0].reason.code, 'INVALID_TRANSITION'); await commands.abort(tenant, command); }
        } finally { await ledger.cancelClose(tenant, kind, request.resource_id, barrier); }
        const committing = await prepare(), commitRequest = input(committing, kind), nextBarrier = randomUUID();
        await clients[owner](tenant, 'reference-reserve', commitRequest);
        try {
          const results = await Promise.allSettled([
            commands.commit(tenant, committing, randomUUID(), async () => ({ effect_id: committing.command_id, effect_revision: '1' })),
            ledger.close(tenant, kind, commitRequest.resource_id, commitRequest.expected_revision, nextBarrier),
          ]);
          assert.equal(results[1].status, 'fulfilled'); assert.equal(results[1].value.state, 'drained');
          const state = (await commands.proof(tenant, committing)).state;
          assert(['committed', 'aborted'].includes(state));
          if (results[0].status === 'rejected') assert.equal(results[0].reason.code, 'INVALID_TRANSITION');
          else assert.equal(state, 'committed');
          assert.equal((await clients[owner](tenant, 'reference-status', commitRequest)).state, 'released');
        } finally { await ledger.cancelClose(tenant, kind, commitRequest.resource_id, nextBarrier); }
      }
    });
    await check('Chat references real Chat HTTP outage retains reservation and recovers after restart', async () => {
      const command = await prepare(), request = input(command, 'contact'), receipt = await clients.crm(tenant, 'reference-reserve', request);
      const port = chatServer.address().port;
      const [[before]] = await operator.execute('SELECT COUNT(*) count FROM contact WHERE tenant_id=?', [tenant]);
      chatServer.closeAllConnections(); await new Promise(resolve => chatServer.close(resolve));
      try {
        await rejects(() => clients.crm(tenant, 'reference-release', request), 'DEPENDENCY_UNAVAILABLE');
        assert.deepEqual(await clients.crm(tenant, 'reference-status', request), receipt);
        const [[after]] = await operator.execute('SELECT COUNT(*) count FROM contact WHERE tenant_id=?', [tenant]); assert.equal(String(after.count), String(before.count));
      } finally { chatServer.listen(port, '127.0.0.1'); await once(chatServer, 'listening'); }
      await commands.abort(tenant, command);
      assert.equal((await clients.crm(tenant, 'reference-release', request)).state, 'released');
    });
    if (process.argv.includes('--with-status')) await chatChannelStatusNative({check,operator,commands,tenant,other,fixture,env,prepare,input,clients,proofClients,chatServer,connectorMaterial,registryConfig,protocol,servers});
    if (ctx.onReady) await ctx.onReady({ fixture, contactInput, clients, owners, pools, urls });
  } finally { await Promise.all(Object.values(pools).map(pool => pool.end())); }
}
