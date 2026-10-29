import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createRequire } from 'node:module';
import { randomUUID, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { migrate, migrations, ready } from '../services/crm-connector/dist/schema.js';
import { PayloadStore } from '../services/crm-connector/dist/payload-store.js';
import { Store } from '../services/crm-connector/dist/store.js';
import { canonical, hash } from '../services/crm-connector/dist/validation.js';

const require = createRequire(new URL('../services/crm-connector/package.json',import.meta.url));
const {createPool} = require('mysql2/promise');
const dir = 'artifacts/connector-payload', fixturePath = '.local/connector-payload-fixture.json';
const system = '01900000-0000-7000-8000-000000000001', database = 'native_connector_test', user = 'connector_payload_test';
const results = [];
async function test(name,fn) { await fn(); results.push(name); console.log('PASS '+name); }
const env = parseEnv(await readFile('.local/native-auth-test.env','utf8'));
assert.equal(env.MYSQL_HOST,'127.0.0.1'); assert.equal(env.MYSQL_PORT,'13306');
assert.equal(env.MYSQL_DATABASE,'native_identity_test'); assert.equal(env.MYSQL_MIGRATION_USER,'native_test_operator');
const options = {host:env.MYSQL_HOST,port:13306,database,timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,connectionLimit:12};
let runtime, operator, identity;
const bad = (promise,code) => assert.rejects(promise,e=>e.code===code);
const request = tenant => {
 const payload = {version:1,platform:'mock_messenger',message:{type:'text',text:'Synthetic payload storage acceptance'}};
 return {schema_version:1,operation:'payload-put',request_id:randomUUID(),grant_id:randomUUID(),payload,
  binding:{tenant_id:tenant,intent_id:randomUUID(),attempt_id:randomUUID(),conversation_id:randomUUID(),crm_contact_id:randomUUID(),connection_id:randomUUID(),principal_id:randomUUID(),delegation_id:randomUUID(),actor_kind:'human',owner_revision:'99999999999999999999',record_version:'99999999999999999999',payload_digest:hash(canonical(payload))}};
};
try {
 await mkdir(dir,{recursive:true});
 let fixture;
 try { fixture=JSON.parse(await readFile(fixturePath,'utf8')); }
 catch(e) {
  if(e.code!=='ENOENT' || process.argv.includes('--replay')) throw e;
  identity=createPool({...options,database:'native_identity_test',user:env.MYSQL_MIGRATION_USER,password:env.MYSQL_MIGRATION_PASSWORD});
  const [tenants]=await identity.query("SELECT id FROM tenant WHERE kind='business' AND status='active' ORDER BY id LIMIT 2");
  assert.equal(tenants.length,2);
  fixture={tenant:tenants[0].id,other:tenants[1].id,password:randomBytes(32).toString('hex'),baseline:request(tenants[0].id)};
  await writeFile(fixturePath,JSON.stringify(fixture),{flag:'wx',mode:0o600});
 }
 assert.match(fixture.password,/^[a-f0-9]{64}$/);
 runtime=createPool({...options,user,password:fixture.password});
 const store=new PayloadStore(runtime), put=(r,state='issued')=>store.persistAuthorizedPayload(r.binding.tenant_id,r,state);
 if(process.argv.includes('--replay')) {
  const result=await put(fixture.baseline,'consumed'); assert.equal(result.receipt_id,fixture.baseline.binding.attempt_id);
  console.log('fresh-process-replay');
 } else {
  operator=createPool({...options,user:env.MYSQL_MIGRATION_USER,password:env.MYSQL_MIGRATION_PASSWORD});
  identity??=createPool({...options,database:'native_identity_test',user:env.MYSQL_MIGRATION_USER,password:env.MYSQL_MIGRATION_PASSWORD});
  const [[platform]]=await identity.query("SELECT id FROM tenant WHERE id=? AND tenant_id=id AND kind='system'",[system]); assert.equal(platform?.id,system);
  for(const id of [fixture.tenant,fixture.other]) {const [[t]]=await identity.query("SELECT id FROM tenant WHERE id=? AND kind='business' AND status='active'",[id]); assert.equal(t?.id,id);}
  if(!fixture.legacy) {
   fixture.legacy={connection:randomUUID(),remote:randomUUID(),token:randomBytes(32).toString('hex'),event:randomUUID()};
   await writeFile(fixturePath,JSON.stringify(fixture),{mode:0o600});
  }
  const legacy=new Store(operator);
  await legacy.provision({id:fixture.legacy.connection,tenant_id:fixture.tenant,token:fixture.legacy.token,remote_connection_id:fixture.legacy.remote,remote_token_env:'CONNECTOR_REMOTE_TOKEN_STORAGE_TEST'});
  await legacy.accept(fixture.legacy.connection,'Bearer '+fixture.legacy.token,{provider_event_id:fixture.legacy.event,provider_message_id:fixture.legacy.event,external_subject_id:'synthetic-payload-storage',occurred_at:'2026-10-18T00:00:00Z',message:{type:'text',text:'Synthetic retained legacy bridge delivery'}});
  const oldTables=['connector_connection','connector_delivery','connector_audit','connector_meta_page','connector_meta_event','connector_meta_audit'];
  const snapshot=async()=>Object.fromEntries(await Promise.all(oldTables.map(async table=>{const [rows]=await operator.query('SELECT * FROM '+table+' ORDER BY id');return [table,{count:rows.length,digest:hash(canonical(rows))}];})));
  const before=await snapshot();
  await test('forward migration preserves legacy rows/checksums and registered system journal',async()=>{
   const [old]=await operator.query('SELECT version,name,checksum,state,tenant_id FROM connector_schema_migration ORDER BY version');
   assert.ok([2,3,4,5].includes(old.length));
   assert.equal(await migrate(operator),migrations.length-old.length); assert.equal(await migrate(operator),0); await ready(operator);
   const [now]=await operator.query('SELECT version,name,checksum,state,tenant_id FROM connector_schema_migration ORDER BY version');
   assert.deepEqual(now.slice(0,old.length),old); assert.equal(now[2].checksum,migrations[2].checksum);
   assert.equal(now[2].tenant_id,system); assert.deepEqual(await snapshot(),before);
  });
  // Local test operator provisioning via Docker's existing root context; no secret appears in argv/output.
  const sql=`CREATE USER IF NOT EXISTS '${user}'@'%' IDENTIFIED BY '${fixture.password}';
GRANT SELECT, INSERT ON ${database}.connector_dispatch_payload TO '${user}'@'%';
GRANT SELECT, INSERT ON ${database}.connector_payload_request TO '${user}'@'%';
GRANT SELECT, INSERT, UPDATE ON ${database}.connector_dispatch_guard TO '${user}'@'%';
GRANT SELECT, INSERT ON ${database}.connector_dispatch_request TO '${user}'@'%';
GRANT SELECT, INSERT ON ${database}.connector_attempt_event TO '${user}'@'%';`;
  const provision=spawnSync('docker',['exec','-i','agentic-crm-mysql-1','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot'],{input:sql,stdio:['pipe','pipe','pipe'],windowsHide:true,timeout:30000});
  assert.equal(provision.status,0,'LOCAL_RUNTIME_PROVISION_FAILED');
  const [grants]=await runtime.query('SHOW GRANTS');
  assert.equal(grants.length,6);
  for(const row of grants) assert.match(String(Object.values(row)[0]),/^(GRANT USAGE ON \*\.\*|GRANT SELECT, INSERT ON `native_connector_test`\.`connector_(dispatch_payload|payload_request|dispatch_request|attempt_event)`|GRANT SELECT, INSERT, UPDATE ON `native_connector_test`\.`connector_dispatch_guard`)/);
  const count=async(table,tenant,intent)=>{const [[r]]=await operator.query(`SELECT COUNT(*) n FROM ${table} WHERE tenant_id=? AND intent_id=?`,[tenant,intent]);return Number(r.n);};
  await test('retained baseline and sixteen concurrent retries commit one payload and receipt',async()=>{
   const replies=await Promise.all(Array.from({length:16},()=>put(fixture.baseline)));
   for(const reply of replies) assert.deepEqual(reply,replies[0]);
   assert.equal(await count('connector_dispatch_payload',fixture.tenant,fixture.baseline.binding.intent_id),1);
   assert.equal(await count('connector_payload_request',fixture.tenant,fixture.baseline.binding.intent_id),1);
   assert.equal(JSON.stringify(replies[0]).includes('Synthetic'),false);
  });
  await test('immutable binding/content/grant and unique attempt conflicts fail closed',async()=>{
   for(const change of [r=>{r.grant_id=randomUUID();},r=>{r.binding.owner_revision='2';},r=>{r.binding.attempt_id=randomUUID();},r=>{r.payload.message.text='Different synthetic';r.binding.payload_digest=hash(canonical(r.payload));},r=>{r.binding.intent_id=randomUUID();}]) {
    const r=structuredClone(fixture.baseline);r.request_id=randomUUID();change(r);await bad(put(r),'CONFLICT');
   }
  });
  await test('conflicting request across new intent rolls back candidate payload',async()=>{
   const r=request(fixture.tenant);r.request_id=fixture.baseline.request_id;
   await bad(put(r),'CONFLICT');assert.equal(await count('connector_dispatch_payload',fixture.tenant,r.binding.intent_id),0);
  });
  await test('same intent with independent request keys and conflicting concurrent content',async()=>{
   const r=request(fixture.tenant), altered=structuredClone(r);altered.request_id=randomUUID();altered.grant_id=randomUUID();
   const race=await Promise.allSettled([put(r),put(altered)]);assert.equal(race.filter(x=>x.status==='fulfilled').length,1);
   assert.equal(race.find(x=>x.status==='rejected').reason.code,'CONFLICT');
   const shared=request(fixture.tenant);
   await Promise.all(Array.from({length:8},()=>put({...shared,request_id:randomUUID()})));
   assert.equal(await count('connector_dispatch_payload',fixture.tenant,shared.binding.intent_id),1);
   assert.equal(await count('connector_payload_request',fixture.tenant,shared.binding.intent_id),8);
  });
  await test('tenant isolation, system denial and consumed grant replay-only',async()=>{
   await bad(store.persistAuthorizedPayload(fixture.other,fixture.baseline,'issued'),'FORBIDDEN');
   for(const tenant of ['',system]) await bad(store.persistAuthorizedPayload(tenant,fixture.baseline,'issued'),'FORBIDDEN');
   const original=request(fixture.tenant);await put(original);
   const foreign=structuredClone(original);foreign.binding.tenant_id=fixture.other;
   await bad(put(foreign,'consumed'),'CONFLICT');await put(foreign);await put(foreign,'consumed');
   await bad(put(request(fixture.tenant),'consumed'),'CONFLICT');await put(fixture.baseline,'consumed');
   assert.equal(await count('connector_dispatch_payload',fixture.other,original.binding.intent_id),1);
  });
  await test('schema, digest, unknown fields and UTF16 compatibility validation',async()=>{
   for(const change of [r=>{r.extra=true;},r=>{r.binding.payload_digest='a'.repeat(64);},r=>{r.payload.message.text='😀'.repeat(2001);r.binding.payload_digest=hash(canonical(r.payload));},r=>{r.binding.owner_revision='100000000000000000000';}]) {
    const r=request(fixture.tenant);change(r);await assert.rejects(put(r));assert.equal(await count('connector_dispatch_payload',fixture.tenant,r.binding.intent_id),0);
   }
  });
  await test('connection loss rolls back uncommitted request and fresh process replays committed receipt',async()=>{
   const key=randomUUID(), c=await runtime.getConnection();await c.beginTransaction();
   await c.execute('INSERT INTO connector_payload_request VALUES (?,?,?,?,UTC_TIMESTAMP(6))',[fixture.tenant,key,fixture.baseline.binding.intent_id,'a'.repeat(64)]);
   c.destroy();
   const [[row]]=await operator.query('SELECT COUNT(*) n FROM connector_payload_request WHERE tenant_id=? AND request_id=?',[fixture.tenant,key]);assert.equal(Number(row.n),0);
   const child=spawnSync(process.execPath,['scripts/connector-payload-test.mjs','--replay'],{encoding:'utf8',windowsHide:true,timeout:30000});
   assert.equal(child.status,0);assert.match(child.stdout,/fresh-process-replay/);
  });
  await test('connection failure before or after commit preserves atomic payload plus request',async()=>{
   for(const afterCommit of [false,true]) {
    const r=request(fixture.tenant);
    const faultPool={getConnection:async()=>{
     const c=await runtime.getConnection(), commit=c.commit.bind(c);
     c.commit=async()=>{if(afterCommit) await commit();c.destroy();throw new Error('SYNTHETIC_CONNECTION_LOSS');};
     return c;
    }};
    await assert.rejects(new PayloadStore(faultPool).persistAuthorizedPayload(fixture.tenant,r,'issued'));
    assert.equal(await count('connector_dispatch_payload',fixture.tenant,r.binding.intent_id),afterCommit?1:0);
    assert.equal(await count('connector_payload_request',fixture.tenant,r.binding.intent_id),afterCommit?1:0);
    await put(r);await put(r,'consumed');
   }
  });
  await test('stored payload corruption rejected and synthetic row repaired by operator',async()=>{
   const r=request(fixture.tenant);await put(r);
   try {
    await operator.execute("UPDATE connector_dispatch_payload SET payload=JSON_OBJECT('version',1) WHERE tenant_id=? AND intent_id=?",[fixture.tenant,r.binding.intent_id]);
    await bad(put(r),'CONFLICT');
   } finally {await operator.execute('UPDATE connector_dispatch_payload SET payload=? WHERE tenant_id=? AND intent_id=?',[canonical(r.payload),fixture.tenant,r.binding.intent_id]);}
   await put(r,'consumed');
  });
  await test('runtime least privilege and same-tenant FK/NOT NULL constraints',async()=>{
   for(const sql of ["UPDATE connector_dispatch_payload SET actor_kind='human' WHERE 1=0",'DELETE FROM connector_payload_request WHERE 1=0','CREATE TABLE connector_payload_forbidden (id INT)','SELECT id FROM native_identity_test.tenant LIMIT 1']) await assert.rejects(runtime.query(sql),e=>[1142,1044].includes(e.errno));
   await assert.rejects(runtime.execute('INSERT INTO connector_payload_request VALUES (NULL,?,?,?,UTC_TIMESTAMP(6))',[randomUUID(),fixture.baseline.binding.intent_id,'a'.repeat(64)]),e=>e.errno===1048);
   const r=request(fixture.tenant);await put(r);
   await assert.rejects(runtime.execute('INSERT INTO connector_payload_request VALUES (?,?,?,?,UTC_TIMESTAMP(6))',[fixture.other,randomUUID(),r.binding.intent_id,'a'.repeat(64)]),e=>e.errno===1452);
  });
  await test('bounded unique query plans and final legacy preservation',async()=>{
   const plans=[];
   for(const [table,key,value] of [['connector_dispatch_payload','intent_id',fixture.baseline.binding.intent_id],['connector_payload_request','request_id',fixture.baseline.request_id]]) {
    const [rows]=await runtime.query(`EXPLAIN SELECT * FROM ${table} WHERE tenant_id=? AND ${key}=?`,[fixture.tenant,value]);assert.equal(rows[0].key,'PRIMARY');assert.equal(rows[0].type,'const');plans.push({table,key:rows[0].key,type:rows[0].type,rows:rows[0].rows});
   }
   assert.deepEqual(await snapshot(),before);await writeFile(dir+'/plans.json',JSON.stringify(plans,null,2));
  });
  await writeFile(dir+'/native.json',JSON.stringify({node:process.version,database,results,preservedData:true,legacy:before,scope:'storage only; no native authorization, HTTP, cancellation, provider or backup restore'},null,2));
 }
} catch(e) { console.error('CONNECTOR_PAYLOAD_TEST_FAILED',e.code??e.name);process.exitCode=1; }
finally { await Promise.all([runtime?.end(),operator?.end(),identity?.end()]); }
