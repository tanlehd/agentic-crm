import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { rootSQL, createPool } from './lib/chat-native.mjs';
import { migrate, artifacts } from '../services/chat/dist/schema.js';
import { ChatOwnerCommands } from '../services/chat/dist/owner-command.js';
import { ChatOwnership } from '../services/chat/dist/ownership.js';
import { ownerBindingDigest, ownerDigest, validateOwnerValue } from '../packages/workload-transport/dist/index.js';

const dir = '.local/chat-ownership', out = 'artifacts/chat-extraction/t04';
const database = 'test_crm_chat_owner';
await mkdir(dir, { recursive: true }); await mkdir(out, { recursive: true });
const credentialsFile = dir + '/credentials.json';
if (process.argv.includes('--provision')) {
  const cfg = { environment: 'retained-test', database, host: '127.0.0.1', port: 13306,
    operator: randomBytes(32).toString('hex'), runtime: randomBytes(32).toString('hex') };
  try { await writeFile(credentialsFile, JSON.stringify(cfg), { flag: 'wx', mode: 0o600 }); }
  catch (e) { if (e.code !== 'EEXIST') throw e; }
}
const cfg = JSON.parse(await readFile(credentialsFile, 'utf8'));
if (cfg.environment !== 'retained-test' || cfg.database !== database || cfg.host !== '127.0.0.1' || cfg.port !== 13306 ||
    ![cfg.operator, cfg.runtime].every(x => /^[a-f0-9]{64}$/.test(x))) throw new Error('TEST_CONFIGURATION_DENIED');
const make = role => createPool({ host: cfg.host, port: cfg.port, database, user: 'chat_owner_test_' + role, password: cfg[role],
  timezone: 'Z', dateStrings: true, supportBigNumbers: true, bigNumberStrings: true, jsonStrings: true, connectionLimit: 8 });
