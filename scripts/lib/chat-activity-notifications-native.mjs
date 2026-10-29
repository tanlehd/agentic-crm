import assert from 'node:assert/strict';
import {nativeChatParity} from './chat-runtime-parity.mjs';
import {randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {ChatActivityNotifications,activityEventDigest} from '../../services/chat/dist/activity-notifications.js';
import {ChatActivityRecovery} from '../../services/chat/dist/activity-recovery.js';
import {ChatEventDelivery,chatEventRoutes} from '../../services/chat/dist/event-delivery.js';
import {ownerRoute,OwnerError,ownerClient,remoteRegistryAuthority} from '../../packages/workload-transport/dist/index.js';

export async function chatActivityNotificationsNative(ctx){
 const {check,operator,chatOperator,commands,tenant,other,f,ref,fixture,path,seedConversation,listen,client,crm,workflow,crmMaterial,workflowMaterial,bffMaterial,chatMaterial,outage,crmServer,projectionObjects}=ctx;
 if(!fixture.notifications){fixture.notifications={conversation:randomUUID(),identity:randomUUID()};await writeFile(path,JSON.stringify(fixture),{mode:0o600});}const v=fixture.notifications;await seedConversation(v);
 const consumer=new ChatActivityNotifications(commands,(t,producer,input)=>(producer==='crm'?crm:workflow)(t,'activity-notification-binding',input));
 const relay=new ChatEventDelivery(commands,[tenant],{configured:()=>false,call:async()=>{throw new Error('No downstream fixture');}});
 const server=await listen(chatMaterial,chatEventRoutes(relay,consumer)),send=client(crmMaterial,'chat',server),runSend=client(workflowMaterial,'chat',server),bff=client(bffMaterial,'chat',server);
 const note=async()=>{const id=randomUUID();await operator.execute('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,version,created_at,updated_at) VALUES (?,?,?,?,3,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[id,tenant,projectionObjects.get(tenant).activity,f.principal]);await operator.execute("INSERT INTO activity(tenant_id,record_id,kind,subject,body,related_record_id) VALUES (?,?,'note','Synthetic notification','Synthetic notification body',?)",[tenant,id,v.conversation]);return id;};
 const event=(id,sequence='1',revision=sequence)=>({event_id:randomUUID(),tenant_id:tenant,producer:'crm',consumer:'chat.activity.note.v1',event_type:'crm.conversation_note.changed',schema_version:1,aggregate_id:id,aggregate_type:'activity',aggregate_version:revision,stream_sequence:sequence,occurred_at:new Date().toISOString(),correlation_id:randomUUID(),causation_id:null,actor:{kind:'human',id:f.principal},data:{conversation_id:v.conversation,activity_id:id,source_revision:revision,operation:sequence==='1'?'created':'updated'}});
 const notice=e=>({producer:e.producer,consumer:e.consumer,event_id:e.event_id,event_type:e.event_type,schema_version:e.schema_version,aggregate_id:e.aggregate_id,stream_sequence:e.stream_sequence,digest:activityEventDigest(e)}),bad=(p,code)=>assert.rejects(p,e=>e.code===code);
 const count=async id=>{const [[row]]=await chatOperator.execute('SELECT COUNT(*) n FROM conversation_activity WHERE tenant_id=? AND conversation_id=? AND source_id=?',[tenant,v.conversation,id]);return Number(row.n);};
 if(process.argv.includes('--with-runtime'))await check('Chat activity runtime CRM and Workflow inboxes validate native source references and retain ordered effects across crash',async()=>{
  const candidate=await nativeChatParity(ctx,{crm:new URL(ctx.protocol+'//127.0.0.1:'+crmServer.address().port+'/'),workflow:new URL(ctx.protocol+'//127.0.0.1:'+ctx.workflowServer.address().port+'/')});
  try{
   const call=material=>ownerClient(material,remoteRegistryAuthority(material,ctx.registryConfig),'chat',candidate.url),notes=call(crmMaterial),runs=call(workflowMaterial),id=await note(),first=event(id),second=event(id,'2');
   assert.equal((await notes(tenant,'event-deliver',second)).state,'pending');assert.equal(await count(id),0);
   await candidate.crashRestart();assert.equal((await notes(tenant,'event-deliver',first)).state,'applied');assert.equal((await notes(tenant,'event-deliver',first)).state,'duplicate');assert.equal((await notes(tenant,'event-deliver',second)).state,'applied');assert.equal(await count(id),2);
   assert.equal((await notes(tenant,'event-status',notice(second))).watermark,'2');
   const run=randomUUID(),trigger={aggregate_id:v.conversation,contact_id:ref.contact,connection_id:ref.connection};
   await operator.execute("INSERT INTO workflow_run(id,tenant_id,definition_id,version_id,trigger_event_id,service_actor_id,current_node,context,status,correlation_id,activity_revision) VALUES (?,?,?,?,?,?,'test',?,'completed',?,2)",[run,tenant,fixture.definition,fixture.version,randomUUID(),fixture.actor,JSON.stringify({trigger}),randomUUID()]);
   const automation={...event(run),producer:'workflow',consumer:'chat.activity.automation.v1',event_type:'automation.conversation_activity.v1',aggregate_type:'workflow_run',data:{conversation_id:v.conversation,run_id:run,definition_version_id:fixture.version,source_service:'workflow',state:'started',source_revision:'1'}};
   assert.equal((await runs(tenant,'event-deliver',automation)).state,'applied');await candidate.crashRestart();assert.equal((await runs(tenant,'event-deliver',automation)).state,'duplicate');assert.equal(await count(run),1);
   await bad(notes(tenant,'event-deliver',automation),'FORBIDDEN');await bad(runs(tenant,'event-deliver',{...automation,event_id:randomUUID(),stream_sequence:'2',aggregate_version:'2',data:{...automation.data,source_revision:'2',definition_version_id:randomUUID()}}),'REFERENCE_INVALID');
  }finally{await candidate.stop();}
 });
 await check('Chat activity notifications concurrent duplicate lost ACK and durable status',async()=>{
  const id=await note(),e=event(id),results=await Promise.all([send(tenant,'event-deliver',e),send(tenant,'event-deliver',e)]);assert(results.some(r=>r.state==='applied'));assert(results.every(r=>['applied','duplicate'].includes(r.state)));assert.equal(await count(id),1);assert.equal((await send(tenant,'event-status',notice(e))).state,'applied');assert.equal((await send(tenant,'event-deliver',e)).state,'duplicate');
  const [[row]]=await chatOperator.execute('SELECT envelope_json FROM chat_event_inbox WHERE tenant_id=? AND event_id=?',[tenant,e.event_id]);assert(!JSON.stringify(row).includes('Synthetic notification body'));
 });
 await check('Chat activity notifications ordered gap pending and older revision reconciliation',async()=>{
  const id=await note(),first=event(id),second=event(id,'2'),third=event(id,'3','1');assert.equal((await send(tenant,'event-deliver',second)).state,'pending');assert.equal(await count(id),0);assert.equal((await send(tenant,'event-deliver',first)).state,'applied');assert.equal((await send(tenant,'event-deliver',second)).watermark,'2');assert.equal(await count(id),2);assert.equal((await send(tenant,'event-deliver',third)).watermark,'3');assert.equal(await count(id),2);
 });
 await check('Chat activity notifications native source outage preserves pending and archived binding',async()=>{
  const id=await note(),e=event(id);await outage(crmServer,async()=>{assert.equal((await send(tenant,'event-deliver',e)).state,'pending');assert.equal((await send(tenant,'event-status',notice(e))).state,'pending');assert.equal(await count(id),0);});await operator.execute('UPDATE crm_record SET archived_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[tenant,id]);assert.equal((await send(tenant,'event-deliver',e)).state,'applied');assert.equal(await count(id),1);
 });
 await check('Chat activity notifications wrong peer tenant source and conflict quarantine',async()=>{
  const id=await note(),e=event(id);await bad(bff(tenant,'event-deliver',e),'FORBIDDEN');await bad(runSend(tenant,'event-deliver',e),'FORBIDDEN');await bad(send(other,'event-deliver',e),'FORBIDDEN');
  const wrong=event(id);wrong.aggregate_version='2';await bad(send(tenant,'event-deliver',wrong),'FORBIDDEN');
  await send(tenant,'event-deliver',e);const conflict={...e,data:{...e.data,operation:'updated'}};assert.equal((await send(tenant,'event-deliver',conflict)).state,'quarantined');assert.equal(await count(id),1);assert.equal((await send(tenant,'event-status',notice(e))).state,'quarantined');
  const id2=await note(),one=event(id2);await send(tenant,'event-deliver',one);assert.equal((await send(tenant,'event-deliver',{...one,event_id:randomUUID()})).state,'quarantined');assert.equal(await count(id2),1);
 });
 await check('Chat activity notifications Workflow projection definition and revision source proof',async()=>{
  const id=randomUUID(),trigger={aggregate_id:v.conversation,contact_id:ref.contact,connection_id:ref.connection};await operator.execute("INSERT INTO workflow_run(id,tenant_id,definition_id,version_id,trigger_event_id,service_actor_id,current_node,context,status,correlation_id,activity_revision) VALUES (?,?,?,?,?,?,'test',?,'completed',?,2)",[id,tenant,fixture.definition,fixture.version,randomUUID(),fixture.actor,JSON.stringify({trigger}),randomUUID()]);
  const first={...event(id),producer:'workflow',consumer:'chat.activity.automation.v1',event_type:'automation.conversation_activity.v1',aggregate_type:'workflow_run',data:{conversation_id:v.conversation,run_id:id,definition_version_id:fixture.version,source_service:'workflow',state:'started',source_revision:'1'}};
  await operator.execute('UPDATE workflow_run SET context=? WHERE tenant_id=? AND id=?',[JSON.stringify({trigger:{...trigger,contact_id:randomUUID()}}),tenant,id]);try{await bad(runSend(tenant,'event-deliver',first),'REFERENCE_INVALID');assert.equal(await count(id),0);}finally{await operator.execute('UPDATE workflow_run SET context=? WHERE tenant_id=? AND id=?',[JSON.stringify({trigger}),tenant,id]);}
  assert.equal((await runSend(tenant,'event-deliver',first)).state,'applied');const second={...first,event_id:randomUUID(),stream_sequence:'2',aggregate_version:'2',data:{...first.data,source_revision:'2',state:'completed',definition_version_id:randomUUID()}};await bad(runSend(tenant,'event-deliver',second),'REFERENCE_INVALID');assert.equal(await count(id),1);
 });
 // Contract-only producer replay fixture over the same authenticated transport; not a CRM/Workflow producer implementation.
 const replayEvents=new Map();let corrupt=false,replayUnavailable=false;
 const source=await listen(crmMaterial,{
  '/internal/v1/owners/crm/event-replay':ownerRoute('crm','event-replay',['chat'],r=>{
   if(replayUnavailable)throw new OwnerError('DEPENDENCY_UNAVAILABLE');
   const events=[...replayEvents.values()].filter(e=>e.tenant_id===r.tenant_id&&e.consumer===r.payload.consumer&&e.aggregate_id===r.payload.aggregate_id).sort((a,b)=>Number(BigInt(a.stream_sequence)-BigInt(b.stream_sequence)));
   return {events:events.filter(e=>BigInt(e.stream_sequence)>BigInt(r.payload.after_sequence)).slice(0,r.payload.limit).map(notice),high_watermark:events.at(-1)?.stream_sequence??'0'};
  }),
  '/internal/v1/owners/crm/event-read':ownerRoute('crm','event-read',['chat'],r=>{
   const e=replayEvents.get(r.payload.event_id);if(!e||e.tenant_id!==r.tenant_id)throw new OwnerError('NOT_FOUND');return corrupt?{...e,event_id:randomUUID()}:e;
  }),
 });
 const readSource=client(chatMaterial,'crm',source),transport={call:(t,p,op,input)=>{if(p!=='crm')throw new Error('No Workflow replay fixture');return readSource(t,op,input);}};
 const recovery=new ChatActivityRecovery(commands,consumer,[tenant],transport);
 const inbox=async e=>(await chatOperator.execute('SELECT state,lease_token,attempts FROM chat_event_inbox WHERE tenant_id=? AND producer=? AND consumer_name=? AND event_id=?',[tenant,e.producer,e.consumer,e.event_id]))[0][0];
 const due=async e=>chatOperator.execute('UPDATE chat_event_inbox SET next_attempt_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND event_id=?',[tenant,e.event_id]);
 await check('Chat activity recovery replays missing source over authenticated HTTP and resumes after source outage',async()=>{
  const id=await note(),first=event(id),second=event(id,'2');replayEvents.set(first.event_id,first);replayEvents.set(second.event_id,second);
  assert.equal((await send(tenant,'event-deliver',second)).state,'pending');replayUnavailable=true;
  try{await recovery.tick();assert.equal((await inbox(second)).state,'pending');assert.equal(await count(id),0);}finally{replayUnavailable=false;}
  await due(second);const restarted=new ChatActivityRecovery(commands,consumer,[tenant],transport);await restarted.tick();
  assert.equal((await inbox(second)).state,'applied');assert.equal(await count(id),2);assert.equal((await send(tenant,'event-status',notice(second))).watermark,'2');
  await restarted.tick();assert.equal(await count(id),2);
 });
 await check('Chat activity recovery rejects replay digest mismatch and preserves gap until valid source arrives',async()=>{
  const id=await note(),first=event(id),second=event(id,'2');replayEvents.set(first.event_id,first);replayEvents.set(second.event_id,second);
  await send(tenant,'event-deliver',second);corrupt=true;try{await recovery.tick();assert.equal(await count(id),0);assert.equal((await inbox(second)).state,'pending');}finally{corrupt=false;}
  await due(second);await recovery.tick();assert.equal(await count(id),2);
 });
 await check('Chat activity recovery expired lease fences effects and stale completion after restart',async()=>{
  await recovery.tick();const id=await note(),e=event(id);
  await outage(crmServer,async()=>{assert.equal((await send(tenant,'event-deliver',e)).state,'pending');});
  const held=[];let stale;
  try{for(let i=0;i<100;i++){const item=await recovery.claim(tenant);if(!item)break;if(item.event_id===e.event_id){stale=item;break;}held.push(item);}assert(stale);
   await chatOperator.execute('UPDATE chat_event_inbox SET lease_until=UTC_TIMESTAMP(6)-INTERVAL 1 SECOND WHERE tenant_id=? AND event_id=?',[tenant,e.event_id]);
   await bad(recovery.recover(stale),'STALE_VERSION');assert.equal(await count(id),0);
   const fresh=await recovery.claim(tenant);assert.equal(fresh.event_id,e.event_id);assert.notEqual(fresh.lease_token,stale.lease_token);
   await recovery.finish(stale);assert.equal((await inbox(e)).lease_token,fresh.lease_token);
   await recovery.recover(fresh);await recovery.finish(fresh);assert.equal(await count(id),1);assert.equal((await inbox(e)).state,'applied');assert.equal((await inbox(e)).lease_token,null);
  }finally{for(const item of held)await recovery.finish(item);}
 });
}
