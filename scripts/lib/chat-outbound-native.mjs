import {forwardChatProofs} from './chat-runtime-parity.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {once} from 'node:events';
import {createPool,rootSQL} from './chat-native.mjs';
import {nativeChatProcess,availableChatPort} from './chat-process-fixture.mjs';
import {databaseSource} from '../../services/core-baseline/dist/kernel/database/data-source.js';
import {identityDispatchServer} from '../../services/core-baseline/dist/dispatch-server.js';
import {connectorDispatchServer} from '../../services/crm-connector/dist/dispatch-http.js';
import {AttemptStore} from '../../services/crm-connector/dist/attempt-store.js';
import {chatDispatchServer} from '../../services/chat/dist/dispatch-http.js';
import {HumanOutboundCoordinator} from '../../services/chat/dist/outbound-coordinator.js';
import {ChatOutboundBff,createChatOutboundBff} from '../../services/core-baseline/dist/gateway/chat-outbound-bff.js';
import {HumanDispatchEnrollment} from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';
import {ChatOutboundSubmit,chatOutboundSubmitRoutes} from '../../services/chat/dist/outbound-submit.js';
import {ChatDispatchStore} from '../../services/chat/dist/dispatch-storage.js';
import {NativeChatClaims} from '../../services/chat/dist/dispatch-claim.js';
import {NativeChatResults} from '../../services/chat/dist/dispatch-result.js';
import {NativeChannelReferences,channelReferenceOwnerRoutes} from '../../services/core-baseline/dist/modules/channels/owner-reference.js';
import {createWorkloadServer,ownerCommandClient,ownerClient,remoteRegistryAuthority,workloadRequest,TransportError} from '../../packages/workload-transport/dist/index.js';

