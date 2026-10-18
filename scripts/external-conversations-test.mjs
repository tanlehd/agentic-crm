import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createRequire} from 'node:module';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {databaseSource} from '../apps/backend/dist/kernel/database/data-source.js';
import {fixtureId} from '../apps/backend/dist/modules/identity/seed.js';
import {ExternalApps} from '../apps/backend/dist/modules/identity/external-apps.js';
import {ExternalData} from '../apps/backend/dist/modules/external-api/service.js';
import {appCatalog} from '../apps/backend/dist/modules/external-api/catalog.js';
import {ExternalConversations} from '../apps/backend/dist/modules/conversation/external-port.js';
import {ExternalController,ExternalRuntime} from '../apps/backend/dist/modules/external-api/http.js';
import {AuthRuntime} from '../apps/backend/dist/modules/identity/auth/http.js';
import {CrmRecords} from '../apps/backend/dist/modules/crm/records.js';
import {coreDomains} from '../apps/backend/dist/modules/crm/core.js';
import {externalOpenApi} from '../apps/backend/dist/modules/external-api/openapi.js';
const env=parseEnv(await readFile('.local/native-auth-test.env','utf8'));assert.equal(env.MYSQL_HOST,'127.0.0.1');assert.equal(env.MYSQL_DATABASE,'native_identity_test');Object.assign(process.env,env,{MYSQL_DATABASE:'native_seed_test'});
const ds=databaseSource(true);await ds.initialize();
const tenant=fixtureId('clinic_alpha'),beta=fixtureId('clinic_beta'),fid=key=>fixtureId('external-conversations:'+key),appId=fid('app'),teamA=fid('team-a'),teamB=fid('team-b'),ids=['a','b','shared','archived'].map(fid),checks=[];
const run=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name);};
const apps=new ExternalApps(ds,appCatalog),data=new ExternalData(apps,new CrmRecords(ds,'synthetic',coreDomains()),new ExternalConversations('synthetic-chat-cursor'));
const require=createRequire(new URL('../apps/backend/package.json',import.meta.url)),{Module}=require('@nestjs/common'),{NestFactory}=require('@nestjs/core');
class TestModule{}Module({controllers:[ExternalController],providers:[{provide:AuthRuntime,useValue:{}},{provide:ExternalRuntime,useValue:{ready:async()=>{},data}}]})(TestModule);
const server=await NestFactory.create(TestModule,{logger:false});server.setGlobalPrefix('api/v1');await server.listen(0,'127.0.0.1');const origin=await server.getUrl();
let app,token,account;
const parent={object:'conversation',scope:'conversations.read',properties:['status'],record_scope:'all',team_ids:[]},message={object:'conversation.messages',scope:'conversations.messages.read',properties:['status'],record_scope:'all',team_ids:[]};
const config=grants=>({name:'Synthetic External Conversations retained',description:'Isolated test app; retained disabled',status:'active',grants});
const change=async(action,body)=>{const r=await apps.change(account,tenant,action,appId,body,app.version,'synthetic-external-conversations');app=r.data;return r;};
const configure=grants=>change('update',config(grants));
const api=async(path,status=200,credential=token,headers={})=>{const r=await fetch(origin+'/api/v1/external'+path,{headers:{Authorization:'Bearer '+credential,...headers}});assert.equal(r.status,status,path);assert.equal(r.headers.get('cache-control'),'no-store');const body=await r.json();assert(body.meta.correlation_id);assert(!JSON.stringify(body).includes(credential));return body;};
const fail=(fn,status)=>assert.rejects(fn,e=>e.status===status);
try{
 const [m]=await ds.query('SELECT account_id FROM membership WHERE tenant_id=? AND id=?',[tenant,fixtureId('alpha:member:alpha_admin')]);account=m.account_id;
 for(const [id,name]of [[teamA,'A'],[teamB,'B']]){await ds.query("INSERT IGNORE INTO team(id,tenant_id,name,purpose,active,created_at,updated_at) VALUES (?,?,?,'general',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[id,tenant,'Synthetic External Conversations '+name]);await ds.query('UPDATE team SET active=1 WHERE tenant_id=? AND id=?',[tenant,id]);}
 const [source]=await ds.query('SELECT c.*,r.object_type_id FROM conversation c JOIN crm_record r ON r.tenant_id=c.tenant_id AND r.id=c.record_id WHERE c.tenant_id=? LIMIT 1',[tenant]);assert(source);
 for(let i=0;i<ids.length;i++){
  const id=ids[i];await ds.query('INSERT IGNORE INTO crm_record(id,tenant_id,object_type_id,team_id,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[id,tenant,source.object_type_id,i===1?teamB:teamA]);
  await ds.query("INSERT IGNORE INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,channel,status,opened_at,closed_at) VALUES (?,?,?,?,?,?,'closed','2026-01-01 00:00:00.123456','2026-01-02 00:00:00.000000')",[tenant,id,source.contact_id,source.contact_identity_id,source.connection_id,source.channel]);
  for(let n=0;n<3;n++)await ds.query("INSERT IGNORE INTO message(id,tenant_id,conversation_id,connection_id,provider_message_id,direction,text,occurred_at,received_at,status) VALUES (?,?,?,?,?,'inbound',?,'2026-01-01 00:00:00.123456','2026-01-01 00:00:00.123456','received')",[fid('message-'+i+'-'+n),tenant,id,source.connection_id,'synthetic-external-conversations-'+i+'-'+n,'Synthetic external conversation text '+n]);
 }
 await ds.query('INSERT IGNORE INTO record_team_access(tenant_id,record_id,team_id) VALUES (?,?,?)',[tenant,ids[2],teamB]);
 await ds.query('UPDATE crm_record SET archived_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[tenant,ids[3]]);
 app=(await apps.list(account,tenant)).data.find(a=>a.id===appId);
 if(app)await configure([parent]);else app=(await apps.change(account,tenant,'create',appId,config([parent]),undefined,'synthetic-external-conversations')).data;
 // Reset only this named test app's quota for repeatable retained-fixture runs.
 await ds.query('UPDATE external_app SET quota_count=0 WHERE tenant_id=? AND id=?',[tenant,appId]);
 token=(await change('token',{expires_in_days:1})).token;
 await run('catalog and grant dependency; CRM scopes never imply Conversation',async()=>{
  const catalog=(await apps.discover(account,tenant)).data;assert(catalog.some(c=>c.key==='conversation.messages'&&c.properties.find(p=>p.key==='text').sensitive));
  await fail(()=>configure([message]),400);await fail(()=>configure([{...parent,properties:['text']}]),400);
  await configure([{object:'contact',scope:'crm.objects.contact.read',properties:['display_name'],record_scope:'all',team_ids:[]}]);await api('/conversations',403);await api('/crm/objects/contact?limit=1');await configure([parent]);
 });
 await run('metadata list/detail selected properties; no transcript or generic CRM bypass',async()=>{
  const r=await api('/conversations/'+ids[0]);assert.deepEqual(Object.keys(r.data).sort(),['id','properties','version']);assert.deepEqual(r.data.properties,{status:'closed'});
  const list=await api('/conversations?limit=1');assert.equal(list.data.length,1);assert(list.next_cursor);assert.deepEqual(Object.keys(list.data[0].properties),['status']);
  await api('/conversations/'+ids[0]+'/messages',403);await api('/crm/objects/conversation',403);
 });
 await configure([parent,message]);
 const ajv=addFormats(new Ajv2020({strict:false})),defs=JSON.parse(JSON.stringify(externalOpenApi.components.schemas).replaceAll('#/components/schemas/','#/$defs/'));
 await run('message list/detail parent binding and schema; text opt-in and hidden fields excluded',async()=>{
  let r=await api('/conversations/'+ids[0]+'/messages');assert.equal(r.data.length,3);for(const item of r.data){assert.deepEqual(Object.keys(item).sort(),['conversation_id','id','properties']);assert.deepEqual(item.properties,{status:'received'});assert(ajv.compile({$defs:defs,...defs.Message})(item));}
  await configure([parent,{...message,properties:['text','direction','received_at','occurred_at']}]);r=await api('/conversations/'+ids[0]+'/messages/'+fid('message-0-0'));assert.equal(r.data.properties.text,'Synthetic external conversation text 0');assert.equal(r.data.properties.direction,'inbound');assert(ajv.compile({$defs:defs,...defs.Message})(r.data));
  await api('/conversations/'+ids[1]+'/messages/'+fid('message-0-0'),404);
 });
 await run('same-microsecond message pagination has no skips/duplicates; signed cursor context',async()=>{
  const first=await api('/conversations/'+ids[0]+'/messages?limit=1'),seen=[first.data[0].id];let cursor=first.next_cursor;
  while(cursor){const r=await api('/conversations/'+ids[0]+'/messages?limit=1&cursor='+encodeURIComponent(cursor));seen.push(...r.data.map(x=>x.id));cursor=r.next_cursor;}assert.equal(seen.length,3);assert.equal(new Set(seen).size,3);
  await api('/conversations/'+ids[1]+'/messages?cursor='+encodeURIComponent(first.next_cursor),400);await api('/conversations?cursor='+encodeURIComponent(first.next_cursor),400);await api('/conversations/'+ids[0]+'/messages?cursor='+encodeURIComponent(first.next_cursor+'x'),400);
  const otherId=fid('cursor-app');let other=(await apps.list(account,tenant)).data.find(x=>x.id===otherId);other=(await apps.change(account,tenant,other?'update':'create',otherId,config([parent,message]),other?.version,'synthetic')).data;
  const otherIssued=await apps.change(account,tenant,'token',otherId,{},other.version,'synthetic');try{await api('/conversations/'+ids[0]+'/messages?cursor='+encodeURIComponent(first.next_cursor),400,otherIssued.token);}finally{await apps.change(account,tenant,'update',otherId,{...config([parent,message]),status:'disabled'},otherIssued.data.version,'synthetic');}
  await configure([parent,message]);await api('/conversations/'+ids[0]+'/messages?cursor='+encodeURIComponent(first.next_cursor),400);
 });
 const scoped=(g,t)=>({...g,record_scope:'teams',team_ids:[t]});
 await run('independent team scope intersection and explicit sharing, list/detail',async()=>{
  await configure([scoped(parent,teamA),scoped(message,teamB)]);
  await api('/conversations/'+ids[0]);await api('/conversations/'+ids[0]+'/messages',404);await api('/conversations/'+ids[1]+'/messages',404);assert.equal((await api('/conversations/'+ids[2]+'/messages')).data.length,3);
  const r=await api('/conversations?limit=1');assert(r.next_cursor);const next=await api('/conversations?limit=1&cursor='+encodeURIComponent(r.next_cursor));assert.notEqual(r.data[0].id,next.data[0].id);assert.deepEqual(new Set([r.data[0].id,next.data[0].id]),new Set([ids[0],ids[2]]));assert.equal(next.next_cursor,null);
  await configure([parent,scoped(message,teamB)]);await api('/conversations/'+ids[0]+'/messages',404);await api('/conversations/'+ids[1]+'/messages');
 });
 await run('inactive approved team fails closed on next request',async()=>{
  await ds.query('UPDATE team SET active=0 WHERE tenant_id=? AND id=?',[tenant,teamB]);try{await api('/conversations/'+ids[1]+'/messages',404);await api('/conversations/'+ids[2]+'/messages',404);}finally{await ds.query('UPDATE team SET active=1 WHERE tenant_id=? AND id=?',[tenant,teamB]);}
 });
 await configure([parent,message]);
 await run('archived/missing/foreign parent and tenant selectors rejected',async()=>{
  await api('/conversations/'+ids[3],404);await api('/conversations/'+ids[3]+'/messages',404);await api('/conversations/'+fid('missing'),404);
  await api('/conversations',401,token,{'X-Tenant-Id':beta});await api('/conversations',401,token.replace(tenant,beta));
  const [bm]=await ds.query('SELECT account_id FROM membership WHERE tenant_id=? AND id=?',[beta,fixtureId('beta:member:beta_admin')]),bid=fid('beta-app');let b=(await apps.list(bm.account_id,beta)).data.find(x=>x.id===bid);
  const c=config([parent,message]);b=(await apps.change(bm.account_id,beta,b?'update':'create',bid,c,b?.version,'synthetic')).data;
  const issued=await apps.change(bm.account_id,beta,'token',bid,{},b.version,'synthetic');try{await api('/conversations/'+ids[0],404,issued.token);await api('/conversations/'+ids[0]+'/messages',404,issued.token);}finally{await apps.change(bm.account_id,beta,'update',bid,{...c,status:'disabled'},issued.data.version,'synthetic');}
 });
 await run('strict query/detail routes, token rotation and live removal',async()=>{
  for(const suffix of ['?limit=0','?limit=101','?limit=1&limit=2','?filter=text','?token=x','/bad-id'])await api('/conversations'+suffix,400);
  await api('/conversations/'+ids[0]+'?limit=1',400);await api('/conversations/'+ids[0]+'/messages/'+fid('message-0-0')+'?cursor=x',400);
  const old=token;token=(await change('token',{})).token;await api('/conversations',401,old);await configure([parent]);await api('/conversations/'+ids[0]+'/messages',403);
 });
 await run('shared persistent quota applies to Conversation and CRM routes',async()=>{
  await ds.query('UPDATE external_app SET quota_minute=FLOOR(UNIX_TIMESTAMP()/60),quota_count=119 WHERE tenant_id=? AND id=?',[tenant,appId]);await api('/conversations');await api('/scopes',429);
 });
 await mkdir('artifacts/external-conversations',{recursive:true});await writeFile('artifacts/external-conversations/native.json',JSON.stringify({status:'PASS',at:new Date().toISOString(),environment:'native_seed_test MySQL; ephemeral real Nest HTTP controller; synthetic fixtures retained',checks},null,2));console.log('PASS '+checks.length+' MySQL/HTTP groups');
}finally{
 try{if(app)await change('update',{...config([parent,message]),status:'disabled'});}finally{await server.close();await ds.destroy();}
}
