import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {migrate,migrations,ready} from '../services/crm-connector/dist/schema.js';
import {PayloadStore} from '../services/crm-connector/dist/payload-store.js';
import {PreparationStore} from '../services/crm-connector/dist/preparation-store.js';
import {AttemptStore} from '../services/crm-connector/dist/attempt-store.js';
import {AttemptExecutor} from '../services/crm-connector/dist/attempt-executor.js';
import {canonical,hash} from '../services/crm-connector/dist/validation.js';

const require=createRequire(new URL('../services/crm-connector/package.json',import.meta.url)),{createPool}=require('mysql2/promise');
const env=parseEnv(await readFile('.local/native-auth-test.env','utf8')),fixture=JSON.parse(await readFile('.local/connector-payload-fixture.json','utf8'));
assert.equal(env.MYSQL_HOST,'127.0.0.1');assert.equal(env.MYSQL_PORT,'13306');assert.equal(env.MYSQL_DATABASE,'native_identity_test');assert.equal(env.MYSQL_MIGRATION_USER,'native_test_operator');assert.match(fixture.password,/^[a-f0-9]{64}$/);
const dir='artifacts/connector-attempt',file='.local/connector-attempt-fixture.json';
const config={host:'127.0.0.1',port:13306,database:'native_connector_test',timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,connectionLimit:16};
const operator=createPool({...config,user:env.MYSQL_MIGRATION_USER,password:env.MYSQL_MIGRATION_PASSWORD}),runtime=createPool({...config,user:'connector_payload_test',password:fixture.password});
const store=new AttemptStore(runtime),payloads=new PayloadStore(runtime),preparation=new PreparationStore(runtime);
const fresh=(tenant=fixture.tenant)=>{const r=structuredClone(fixture.baseline);r.request_id=randomUUID();r.grant_id=randomUUID();r.binding.tenant_id=tenant;r.binding.intent_id=randomUUID();r.binding.attempt_id=randomUUID();return r;};
const begin=r=>({schema_version:1,operation:'connector-begin',request_id:randomUUID(),binding:r.binding,grant_id:r.grant_id,claim_id:randomUUID()});
async function prepared(r=fresh()){await payloads.persistAuthorizedPayload(r.binding.tenant_id,r,'issued');await preparation.prepareAuthorized(r.binding.tenant_id,{schema_version:1,operation:'connector-prepare',request_id:randomUUID(),binding:r.binding,grant_id:r.grant_id});return begin(r);}
const row=async b=>{const [[r]]=await operator.query('SELECT * FROM connector_dispatch_guard WHERE tenant_id=? AND intent_id=?',[b.binding.tenant_id,b.binding.intent_id]);return r;};
const events=async b=>{const [r]=await operator.query('SELECT state,version,fence_id FROM connector_attempt_event WHERE tenant_id=? AND intent_id=? ORDER BY version',[b.binding.tenant_id,b.binding.intent_id]);return r;};
const read=b=>store.readAuthorized(b.binding.tenant_id,{schema_version:1,operation:'receipt-read',request_id:randomUUID(),binding:b.binding,receipt_id:b.binding.attempt_id});
const result=(b,outcome='unknown',provider='synthetic-provider')=>({schema_version:1,operation:'connector-result',request_id:randomUUID(),binding:b.binding,outcome,...(outcome==='sent'?{provider_message_id:provider}:{error_code:'DELIVERY_UNKNOWN'})});
const markUnknown=async b=>store.recordResultAuthorized(b.binding.tenant_id,result(b),(await row(b)).fence_id);
async function cancel(b){const c={schema_version:1,operation:'connector-cancel',request_id:randomUUID(),binding:b.binding,cancellation_id:randomUUID(),reason:'owner_changed'},asked={schema_version:1,operation:'cancellation-read',request_id:randomUUID(),binding:b.binding,cancellation_id:c.cancellation_id};return preparation.cancelAuthorized(b.binding.tenant_id,c,asked,{schema_version:1,request_id:asked.request_id,receipt_id:b.binding.intent_id,state:'cancelled',cancellation_id:c.cancellation_id,reason:c.reason});}
const bad=(p,code)=>assert.rejects(p,e=>e.code===code);
function ports(stats,overrides={}){return {authorizeBegin:async()=>{stats.auth++;},bindingActive:async()=>true,consume:async c=>{stats.consume++;return {schema_version:1,request_id:c.request_id,receipt_id:c.grant_id,state:'consumed',grant_id:c.grant_id,claim_id:c.claim_id,resource_context:{object_key:'conversation',owner_principal_id:c.binding.principal_id,owner_revision:c.binding.owner_revision,record_version:c.binding.record_version,team_id:null,shared_team_ids:[]}};},send:async()=>{stats.send++;return {provider_message_id:'synthetic-provider'};},...overrides};}
const stats=()=>({auth:0,consume:0,send:0});
let current='setup';const results=[];async function test(name,fn){current=name;await fn();results.push(name);console.log('PASS '+name);}
try{
 await mkdir(dir,{recursive:true});
 let retained;try{retained=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;const p=fresh();retained={payload:p,begin:begin(p)};await writeFile(file,JSON.stringify(retained),{flag:'wx',mode:0o600});}
 if(process.argv.includes('--replay')){const calls=stats();const response=await new AttemptExecutor(store,ports(calls)).execute(fixture.tenant,retained.begin);assert.equal(response.state,'sent');assert.equal(calls.send,0);assert.equal(calls.consume,0);console.log('fresh-process-no-send');}
 else{
  const identity=createPool({...config,database:'native_identity_test',user:env.MYSQL_MIGRATION_USER,password:env.MYSQL_MIGRATION_PASSWORD});
  try{for(const [id,kind] of [[fixture.tenant,'business'],[fixture.other,'business'],['01900000-0000-7000-8000-000000000001','system']]){const [[r]]=await identity.query('SELECT id FROM tenant WHERE id=? AND tenant_id=id AND kind=?',[id,kind]);assert.equal(r?.id,id);}}finally{await identity.end();}
  await test('populated Connector schema preserves old values and history through current forward migrations',async()=>{
   const tables=['connector_connection','connector_delivery','connector_audit','connector_meta_page','connector_meta_event','connector_meta_audit','connector_dispatch_payload','connector_payload_request','connector_dispatch_guard','connector_dispatch_request'];
   const saved=new Map();for(const table of tables){const [rows]=await operator.query('SELECT * FROM '+table);saved.set(table,rows);}
   const [old]=await operator.query('SELECT * FROM connector_schema_migration ORDER BY version');assert.ok(old.length>=4&&old.length<=migrations.length);
   const applied=await migrate(operator);assert.equal(applied,migrations.length-old.length);assert.equal(await migrate(operator),0);await ready(operator);
   const [now]=await operator.query('SELECT * FROM connector_schema_migration ORDER BY version');assert.deepEqual(now.slice(0,old.length),old);assert.equal(now[4].checksum,migrations[4].checksum);
   const preserved={};for(const [table,before] of saved){const [after]=await operator.query('SELECT * FROM '+table);const keys=Object.keys(before[0]??{});const normalized=after.map(r=>Object.fromEntries(keys.map(k=>[k,r[k]])));const digest=rows=>hash(canonical(rows.map(r=>canonical(r)).sort()));assert.equal(after.length,before.length);if(before.length)assert.equal(digest(normalized),digest(before));preserved[table]={count:before.length,digest:digest(before)};}
   const evidence=JSON.stringify({from:old.length,to:migrations.length,applied,preserved},null,2);await writeFile(dir+'/migration.json',evidence);if(applied)await writeFile(dir+'/migration-upgrade.json',evidence);
  });
  const provision=spawnSync('docker',['exec','-i','agentic-crm-mysql-1','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot'],{input:"GRANT SELECT, INSERT ON native_connector_test.connector_attempt_event TO 'connector_payload_test'@'%';",stdio:['pipe','pipe','pipe'],windowsHide:true,timeout:30000});assert.equal(provision.status,0);
  await test('retained synthetic executor completes once; fresh process cannot resend',async()=>{
   const b=retained.begin,p=retained.payload;await payloads.persistAuthorizedPayload(fixture.tenant,p,'issued');await preparation.prepareAuthorized(fixture.tenant,{schema_version:1,operation:'connector-prepare',request_id:randomUUID(),binding:b.binding,grant_id:b.grant_id});
   const before=(await row(b)).state,calls=stats(),executor=new AttemptExecutor(store,ports(calls));
   const first=await executor.execute(fixture.tenant,b);assert.equal(first.state,'sent');assert.equal(first.request_id,b.request_id);assert.equal('fence_id' in first,false);assert.equal(calls.send,before==='prepared'?1:0);assert.equal(calls.consume,before==='prepared'?1:0);
   assert.equal((await executor.execute(fixture.tenant,b)).state,'sent');assert.equal(calls.send,before==='prepared'?1:0);
   const child=spawnSync(process.execPath,['scripts/connector-attempt-test.mjs','--replay'],{encoding:'utf8',windowsHide:true,timeout:30000});assert.equal(child.status,0);assert.match(child.stdout,/fresh-process-no-send/);
  });
  await test('sixteen concurrent begin calls mint one live handle and one fence',async()=>{
   const b=await prepared(),race=await Promise.all(Array.from({length:16},()=>store.beginAuthorized(fixture.tenant,b)));assert.equal(race.filter(r=>r.live).length,1);assert.equal((await events(b)).length,1);
   const snapshot=await row(b);await store.beginAuthorized(fixture.tenant,{...b,request_id:randomUUID()});assert.equal((await row(b)).fence_id,snapshot.fence_id);assert.equal((await row(b)).deadline_at,snapshot.deadline_at);
   await bad(store.beginAuthorized(fixture.tenant,{...b,request_id:randomUUID(),claim_id:randomUUID()}),'CONFLICT');await bad(cancel(b),'INVALID_TRANSITION');await markUnknown(b);
  });
  await test('begin requires preparation; cancellation and immutable keys prevent rearm',async()=>{
   const p=fresh(),b=begin(p);await payloads.persistAuthorizedPayload(fixture.tenant,p,'issued');await bad(store.beginAuthorized(fixture.tenant,b),'INVALID_TRANSITION');
   await cancel(b);await bad(store.beginAuthorized(fixture.tenant,b),'INVALID_TRANSITION');
   const a=await prepared(),other=await prepared();await store.beginAuthorized(fixture.tenant,a);other.request_id=a.request_id;await bad(store.beginAuthorized(fixture.tenant,other),'CONFLICT');assert.equal((await row(other)).state,'prepared');assert.equal((await events(other)).length,0);await markUnknown(a);
  });
  await test('begin versus cancellation race has exactly one committed winner',async()=>{
   for(let i=0;i<8;i++){const b=await prepared(),race=await Promise.allSettled(i%2?[store.beginAuthorized(fixture.tenant,b),cancel(b)]:[cancel(b),store.beginAuthorized(fixture.tenant,b)]);
    assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal(race.find(r=>r.status==='rejected').reason.code,'INVALID_TRANSITION');
    const state=(await row(b)).state;assert.ok(['admitting','cancelled'].includes(state));assert.equal((await events(b)).length,state==='admitting'?1:0);if(state==='admitting')await markUnknown(b);
   }
  });
  await test('opaque handles are one-use, cannot be copied or moved between store instances',async()=>{
   const b=await prepared(),s=new AttemptStore(runtime),admitted=await s.beginAuthorized(fixture.tenant,b);
   await bad(new AttemptStore(runtime).startLive(admitted.live),'INVALID_TRANSITION');await bad(s.startLive(JSON.parse(JSON.stringify(admitted.live))),'INVALID_TRANSITION');
   const permit=await s.startLive(admitted.live);await bad(s.startLive(admitted.live),'INVALID_TRANSITION');await bad(s.takeLivePayload({...permit}),'INVALID_TRANSITION');
   assert.equal((await s.takeLivePayload(permit)).message.text,fixture.baseline.payload.message.text);await bad(s.takeLivePayload(permit),'INVALID_TRANSITION');await markUnknown(b);
  });
  await test('monotonic and database deadline boundaries deny start or send',async()=>{
   let clock=0;const s=new AttemptStore(runtime,()=>clock),b=await prepared(),a=await s.beginAuthorized(fixture.tenant,b);clock=5000;await bad(s.startLive(a.live),'EXPIRED');await markUnknown(b);
   clock=0;const b2=await prepared(),a2=await s.beginAuthorized(fixture.tenant,b2),permit=await s.startLive(a2.live);clock=5000;await bad(s.takeLivePayload(permit),'EXPIRED');await markUnknown(b2);
   const b3=await prepared(),a3=await store.beginAuthorized(fixture.tenant,b3);await operator.execute('UPDATE connector_dispatch_guard SET deadline_at=TIMESTAMPADD(SECOND,-1,UTC_TIMESTAMP(6)) WHERE tenant_id=? AND intent_id=?',[fixture.tenant,b3.binding.intent_id]);await bad(store.startLive(a3.live),'EXPIRED');await markUnknown(b3);
  });
  await test('lost begin or start commit ACK leaves no recoverable local capability',async()=>{
   for(const atStart of [false,true]){let fault=!atStart;const pool={getConnection:async()=>{const c=await runtime.getConnection();if(fault){const commit=c.commit.bind(c);c.commit=async()=>{await commit();c.destroy();throw new Error('SYNTHETIC_LOST_ACK');};}return c;}},s=new AttemptStore(pool),b=await prepared();
    if(atStart){const a=await s.beginAuthorized(fixture.tenant,b);fault=true;await assert.rejects(s.startLive(a.live));await bad(s.startLive(a.live),'INVALID_TRANSITION');}else await assert.rejects(s.beginAuthorized(fixture.tenant,b));
    assert.equal((await row(b)).state,atStart?'started':'admitting');const replay=await new AttemptStore(runtime).beginAuthorized(fixture.tenant,b);assert.equal(replay.live,undefined);await markUnknown(b);
   }
  });
  await test('executor races call consume/send once and audit each transition',async()=>{
   const b=await prepared(),calls=stats(),executor=new AttemptExecutor(store,ports(calls));const replies=await Promise.all(Array.from({length:12},()=>executor.execute(fixture.tenant,b)));for(const r of replies)assert.equal(r.request_id,b.request_id);assert.equal(calls.send,1);assert.equal(calls.consume,1);assert.equal((await read(b)).state,'sent');assert.deepEqual((await events(b)).map(e=>e.state),['admitting','started','sent']);
  });
  await test('payload corruption before start or take consumes capability without sending',async()=>{
   for(const beforeStart of [true,false]){const p=fresh(),b=await prepared(p),admitted=await store.beginAuthorized(fixture.tenant,b);const permit=beforeStart?null:await store.startLive(admitted.live);
    try{await operator.execute("UPDATE connector_dispatch_payload SET payload=JSON_OBJECT('version',1) WHERE tenant_id=? AND intent_id=?",[fixture.tenant,b.binding.intent_id]);
     if(beforeStart){await bad(store.startLive(admitted.live),'CONFLICT');await bad(store.startLive(admitted.live),'INVALID_TRANSITION');}else{await bad(store.takeLivePayload(permit),'CONFLICT');await bad(store.takeLivePayload(permit),'INVALID_TRANSITION');}
    }finally{await operator.execute('UPDATE connector_dispatch_payload SET payload=? WHERE tenant_id=? AND intent_id=?',[canonical(p.payload),fixture.tenant,b.binding.intent_id]);}await markUnknown(b);
   }
  });
  await test('result transaction lost before commit rolls back state receipt and audit',async()=>{
   const b=await prepared(),a=await store.beginAuthorized(fixture.tenant,b);await store.startLive(a.live);const original=await events(b),fence=(await row(b)).fence_id;
   const faultPool={getConnection:async()=>{const c=await runtime.getConnection();c.commit=async()=>{c.destroy();throw new Error('SYNTHETIC_PRECOMMIT_LOSS');};return c;}};
   const r=result(b,'sent');await assert.rejects(new AttemptStore(faultPool).recordResultAuthorized(fixture.tenant,r,fence));assert.equal((await row(b)).state,'started');assert.deepEqual(await events(b),original);
   const [[receipt]]=await operator.query("SELECT COUNT(*) n FROM connector_dispatch_request WHERE tenant_id=? AND operation='attempt-result' AND request_id=?",[fixture.tenant,r.request_id]);assert.equal(Number(receipt.n),0);await store.recordResultAuthorized(fixture.tenant,r,fence);
  });
  await test('authorization denial, revoked binding and invalid/lost consume reply never send',async()=>{
   const denied=await prepared(),calls=stats();await assert.rejects(new AttemptExecutor(store,ports(calls,{authorizeBegin:async()=>{throw new Error('DENIED');}})).execute(fixture.tenant,denied));assert.equal((await row(denied)).state,'prepared');assert.equal(calls.send,0);
   for(const mode of ['binding','consume-throw','mismatch','disable-after-consume']){const b=await prepared(),n=stats(),normal=ports(n);let checks=0;
    const overrides=mode==='binding'?{bindingActive:async()=>false}:mode==='consume-throw'?{consume:async()=>{throw new Error('LOST_ACK');}}:mode==='mismatch'?{consume:async c=>({...await normal.consume(c),claim_id:randomUUID()})}:{bindingActive:async()=>++checks===1};
    assert.equal((await new AttemptExecutor(store,ports(n,overrides)).execute(fixture.tenant,b)).state,'unknown');assert.equal(n.send,0);assert.equal((await store.beginAuthorized(fixture.tenant,b)).live,undefined);
   }
  });
  await test('consume and provider timeouts never retry; late positive result can reconcile',async()=>{
   for(const target of ['consume','send']){const b=await prepared(),n=stats(),override=target==='consume'?{consume:async()=>new Promise(()=>{})}:{send:async()=>{n.send++;return new Promise(()=>{});}};
    assert.equal((await new AttemptExecutor(store,ports(n,override)).execute(fixture.tenant,b)).state,'unknown');assert.equal(n.send,target==='send'?1:0);await new AttemptExecutor(store,ports(n)).execute(fixture.tenant,b);assert.equal(n.send,target==='send'?1:0);
   }
  });
  await test('positive result persistence ACK loss cannot downgrade sent or invoke again',async()=>{
   class LostResultStore extends AttemptStore{async recordResultAuthorized(t,r,f){const value=await super.recordResultAuthorized(t,r,f);if(r.outcome==='sent')throw new Error('SYNTHETIC_RESULT_ACK_LOSS');return value;}}
   const s=new LostResultStore(runtime),b=await prepared(),n=stats(),executor=new AttemptExecutor(s,ports(n));assert.equal((await executor.execute(fixture.tenant,b)).state,'sent');await executor.execute(fixture.tenant,b);assert.equal(n.send,1);assert.deepEqual((await events(b)).map(e=>e.state),['admitting','started','sent']);
  });
  await test('tenant-bounded expired recovery keeps unknown terminal until matching sent evidence',async()=>{
   const b=await prepared(),foreign=await prepared(fresh(fixture.other));const admitted=await store.beginAuthorized(fixture.tenant,b),permit=await store.startLive(admitted.live);await store.beginAuthorized(fixture.other,foreign);
   for(const item of [b,foreign])await operator.execute('UPDATE connector_dispatch_guard SET deadline_at=TIMESTAMPADD(SECOND,-1,UTC_TIMESTAMP(6)) WHERE tenant_id=? AND intent_id=?',[item.binding.tenant_id,item.binding.intent_id]);
   for(let i=0;i<100&&(await row(b)).state!=='unknown';i++)assert.ok(await store.recoverExpired(fixture.tenant,1)<=1);
   assert.equal((await row(b)).state,'unknown');assert.equal((await row(foreign)).state,'admitting');await bad(store.takeLivePayload(permit),'INVALID_TRANSITION');const version=(await row(b)).version;await store.recoverExpired(fixture.tenant);assert.equal((await row(b)).version,version);
   const fence=(await row(b)).fence_id,sent=result(b,'sent');await bad(store.recordResultAuthorized(fixture.tenant,sent,randomUUID()),'CONFLICT');await store.recordResultAuthorized(fixture.tenant,sent,fence);await store.recordResultAuthorized(fixture.tenant,result(b),fence);assert.equal((await read(b)).state,'sent');
   await bad(store.recordResultAuthorized(fixture.tenant,result(b,'sent','conflicting-provider'),fence),'CONFLICT');await bad(store.recordResultAuthorized(fixture.tenant,{...sent,provider_message_id:'changed-same-key'},fence),'CONFLICT');await markUnknown(foreign);
  });
  await test('system/foreign context denied; two tenants can reuse IDs independently',async()=>{
   const b=await prepared();for(const tenant of ['',fixture.other,'01900000-0000-7000-8000-000000000001'])await bad(store.beginAuthorized(tenant,b),'FORBIDDEN');
   const calls=stats();await bad(new AttemptExecutor(store,ports(calls)).execute(fixture.other,b),'FORBIDDEN');assert.equal(calls.auth,0);
   await store.beginAuthorized(fixture.tenant,b);const p=fresh(fixture.other);p.binding={...b.binding,tenant_id:fixture.other};p.grant_id=b.grant_id;await prepared(p);const other={...b,binding:p.binding};assert.ok((await store.beginAuthorized(fixture.other,other)).live);await markUnknown(b);await markUnknown(other);
   await bad(store.recoverExpired('01900000-0000-7000-8000-000000000001'),'FORBIDDEN');await bad(store.recoverExpired(fixture.tenant,101),'INVALID_REQUEST');
  });
  await test('native audit append-only grants, lifecycle CHECK and recovery query plan',async()=>{
   const [grants]=await runtime.query('SHOW GRANTS');assert.equal(grants.length,6);
   for(const sql of ['UPDATE connector_attempt_event SET state=state WHERE 1=0','DELETE FROM connector_attempt_event WHERE 1=0','CREATE TABLE forbidden_attempt(id INT)','SELECT id FROM native_identity_test.tenant LIMIT 1'])await assert.rejects(runtime.query(sql),e=>[1142,1044].includes(e.errno));
   const b=await prepared();await assert.rejects(runtime.execute("UPDATE connector_dispatch_guard SET state='started' WHERE tenant_id=? AND intent_id=?",[fixture.tenant,b.binding.intent_id]),e=>e.errno===3819);
   const [plans]=await runtime.query("EXPLAIN SELECT * FROM connector_dispatch_guard WHERE tenant_id=? AND state IN ('admitting','started') AND deadline_at<=UTC_TIMESTAMP(6) ORDER BY deadline_at,intent_id LIMIT 100",[fixture.tenant]);assert.equal(plans[0].key,'ix_dispatch_guard_recovery');await writeFile(dir+'/plans.json',JSON.stringify(plans.map(p=>({key:p.key,type:p.type,rows:p.rows,extra:p.Extra})),null,2));
  });
  await writeFile(dir+'/native.json',JSON.stringify({node:process.version,results,preservedData:true,scope:'real MySQL and compiled executor with synthetic authority/provider callbacks; no native mTLS/provider deployment'},null,2));
 }
}catch(e){console.error('CONNECTOR_ATTEMPT_TEST_FAILED',current,e.code??e.name);process.exitCode=1;}
finally{await Promise.all([operator.end(),runtime.end()]);}
