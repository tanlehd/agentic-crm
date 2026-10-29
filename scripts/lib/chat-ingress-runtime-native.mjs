import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {once} from 'node:events';
import {NativeOwnerCapacity} from '../../services/core-baseline/dist/modules/agents/owner-capacity.js';
import {routingOwnerRoutes} from '../../services/core-baseline/dist/modules/agents/owner-http.js';
import {nativeChatProcess,availableChatPort} from './chat-process-fixture.mjs';
import {forwardChatProofs} from './chat-runtime-parity.mjs';
import {workloadRequest,remoteRegistryAuthority,createWorkloadServer,ownerClient,workloadReadiness} from '../../packages/workload-transport/dist/index.js';

export async function chatIngressRuntimeNative(ctx){
 const {check,tenant,chatMaterial,connectorMaterial,registryConfig,urls,f,request,chatOperator}=ctx;
 if(process.env.CHAT_RUNTIME_DIAGNOSTICS==='1')for(const server of ctx.servers)server.on('request',(req,res)=>{const at=Date.now();res.on('finish',()=>console.log('RUNTIME_PEER',req.url,res.statusCode,Date.now()-at));});
 await check('Chat ingress runtime independent API and ingress worker persist message and recover retained receipt after restart',async()=>{
  const proof=ownerClient(ctx.routingMaterial,ctx.routingAuthority,'chat',new URL('http://127.0.0.1:'+ctx.chatServer.address().port+'/'));
  const capacity=new NativeOwnerCapacity(ctx.routingPool,(t,c,abort)=>proof(t,abort?'command-abort':'command-proof',c));
  const routing=createWorkloadServer(ctx.routingMaterial,ctx.routingAuthority,{...routingOwnerRoutes(capacity),'/internal/v1/workloads/ready':workloadReadiness('routing',()=>ctx.routingPool.query('SELECT 1'))});ctx.servers.push(routing);
  routing.listen(0,'127.0.0.1');await once(routing,'listening');const routingPort=routing.address().port;
  const identity=new URL('/',registryConfig.url),owners={...urls,identity,routing:new URL('http://127.0.0.1:'+routingPort+'/')},dispatch={identity,connector:urls.connector},base={tenant,material:chatMaterial,registry:registryConfig,owners,dispatch,cursorKey:f.key};
  let api,worker,proofs;
  try{
   api=await nativeChatProcess({...base,name:'ingress',port:await availableChatPort()});
   proofs=forwardChatProofs(ctx.chatServer,api.url);
   assert.equal((await fetch(new URL('/health/ready',api.health))).status,200,'all required native owner endpoints ready');
   await new Promise(r=>routing.close(r));assert.equal((await fetch(new URL('/health/ready',api.health))).status,503,'required owner outage fails readiness');
   assert.equal((await fetch(new URL('/health/live',api.health))).status,200);
   routing.listen(routingPort,'127.0.0.1');await once(routing,'listening');assert.equal((await fetch(new URL('/health/ready',api.health))).status,200);
   const authority=remoteRegistryAuthority(connectorMaterial,registryConfig),wire=async data=>{for(let attempt=0;;attempt++){try{return await workloadRequest(connectorMaterial,authority,{url:new URL('/internal/v1/chat-exchange/'+data.operation,api.url),expectedService:'chat',tenant,data});}catch(e){if(e.code!=='DEPENDENCY_UNAVAILABLE'||attempt>=2)throw e;await delay(150);}}};
   const input=request();input.intake.occurred_at=new Date().toISOString();const receipt=await wire(input);assert.equal(receipt.state,'received');console.log('RUNTIME_INGRESS accepted');
   await api.stop();await api.start();assert.equal((await wire(input)).receipt_id,receipt.receipt_id);
   worker=await nativeChatProcess({...base,name:'worker',port:await availableChatPort(),mode:'worker',workerJobs:['ingress']});
   const deadline=Date.now()+600000;let row;
   while(Date.now()<deadline){[[row]]=await chatOperator.execute('SELECT state,message_id,conversation_id FROM chat_ingress_inbox WHERE tenant_id=? AND id=?',[tenant,receipt.receipt_id]);if(row.state==='processed')break;if(row.state==='failed')throw new Error('CHAT_RUNTIME_INGRESS_FAILED');await delay(500);}
   assert.equal(row.state,'processed');console.log('RUNTIME_INGRESS processed');
   const [[message]]=await chatOperator.execute('SELECT conversation_id,text FROM message WHERE tenant_id=? AND id=?',[tenant,row.message_id]);assert.equal(message.conversation_id,row.conversation_id);assert.equal(message.text,input.intake.message.text);
   const read={schema_version:1,request_id:randomUUID(),operation:'ingress-read',binding:input.binding,receipt_id:receipt.receipt_id};assert.equal((await wire(read)).message_id,row.message_id);
   await worker.stop();await worker.start();await delay(1500);await worker.stop();worker=undefined;
   assert.equal((await wire({...read,request_id:randomUUID()})).message_id,row.message_id);
   const [[count]]=await chatOperator.execute('SELECT COUNT(*) n FROM message WHERE tenant_id=? AND connection_id=? AND provider_message_id=?',[tenant,input.binding.connection_id,input.intake.provider_message_id]);assert.equal(Number(count.n),1);
   worker=await nativeChatProcess({...base,name:'worker',port:await availableChatPort(),mode:'worker'});
   const until=Date.now()+180000;let metrics;
   while(Date.now()<until){metrics=await (await fetch(new URL('/metrics',worker.health))).json();if(metrics.rounds>0&&metrics.lastSuccess>0)break;await delay(500);}
   assert.deepEqual(metrics.jobs,['ingress','outbound','snooze','recovery','events','activity']);assert(metrics.rounds>0&&metrics.lastSuccess>0,'all six worker jobs complete a scheduler round');
   assert.equal((await fetch(new URL('/health/ready',worker.health))).status,200);console.log('RUNTIME_WORKER all six jobs ready');
   assert(proofs.count()>0,'owner callbacks reached standalone Chat API');
  }finally{if(worker)await worker.stop();proofs?.restore();if(api)await api.stop();}
 });
}
