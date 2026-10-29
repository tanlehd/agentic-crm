import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID,randomBytes,createHmac} from 'node:crypto';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {ExternalController,ExternalRuntime} from '../../services/core-baseline/dist/modules/external-api/http.js';
import {AuthRuntime} from '../../services/core-baseline/dist/modules/identity/auth/http.js';
import {identityOwnerRoutes} from '../../services/core-baseline/dist/modules/identity/owner-http.js';
import {chatRuntimeNative} from './chat-runtime-native.mjs';
import {rootSQL} from './chat-native.mjs';
import {ChatExternalReads,chatExternalReadRoutes} from '../../services/chat/dist/external-reads.js';
import {ExternalApps,parseAppToken} from '../../services/core-baseline/dist/modules/identity/external-apps.js';
import {NativeExternalReadAdmissions,externalReadAdmissionRoutes} from '../../services/core-baseline/dist/modules/identity/external-read-admission.js';
import {NativeIdentityPolicyDrain} from '../../services/core-baseline/dist/modules/identity/owner-policy-drain.js';
import {UnitOfWork} from '../../services/core-baseline/dist/kernel/tenancy/unit-of-work.js';
import {conversationExternalCatalog} from '../../services/core-baseline/dist/modules/external-api/conversation-catalog.js';
import {ExternalData} from '../../services/core-baseline/dist/modules/external-api/service.js';
import {ExternalChatReadGateway} from '../../services/core-baseline/dist/gateway/chat-external-read.js';
import {createWorkloadServer,ownerClient,ownerCommandClient,remoteRegistryAuthority} from '../../packages/workload-transport/dist/index.js';

