import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID,randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import {databaseSource} from '../apps/backend/dist/kernel/database/data-source.js';
import {NativeAuthService} from '../apps/backend/dist/modules/identity/auth/native-service.js';
import {nativeConfig} from '../apps/backend/dist/modules/identity/auth/native-config.js';
import {passwordHash} from '../apps/backend/dist/modules/identity/auth/password.js';
import {AuthRuntime} from '../apps/backend/dist/modules/identity/auth/http.js';
import {ReportingDefinitionsController,ReportingBridgeRuntime} from '../apps/backend/dist/modules/reporting/http.js';
import {ReportingBridge} from '../apps/backend/dist/modules/reporting/bridge.js';
import {safeJsonBody} from '../apps/backend/dist/kernel/http/json-body.js';
import {ReportingStore} from '../services/reporting/dist/storage.js';
import {AdmissionVerifier,systemTenant} from '../services/reporting/dist/storage-security.js';
import {ReportingController,ReportingRuntime,storageJsonBody} from '../services/reporting/dist/http.js';
const require=createRequire(new URL('../apps/backend/package.json',import.meta.url));
const {Module}=require('@nestjs/common'),{NestFactory}=require('@nestjs/core'),{createPool}=require('mysql2/promise');
const env=parseEnv(await readFile('.local/native-auth-test.env','utf8'));assert.equal(env.APP_ENV,'test');assert.equal(env.MYSQL_DATABASE,'native_identity_test');assert.equal(env.MYSQL_HOST,'127.0.0.1');assert.equal(env.MYSQL_PORT,'13306');Object.assign(process.env,env);
const reportingEnv=parseEnv(await readFile('.local/reporting-test.env','utf8'));assert.equal(reportingEnv.REPORTING_DB_NAME,'test_crm_reporting');
const ds=databaseSource(true);await ds.initialize();const pool=createPool({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),database:env.MYSQL_DATABASE,user:env.MYSQL_MIGRATION_USER,password:env.MYSQL_MIGRATION_PASSWORD});const store=new ReportingStore(reportingEnv);
let fixture;const file='.local/reporting-native-fixture.json';try{fixture=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;fixture={tenant:randomUUID(),foreignTenant:randomUUID(),account:randomUUID(),member:randomUUID(),principal:randomUUID(),role:randomUUID(),login:'report_'+randomBytes(8).toString('hex'),password:randomBytes(24).toString('hex'),sessionKey:randomBytes(32).toString('hex')};await writeFile(file,JSON.stringify(fixture),{flag:'wx'});}
const grants=['read','design'].map(action=>({resource:'report_definition',action,scope:'own'}));const config=nativeConfig({APP_ENV:'test',APP_ORIGIN:'http://localhost:18080',SESSION_ENCRYPTION_KEY:fixture.sessionKey});const auth=new NativeAuthService(config,pool);let sid,csrf,privateApp,publicApp;const groups=[];async function test(name,fn){await fn();groups.push(name);console.log('PASS '+name);}
async function changeIdentity(seat='admin',permissions=grants){await ds.transaction(async m=>{await m.query('SELECT id FROM tenant WHERE id=? FOR UPDATE',[fixture.tenant]);await m.query('UPDATE membership SET seat_code=? WHERE tenant_id=? AND id=?',[seat,fixture.tenant,fixture.member]);await m.query('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(permissions),fixture.tenant,fixture.role]);await m.query('UPDATE principal SET auth_revision=auth_revision+1 WHERE tenant_id=? AND id=?',[fixture.tenant,fixture.principal]);});}
try{
 await test('retained isolated native account/tenant/role fixture and real password login',async()=>{
  if(!(await ds.query('SELECT id FROM account WHERE id=?',[fixture.account])).length){const encoded=await passwordHash(fixture.password);await ds.transaction(async m=>{
   await m.query("INSERT INTO account(id,issuer,subject,display_name,login_key,created_at,updated_at) VALUES (?,'urn:crm:reporting-test',?,'Synthetic Reporting test',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[fixture.account,fixture.account,fixture.login]);
   await m.query('INSERT INTO account_credential(tenant_id,account_id,password_hash,changed_at) VALUES (?,?,?,?)',[systemTenant,fixture.account,encoded,Date.now()]);
   for(const t of [fixture.tenant,fixture.foreignTenant])await m.query("INSERT INTO tenant(id,name,status,created_at,updated_at) VALUES (?,'Synthetic Reporting tenant','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[t]);
   await m.query("INSERT INTO membership(id,tenant_id,account_id,status,seat_code,created_at,updated_at) VALUES (?,?,?,'active','admin',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[fixture.member,fixture.tenant,fixture.account]);
   await m.query("INSERT INTO principal(id,tenant_id,kind,membership_id,status,created_at,updated_at) VALUES (?,?,'human',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[fixture.principal,fixture.tenant,fixture.member]);
   await m.query("INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,'report_test','Synthetic report role',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[fixture.role,fixture.tenant,JSON.stringify(grants)]);await m.query('INSERT INTO principal_role VALUES (?,?,?)',[fixture.tenant,fixture.principal,fixture.role]);
  });}
  await changeIdentity();const ip=randomUUID(),challenge=await auth.challenge(ip);sid=await auth.login(fixture.login,fixture.password,challenge.token,challenge.browser,config.origin,ip);csrf=await auth.csrf(sid);assert.equal((await auth.session(sid)).account_id,fixture.account);
 });
 const key=randomBytes(32).toString('hex');class PrivateModule{}Module({controllers:[ReportingController],providers:[{provide:ReportingRuntime,useValue:{store,verifier:new AdmissionVerifier(key)}}]})(PrivateModule);privateApp=await NestFactory.create(PrivateModule,{logger:false,bodyParser:false});storageJsonBody(privateApp);await privateApp.listen(0,'127.0.0.1');const bridgeConfig={url:await privateApp.getUrl(),key};const bridge=new ReportingBridge(ds,bridgeConfig);
 class PublicModule{}Module({controllers:[ReportingDefinitionsController],providers:[{provide:AuthRuntime,useValue:{service:auth}},{provide:ReportingBridgeRuntime,useValue:{ready:async()=>{},bridge}}]})(PublicModule);publicApp=await NestFactory.create(PublicModule,{logger:false,bodyParser:false});safeJsonBody(publicApp);publicApp.setGlobalPrefix('api/v1');await publicApp.listen(0,'127.0.0.1');const url=(await publicApp.getUrl())+'/api/v1/reporting/definitions';
 const request=async(path='',method='GET',body,headers={})=>{const response=await fetch(url+path,{method,headers:{cookie:'crm_session='+sid,'x-tenant-id':fixture.tenant,'content-type':'application/json',origin:config.origin,'x-csrf-token':csrf,'idempotency-key':randomUUID(),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:response.status,etag:response.headers.get('etag'),body:await response.json()};};let report;
 await test('native HTTP cookie/CSRF/Origin/membership fail closed',async()=>{
  assert.equal((await request('','GET',undefined,{cookie:''})).status,401);assert.equal((await request('','POST',{name:'Denied',definition:{}},{'x-csrf-token':'bad'})).status,403);assert.equal((await request('','POST',{name:'Denied',definition:{}},{origin:'http://foreign.invalid'})).status,403);assert.equal((await request('','GET',undefined,{'x-tenant-id':fixture.foreignTenant})).status,403);
 });
 await test('real BFF to Reporting HTTP saves draft with trusted owner and ETag',async()=>{
  const r=await request('','POST',{name:'Native draft',definition:{future:'attribute'}});assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.etag,'"1"');report=r.body.data;assert.equal(report.owner_principal_id,fixture.principal);assert.equal(report.execution_enabled,false);assert.equal((await request('/'+report.id)).body.data.id,report.id);
  assert.equal((await request('','POST',{name:'Spoofed',definition:{},owner_principal_id:randomUUID()})).status,400);
 });
 await test('public If-Match, strict query/body and historical routes',async()=>{
  const body={name:'Edited via native',definition:{metrics:['conversations']}};assert.equal((await request('/'+report.id,'PATCH',body)).status,428);assert.equal((await request('/'+report.id,'PATCH',body,{'if-match':'"99"'})).status,409);const r=await request('/'+report.id,'PATCH',body,{'if-match':'"1"'});assert.equal(r.status,200);assert.equal(r.etag,'"2"');assert.equal((await request('/'+report.id+'/versions/1')).body.data.name,'Native draft');assert.equal((await request('?limit=0')).status,400);assert.equal((await request('?tenant_id='+fixture.tenant)).status,400);assert.equal((await request('/'+report.id+'/versions/abc')).status,400);
 });
 await test('live role and seat gates deny design while preserving authorized reads',async()=>{
  await changeIdentity('viewer');assert.equal((await request()).status,200);assert.equal((await request('','POST',{name:'Denied viewer',definition:{}})).status,403);
  await changeIdentity('admin',[]);assert.equal((await request()).status,403);await changeIdentity('admin',grants.map(g=>({...g,scope:'team'})));assert.equal((await request()).status,403);await changeIdentity();
 });
 await test('native own/all permissions resolve against current Identity grants',async()=>{
  const op={kind:'create',key:randomUUID(),body:{name:'Other synthetic owner',definition:{}}};const {hash}=await import('../services/reporting/dist/storage-security.js');const other=await store.execute({audience:'reporting-definition-v1',tenantId:fixture.tenant,principalId:randomUUID(),authRevision:'1',readScope:'own',designScope:'own',issuedAt:Date.now(),expiresAt:Date.now()+5000,bodyHash:hash(JSON.stringify(op))},op);
  assert.equal((await request('/'+other.id)).status,404);await changeIdentity('admin',grants.map(g=>({...g,scope:'all'})));assert.equal((await request('/'+other.id)).status,200);await changeIdentity();
 });
 await test('post-dispatch auth revision change prevents response release',async()=>{
  const racing=new ReportingBridge(ds,bridgeConfig,async(...args)=>{const response=await fetch(...args);await changeIdentity('admin',[]);return response;});await assert.rejects(racing.dispatch(fixture.account,fixture.tenant,{kind:'get',id:report.id}),e=>e.code==='STALE_AUTHORIZATION');await changeIdentity();
 });
 await test('tenant super admin: intrinsic Reporting all scope, CRM fields, live revocation and last-admin invariant',async()=>{
  const {IdentityAdmin}=await import('../apps/backend/dist/modules/identity/admin.js');
  const {IdentityAuthorization}=await import('../apps/backend/dist/modules/identity/authorization.js');
  const {RoutingIdentityPort}=await import('../apps/backend/dist/modules/identity/routing-port.js');
  const {UnitOfWork}=await import('../apps/backend/dist/kernel/tenancy/unit-of-work.js');
  const {withFieldPolicies,allows}=await import('../apps/backend/dist/modules/crm/access.js');
  const {fieldAllowed}=await import('../apps/backend/dist/modules/identity/domain/authorization.js');
  const admin=new IdentityAdmin(ds,'synthetic-super-admin-cursor'),authorization=new IdentityAuthorization(new UnitOfWork(ds));
  const [existing]=await ds.query('SELECT id FROM `role` WHERE tenant_id=? AND `key`=?',[fixture.tenant,'tenant_admin']);
  const role=existing?.id??randomUUID();
  if(!existing)await ds.query('INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[role,fixture.tenant,'tenant_admin','Synthetic super admin','[]']);
  const originallyAssigned=(await ds.query('SELECT role_id FROM principal_role WHERE tenant_id=? AND principal_id=? AND role_id=?',[fixture.tenant,fixture.principal,role])).length>0;
  const setState=async({assigned=true,seat='admin',status='active'}={})=>ds.transaction(async m=>{
    await m.query('SELECT id FROM tenant WHERE id=? FOR UPDATE',[fixture.tenant]);
    if(assigned)await m.query('INSERT IGNORE INTO principal_role(tenant_id,principal_id,role_id) VALUES (?,?,?)',[fixture.tenant,fixture.principal,role]);
    else await m.query('DELETE FROM principal_role WHERE tenant_id=? AND principal_id=? AND role_id=?',[fixture.tenant,fixture.principal,role]);
    await m.query('UPDATE membership SET seat_code=?,status=? WHERE tenant_id=? AND id=?',[seat,status,fixture.tenant,fixture.member]);
    await m.query('UPDATE principal SET auth_revision=auth_revision+1 WHERE tenant_id=? AND id=?',[fixture.tenant,fixture.principal]);
  });
  try{
    await changeIdentity('admin',[]);await setState();
    assert.equal((await request()).status,200);assert.equal((await request('','POST',{name:'Intrinsic admin draft',definition:{}})).status,200);
    assert.equal((await request('','GET',undefined,{'x-tenant-id':fixture.foreignTenant})).status,403);
    const op={kind:'create',key:randomUUID(),body:{name:'Other owner for super admin',definition:{}}}, {hash}=await import('../services/reporting/dist/storage-security.js');
    const other=await store.execute({audience:'reporting-definition-v1',tenantId:fixture.tenant,principalId:randomUUID(),authRevision:'1',readScope:'own',designScope:'own',issuedAt:Date.now(),expiresAt:Date.now()+5000,bodyHash:hash(JSON.stringify(op))},op);
    assert.equal((await request('/'+other.id)).status,200);
    assert.equal((await request('/'+other.id,'PATCH',{name:'Super admin edit',definition:{}},{'if-match':'"1"'})).status,200);
    const {CrmPlatform}=await import('../apps/backend/dist/modules/crm/platform.js');
    if(!(await ds.query('SELECT id FROM object_type WHERE tenant_id=? AND `key`=?',[fixture.tenant,'super_admin_case'])).length)await new CrmPlatform(ds,'synthetic').mutate(fixture.account,fixture.tenant,'object-types',{key:'super_admin_case',label:'Synthetic super-admin case'},randomUUID(),undefined,randomUUID());
    const before=await authorization.runHuman(fixture.account,fixture.tenant,async(scope,a)=>{
      assert.equal(a.superAdmin,true);assert.equal((await new RoutingIdentityPort().principal(scope,fixture.principal)).access.superAdmin,true);
      const crm=await withFieldPolicies(scope,{...a,fieldDenies:[{resource:'super_admin_case',field:'secret',actions:['read','write']}]});
      assert(allows(crm,'super_admin_case','update',{tenantId:fixture.tenant,ownerPrincipalId:randomUUID(),teamId:null,sharedTeamIds:[]}));
      assert(!allows(crm,'super_admin_case','read',{tenantId:fixture.foreignTenant,ownerPrincipalId:null,teamId:null,sharedTeamIds:[]}));
      for(const action of ['read','write','filter','export'])assert(fieldAllowed(crm,'super_admin_case','secret',action));return a;
    });
    const [member]=await ds.query('SELECT version FROM membership WHERE tenant_id=? AND id=?',[fixture.tenant,fixture.member]);
    for(const body of [{seat_code:'viewer'},{status:'suspended'},{role_ids:[fixture.role]}])await assert.rejects(admin.mutate(fixture.account,fixture.tenant,'memberships',fixture.member,body,randomUUID(),String(member.version),randomUUID()),e=>e.code==='LAST_ADMIN_REQUIRED');
    const [r]=await ds.query('SELECT version FROM `role` WHERE tenant_id=? AND id=?',[fixture.tenant,role]);
    await admin.mutate(fixture.account,fixture.tenant,'roles',role,{permissions:[]},randomUUID(),String(r.version),randomUUID());assert.equal((await request()).status,200);
    await assert.rejects(authorization.runHuman(fixture.account,fixture.tenant,async()=>{},before),e=>e.code==='STALE_AUTHORIZATION');
    for(const state of [{assigned:false},{seat:'viewer'},{status:'suspended'}]){await setState(state);assert.equal((await request()).status,403);await setState();}
    const racing=new ReportingBridge(ds,bridgeConfig,async(...args)=>{const response=await fetch(...args);await setState({assigned:false});return response;});
    await assert.rejects(racing.dispatch(fixture.account,fixture.tenant,{kind:'get',id:report.id}),e=>e.code==='STALE_AUTHORIZATION');
  }finally{await setState({assigned:originallyAssigned});await changeIdentity();}
 });
 await test('revoked native session rejects subsequent reads',async()=>{await auth.logout(sid,config.origin,csrf);assert.equal((await request()).status,401);});
 await mkdir('artifacts/reporting-storage',{recursive:true});await writeFile('artifacts/reporting-storage/native.json',JSON.stringify({at:new Date().toISOString(),database:env.MYSQL_DATABASE,groups,passed:groups.length},null,2));console.log(JSON.stringify({passed:groups.length}));
}finally{await changeIdentity();await publicApp?.close();await privateApp?.close();await store.close();await pool.end();await ds.destroy();}
