import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {once} from 'node:events';
import {ChatNeedSource,chatNeedSourceRoutes} from '../../services/chat/dist/need-source.js';
import {chatCommandRecoveryHandlers} from '../../services/chat/dist/command-reconciliation.js';
import {createWorkloadServer,ownerCommandClient,remoteRegistryAuthority,ownerDigest} from '../../packages/workload-transport/dist/index.js';

export async function chatNeedSourceNative(ctx){
 const {check,operator,chatOperator,commands,tenant,other,f,v,ref,peers,version,crmServer,identityClient,chatMaterial,chatAuthority,workflowMaterial,bffMaterial,registryConfig,protocol,servers,projectionObjects}=ctx;
 const path='.local/chat-ownership/need-source-fixture.json';let fixture;
 try{fixture=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;fixture={tenant,actor:randomUUID(),role:randomUUID()};await writeFile(path,JSON.stringify(fixture));}
 assert.equal(fixture.tenant,tenant);
 const grants=['conversation','contact'].map(resource=>({resource,action:'read',scope:'all'}));
 await operator.execute("INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,'t06_need_source','Synthetic need source',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[fixture.role,tenant,JSON.stringify(grants)]);
 await operator.execute("INSERT INTO service_actor(id,tenant_id,`key`,role_id,created_at,updated_at) VALUES (?,?,'t06_need_source',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[fixture.actor,tenant,fixture.role]);
 const sourcePeers={admit:peers.admit,settle:peers.settle,contact:peers.contact};
 const server=createWorkloadServer(chatMaterial,chatAuthority,chatNeedSourceRoutes(new ChatNeedSource(commands,sourcePeers)));servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');
 const url=new URL(protocol+'//127.0.0.1:'+server.address().port+'/'),call=ownerCommandClient(workflowMaterial,remoteRegistryAuthority(workflowMaterial,registryConfig),'chat',url),wrongPeer=ownerCommandClient(bffMaterial,remoteRegistryAuthority(bffMaterial,registryConfig),'chat',url);
 const fields=['assessment_status','need_clarity','intent','product_interest','unresolved_reason'],empty={current:false,...Object.fromEntries(fields.map(f=>[f,'']))},assessment=await version();
 const request=(payload={})=>({schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,operation:'read-need',command_id:randomUUID(),actor:{kind:'service',principal_id:fixture.actor,delegation_id:fixture.actor},payload:{conversation_id:v.conversation,session_id:v.session,need_id:v.need,assessment_version:assessment,...payload}});
 const bad=(p,code)=>assert.rejects(p,e=>e.code===code),state=async()=>{
  const [need]=await chatOperator.execute('SELECT * FROM need_assessment WHERE tenant_id=? AND need_id=?',[tenant,v.need]);
  const [history]=await chatOperator.execute('SELECT * FROM need_assessment_revision WHERE tenant_id=? AND need_id=? ORDER BY version',[tenant,v.need]);
  const [events]=await chatOperator.execute('SELECT * FROM outbox_event WHERE tenant_id=? AND aggregate_id=? ORDER BY id',[tenant,v.need]);
  return ownerDigest(JSON.parse(JSON.stringify({need,history,events})));
 };
 await check('Chat need source current closed history stale and mismatched pins preserve data',async()=>{
  const before=await state(),[[row]]=await chatOperator.execute('SELECT values_json FROM need_assessment WHERE tenant_id=? AND need_id=?',[tenant,v.need]),values=typeof row.values_json==='string'?JSON.parse(row.values_json):row.values_json;
  assert.deepEqual(await call(request()),{current:true,...Object.fromEntries(fields.map(f=>[f,String(values[f]??'')]))});
  for(const input of [{assessment_version:String(BigInt(assessment)+1n)},{need_id:randomUUID()},{session_id:randomUUID()}])assert.deepEqual(await call(request(input)),empty);
  await bad(call(request({assessment_version:'0'})),'INVALID_REQUEST');
  assert.equal(await state(),before);
 });
 await check('Chat need source tenant workload peer and actor isolation',async()=>{
  await bad(call({...request(),tenant_id:other}),'NOT_FOUND');await bad(call(request({conversation_id:randomUUID()})),'NOT_FOUND');
  await assert.rejects(wrongPeer(request()));
  for(const actor of [{kind:'human',principal_id:f.principal,delegation_id:ctx.enrollment.delegationId},{kind:'service',principal_id:fixture.actor,delegation_id:randomUUID()},{kind:'service',principal_id:randomUUID(),delegation_id:randomUUID()}])await bad(call({...request(),actor}),'FORBIDDEN');
 });
 await check('Chat need source current service role and every builtin field policy',async()=>{
  await operator.execute('UPDATE service_actor SET active=0,auth_revision=auth_revision+1 WHERE tenant_id=? AND id=?',[tenant,fixture.actor]);try{await bad(call(request()),'FORBIDDEN');}finally{await operator.execute('UPDATE service_actor SET active=1,auth_revision=auth_revision+1 WHERE tenant_id=? AND id=?',[tenant,fixture.actor]);}
  for(const resource of ['contact','conversation']){
   await operator.execute('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants.filter(g=>g.resource!==resource)),tenant,fixture.role]);try{await bad(call(request()),'FORBIDDEN');}finally{await operator.execute('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants),tenant,fixture.role]);}
  }
  for(const [object,key] of [...fields.map(key=>[projectionObjects.get(tenant).conversation_need,key]),...['text','contact_id'].map(key=>[f.object,key])]){
   await operator.execute("INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,?,'[\"read\"]',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE denied_actions='[\"read\"]'",[randomUUID(),tenant,fixture.role,object,key]);
   try{await bad(call(request()),'FIELD_FORBIDDEN');}finally{await operator.execute("UPDATE field_policy SET denied_actions='[]' WHERE tenant_id=? AND role_id=? AND object_type_id=? AND property_key=?",[tenant,fixture.role,object,key]);}
  }
 });
 await check('Chat need source active Contact and actual CRM outage fail closed',async()=>{
  await operator.execute('UPDATE crm_record SET archived_at=UTC_TIMESTAMP(6),version=version+1 WHERE tenant_id=? AND id=?',[tenant,ref.contact]);try{await bad(call(request()),'NOT_FOUND');}finally{await operator.execute('UPDATE crm_record SET archived_at=NULL,version=version+1 WHERE tenant_id=? AND id=?',[tenant,ref.contact]);}
  const port=crmServer.address().port;crmServer.closeAllConnections();await new Promise(r=>crmServer.close(r));try{await bad(call(request()),'DEPENDENCY_UNAVAILABLE');}finally{crmServer.listen(port,'127.0.0.1');await once(crmServer,'listening');}
 });
 await check('Chat need source current policy rechecked after admission',async()=>{
  const contact=sourcePeers.contact;
  sourcePeers.contact=async(...args)=>{await operator.execute('UPDATE service_actor SET active=0,auth_revision=auth_revision+1 WHERE tenant_id=? AND id=?',[tenant,fixture.actor]);return contact(...args);};
  try{await assert.rejects(call(request()));}finally{sourcePeers.contact=contact;await operator.execute('UPDATE service_actor SET active=1,auth_revision=auth_revision+1 WHERE tenant_id=? AND id=?',[tenant,fixture.actor]);}
 });
 await check('Chat need source local assessment and resource race reject snapshot',async()=>{
  const contact=sourcePeers.contact;
  sourcePeers.contact=async(...args)=>{const result=await contact(...args);await chatOperator.execute('UPDATE crm_record SET version=version+1 WHERE tenant_id=? AND id=?',[tenant,v.conversation]);return result;};
  try{await bad(call(request()),'STALE_VERSION');}finally{sourcePeers.contact=contact;}
  sourcePeers.contact=async(...args)=>{const result=await contact(...args);await chatOperator.execute('UPDATE need_assessment SET version=version+1 WHERE tenant_id=? AND need_id=?',[tenant,v.need]);return result;};
  try{await bad(call(request()),'STALE_VERSION');}finally{sourcePeers.contact=contact;}
  assert.deepEqual(await call(request()),empty);
 });
 await check('Chat need source completed native role revocation aborts disclosure',async()=>{
  const contact=sourcePeers.contact,before=await state();let original;
  sourcePeers.contact=async(t,command,admission)=>{
   const result=await contact(t,command,admission);original={command,admission};
   const barrier=randomUUID();await ctx.identity.beginRoleChange(tenant,ctx.adminSessionHash,barrier,fixture.role,[]);
   assert.equal((await ctx.identity.drainRoleChange(tenant,barrier)).state,'completed');return result;
  };
  try{await bad(call(request()),'INVALID_TRANSITION');assert.equal((await commands.proof(tenant,original.command)).state,'aborted');await bad(call(request()),'FORBIDDEN');}
  finally{sourcePeers.contact=contact;const restore=randomUUID();await ctx.identity.beginRoleChange(tenant,ctx.adminSessionHash,restore,fixture.role,grants);assert.equal((await ctx.identity.drainRoleChange(tenant,restore)).state,'completed');}
  assert.equal(await state(),before);
 });
 await check('Chat need source terminal read proof reconciles original Identity admission',async()=>{
  const settle=sourcePeers.settle;let lost;
  sourcePeers.settle=async(t,command,admission)=>{lost={command,admission};const error=new Error('Synthetic settlement outage');error.code='DEPENDENCY_UNAVAILABLE';throw error;};
  try{await bad(call(request()),'DEPENDENCY_UNAVAILABLE');}finally{sourcePeers.settle=settle;}
  const proof=await commands.proof(tenant,lost.command);assert.equal(proof.state,'committed');
  const handlers=chatCommandRecoveryHandlers(commands,{call:(t,owner,op,payload)=>{assert.equal(owner,'identity');return identityClient(t,op,payload);}},{ });
  await handlers.get('read-need')(tenant,lost.command,proof);
  const admission=await identityClient(tenant,'admission-read',{owner:'chat',command:lost.command,admission_id:lost.admission});assert.equal(admission.state,'settled');
  assert.deepEqual(await call(request()),empty);
 });
}
