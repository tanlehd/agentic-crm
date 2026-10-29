import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { rootSQL } from './chat-native.mjs';
import { chatReferenceNative } from './chat-reference-native.mjs';
import { migrateIngress } from '../../services/chat/dist/ingress-schema.js';
import { ChatIngress, chatIngressRoutes } from '../../services/chat/dist/ingress.js';
import { chatIngressProcessorNative } from './chat-ingress-processor-native.mjs';
import { chatReferralNative } from './chat-referral-native.mjs';
import { chatIngressDenialsNative } from './chat-ingress-denials-native.mjs';
import {chatIngressRuntimeNative} from './chat-ingress-runtime-native.mjs';
import { createWorkloadServer, remoteRegistryAuthority, workloadRequest, OwnerError, TransportError } from '../../packages/workload-transport/dist/index.js';

export async function chatIngressNative(ctx) {
  const { check, operator, chatOperator, chatPool, commands, tenant, other, identity, identityClient, adminSessionHash, chatMaterial, chatAuthority, connectorMaterial, registryConfig, protocol, servers } = ctx;
  const path = '.local/chat-ownership/ingress-fixture.json'; let fixture;
  try { fixture = JSON.parse(await readFile(path, 'utf8')); }
  catch (e) { if (e.code !== 'ENOENT') throw e; fixture = { tenant, database: 'test_crm_chat_owner', actor: randomUUID(), role: randomUUID() }; await writeFile(path, JSON.stringify(fixture), { flag: 'wx', mode: 0o600 }); }
  assert.equal(fixture.tenant, tenant); assert.equal(fixture.database, 'test_crm_chat_owner');
  const permissions = [{ resource: 'integration', action: 'deliver', scope: 'all' }];
  await operator.execute("INSERT INTO role(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,?,'Synthetic ingress',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id", [fixture.role, tenant, 'ingress_' + fixture.role, JSON.stringify(permissions)]);
  await operator.execute('INSERT INTO service_actor(id,tenant_id,`key`,role_id,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id', [fixture.actor, tenant, 'ingress_' + fixture.actor, fixture.role]);
  await check('Chat ingress forward003 resumes retained storage and verifies old lineage without reset', async () => {
    const [before] = await chatOperator.query('SELECT version,name,checksum,state FROM schema_migration ORDER BY version');
    const [[counts]] = await chatOperator.query('SELECT COUNT(*) n FROM message');
    const hashes = await Promise.all(['chat001-owned-storage.sql', 'chat002-local-constraints.sql'].map(async file => createHash('sha256').update((await readFile('services/chat/migrations/' + file, 'utf8')).replaceAll('\r\n', '\n')).digest('hex')));
    assert.deepEqual(before.slice(0, 2).map(r => r.checksum), hashes);
    if (before.length === 2) {
      assert(process.argv.includes('--provision'), 'Explicit forward003 provision required');
      await assert.rejects(migrateIngress(chatOperator, async i => { if (i === 1) throw new Error('SYNTHETIC_INTERRUPTION'); }), /SYNTHETIC_INTERRUPTION/);
      assert.equal((await chatOperator.query('SELECT state FROM schema_migration WHERE version=3'))[0][0].state, 'failed');
      assert.equal(await migrateIngress(chatOperator), 1);
    } else await migrateIngress(chatOperator);
    assert.equal(await migrateIngress(chatOperator), 0);
    assert.deepEqual((await chatOperator.query('SELECT version,name,checksum,state FROM schema_migration WHERE version<3 ORDER BY version'))[0], before.slice(0, 2));
    assert.equal(String((await chatOperator.query('SELECT COUNT(*) n FROM message'))[0][0].n), String(counts.n));
    if (process.argv.includes('--provision')) rootSQL(Object.entries({ chat_ingress_contact_head: 'SELECT,INSERT,UPDATE', chat_ingress_inbox: 'SELECT,INSERT,UPDATE', chat_ingress_delivery: 'SELECT,INSERT', chat_ingress_request: 'SELECT,INSERT' }).map(([table, privileges]) => `GRANT ${privileges} ON test_crm_chat_owner.${table} TO 'chat_owner_test_runtime'@'%';`).join('\n'));
    await assert.rejects(chatPool.query('DELETE FROM chat_ingress_inbox WHERE 1=0'));
    await assert.rejects(chatPool.query('UPDATE chat_ingress_delivery SET receipt_id=receipt_id WHERE 1=0'));
    await assert.rejects(chatOperator.execute('INSERT INTO chat_ingress_contact_head(tenant_id,contact_id,created_at) VALUES (?,?,UTC_TIMESTAMP(6))', ['00000000-0000-0000-0000-000000000000', randomUUID()]));
  });
  await chatReferenceNative({ ...ctx, onReady: async ({ fixture: refs, contactInput, clients, pools, urls }) => {
    const [[messageBaseline]] = await chatOperator.execute('SELECT COUNT(*) n FROM message WHERE tenant_id=?', [tenant]);
    const [[oldChannel]] = await operator.execute('SELECT service_actor_id,credential_hash FROM channel_connection WHERE tenant_id=? AND id=?', [tenant, refs.connection]);
    await operator.execute('UPDATE channel_connection SET service_actor_id=?,credential_hash=? WHERE tenant_id=? AND id=?', [fixture.actor, createHash('sha256').update(randomUUID()).digest('hex'), tenant, refs.connection]);
    const binding = { tenant_id: tenant, connection_id: refs.connection, crm_contact_id: refs.contact, crm_identity_id: refs.identity, mapping_revision: '1', platform: 'mock_messenger' };
    const seen = new Map(); let loseSettlement = false, loseAdmission = false, revoke = false, ownerDown = false, lastCommand, processedMessages = 0;
    const peers = {
      contact: (t, input) => { if (ownerDown) throw new OwnerError('DEPENDENCY_UNAVAILABLE'); return clients.crm(t, 'contact-binding-read', input); },
      channel: (t, id) => clients.connector(t, 'connection-ingress-read', { connection_id: id }),
      metadata: t => clients.crm(t, 'metadata-schema-read', { object_key: 'conversation', schema_revision: null }),
      ...(process.argv.includes('--with-referral') ? { touchpoint: (t, operation, command) => clients.connector(t, operation, command) } : {}),
      ...(process.argv.includes('--with-denials') ? { verdict: (t, owner, input) => owner === 'identity' ? identityClient(t, 'ingress-verdict', input) : clients[owner](t, 'ingress-verdict', input) } : {}),
      reference: (t, owner, operation, input) => { seen.set(input.command.command_id, input.command); return clients[owner](t, operation, input); },
      admit: async (t, command) => {
        lastCommand = command;
        const result = await identityClient(t, 'admit', { owner: 'chat', command });
        if (loseAdmission) { loseAdmission = false; throw new OwnerError('DEPENDENCY_UNAVAILABLE'); }
        if (revoke) { revoke = false; const barrier = randomUUID(); await identity.beginRoleChange(t, adminSessionHash, barrier, fixture.role, []); await identity.drainRoleChange(t, barrier); }
        return result;
      },
      settle: async (t, command, admission_id) => {
        const result = await identityClient(t, 'settle', { owner: 'chat', command, admission_id });
        if (loseSettlement) { loseSettlement = false; throw new OwnerError('DEPENDENCY_UNAVAILABLE'); } return result;
      },
    };
    const ingress = new ChatIngress(commands, peers);
    if (process.env.CHAT_INGRESS_DIAGNOSTICS === '1') for (const key of Object.keys(peers)) {
      const original = peers[key]; peers[key] = async (...args) => {
        const start = Date.now();
        try { return await original(...args); }
        catch (e) { console.log('INGRESS_PEER', key, e.code ?? 'INTERNAL'); throw e; }
        finally { console.log('INGRESS_TIMING', key, Date.now() - start); }
      };
    }
    const routes = chatIngressRoutes(ingress);
    if (process.env.CHAT_INGRESS_DIAGNOSTICS === '1') for (const route of Object.values(routes)) {
      const original = route.handle; route.handle = async (...args) => { try { return await original(...args); } catch (e) { console.log('INGRESS_ROUTE', e.code ?? 'INTERNAL'); throw e; } };
    }
    const server = createWorkloadServer(chatMaterial, chatAuthority, routes); servers.push(server); server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const authority = remoteRegistryAuthority(connectorMaterial, registryConfig);
    const wire = async data => {
      for (let attempt = 0; ; attempt++) {
        try { return await workloadRequest(connectorMaterial, authority, { url: new URL(protocol + '//127.0.0.1:' + server.address().port + '/internal/v1/chat-exchange/' + data.operation), expectedService: 'chat', tenant: data.binding.tenant_id, data }); }
        catch (e) {
          if (!(e instanceof TransportError) || e.code !== 'DEPENDENCY_UNAVAILABLE' || attempt >= 2) throw e;
          console.log('RETRY exact ingress request after transport deadline; attempt ' + (attempt + 2));
        }
      }
    };
    const request = () => ({ schema_version: 1, operation: 'ingress-accept', request_id: randomUUID(), binding, source_delivery_id: randomUUID(), intake: { provider_event_id: randomUUID(), provider_message_id: randomUUID(), external_subject_id: contactInput.external_subject_id, occurred_at: '2026-10-20T03:04:05Z', message: { type: 'text', text: 'Synthetic ingress' } } });
    const read = receipt => ({ schema_version: 1, operation: 'ingress-read', request_id: randomUUID(), binding, receipt_id: receipt.receipt_id });
    const rejects = (work, code) => assert.rejects(work, e => e.code === code);
    async function restoreRole() { const barrier = randomUUID(); await identity.beginRoleChange(tenant, adminSessionHash, barrier, fixture.role, permissions); await identity.drainRoleChange(tenant, barrier); }
    try {
      if(process.argv.includes('--with-runtime')&&process.argv.includes('--runtime-only')){await chatIngressRuntimeNative({...ctx,urls,request});return;}
      // Prior interrupted runs are recovered through actual owner proofs, never SQL deletion/reset.
      const [oldCommands] = await chatOperator.execute("SELECT command_id,binding_digest,state FROM chat_owner_command WHERE tenant_id=? AND actor_id=? AND operation IN ('ingress-accept','ingress-receipt','ingress-process') ORDER BY created_at LIMIT 10000", [tenant, fixture.actor]);
      assert(oldCommands.length < 10000, 'Retained fixture recovery needs explicit pagination');
      // Test inventory reads use separate owner credentials; recovery itself still uses native HTTP proofs.
      const inventories = await Promise.allSettled([
        pools.crm.execute("SELECT command_id FROM crm_reference_reservation WHERE tenant_id=? AND state='held'", [tenant]),
        pools.channel.execute("SELECT command_id FROM connector_reference_reservation WHERE tenant_id=? AND state='held'", [tenant]),
        operator.execute("SELECT command_id FROM identity_owner_admission WHERE tenant_id=? AND principal_id=? AND state='admitted'", [tenant, fixture.actor]),
        ...(process.argv.includes('--with-referral') ? [pools.channel.execute("SELECT command_id FROM channel_ingress_touchpoint WHERE tenant_id=? AND state='prepared'", [tenant])] : []),
      ]);
      const unresolved = new Set();
      for (const inventory of inventories) { if (inventory.status !== 'fulfilled') throw inventory.reason; for (const row of inventory.value[0]) unresolved.add(row.command_id); }
      for (const command of oldCommands) if (command.state === 'prepared' || unresolved.has(command.command_id)) await ingress.recover(tenant, { command_id: command.command_id, binding_digest: command.binding_digest });
      seen.clear();
      await check('Chat ingress native accept commits exact inbox and atomic request source event keys', async () => {
        const input = request(), first = await wire(input); assert.equal(first.state, 'received');
        const second = await wire({ ...input, intake: { ...input.intake, occurred_at: '2026-10-20T03:04:05.000Z' } }); assert.deepEqual(second, first);
        const alias = { ...input, request_id: randomUUID(), source_delivery_id: randomUUID() };
        assert.equal((await wire(alias)).receipt_id, first.receipt_id);
        const reading = read(first);
        assert.deepEqual(await wire(reading), { schema_version: 1, request_id: reading.request_id, receipt_id: first.receipt_id, state: 'received' });
        const [[stored]] = await chatOperator.execute('SELECT intake_json FROM chat_ingress_inbox WHERE tenant_id=? AND id=?', [tenant, first.receipt_id]);
        const intake = typeof stored.intake_json === 'string' ? JSON.parse(stored.intake_json) : stored.intake_json;
        assert.equal(intake.occurred_at, '2026-10-20T03:04:05.000Z');
        assert.equal(Number((await chatOperator.execute('SELECT COUNT(*) n FROM chat_ingress_delivery WHERE tenant_id=? AND receipt_id=?', [tenant, first.receipt_id]))[0][0].n), 2);
      });
      await check('Chat ingress concurrent duplicate accepts and lost terminal ACK keep a single receipt', async () => {
        const input = request(); const [a, b] = await Promise.all([wire(input), wire(input)]); assert.deepEqual(a, b);
        loseSettlement = true; const lost = request(); await rejects(() => wire(lost), 'DEPENDENCY_UNAVAILABLE');
        const original = lastCommand; await ingress.recover(tenant, original);
        const replay = await wire(lost);
        const [[row]] = await chatOperator.execute('SELECT id FROM chat_ingress_inbox WHERE tenant_id=? AND connection_id=? AND provider_event_id=?', [tenant, refs.connection, lost.intake.provider_event_id]); assert.equal(replay.receipt_id, row.id);
        assert.equal((await commands.proof(tenant, original)).state, 'committed');
        loseAdmission = true; const unacknowledged = request();
        await rejects(() => wire(unacknowledged), 'DEPENDENCY_UNAVAILABLE');
        const unknown = lastCommand;
        assert.equal((await commands.proof(tenant, unknown)).state, 'prepared');
        assert.equal(await commands.dependency(tenant, unknown, 'identity-admission'), null);
        assert.equal((await chatOperator.execute('SELECT id FROM chat_ingress_inbox WHERE tenant_id=? AND connection_id=? AND provider_event_id=?', [tenant, refs.connection, unacknowledged.intake.provider_event_id]))[0].length, 0);
        await new ChatIngress(commands, peers).recover(tenant, unknown);
        assert.equal((await commands.proof(tenant, unknown)).state, 'aborted');
        assert.equal((await wire(unacknowledged)).state, 'received');
      });
      await check('Chat ingress conflicting event delivery request and read IDs roll back all new aliases', async () => {
        const input = request(), first = await wire(input);
        const before = (await chatOperator.execute('SELECT COUNT(*) n FROM chat_ingress_inbox WHERE tenant_id=?', [tenant]))[0][0].n;
        await rejects(() => wire({ ...input, request_id: randomUUID(), source_delivery_id: randomUUID(), intake: { ...input.intake, message: { type: 'text', text: 'Different synthetic' } } }), 'CONFLICT');
        for (const changed of [{ ...input, request_id: randomUUID(), intake: { ...input.intake, provider_event_id: randomUUID() } }, { ...input, source_delivery_id: randomUUID(), intake: { ...input.intake, provider_event_id: randomUUID() } }]) await rejects(() => wire(changed), 'CONFLICT');
        assert.equal(String((await chatOperator.execute('SELECT COUNT(*) n FROM chat_ingress_inbox WHERE tenant_id=?', [tenant]))[0][0].n), String(before));
        const another = await wire(request()), reading = read(first); await wire(reading);
        await rejects(() => wire({ ...reading, receipt_id: another.receipt_id }), 'CONFLICT');
        await rejects(() => wire({ ...reading, binding: { ...binding, tenant_id: other } }), 'NOT_FOUND');
      });
      await check('Chat ingress invalid dates fields and binding never create an inbox or replacement Contact', async () => {
        for (const time of ['2026-02-30T01:00:00Z', '2026-10-20T25:00:00Z']) await rejects(() => wire({ ...request(), intake: { ...request().intake, occurred_at: time } }), 'INVALID_REQUEST');
        await rejects(() => wire({ ...request(), unexpected: true }), 'INVALID_REQUEST');
        const input = request(); await rejects(() => wire({ ...input, binding: { ...binding, crm_contact_id: randomUUID() } }), 'CONFLICT');
        const [[before]] = await operator.execute('SELECT COUNT(*) n FROM contact WHERE tenant_id=?', [tenant]); ownerDown = true;
        try { await rejects(() => wire(request()), 'DEPENDENCY_UNAVAILABLE'); }
        finally { ownerDown = false; }
        assert.equal(String((await operator.execute('SELECT COUNT(*) n FROM contact WHERE tenant_id=?', [tenant]))[0][0].n), String(before.n));
      });
      await check('Chat ingress fresh Identity service grants reject retries and completed revoke wins commit race', async () => {
        const input = request(), first = await wire(input), barrier = randomUUID();
        await identity.beginRoleChange(tenant, adminSessionHash, barrier, fixture.role, []); await identity.drainRoleChange(tenant, barrier);
        try { await rejects(() => wire(input), 'FORBIDDEN'); await rejects(() => wire(read(first)), 'FORBIDDEN'); }
        finally { await restoreRole(); }
        revoke = true; const racing = request();
        try { await rejects(() => wire(racing), 'INVALID_TRANSITION'); assert.equal((await chatOperator.execute('SELECT id FROM chat_ingress_inbox WHERE tenant_id=? AND connection_id=? AND provider_event_id=?', [tenant, refs.connection, racing.intake.provider_event_id]))[0].length, 0); }
        finally { revoke = false; await restoreRole(); }
      });
      await check('Chat ingress Contact tombstone fences accept read and replay with no transcript in proofs', async () => {
        const input = request(), first = await wire(input);
        const [[previous]] = await chatOperator.execute('SELECT * FROM chat_contact_guard WHERE tenant_id=? AND contact_id=?', [tenant, refs.contact]);
        if (previous) assert.equal(previous.state, 'released');
        const barrier = randomUUID();
        await commands.transaction(tenant, async c => {
          await c.execute('SELECT contact_id FROM chat_ingress_contact_head WHERE tenant_id=? AND contact_id=? FOR UPDATE', [tenant, refs.contact]);
          await c.execute("INSERT INTO chat_contact_guard(tenant_id,contact_id,archive_command_id,binding_digest,state,core_revision,version,created_at,updated_at) VALUES (?,?,?,?,'closing',1,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE state='closing'", [tenant, refs.contact, barrier, '0'.repeat(64)]);
        });
        try { await rejects(() => wire(input), 'REVOKED'); await rejects(() => wire(read(first)), 'REVOKED'); }
        finally { await chatOperator.execute("UPDATE chat_contact_guard SET state='released',version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND contact_id=?", [tenant, refs.contact]); }
        const [proofs] = await chatOperator.execute('SELECT binding_json,request_json,result_json FROM chat_owner_command WHERE tenant_id=? AND actor_id=?', [tenant, fixture.actor]);
        assert.equal(JSON.stringify(proofs).includes('Synthetic ingress'), false);
        assert.equal(JSON.stringify(await wire(read(first))).includes(contactInput.external_subject_id), false);
      });
      await check('Chat ingress schema rejects incomplete processed state cross-tenant aliases and foreign SQL', async () => {
        const input = request(), receipt = await wire(input);
        await assert.rejects(chatOperator.execute("UPDATE chat_ingress_inbox SET state='processed' WHERE tenant_id=? AND id=?", [tenant, receipt.receipt_id]));
        await assert.rejects(chatOperator.execute('INSERT INTO chat_ingress_delivery(tenant_id,connection_id,source_delivery_id,receipt_id,event_digest,created_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))', [other, refs.connection, randomUUID(), receipt.receipt_id, '0'.repeat(64)]));
        await assert.rejects(chatPool.query('SELECT * FROM native_identity_test.contact_identity LIMIT 1'));
        const [[plan]] = await chatOperator.execute('EXPLAIN SELECT id FROM chat_ingress_inbox WHERE tenant_id=? AND connection_id=? AND provider_event_id=?', [tenant, refs.connection, input.intake.provider_event_id]); assert.equal(plan.key, 'uq_chat_ingress_event');
      });
      if (process.argv.includes('--with-processor')) processedMessages = await chatIngressProcessorNative({ ...ctx, refs, fixture, peers, wire, request, restoreRole, lastCommand: () => lastCommand, loseSettlement: () => { loseSettlement = true; }, revoke: () => { revoke = true; } });
      if (process.argv.includes('--with-referral')) processedMessages += await chatReferralNative({ ...ctx, refs, fixture, peers, pools, clients, wire, request, restoreRole, lastCommand: () => lastCommand });
      if (process.argv.includes('--with-denials')) processedMessages += await chatIngressDenialsNative({ ...ctx, refs, fixture, peers, pools, clients, wire, request, restoreRole, lastCommand: () => lastCommand });
    } finally {
      try { for (const command of seen.values()) await ingress.recover(tenant, command); }
      finally { await operator.execute('UPDATE channel_connection SET service_actor_id=?,credential_hash=? WHERE tenant_id=? AND id=?', [oldChannel.service_actor_id, oldChannel.credential_hash, tenant, refs.connection]); }
    }
    assert.equal(BigInt((await chatOperator.execute('SELECT COUNT(*) n FROM message WHERE tenant_id=?', [tenant]))[0][0].n), BigInt(messageBaseline.n) + BigInt(processedMessages));
    assert.equal(Number((await chatOperator.execute("SELECT COUNT(*) n FROM chat_owner_command WHERE tenant_id=? AND actor_id=? AND state='prepared'", [tenant, fixture.actor]))[0][0].n), 0);
    assert.equal(Number((await operator.execute("SELECT COUNT(*) n FROM identity_owner_admission WHERE tenant_id=? AND principal_id=? AND state='admitted'", [tenant, fixture.actor]))[0][0].n), 0);
  } });
}
