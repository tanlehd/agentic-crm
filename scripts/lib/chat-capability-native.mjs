import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {ChatCapabilities,chatCapabilityRoutes} from '../../services/chat/dist/capabilities.js';
import {verifyRuntimeLineage} from '../../services/chat/dist/runtime-lineage.js';
import {createWorkloadServer,ownerCommandClient,remoteRegistryAuthority} from '../../packages/workload-transport/dist/index.js';
import {createChatCatalogBff} from '../../services/core-baseline/dist/gateway/chat-catalog-bff.js';
import {HumanDispatchEnrollment} from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';
export async function chatCapabilityNative(ctx){
 const {check,operator,chatOperator,chatPool,commands,tenant,other,f,enrollment,identityClient,chatMaterial,bffMaterial,chatAuthority,registryConfig,protocol,servers}=ctx;
 const peers={admit:(t,command)=>identityClient(t,'admit',{owner:'chat',command}),settle:(t,command,admission_id)=>identityClient(t,'settle',{owner:'chat',command,admission_id})};
 // This composition deliberately mounts no business handler: schema must not falsely advertise them.
 const capabilities=new ChatCapabilities(commands,peers,{}),server=createWorkloadServer(chatMaterial,chatAuthority,chatCapabilityRoutes(capabilities));servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');
 const call=ownerCommandClient(bffMaterial,remoteRegistryAuthority(bffMaterial,registryConfig),'chat',new URL(protocol+'//127.0.0.1:'+server.address().port+'/'));
 const request=(operation='runtime-capabilities')=>({schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,operation,command_id:randomUUID(),actor:{kind:'human',principal_id:f.principal,delegation_id:enrollment.delegationId},payload:{}});
 const bad=(p,code)=>assert.rejects(p,e=>e.code===code);
 await check('Chat capabilities native complete own lineage and least-privilege journal fence',async()=>{
  const c=await chatPool.getConnection();try{assert.deepEqual(await verifyRuntimeLineage(c),{lineage:'crm_chat',version:4});}finally{c.release();}
  await assert.rejects(chatPool.execute("UPDATE schema_migration SET checksum=checksum WHERE version=4"),e=>e.code==='ER_TABLEACCESS_DENIED_ERROR');
  await assert.rejects(chatPool.execute("UPDATE chat_writer_gate SET epoch=epoch WHERE tenant_id=?",[tenant]),e=>e.code==='ER_TABLEACCESS_DENIED_ERROR');
  assert.deepEqual(await call(request()),{lineage:'crm_chat',capabilities:[],watermark:'1'});
  assert(Object.values((await call(request('workspace-capabilities'))).data.features).every(v=>v===false));
 });
 await check('Chat capabilities actual journal mismatch denies ready and recovers after restoration',async()=>{
  const [[old]]=await chatOperator.execute('SELECT checksum FROM schema_migration WHERE version=4');
  await chatOperator.execute('UPDATE schema_migration SET checksum=? WHERE version=4',['0'.repeat(64)]);
  try{await bad(call(request()),'DEPENDENCY_UNAVAILABLE');}finally{await chatOperator.execute('UPDATE schema_migration SET checksum=? WHERE version=4',[old.checksum]);}
  assert.equal((await call(request())).lineage,'crm_chat');
 });
 await check('Chat capabilities native seat tenant service and writer epoch checks',async()=>{
  const [[old]]=await operator.execute('SELECT seat_code FROM membership WHERE tenant_id=? AND id=?',[tenant,f.member]);await operator.execute("UPDATE membership SET seat_code='viewer' WHERE tenant_id=? AND id=?",[tenant,f.member]);
  try{await bad(call(request()),'FORBIDDEN');}finally{await operator.execute('UPDATE membership SET seat_code=? WHERE tenant_id=? AND id=?',[old.seat_code,tenant,f.member]);}
  await bad(call({...request(),tenant_id:other}),'FORBIDDEN');const service=request();service.actor.kind='service';await bad(call(service),'FORBIDDEN');
  const [[gate]]=await chatOperator.execute('SELECT epoch FROM chat_writer_gate WHERE tenant_id=?',[tenant]);await chatOperator.execute('UPDATE chat_writer_gate SET epoch=epoch+1 WHERE tenant_id=?',[tenant]);try{await bad(call(request()),'DEPENDENCY_UNAVAILABLE');}finally{await chatOperator.execute('UPDATE chat_writer_gate SET epoch=? WHERE tenant_id=?',[gate.epoch,tenant]);}
 });
 await check('Chat capabilities public native session exposes only mounted readiness',async()=>{
  const publicServer=createChatCatalogBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),call);servers.push(publicServer);publicServer.listen(0,'127.0.0.1');await once(publicServer,'listening');
  const url='http://127.0.0.1:'+publicServer.address().port+'/api/v1/chat-workspace/capabilities';
  assert.equal((await fetch(url)).status,401);const response=await fetch(url,{headers:{'x-tenant-id':tenant,cookie:'crm_session='+ctx.actorSession}});assert.equal(response.status,200);assert(Object.values((await response.json()).data.features).every(v=>v===false));
 });
}