export async function chatOutboundNative(ctx){
 const {check,operator,chatOperator,chatPool,commands,tenant,other,f,enrollment,identityClient,chatMaterial,bffMaterial,connectorMaterial,chatAuthority,registryConfig,protocol,servers}=ctx;
 const cfg=JSON.parse(await readFile('.local/chat-ownership/reference-fixture.json','utf8'));
 const channels=createPool({host:'127.0.0.1',port:13306,database:'native_identity_test',user:'t05_channel_reference_test',password:cfg.channelPassword});
 const recovery=ownerClient(connectorMaterial,remoteRegistryAuthority(connectorMaterial,registryConfig),'chat',new URL(protocol+'//127.0.0.1:'+ctx.chatServer.address().port+'/'));
 const refs=new NativeChannelReferences(channels,(t,ref,abort)=>recovery(t,abort?'command-abort':'command-proof',ref));
 const channelServer=createWorkloadServer(connectorMaterial,remoteRegistryAuthority(connectorMaterial,registryConfig),channelReferenceOwnerRoutes(refs));servers.push(channelServer);
 channelServer.listen(0,'127.0.0.1');await once(channelServer,'listening');
 const connector=ownerClient(chatMaterial,chatAuthority,'connector',new URL(protocol+'//127.0.0.1:'+channelServer.address().port+'/'));
 const peers={admit:(t,command)=>identityClient(t,'admit',{owner:'chat',command}),settle:(t,command,admission_id)=>identityClient(t,'settle',{owner:'chat',command,admission_id}),subject:(t,command,admission_id)=>identityClient(t,'admission-cursor-subject',{command,admission_id}),connection:(t,connection_id)=>connector(t,'connection-binding-read',{connection_id})};
 const submit=new ChatOutboundSubmit(commands,peers),sendServer=createWorkloadServer(chatMaterial,chatAuthority,chatOutboundSubmitRoutes(submit));servers.push(sendServer);
 sendServer.listen(0,'127.0.0.1');await once(sendServer,'listening');
 const send=ownerCommandClient(bffMaterial,remoteRegistryAuthority(bffMaterial,registryConfig),'chat',new URL(protocol+'//127.0.0.1:'+sendServer.address().port+'/'));
 const store=new ChatDispatchStore(chatPool,'1'),ids={conversation:randomUUID(),contact:randomUUID(),mapping:randomUUID(),session:randomUUID(),connection:randomUUID(),team:randomUUID()};
 const bad=(p,code)=>assert.rejects(p,e=>e.code===code);
 const request=(body={},key=randomUUID())=>({schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,operation:'contact-bound-send',command_id:randomUUID(),actor:{kind:'human',principal_id:f.principal,delegation_id:enrollment.delegationId},payload:{id:ids.conversation,body:{text:'Synthetic owning Chat send',owner_revision:'1',crm_contact_id:ids.contact,...body},expected_version:null,idempotency_key:key}});
 const count=async()=>Number((await chatOperator.execute('SELECT COUNT(*) n FROM outbound_intent WHERE tenant_id=? AND conversation_id=?',[tenant,ids.conversation]))[0][0].n);
 let stable;
 try{
  await operator.execute("INSERT INTO team(id,tenant_id,name,purpose,created_at,updated_at) VALUES (?,?,'Synthetic outbound','chat',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[ids.team,tenant]);
  await operator.execute("INSERT INTO channel_connection(id,tenant_id,provider,external_account_id,status,team_id) VALUES (?,?,'mock_messenger',?,'active',?)",[ids.connection,tenant,ids.connection,ids.team]);
  await chatOperator.execute("INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,version,owner_revision,custom_values,created_at,updated_at) VALUES (?,?,?,?,1,1,'{}',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[ids.conversation,tenant,f.object,f.principal]);
  await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at) VALUES (?,?,?,?,?,'open',UTC_TIMESTAMP(6))",[tenant,ids.conversation,ids.contact,ids.mapping,ids.connection]);
  await chatOperator.execute('INSERT INTO chat_control_head(tenant_id,conversation_id,registry_revision,control_revision,cancel_through,pause_through,version,created_at,updated_at) VALUES (?,?,1,1,0,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[tenant,ids.conversation]);
  await chatOperator.execute('INSERT INTO conversation_workspace(tenant_id,conversation_id,last_message_at) VALUES (?,?,UTC_TIMESTAMP(6))',[tenant,ids.conversation]);
  await chatOperator.execute('INSERT INTO conversation_activity_counter(tenant_id,conversation_id,last_seq,backfilled) VALUES (?,?,0,1)',[tenant,ids.conversation]);
  await chatOperator.execute("INSERT INTO conversation_acquisition_session(tenant_id,id,conversation_id,sequence,status,opening_reason,opened_at,opening_occurred_at,source_classification,policy_version) VALUES (?,?,?,1,'active','first_inbound',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'organic','inbox_v2')",[tenant,ids.session,ids.conversation]);
  await check('Chat outbound native admitted submit atomically persists own intent message job receipt and projections',async()=>{
   const r=request();stable={request:r,response:await send(r)};
   assert.equal(stable.response.data.status,'queued');assert.equal(await count(),1);
   const [[job]]=await chatOperator.execute('SELECT binding_json,status FROM chat_outbound_job WHERE tenant_id=? AND intent_id=?',[tenant,stable.response.data.id]);
   const binding=typeof job.binding_json==='string'?JSON.parse(job.binding_json):job.binding_json;assert.equal(binding.delegation_id,enrollment.delegationId);assert.equal(job.status,'pending');
   for(const table of ['message_workspace','message_acquisition_membership'])assert.equal((await chatOperator.execute(`SELECT message_id FROM ${table} WHERE tenant_id=? AND message_id=?`,[tenant,stable.response.data.message_id]))[0].length,1);
   assert.equal((await chatOperator.execute("SELECT id FROM session_contribution WHERE tenant_id=? AND source_id=? AND kind='outbound_submitted'",[tenant,stable.response.data.message_id]))[0].length,1);
  });
  await check('Chat outbound replay reauthorizes and preserves response and single attempt',async()=>{
   const repeat=await send({...stable.request,request_id:randomUUID(),command_id:randomUUID()});assert.deepEqual(repeat,stable.response);assert.equal(await count(),1);
   await bad(send({...request({text:'changed'},stable.request.payload.idempotency_key)}),'IDEMPOTENCY_CONFLICT');assert.equal(await count(),1);
  });
  await check('Chat outbound rejects stale owner Contact binding wrong tenant and disabled connection',async()=>{
   await bad(send(request({owner_revision:'2'})),'OWNER_CONFLICT');await bad(send(request({crm_contact_id:randomUUID()})),'CONTACT_BINDING_STALE');
   await bad(send({...request(),tenant_id:other}),'NOT_FOUND');
   await operator.execute("UPDATE channel_connection SET status='disabled' WHERE tenant_id=? AND id=?",[tenant,ids.connection]);
   try{await bad(send(request()),'REFERENCE_INVALID');}finally{await operator.execute("UPDATE channel_connection SET status='active' WHERE tenant_id=? AND id=?",[tenant,ids.connection]);}
   assert.equal(await count(),1);
  });
  await check('Chat outbound current field deny also blocks replay with no new effects',async()=>{
   const [[old]]=await operator.execute('SELECT property_key,denied_actions FROM field_policy WHERE tenant_id=? AND id=?',[tenant,f.policy]);
   await operator.execute("UPDATE field_policy SET property_key='text',denied_actions=? WHERE tenant_id=? AND id=?",[JSON.stringify(['write']),tenant,f.policy]);
   try{await bad(send({...stable.request,request_id:randomUUID()}),'FORBIDDEN');}finally{await operator.execute('UPDATE field_policy SET property_key=?,denied_actions=? WHERE tenant_id=? AND id=?',[old.property_key,typeof old.denied_actions==='string'?old.denied_actions:JSON.stringify(old.denied_actions),tenant,f.policy]);}
   assert.equal(await count(),1);
  });
  await check('Chat outbound writer epoch fences submit and local dispatch effects',async()=>{
   const [[gate]]=await chatOperator.execute('SELECT epoch FROM chat_writer_gate WHERE tenant_id=?',[tenant]);
   await chatOperator.execute('UPDATE chat_writer_gate SET epoch=epoch+1 WHERE tenant_id=?',[tenant]);
   try{await bad(send(request()),'DEPENDENCY_UNAVAILABLE');await bad(store.run({tenantId:tenant},s=>s.query('SELECT 1')),'DEPENDENCY_UNAVAILABLE');}
   finally{await chatOperator.execute('UPDATE chat_writer_gate SET epoch=? WHERE tenant_id=?',[gate.epoch,tenant]);}
   assert.equal(await count(),1);
  });
  await check('Chat outbound own claim and result replay preserve unknown then late sent with atomic coverage',async()=>{
   const [[job]]=await chatOperator.execute('SELECT binding_json,resource_json FROM chat_outbound_job WHERE tenant_id=? AND intent_id=?',[tenant,stable.response.data.id]);
   const parse=v=>typeof v==='string'?JSON.parse(v):v,binding=parse(job.binding_json),resource=parse(job.resource_json),grant=randomUUID();
   // Repository boundary test only: remote grant/result callbacks below are synthetic; submit above used native owner HTTP.
   const claims=new NativeChatClaims(store,store,{inspectGrant:async r=>({schema_version:1,request_id:r.request_id,receipt_id:grant,state:'issued',grant_id:grant,expires_at:new Date(Date.now()+10000).toISOString(),resource_context:resource}),mockConnectionActive:async()=>true});
   const req={schema_version:1,operation:'chat-claim',request_id:randomUUID(),binding,grant_id:grant};
   const claimed=await claims.claim('connector',tenant,req);assert.equal(claimed.state,'claimed');assert.equal((await claims.claim('connector',tenant,req)).claim_id,claimed.claim_id);
   let outcome='unknown';const result=new NativeChatResults(store,store,async r=>({schema_version:1,request_id:r.request_id,receipt_id:binding.attempt_id,state:outcome,...(outcome==='sent'?{provider_message_id:'synthetic-'+binding.intent_id}:{})}));
   const base={schema_version:1,operation:'connector-result',request_id:randomUUID(),binding,outcome:'unknown',error_code:'DELIVERY_UNKNOWN'};
   assert.equal((await result.apply('connector',tenant,base)).state,'unknown');assert.equal((await result.apply('connector',tenant,base)).state,'unknown');
   outcome='sent';const {error_code,...sentBase}=base;const sent={...sentBase,request_id:randomUUID(),outcome:'sent',provider_message_id:'synthetic-'+binding.intent_id};
   assert.equal((await result.apply('connector',tenant,sent)).state,'sent');assert.equal((await result.apply('connector',tenant,sent)).state,'sent');
   assert.equal((await chatOperator.execute("SELECT id FROM outbox_event WHERE tenant_id=? AND aggregate_id=? AND event_type='message.sent'",[tenant,ids.conversation]))[0].length,1);
   await bad(claims.claim('connector',other,req),'FORBIDDEN');
   // This fixture has no executing coordinator; retain the terminal result and its job as completed.
   await chatOperator.execute("UPDATE chat_outbound_job SET status='done',phase='deliver',grant_id=?,claim_id=? WHERE tenant_id=? AND intent_id=?",[grant,claimed.claim_id,tenant,binding.intent_id]);
  });
  await check('Chat outbound concurrent public key and lost settlement ACK preserve one local effect',async()=>{
   const command=request();const before=await count();
   const responses=await Promise.all([send(command),send({...command,request_id:randomUUID()}),send({...command,request_id:randomUUID()})]);
   assert(responses.every(r=>r.data.id===responses[0].data.id));assert.equal(await count(),before+1);
   const oldSettle=peers.settle;let dropped=false;const uncertain=request();
   peers.settle=async(...args)=>{const result=await oldSettle(...args);if(!dropped){dropped=true;throw new Error('SYNTHETIC_SETTLEMENT_ACK_LOSS');}return result;};
   try{await assert.rejects(send(uncertain));}finally{peers.settle=oldSettle;}
   assert(dropped);const retry=await send({...uncertain,request_id:randomUUID()});assert.equal(await count(),before+2);
   assert.equal((await chatOperator.execute('SELECT intent_id FROM chat_outbound_job WHERE tenant_id=? AND intent_id=?',[tenant,retry.data.id]))[0].length,1);
   // Submitted jobs remain retained for later explicit execution; no automatic worker runs in this fixture.
  });
  await check('Chat outbound native HTTP coordinator completes isolated Chat Identity Connector delivery'+(process.argv.includes('--with-runtime')?' runtime':''),async()=>{
   const identityCreds=JSON.parse(await readFile('.local/identity-dispatch-ledger-fixture.json','utf8'));
   const connectorCreds=JSON.parse(await readFile('.local/chat-dispatch-claim-fixture.json','utf8'));
   const identityDb=databaseSource(false,{user:'identity_dispatch_test',password:identityCreds.password});
   const connectorDb=createPool({host:'127.0.0.1',port:13306,database:'native_connector_test',user:'dispatch_connector_test',password:connectorCreds.password,timezone:'Z'});
   const active=[];let runtime,processWorker,runtimeBase,proofs;
   await identityDb.initialize();
   const chatUrl=new URL(protocol+'//127.0.0.1:1'),identityUrl=new URL(protocol+'//127.0.0.1:1'),connectorUrl=new URL(protocol+'//127.0.0.1:1');
   const start=async(s,url)=>{active.push(s);s.listen(0,'127.0.0.1');await once(s,'listening');url.port=String(s.address().port);};
   try{
    const key=await readFile('.local/workload-registry-signing-key.pem');
    await start(identityDispatchServer(identityDb,ctx.registrySource,ctx.identityMaterial,{key,keyId:'local-test-v1',chat:chatUrl}),identityUrl);
    await start(connectorDispatchServer(connectorDb,connectorMaterial,registryConfig,{identity:identityUrl,chat:chatUrl},true),connectorUrl);
    if(process.argv.includes('--with-runtime')){
     chatUrl.port=String(await availableChatPort());
     runtimeBase={tenant,material:chatMaterial,registry:registryConfig,cursorKey:f.key,owners:{identity:new URL('/',registryConfig.url),connector:new URL(protocol+'//127.0.0.1:'+channelServer.address().port+'/'),crm:new URL('/',registryConfig.url),routing:new URL('/',registryConfig.url)},dispatch:{identity:identityUrl,connector:connectorUrl}};
     runtime=await nativeChatProcess({...runtimeBase,name:'outbound',port:Number(chatUrl.port)});proofs=forwardChatProofs(ctx.chatServer,runtime.url);
    }else await start(chatDispatchServer(store,chatMaterial,registryConfig,{identity:identityUrl,connector:connectorUrl},async b=>{const r=await peers.connection(b.tenant_id,b.connection_id);return r.connection_id===b.connection_id&&r.platform==='mock_messenger';}),chatUrl);
    assert.match(ids.connection,/^[a-f0-9-]{36}$/);assert.match(tenant,/^[a-f0-9-]{36}$/);
    rootSQL(`INSERT INTO native_connector_test.connector_connection(id,tenant_id,token_hash,remote_connection_id,remote_token_env,status) VALUES ('${ids.connection}','${tenant}',SHA2('${ids.connection}',256),'${ids.connection}','SYNTHETIC_OUTBOUND_TEST','active');`);
    const runtimeSend=runtime?ownerCommandClient(bffMaterial,remoteRegistryAuthority(bffMaterial,registryConfig),'chat',runtime.url):send;
    const composedSend=async request=>{try{return await runtimeSend(request);}catch(e){if(process.argv.includes('--with-runtime'))console.log('RUNTIME_SEND_DENIED',e.constructor.name,e.code??'INTERNAL');throw e;}};
    const publicServer=createChatOutboundBff(new ChatOutboundBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),composedSend));
    const publicUrl=new URL('http://127.0.0.1:1');await start(publicServer,publicUrl);
    const publicHeaders={'content-type':'application/json','x-tenant-id':tenant,'idempotency-key':randomUUID(),origin:'http://localhost:18080','x-csrf-token':await ctx.auth.csrf(ctx.actorSession),cookie:'crm_session='+ctx.actorSession};
    const publicPath=new URL('/api/v1/conversations/'+ids.conversation+'/messages-v2',publicUrl);
    const payload=request().payload.body;
    const denied=await fetch(publicPath,{method:'POST',headers:{...publicHeaders,'x-csrf-token':'wrong'},body:JSON.stringify(payload)});assert.equal(denied.status,403);
    const response=await fetch(publicPath,{method:'POST',headers:publicHeaders,body:JSON.stringify(payload)});const queued=await response.json();assert.equal(response.status,202,queued.error?.code);
    const repeated=await fetch(publicPath,{method:'POST',headers:publicHeaders,body:JSON.stringify(payload)});assert.equal(repeated.status,202);assert.deepEqual(await repeated.json(),queued);
    const worker=new HumanOutboundCoordinator(store,chatMaterial,registryConfig,{identity:identityUrl,connector:connectorUrl});
    await assert.rejects(worker.tick([]),/CHAT_OUTBOUND_TENANTS_REQUIRED/);
    await worker.tick([other]);
    const [[excluded]]=await chatOperator.execute('SELECT status,phase FROM chat_outbound_job WHERE tenant_id=? AND intent_id=?',[tenant,queued.data.id]);assert.equal(excluded.status,'pending');assert.equal(excluded.phase,'issue');
    if(runtime){
     processWorker=await nativeChatProcess({...runtimeBase,name:'worker',port:await availableChatPort(),mode:'worker',workerJobs:['outbound']});
     const until=Date.now()+180000;let state;
     while(Date.now()<until){[[state]]=await chatOperator.execute('SELECT status FROM chat_outbound_job WHERE tenant_id=? AND intent_id=?',[tenant,queued.data.id]);if(state.status==='done')break;await new Promise(r=>setTimeout(r,500));}
     assert.equal(state.status,'done','standalone worker completes send');await processWorker.stop();await processWorker.start();await new Promise(r=>setTimeout(r,1500));await processWorker.stop();processWorker=undefined;
    }else await worker.run(tenant,queued.data.id);
    const [[job]]=await chatOperator.execute('SELECT status,phase,last_error FROM chat_outbound_job WHERE tenant_id=? AND intent_id=?',[tenant,queued.data.id]);
    assert.equal(job.status,'done','coordinator phase='+job.phase+' error='+job.last_error);
    const [[intent]]=await chatOperator.execute('SELECT status,provider_message_id FROM outbound_intent WHERE tenant_id=? AND id=?',[tenant,queued.data.id]);
    assert.equal(intent.status,'sent');assert.equal(intent.provider_message_id,'synthetic-'+queued.data.id);
    await new HumanOutboundCoordinator(store,chatMaterial,registryConfig,{identity:identityUrl,connector:connectorUrl}).run(tenant,queued.data.id);
    const [[receipts]]=await connectorDb.execute('SELECT COUNT(*) n FROM connector_dispatch_guard WHERE tenant_id=? AND intent_id=?',[tenant,queued.data.id]);assert.equal(Number(receipts.n),1);if(runtime)assert(proofs.count()>0,'owner callbacks reached standalone Chat API');
    await assert.rejects(chatPool.query('SELECT id FROM native_identity_test.account LIMIT 1'),e=>['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(e.code));
    await check('Chat outbound lost begin ACK restarts by durable receipt without a second provider attempt',async()=>{
     let dropped=false,beginCalls=0;
     const paths=['/internal/v1/chat-exchange/payload-put',...['connector-prepare','connector-claim','connector-begin','connector-deliver','receipt-read'].map(x=>'/internal/v1/dispatch/'+x)];
     const proxy=createWorkloadServer(connectorMaterial,remoteRegistryAuthority(connectorMaterial,registryConfig),Object.fromEntries(paths.map(path=>[path,{callers:['chat'],validate:v=>({tenant_id:v.binding.tenant_id,request_id:v.request_id}),handle:async v=>{
      if(path.endsWith('connector-begin'))beginCalls++;
      const reply=await workloadRequest(chatMaterial,chatAuthority,{url:new URL(path,connectorUrl),expectedService:'connector',tenant:v.binding.tenant_id,data:v});
      if(path.endsWith('connector-begin')&&!dropped){dropped=true;throw new TransportError('DEPENDENCY_UNAVAILABLE');}return reply;
     }}])));
     const proxyUrl=new URL(protocol+'//127.0.0.1:1');await start(proxy,proxyUrl);
     const accepted=await send(request()),intent=accepted.data.id;
     await new HumanOutboundCoordinator(store,chatMaterial,registryConfig,{identity:identityUrl,connector:proxyUrl}).run(tenant,intent);
     assert(dropped);assert.equal(beginCalls,1);
     const [[before]]=await chatOperator.execute('SELECT phase,status,attempt_id FROM chat_outbound_job WHERE tenant_id=? AND intent_id=?',[tenant,intent]);assert.equal(before.phase,'begin');assert.equal(before.status,'pending');
     let due=false;
     for(let poll=0;poll<30&&!due;poll++){
      const [[clock]]=await chatOperator.execute('SELECT next_attempt_at<=UTC_TIMESTAMP(6) due FROM chat_outbound_job WHERE tenant_id=? AND intent_id=?',[tenant,intent]);due=Number(clock.due)===1;
      if(!due)await new Promise(r=>setTimeout(r,100));
     }
     assert(due,'retained retry did not become due on the database clock');
     await new HumanOutboundCoordinator(store,chatMaterial,registryConfig,{identity:identityUrl,connector:proxyUrl}).run(tenant,intent);
     const [[after]]=await chatOperator.execute('SELECT phase,status,attempt_id FROM chat_outbound_job WHERE tenant_id=? AND intent_id=?',[tenant,intent]);assert.equal(after.status,'done');assert.equal(after.attempt_id,before.attempt_id);assert.equal(beginCalls,1);
     const [[result]]=await chatOperator.execute('SELECT status FROM outbound_intent WHERE tenant_id=? AND id=?',[tenant,intent]);assert.equal(result.status,'sent');
    });
    await check('Chat outbound crash after synthetic send recovers unknown then matching late proof without resend',async()=>{
     const attempts=new AttemptStore(connectorDb);let evidence,sendCount=0,beginCount=0;
     const routes=['/internal/v1/chat-exchange/payload-put',...['connector-prepare','connector-claim','connector-begin','connector-deliver','receipt-read'].map(x=>'/internal/v1/dispatch/'+x)];
     const crashProxy=createWorkloadServer(connectorMaterial,remoteRegistryAuthority(connectorMaterial,registryConfig),Object.fromEntries(routes.map(path=>[path,{
      callers:['chat'],validate:v=>({tenant_id:v.binding.tenant_id,request_id:v.request_id}),handle:async v=>{
       if(!path.endsWith('connector-begin'))return workloadRequest(chatMaterial,chatAuthority,{url:new URL(path,connectorUrl),expectedService:'connector',tenant,data:v});
       beginCount++;
       // Fault boundary uses native Connector primitives. Grant/claim/consume remain actual HTTP authorities;
       // the synthetic provider result is retained outside the process, while its local commit is lost.
       const begun=await attempts.beginAuthorized(tenant,v);assert(begun.live);
       const info=attempts.admissionInfo(begun.live);
       const proof=await workloadRequest(connectorMaterial,remoteRegistryAuthority(connectorMaterial,registryConfig),{url:new URL('/internal/v1/dispatch/identity-consume',identityUrl),expectedService:'identity',tenant,data:{...v,operation:'identity-consume',request_id:randomUUID(),fence_id:info.fence}});
       assert.equal(proof.state,'consumed');
       const permit=await attempts.startLive(begun.live);await attempts.takeLivePayload(permit);
       sendCount++;evidence={binding:v.binding,fence:info.fence,provider:'synthetic-crash-'+v.binding.intent_id};
       throw new TransportError('DEPENDENCY_UNAVAILABLE');
      }
     }])));
     const crashUrl=new URL(protocol+'//127.0.0.1:1');await start(crashProxy,crashUrl);
     const accepted=await send(request()),intent=accepted.data.id;
     await new HumanOutboundCoordinator(store,chatMaterial,registryConfig,{identity:identityUrl,connector:crashUrl}).run(tenant,intent);
     assert.equal(sendCount,1);assert.equal(beginCount,1);
     let expired=false;
     for(let poll=0;poll<70&&!expired;poll++){
      const [[clock]]=await connectorDb.execute('SELECT deadline_at<=UTC_TIMESTAMP(6) expired FROM connector_dispatch_guard WHERE tenant_id=? AND intent_id=?',[tenant,intent]);expired=Number(clock.expired)===1;
      if(!expired)await new Promise(r=>setTimeout(r,100));
     }
     assert(expired,'original Connector recovery deadline did not elapse');
     await new HumanOutboundCoordinator(store,chatMaterial,registryConfig,{identity:identityUrl,connector:crashUrl}).run(tenant,intent);
     const [[unknown]]=await chatOperator.execute('SELECT status FROM outbound_intent WHERE tenant_id=? AND id=?',[tenant,intent]);assert.equal(unknown.status,'remote_unknown');
     const late={schema_version:1,operation:'connector-result',request_id:randomUUID(),binding:evidence.binding,outcome:'sent',provider_message_id:evidence.provider};
     await assert.rejects(new AttemptStore(connectorDb).recordResultAuthorized(tenant,late,randomUUID()));
     await new AttemptStore(connectorDb).recordResultAuthorized(tenant,late,evidence.fence);
     const delivered=()=>workloadRequest(chatMaterial,chatAuthority,{url:new URL('/internal/v1/dispatch/connector-deliver',connectorUrl),expectedService:'connector',tenant,data:{schema_version:1,operation:'receipt-read',request_id:randomUUID(),binding:evidence.binding,receipt_id:evidence.binding.attempt_id}});
     assert.equal((await delivered()).state,'sent');assert.equal((await delivered()).state,'sent');
     const [[final]]=await chatOperator.execute('SELECT status,provider_message_id FROM outbound_intent WHERE tenant_id=? AND id=?',[tenant,intent]);assert.equal(final.status,'sent');assert.equal(final.provider_message_id,evidence.provider);
     await new HumanOutboundCoordinator(store,chatMaterial,registryConfig,{identity:identityUrl,connector:crashUrl}).run(tenant,intent);
     assert.equal(sendCount,1);assert.equal(beginCount,1);
    });
    for(const failure of ['consume-ack-loss','logout-before-consume'])await check('Chat outbound native '+failure+' persists unknown without restart resend',async()=>{
     const session=await ctx.login(f.account),delegated=await new HumanDispatchEnrollment(ctx.ds).enroll(tenant,createHash('sha256').update(session).digest('hex'));
     const command=request();command.actor.delegation_id=delegated.delegationId;
     const accepted=await send(command),intent=accepted.data.id;let consumed=0;
     const identityProxy=createWorkloadServer(ctx.identityMaterial,remoteRegistryAuthority(ctx.identityMaterial,registryConfig),Object.fromEntries(['receipt-read','identity-consume'].map(operation=>['/internal/v1/dispatch/'+operation,{
      callers:['connector'],validate:v=>({tenant_id:v.binding.tenant_id,request_id:v.request_id}),handle:async v=>{
       if(operation==='identity-consume'){
        consumed++;
        if(failure==='logout-before-consume')await ctx.drainingAuth.logout(session,ctx.authConfig.origin,await ctx.auth.csrf(session));
       }
       const reply=await workloadRequest(connectorMaterial,remoteRegistryAuthority(connectorMaterial,registryConfig),{url:new URL('/internal/v1/dispatch/'+operation,identityUrl),expectedService:'identity',tenant,data:v});
       if(operation==='identity-consume')throw new TransportError('DEPENDENCY_UNAVAILABLE');
       return reply;
      }
     }])));
     const proxyUrl=new URL(protocol+'//127.0.0.1:1');await start(identityProxy,proxyUrl);
     const failureConnectorUrl=new URL(protocol+'//127.0.0.1:1');
     await start(connectorDispatchServer(connectorDb,connectorMaterial,registryConfig,{identity:proxyUrl,chat:chatUrl},true),failureConnectorUrl);
     const worker=new HumanOutboundCoordinator(store,chatMaterial,registryConfig,{identity:identityUrl,connector:failureConnectorUrl});
     await worker.run(tenant,intent);
     const [[result]]=await chatOperator.execute('SELECT status,provider_message_id FROM outbound_intent WHERE tenant_id=? AND id=?',[tenant,intent]);
     assert.equal(result.status,'remote_unknown');assert.equal(result.provider_message_id,null);assert.equal(consumed,1);
     const [[job]]=await chatOperator.execute('SELECT status,binding_json,grant_id FROM chat_outbound_job WHERE tenant_id=? AND intent_id=?',[tenant,intent]);assert.equal(job.status,'done');
     const binding=typeof job.binding_json==='string'?JSON.parse(job.binding_json):job.binding_json;
     const readGrant=()=>workloadRequest(connectorMaterial,remoteRegistryAuthority(connectorMaterial,registryConfig),{url:new URL('/internal/v1/dispatch/receipt-read',identityUrl),expectedService:'identity',tenant,data:{schema_version:1,operation:'receipt-read',request_id:randomUUID(),binding,receipt_id:job.grant_id}});
     if(failure==='consume-ack-loss')assert.equal((await readGrant()).state,'consumed');
     else{
      // Identity receipt reads also require the current session. Revoked callers cannot use recovery to regain access.
      await assert.rejects(readGrant());
      const [[grant]]=await operator.execute('SELECT state FROM identity_dispatch_grant WHERE tenant_id=? AND id=?',[tenant,job.grant_id]);assert.equal(grant.state,'issued');
     }
     await new HumanOutboundCoordinator(store,chatMaterial,registryConfig,{identity:identityUrl,connector:failureConnectorUrl}).run(tenant,intent);
     assert.equal(consumed,1);
     const [[started]]=await connectorDb.execute("SELECT COUNT(*) n FROM connector_attempt_event WHERE tenant_id=? AND intent_id=? AND state='started'",[tenant,intent]);assert.equal(Number(started.n),0);
     if(failure==='consume-ack-loss')assert.deepEqual(await send({...command,request_id:randomUUID()}),accepted);
     else await assert.rejects(send({...command,request_id:randomUUID()}));
    });
   }finally{if(processWorker)await processWorker.stop();proofs?.restore();if(runtime)await runtime.stop();for(const s of active.reverse()){s.closeAllConnections();await new Promise(r=>s.close(r));}await identityDb.destroy();await connectorDb.end();}
  });
 }finally{await channels.end();}
}
