import assert from 'node:assert/strict';
import {nativeChatParity} from './chat-runtime-parity.mjs';
import {randomUUID,createHash} from 'node:crypto';
import {once} from 'node:events';
import {readFile,writeFile} from 'node:fs/promises';
import {ChatTransitions,chatTransitionRoutes,transitionCommandId} from '../../services/chat/dist/transition.js';
import {ChatOwnership} from '../../services/chat/dist/ownership.js';
import {NativeOwnerCapacity} from '../../services/core-baseline/dist/modules/agents/owner-capacity.js';
import {routingOwnerRoutes} from '../../services/core-baseline/dist/modules/agents/owner-http.js';
import {createChatTransitionBff} from '../../services/core-baseline/dist/gateway/chat-transition-bff.js';
import {ChatOwnershipBff,createChatOwnershipBff} from '../../services/core-baseline/dist/modules/agents/owner-bff.js';
import {HumanDispatchEnrollment} from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';
import {createWorkloadServer,ownerClient,ownerCommandClient,remoteRegistryAuthority,ownerDigest} from '../../packages/workload-transport/dist/index.js';

export async function chatTransitionNative(ctx){
 const {check,operator,chatOperator,commands,tenant,other,f,ref,enrollment,chatMaterial,bffMaterial,chatAuthority,registryConfig,protocol,servers,chatServer,setRole,field,peers,routingPool,routingMaterial,routingAuthority,crmServer}=ctx;
 const path='.local/chat-ownership/transition-fixture.json';let fixture;
 try{fixture=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;fixture={tenant,environment:'retained-test',rounds:[]};}
 assert.equal(fixture.tenant,tenant);assert.equal(fixture.environment,'retained-test');
 const create=async()=>{
  const v=Object.fromEntries(['conversation','identity','session','message'].map(k=>[k,randomUUID()]));fixture.rounds.push(v);await writeFile(path,JSON.stringify(fixture),{mode:0o600});
  await operator.execute('INSERT INTO contact_identity(id,tenant_id,connection_id,contact_id,external_subject_id) VALUES (?,?,?,?,?)',[v.identity,tenant,ref.connection,ref.contact,'synthetic-transition-'+v.identity]);
  await chatOperator.execute('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[v.conversation,tenant,f.object,f.principal]);
  await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at) VALUES (?,?,?,?,?,'open',UTC_TIMESTAMP(6))",[tenant,v.conversation,ref.contact,v.identity,ref.connection]);
  await chatOperator.execute('INSERT INTO chat_control_head(tenant_id,conversation_id,registry_revision,control_revision,cancel_through,pause_through,version,created_at,updated_at) VALUES (?,?,1,1,0,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[tenant,v.conversation]);
  await chatOperator.execute("INSERT INTO conversation_acquisition_session(tenant_id,id,conversation_id,sequence,status,opening_reason,opened_at,opening_occurred_at,source_classification,policy_version) VALUES (?,?,?,1,'active','first_inbound',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'organic','inbox_v2')",[tenant,v.session,v.conversation]);
  await chatOperator.execute('INSERT INTO conversation_activity_counter(tenant_id,conversation_id,last_seq,backfilled) VALUES (?,?,0,1)',[tenant,v.conversation]);
  await chatOperator.execute("INSERT INTO conversation_workspace(tenant_id,conversation_id,waiting_since,waiting_metric_state,last_message_at) VALUES (?,?,UTC_TIMESTAMP(6),'ready',UTC_TIMESTAMP(6))",[tenant,v.conversation]);
  await chatOperator.execute("INSERT INTO message(id,tenant_id,conversation_id,connection_id,provider_message_id,direction,text,occurred_at,received_at,status) VALUES (?,?,?,?,?,'inbound','Synthetic lifecycle evidence',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'received')",[v.message,tenant,v.conversation,ref.connection,v.message]);
  return v;
 };
 const proof=ownerClient(routingMaterial,routingAuthority,'chat',new URL(protocol+'//127.0.0.1:'+chatServer.address().port+'/'));
 const capacity=new NativeOwnerCapacity(routingPool,(t,command,abort)=>proof(t,abort?'command-abort':'command-proof',command));
 const routingServer=createWorkloadServer(routingMaterial,routingAuthority,routingOwnerRoutes(capacity));servers.push(routingServer);routingServer.listen(0,'127.0.0.1');await once(routingServer,'listening');
 const routing=ownerClient(chatMaterial,chatAuthority,'routing',new URL(protocol+'//127.0.0.1:'+routingServer.address().port+'/'));
 const ownershipPeers={admit:peers.admit,settle:peers.settle,reserve:(t,command,session_id)=>routing(t,'capacity-reserve',{command,session_id,reservation_id:null}),confirm:async(t,command,reservation_id)=>{const p=await commands.proof(t,command);await routing(t,'capacity-confirm',{command,session_id:p.binding.session_id,reservation_id});}};
 const ownership=new ChatOwnership(commands,ownershipPeers),transitions=new ChatTransitions(commands,peers,ownership);
 const server=createWorkloadServer(chatMaterial,chatAuthority,chatTransitionRoutes(transitions));servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');
 const call=ownerCommandClient(bffMaterial,remoteRegistryAuthority(bffMaterial,registryConfig),'chat',new URL(protocol+'//127.0.0.1:'+server.address().port+'/'));
 const request=(v,status='pending',version='1',key=randomUUID())=>({schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,operation:'conversation-post-conversations-id-transition',command_id:randomUUID(),actor:{kind:'human',principal_id:f.principal,delegation_id:enrollment.delegationId},payload:{id:v.conversation,body:{target_status:status,reason:'Synthetic lifecycle'},expected_version:version,idempotency_key:key}}),bad=(p,code)=>assert.rejects(p,e=>e.code===code);
 const version=async v=>String((await chatOperator.execute('SELECT version FROM crm_record WHERE tenant_id=? AND id=?',[tenant,v.conversation]))[0][0].version);
 const v=await create();let pending,receipt,closeRequest,closeReceipt;
 await check('Chat detail transition native open pending full detail and immutable retry',async()=>{
  pending=request(v);receipt=await call(pending);assert.equal(receipt.data.status,'pending');assert.equal(receipt.data.version,'2');assert.equal(receipt.data.contact.id,ref.contact);assert.equal(receipt.data.latest_message.id,v.message);
  assert.deepEqual(await call({...pending,correlation_id:randomUUID()}),receipt);assert.equal(await version(v),'2');
  const [[head]]=await chatOperator.execute('SELECT control_revision,cancel_through,pause_through FROM chat_control_head WHERE tenant_id=? AND conversation_id=?',[tenant,v.conversation]);assert.deepEqual(Object.values(head).map(String),['1','0','0']);
 });
 await check('Chat detail transition CAS same-state validation tenant and current update rights',async()=>{
  await bad(call(request(v,'open','1')),'VERSION_CONFLICT');await bad(call(request(v,'pending','2')),'INVALID_TRANSITION');await bad(call(request(v,'open',null)),'PRECONDITION_REQUIRED');
  await bad(call({...pending,payload:{...pending.payload,body:{...pending.payload.body,reason:'changed'}}}),'IDEMPOTENCY_CONFLICT');await bad(call({...request(v),tenant_id:other}),'NOT_FOUND');
  await setRole(ctx.grants.filter(g=>g.action!=='update'));try{await bad(call(pending),'FORBIDDEN');}finally{await setRole(ctx.grants);}
  await field(f.object,'status',['write'],()=>bad(call(pending),'FORBIDDEN'));
 });
 await check('Chat detail transition receipt latest text channel attribution and Contact field denial',async()=>{
  for(const fieldName of ['text','attribution','page_id','channel_name'])await field(f.object,fieldName,['read'],()=>bad(call(pending),'FORBIDDEN'));
  await field(ctx.projectionObjects.get(tenant).contact,'display_name',['read'],()=>bad(call(pending),'FORBIDDEN'));
 });
 await check('Chat detail transition concurrent same-key pending open commits exactly once',async()=>{
  const req=request(v,'open','2'),results=await Promise.all([call(req),call(req)]);assert.deepEqual(results[0],results[1]);assert.equal(await version(v),'3');
  const [[count]]=await chatOperator.execute("SELECT COUNT(*) n FROM conversation_activity WHERE tenant_id=? AND conversation_id=? AND kind='lifecycle'",[tenant,v.conversation]);assert.equal(Number(count.n),2);
 });
 await check('Chat detail transition imported legacy receipt precedes CAS and stays byte exact',async()=>{
  const req=request(v,'pending','1'),legacy={...receipt,meta:{correlation_id:randomUUID()}};
  await chatOperator.execute("INSERT INTO idempotency_record(id,tenant_id,actor_kind,actor_id,route_key,`key`,request_hash,status,response_status,response_body,created_at,updated_at,expires_at) VALUES (?,?,'human',?,?,?,?,'completed',200,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),TIMESTAMPADD(DAY,7,UTC_TIMESTAMP(6)))",[randomUUID(),tenant,f.principal,'POST /api/v1/conversations/'+v.conversation+'/transition',req.payload.idempotency_key,ownerDigest({body:req.payload.body,version:'1'}),JSON.stringify(legacy)]);
  assert.deepEqual(await call(req),legacy);assert.equal(await version(v),'3');
 });
 await check('Chat detail transition CRM and Routing outages fail without mutation and retain retry',async()=>{
  const pause=async(s,work)=>{const port=s.address().port;s.closeAllConnections();await new Promise(resolve=>s.close(resolve));try{await work();}finally{s.listen(port,'127.0.0.1');await once(s,'listening');}};
  await pause(crmServer,()=>bad(call(request(v,'pending','3')),'DEPENDENCY_UNAVAILABLE'));assert.equal(await version(v),'3');
  closeRequest=request(v,'closed','3');await pause(routingServer,()=>bad(call(closeRequest),'DEPENDENCY_UNAVAILABLE'));assert.equal(await version(v),'3');
 });
 await check('Chat detail transition close preserves unknown in-flight and cancels only queued',async()=>{
  await chatOperator.execute("INSERT INTO conversation_snooze(tenant_id,conversation_id,until_at,revision,last_cause,updated_at) VALUES (?,?,TIMESTAMPADD(HOUR,1,UTC_TIMESTAMP(6)),1,'manual',UTC_TIMESTAMP(6))",[tenant,v.conversation]);
  await chatOperator.execute('UPDATE conversation_workspace SET snoozed_until=TIMESTAMPADD(HOUR,1,UTC_TIMESTAMP(6)),snooze_revision=1 WHERE tenant_id=? AND conversation_id=?',[tenant,v.conversation]);
  const [[process]]=await chatOperator.execute('SELECT version FROM session_process_version WHERE tenant_id=? ORDER BY version LIMIT 1',[tenant]);assert(process,'Retained process definition required');
  await chatOperator.execute("INSERT INTO session_progress(tenant_id,session_id,process_version,stage_key,coverage,created_at,updated_at) VALUES (?,?,?,'received','full',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[tenant,v.session,process.version]);
  const need=randomUUID();await chatOperator.execute("INSERT INTO session_need(tenant_id,id,session_id,label,created_at,actor_id) VALUES (?,?,?,'Synthetic transition need',UTC_TIMESTAMP(6),?)",[tenant,need,v.session,f.principal]);
  await chatOperator.execute("INSERT INTO need_assessment(tenant_id,need_id,conversation_id,session_id,values_json,pinned_json,proposal_json,version,created_at,updated_at) VALUES (?,?,?,?,'{}','{}','{}',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[tenant,need,v.conversation,v.session]);
  for(const status of ['queued','remote_queued','sending','unknown']){
   const id=randomUUID();await chatOperator.execute("INSERT INTO outbound_intent(id,tenant_id,conversation_id,actor_kind,actor_id,account_id,owner_revision,text,status,idempotency_key,created_at) VALUES (?,?,?,'human',?,?,1,'Synthetic lifecycle',?,?,UTC_TIMESTAMP(6))",[id,tenant,v.conversation,f.principal,f.account,status,id]);
   await chatOperator.execute("INSERT INTO message(id,tenant_id,conversation_id,connection_id,outbound_intent_id,direction,text,occurred_at,received_at,status) VALUES (?,?,?,?,?,'outbound','Synthetic lifecycle',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?)",[randomUUID(),tenant,v.conversation,ref.connection,id,status==='remote_queued'?'queued':status]);
  }
  closeReceipt=await call(closeRequest);assert.equal(closeReceipt.data.status,'closed');assert.equal(closeReceipt.data.version,'4');assert.equal(closeReceipt.data.owner_revision,'1');assert.equal(closeReceipt.data.need_response,false);assert.deepEqual(closeReceipt.data.allowed_actions,[]);assert(closeReceipt.data.closed_at);
  const [intents]=await chatOperator.execute('SELECT status FROM outbound_intent WHERE tenant_id=? AND conversation_id=? ORDER BY status',[tenant,v.conversation]);assert.deepEqual(intents.map(x=>x.status),['cancelled','cancelled','sending','unknown']);
  const [[session]]=await chatOperator.execute('SELECT status FROM conversation_acquisition_session WHERE tenant_id=? AND id=?',[tenant,v.session]);assert.equal(session.status,'closed');
  const [[events]]=await chatOperator.execute("SELECT COUNT(*) n FROM outbox_event WHERE tenant_id=? AND aggregate_id=? AND event_type='acquisition_session.closed'",[tenant,v.session]);assert.equal(Number(events.n),1);
  const [[needEvent]]=await chatOperator.execute("SELECT COUNT(*) n FROM outbox_event WHERE tenant_id=? AND aggregate_id=? AND event_type='need.assessed' AND schema_version=2",[tenant,need]);assert.equal(Number(needEvent.n),1);
  const [[workspace]]=await chatOperator.execute('SELECT waiting_since,snoozed_until,snooze_revision FROM conversation_workspace WHERE tenant_id=? AND conversation_id=?',[tenant,v.conversation]);assert.equal(workspace.waiting_since,null);assert.equal(workspace.snoozed_until,null);assert.equal(String(workspace.snooze_revision),'2');
  assert.deepEqual(await call(closeRequest),closeReceipt);await bad(call(request(v,'open','4')),'INVALID_TRANSITION');
 });
 await check('Chat detail transition concurrent close key retains one child and one session event',async()=>{
  const x=await create(),req=request(x,'closed'),results=await Promise.all([call(req),call(req)]);assert.deepEqual(results[0],results[1]);assert.equal(await version(x),'2');
  const [[events]]=await chatOperator.execute("SELECT COUNT(*) n FROM outbox_event WHERE tenant_id=? AND aggregate_id=? AND event_type='acquisition_session.closed'",[tenant,x.session]);assert.equal(Number(events.n),1);
 });
 await check('Chat detail transition lost close confirmation and lost public ACK recover durable receipt',async()=>{
  const x=await create(),req=request(x,'closed'),confirm=ownershipPeers.confirm;ownershipPeers.confirm=async()=>{throw new Error('SYNTHETIC_CONFIRM_OUTAGE');};let first;
  try{first=await call(req);}finally{ownershipPeers.confirm=confirm;}
  const id=transitionCommandId(tenant,f.principal,x.conversation,req.payload.idempotency_key),p=await commands.existing(tenant,id);
  assert.equal((await new ChatOwnership(commands,ownershipPeers).execute(tenant,{command_id:id,binding_digest:p.binding_digest})).reconciliation,'complete');
  assert.deepEqual(await call(req),first);assert.equal(await version(x),'2');
 });
 await check('Chat detail transition native logout during hydration aborts before write',async()=>{
  const x=await create(),session=await ctx.login(f.account),enrolled=await new HumanDispatchEnrollment(ctx.ds).enroll(tenant,createHash('sha256').update(session).digest('hex')),req=request(x);req.actor.delegation_id=enrolled.delegationId;
  const contact=peers.contact;peers.contact=async(...args)=>{const result=await contact(...args);await ctx.drainingAuth.logout(session,'http://localhost:18080',await ctx.auth.csrf(session));return result;};
  try{await bad(call(req),'INVALID_TRANSITION');}finally{peers.contact=contact;}assert.equal(await version(x),'1');
 });
 await check('Chat detail transition parent logout after committed close prevents disclosure',async()=>{
  const x=await create(),session=await ctx.login(f.account),enrolled=await new HumanDispatchEnrollment(ctx.ds).enroll(tenant,createHash('sha256').update(session).digest('hex')),req=request(x,'closed');req.actor.delegation_id=enrolled.delegationId;
  let loggedOut=false;const confirm=ownershipPeers.confirm;ownershipPeers.confirm=async(...args)=>{await confirm(...args);await ctx.drainingAuth.logout(session,'http://localhost:18080',await ctx.auth.csrf(session));loggedOut=true;};
  // Pause the in-process coordinator at the commit boundary; all owning peers remain real HTTP.
  // This avoids counting an outer transport deadline as completed logout evidence.
  try{await bad(transitions.transition(req),'INVALID_TRANSITION');assert(loggedOut);}finally{ownershipPeers.confirm=confirm;}
  assert.equal(await version(x),'2');assert.equal((await call({...req,actor:request(x).actor})).data.status,'closed');
 });
 await check('Chat detail transition public native CSRF Origin ETag replay and bounds'+(process.argv.includes('--with-runtime')?' runtime':''),async()=>{
  const candidate=process.argv.includes('--with-runtime')?await nativeChatParity(ctx,{crm:new URL(protocol+'//127.0.0.1:'+crmServer.address().port+'/'),connector:new URL(protocol+'//127.0.0.1:'+ctx.connectorServer.address().port+'/'),routing:new URL(protocol+'//127.0.0.1:'+routingServer.address().port+'/')}):null;
  try{
  const x=await create(),publicServer=createChatTransitionBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),candidate?.call??call);servers.push(publicServer);publicServer.listen(0,'127.0.0.1');await once(publicServer,'listening');
  const url='http://127.0.0.1:'+publicServer.address().port+'/api/v1/conversations/'+x.conversation+'/transition',headers={'x-tenant-id':tenant,cookie:'crm_session='+ctx.actorSession,origin:'http://localhost:18080','content-type':'application/json','idempotency-key':randomUUID(),'if-match':'"1"','x-csrf-token':await ctx.auth.csrf(ctx.actorSession)},body=JSON.stringify(request(x).payload.body);
  assert.equal((await fetch(url,{method:'POST',headers:{...headers,'x-csrf-token':'bad'},body})).status,403);assert.equal((await fetch(url,{method:'POST',headers:{...headers,origin:'http://invalid.test'},body})).status,403);
  const response=await fetch(url,{method:'POST',headers,body});assert.equal(response.status,200);assert.equal(response.headers.get('etag'),'"2"');assert.equal(response.headers.get('cache-control'),'no-store');const result=await response.json();assert.deepEqual(await (await fetch(url,{method:'POST',headers,body})).json(),result);
  assert.equal((await fetch(url,{method:'POST',headers:{...headers,'if-match':'1'},body})).status,400);assert.equal((await fetch(url,{method:'POST',headers,body:JSON.stringify({target_status:'open',reason:'x'.repeat(70000)})})).status,413);
  if(candidate){
   const close={method:'POST',headers:{...headers,'if-match':'"2"','idempotency-key':randomUUID()},body:JSON.stringify({target_status:'closed',reason:'Synthetic runtime close'})};
   const response=await fetch(url,close);assert.equal(response.status,200);const closed=await response.json();assert.equal(closed.data.status,'closed');assert.deepEqual(await (await fetch(url,close)).json(),closed);
   const [[episode]]=await chatOperator.execute('SELECT status,close_reason FROM conversation_acquisition_session WHERE tenant_id=? AND id=?',[tenant,x.session]);assert.equal(episode.status,'closed');assert.equal(episode.close_reason,'agent_closed');assert(candidate.proofCount()>0);
  }
  }finally{if(candidate)await candidate.stop();}
 });
 if(process.argv.includes('--with-runtime'))await check('Chat detail runtime public assignment takeover CAS and close retain native Routing capacity and owner history',async()=>{
  const candidate=await nativeChatParity(ctx,{crm:new URL(protocol+'//127.0.0.1:'+crmServer.address().port+'/'),connector:new URL(protocol+'//127.0.0.1:'+ctx.connectorServer.address().port+'/'),routing:new URL(protocol+'//127.0.0.1:'+routingServer.address().port+'/')});
  try{
   // Close interrupted ownership rounds through Chat/Routing, preserving history.
   for(const prior of fixture.rounds){const [[row]]=await chatOperator.execute("SELECT r.version FROM crm_record r JOIN conversation c ON c.tenant_id=r.tenant_id AND c.record_id=r.id WHERE r.tenant_id=? AND r.id=? AND c.status<>'closed' AND EXISTS(SELECT 1 FROM chat_owner_command x WHERE x.tenant_id=r.tenant_id AND x.resource_id=r.id AND x.operation='routing-assignment')",[tenant,prior.conversation]);if(row)await candidate.call(request(prior,'closed',String(row.version)));}
   const x=await create(),http=createChatOwnershipBff(new ChatOwnershipBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),candidate.call));servers.push(http);http.listen(0,'127.0.0.1');await once(http,'listening');
   const root='http://127.0.0.1:'+http.address().port+'/api/v1',headers={'x-tenant-id':tenant,cookie:'crm_session='+ctx.actorSession,origin:'http://localhost:18080','x-csrf-token':await ctx.auth.csrf(ctx.actorSession),'content-type':'application/json'};
   const options=(version,body)=>({method:'POST',headers:{...headers,'if-match':'"'+version+'"','idempotency-key':randomUUID()},body:JSON.stringify(body)}),url=root+'/records/'+x.conversation+'/assignment';
   const assign=options('1',{owner_principal_id:f.adminPrincipal,reason:'manual'}),response=await fetch(url,assign);const assigned=await response.json();assert.equal(response.status,200,assigned.error?.code);assert.equal(assigned.data.owner_principal_id,f.adminPrincipal);assert.deepEqual((await (await fetch(url,assign)).json()).data,assigned.data);
   const takeover=await fetch(root+'/conversations/'+x.conversation+'/takeover',options('2',{reason:'human_takeover'})),taken=await takeover.json();assert.equal(takeover.status,200,taken.error?.code);assert.equal(taken.data.owner_principal_id,f.principal);
   assert.equal((await fetch(url,options('2',{owner_principal_id:f.adminPrincipal,reason:'manual'}))).status,409);
   const closed=await candidate.call({...request(x,'closed','3'),payload:{...request(x,'closed','3').payload,body:{target_status:'closed',reason:'Synthetic runtime owner release'}}});assert.equal(closed.data.status,'closed');
   const [[head]]=await operator.execute('SELECT state FROM routing_allocation_head WHERE tenant_id=? AND session_id=?',[tenant,x.session]);assert.equal(head.state,'closed');
   const [[history]]=await chatOperator.execute('SELECT COUNT(*) n FROM ownership_history WHERE tenant_id=? AND record_id=?',[tenant,x.conversation]);assert.equal(Number(history.n),2);assert(candidate.proofCount()>0);
  }finally{await candidate.stop();}
 });
}
