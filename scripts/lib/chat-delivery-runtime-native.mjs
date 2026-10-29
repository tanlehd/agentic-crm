import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import {nativeChatProcess,availableChatPort} from './chat-process-fixture.mjs';
import {writeChatOutbox,decodeEvent,eventNotice} from '../../services/chat/dist/event-store.js';
import {createWorkloadServer,ownerRoute,ownerClient,remoteRegistryAuthority,OwnerError,ownerDigest} from '../../packages/workload-transport/dist/index.js';

export async function chatDeliveryRuntimeNative(ctx){
 const {check,operator,chatOperator,commands,chatMaterial,workflowMaterial,registryConfig,registryOperator,registryVersion,servers}=ctx;
 // Isolated registered synthetic tenant: never ACK another test or live subscription.
 const tenant='01900000-0000-7000-8000-000000004104',dir='.local/chat-runtime-delivery';await mkdir(dir,{recursive:true});
 await operator.execute("INSERT INTO tenant(id,name,status,created_at,updated_at) VALUES (?,'Synthetic Chat runtime delivery','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[tenant]);
 for(const service of ['identity','chat','workflow'])await registryOperator.admit(service,await registryVersion(service),tenant,true);
 await chatOperator.execute("INSERT INTO chat_writer_gate(tenant_id,mode,epoch,manifest_digest,updated_at) VALUES (?,'active',1,?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE tenant_id=tenant_id",[tenant,'d'.repeat(64)]);
 const file=dir+'/receipts.json';let receipts={};try{receipts=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 let lostAck=true,deliveries=0,statusReads=0;const actor=randomUUID(),target=randomUUID(),aggregate=randomUUID();
 const receiver=createWorkloadServer(workflowMaterial,remoteRegistryAuthority(workflowMaterial,registryConfig),{
  '/internal/v1/owners/workflow/event-deliver':ownerRoute('workflow','event-deliver',['chat'],async r=>{
   const n=r.payload.notice;if(n.event_id!==target&&!receipts[n.event_id])throw new OwnerError('NOT_FOUND');
   deliveries++;const receipt={producer:'chat',consumer:n.consumer,event_id:n.event_id,digest:n.digest,state:receipts[n.event_id]?'duplicate':'applied',watermark:n.stream_sequence};
   receipts[n.event_id]=receipt;await writeFile(file+'.next',JSON.stringify(receipts));await rename(file+'.next',file);
   if(lostAck){lostAck=false;throw new OwnerError('DEPENDENCY_UNAVAILABLE');}return receipt;
  }),
  '/internal/v1/owners/workflow/event-status':ownerRoute('workflow','event-status',['chat'],async r=>{statusReads++;const disk=JSON.parse(await readFile(file,'utf8')),v=disk[r.payload.event_id];if(!v)throw new OwnerError('NOT_FOUND');return v;}),
 });servers.push(receiver);receiver.listen(0,'127.0.0.1');await once(receiver,'listening');
 const identity=new URL('/',registryConfig.url),base={tenant,material:chatMaterial,registry:registryConfig,owners:{identity,crm:identity,connector:identity,routing:identity},dispatch:{identity,connector:identity},receivers:{workflow:new URL('http://127.0.0.1:'+receiver.address().port+'/')},cursorKey:ctx.f.key};
 const insert="INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,?,1,?,?,1,?,?,'human',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')";
 const emit=(id,type,kind,idAggregate,data)=>commands.transaction(tenant,c=>writeChatOutbox(c,insert,[id,tenant,type,kind,idAggregate,JSON.stringify(data),id,actor]));
 const row=async id=>(await chatOperator.execute('SELECT * FROM chat_event_delivery WHERE tenant_id=? AND event_id=?',[tenant,id]))[0][0];
 const until=async predicate=>{const deadline=Date.now()+65000;while(Date.now()<deadline){if(await predicate())return;await delay(200);}assert.fail('Chat runtime delivery recovery deadline');};
 let api,worker;
 try{
  api=await nativeChatProcess({...base,name:'parity',port:await availableChatPort()});
  const consumer=ownerClient(chatMaterial,remoteRegistryAuthority(chatMaterial,registryConfig),'chat',api.url);
  await check('Chat delivery runtime durable synthetic receiver loses ACK, worker crashes and status reconciles without duplicate publication',async()=>{
   await emit(target,'conversation.created','conversation',aggregate,{contact_id:randomUUID(),connection_id:randomUUID()});
   const original=decodeEvent((await row(target)).envelope_json);
   worker=await nativeChatProcess({...base,name:'worker',port:await availableChatPort(),mode:'worker',workerJobs:['events']});
   await until(async()=>!!receipts[target]);await worker.crash();assert.equal((await row(target)).state,'pending');
   // Restart the real receiver from its durable receipt file, then resume Chat.
   const port=receiver.address().port;receiver.closeAllConnections();await new Promise(r=>receiver.close(r));receipts=JSON.parse(await readFile(file,'utf8'));receiver.listen(port,'127.0.0.1');await once(receiver,'listening');
   await worker.start();await until(async()=>(await row(target)).state==='acked');await worker.stop();worker=undefined;
   assert.equal(deliveries,1);assert(statusReads>=1);assert.deepEqual(decodeEvent((await row(target)).envelope_json),original);
   assert.equal(JSON.parse(await readFile(file,'utf8'))[target].digest,eventNotice(await row(target)).digest);
  });
  await check('Chat delivery runtime local ordered gap, duplicate and worker restart preserve one inbox effect',async()=>{
   const idAggregate=randomUUID(),one=randomUUID(),two=randomUUID();
   for(const id of [one,two])await emit(id,'chat.snippet.changed','chat_snippet',idAggregate,{snippet_id:idAggregate,operation:'created'});
   const first=decodeEvent((await row(one)).envelope_json),second=decodeEvent((await row(two)).envelope_json);
   assert.equal((await consumer(tenant,'event-deliver',second)).state,'pending');
   assert.equal((await consumer(tenant,'event-deliver',first)).state,'applied');await api.crash();await api.start();
   assert.equal((await consumer(tenant,'event-deliver',first)).state,'duplicate');
   worker=await nativeChatProcess({...base,name:'worker',port:await availableChatPort(),mode:'worker',workerJobs:['events']});
   await until(async()=>(await row(two)).state==='acked');await worker.crash();await worker.start();
   assert.equal((await consumer(tenant,'event-status',eventNotice(await row(two)))).watermark,'2');
   const [rows]=await chatOperator.execute('SELECT state,COUNT(*) n FROM chat_event_inbox WHERE tenant_id=? AND aggregate_id=? GROUP BY state',[tenant,idAggregate]);assert.deepEqual(rows.map(r=>({state:r.state,n:Number(r.n)})),[{state:'applied',n:2}]);
  });
  await check('Chat delivery runtime recovery scanner aborts retained unadmitted command and preserves terminal proof after restart',async()=>{
   await worker.stop();worker=undefined;
   const id=randomUUID(),request={payload:{}},binding={tenant_id:tenant,command_id:id,owner:'chat',operation:'external-conversations',actor:{kind:'app',principal_id:actor,delegation_id:id},resource:{resource_id:tenant,object_key:'external_conversation_query',record_version:'0',owner_revision:'0',control_revision:'0',owner_principal_id:null,team_id:null,shared_team_ids:[],archived:false},target:null,session_id:null,fields:[],payload_digest:ownerDigest(request),legacy_receipt_key:'external-read:'+id,graph:null,dependencies:[]};
   const prepared=await commands.prepare(binding,request),ref={command_id:id,binding_digest:prepared.binding_digest};
   // Age only this synthetic interruption so the real discovery grace period elapses.
   await chatOperator.execute('UPDATE chat_owner_command SET updated_at=UTC_TIMESTAMP(6)-INTERVAL 31 SECOND WHERE tenant_id=? AND command_id=?',[tenant,id]);
   worker=await nativeChatProcess({...base,name:'worker',port:await availableChatPort(),mode:'worker',workerJobs:['recovery']});
   await until(async()=>{const [[r]]=await chatOperator.execute("SELECT state FROM chat_owner_dependency WHERE tenant_id=? AND command_id=? AND slot='recovery'",[tenant,id]);return r?.state==='released';});
   assert.equal((await commands.proof(tenant,ref)).state,'aborted');await worker.crash();await worker.start();
   assert.equal((await commands.proof(tenant,ref)).state,'aborted');
  });
 }finally{if(worker)await worker.stop();if(api)await api.stop();}
}
