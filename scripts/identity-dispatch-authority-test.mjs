import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID,randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import {databaseSource} from '../services/core-baseline/dist/kernel/database/data-source.js';
import {UnitOfWork} from '../services/core-baseline/dist/kernel/tenancy/unit-of-work.js';
import {NativeDispatchAuthority} from '../services/core-baseline/dist/modules/identity/dispatch-authority.js';
import {withFieldPolicies} from '../services/core-baseline/dist/modules/crm/access.js';
import {NativeAuthService} from '../services/core-baseline/dist/modules/identity/auth/native-service.js';
import {nativeConfig} from '../services/core-baseline/dist/modules/identity/auth/native-config.js';
import {passwordHash} from '../services/core-baseline/dist/modules/identity/auth/password.js';
import {hash,IDLE_MS} from '../services/core-baseline/dist/modules/identity/auth/security.js';
import {PLATFORM_TENANT_ID as system} from '../services/core-baseline/dist/kernel/database/system-scope.js';

const env=parseEnv(await readFile('.local/native-auth-test.env','utf8'));
assert.equal(env.APP_ENV,'test');assert.equal(env.MYSQL_DATABASE,'native_identity_test');assert.equal(env.MYSQL_HOST,'127.0.0.1');assert.equal(env.MYSQL_PORT,'13306');Object.assign(process.env,env);
const require=createRequire(new URL('../services/core-baseline/package.json',import.meta.url)),{createPool}=require('mysql2/promise');
const config={host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),database:env.MYSQL_DATABASE,user:env.MYSQL_MIGRATION_USER,password:env.MYSQL_MIGRATION_PASSWORD,timezone:'Z',supportBigNumbers:true,bigNumberStrings:true};
const pool=createPool({...config,connectionLimit:1}),ds=databaseSource(true);await ds.initialize();await pool.query('SET SESSION innodb_lock_wait_timeout=1');
const file='.local/identity-dispatch-fixture.json',dir='artifacts/identity-dispatch-authority';await mkdir(dir,{recursive:true});
let f;try{f=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;f=Object.fromEntries(['tenant','other','account','member','principal','role','team','object','policy'].map(k=>[k,randomUUID()]));Object.assign(f,{login:'dispatch_'+randomBytes(8).toString('hex'),password:randomBytes(24).toString('base64url'),sessionKey:randomBytes(32).toString('hex')});await writeFile(file,JSON.stringify(f),{flag:'wx',mode:0o600});}
const authConfig=nativeConfig({APP_ENV:'test',APP_ORIGIN:'http://localhost:18080',SESSION_ENCRYPTION_KEY:f.sessionKey}),auth=new NativeAuthService(authConfig,pool),uow=new UnitOfWork(ds),authority=new NativeDispatchAuthority(uow,withFieldPolicies);
const grants=['read','reply'].map(action=>({resource:'conversation',action,scope:'own'}));
async function setup(){
 await ds.transaction(async m=>{
  for(const tenant of [f.tenant,f.other])if(!(await m.query('SELECT id FROM tenant WHERE id=?',[tenant])).length)await m.query("INSERT INTO tenant(id,name,status,created_at,updated_at) VALUES (?,?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[tenant,'Synthetic dispatch authority']);
  if(!(await m.query('SELECT id FROM account WHERE tenant_id=? AND id=?',[system,f.account])).length){await m.query("INSERT INTO account(id,issuer,subject,display_name,login_key,created_at,updated_at) VALUES (?,'urn:agentic-crm:native',?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[f.account,f.account,'Synthetic dispatch Human',f.login]);await m.query('INSERT INTO account_credential(tenant_id,account_id,password_hash,changed_at) VALUES (?,?,?,?)',[system,f.account,await passwordHash(f.password),Date.now()]);}
  if(!(await m.query('SELECT id FROM membership WHERE tenant_id=? AND id=?',[f.tenant,f.member])).length){
   await m.query("INSERT INTO membership(id,tenant_id,account_id,status,seat_code,created_at,updated_at) VALUES (?,?,?,'active','chat',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[f.member,f.tenant,f.account]);
   await m.query("INSERT INTO principal(id,tenant_id,kind,membership_id,status,created_at,updated_at) VALUES (?,?,'human',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[f.principal,f.tenant,f.member]);
   await m.query("INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,'dispatch_test','Dispatch synthetic',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[f.role,f.tenant,JSON.stringify(grants)]);
   await m.query('INSERT INTO principal_role(tenant_id,principal_id,role_id) VALUES (?,?,?)',[f.tenant,f.principal,f.role]);
   await m.query("INSERT INTO team(id,tenant_id,name,purpose,created_at,updated_at) VALUES (?,?,'Dispatch synthetic','chat',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[f.team,f.tenant]);
   await m.query('INSERT INTO team_member(tenant_id,team_id,principal_id) VALUES (?,?,?)',[f.tenant,f.team,f.principal]);
   await m.query("INSERT INTO object_type(id,tenant_id,`key`,label,kind,created_at,updated_at) VALUES (?,?,'conversation','Conversation','standard',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[f.object,f.tenant]);
   await m.query("INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,'text','[]',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[f.policy,f.tenant,f.role,f.object]);
  }
 });
}
const issue=()=>({schema_version:1,operation:'identity-issue',request_id:randomUUID(),binding:{tenant_id:f.tenant,principal_id:f.principal,actor_kind:'human',conversation_id:randomUUID(),crm_contact_id:randomUUID(),connection_id:randomUUID(),intent_id:randomUUID(),attempt_id:randomUUID(),delegation_id:randomUUID(),owner_revision:'1',record_version:'1',payload_digest:'a'.repeat(64)},resource_context:{object_key:'conversation',owner_principal_id:f.principal,owner_revision:'1',record_version:'1',team_id:f.team,shared_team_ids:[]}});
let sid;async function login(){const ip=randomUUID(),c=await auth.challenge(ip);sid=await auth.login(f.login,f.password,c.token,c.browser,authConfig.origin,ip);return sid;}
const call=(r=issue(),work=async(_s,stamp)=>stamp,expected)=>authority.runHuman(f.tenant,hash(sid),r,work,expected);
const bad=(p,code)=>assert.rejects(p,code?e=>e.code===code:undefined);
const results=[];async function test(name,fn){await fn();results.push(name);console.log('PASS '+name);}
async function rights(change){return ds.transaction(async m=>{await m.query('SELECT id FROM tenant WHERE id=? FOR UPDATE',[f.tenant]);await change(m);await m.query('UPDATE principal SET auth_revision=auth_revision+1 WHERE tenant_id=? AND id=?',[f.tenant,f.principal]);});}
async function temporary(sql,args,restore,fn){await rights(m=>m.query(sql,args));try{await fn();}finally{await rights(m=>m.query(sql,restore));}}
try{
 await setup();await login();
 await test('native login and current Human authorization preserve idle timestamp',async()=>{const before=await ds.query('SELECT last_seen_at FROM auth_session WHERE tenant_id=? AND token_hash=?',[system,hash(sid)]);const stamp=await call();assert.match(stamp.principalRevision,/^[1-9]/);assert.match(stamp.securityRevision,/^[1-9]/);assert.deepEqual(await ds.query('SELECT last_seen_at FROM auth_session WHERE tenant_id=? AND token_hash=?',[system,hash(sid)]),before);});
 await test('strict binding tenant principal owner revisions and AI negatives',async()=>{for(const mutate of [r=>r.binding.tenant_id=f.other,r=>r.binding.principal_id=randomUUID(),r=>r.binding.actor_kind='ai',r=>r.resource_context.owner_revision='2',r=>r.resource_context.record_version='2',r=>r.extra=true]){const r=issue();mutate(r);await bad(call(r,async()=>assert.fail('unauthorized callback')),'FORBIDDEN');}const r=issue();r.binding.tenant_id=system;await bad(authority.runHuman(system,hash(sid),r,async()=>assert.fail()));await bad(authority.runHuman(f.tenant,'bad',issue(),async()=>assert.fail()),'AUTH_SESSION_REQUIRED');});
 await test('seat role field policy team scope and super-admin use current native data',async()=>{
  await temporary('UPDATE membership SET seat_code=? WHERE tenant_id=? AND id=?',['viewer',f.tenant,f.member],['chat',f.tenant,f.member],()=>bad(call(),'FORBIDDEN'));
  await temporary('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',['[]',f.tenant,f.role],[JSON.stringify(grants),f.tenant,f.role],()=>bad(call(),'FORBIDDEN'));
  for(const action of ['read','write'])await temporary('UPDATE field_policy SET denied_actions=? WHERE tenant_id=? AND id=?',[JSON.stringify([action]),f.tenant,f.policy],['[]',f.tenant,f.policy],()=>bad(call(),'FORBIDDEN'));
  await temporary('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants.map(g=>({...g,scope:'team'}))),f.tenant,f.role],[JSON.stringify(grants),f.tenant,f.role],async()=>{await call();const r=issue();r.resource_context.team_id=null;await bad(call(r),'FORBIDDEN');r.resource_context.shared_team_ids=[f.team];await call(r);});
  await rights(async m=>{await m.query("UPDATE membership SET seat_code='admin' WHERE tenant_id=? AND id=?",[f.tenant,f.member]);await m.query("UPDATE `role` SET `key`='tenant_admin',permissions='[]' WHERE tenant_id=? AND id=?",[f.tenant,f.role]);await m.query("UPDATE field_policy SET denied_actions='[\"read\",\"write\"]' WHERE tenant_id=? AND id=?",[f.tenant,f.policy]);});
  try{await call();}finally{await rights(async m=>{await m.query("UPDATE membership SET seat_code='chat' WHERE tenant_id=? AND id=?",[f.tenant,f.member]);await m.query("UPDATE `role` SET `key`='dispatch_test',permissions=? WHERE tenant_id=? AND id=?",[JSON.stringify(grants),f.tenant,f.role]);await m.query("UPDATE field_policy SET denied_actions='[]' WHERE tenant_id=? AND id=?",[f.tenant,f.policy]);});}
 });
 await test('changed authorization revision rejects even after rights are restored',async()=>{const old=await call();await rights(async()=>{});await bad(call(issue(),async()=>assert.fail(),old),'STALE_AUTHORIZATION');});
 await test('admission locks serialize with actual native logout and ACL writer',async()=>{
  const csrf=await auth.csrf(sid);await call(issue(),async()=>{await bad(auth.logout(sid,authConfig.origin,csrf),'ER_LOCK_WAIT_TIMEOUT');await bad(pool.query('UPDATE tenant SET version=version+1 WHERE id=?',[f.tenant]),'ER_LOCK_WAIT_TIMEOUT');});
  await auth.logout(sid,authConfig.origin,csrf);await bad(call(),'AUTH_SESSION_REQUIRED');await login();
 });
 await test('revocation first wins a blocked admission without callback',async()=>{
  const c=await pool.getConnection();await c.beginTransaction();try{await c.query('UPDATE auth_session SET revoked_at=? WHERE tenant_id=? AND token_hash=?',[Date.now(),system,hash(sid)]);
   let started;const barrier=new Promise(resolve=>{started=resolve;});const wrapped={run:(ctx,work)=>uow.run(ctx,scope=>{const original=scope.query.bind(scope);scope.query=async(sql,args)=>{if(sql.includes('auth_session')&&sql.includes('FOR SHARE'))started();return original(sql,args);};return work(scope);})};
   const pending=new NativeDispatchAuthority(wrapped,withFieldPolicies).runHuman(f.tenant,hash(sid),issue(),async()=>assert.fail('revoked callback'));const checked=bad(pending,'AUTH_SESSION_REQUIRED');await barrier;await c.commit();await checked;
  }finally{await c.rollback();c.release();}await login();
 });
 await test('account security lock blocks reset mutation; security mismatch and disable deny',async()=>{
  await call(issue(),async()=>{await bad(pool.query('UPDATE account SET security_revision=security_revision+1 WHERE tenant_id=? AND id=?',[system,f.account]),'ER_LOCK_WAIT_TIMEOUT');});
  await ds.query('UPDATE account SET security_revision=security_revision+1 WHERE tenant_id=? AND id=?',[system,f.account]);await bad(call(),'AUTH_SESSION_REQUIRED');await login();
  await ds.query("UPDATE account SET native_status='disabled' WHERE tenant_id=? AND id=?",[system,f.account]);try{await bad(call(),'AUTH_SESSION_REQUIRED');}finally{await ds.query("UPDATE account SET native_status='active' WHERE tenant_id=? AND id=?",[system,f.account]);}
 });
 await test('absolute and idle expiration reject at the boundary',async()=>{
  const [row]=await ds.query('SELECT last_seen_at,absolute_expires_at FROM auth_session WHERE tenant_id=? AND token_hash=?',[system,hash(sid)]);
  for(const column of ['absolute_expires_at','last_seen_at']){await ds.query(`UPDATE auth_session SET ${column}=FLOOR(UNIX_TIMESTAMP(UTC_TIMESTAMP(3))*1000)-? WHERE tenant_id=? AND token_hash=?`,[column==='last_seen_at'?IDLE_MS:0,system,hash(sid)]);try{await bad(call(),'AUTH_SESSION_REQUIRED');}finally{await ds.query(`UPDATE auth_session SET ${column}=? WHERE tenant_id=? AND token_hash=?`,[row[column],system,hash(sid)]);}}
 });
 await test('native expiry uses epoch time even when MySQL session timezone differs',async()=>{
  const wrapper={run:(ctx,work)=>uow.run(ctx,async scope=>{await scope.query("SET time_zone='+07:00'");try{return await work(scope);}finally{await scope.query("SET time_zone='+00:00'");}})};
  const service=new NativeDispatchAuthority(wrapper,withFieldPolicies);await service.runHuman(f.tenant,hash(sid),issue(),async()=>{});
  const [old]=await ds.query('SELECT absolute_expires_at FROM auth_session WHERE tenant_id=? AND token_hash=?',[system,hash(sid)]);await ds.query('UPDATE auth_session SET absolute_expires_at=? WHERE tenant_id=? AND token_hash=?',[Date.now()-1000,system,hash(sid)]);
  try{await bad(service.runHuman(f.tenant,hash(sid),issue(),async()=>assert.fail()),'AUTH_SESSION_REQUIRED');}finally{await ds.query('UPDATE auth_session SET absolute_expires_at=? WHERE tenant_id=? AND token_hash=?',[old.absolute_expires_at,system,hash(sid)]);}
 });
 await test('callback rollback and unavailable database fail without side effects',async()=>{
  const [before]=await ds.query('SELECT version FROM tenant WHERE id=?',[f.tenant]);await bad(call(issue(),async scope=>{await scope.query('UPDATE tenant SET version=version+1 WHERE id=?',[f.tenant]);throw new Error('rollback');}));assert.deepEqual((await ds.query('SELECT version FROM tenant WHERE id=?',[f.tenant]))[0],before);
  await bad(new NativeDispatchAuthority({run:async()=>{throw new Error('database unavailable');}},withFieldPolicies).runHuman(f.tenant,hash(sid),issue(),async()=>assert.fail()));await call();
 });
 await writeFile(dir+'/native.json',JSON.stringify({node:process.version,platform:process.platform,groups:results,preserved:true,production:false},null,2));
}finally{await pool.end();await ds.destroy();}
