import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {databaseSource} from '../services/core-baseline/dist/kernel/database/data-source.js';
import {migrate} from '../services/core-baseline/dist/kernel/database/migration-runner.js';
import {migrations,checksum} from '../services/core-baseline/dist/kernel/database/migrations.js';
import {identityDispatchPrivileges} from '../services/core-baseline/dist/kernel/database/identity-dispatch-grants.js';
import {IdentityDispatchLedger} from '../services/core-baseline/dist/modules/identity/dispatch-ledger.js';
import {withFieldPolicies} from '../services/core-baseline/dist/modules/crm/access.js';
import {NativeAuthService} from '../services/core-baseline/dist/modules/identity/auth/native-service.js';
import {nativeConfig} from '../services/core-baseline/dist/modules/identity/auth/native-config.js';
import {hash} from '../services/core-baseline/dist/modules/identity/auth/security.js';
import {canonical} from '../services/core-baseline/dist/kernel/reliability/commands.js';
const env=parseEnv(await readFile('.local/native-auth-test.env','utf8')),f=JSON.parse(await readFile('.local/identity-dispatch-fixture.json','utf8'));
assert.equal(env.APP_ENV,'test');assert.equal(env.MYSQL_DATABASE,'native_identity_test');assert.equal(env.MYSQL_HOST,'127.0.0.1');assert.equal(env.MYSQL_PORT,'13306');Object.assign(process.env,env);
const require=createRequire(new URL('../services/core-baseline/package.json',import.meta.url)),{createPool}=require('mysql2/promise');
const pool=createPool({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),database:env.MYSQL_DATABASE,user:env.MYSQL_MIGRATION_USER,password:env.MYSQL_MIGRATION_PASSWORD,timezone:'Z'});
const ds=databaseSource(true);await ds.initialize();const dir='artifacts/identity-dispatch-ledger',file='.local/identity-dispatch-ledger-fixture.json';await mkdir(dir,{recursive:true});
let saved;try{saved=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;saved={password:randomBytes(32).toString('hex')};await writeFile(file,JSON.stringify(saved),{flag:'wx',mode:0o600});}assert.match(saved.password,/^[a-f0-9]{64}$/);
const cfg=nativeConfig({APP_ENV:'test',APP_ORIGIN:'http://localhost:18080',SESSION_ENCRYPTION_KEY:f.sessionKey}),auth=new NativeAuthService(cfg,pool);
let sid,runtime,store,proofCalls=0;const claims=new Map(),results=[];
async function test(name,fn){await fn();results.push(name);console.log('PASS '+name);}
const bad=(p,code)=>assert.rejects(p,e=>e.code===code);
const fresh=()=>({schema_version:1,operation:'identity-issue',request_id:randomUUID(),binding:{tenant_id:f.tenant,principal_id:f.principal,actor_kind:'human',conversation_id:randomUUID(),crm_contact_id:randomUUID(),connection_id:randomUUID(),intent_id:randomUUID(),attempt_id:randomUUID(),delegation_id:randomUUID(),owner_revision:'1',record_version:'1',payload_digest:'a'.repeat(64)},resource_context:{object_key:'conversation',owner_principal_id:f.principal,owner_revision:'1',record_version:'1',team_id:f.team,shared_team_ids:[]}});
const proof=async r=>{proofCalls++;const p=claims.get(r.claim_id);if(!p)throw Object.assign(new Error('claim unavailable'),{code:'DEPENDENCY_UNAVAILABLE'});return structuredClone(p);};
const make=(source=runtime,port=proof)=>new IdentityDispatchLedger(source,withFieldPolicies,port);
async function registered(r=fresh()){await store.registerHuman(f.tenant,hash(sid),r);return r;}
async function issued(r){r??=await registered();const reply=await store.issue('chat',f.tenant,r);assert.equal(reply.state,'issued');return {r,reply};}
function consume({r,reply}){const c={schema_version:1,operation:'identity-consume',request_id:randomUUID(),binding:r.binding,grant_id:reply.grant_id,claim_id:randomUUID(),fence_id:randomUUID()};claims.set(c.claim_id,{state:'claimed',binding:r.binding,grant_id:reply.grant_id,claim_id:c.claim_id,resource_context:r.resource_context});return c;}
const read=x=>({schema_version:1,operation:'receipt-read',request_id:randomUUID(),binding:x.r.binding,receipt_id:x.reply.grant_id});
const state=async x=>(await ds.query('SELECT state,claim_id,fence_id,expires_at,version FROM identity_dispatch_grant WHERE tenant_id=? AND id=?',[f.tenant,x.reply.grant_id]))[0];
const counts=async x=>{const out={};for(const table of ['identity_dispatch_request','identity_dispatch_event'])out[table]=Number((await ds.query(`SELECT COUNT(*) n FROM ${table} WHERE tenant_id=? AND grant_id=?`,[f.tenant,x.reply.grant_id]))[0].n);return out;};
try{
 await test('retained schema32 prerequisite upgrade preserves old rows with explicit column mapping',async()=>{
  const journal=await ds.query('SELECT * FROM schema_migration ORDER BY version');if(journal.length!==32){assert.ok(journal.length>=37&&journal.length<=migrations.length);return;}
  const tables=(await ds.query("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' AND TABLE_NAME<>'schema_migration'")).map(r=>r.name),snapshot=new Map();for(const table of tables){assert.match(table,/^[a-z][a-z0-9_]*$/);snapshot.set(table,await ds.query('SELECT * FROM `'+table+'`'));}
  assert.equal(await migrate(ds,migrations.slice(0,37)),5);const afterJournal=await ds.query('SELECT * FROM schema_migration ORDER BY version');assert.deepEqual(afterJournal.slice(0,32),journal);const evidence={};
  for(const [table,oldRows] of snapshot){const rows=await ds.query('SELECT * FROM `'+table+'`'),normalized=oldRows.map(row=>{if(table!=='session_contribution')return row;const {thread_id,...rest}=row;return {...rest,conversation_id:thread_id};});const all=new Set(rows.map(canonical));for(const row of normalized)assert.ok(all.has(canonical(row)),table+' existing row changed');if(table!=='object_type')assert.equal(rows.length,oldRows.length);evidence[table]={before:oldRows.length,after:rows.length,preservedDigest:createHash('sha256').update(canonical(normalized.map(canonical).sort())).digest('hex')};}
  await writeFile(dir+'/prerequisite-upgrade.json',JSON.stringify({from:32,to:37,preserved:evidence},null,2));
 });
 await test('additive migration preserves every old table and immutable journal; repeat is no-op',async()=>{
  const old=await ds.query('SELECT * FROM schema_migration ORDER BY version');assert.ok(old.length>=37&&old.length<=migrations.length);const target=Math.max(38,old.length);
  const tables=(await ds.query("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' AND TABLE_NAME<>'schema_migration' ORDER BY TABLE_NAME")).map(r=>r.name);const snapshot={};
  const digest=rows=>createHash('sha256').update(canonical(JSON.parse(JSON.stringify(rows)).map(r=>canonical(r)).sort())).digest('hex');
  for(const table of tables){assert.match(table,/^[a-z][a-z0-9_]*$/);const rows=await ds.query('SELECT * FROM `'+table+'`');snapshot[table]={count:rows.length,digest:digest(rows)};}
  const applied=await migrate(ds,migrations.slice(0,target));assert.equal(applied,target-old.length);assert.equal(await migrate(ds,migrations.slice(0,target)),0);
  const journal=await ds.query('SELECT * FROM schema_migration ORDER BY version');assert.deepEqual(journal.slice(0,old.length),old);assert.equal(journal[37].checksum,checksum(migrations[37]));
  for(const table of tables){const rows=await ds.query('SELECT * FROM `'+table+'`');assert.deepEqual({count:rows.length,digest:digest(rows)},snapshot[table]);}
  const evidence=JSON.stringify({from:old.length,to:target,applied,preserved:snapshot},null,2);await writeFile(dir+'/migration.json',evidence);if(applied)await writeFile(dir+'/migration-upgrade.json',evidence);
 });
 const sql=`CREATE USER IF NOT EXISTS 'identity_dispatch_test'@'%' IDENTIFIED BY '${saved.password}';\n`+Object.entries(identityDispatchPrivileges).map(([table,p])=>`GRANT ${p} ON native_identity_test.\`${table}\` TO 'identity_dispatch_test'@'%';`).join('\n');
 const provision=spawnSync('docker',['exec','-i','agentic-crm-mysql-1','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot'],{input:sql,stdio:['pipe','pipe','pipe'],windowsHide:true,timeout:30000});assert.equal(provision.status,0,'narrow role provision');
 runtime=databaseSource(false,{user:'identity_dispatch_test',password:saved.password});await runtime.initialize();store=make();
 const ip=randomUUID(),challenge=await auth.challenge(ip);sid=await auth.login(f.login,f.password,challenge.token,challenge.browser,cfg.origin,ip);
 await test('native delegation fixed grant consume and authorized read with narrow role',async()=>{
  const x=await issued(),c=consume(x);assert.equal((await store.consume('connector',f.tenant,c)).state,'consumed');assert.equal((await store.read('chat',f.tenant,read(x))).state,'consumed');const n=await counts(x);assert.deepEqual(n,{identity_dispatch_request:2,identity_dispatch_event:2});
  const response=JSON.stringify(await store.read('connector',f.tenant,read(x)));assert.ok(!response.includes(hash(sid)));assert.ok(!response.includes('fence_id'));
 });
 await test('twelve concurrent issues preserve one grant and fixed TTL',async()=>{
  const r=await registered(),replies=await Promise.all(Array.from({length:12},()=>store.issue('chat',f.tenant,r)));assert.equal(new Set(replies.map(x=>x.grant_id)).size,1);assert.equal(new Set(replies.map(x=>x.expires_at)).size,1);
  const x={r,reply:replies[0]},before=await state(x);await store.issue('chat',f.tenant,{...r,request_id:randomUUID()});assert.equal((await state(x)).expires_at.getTime(),before.expires_at.getTime());assert.equal((await counts(x)).identity_dispatch_event,1);
 });
 await test('concurrent different consume fences have exactly one committed winner',async()=>{
  const x=await issued(),base=consume(x),calls=Array.from({length:10},()=>({...base,request_id:randomUUID(),fence_id:randomUUID()}));const result=await Promise.allSettled(calls.map(c=>store.consume('connector',f.tenant,c)));assert.equal(result.filter(x=>x.status==='fulfilled').length,1);for(const r of result.filter(x=>x.status==='rejected'))assert.equal(r.reason.code,'CONFLICT');assert.equal((await counts(x)).identity_dispatch_event,2);
 });
 await test('consume and explicit revoke race is terminal and cannot rearm',async()=>{
  for(let i=0;i<4;i++){const x=await issued(),c=consume(x),r=read(x);await Promise.allSettled([store.consume('connector',f.tenant,c),store.revokeHuman(f.tenant,hash(sid),r)]);const g=await state(x);assert.ok(['consumed','revoked'].includes(g.state));assert.equal((await counts(x)).identity_dispatch_event,2);assert.equal((await store.revokeHuman(f.tenant,hash(sid),r)).state,g.state);if(g.state==='revoked')await bad(store.consume('connector',f.tenant,c),'REVOKED');else await bad(store.consume('connector',f.tenant,{...c,fence_id:randomUUID()}),'CONFLICT');}
 });
 await test('immutable registration binding and request digests reject conflicts atomically',async()=>{
  const x=await issued(),other=await registered();other.request_id=x.r.request_id;await bad(store.issue('chat',f.tenant,other),'CONFLICT');assert.equal((await ds.query('SELECT id FROM identity_dispatch_grant WHERE tenant_id=? AND intent_id=?',[f.tenant,other.binding.intent_id])).length,0);
  const changed=structuredClone(x.r);changed.binding.payload_digest='b'.repeat(64);await bad(store.issue('chat',f.tenant,changed),'CONFLICT');
  const c=consume(x);await store.consume('connector',f.tenant,c);const y=await issued(),cy=consume(y);cy.request_id=c.request_id;await bad(store.consume('connector',f.tenant,cy),'CONFLICT');assert.equal((await state(y)).state,'issued');assert.equal((await counts(y)).identity_dispatch_event,1);
  const old=hash(sid),newChallenge=await auth.challenge(randomUUID()),newSid=await auth.login(f.login,f.password,newChallenge.token,newChallenge.browser,cfg.origin,randomUUID());await bad(store.registerHuman(f.tenant,hash(newSid),x.r),'CONFLICT');assert.equal(hash(sid),old);
 });
 await test('SQL expiry is exact and duplicate issue never refreshes it',async()=>{
  const x=await issued(),c=consume(x);await ds.query('UPDATE identity_dispatch_grant SET expires_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[f.tenant,x.reply.grant_id]);await bad(store.consume('connector',f.tenant,c),'EXPIRED');assert.equal((await store.issue('chat',f.tenant,x.r)).state,'expired');assert.equal((await store.read('chat',f.tenant,read(x))).state,'expired');assert.equal((await counts(x)).identity_dispatch_event,1);
  const y=await issued(),cy=consume(y);await store.consume('connector',f.tenant,cy);await ds.query('UPDATE identity_dispatch_grant SET expires_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[f.tenant,y.reply.grant_id]);assert.equal((await store.consume('connector',f.tenant,cy)).state,'consumed');
 });
 await test('foreign tenant peer malformed request and mismatched proof fail closed',async()=>{
  const x=await issued(),c=consume(x),before=proofCalls;await bad(store.consume('chat',f.tenant,c),'FORBIDDEN');await bad(store.consume('connector',f.other,c),'FORBIDDEN');await bad(store.consume('connector',f.tenant,{...c,extra:true}),'INVALID_REQUEST');assert.equal(proofCalls,before);
  const wrong=make(runtime,async r=>({...await proof(r),resource_context:{...x.r.resource_context,record_version:'2'}}));await bad(wrong.consume('connector',f.tenant,c),'FORBIDDEN');assert.equal((await state(x)).state,'issued');
  await bad(make(runtime,async()=>{throw Object.assign(new Error('unavailable'),{code:'DEPENDENCY_UNAVAILABLE'});}).consume('connector',f.tenant,c),'DEPENDENCY_UNAVAILABLE');assert.equal((await counts(x)).identity_dispatch_event,1);
  let aborted=false;await bad(make(runtime,(_r,signal)=>new Promise(()=>{signal.addEventListener('abort',()=>{aborted=true;});})).consume('connector',f.tenant,c),'DEPENDENCY_UNAVAILABLE');assert.equal(aborted,true);assert.equal((await state(x)).state,'issued');
 });
 await test('native revision change and logout prevent grant consumption',async()=>{
  const x=await issued(),c=consume(x);await ds.transaction(async m=>{await m.query('SELECT id FROM tenant WHERE id=? FOR UPDATE',[f.tenant]);await m.query('UPDATE principal SET auth_revision=auth_revision+1 WHERE tenant_id=? AND id=?',[f.tenant,f.principal]);});await bad(store.consume('connector',f.tenant,c),'STALE_AUTHORIZATION');assert.equal((await state(x)).state,'issued');
  const y=await issued(),cy=consume(y);await auth.logout(sid,cfg.origin,await auth.csrf(sid));await bad(store.consume('connector',f.tenant,cy),'AUTH_SESSION_REQUIRED');const ch=await auth.challenge(randomUUID());sid=await auth.login(f.login,f.password,ch.token,ch.browser,cfg.origin,randomUUID());
 });
 await test('post-commit ACK loss and new instance replay add no second transition',async()=>{
  const x=await issued(),c=consume(x);const proxy=Object.create(runtime);proxy.createQueryRunner=(...args)=>{const runner=runtime.createQueryRunner(...args),commit=runner.commitTransaction.bind(runner);runner.commitTransaction=async()=>{await commit();throw Object.assign(new Error('lost ack'),{code:'ACK_LOST'});};return runner;};
  await bad(make(proxy).consume('connector',f.tenant,c),'ACK_LOST');assert.equal((await state(x)).state,'consumed');const before=await counts(x);assert.equal((await make().consume('connector',f.tenant,c)).state,'consumed');assert.deepEqual(await counts(x),before);
 });
 await test('audit failure rolls back grant and receipt and narrow privileges deny foreign writes',async()=>{
  const x=await issued(),c=consume(x),proxy=Object.create(runtime);proxy.createQueryRunner=(...args)=>{const runner=runtime.createQueryRunner(...args),query=runner.query.bind(runner);runner.query=async(sql,args)=>{if(sql.startsWith('INSERT INTO identity_dispatch_event'))throw Object.assign(new Error('audit failed'),{code:'AUDIT_FAILED'});return query(sql,args);};return runner;};await bad(make(proxy).consume('connector',f.tenant,c),'AUDIT_FAILED');assert.equal((await state(x)).state,'issued');assert.deepEqual(await counts(x),{identity_dispatch_request:1,identity_dispatch_event:1});
  for(const sql of ['SELECT * FROM account_credential LIMIT 0','SELECT * FROM conversation LIMIT 0','SELECT * FROM native_connector_test.connector_dispatch_guard LIMIT 0','UPDATE identity_dispatch_event SET version=version WHERE 1=0','DELETE FROM identity_dispatch_request WHERE 1=0','CREATE TABLE forbidden_dispatch_test(id INT)'])await assert.rejects(runtime.query(sql),e=>['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(e.code));
 });
 await test('point query plans and tenant CHECK constraints',async()=>{
  const x=await issued(),plans={};for(const [name,sql,args] of [['grant','SELECT * FROM identity_dispatch_grant WHERE tenant_id=? AND intent_id=?',[f.tenant,x.r.binding.intent_id]],['delegation','SELECT * FROM identity_dispatch_delegation WHERE tenant_id=? AND id=?',[f.tenant,x.r.binding.delegation_id]],['event','SELECT * FROM identity_dispatch_event WHERE tenant_id=? AND grant_id=? ORDER BY version',[f.tenant,x.reply.grant_id]]]){plans[name]=await runtime.query('EXPLAIN '+sql,args);assert.ok(plans[name].every(p=>p.key));}await writeFile(dir+'/plans.json',JSON.stringify(plans,null,2));
  await assert.rejects(ds.query("INSERT INTO identity_dispatch_delegation(tenant_id,id,principal_id,session_hash,principal_revision,security_revision,created_at) VALUES ('01900000-0000-7000-8000-000000000001',?,?,?,1,1,UTC_TIMESTAMP(6))",[randomUUID(),f.principal,'a'.repeat(64)]),e=>e.code==='ER_CHECK_CONSTRAINT_VIOLATED');
 });
 await writeFile(dir+'/native.json',JSON.stringify({platform:process.platform,node:process.version,groups:results,preserved:true,claimPort:'synthetic',nativeAuthority:true,serviceCutover:false},null,2));
}finally{if(runtime?.isInitialized)await runtime.destroy();await pool.end();await ds.destroy();}