export async function chatExternalNative(ctx){
 const {check,operator,chatOperator,chatPool,commands,tenant,other,f,ds,adminSource,identity,identityClient,identityMaterial,transport,proofClient,chatMaterial,bffMaterial,chatAuthority,registryConfig,protocol,servers}=ctx;
 const path='.local/chat-ownership/external-read-fixture.json';let fixture;
 try{fixture=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;fixture={tenant,app:randomUUID(),team:randomUUID(),secondTeam:randomUUID(),conversation:randomUUID(),sibling:randomUUID(),contact:randomUUID(),connection:randomUUID(),messages:Array.from({length:3},()=>randomUUID()).sort(),cursorKey:randomBytes(32).toString('hex')};await writeFile(path,JSON.stringify(fixture),{flag:'wx',mode:0o600});}
 assert.equal(fixture.tenant,tenant);
 if(!fixture.bulkConversation){fixture.bulkConversation=randomUUID();fixture.bulkMessages=Array.from({length:40},()=>randomUUID());await writeFile(path,JSON.stringify(fixture),{mode:0o600});}
 rootSQL('GRANT SELECT,UPDATE(quota_minute,quota_count) ON native_identity_test.external_app TO identity_owner_test_runtime;');
 for(const id of [fixture.team,fixture.secondTeam])await operator.execute("INSERT INTO team(id,tenant_id,name,purpose,created_at,updated_at) VALUES (?,?,'Synthetic external Chat','chat',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[id,tenant]);
 for(const id of [fixture.conversation,fixture.sibling]){
  await chatOperator.execute("INSERT INTO crm_record(id,tenant_id,object_type_id,team_id,owner_principal_id,version,owner_revision,custom_values,created_at,updated_at) VALUES (?,?,?,?,?,1,1,'{}',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[id,tenant,f.object,fixture.team,f.principal]);
  await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at) VALUES (?,?,?,?,?,'open','2026-10-25 00:00:00.123456') ON DUPLICATE KEY UPDATE record_id=record_id",[tenant,id,fixture.contact,randomUUID(),fixture.connection]);
 }
 for(const id of fixture.messages)await chatOperator.execute("INSERT INTO message(tenant_id,id,conversation_id,connection_id,provider_message_id,direction,text,status,occurred_at,received_at) VALUES (?,?,?,?,?,'inbound','Synthetic external message','received','2026-10-25 00:00:01.123456','2026-10-25 00:00:01.123456') ON DUPLICATE KEY UPDATE id=id",[tenant,id,fixture.conversation,fixture.connection,id]);
 const apps=new ExternalApps(ds,async()=>conversationExternalCatalog),adminApps=new ExternalApps(adminSource,async()=>conversationExternalCatalog,new NativeIdentityPolicyDrain(new UnitOfWork(adminSource),t=>identity.drainTenant(t)));
 const admissions=new NativeExternalReadAdmissions(apps,(t,ref)=>proofClient(t,'command-proof',ref));
 const policyServer=createWorkloadServer(identityMaterial,transport,{...identityOwnerRoutes(identity),...externalReadAdmissionRoutes(admissions)});servers.push(policyServer);policyServer.listen(0,'127.0.0.1');await once(policyServer,'listening');
 const policyCall=ownerClient(chatMaterial,chatAuthority,'identity',new URL(protocol+'//127.0.0.1:'+policyServer.address().port+'/'));
 let unavailable=false,afterPolicy;
 const reads=new ChatExternalReads(commands,{policy:async(t,ref)=>{if(unavailable)throw new Error('Synthetic identity outage');const p=await policyCall(t,'external-policy',ref);if(afterPolicy)await afterPolicy();return p;},settle:(t,ref,id)=>identityClient(t,'settle',{owner:'chat',command:ref,admission_id:id})},fixture.cursorKey);
 const server=createWorkloadServer(chatMaterial,chatAuthority,chatExternalReadRoutes(reads));servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');
 const bffAuthority=remoteRegistryAuthority(bffMaterial,registryConfig),url=new URL(protocol+'//127.0.0.1:'+server.address().port+'/'),prepareCall=ownerClient(bffMaterial,bffAuthority,'chat',url),execute=ownerCommandClient(bffMaterial,bffAuthority,'chat',url);
 const prepare=request=>prepareCall(tenant,'external-prepare',request),gateway=new ExternalChatReadGateway(admissions,prepare,execute),data=new ExternalData(apps,null,gateway);
 const grants=[{object:'conversation',scope:'conversations.read',properties:['status','contact_id'],record_scope:'teams',team_ids:[fixture.team]},{object:'conversation.messages',scope:'conversations.messages.read',properties:['direction','text'],record_scope:'teams',team_ids:[fixture.team]}];
 const config={name:'Synthetic Chat external reads',description:'Retained native boundary fixture',status:'active',grants};
 let version,token,credential;
 const [[prior]]=await operator.execute('SELECT status,version FROM external_app WHERE tenant_id=? AND id=?',[tenant,fixture.app]);
 if(prior?.status==='revoked')throw new Error('RETAINED_APP_REVOKED_USE_EXPLICIT_NEW_FIXTURE');
 version=prior?String(prior.version):(await adminApps.change(f.adminAccount,tenant,'create',fixture.app,config,undefined,randomUUID())).data.version;
 async function change(next=config){version=(await adminApps.change(f.adminAccount,tenant,'update',fixture.app,next,version,randomUUID())).data.version;}
 async function rotate(){const issued=await adminApps.change(f.adminAccount,tenant,'token',fixture.app,{},version,randomUUID());version=issued.data.version;token=issued.token;credential=parseAppToken('Bearer '+token);}
 await change();await rotate();
 const call=(kind='conversations',id,messageId,query={})=>data.readConversation('Bearer '+token,tenant,kind,id,messageId,query);
 const bad=(p,code)=>assert.rejects(p,e=>e.code===code);
 const request=(operation,payload={})=>{const id=randomUUID();return {schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,command_id:id,operation,actor:{kind:'app',principal_id:fixture.app,delegation_id:id},payload};};
 await check('Chat external four native owner reads and public service forwarding preserve selected properties',async()=>{
  const list=await call();assert(list.data.some(r=>r.id===fixture.conversation));assert.equal((await call('conversations',fixture.conversation)).data.properties.status,'open');
  const messages=await call('messages',fixture.conversation);assert.equal(messages.data.length,3);assert.equal(messages.data[0].properties.text,'Synthetic external message');
  const detail=await call('messages',fixture.conversation,fixture.messages[0]);assert.equal(detail.data.conversation_id,fixture.conversation);assert.deepEqual(Object.keys(detail.data.properties).sort(),['direction','text']);
 });
 await check('Chat external original HMAC cursor and microsecond tie order, tamper and parent rejection',async()=>{
  const page=await call('messages',fixture.conversation,undefined,{limit:'1'});assert.equal(page.data[0].id,fixture.messages[0]);
  const second=await call('messages',fixture.conversation,undefined,{limit:'1',cursor:page.next_cursor});assert.equal(second.data[0].id,fixture.messages[1]);
  const raw=Buffer.from(JSON.stringify({binding:{tenant,policy:`${fixture.app}:${version}`,kind:'messages',parent:fixture.conversation},position:{time:'2026-10-25 00:00:01.123456',id:fixture.messages[0]}})).toString('base64url');
  const legacy=raw+'.'+createHmac('sha256',fixture.cursorKey).update(raw).digest('base64url');assert.equal((await call('messages',fixture.conversation,undefined,{cursor:legacy})).data[0].id,fixture.messages[1]);
  await bad(call('messages',fixture.sibling,undefined,{cursor:legacy}),'INVALID_CURSOR');await bad(call('messages',fixture.conversation,undefined,{cursor:legacy+'x'}),'INVALID_CURSOR');
 });
 await check('Chat external team grants intersect independently; shares do not merge grant policies',async()=>{
  await change({...config,grants:[grants[0],{...grants[1],team_ids:[fixture.secondTeam]}]});await bad(call('messages',fixture.conversation),'NOT_FOUND');
  await chatOperator.execute('INSERT INTO record_team_access(tenant_id,record_id,team_id) VALUES (?,?,?) ON DUPLICATE KEY UPDATE team_id=team_id',[tenant,fixture.conversation,fixture.secondTeam]);
  try{assert.equal((await call('messages',fixture.conversation)).data.length,3);}finally{await chatOperator.execute('DELETE FROM record_team_access WHERE tenant_id=? AND record_id=? AND team_id=?',[tenant,fixture.conversation,fixture.secondTeam]);}
  await change();
 });
 await check('Chat external metadata-only, missing message scope and old app-version cursor fail closed',async()=>{
  const page=await call('messages',fixture.conversation,undefined,{limit:1});
  await change({...config,grants:[grants[0],{...grants[1],properties:['direction']}]});assert.equal((await call('messages',fixture.conversation)).data[0].properties.text,undefined);
  await bad(call('messages',fixture.conversation,undefined,{cursor:page.next_cursor}),'INVALID_CURSOR');
  await change({...config,grants:[grants[0]]});await bad(call('messages',fixture.conversation),'MISSING_SCOPE');await change();
 });
 await check('Chat external wrong parent, archived, foreign tenant, invalid input and unauthenticated prepare cannot disclose',async()=>{
  await bad(call('messages',fixture.sibling,fixture.messages[0]),'NOT_FOUND');await bad(data.readConversation('Bearer '+token,other,'conversations',undefined,undefined,{}),'INVALID_TOKEN');
  await bad(call('conversations',fixture.conversation,undefined,{limit:1}),'INVALID_REQUEST');
  await chatOperator.execute('UPDATE crm_record SET archived_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[tenant,fixture.conversation]);
  try{await bad(call('messages',fixture.conversation),'NOT_FOUND');}finally{await chatOperator.execute('UPDATE crm_record SET archived_at=NULL WHERE tenant_id=? AND id=?',[tenant,fixture.conversation]);}
  const input=request('external-conversations');await prepare(input);await bad(execute(input),'FORBIDDEN');
  await bad(prepare({...request('external-conversations'),actor:{kind:'human',principal_id:f.principal,delegation_id:randomUUID()}}),'FORBIDDEN');
 });
 await check('Chat external quota charged once and original credentials never reach Chat command journal',async()=>{
  const [[prior]]=await operator.execute('SELECT quota_count,quota_minute FROM external_app WHERE tenant_id=? AND id=?',[tenant,fixture.app]);await call('conversations',fixture.conversation);
  const [[after]]=await operator.execute('SELECT quota_count,quota_minute FROM external_app WHERE tenant_id=? AND id=?',[tenant,fixture.app]);assert.equal(Number(after.quota_count),String(prior.quota_minute)===String(after.quota_minute)?Number(prior.quota_count)+1:1);
  const [[stored]]=await chatOperator.execute("SELECT COUNT(*) n FROM chat_owner_command WHERE tenant_id=? AND (request_json LIKE ? OR result_json LIKE ?)",[tenant,'%'+token+'%','%Synthetic external message%']);assert.equal(Number(stored.n),0);
 });
 await check('Chat external rotation drains admitted read; retry after lost prepare/admit ACK keeps one receipt',async()=>{
  const input=request('external-conversations-id',{id:fixture.conversation}),ref=await prepare(input);assert.deepEqual(await prepare(input),ref);
  await admissions.admit(credential,ref);await admissions.admit(credential,ref);
  const [[count]]=await operator.execute("SELECT COUNT(*) n FROM identity_owner_admission WHERE tenant_id=? AND command_id=?",[tenant,input.command_id]);assert.equal(Number(count.n),1);
  const old=token;await rotate();assert.equal((await commands.proof(tenant,ref)).state,'aborted');
  await bad(execute(input),'INVALID_TRANSITION');await bad(data.readConversation('Bearer '+old,tenant,'conversations',undefined,undefined,{}),'INVALID_TOKEN');assert((await call()).data.length);
 });
 await check('Chat external dependency outage and app disable return errors without local SQL fallback',async()=>{
  unavailable=true;try{await bad(call(),'DEPENDENCY_UNAVAILABLE');}finally{unavailable=false;}
  await change({...config,status:'disabled'});await bad(call(),'INVALID_TOKEN');await change();await rotate();
  const input=request('external-conversations-id',{id:fixture.conversation}),ref=await prepare(input);await admissions.admit(credential,ref);
  const results=await Promise.allSettled([execute(input),execute(input)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await commands.proof(tenant,ref)).state,'committed');
 });
 await check('Chat external expired credential, expired admission and wrong workload are rejected',async()=>{
  const input=request('external-conversations'),ref=await prepare(input);await admissions.admit(credential,ref);
  await operator.execute('UPDATE external_app SET token_expires_at=TIMESTAMPADD(SECOND,-1,UTC_TIMESTAMP(6)) WHERE tenant_id=? AND id=?',[tenant,fixture.app]);
  try{await bad(call(),'INVALID_TOKEN');await bad(execute(input),'REVOKED');}finally{await rotate();}
  const wrong=ownerCommandClient(identityMaterial,transport,'chat',url);await bad(wrong(request('external-conversations')),'FORBIDDEN');
  const foreign={...request('external-conversations'),tenant_id:other};await bad(prepare(foreign),'FORBIDDEN');
 });
 await check('Chat external revoke after policy acquisition fences the delayed read before response',async()=>{
  let release,ready;const held=new Promise(r=>{release=r;}),reached=new Promise(r=>{ready=r;});
  const input=request('external-conversations'),ref=await prepare(input);await admissions.admit(credential,ref);
  afterPolicy=async()=>{ready();await held;};const pending=execute(input);const denied=assert.rejects(pending,e=>['INVALID_TRANSITION','DEPENDENCY_UNAVAILABLE'].includes(e.code));
  try{await reached;await rotate();}finally{afterPolicy=undefined;release();}await denied;assert.equal((await commands.proof(tenant,ref)).state,'aborted');
  assert((await call()).data.length);
 });
 await check('Chat external actual public HTTP paths preserve errors, redaction and large message pages',async()=>{
  const require=createRequire(new URL('../../services/core-baseline/package.json',import.meta.url)),{Module}=require('@nestjs/common'),{NestFactory}=require('@nestjs/core');
  class PublicModule{}Module({controllers:[ExternalController],providers:[{provide:AuthRuntime,useValue:{}},{provide:ExternalRuntime,useValue:{ready:async()=>{},data}}]})(PublicModule);
  const app=await NestFactory.create(PublicModule,{logger:false});app.setGlobalPrefix('api/v1');await app.listen(0,'127.0.0.1');
  const origin=await app.getUrl(),get=async(path,expected=200,header=token)=>{const r=await fetch(origin+'/api/v1/external/'+path,{headers:{Authorization:'Bearer '+header,'x-tenant-id':tenant}});assert.equal(r.status,expected);assert.equal(r.headers.get('cache-control'),'no-store');return r.json();};
  try{
   for(const path of ['conversations','conversations/'+fixture.conversation,'conversations/'+fixture.conversation+'/messages','conversations/'+fixture.conversation+'/messages/'+fixture.messages[0]])assert((await get(path)).data);
   assert.equal((await get('conversations',401,'invalid')).error.code,'INVALID_TOKEN');assert.equal((await get('conversations/'+fixture.sibling+'/messages/'+fixture.messages[0],404)).error.code,'NOT_FOUND');
   await chatOperator.execute("INSERT INTO crm_record(id,tenant_id,object_type_id,team_id,owner_principal_id,version,owner_revision,custom_values,created_at,updated_at) VALUES (?,?,?,?,?,1,1,'{}',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[fixture.bulkConversation,tenant,f.object,fixture.team,f.principal]);
   await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at) VALUES (?,?,?,?,?,'open','2026-10-25 00:00:00.123456') ON DUPLICATE KEY UPDATE record_id=record_id",[tenant,fixture.bulkConversation,fixture.contact,randomUUID(),fixture.connection]);
   for(const id of fixture.bulkMessages)await chatOperator.execute("INSERT INTO message(tenant_id,id,conversation_id,connection_id,provider_message_id,direction,text,status,occurred_at,received_at) VALUES (?,?,?,?,?,'inbound',?,'received','2026-10-25 00:00:01.123456','2026-10-25 00:00:01.123456') ON DUPLICATE KEY UPDATE id=id",[tenant,id,fixture.bulkConversation,fixture.connection,id,'\n'.repeat(4000)]);
   const response=await get('conversations/'+fixture.bulkConversation+'/messages');assert.equal(response.data.length,40);assert.equal(response.data[0].properties.text.length,4000);assert(Buffer.byteLength(JSON.stringify(response))>262144);
   await change({...config,grants:[grants[0],{...grants[1],properties:['direction']}]});assert.equal((await get('conversations/'+fixture.conversation+'/messages')).data[0].properties.text,undefined);await change();
  }finally{await app.close();}
 });
 if(process.argv.includes('--with-runtime'))await chatRuntimeNative({...ctx,bffAuthority,apps,admissions,token,fixture,policyUrl:new URL(protocol+'//127.0.0.1:'+policyServer.address().port+'/')});
}
