import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {migrate,migrations,ready} from '../services/crm-connector/dist/schema.js';
import {PayloadStore} from '../services/crm-connector/dist/payload-store.js';
import {PreparationStore} from '../services/crm-connector/dist/preparation-store.js';
import {bindingFromRow} from '../services/crm-connector/dist/dispatch-guard.js';
import {canonical,hash} from '../services/crm-connector/dist/validation.js';

const require=createRequire(new URL('../services/crm-connector/package.json',import.meta.url));
const {createPool}=require('mysql2/promise');
const dir='artifacts/connector-preparation',file='.local/connector-preparation-fixture.json';
const env=parseEnv(await readFile('.local/native-auth-test.env','utf8'));
const fixture=JSON.parse(await readFile('.local/connector-payload-fixture.json','utf8'));
assert.equal(env.MYSQL_HOST,'127.0.0.1');assert.equal(env.MYSQL_PORT,'13306');assert.equal(env.MYSQL_DATABASE,'native_identity_test');assert.equal(env.MYSQL_MIGRATION_USER,'native_test_operator');
assert.match(fixture.password,/^[a-f0-9]{64}$/);
const options={host:'127.0.0.1',port:13306,database:'native_connector_test',timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,connectionLimit:16};
const operator=createPool({...options,user:env.MYSQL_MIGRATION_USER,password:env.MYSQL_MIGRATION_PASSWORD});
const runtime=createPool({...options,user:'connector_payload_test',password:fixture.password});
const identity=createPool({...options,database:'native_identity_test',user:env.MYSQL_MIGRATION_USER,password:env.MYSQL_MIGRATION_PASSWORD});
const store=new PreparationStore(runtime),payloads=new PayloadStore(runtime);
const fresh=()=>{const r=structuredClone(fixture.baseline);r.request_id=randomUUID();r.grant_id=randomUUID();r.binding.intent_id=randomUUID();r.binding.attempt_id=randomUUID();return r;};
const prepare=r=>({schema_version:1,operation:'connector-prepare',request_id:randomUUID(),binding:r.binding,grant_id:r.grant_id});
const cancel=r=>({schema_version:1,operation:'connector-cancel',request_id:randomUUID(),binding:r.binding,cancellation_id:randomUUID(),reason:'owner_changed'});
const proof=r=>({asked:{schema_version:1,operation:'cancellation-read',request_id:randomUUID(),binding:r.binding,cancellation_id:r.cancellation_id},reply:{schema_version:1,request_id:'',receipt_id:r.binding.intent_id,state:'cancelled',cancellation_id:r.cancellation_id,reason:r.reason}});
const cancelCall=(r,instance=store)=>{const p=proof(r);p.reply.request_id=p.asked.request_id;return instance.cancelAuthorized(r.binding.tenant_id,r,p.asked,p.reply);};
const stage=r=>payloads.persistAuthorizedPayload(r.binding.tenant_id,r,'issued');
const prep=r=>store.prepareAuthorized(r.binding.tenant_id,r);
const bad=(promise,code)=>assert.rejects(promise,e=>e.code===code);
const guard=async r=>{const [[row]]=await operator.query('SELECT * FROM connector_dispatch_guard WHERE tenant_id=? AND intent_id=?',[r.binding.tenant_id,r.binding.intent_id]);return row;};
const receiptCount=async r=>{const [[row]]=await operator.query('SELECT COUNT(*) n FROM connector_dispatch_request WHERE tenant_id=? AND intent_id=?',[r.binding.tenant_id,r.binding.intent_id]);return Number(row.n);};
let current='setup';const results=[];
async function test(name,fn){current=name;await fn();results.push(name);console.log('PASS '+name);}
try {
 await mkdir(dir,{recursive:true});
 let retained;
 try{retained=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;const r=fresh();retained={payload:r,cancellation:cancel(r)};await writeFile(file,JSON.stringify(retained),{flag:'wx',mode:0o600});}
 if(process.argv.includes('--replay')) {
  await cancelCall(retained.cancellation);await bad(stage(retained.payload),'INVALID_TRANSITION');console.log('fresh-process-terminal-cancellation');
 } else {
  for(const [id,kind] of [[fixture.tenant,'business'],[fixture.other,'business'],['01900000-0000-7000-8000-000000000001','system']]){const [[row]]=await identity.query('SELECT id FROM tenant WHERE tenant_id=id AND id=? AND kind=?',[id,kind]);assert.equal(row?.id,id);}
  const oldTables=['connector_connection','connector_delivery','connector_audit','connector_meta_page','connector_meta_event','connector_meta_audit','connector_dispatch_payload','connector_payload_request'];
  const snapshot=async()=>Object.fromEntries(await Promise.all(oldTables.map(async table=>{const [rows]=await operator.query('SELECT * FROM '+table);const serialized=rows.map(r=>canonical(r)).sort();return [table,{count:rows.length,digest:hash(canonical(serialized))}];})));
  const before=await snapshot();assert.ok(before.connector_dispatch_payload.count>0);
  await test('populated schema3 to4 preserves all old rows and backfills exact guards',async()=>{
   const [old]=await operator.query('SELECT * FROM connector_schema_migration ORDER BY version');assert.ok(old.length>=3&&old.length<=migrations.length);
   const applied=await migrate(operator);assert.equal(applied,migrations.length-old.length);assert.equal(await migrate(operator),0);await ready(operator);
   const [now]=await operator.query('SELECT * FROM connector_schema_migration ORDER BY version');assert.deepEqual(now.slice(0,old.length),old);assert.equal(now[3].checksum,migrations[3].checksum);
   assert.deepEqual(await snapshot(),before);
   const [rows]=await operator.query('SELECT * FROM connector_dispatch_payload');
   for(const row of rows){const g=await guard({binding:row});assert.ok(g);assert.deepEqual(bindingFromRow(g),bindingFromRow(row));if(old.length===3){assert.equal(g.state,'staged');assert.equal(String(g.version),'1');assert.equal(g.created_at,row.created_at);}}
   const evidence=JSON.stringify({from:old.length,to:migrations.length,applied,backfilledAtUpgrade:old.length===3?rows.length:0,preserved:before},null,2);
   await writeFile(dir+'/migration.json',evidence);
   if(old.length===3)await writeFile(dir+'/migration-upgrade.json',evidence);
  });
  const sql="GRANT SELECT, INSERT, UPDATE ON native_connector_test.connector_dispatch_guard TO 'connector_payload_test'@'%';\nGRANT SELECT, INSERT ON native_connector_test.connector_dispatch_request TO 'connector_payload_test'@'%';\nGRANT SELECT, INSERT ON native_connector_test.connector_attempt_event TO 'connector_payload_test'@'%';";
  const provision=spawnSync('docker',['exec','-i','agentic-crm-mysql-1','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot'],{input:sql,stdio:['pipe','pipe','pipe'],windowsHide:true,timeout:30000});assert.equal(provision.status,0);
  await test('retained cancel-before-payload blocks every late stage and prepare',async()=>{
   const r=retained.payload,c=retained.cancellation;
   await cancelCall(c);await cancelCall(c);const version=(await guard(r)).version;
   await cancelCall({...c,request_id:randomUUID()});assert.equal((await guard(r)).version,version);
   await bad(stage(r),'INVALID_TRANSITION');await bad(prep(prepare(r)),'INVALID_TRANSITION');
   assert.equal((await guard(r)).state,'cancelled');
  });
  await test('prepare validates staged payload, deduplicates then cancellation stays terminal',async()=>{
   const r=fresh(),p=prepare(r);await bad(prep(p),'CONFLICT');assert.equal(await guard(r),undefined);
   await stage(r);const replies=await Promise.all(Array.from({length:12},()=>prep(p)));for(const reply of replies)assert.deepEqual(reply,replies[0]);
   assert.equal(String((await guard(r)).version),'2');assert.equal(await receiptCount(r),1);
   await prep({...p,request_id:randomUUID()});assert.equal(String((await guard(r)).version),'2');
   await cancelCall(cancel(r));await bad(prep(p),'INVALID_TRANSITION');await bad(stage(r),'INVALID_TRANSITION');assert.equal(String((await guard(r)).version),'3');
  });
  await test('exact cancellation proof correlation and strict schemas reject mismatches',async()=>{
   const r=fresh(),c=cancel(r);
   for(const mutate of [p=>{p.reply.request_id=randomUUID();},p=>{p.reply.reason='conversation_closed';},p=>{p.reply.receipt_id=randomUUID();},p=>{p.reply.cancellation_id=randomUUID();},p=>{p.asked.binding={...p.asked.binding,conversation_id:randomUUID()};},p=>{p.reply.extra=true;}]){
    const p=proof(c);p.reply.request_id=p.asked.request_id;mutate(p);await assert.rejects(store.cancelAuthorized(fixture.tenant,c,p.asked,p.reply));assert.equal(await guard(r),undefined);
   }
   await assert.rejects(prep({...prepare(r),operation:'connector-begin'}));
  });
  await test('concurrent cancellation has one immutable proof and conflicting proof loses',async()=>{
   const r=fresh(),c=cancel(r);const replies=await Promise.all(Array.from({length:12},()=>cancelCall(c)));for(const reply of replies)assert.deepEqual(reply,replies[0]);
   assert.equal(await receiptCount(r),1);assert.equal(String((await guard(r)).version),'2');
   await bad(cancelCall({...c,request_id:randomUUID(),cancellation_id:randomUUID()}),'CONFLICT');
   await bad(cancelCall({...c,request_id:randomUUID(),reason:'authorization_revoked'}),'CONFLICT');
  });
  await test('stage/cancel and prepare/cancel races always finish cancelled without rearm',async()=>{
   for(let i=0;i<12;i++) {
    const r=fresh(),c=cancel(r),p=prepare(r);if(i%2)await stage(r);
    const race=await Promise.allSettled(i%2?[prep(p),cancelCall(c)]:[stage(r),cancelCall(c)]);
    assert.equal(race[1].status,'fulfilled');if(race[0].status==='rejected')assert.equal(race[0].reason.code,'INVALID_TRANSITION');
    assert.equal((await guard(r)).state,'cancelled');await bad(stage(r),'INVALID_TRANSITION');await bad(prep(p),'INVALID_TRANSITION');
   }
  });
  await test('request-key conflict rolls back cancellation and candidate guard atomically',async()=>{
   const a=fresh(),b=fresh(),ca=cancel(a);await cancelCall(ca);
   const cb=cancel(b);cb.request_id=ca.request_id;await bad(cancelCall(cb),'CONFLICT');assert.equal(await guard(b),undefined);
   const r=fresh(),p=prepare(r);await stage(r);await prep(p);
   const c=cancel(r);c.request_id=p.request_id;await cancelCall(c);assert.equal(await receiptCount(r),2);
   const a2=fresh(),b2=fresh(),p1=prepare(a2),p2=prepare(b2);await stage(a2);await stage(b2);await prep(p1);p2.request_id=p1.request_id;
   await bad(prep(p2),'CONFLICT');assert.equal((await guard(b2)).state,'staged');assert.equal(String((await guard(b2)).version),'1');
  });
  await test('two tenants reuse IDs independently; foreign/system context and changed binding denied',async()=>{
   const r=fresh(),c=cancel(r),p=proof(c);p.reply.request_id=p.asked.request_id;
   for(const tenant of [fixture.other,'','01900000-0000-7000-8000-000000000001'])await bad(store.cancelAuthorized(tenant,c,p.asked,p.reply),'FORBIDDEN');
   await cancelCall(c);const foreign=structuredClone(r);foreign.binding.tenant_id=fixture.other;await stage(foreign);await prep(prepare(foreign));
   assert.equal((await guard(r)).state,'cancelled');assert.equal((await guard(foreign)).state,'prepared');
   const altered={...c,request_id:randomUUID(),binding:{...c.binding,owner_revision:'1'}};await bad(cancelCall(altered),'CONFLICT');
   await bad(stage({...r,binding:{...r.binding,intent_id:randomUUID()}}),'CONFLICT');
  });
  await test('prepare rechecks grant and stored digest even on request replay',async()=>{
   const r=fresh(),p=prepare(r);await stage(r);await prep(p);
   await bad(prep({...p,request_id:randomUUID(),grant_id:randomUUID()}),'CONFLICT');
   try {await operator.execute("UPDATE connector_dispatch_payload SET payload=JSON_OBJECT('version',1) WHERE tenant_id=? AND intent_id=?",[fixture.tenant,r.binding.intent_id]);await bad(prep(p),'CONFLICT');}
   finally{await operator.execute('UPDATE connector_dispatch_payload SET payload=? WHERE tenant_id=? AND intent_id=?',[canonical(r.payload),fixture.tenant,r.binding.intent_id]);}
   await prep(p);
  });
  await test('lost connection before or after commit preserves guard and receipt together',async()=>{
   for(const committed of [false,true]) {
    const r=fresh(),c=cancel(r),faultPool={getConnection:async()=>{const conn=await runtime.getConnection(),commit=conn.commit.bind(conn);conn.commit=async()=>{if(committed)await commit();conn.destroy();throw new Error('SYNTHETIC_LOST_ACK');};return conn;}};
    await assert.rejects(cancelCall(c,new PreparationStore(faultPool)));
    assert.equal(Boolean(await guard(r)),committed);assert.equal(await receiptCount(r),committed?1:0);await cancelCall(c);await bad(stage(r),'INVALID_TRANSITION');
   }
   const child=spawnSync(process.execPath,['scripts/connector-preparation-test.mjs','--replay'],{encoding:'utf8',windowsHide:true,timeout:30000});assert.equal(child.status,0);assert.match(child.stdout,/fresh-process-terminal-cancellation/);
  });
  await test('runtime grants, same-tenant FK and incomplete in-flight state fail closed',async()=>{
   const [grants]=await runtime.query('SHOW GRANTS');assert.equal(grants.length,6);
   for(const row of grants)assert.match(String(Object.values(row)[0]),/^(GRANT USAGE ON \*\.\*|GRANT SELECT, INSERT ON `native_connector_test`\.`connector_(dispatch_payload|payload_request|dispatch_request|attempt_event)`|GRANT SELECT, INSERT, UPDATE ON `native_connector_test`\.`connector_dispatch_guard`)/);
   for(const sql of ['DELETE FROM connector_dispatch_guard WHERE 1=0','UPDATE connector_dispatch_request SET request_digest=request_digest WHERE 1=0','CREATE TABLE forbidden_preparation(id INT)','SELECT id FROM native_identity_test.tenant LIMIT 1'])await assert.rejects(runtime.query(sql),e=>[1142,1044].includes(e.errno));
   const r=fresh();await stage(r);
   await assert.rejects(runtime.execute("INSERT INTO connector_dispatch_request VALUES (?,?,?,'connector-prepare',?,UTC_TIMESTAMP(6))",[fixture.other,randomUUID(),r.binding.intent_id,'a'.repeat(64)]),e=>e.errno===1452);
   await assert.rejects(runtime.execute("UPDATE connector_dispatch_guard SET state='started' WHERE tenant_id=? AND intent_id=?",[fixture.tenant,r.binding.intent_id]),e=>e.errno===3819);
   const [plans]=await runtime.query('EXPLAIN SELECT * FROM connector_dispatch_guard WHERE tenant_id=? AND intent_id=?',[fixture.tenant,r.binding.intent_id]);assert.equal(plans[0].key,'PRIMARY');assert.equal(plans[0].type,'const');
   await writeFile(dir+'/plans.json',JSON.stringify(plans.map(p=>({key:p.key,type:p.type,rows:p.rows})),null,2));
  });
  await writeFile(dir+'/native.json',JSON.stringify({node:process.version,database:options.database,results,preservedData:true,scope:'preparation/cancellation storage only; native authority and in-flight dispatch not implemented'},null,2));
 }
}catch(e){console.error('CONNECTOR_PREPARATION_TEST_FAILED',current,e.code??e.name);process.exitCode=1;}
finally{await Promise.all([operator.end(),runtime.end(),identity.end()]);}
