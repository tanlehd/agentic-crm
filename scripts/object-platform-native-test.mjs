import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {databaseSource} from '../services/core-baseline/dist/kernel/database/data-source.js';
import {migrate} from '../services/core-baseline/dist/kernel/database/migration-runner.js';
import {NativeAuthService} from '../services/core-baseline/dist/modules/identity/auth/native-service.js';
import {nativeConfig} from '../services/core-baseline/dist/modules/identity/auth/native-config.js';
import {AuthRuntime} from '../services/core-baseline/dist/modules/identity/auth/http.js';
import {CrmController,CrmRuntime} from '../services/core-baseline/dist/modules/crm/http.js';
import {CrmRecords} from '../services/core-baseline/dist/modules/crm/records.js';
import {CrmPlatform} from '../services/core-baseline/dist/modules/crm/platform.js';
import {CrmUi} from '../services/core-baseline/dist/modules/crm/ui.js';
import {coreDomains,contactReferences} from '../services/core-baseline/dist/modules/crm/core.js';
import {leadDomain} from '../services/core-baseline/dist/modules/sales/leads.js';
import {dealDomain} from '../services/core-baseline/dist/modules/sales/deals.js';
import {safeJsonBody} from '../services/core-baseline/dist/kernel/http/json-body.js';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
const ajv=addFormats(new Ajv({strict:true})),validateCatalog=ajv.compile(JSON.parse(await readFile('packages/contracts/schemas/object-platform-catalog.json','utf8')));
const require=createRequire(new URL('../services/core-baseline/package.json',import.meta.url));
const {Module}=require('@nestjs/common'),{NestFactory}=require('@nestjs/core'),{createPool}=require('mysql2/promise');
const env=parseEnv(await readFile('.local/native-auth-test.env','utf8'));
assert.equal(env.APP_ENV,'test');assert.equal(env.MYSQL_DATABASE,'native_identity_test');assert.equal(env.MYSQL_HOST,'127.0.0.1');assert.equal(env.MYSQL_PORT,'13306');Object.assign(process.env,env);
const fixture=JSON.parse(await readFile('.local/reporting-native-fixture.json','utf8'));
const ds=databaseSource(true);await ds.initialize();
const pool=createPool({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),database:env.MYSQL_DATABASE,user:env.MYSQL_MIGRATION_USER,password:env.MYSQL_MIGRATION_PASSWORD});
const [[original]]=await pool.query('SELECT m.seat_code,r.permissions FROM membership m JOIN `role` r ON r.tenant_id=m.tenant_id WHERE m.tenant_id=? AND m.id=? AND r.id=?',[fixture.tenant,fixture.member,fixture.role]);assert(original);
const objectKey='object_platform_request',relationKey='object_platform_contact';
const grants=[...['read','create','update'].map(action=>({resource:'schema',action,scope:'all'})),...['read','create'].map(action=>({resource:'association',action,scope:'all'})),...['contact','deal',objectKey].flatMap(resource=>['read','create','update','archive'].map(action=>({resource,action,scope:'all'})))];
async function rights(permissions=grants,seat='admin'){await ds.transaction(async m=>{await m.query('SELECT id FROM tenant WHERE id=? FOR UPDATE',[fixture.tenant]);await m.query('UPDATE membership SET seat_code=? WHERE tenant_id=? AND id=?',[seat,fixture.tenant,fixture.member]);await m.query('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[typeof permissions==='string'?permissions:JSON.stringify(permissions),fixture.tenant,fixture.role]);await m.query('UPDATE principal SET auth_revision=auth_revision+1 WHERE tenant_id=? AND id=?',[fixture.tenant,fixture.principal]);});}
const domains=coreDomains();domains.set('lead',leadDomain(contactReferences));domains.set('deal',dealDomain());
const records=new CrmRecords(ds,fixture.sessionKey,domains),platform=new CrmPlatform(ds,fixture.sessionKey);
const config=nativeConfig({APP_ENV:'test',APP_ORIGIN:'http://localhost:18080',SESSION_ENCRYPTION_KEY:fixture.sessionKey}),auth=new NativeAuthService(config,pool);
const groups=[];let app,sid,csrf,policyId;
const test=async(name,fn)=>{await fn();groups.push(name);console.log('PASS '+name);};
await mkdir('artifacts/object-platform',{recursive:true});
try{
  await test('forward migration preserves all prior rows, repeat and tenant FK',async()=>{
    const tables=await ds.query("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME<>'schema_migration'");
    const hash=async name=>createHash('sha256').update(JSON.stringify((await ds.query('SELECT * FROM `'+name+'`')).map(r=>JSON.stringify(r)).sort())).digest('hex');
    const before=new Map();for(const {name} of tables){assert(/^[a-z_]+$/.test(name));before.set(name,await hash(name));}
    const applied=await migrate(ds);for(const [name,value]of before)assert.equal(await hash(name),value,name);assert.equal(await migrate(ds),0);
    const cols=await ds.query("SELECT IS_NULLABLE n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='object_workspace_config' AND COLUMN_NAME='tenant_id'");assert.equal(cols[0].n,'NO');
    await writeFile('artifacts/object-platform/test-upgrade.json',JSON.stringify({applied,preservedTables:before.size,repeat:0}));
  });
  await rights();
  if(!(await ds.query('SELECT id FROM object_type WHERE tenant_id=? AND `key`=?',[fixture.tenant,objectKey])).length)await platform.mutate(fixture.account,fixture.tenant,'object-types',{key:objectKey,label:'Synthetic request'},randomUUID(),undefined,randomUUID());
  const [obj]=await ds.query('SELECT * FROM object_type WHERE tenant_id=? AND `key`=?',[fixture.tenant,objectKey]);
  if(!(await ds.query("SELECT id FROM property_definition WHERE tenant_id=? AND object_type_id=? AND `key`='title'",[fixture.tenant,obj.id])).length)await records.mutate(fixture.account,fixture.tenant,{object:objectKey,kind:'properties'},{key:'title',label:'Title',type:'string',required:false,indexed:true,sensitive:false},randomUUID(),String(obj.version),randomUUID());
  if(!(await ds.query('SELECT id FROM association_type WHERE tenant_id=? AND `key`=?',[fixture.tenant,relationKey])).length)await platform.mutate(fixture.account,fixture.tenant,'association-types',{key:relationKey,label:'Contact requests',source_type:'contact',target_type:objectKey,cardinality:'one_to_many'},randomUUID(),undefined,randomUUID());
  const ip=randomUUID(),challenge=await auth.challenge(ip);sid=await auth.login(fixture.login,fixture.password,challenge.token,challenge.browser,config.origin,ip);csrf=await auth.csrf(sid);
  class TestModule{}Module({controllers:[CrmController],providers:[{provide:AuthRuntime,useValue:{service:auth}},{provide:CrmRuntime,useValue:{ready:async()=>{},records,platform,ui:new CrmUi(records)}}]})(TestModule);
  app=await NestFactory.create(TestModule,{logger:false,bodyParser:false});safeJsonBody(app);app.setGlobalPrefix('api/v1');await app.listen(0,'127.0.0.1');const base=(await app.getUrl())+'/api/v1/';
  async function call(path,body,version,headers={},key=randomUUID()){
    const response=await fetch(base+path,{method:body?'PUT':'GET',headers:{cookie:'crm_session='+sid,'X-Tenant-Id':fixture.tenant,...(body?{Origin:config.origin,'Content-Type':'application/json','X-CSRF-Token':csrf,'Idempotency-Key':key,...(version?{'If-Match':'"'+version+'"'}:{})}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.json()};
  }
  const catalog=async()=>{const r=await call('crm/object-catalog');assert.equal(r.status,200,JSON.stringify(r.body));assert(validateCatalog(r.body.data),JSON.stringify(validateCatalog.errors));return r.body.data;},current=async()=>(await catalog()).objects.find(o=>o.id===obj.id);
  const input={label:'Synthetic request',plural_label:'Synthetic requests',description:'Synthetic workspace configuration',display_property_key:'title',enabled:true,position:12};
  await test('catalog canonical fields/relations without automation permission or values',async()=>{const c=await catalog();assert(c.objects.some(o=>o.id===obj.id));assert(c.relations.some(r=>r.key===relationKey));assert(c.objects.every(o=>o.capabilities.workflow_actions===false));assert(!JSON.stringify(c).includes('default_value'));assert.equal(c.objects.find(o=>o.key==='deal').extensions_supported,false);});
  await test('workspace config persists atomically with CAS and replay',async()=>{
    const prior=await current(),key=randomUUID(),path=`object-types/${objectKey}/workspace`,one=await call(path,input,prior.version,{},key);assert.equal(one.status,200,JSON.stringify(one.body));assert.equal(one.body.data.version,String(BigInt(prior.version)+1n));assert.deepEqual((await call(path,input,prior.version,{},key)),one);assert.equal((await call(path,{...input,position:13},prior.version)).status,409);assert.equal((await call(path,input)).status,428);assert.equal((await call(path,{...input,position:14},prior.version,{},key)).status,409);
    const menu=await call('crm/workspace-objects');assert(menu.body.data.some(o=>o.key===objectKey&&o.label===input.plural_label));
  });
  await test('ordinary agent menu requires object read, never schema or automation',async()=>{await rights([{resource:objectKey,action:'read',scope:'own'}],'chat');assert.equal((await call('crm/object-catalog')).status,403);const r=await call('crm/workspace-objects');assert.equal(r.status,200);assert.deepEqual(r.body.data.map(o=>o.key),[objectKey]);await rights([],'chat');assert.equal((await call('crm/workspace-objects')).body.data.length,0);await rights();});
  await test('agent relation discovery rechecks both endpoint grants without schema permission',async()=>{
    const permissions=['association','contact',objectKey].map(resource=>({resource,action:'read',scope:'own'}));await rights(permissions,'chat');
    const r=await call('crm/association-catalog');assert.equal(r.status,200);assert(r.body.data.some(v=>v.key===relationKey));assert(!JSON.stringify(r.body).includes('source_key'));assert.equal((await call('crm/object-catalog')).status,403);
    await rights(permissions.filter(p=>p.resource!=='contact'),'chat');assert(!(await call('crm/association-catalog')).body.data.some(v=>v.key===relationKey));
    await rights(permissions.filter(p=>p.resource!=='association'),'chat');assert.equal((await call('crm/association-catalog')).status,403);
    assert.equal((await call('crm/association-catalog',undefined,undefined,{'X-Tenant-Id':fixture.foreignTenant})).status,403);await rights();
  });
  await test('revoked authority rejects config and receipt replay; CSRF and tenant negative',async()=>{
    const v=(await current()).version,key=randomUUID(),path=`object-types/${objectKey}/workspace`;assert.equal((await call(path,input,v,{},key)).status,200);
    await rights(grants.filter(g=>g.resource!=='schema'||g.action==='read'));assert.equal((await call(path,input,v,{},key)).status,403);await rights();
    assert.equal((await call(path,input,(await current()).version,{'X-CSRF-Token':''})).status,403);assert.equal((await call('crm/object-catalog',undefined,undefined,{'X-Tenant-Id':fixture.foreignTenant})).status,403);assert.equal((await call('crm/object-catalog',undefined,undefined,{cookie:''})).status,401);assert.equal((await call('crm/object-catalog?extra=1')).status,400);
  });
  await test('field policy redacts display metadata and rejects configuration',async()=>{
    policyId=randomUUID();await ds.query('INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,?,JSON_ARRAY(?),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[policyId,fixture.tenant,fixture.role,obj.id,'title','read']);
    assert.equal((await current()).workspace.display_property_key,null);assert.equal((await current()).properties.length,0);assert.equal((await call('crm/workspace-objects')).body.data.find(o=>o.key===objectKey).display_property_key,null);
    assert.equal((await call(`object-types/${objectKey}/workspace`,input,(await current()).version)).status,403);await ds.query('DELETE FROM field_policy WHERE tenant_id=? AND id=?',[fixture.tenant,policyId]);policyId=undefined;
  });
  await test('invalid/standard config rejected and disable retains records/definition',async()=>{
    const v=(await current()).version,path=`object-types/${objectKey}/workspace`;
    assert.equal((await call(path,{...input,position:1000},v)).status,422);assert.equal((await call(path,{...input,display_property_key:'missing'},v)).status,422);
    const contact=(await catalog()).objects.find(o=>o.key==='contact');assert.equal((await call('object-types/contact/workspace',input,contact.version)).status,422);
    assert.equal((await call(path,{...input,enabled:false},v)).status,200);assert(!(await call('crm/workspace-objects')).body.data.some(o=>o.key===objectKey));assert(await current());
    assert.equal((await call(path,input,(await current()).version)).status,200);
  });
  await test('unsupported standard extension remains blocked, registered IDs stable',async()=>{
    const deal=(await catalog()).objects.find(o=>o.key==='deal');await assert.rejects(records.mutate(fixture.account,fixture.tenant,{object:'deal',kind:'properties'},{key:'unsupported',label:'No',type:'string',required:false,indexed:true,sensitive:false},randomUUID(),deal.version,randomUUID()),e=>e.code==='OBJECT_NOT_IMPLEMENTED');assert.equal((await current()).id,obj.id);
  });
  await writeFile('artifacts/object-platform/native.json',JSON.stringify({at:new Date().toISOString(),status:'PASS',groups,retained:true},null,2));
}finally{
  if(policyId)await ds.query('DELETE FROM field_policy WHERE tenant_id=? AND id=?',[fixture.tenant,policyId]);
  await rights(original.permissions,original.seat_code);if(sid)await auth.logout(sid,config.origin,csrf).catch(()=>{});await app?.close();await pool.end();await ds.destroy();
}
