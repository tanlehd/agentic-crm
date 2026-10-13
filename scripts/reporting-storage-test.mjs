import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID,randomBytes,createHmac} from 'node:crypto';
import {createRequire} from 'node:module';
import {ReportingStore} from '../services/reporting/dist/storage.js';
import {AdmissionVerifier,hash,systemTenant} from '../services/reporting/dist/storage-security.js';
import {ReportingController,ReportingRuntime,storageJsonBody} from '../services/reporting/dist/http.js';
import {connect,migrate} from './lib/reporting-database.mjs';
const require=createRequire(new URL('../apps/backend/package.json',import.meta.url));
const {Module}=require('@nestjs/common'),{NestFactory}=require('@nestjs/core');
const env=parseEnv(await readFile('.local/reporting-test.env','utf8'));assert.equal(env.REPORTING_DB_NAME,'test_crm_reporting');
const operator=await connect(env),runtime=await connect(env,'RUNTIME');let store=new ReportingStore(env),app;
const fixtureFile='.local/reporting-storage-fixture.json';let fixture;
try{fixture=JSON.parse(await readFile(fixtureFile,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;fixture={tenantId:randomUUID(),otherTenant:randomUUID(),principalId:randomUUID(),otherPrincipal:randomUUID()};await writeFile(fixtureFile,JSON.stringify(fixture),{flag:'wx'});}
const base={audience:'reporting-definition-v1',tenantId:fixture.tenantId,principalId:fixture.principalId,authRevision:'1',readScope:'own',designScope:'own'};
const admission=(op,patch={})=>({...base,bodyHash:hash(JSON.stringify(op)),issuedAt:Date.now(),expiresAt:Date.now()+5000,...patch});
const run=(op,patch={})=>store.execute(admission(op,patch),op),bad=(fn,code)=>assert.rejects(fn,e=>e.code===code);
const groups=[];async function test(name,fn){await fn();groups.push(name);console.log('PASS '+name);}
const draft=name=>({kind:'create',key:randomUUID(),body:{name,definition:{model:'future-model',incomplete:true}}});
let created,createOp;
try{
 await test('concurrent create serializes and durable replay has one version/event/receipt',async()=>{
  createOp=draft('Synthetic report');const race=await Promise.all([run(createOp),run(createOp)]);assert.deepEqual(race[0],race[1]);created=race[0];assert.equal(created.version,'1');assert.equal(created.validation_state,'unvalidated');assert.equal(created.execution_enabled,false);
  for(const table of ['report_version','report_audit_entry','report_outbox_event','report_command_receipt']){const [[r]]=await operator.execute(`SELECT COUNT(*) n FROM ${table} WHERE tenant_id=? AND report_id=?`,[base.tenantId,created.id]);assert.equal(Number(r.n),1);}
  await bad(()=>run({...createOp,body:{...createOp.body,name:'Conflicting'}}),'IDEMPOTENCY_CONFLICT');
 });
 await test('CAS race has one winner and preserves immutable history/catalog',async()=>{
  const update={kind:'update',id:created.id,expectedRevision:'1',body:{name:'Edited',definition:{encodings:{x:'campaign'}}}};
  const results=await Promise.allSettled([run({...update,key:randomUUID()}),run({...update,key:randomUUID()})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'VERSION_CONFLICT');
  const old=await run({kind:'version',id:created.id,version:'1'});assert.equal(old.name,created.name);assert.deepEqual(old.definition,created.definition);assert.equal(old.catalog_hash,created.catalog_hash);assert.equal(old.revision,'2');
  const [[catalog]]=await operator.execute('SELECT payload FROM report_catalog_version WHERE tenant_id=? AND hash=?',[base.tenantId,created.catalog_hash]);const {canonical}=await import('../services/reporting/dist/registry.js');assert.equal(hash(canonical(typeof catalog.payload==='string'?JSON.parse(catalog.payload):catalog.payload)),created.catalog_hash);
 });
 await test('own/all access, tenant isolation, historical ACL and keyset list',async()=>{
  const get={kind:'get',id:created.id};await bad(()=>run(get,{principalId:fixture.otherPrincipal}),'NOT_FOUND');await bad(()=>run({...get,kind:'version',version:'1'},{principalId:fixture.otherPrincipal}),'NOT_FOUND');
  assert.equal((await run(get,{principalId:fixture.otherPrincipal,readScope:'all'})).id,created.id);await bad(()=>run(get,{tenantId:fixture.otherTenant,readScope:'all'}),'NOT_FOUND');await bad(()=>run(get,{readScope:'none'}),'FORBIDDEN');
  const other=await run(draft('Other owner'),{principalId:fixture.otherPrincipal});const ids=[];let after;do{const page=await run({kind:'list',limit:2,...(after?{after}:{})});ids.push(...page.items.map(r=>r.id));after=page.next_after;}while(after);assert(ids.includes(created.id));assert(!ids.includes(other.id));assert.equal(new Set(ids).size,ids.length);assert.deepEqual(ids,[...ids].sort());
  assert((await run({kind:'list',limit:100},{readScope:'all'})).items.some(r=>r.id===other.id));
 });
 await test('archive/restore CAS and replay preserve edit versions',async()=>{
  const op={kind:'archive',id:created.id,key:randomUUID(),expectedRevision:'2',body:{archived:true}};const archived=await run(op);assert.equal(archived.revision,'3');assert.equal(archived.version,'2');assert.equal(archived.archived,true);assert.deepEqual(await run(op),archived);
  await bad(()=>run({kind:'update',id:created.id,key:randomUUID(),expectedRevision:'3',body:{name:'No',definition:{}}}),'REPORT_ARCHIVED');
  const restored=await run({...op,key:randomUUID(),expectedRevision:'3',body:{archived:false}});assert.equal(restored.revision,'4');assert.equal(restored.version,'2');assert.equal(restored.archived,false);
 });
 await test('cross-report idempotency collision rolls back head and all side effects',async()=>{
  const other=await run(draft('Rollback target'));const op={kind:'update',id:other.id,key:createOp.key,expectedRevision:'1',body:{name:'Must rollback',definition:{}}};await bad(()=>run(op),'IDEMPOTENCY_CONFLICT');assert.equal((await run({kind:'get',id:other.id})).name,'Rollback target');
  const [[r]]=await operator.execute('SELECT COUNT(*) n FROM report_version WHERE tenant_id=? AND report_id=?',[base.tenantId,other.id]);assert.equal(Number(r.n),1);
 });
 await test('admission expiring behind a row lock rolls back before commit',async()=>{
  await operator.beginTransaction();await operator.execute('SELECT id FROM report_definition WHERE tenant_id=? AND id=? FOR UPDATE',[base.tenantId,created.id]);
  const op={kind:'update',id:created.id,key:randomUUID(),expectedRevision:'4',body:{name:'Expired',definition:{}}};const pending=bad(()=>store.execute(admission(op,{expiresAt:Date.now()+150}),op),'ADMISSION_EXPIRED_OR_INVALID');
  await new Promise(r=>setTimeout(r,250));await operator.rollback();await pending;assert.equal((await run({kind:'get',id:created.id})).revision,'4');
 });
 await test('runtime cannot mutate immutable tables, DDL, journal or other databases',async()=>{
  for(const table of ['report_catalog_version','report_version','report_command_receipt','report_audit_entry','report_outbox_event']){await assert.rejects(runtime.query(`UPDATE ${table} SET tenant_id=tenant_id WHERE 1=0`),e=>e.code==='ER_TABLEACCESS_DENIED_ERROR');await assert.rejects(runtime.query(`DELETE FROM ${table} WHERE 1=0`),e=>e.code==='ER_TABLEACCESS_DENIED_ERROR');}
  for(const sql of ['CREATE TABLE denied_test(id INT)','SELECT * FROM schema_migration','SELECT * FROM agentic_crm.tenant','DELETE FROM report_definition WHERE 1=0'])await assert.rejects(runtime.query(sql),e=>['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(e.code));
  const [missing]=await operator.query("SELECT TABLE_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND COLUMN_NAME='tenant_id' AND IS_NULLABLE<>'NO'");assert.equal(missing.length,0);
  for(const tenant of [systemTenant,'00000000-0000-0000-0000-000000000000'])await assert.rejects(operator.execute("INSERT INTO report_catalog_version VALUES (?,?,'{}',UTC_TIMESTAMP(6))",[tenant,'f'.repeat(64)]),e=>e.code==='ER_CHECK_CONSTRAINT_VIOLATED');
 });
 await test('migration repeat preserves every existing row and reconnect replays receipts',async()=>{
  const tables=['report_catalog_version','report_definition','report_version','report_command_receipt','report_audit_entry','report_outbox_event'];const fingerprints=async()=>Promise.all(tables.map(async t=>{const [r]=await operator.query(`SELECT * FROM ${t}`);return hash(JSON.stringify(r.map(x=>JSON.stringify(x)).sort()));}));const before=await fingerprints();assert.equal((await migrate(operator)).applied,0);assert.deepEqual(await fingerprints(),before);
  await store.close();store=new ReportingStore(env);assert.deepEqual(await run(createOp),created);
  const [plan]=await operator.execute('EXPLAIN SELECT id FROM report_definition WHERE tenant_id=? AND owner_principal_id=? AND id>? ORDER BY id LIMIT 51',[base.tenantId,base.principalId,'']);assert(plan[0].possible_keys.includes('ix_report_owner')); 
 });
 const key=randomBytes(32).toString('hex'),verifier=new AdmissionVerifier(key);
 class TestModule{}Module({controllers:[ReportingController],providers:[{provide:ReportingRuntime,useValue:{store,verifier}}]})(TestModule);app=await NestFactory.create(TestModule,{logger:false,bodyParser:false});storageJsonBody(app);await app.listen(0,'127.0.0.1');const url=(await app.getUrl())+'/internal/v1/reporting/definitions';
 const signed=(raw,patch={})=>{const payload=Buffer.from(JSON.stringify({...admission(JSON.parse(raw)),bodyHash:hash(raw),...patch})).toString('base64url');return payload+'.'+createHmac('sha256',Buffer.from(key,'hex')).update(payload).digest('hex');};
 const request=(raw,token=signed(raw),headers={})=>fetch(url,{method:'POST',headers:{'content-type':'application/json','x-reporting-admission':token,...headers},body:raw});
 await test('real private HTTP validates signature, exact raw body, expiry, audience and spoofing',async()=>{
  const raw=JSON.stringify({kind:'get',id:created.id},null,2);assert.equal((await request(raw)).status,200);assert.equal((await request(raw,'forged')).status,401);assert.equal((await request(raw,signed(raw,{audience:'other'}))).status,401);assert.equal((await request(raw,signed(raw,{expiresAt:Date.now()-1}))).status,401);assert.equal((await request(raw+' ',signed(raw))).status,401);
  for(const headers of [{cookie:'crm_session=spoof'},{origin:'http://localhost'},{'x-tenant-id':base.tenantId}])assert.equal((await request(raw,signed(raw),headers)).status,403);
  assert.equal((await request(JSON.stringify({kind:'get',id:created.id,tenantId:base.tenantId}))).status,400);assert.equal((await request('{','invalid')).status,400);assert.equal((await request('x'.repeat(100000),'invalid')).status,413);
 });
 await mkdir('artifacts/reporting-storage',{recursive:true});await writeFile('artifacts/reporting-storage/mysql.json',JSON.stringify({at:new Date().toISOString(),database:env.REPORTING_DB_NAME,groups,passed:groups.length},null,2));console.log(JSON.stringify({passed:groups.length}));
}finally{await app?.close();await store.close();await operator.end();await runtime.end();}
