import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {databaseSource} from '../services/core-baseline/dist/kernel/database/data-source.js';
import {NativeAuthService} from '../services/core-baseline/dist/modules/identity/auth/native-service.js';
import {nativeConfig} from '../services/core-baseline/dist/modules/identity/auth/native-config.js';
import {AuthRuntime} from '../services/core-baseline/dist/modules/identity/auth/http.js';
import {CrmController,CrmRuntime} from '../services/core-baseline/dist/modules/crm/http.js';
import {CrmRecords} from '../services/core-baseline/dist/modules/crm/records.js';
import {CrmUi} from '../services/core-baseline/dist/modules/crm/ui.js';
import {CrmPlatform} from '../services/core-baseline/dist/modules/crm/platform.js';
import {coreDomains,contactReferences} from '../services/core-baseline/dist/modules/crm/core.js';
import {leadDomain} from '../services/core-baseline/dist/modules/sales/leads.js';
import {dealDomain} from '../services/core-baseline/dist/modules/sales/deals.js';
import {safeJsonBody} from '../services/core-baseline/dist/kernel/http/json-body.js';
import {workflowCatalogSchema} from '../packages/contracts/dist/index.js';
import {validateAuthoringGraph} from '../packages/workflow-definition/dist/index.js';

const require=createRequire(new URL('../services/core-baseline/package.json',import.meta.url));
const {Module}=require('@nestjs/common'),{NestFactory}=require('@nestjs/core'),{createPool}=require('mysql2/promise');
const Ajv=require('ajv'),formats=require('ajv-formats');const ajv=new Ajv({strict:true});formats(ajv);const validate=ajv.compile(workflowCatalogSchema);
const env=parseEnv(await readFile('.local/native-auth-test.env','utf8'));
assert.equal(env.APP_ENV,'test');assert.equal(env.MYSQL_DATABASE,'native_identity_test');assert.equal(env.MYSQL_HOST,'127.0.0.1');assert.equal(env.MYSQL_PORT,'13306');Object.assign(process.env,env);
const fixture=JSON.parse(await readFile('.local/reporting-native-fixture.json','utf8'));
const path='.local/workflow-catalog-fixture.json';let saved;
try{saved=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;saved={tenant:fixture.tenant,key:'workflow_catalog_case',relationKey:'workflow_catalog_link',policy:randomUUID(),fieldPolicy:randomUUID()};await writeFile(path,JSON.stringify(saved),{flag:'wx'});}
assert.equal(saved.tenant,fixture.tenant);
const ds=databaseSource(true);await ds.initialize();
const pool=createPool({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),database:env.MYSQL_DATABASE,user:env.MYSQL_MIGRATION_USER,password:env.MYSQL_MIGRATION_PASSWORD});
const [[original]]=await pool.query('SELECT m.seat_code,r.permissions FROM membership m JOIN `role` r ON r.tenant_id=m.tenant_id WHERE m.tenant_id=? AND m.id=? AND r.id=?',[fixture.tenant,fixture.member,fixture.role]);assert(original);
const grants=[{resource:'automation',action:'design',scope:'all'},...['read','create','update'].map(action=>({resource:'schema',action,scope:'all'})),...['contact','lead','deal',saved.key].flatMap(resource=>['read','create','update'].map(action=>({resource,action,scope:'all'})))];
async function rights(permissions=grants,seat='admin'){
  await ds.transaction(async m=>{await m.query('SELECT id FROM tenant WHERE id=? FOR UPDATE',[fixture.tenant]);await m.query('UPDATE membership SET seat_code=? WHERE tenant_id=? AND id=?',[seat,fixture.tenant,fixture.member]);await m.query('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[typeof permissions==='string'?permissions:JSON.stringify(permissions),fixture.tenant,fixture.role]);await m.query('UPDATE principal SET auth_revision=auth_revision+1 WHERE tenant_id=? AND id=?',[fixture.tenant,fixture.principal]);});
}
const config=nativeConfig({APP_ENV:'test',APP_ORIGIN:'http://localhost:18080',SESSION_ENCRYPTION_KEY:fixture.sessionKey});const auth=new NativeAuthService(config,pool);
const domains=coreDomains();domains.set('lead',leadDomain(contactReferences));domains.set('deal',dealDomain());const records=new CrmRecords(ds,fixture.sessionKey,domains),platform=new CrmPlatform(ds,fixture.sessionKey);
let sid,csrf,app;const groups=[];const test=async(name,fn)=>{await fn();groups.push(name);console.log('PASS '+name);};
let policies=[];
try {
  await rights();
  // Only isolated retained synthetic fixture metadata is created; never reset DB/users.
  for(const key of ['contact','lead','deal'])if(!(await ds.query('SELECT id FROM object_type WHERE tenant_id=? AND `key`=?',[fixture.tenant,key])).length)await ds.query("INSERT INTO object_type(id,tenant_id,`key`,label,kind,created_at,updated_at) VALUES (?,?,?,?,'standard',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),fixture.tenant,key,key]);
  if(!(await ds.query('SELECT id FROM object_type WHERE tenant_id=? AND `key`=?',[fixture.tenant,saved.key])).length)await platform.mutate(fixture.account,fixture.tenant,'object-types',{key:saved.key,label:'Synthetic Workflow case'},randomUUID(),undefined,randomUUID());
  const [custom]=await ds.query('SELECT * FROM object_type WHERE tenant_id=? AND `key`=?',[fixture.tenant,saved.key]);
  if(!(await ds.query("SELECT id FROM property_definition WHERE tenant_id=? AND object_type_id=? AND `key`='followup_state'",[fixture.tenant,custom.id])).length){
    await records.mutate(fixture.account,fixture.tenant,{object:saved.key,kind:'properties'},{key:'followup_state',label:'Follow-up state',type:'enum',required:false,default_value:'new',options:['new','done'],indexed:true,sensitive:false},randomUUID(),String(custom.version),randomUUID());
  }
  if(!(await ds.query('SELECT id FROM association_type WHERE tenant_id=? AND `key`=?',[fixture.tenant,saved.relationKey])).length)await platform.mutate(fixture.account,fixture.tenant,'association-types',{key:saved.relationKey,label:'Synthetic Workflow relation',source_type:'contact',target_type:saved.key,cardinality:'one_to_many'},randomUUID(),undefined,randomUUID());
  if(!saved.record){const response=await records.mutate(fixture.account,fixture.tenant,{object:saved.key,kind:'records'},{fields:{},custom_values:{followup_state:'new'}},randomUUID(),undefined,randomUUID());saved.record=response.body.data.id;await writeFile(path,JSON.stringify(saved));}
  const before=await ds.query('SELECT id,version,custom_values FROM crm_record WHERE tenant_id=? AND id=?',[fixture.tenant,saved.record]);
  const ip=randomUUID(),challenge=await auth.challenge(ip);sid=await auth.login(fixture.login,fixture.password,challenge.token,challenge.browser,config.origin,ip);csrf=await auth.csrf(sid);
  class TestModule{}Module({controllers:[CrmController],providers:[{provide:AuthRuntime,useValue:{service:auth}},{provide:CrmRuntime,useValue:{ready:async()=>{},records,platform,ui:new CrmUi(records)}}]})(TestModule);
  app=await NestFactory.create(TestModule,{logger:false,bodyParser:false});safeJsonBody(app);app.setGlobalPrefix('api/v1');await app.listen(0,'127.0.0.1');const url=(await app.getUrl())+'/api/v1/automation/catalog';
  const get=async(headers={},suffix='')=>{const response=await fetch(url+suffix,{headers:{cookie:'crm_session='+sid,'x-tenant-id':fixture.tenant,...headers}});return {status:response.status,headers:response.headers,body:await response.json()};};
  let snapshot;
  await test('native authorized canonical catalog schema and real custom IDs',async()=>{
    const r=await get();assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.headers.get('cache-control'),'no-store');assert(validate(r.body.data),JSON.stringify(validate.errors));snapshot=r.body.data;
    const object=snapshot.objects.find(o=>o.id===custom.id);assert(object);assert.equal(object.properties[0].key,'followup_state');assert.equal(object.properties[0].writable,true);assert.equal(object.capabilities.object_change_events,false);assert(!JSON.stringify(snapshot).includes('default_value'));assert(!JSON.stringify(snapshot).includes(saved.record));
    const descriptor=await new CrmUi(records).descriptor(fixture.account,fixture.tenant,saved.key);assert.equal(object.properties[0].id,descriptor.custom[0].id);assert.equal(snapshot.relations.find(r=>r.key===saved.relationKey).target_object_type_id,custom.id);
  });
  await test('catalog repeat digest stable and real retained record unchanged',async()=>{
    assert.equal((await get()).body.data.revision,snapshot.revision);assert.deepEqual(await ds.query('SELECT id,version,custom_values FROM crm_record WHERE tenant_id=? AND id=?',[fixture.tenant,saved.record]),before);
  });
  await test('canonical label edit invalidates snapshot without changing property identity',async()=>{
    const p=snapshot.objects.find(o=>o.id===custom.id).properties[0];
    const changed=await records.mutate(fixture.account,fixture.tenant,{object:saved.key,kind:'properties',id:p.key},{label:p.label+' revised'},randomUUID(),p.version,randomUUID());
    try {const fresh=(await get()).body.data,property=fresh.objects.find(o=>o.id===custom.id).properties[0];assert.equal(property.id,p.id);assert.equal(property.label,p.label+' revised');assert.notEqual(fresh.revision,snapshot.revision);}
    finally {await records.mutate(fixture.account,fixture.tenant,{object:saved.key,kind:'properties',id:p.key},{label:p.label},randomUUID(),String(changed.body.data.version),randomUUID());}
  });
  await test('native session query validation and foreign membership rejected',async()=>{
    assert.equal((await get({cookie:''})).status,401);assert.equal((await get({'x-tenant-id':fixture.foreignTenant})).status,403);assert.equal((await get({'x-tenant-id':'bad'})).status,400);assert.equal((await get({},'?tenant=anything')).status,400);
  });
  await test('revoked designer and viewer seat fail immediately, no cached authority',async()=>{
    await rights(grants.filter(g=>g.resource!=='automation'));assert.equal((await get()).status,403);await rights(grants,'viewer');assert.equal((await get()).status,403);await rights();
  });
  await test('record visibility filters both ends of associations without schema grant',async()=>{
    await rights([{resource:'automation',action:'design',scope:'all'},{resource:saved.key,action:'read',scope:'own'}]);const r=await get();assert.equal(r.status,200);assert.deepEqual(r.body.data.objects.map(o=>o.id),[custom.id]);assert.equal(r.body.data.relations.length,0);assert.equal(r.body.data.objects[0].properties[0].writable,false);await rights();
  });
  const [contact]=await ds.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='contact'",[fixture.tenant]);
  for(const [id,field] of [[saved.policy,'normalized_email'],[saved.fieldPolicy,'normalized_phone']]) {
    const existing=await ds.query('SELECT * FROM field_policy WHERE tenant_id=? AND role_id=? AND object_type_id=? AND property_key=?',[fixture.tenant,fixture.role,contact.id,field]);
    policies.push({id,field,objectId:contact.id,existing});
  }
  await test('live field read deny redacts property and write/filter deny applied independently',async()=>{
    await ds.transaction(async m=>{
      await m.query('SELECT id FROM tenant WHERE id=? FOR UPDATE',[fixture.tenant]);
      for(const p of policies){const actions=p.field==='normalized_email'?['read']:['write','filter'];if(p.existing.length)await m.query('UPDATE field_policy SET denied_actions=? WHERE tenant_id=? AND id=?',[JSON.stringify(actions),fixture.tenant,p.existing[0].id]);else await m.query('INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[p.id,fixture.tenant,fixture.role,p.objectId,p.field,JSON.stringify(actions)]);}
      await m.query('UPDATE principal SET auth_revision=auth_revision+1 WHERE tenant_id=? AND id=?',[fixture.tenant,fixture.principal]);
    });
    const r=await get();assert.equal(r.status,200);const object=r.body.data.objects.find(o=>o.id===contact.id);assert(!object.properties.some(p=>p.key==='normalized_email'));const phone=object.properties.find(p=>p.key==='normalized_phone');assert.equal(phone.writable,false);assert.deepEqual(phone.filter_operators,[]);assert.notEqual(r.body.data.revision,snapshot.revision);
  });
  await test('real native catalog feeds Core validator; unavailable runtime never executable',async()=>{
    const fresh=(await get()).body.data,object=fresh.objects.find(o=>o.id===custom.id),property=object.properties[0];
    const graph={schema_version:1,catalog_revision:fresh.revision,root_object_id:custom.id,trigger:{operation:'updated',changed_property_ids:[property.id]},entry_node:'update',nodes:[{key:'update',type:'data.update_record',version:1,config:{target:{ref:'root'},fields:[{property_id:property.id,value:{literal:'done'}}]},next:'end'},{key:'end',type:'end',version:1,config:{outcome:'done'}}]};
    assert.deepEqual(validateAuthoringGraph(graph,fresh,fixture.tenant).issues,[]);assert.equal(validateAuthoringGraph(graph,fresh,fixture.tenant).executable,false);
    graph.nodes[0].config.fields[0].value.literal='invalid';assert.equal(validateAuthoringGraph(graph,fresh,fixture.tenant).valid,false);
    assert.deepEqual(await ds.query('SELECT id,version,custom_values FROM crm_record WHERE tenant_id=? AND id=?',[fixture.tenant,saved.record]),before);
  });
  await mkdir('artifacts/workflow-foundation',{recursive:true});await writeFile('artifacts/workflow-foundation/native.json',JSON.stringify({database:env.MYSQL_DATABASE,at:new Date().toISOString(),passed:groups.length,groups},null,2));
}finally{
  await ds.transaction(async m=>{await m.query('SELECT id FROM tenant WHERE id=? FOR UPDATE',[fixture.tenant]);for(const p of policies){if(p.existing.length)await m.query('UPDATE field_policy SET denied_actions=? WHERE tenant_id=? AND id=?',[typeof p.existing[0].denied_actions==='string'?p.existing[0].denied_actions:JSON.stringify(p.existing[0].denied_actions),fixture.tenant,p.existing[0].id]);else await m.query('DELETE FROM field_policy WHERE tenant_id=? AND id=?',[fixture.tenant,p.id]);}});
  await rights(original.permissions,original.seat_code);if(sid)await auth.logout(sid,config.origin,csrf).catch(()=>{});await app?.close();await pool.end();await ds.destroy();
}
