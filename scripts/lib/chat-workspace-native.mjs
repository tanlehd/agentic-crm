import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {ChatWorkspaceState,chatWorkspaceStateRoutes} from '../../services/chat/dist/workspace-state.js';
import {createWorkloadServer,ownerCommandClient,remoteRegistryAuthority} from '../../packages/workload-transport/dist/index.js';
import {createChatWorkspaceBff} from '../../services/core-baseline/dist/gateway/chat-workspace-bff.js';
import {HumanDispatchEnrollment} from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';
import {nativeChatParity} from './chat-runtime-parity.mjs';

export async function chatWorkspaceNative(ctx){
 const {check,operator,chatOperator,chatPool,commands,tenant,other,f,enrollment,identityClient,chatMaterial,bffMaterial,chatAuthority,registryConfig,protocol,servers}=ctx;
 const peers={admit:(t,command)=>identityClient(t,'admit',{owner:'chat',command}),settle:(t,command,admission_id)=>identityClient(t,'settle',{owner:'chat',command,admission_id})};
 const workspace=new ChatWorkspaceState(commands,peers,chatPool),server=createWorkloadServer(chatMaterial,chatAuthority,chatWorkspaceStateRoutes(workspace));servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');
 const call=ownerCommandClient(bffMaterial,remoteRegistryAuthority(bffMaterial,registryConfig),'chat',new URL(protocol+'//127.0.0.1:'+server.address().port+'/'));
 const id=randomUUID(),bad=(p,code)=>assert.rejects(p,e=>e.code===code);
 const request=(operation,body,version=null,key=randomUUID())=>({schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,operation,command_id:randomUUID(),actor:{kind:'human',principal_id:f.principal,delegation_id:enrollment.delegationId},payload:{id,...(body!==undefined?{body,expected_version:version,idempotency_key:key}:{})}});
 const version=async()=>String((await chatOperator.execute('SELECT version FROM crm_record WHERE tenant_id=? AND id=?',[tenant,id]))[0][0].version);
 const counts=async()=>{
  const [[r]]=await chatOperator.execute("SELECT (SELECT COUNT(*) FROM conversation_activity WHERE tenant_id=? AND conversation_id=?) activities,(SELECT COUNT(*) FROM outbox_event WHERE tenant_id=? AND aggregate_id=?) events,(SELECT COUNT(*) FROM audit_entry WHERE tenant_id=? AND resource_id=?) audits",[tenant,id,tenant,id,tenant,id]);return r;
 };
 await chatOperator.execute("INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,version,owner_revision,custom_values,created_at,updated_at) VALUES (?,?,?,?,1,1,'{}',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[id,tenant,f.object,f.principal]);
 await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at) VALUES (?,?,?,?,?,'open',UTC_TIMESTAMP(6))",[tenant,id,randomUUID(),randomUUID(),randomUUID()]);
 await chatOperator.execute('INSERT INTO chat_control_head(tenant_id,conversation_id,registry_revision,control_revision,cancel_through,pause_through,version,created_at,updated_at) VALUES (?,?,1,1,0,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[tenant,id]);
 await chatOperator.execute('INSERT INTO conversation_workspace(tenant_id,conversation_id,last_message_at,latest_inbound_seq) VALUES (?,?,UTC_TIMESTAMP(6),12)',[tenant,id]);
 await chatOperator.execute('INSERT INTO conversation_activity_counter(tenant_id,conversation_id,last_seq,backfilled) VALUES (?,?,0,1)',[tenant,id]);
 if(process.argv.includes('--with-runtime'))await check('Chat workspace runtime public unread snooze replay and worker deadline recovery',async()=>{
  const candidate=await nativeChatParity(ctx,{});let worker;
  try{
   const publicServer=createChatWorkspaceBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),candidate.call);servers.push(publicServer);publicServer.listen(0,'127.0.0.1');await once(publicServer,'listening');
   const root='http://127.0.0.1:'+publicServer.address().port+'/api/v1/chat-workspace/conversations/'+id;
   const headers={'x-tenant-id':tenant,cookie:'crm_session='+ctx.actorSession,'content-type':'application/json',origin:'http://localhost:18080','x-csrf-token':await ctx.auth.csrf(ctx.actorSession),'idempotency-key':randomUUID()};
   const send=(path,method='GET',body,extra={})=>fetch(root+path,{method,headers:{...headers,...extra},...(body?{body:JSON.stringify(body)}:{})});
   let response=await send('/read-state');assert.equal(response.status,200);assert.equal((await response.json()).data.unread_message_count,'12');
   response=await send('/read-state','POST',{through_inbound_seq:'5'});assert.equal(response.status,200);const marked=await response.json();assert.equal(marked.data.unread_message_count,'7');assert.deepEqual(await (await send('/read-state','POST',{through_inbound_seq:'5'})).json(),marked);
   assert.equal((await send('/read-state','POST',{through_inbound_seq:'12'},{'x-csrf-token':'wrong'})).status,403);
   const until=new Date(Date.now()+10000).toISOString(),extra={'if-match':'"'+await version()+'"','idempotency-key':randomUUID()};
   response=await send('/snooze','PUT',{until},extra);assert.equal(response.status,200);const scheduled=await response.json();assert.equal(scheduled.data.until,until);assert.deepEqual(await (await send('/snooze','PUT',{until},extra)).json(),scheduled);
   worker=await candidate.startWorker(['snooze']);const deadline=Date.now()+45000;let row;
   while(Date.now()<deadline){[[row]]=await chatOperator.execute('SELECT until_at FROM conversation_snooze WHERE tenant_id=? AND conversation_id=?',[tenant,id]);if(!row?.until_at)break;await new Promise(r=>setTimeout(r,250));}
   assert(!row?.until_at,'runtime scanner wakes the retained deadline');await worker.stop();worker=undefined;
   assert.equal((await (await send('/snooze')).json()).data.until,null);assert(candidate.proofCount()>0);
  }finally{if(worker)await worker.stop();await candidate.stop();}
 });
 await check('Chat workspace marker default monotonic receipt replay conflict and retained cohort',async()=>{
  const initial=await call(request('workspace-conversations-id-read-state'));assert.equal(initial.data.unread_message_count,'12');
  const mark=request('workspace-mark-read',{through_inbound_seq:'5'}),marked=await call(mark);assert.equal(marked.data.last_read_inbound_seq,'5');
  assert.deepEqual(await call({...mark,request_id:randomUUID()}),marked);
  await bad(call({...mark,payload:{...mark.payload,body:{through_inbound_seq:'6'}}}),'IDEMPOTENCY_CONFLICT');
  assert.equal((await call(request('workspace-mark-read',{through_inbound_seq:'3'}))).data.last_read_inbound_seq,'5');
  await bad(call(request('workspace-mark-read',{through_inbound_seq:'13'})),'INVALID_READ_POSITION');assert.equal(await version(),'1');
  await chatOperator.execute('INSERT INTO chat_read_rollout_conversation(tenant_id,conversation_id,baseline_inbound_seq) VALUES (?,?,7)',[tenant,id]);
  // Existing real principal may already belong to a retained rollout. Only add a missing cohort and preserve it.
  await chatOperator.execute('INSERT INTO chat_read_rollout_principal(tenant_id,principal_id,created_at) VALUES (?,?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE principal_id=principal_id',[tenant,f.principal]);
  assert.equal((await call(request('workspace-conversations-id-read-state'))).data.last_read_inbound_seq,'5','materialized marker wins over cohort');
  const retained=randomUUID();
  await chatOperator.execute("INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,version,owner_revision,custom_values,created_at,updated_at) VALUES (?,?,?,?,1,1,'{}',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[retained,tenant,f.object,f.principal]);
  await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at) VALUES (?,?,?,?,?,'open',UTC_TIMESTAMP(6))",[tenant,retained,randomUUID(),randomUUID(),randomUUID()]);
  await chatOperator.execute('INSERT INTO chat_control_head(tenant_id,conversation_id,registry_revision,control_revision,cancel_through,pause_through,version,created_at,updated_at) VALUES (?,?,1,1,0,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[tenant,retained]);
  await chatOperator.execute('INSERT INTO conversation_workspace(tenant_id,conversation_id,last_message_at,latest_inbound_seq) VALUES (?,?,UTC_TIMESTAMP(6),12)',[tenant,retained]);
  await chatOperator.execute('INSERT INTO chat_read_rollout_conversation(tenant_id,conversation_id,baseline_inbound_seq) VALUES (?,?,7)',[tenant,retained]);
  const req=request('workspace-conversations-id-read-state');req.payload.id=retained;
  const lazy=await call(req);assert.equal(lazy.data.last_read_inbound_seq,'7');assert.equal(lazy.data.unread_message_count,'5');
 });
 await check('Chat workspace concurrent markers never move backwards and tenant service actors denied',async()=>{
  await Promise.all([8,10,9].map(n=>call(request('workspace-mark-read',{through_inbound_seq:String(n)}))));
  const result=await call(request('workspace-conversations-id-read-state'));assert.equal(result.data.last_read_inbound_seq,'10');assert.equal(result.data.unread_message_count,'2');
  await bad(call({...request('workspace-conversations-id-read-state'),tenant_id:other}),'NOT_FOUND');
  const service=request('workspace-mark-read',{through_inbound_seq:'12'});service.actor.kind='service';await bad(call(service),'FORBIDDEN');
 });
 let schedule;
 await check('Chat workspace snooze version bounds native reason visibility and atomic effects',async()=>{
  await bad(call(request('workspace-put-snooze',{until:new Date(Date.now()-1000).toISOString()},await version())),'VALIDATION_FAILED');
  await bad(call(request('workspace-put-snooze',{until:new Date(Date.now()+31*86400000).toISOString()},await version())),'VALIDATION_FAILED');
  await bad(call(request('workspace-put-snooze',{until:new Date(Date.now()+60000).toISOString()})),'PRECONDITION_REQUIRED');
  const before=await counts();schedule=request('workspace-put-snooze',{until:new Date(Date.now()+60000).toISOString(),reason:'Synthetic callback'},await version());
  const result=await call(schedule);assert.equal(result.data.snooze_revision,'1');assert.equal(result.data.version,'2');assert.equal(result.data.reason,undefined);
  assert.deepEqual(await call({...schedule,request_id:randomUUID()}),result);
  const state=await call(request('workspace-get-snooze'));assert.equal(state.data.reason,'Synthetic callback');
  const after=await counts();assert.equal(Number(after.activities)-Number(before.activities),1);assert.equal(Number(after.events)-Number(before.events),1);
  await bad(call(request('workspace-post-wake',{},'1')),'VERSION_CONFLICT');
  const [[event]]=await chatOperator.execute("SELECT payload FROM outbox_event WHERE tenant_id=? AND aggregate_id=? AND event_type='chat.snooze.changed' ORDER BY created_at DESC LIMIT 1",[tenant,id]);assert(!JSON.stringify(event.payload).includes('Synthetic callback'));
 });
 await check('Chat workspace read-only permission hides reason and denies mutation and replay',async()=>{
  const [[role]]=await operator.execute('SELECT permissions FROM `role` WHERE tenant_id=? AND id=?',[tenant,f.role]);const grants=typeof role.permissions==='string'?JSON.parse(role.permissions):role.permissions;
  await operator.execute('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants.filter(g=>!(g.resource==='conversation'&&g.action==='update'))),tenant,f.role]);
  try{
   assert.equal((await call(request('workspace-get-snooze'))).data.reason,undefined);
   await bad(call(request('workspace-post-wake',{},await version())),'FORBIDDEN');await bad(call(schedule),'FORBIDDEN');
  }finally{await operator.execute('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants),tenant,f.role]);}
 });
 await check('Chat workspace lost settlement ACK replays one snooze generation',async()=>{
  const old=peers.settle;let lost=false;const req=request('workspace-post-wake',{},await version());
  peers.settle=async(...args)=>{const r=await old(...args);if(!lost){lost=true;throw new Error('SYNTHETIC_ACK_LOSS');}return r;};
  try{await assert.rejects(call(req));}finally{peers.settle=old;}
  const before=await counts(),retry=await call(req);assert.equal(retry.data.until,null);assert.deepEqual(await counts(),before);
 });
 await check('Chat workspace stale snapshot aborts without marker effect',async()=>{
  const old=peers.admit;peers.admit=async(...args)=>{const result=await old(...args);await chatOperator.execute('UPDATE crm_record SET version=version+1 WHERE tenant_id=? AND id=?',[tenant,id]);return result;};
  try{await bad(call(request('workspace-mark-read',{through_inbound_seq:'12'})),'STALE_VERSION');}finally{peers.admit=old;}
  assert.equal((await call(request('workspace-conversations-id-read-state'))).data.last_read_inbound_seq,'10');
 });
 await check('Chat workspace deadline revision fences stale worker and drains disabled feature after restart',async()=>{
  const pending=await call(request('workspace-put-snooze',{until:new Date(Date.now()+2000).toISOString()},await version()));
  const [[rollout]]=await chatOperator.execute("SELECT state,watermark FROM chat_workspace_rollout WHERE tenant_id=? AND feature_key='snooze_v1'",[tenant]);
  await chatOperator.execute("INSERT INTO chat_workspace_rollout(tenant_id,feature_key,state,watermark,updated_at) VALUES (?,'snooze_v1','disabled','{}',UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE state='disabled'",[tenant]);
  try{
   await bad(call(request('workspace-get-snooze')),'CAPABILITY_UNAVAILABLE');
   assert.equal(await workspace.wakeDue(tenant,id,'1'),false);
   let due=false;for(let n=0;n<40&&!due;n++){const [[clock]]=await chatOperator.execute('SELECT until_at<=UTC_TIMESTAMP(6) due FROM conversation_snooze WHERE tenant_id=? AND conversation_id=?',[tenant,id]);due=Number(clock.due)===1;if(!due)await new Promise(r=>setTimeout(r,100));}assert(due);
   const fresh=new ChatWorkspaceState(commands,peers,chatPool),before=await counts();
   await bad(fresh.tick([]),'INVALID_REQUEST');await fresh.tick([other]);assert.deepEqual(await counts(),before);
   await fresh.tick([tenant]);assert.equal(await workspace.wakeDue(tenant,id,pending.data.snooze_revision),false);
   const after=await counts();assert.equal(Number(after.activities)-Number(before.activities),1);assert.equal(Number(after.events)-Number(before.events),1);
  }finally{
   if(rollout)await chatOperator.execute("UPDATE chat_workspace_rollout SET state=?,watermark=? WHERE tenant_id=? AND feature_key='snooze_v1'",[rollout.state,typeof rollout.watermark==='string'?rollout.watermark:JSON.stringify(rollout.watermark),tenant]);
   else await chatOperator.execute("DELETE FROM chat_workspace_rollout WHERE tenant_id=? AND feature_key='snooze_v1'",[tenant]);
  }
 });
 const tags=[];
 const link=(tag,attach=true,key=randomUUID())=>{const r=request(attach?'catalog-put-conversation-tag':'catalog-delete-conversation-tag',{},null,key);r.payload.tagId=tag;return r;};
 await check('Chat workspace tags attach replay detach archived and quota preserve atomic revisions',async()=>{
  for(let n=0;n<21;n++){const tag=randomUUID();tags.push(tag);await chatOperator.execute("INSERT INTO conversation_tag(tenant_id,id,name,normalized_name,color,created_at,updated_at) VALUES (?,?,?,?,'blue',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[tenant,tag,tag,Buffer.from(tag)]);}
  const command=link(tags[0]),before=await counts(),response=await call(command);assert.equal(response.data.tag_ids.length,1);assert.equal(response.data.tag_set_revision,'1');
  assert.deepEqual(await call(command),response);assert.equal((await call(link(tags[0]))).data.tag_set_revision,'1');
  const after=await counts();assert.equal(Number(after.activities)-Number(before.activities),1);assert.equal(Number(after.events)-Number(before.events),1);
  await chatOperator.execute('UPDATE conversation_tag SET archived_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[tenant,tags[0]]);
  assert.deepEqual(await call(command),response);
  assert.equal((await call(link(tags[0],false))).data.tag_ids.length,0);await bad(call(link(tags[0])),'ARCHIVED');
  for(const tag of tags.slice(1))await call(link(tag));
  const extra=randomUUID();await chatOperator.execute("INSERT INTO conversation_tag(tenant_id,id,name,normalized_name,color,created_at,updated_at) VALUES (?,?,?,?,'blue',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[tenant,extra,extra,Buffer.from(extra)]);
  await bad(call(link(extra)),'TAG_QUOTA');
  await bad(call(link(randomUUID())),'NOT_FOUND');
  // Retain definitions/history; detach through the owner so later public tag tests have capacity.
  for(const tag of tags.slice(1))await call(link(tag,false));
 });
 await check('Chat workspace tag field denial blocks retained replay without effects',async()=>{
  const command=link(tags[1]);await call(command);const before=await counts();
  const [[policy]]=await operator.execute('SELECT property_key,denied_actions FROM field_policy WHERE tenant_id=? AND id=?',[tenant,f.policy]);
  await operator.execute("UPDATE field_policy SET property_key='tags',denied_actions=? WHERE tenant_id=? AND id=?",[JSON.stringify(['write']),tenant,f.policy]);
  try{await bad(call(command),'FIELD_FORBIDDEN');assert.deepEqual(await counts(),before);}
  finally{await operator.execute('UPDATE field_policy SET property_key=?,denied_actions=? WHERE tenant_id=? AND id=?',[policy.property_key,typeof policy.denied_actions==='string'?policy.denied_actions:JSON.stringify(policy.denied_actions),tenant,f.policy]);}
 });
 await check('Chat workspace public native session CSRF and own-state adapters preserve wire',async()=>{
  const publicServer=createChatWorkspaceBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),call);servers.push(publicServer);publicServer.listen(0,'127.0.0.1');await once(publicServer,'listening');
  const root='http://127.0.0.1:'+publicServer.address().port+'/api/v1/chat-workspace/conversations/'+id;
  const headers={'x-tenant-id':tenant,cookie:'crm_session='+ctx.actorSession,'content-type':'application/json',origin:'http://localhost:18080','x-csrf-token':await ctx.auth.csrf(ctx.actorSession),'idempotency-key':randomUUID()};
  assert.equal((await fetch(root+'/read-state')).status,401);
  const read=await fetch(root+'/read-state',{headers});assert.equal(read.status,200);assert.equal(read.headers.get('cache-control'),'no-store');assert.equal((await read.json()).data.last_read_inbound_seq,'10');
  assert.equal((await fetch(root+'/read-state',{method:'POST',headers:{...headers,'x-csrf-token':'wrong'},body:JSON.stringify({through_inbound_seq:'12'})})).status,403);
  const marked=await fetch(root+'/read-state',{method:'POST',headers,body:JSON.stringify({through_inbound_seq:'12'})});assert.equal(marked.status,200);assert.equal((await marked.json()).data.unread_message_count,'0');
  const until=new Date(Date.now()+60000).toISOString(),snoozeHeaders={...headers,'idempotency-key':randomUUID(),'if-match':'"'+await version()+'"'};
  const snoozed=await fetch(root+'/snooze',{method:'PUT',headers:snoozeHeaders,body:JSON.stringify({until})});assert.equal(snoozed.status,200);const result=await snoozed.json();assert.equal(result.data.until,until);
  const repeated=await fetch(root+'/snooze',{method:'PUT',headers:snoozeHeaders,body:JSON.stringify({until})});assert.equal(repeated.status,200);assert.deepEqual(await repeated.json(),result);
  assert.equal((await fetch(root+'/snooze',{headers})).status,200);
  const wake=await fetch(root+'/wake',{method:'POST',headers:{...headers,'idempotency-key':randomUUID(),'if-match':'"'+await version()+'"'},body:'{}'});assert.equal(wake.status,200);assert.equal((await wake.json()).data.until,null);
  const tagged=await fetch(root+'/tags/'+tags[2],{method:'PUT',headers:{...headers,'idempotency-key':randomUUID()},body:'{}'});assert.equal(tagged.status,200);const tagResult=await tagged.json();assert(tagResult.data.tag_ids.includes(tags[2]));assert.equal(tagged.headers.get('etag'),'"'+tagResult.data.version+'"');
  const untagged=await fetch(root+'/tags/'+tags[2],{method:'DELETE',headers:{...headers,'idempotency-key':randomUUID()},body:'{}'});assert.equal(untagged.status,200);assert(!(await untagged.json()).data.tag_ids.includes(tags[2]));
 });
 await check('Chat workspace closed lifecycle and writer epoch prevent effects',async()=>{
  await chatOperator.execute("UPDATE conversation SET status='closed',closed_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND record_id=?",[tenant,id]);
  await bad(call(request('workspace-post-wake',{},await version())),'INVALID_TRANSITION');
  const [[gate]]=await chatOperator.execute('SELECT epoch FROM chat_writer_gate WHERE tenant_id=?',[tenant]);await chatOperator.execute('UPDATE chat_writer_gate SET epoch=epoch+1 WHERE tenant_id=?',[tenant]);
  try{await bad(call(request('workspace-mark-read',{through_inbound_seq:'12'})),'DEPENDENCY_UNAVAILABLE');await bad(workspace.wakeDue(tenant,id,'1'),'DEPENDENCY_UNAVAILABLE');}
  finally{await chatOperator.execute('UPDATE chat_writer_gate SET epoch=? WHERE tenant_id=?',[gate.epoch,tenant]);}
 });
}