if (process.argv.includes('--provision')) {
  const system = rootSQL("SELECT COUNT(*) FROM agentic_crm.tenant WHERE id='01900000-0000-7000-8000-000000000001' AND tenant_id=id AND kind='system' AND status='active';");
  assert.equal(system.trim(), '1', 'Registered platform tenant required');
  rootSQL(`CREATE DATABASE IF NOT EXISTS ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;
    CREATE USER IF NOT EXISTS 'chat_owner_test_operator'@'%' IDENTIFIED BY '${cfg.operator}';
    CREATE USER IF NOT EXISTS 'chat_owner_test_runtime'@'%' IDENTIFIED BY '${cfg.runtime}';
    GRANT ALL ON ${database}.* TO 'chat_owner_test_operator'@'%';`);
}
const operator = make('operator'), runtime = make('runtime'), results = [];
const tenant = '01900000-0000-7000-8000-000000004101', other = '01900000-0000-7000-8000-000000004102';
const actor = '01900000-0000-7000-8000-000000004111', target = '01900000-0000-7000-8000-000000004112';
const commands = new ChatOwnerCommands(runtime, '1');
const rejects = (fn, code) => assert.rejects(fn, e => e.code === code);
async function check(name, fn) { await fn(); results.push({ name, status: 'PASS' }); console.log('PASS ' + name); }
function binding(command = randomUUID()) {
  const request = { action: 'synthetic-command' };
  return { request, binding: { tenant_id: tenant, command_id: command, owner: 'chat', operation: 'routing-assignment',
    actor: { kind: 'human', principal_id: actor, delegation_id: randomUUID() },
    resource: { resource_id: randomUUID(), object_key: 'conversation', record_version: '1', owner_revision: '1', control_revision: '1', owner_principal_id: actor, team_id: null, shared_team_ids: [], archived: false },
    target: { principal_id: target, kind: 'human', team_id: null }, session_id: randomUUID(), fields: ['owner_principal_id','team_id'], payload_digest: ownerDigest(request), legacy_receipt_key: 'synthetic:' + command, graph: null, dependencies: [] } };
}
const ref = b => ({ command_id: b.command_id, binding_digest: ownerBindingDigest(b) });
try {
  if (process.argv.includes('--provision')) {
    await migrate(operator, 1);
    await migrate(operator, 2, { validated: async () => {
      const [[rows]] = await operator.query('SELECT COUNT(*) AS n FROM crm_record');
      assert.equal(Number(rows.n), 0, 'New fixture only; existing schema2 must already have applied constraints');
    } });
    const schema = await artifacts();
    rootSQL(schema.tables.map(t => `GRANT ${t.grants.api.join(',')} ON ${database}.\`${t.name}\` TO 'chat_owner_test_runtime'@'%';`).join('\n'));
    for (const t of [tenant, other]) await operator.execute(`INSERT INTO chat_writer_gate(tenant_id,mode,epoch,manifest_digest,updated_at)
      VALUES (?,'active',1,?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE tenant_id=tenant_id`, [t,ownerDigest({fixture:'t04',tenant:t})]);
  }
  await check('tenant-scoped immutable concurrent prepare and conflicting replay', async () => {
    const x = binding(); const responses = await Promise.all(Array.from({ length: 6 }, () => commands.prepare(x.binding, x.request)));
    assert(responses.every(p => p.state === 'prepared' && p.binding_digest === ref(x.binding).binding_digest));
    const changed = structuredClone(x.binding); changed.target.principal_id = randomUUID();
    await rejects(() => commands.prepare(changed, x.request), 'CONFLICT');
    await rejects(() => commands.proof(other, ref(x.binding)), 'NOT_FOUND');
    await rejects(() => new ChatOwnerCommands(runtime, '2').prepare(binding().binding, x.request), 'DEPENDENCY_UNAVAILABLE');
  });
  await check('abort before prepare persists minimized terminal proof across repository restart', async () => {
    const x = binding(), key = ref(x.binding);
    await commands.abort(tenant, key);
    const restarted = new ChatOwnerCommands(runtime, '1'), proof = await restarted.proof(tenant, key);
    assert.deepEqual(proof, { ...key, state: 'aborted' });
    validateOwnerValue('OwnerRecoveryProof', proof);
    await rejects(() => restarted.prepare(x.binding, x.request), 'INVALID_TRANSITION');
    await rejects(() => restarted.abort(tenant, { ...key, binding_digest: '0'.repeat(64) }), 'CONFLICT');
  });
  await check('commit versus abort serializes one terminal state and rolls back failed effects', async () => {
    for (let i = 0; i < 5; i++) {
      const x = binding(), key = ref(x.binding); await commands.prepare(x.binding, x.request);
      const outcomes = await Promise.allSettled([
        commands.commit(tenant, key, randomUUID(), async () => ({ effect_id: x.binding.resource.resource_id, effect_revision: '2' })),
        commands.abort(tenant, key),
      ]);
      assert(outcomes.every(r => r.status === 'fulfilled' || r.reason.code === 'INVALID_TRANSITION'));
      const final = await commands.proof(tenant, key); assert(['committed','aborted'].includes(final.state));
      assert.equal((await commands.abort(tenant, key)).state, final.state);
    }
    const x = binding(), key = ref(x.binding); await commands.prepare(x.binding, x.request);
    await assert.rejects(commands.commit(tenant, key, randomUUID(), async c => {
      await c.execute('UPDATE chat_owner_command SET admission_id=? WHERE tenant_id=? AND command_id=?', [randomUUID(), tenant, key.command_id]);
      throw new Error('SYNTHETIC_CRASH');
    }), /SYNTHETIC_CRASH/);
    const [[row]] = await operator.execute('SELECT state,admission_id FROM chat_owner_command WHERE tenant_id=? AND command_id=?', [tenant,key.command_id]);
    assert.equal(row.state,'prepared'); assert.equal(row.admission_id,null);
  });
  await check('runtime grants deny main, Identity, DDL and writer-gate mutation', async () => {
    const denied = e => ['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR','ER_SPECIFIC_ACCESS_DENIED_ERROR'].includes(e.code);
    await assert.rejects(runtime.query('SELECT id FROM agentic_crm.account LIMIT 1'), denied);
    await assert.rejects(runtime.query('CREATE TABLE cannot_create(tenant_id CHAR(36))'), denied);
    await assert.rejects(runtime.execute("UPDATE chat_writer_gate SET mode='shadow' WHERE tenant_id=?", [tenant]), denied);
  });
  await check('native assignment CAS commits history, contribution, snooze, queued cancellation and control outbox once', async () => {
    for (const dataset of ['conversion', 'stage', 'progress', 'routing', 'registry']) await operator.execute('INSERT INTO chat_dataset_head(tenant_id,dataset,revision,version,created_at,updated_at) VALUES (?,?,1,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE tenant_id=tenant_id', [tenant, dataset]);
    const [beforeHeads] = await operator.execute('SELECT dataset,revision FROM chat_dataset_head WHERE tenant_id=? ORDER BY dataset', [tenant]);
    const id = randomUUID(), episode = randomUUID(), objectType = randomUUID(), connection = randomUUID();
    await operator.execute(`INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,version,owner_revision,custom_values,created_at,updated_at)
      VALUES (?,?,?,?,9007199254740993,9007199254740995,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,[id,tenant,objectType,actor,JSON.stringify({retained:'synthetic'})]);
    await operator.execute(`INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at)
      VALUES (?,?,?,?,?,'open',UTC_TIMESTAMP(6))`,[tenant,id,randomUUID(),randomUUID(),connection]);
    await operator.execute(`INSERT INTO conversation_acquisition_session(tenant_id,id,conversation_id,sequence,version,status,opening_reason,opened_at,opening_occurred_at,source_classification,policy_version)
      VALUES (?,?,?,1,1,'active','first_inbound',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'unknown','inbox_v2')`,[tenant,episode,id]);
    await operator.execute(`INSERT INTO chat_control_head(tenant_id,conversation_id,registry_revision,control_revision,cancel_through,pause_through,version,created_at,updated_at)
      VALUES (?,?,1,1,0,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,[tenant,id]);
    await operator.execute('INSERT INTO conversation_activity_counter(tenant_id,conversation_id,last_seq,backfilled) VALUES (?,?,0,1)',[tenant,id]);
    await operator.execute("INSERT INTO conversation_snooze(tenant_id,conversation_id,until_at,revision,last_cause,updated_at) VALUES (?,?,TIMESTAMPADD(HOUR,1,UTC_TIMESTAMP(6)),1,'manual',UTC_TIMESTAMP(6))",[tenant,id]);
    for(const state of ['queued','remote_queued','sending','unknown']) {
      const intent=randomUUID();
      await operator.execute(`INSERT INTO outbound_intent(id,tenant_id,conversation_id,actor_kind,actor_id,owner_revision,text,status,idempotency_key,created_at)
        VALUES (?,?,?,'human',?,9007199254740995,'synthetic',?,?,UTC_TIMESTAMP(6))`,[intent,tenant,id,actor,state,intent]);
      await operator.execute(`INSERT INTO message(id,tenant_id,conversation_id,connection_id,direction,text,status,occurred_at,received_at,outbound_intent_id)
        VALUES (?,?,?,?,'outbound','synthetic',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?)`,[randomUUID(),tenant,id,connection,state==='remote_queued'?'queued':state,intent]);
    }
    let calls=0,confirmations=0;
    const peers={
      async reserve(t,key,session){
        assert.equal(t,tenant);assert.equal(session,episode);calls++;
        // Native independent connection can lock the record here: Chat holds no local transaction over this callback.
        const c=await operator.getConnection();try{await c.beginTransaction();await c.query('SET innodb_lock_wait_timeout=1');await c.execute('SELECT id FROM crm_record WHERE tenant_id=? AND id=? FOR UPDATE',[tenant,id]);await c.rollback();}finally{c.release();}
        return {reservation_id:randomUUID(),...key,session_id:episode,principal_id:target,owner_revision:'9007199254740996',state:'reserved',allocation_id:null,queue_version_id:null};
      },
      async admit(t,key){return {admission_id:randomUUID(),...key,state:'admitted',auth_revision:'1',allowed_fields:['owner_principal_id','team_id']};},
      async confirm(){confirmations++;if(confirmations===1)throw new Error('SYNTHETIC_LOST_ACK');},async settle(){},
    };
    const candidate=new ChatOwnership(commands,peers),request={schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,
      operation:'routing-assignment',actor:{kind:'human',principal_id:actor,delegation_id:randomUUID()},command_id:randomUUID(),
      payload:{id,body:{owner_principal_id:target,reason:'manual'},expected_version:'9007199254740993',idempotency_key:randomUUID()}};
    const prepared=await candidate.prepare(request,{principal_id:target,kind:'human',team_id:null}),key=ref(prepared.binding);
    const result=await candidate.execute(tenant,key);assert.equal(result.proof.state,'committed');assert.equal(result.reconciliation,'pending');
    assert.equal((await candidate.execute(tenant,key)).reconciliation,'complete');assert.equal(calls,1);assert.equal(confirmations,2);
    assert.equal((await candidate.prepare(request,{principal_id:target,kind:'human',team_id:null})).state,'committed');
    const [[row]]=await operator.execute('SELECT owner_principal_id,CAST(version AS CHAR) AS version,CAST(owner_revision AS CHAR) AS owner_revision,custom_values FROM crm_record WHERE tenant_id=? AND id=?',[tenant,id]);
    assert.equal(row.owner_principal_id,target);assert.equal(row.version,'9007199254740994');assert.equal(row.owner_revision,'9007199254740996');assert.equal(JSON.parse(row.custom_values).retained,'synthetic');
    const [states]=await operator.execute('SELECT status FROM outbound_intent WHERE tenant_id=? AND conversation_id=?',[tenant,id]);
    assert.deepEqual(states.map(x=>x.status).sort(),['cancelled','cancelled','sending','unknown']);
    const [[history]]=await operator.execute('SELECT COUNT(*) AS n FROM ownership_history WHERE tenant_id=? AND record_id=?',[tenant,id]);assert.equal(Number(history.n),1);
    const [[contribution]]=await operator.execute('SELECT COUNT(*) AS n FROM session_contribution WHERE tenant_id=? AND session_id=?',[tenant,episode]);assert.equal(Number(contribution.n),1);
    const [[snooze]]=await operator.execute('SELECT until_at FROM conversation_snooze WHERE tenant_id=? AND conversation_id=?',[tenant,id]);assert.equal(snooze.until_at,null);
    const [deliveries]=await operator.execute('SELECT consumer_name FROM chat_event_delivery WHERE tenant_id=? AND aggregate_id=?',[tenant,id]);
    assert.deepEqual(deliveries.map(d=>d.consumer_name).sort(),['ai-runtime.chat-control.v1','chat.snooze.v1','crm.chat-registry.v1','human.routing.record.assigned.v1','workflow.chat-control.v1']);
    const [[control]]=await operator.execute('SELECT control_revision,cancel_through FROM chat_control_head WHERE tenant_id=? AND conversation_id=?',[tenant,id]);assert.equal(String(control.control_revision),'2');assert.equal(String(control.cancel_through),'1');
    const [afterHeads] = await operator.execute('SELECT dataset,revision FROM chat_dataset_head WHERE tenant_id=? ORDER BY dataset', [tenant]);
    assert.deepEqual(afterHeads.map(h => [h.dataset, String(h.revision)]), beforeHeads.map(h => [h.dataset, String(BigInt(h.revision) + 1n)]));
    const [[wake]]=await operator.execute("SELECT actor_kind,actor_id FROM conversation_activity WHERE tenant_id=? AND conversation_id=? AND kind='snooze'",[tenant,id]);assert.equal(wake.actor_kind,'system');assert.equal(wake.actor_id,tenant);
    await rejects(()=>candidate.prepare({...request,command_id:randomUUID()}, {principal_id:target,kind:'human',team_id:null}), 'STALE_VERSION');
  });
  await writeFile(out + '/native-command.json', JSON.stringify({ environment:'retained-test', database, results, scope:'native command/ownership repository with injected authority receipts; native Identity/Routing composition still pending' },null,2));
} catch (e) {
  await writeFile(out + '/native-command-failure.json', JSON.stringify({ results, code:e.code??e.message, stack:e.stack },null,2));
  throw e;
} finally { await Promise.all([operator.end(),runtime.end()]); }
