import assert from 'node:assert/strict';
import {nativeChatParity} from './chat-runtime-parity.mjs';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {readFile,writeFile} from 'node:fs/promises';
import {ChatSessionSource,chatSessionSourceRoutes} from '../../services/chat/dist/session-source.js';
import {chatCommandRecoveryHandlers} from '../../services/chat/dist/command-reconciliation.js';
import {createWorkloadServer,ownerCommandClient,remoteRegistryAuthority,ownerDigest} from '../../packages/workload-transport/dist/index.js';
export async function chatSessionSourceNative(ctx){
 const {check,operator,chatOperator,commands,tenant,other,v,f,ref,enrollment,peers,chatMaterial,chatAuthority,salesMaterial,workflowMaterial,bffMaterial,registryConfig,protocol,servers}=ctx;
 const path='.local/chat-ownership/session-source-fixture.json';let fixture;
 try{fixture=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;fixture={tenant,role:randomUUID(),actor:randomUUID(),runs:[]};}
 assert.equal(fixture.tenant,tenant);const legacy=randomUUID(),legacyIdentity=randomUUID();fixture.runs.push(legacy);await writeFile(path,JSON.stringify(fixture));
 const grants=['conversation','contact'].map(resource=>({resource,action:'read',scope:'all'}));
 await operator.execute("INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,'t06_session_source','Synthetic session source',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[fixture.role,tenant,JSON.stringify(grants)]);
 await operator.execute("INSERT INTO service_actor(id,tenant_id,`key`,role_id,created_at,updated_at) VALUES (?,?,'t06_session_source',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[fixture.actor,tenant,fixture.role]);
 await operator.execute('INSERT INTO contact_identity(id,tenant_id,connection_id,contact_id,external_subject_id) VALUES (?,?,?,?,?)',[legacyIdentity,tenant,ref.connection,ref.contact,'synthetic-session-source-'+legacyIdentity]);
 await chatOperator.execute('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[legacy,tenant,f.object,f.principal]);
 await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at) VALUES (?,?,?,?,?,'open',UTC_TIMESTAMP(6))",[tenant,legacy,ref.contact,legacyIdentity,ref.connection]);
 await chatOperator.execute('INSERT INTO chat_control_head(tenant_id,conversation_id,registry_revision,control_revision,cancel_through,pause_through,version,created_at,updated_at) VALUES (?,?,1,1,0,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[tenant,legacy]);
 const sourcePeers={admit:peers.admit,settle:peers.settle,contact:peers.contact,channel:ctx.sourceChannel};
 const server=createWorkloadServer(chatMaterial,chatAuthority,chatSessionSourceRoutes(new ChatSessionSource(commands,sourcePeers)));servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');
 const client=m=>ownerCommandClient(m,remoteRegistryAuthority(m,registryConfig),'chat',new URL(protocol+'//127.0.0.1:'+server.address().port+'/')),call=client(salesMaterial),serviceCall=client(workflowMaterial);
 const request=(payload={},service=false)=>({schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,operation:'session-source',command_id:randomUUID(),actor:service?{kind:'service',principal_id:fixture.actor,delegation_id:fixture.actor}:{kind:'human',principal_id:f.principal,delegation_id:enrollment.delegationId},payload:{conversation_id:v.conversation,session_id:v.session,contact_id:ref.contact,...payload}}),bad=(promise,code)=>assert.rejects(promise,e=>e.code===code);
 const hash=async()=>{const [sessions]=await chatOperator.execute('SELECT * FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=?',[tenant,v.conversation]);return ownerDigest(JSON.parse(JSON.stringify(sessions)));};
 if(process.argv.includes('--with-runtime'))await check('Chat need session source runtime preserves closed attribution, Human and service ACL without Reporting',async()=>{
  const candidate=await nativeChatParity(ctx,{crm:new URL(protocol+'//127.0.0.1:'+ctx.crmServer.address().port+'/'),connector:new URL(protocol+'//127.0.0.1:'+ctx.sourceChannelServer.address().port+'/')});
  try{
   const caller=m=>ownerCommandClient(m,remoteRegistryAuthority(m,registryConfig),'chat',candidate.url),human=caller(salesMaterial),service=caller(workflowMaterial),before=await hash();
   const r=await human(request());assert.equal(r.session_id,v.session);assert.equal(r.crm_contact_id,ref.contact);assert.equal(r.source_classification,'organic');assert.equal(r.source_page_id,'synthetic-need');assert.equal(r.source_connection_id,ref.connection);
   assert.deepEqual(await service(request({},true)),r);await candidate.crashRestart();assert.deepEqual(await human(request()),r);assert.equal(await hash(),before);
   await bad(human(request({contact_id:randomUUID()})),'CONTACT_BINDING_MISMATCH');await bad(human(request({session_id:null})),'SESSION_SELECTION_REQUIRED');assert(candidate.proofCount()>0);
  }finally{await candidate.stop();}
 });
 await check('Chat need session source exact closed attribution Human and service boundary',async()=>{
  const before=await hash(),r=await call(request());assert.equal(r.session_id,v.session);assert.equal(r.crm_contact_id,ref.contact);assert.equal(r.source_classification,'organic');assert.equal(r.source_page_id,'synthetic-need');assert.equal(r.source_connection_id,ref.connection);assert.equal(r.session_revision,'2');assert.equal(Object.keys(r).length,12);
  assert.deepEqual(await serviceCall(request({},true)),r);assert.equal(await hash(),before);
 });
 await check('Chat need session source active selection historical ambiguity and legacy fallback',async()=>{
  await bad(call(request({session_id:null})),'SESSION_SELECTION_REQUIRED');
  await chatOperator.execute("UPDATE conversation_acquisition_session SET status='active',closed_at=NULL,close_reason=NULL,version=version+1 WHERE tenant_id=? AND id=?",[tenant,v.session]);
  try{assert.equal((await call(request({session_id:null}))).session_id,v.session);}finally{await chatOperator.execute("UPDATE conversation_acquisition_session SET status='closed',closed_at=UTC_TIMESTAMP(6),close_reason='agent_closed',version=version+1 WHERE tenant_id=? AND id=?",[tenant,v.session]);}
  const channel=await ctx.sourceChannel(tenant,ref.connection,legacy),r=await call(request({conversation_id:legacy,session_id:null}));assert.equal(r.session_id,null);assert.equal(r.session_revision,'0');assert.equal(r.source_touchpoint_id,channel.source_touchpoint_id);assert.equal(r.source_channel,channel.channel);assert.equal(r.source_page_id,channel.page_id);
  const [[count]]=await chatOperator.execute('SELECT COUNT(*) n FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=?',[tenant,legacy]);assert.equal(Number(count.n),0);
 });
 await check('Chat need session source wrong tenant peer Contact and exact session',async()=>{
  await bad(call({...request(),tenant_id:other}),'NOT_FOUND');await bad(call(request({session_id:randomUUID()})),'NOT_FOUND');await bad(call(request({contact_id:randomUUID()})),'CONTACT_BINDING_MISMATCH');await assert.rejects(client(bffMaterial)(request()));
  await bad(serviceCall({...request({},true),actor:{kind:'service',principal_id:fixture.actor,delegation_id:randomUUID()}}),'FORBIDDEN');
 });
 await check('Chat need session source earliest bound Connector evidence excludes pending source',async()=>{
  const first=randomUUID();
  for(const [id,state,day] of [[randomUUID(),'prepared','01'],[first,'bound','02'],[randomUUID(),'bound','03']])await operator.execute(`INSERT INTO channel_ingress_touchpoint(tenant_id,id,command_id,receipt_id,connection_id,contact_id,identity_id,binding_digest,provider_message_digest,evidence,state,conversation_id,message_id,session_id,terminal_digest,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`,[tenant,id,randomUUID(),randomUUID(),ref.connection,ref.contact,legacyIdentity,'1'.repeat(64),'2'.repeat(64),JSON.stringify({ad_id:'synthetic-'+day,campaign_id:'synthetic-source'}),state,state==='bound'?legacy:null,state==='bound'?randomUUID():null,null,state==='bound'?'3'.repeat(64):null,'2026-01-'+day+' 00:00:00','2026-01-'+day+' 00:00:00']);
  const result=await call(request({conversation_id:legacy,session_id:null}));assert.equal(result.source_touchpoint_id,first);assert.equal(result.source_ad_id,'synthetic-02');assert.equal(result.source_classification,'paid');
 });
 await check('Chat need session source current record Contact and field authority',async()=>{
  for(const key of ['contact_id','attribution','channel','channel_id','page_id'])await ctx.field(f.object,key,['read'],()=>bad(call(request()),'FIELD_FORBIDDEN'));
  await ctx.setRole(ctx.grants.filter(g=>g.resource!=='conversation'));try{await bad(call(request()),'NOT_FOUND');}finally{await ctx.setRole(ctx.grants);}
  await ctx.setRole(ctx.grants.filter(g=>g.resource!=='contact'));try{await bad(call(request()),'NOT_FOUND');}finally{await ctx.setRole(ctx.grants);}
  await operator.execute('UPDATE service_actor SET active=0,auth_revision=auth_revision+1 WHERE tenant_id=? AND id=?',[tenant,fixture.actor]);try{await bad(serviceCall(request({},true)),'FORBIDDEN');}finally{await operator.execute('UPDATE service_actor SET active=1,auth_revision=auth_revision+1 WHERE tenant_id=? AND id=?',[tenant,fixture.actor]);}
 });
 await check('Chat need session source actual owner outages and changed local snapshot',async()=>{
  for(const source of [ctx.crmServer,ctx.sourceChannelServer]){
   const port=source.address().port;source.closeAllConnections();await new Promise(r=>source.close(r));
   try{await bad(call(request({conversation_id:legacy,session_id:null})),'DEPENDENCY_UNAVAILABLE');}finally{source.listen(port,'127.0.0.1');await once(source,'listening');}
  }
  const contact=sourcePeers.contact;sourcePeers.contact=async(...args)=>{const result=await contact(...args);await chatOperator.execute('UPDATE conversation_acquisition_session SET version=version+1 WHERE tenant_id=? AND id=?',[tenant,v.session]);return result;};try{await bad(call(request()),'STALE_VERSION');}finally{sourcePeers.contact=contact;}
 });
 await check('Chat need session source completed native revoke aborts disclosure',async()=>{
  const contact=sourcePeers.contact,barrier=randomUUID();let original;
  sourcePeers.contact=async(t,command,admission)=>{const result=await contact(t,command,admission);original=command;await ctx.identity.beginRoleChange(tenant,ctx.adminSessionHash,barrier,fixture.role,[]);assert.equal((await ctx.identity.drainRoleChange(tenant,barrier)).state,'completed');return result;};
  try{await bad(serviceCall(request({},true)),'INVALID_TRANSITION');assert.equal((await commands.proof(tenant,original)).state,'aborted');}
  finally{sourcePeers.contact=contact;const restore=randomUUID();await ctx.identity.beginRoleChange(tenant,ctx.adminSessionHash,restore,fixture.role,grants);assert.equal((await ctx.identity.drainRoleChange(tenant,restore)).state,'completed');}
 });
 await check('Chat need session source terminal admission recovers without re-reading source',async()=>{
  const settle=sourcePeers.settle;let lost;
  sourcePeers.settle=async(t,command,admission)=>{lost={command,admission};const e=new Error('Synthetic settlement outage');e.code='DEPENDENCY_UNAVAILABLE';throw e;};
  try{await bad(call(request()),'DEPENDENCY_UNAVAILABLE');}finally{sourcePeers.settle=settle;}
  const proof=await commands.proof(tenant,lost.command);assert.equal(proof.state,'committed');
  const handlers=chatCommandRecoveryHandlers(commands,{call:(t,owner,op,payload)=>{assert.equal(owner,'identity');return ctx.identityClient(t,op,payload);}},{ });await handlers.get('session-source')(tenant,lost.command,proof);
  assert.equal((await ctx.identityClient(tenant,'admission-read',{owner:'chat',command:lost.command,admission_id:lost.admission})).state,'settled');
 });
}
