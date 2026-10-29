import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {ChatOwnership} from '../../services/chat/dist/ownership.js';
import {ChatRoutingRerouteSource,chatRoutingRerouteRoutes} from '../../services/chat/dist/routing-reroute.js';
import {NativeRoutingReroute,rerouteCommand} from '../../services/core-baseline/dist/modules/agents/owner-reroute.js';
import {RoutingRerouteBff,createRoutingRerouteBff} from '../../services/core-baseline/dist/modules/agents/owner-reroute-bff.js';
import {NativeOwnerCapacity} from '../../services/core-baseline/dist/modules/agents/owner-capacity.js';
import {NativeRoutingConfiguration} from '../../services/core-baseline/dist/modules/agents/owner-config.js';
import {routingOwnerRoutes} from '../../services/core-baseline/dist/modules/agents/owner-http.js';
import {HumanDispatchEnrollment} from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';
import {hash} from '../../services/core-baseline/dist/modules/identity/auth/security.js';
import {createWorkloadServer,ownerClient,ownerCommandClient,routingRerouteBinding,ownerCanonical,ownerDigest,OwnerError} from '../../packages/workload-transport/dist/index.js';

export async function chatRoutingRerouteNative(ctx){
 const {check,operator,chatOperator,commands,f,fixture,run,sync,identityClient,chatMaterial,routingMaterial,routingPool,routingAuthority,chatAuthority,protocol,servers,chatServer}=ctx,tenant=ctx.other,row=run.waiting;
 const [[savedRole]]=await operator.execute('SELECT permissions FROM `role` WHERE tenant_id=? AND id=?',[tenant,f.otherRole]),[[savedMember]]=await operator.execute('SELECT seat_code FROM membership WHERE tenant_id=? AND id=?',[tenant,f.otherMember]),saved=typeof savedRole.permissions==='string'?savedRole.permissions:JSON.stringify(savedRole.permissions),grants=[...JSON.parse(saved).filter(g=>g.resource!=='routing'),{resource:'routing',action:'manage',scope:'all'}];
 await operator.execute('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants),tenant,f.otherRole]);await operator.execute("UPDATE membership SET seat_code='admin' WHERE tenant_id=? AND id=?",[tenant,f.otherMember]);
 await operator.execute("INSERT INTO team(id,tenant_id,name,purpose,active,created_at,updated_at) VALUES (?,?,'Synthetic reroute team','chat',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[fixture.team,tenant]);
 for(const principal of [f.otherPrincipal,fixture.principal])await operator.execute('INSERT INTO team_member(tenant_id,team_id,principal_id,active) VALUES (?,?,?,1) ON DUPLICATE KEY UPDATE active=1',[tenant,fixture.team,principal]);
 for(const dataset of ['conversion','progress','registry','routing','stage'])await chatOperator.execute('INSERT INTO chat_dataset_head(tenant_id,dataset,revision,version,created_at,updated_at) VALUES (?,?,1,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE tenant_id=tenant_id',[tenant,dataset]);
 await chatOperator.execute('INSERT INTO conversation_activity_counter(tenant_id,conversation_id,last_seq,backfilled) VALUES (?,?,0,1) ON DUPLICATE KEY UPDATE conversation_id=conversation_id',[tenant,row.id]);
 await chatOperator.execute("INSERT INTO conversation_workspace(tenant_id,conversation_id,last_message_at,waiting_metric_state) VALUES (?,?,UTC_TIMESTAMP(6),'ready') ON DUPLICATE KEY UPDATE conversation_id=conversation_id",[tenant,row.id]);
 const start=async server=>{servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');return new URL(protocol+'//127.0.0.1:'+server.address().port+'/');};
 const recover=ownerClient(routingMaterial,routingAuthority,'chat',new URL(protocol+'//127.0.0.1:'+chatServer.address().port+'/')),capacity=new NativeOwnerCapacity(routingPool,(t,ref,abort)=>recover(t,abort?'command-abort':'command-proof',ref));
 const routing=ownerClient(chatMaterial,chatAuthority,'routing',await start(createWorkloadServer(routingMaterial,routingAuthority,routingOwnerRoutes(capacity))));
 const ownershipPeers={admit:(t,command)=>identityClient(t,'admit',{owner:'chat',command}),settle:(t,command,admission_id)=>identityClient(t,'settle',{owner:'chat',command,admission_id}),reserve:(t,command,session_id)=>routing(t,'capacity-reserve',{command,session_id,reservation_id:null}),confirm:async(t,command,reservation_id)=>{const proof=await commands.proof(t,command);await routing(t,'capacity-confirm',{command,session_id:proof.binding.session_id,reservation_id});}};
 const ownership=new ChatOwnership(commands,ownershipPeers),source=new ChatRoutingRerouteSource(commands,ownershipPeers),call=ownerCommandClient(routingMaterial,routingAuthority,'chat',await start(createWorkloadServer(chatMaterial,chatAuthority,chatRoutingRerouteRoutes(source,commands,ownership))));
 const peers={source:call,effect:call,recover:(t,ref,abort)=>recover(t,abort?'command-abort':'command-proof',ref)},reroute=new NativeRoutingReroute(routingPool,peers,capacity,sync),enrollment=new HumanDispatchEnrollment(ctx.ds),bff=new RoutingRerouteBff(ctx.auth,enrollment,ctx.authority,reroute),publicUrl=await start(createRoutingRerouteBff(bff));
 let session=ctx.actorSession;const origin='http://localhost:18080';
 const record=async()=> (await chatOperator.execute('SELECT owner_principal_id,team_id,version,owner_revision FROM crm_record WHERE tenant_id=? AND id=?',[tenant,row.id]))[0][0];
 const work=async()=> (await operator.execute('SELECT * FROM routing_work_item WHERE tenant_id=? AND session_id=?',[tenant,row.session]))[0][0];
 const state=async()=>{const w=await work();return {record:await record(),work:w,entries:(await operator.execute('SELECT * FROM routing_queue_entry WHERE tenant_id=? AND work_id=? ORDER BY id',[tenant,w.id]))[0],allocations:(await operator.execute('SELECT * FROM routing_human_allocation WHERE tenant_id=? AND work_id=? ORDER BY id',[tenant,w.id]))[0]};};
 const input=async(target=f.otherPrincipal)=>{const w=await work();return {session,origin,csrf:await ctx.auth.csrf(session),tenant,key:randomUUID(),version:String(w.version),body:{work_id:w.id,queue_id:fixture.queue,owner_principal_id:target},correlation:randomUUID()};};
 const bad=(p,code)=>assert.rejects(p,e=>e.code===code),job=async req=>(await operator.execute('SELECT * FROM routing_owner_command WHERE tenant_id=? AND command_id=?',[tenant,rerouteCommand(tenant,f.otherPrincipal,req.key)]))[0][0];
 const restore=async(sql,args,undo,undoArgs,fn)=>{await operator.execute(sql,args);try{await fn();}finally{await operator.execute(undo,undoArgs);}};
 try{
  await check('Chat routing sync reroute selected Human commits actual Chat effects and atomic public version',async()=>{
   const req=await input(),before=await state(),result=await bff.mutate(req),after=await state();assert.equal(result.data.version,String(BigInt(req.version)+2n));assert.equal(after.record.owner_principal_id,f.otherPrincipal);assert.equal(String(after.work.version),result.data.version);assert.equal(after.entries.length,before.entries.length+1);assert.equal(after.entries.filter(e=>e.state==='waiting').length,0);assert.equal((await job(req)).state,'committed');
   const [[history]]=await chatOperator.execute('SELECT reason,actor_kind FROM ownership_history WHERE tenant_id=? AND record_id=? ORDER BY owner_revision DESC LIMIT 1',[tenant,row.id]);assert.equal(history.reason,'human_routing');assert.equal(history.actor_kind,'human');
   assert.deepEqual(await bff.mutate({...req,correlation:randomUUID()}),result);assert.deepEqual(await state(),after);await bad(bff.mutate({...req,body:{...req.body,owner_principal_id:null}}),'IDEMPOTENCY_CONFLICT');
  });
  await check('Chat routing sync reroute same-owner preserves historical allocation and cap exception',async()=>{
   const before=await state(),[[profile]]=await operator.execute('SELECT capacity FROM routing_human_profile WHERE tenant_id=? AND principal_id=?',[tenant,f.otherPrincipal]);
   await restore('UPDATE routing_human_profile SET capacity=0 WHERE tenant_id=? AND principal_id=?',[tenant,f.otherPrincipal],'UPDATE routing_human_profile SET capacity=? WHERE tenant_id=? AND principal_id=?',[profile.capacity,tenant,f.otherPrincipal],async()=>{await bff.mutate(await input());});
   const after=await state();assert.deepEqual(after.allocations,before.allocations);assert.equal(after.entries.length,before.entries.length+1);
  });
  await check('Chat routing sync reroute capacity and skill denial preserve original owner queue and allocation',async()=>{
   const [[profile]]=await operator.execute('SELECT capacity FROM routing_human_profile WHERE tenant_id=? AND principal_id=?',[tenant,fixture.principal]),before=await state();
   await restore('UPDATE routing_human_profile SET capacity=0 WHERE tenant_id=? AND principal_id=?',[tenant,fixture.principal],'UPDATE routing_human_profile SET capacity=? WHERE tenant_id=? AND principal_id=?',[profile.capacity,tenant,fixture.principal],async()=>{const req=await input(fixture.principal);await bad(bff.mutate(req),'HUMAN_CAPACITY_FULL');assert.equal((await job(req)).state,'aborted');});assert.deepEqual(await state(),before);
   const [[queue]]=await operator.execute('SELECT skill_ids FROM routing_queue_version WHERE tenant_id=? AND id=?',[tenant,fixture.queueVersion]);
   await restore('UPDATE routing_queue_version SET skill_ids=? WHERE tenant_id=? AND id=?',[JSON.stringify([randomUUID()]),tenant,fixture.queueVersion],'UPDATE routing_queue_version SET skill_ids=? WHERE tenant_id=? AND id=?',[typeof queue.skill_ids==='string'?queue.skill_ids:JSON.stringify(queue.skill_ids),tenant,fixture.queueVersion],()=>bad(input(fixture.principal).then(req=>bff.mutate(req)),'NO_MATCHING_SKILL'));assert.deepEqual(await state(),before);
  });
  await check('Chat routing sync reroute null owner creates one waiting visit and releases allocation',async()=>{
   const before=await state(),req=await input(null),result=await bff.mutate(req),after=await state();assert.equal(after.record.owner_principal_id,null);assert.equal(after.entries.length,before.entries.length+1);assert.equal(after.entries.filter(e=>e.state==='waiting').length,1);assert.equal(after.allocations.filter(a=>a.released_at===null).length,0);assert.equal(result.data.version,String(BigInt(req.version)+1n));
  });
  await check('Chat routing sync reroute concurrent same-key requests keep one effect and exact response',async()=>{
   const req=await input(),before=await record(),results=await Promise.all([bff.mutate(req),bff.mutate(req)]);assert.deepEqual(results[0],results[1]);assert.equal(String((await record()).owner_revision),String(BigInt(before.owner_revision)+1n));
  });
  await check('Chat routing sync reroute lost effect ACK preserves immutable retry and receipt',async()=>{
   for(const after of [false,true]){
    const req=await input(),original=peers.effect,before=await record();let first;
    peers.effect=async request=>{first=request;if(after)await original(request);throw new OwnerError('DEPENDENCY_UNAVAILABLE');};try{await bad(bff.mutate(req),'DEPENDENCY_UNAVAILABLE');}finally{peers.effect=original;}
    const savedJob=await job(req);assert.equal(savedJob.state,after?'committed':'prepared');const result=await bff.mutate({...req,correlation:randomUUID()});assert.equal(result.meta.correlation_id,req.correlation);assert.equal(String((await record()).owner_revision),String(BigInt(before.owner_revision)+1n));assert.equal(JSON.parse(typeof savedJob.request_json==='string'?savedJob.request_json:JSON.stringify(savedJob.request_json)).child.command_id,first.command_id);
   }
  });
  await check('Chat routing sync reroute lost capacity confirmation ACK recovers truthful current receipt',async()=>{
   const req=await input(),original=ownershipPeers.confirm,before=await record();ownershipPeers.confirm=async()=>{throw new OwnerError('DEPENDENCY_UNAVAILABLE');};try{await bad(bff.mutate(req),'DEPENDENCY_UNAVAILABLE');assert.equal((await job(req)).state,'prepared');assert.equal(String((await record()).owner_revision),String(BigInt(before.owner_revision)+1n));}finally{ownershipPeers.confirm=original;}
   const result=await bff.mutate(req);assert.equal((await job(req)).state,'committed');assert.equal(result.data.version,String((await work()).version));
  });
  await check('Chat routing sync reroute abort before prepare is permanent and changes no queue',async()=>{
   const req=await input(),before=await state(),original=peers.effect;peers.effect=async request=>{await recover(tenant,'command-abort',routingRerouteBinding(request).ref);return original(request);};try{await bad(bff.mutate(req),'INVALID_TRANSITION');}finally{peers.effect=original;}assert.deepEqual(await state(),before);assert.equal((await job(req)).state,'aborted');
  });
  await check('Chat routing sync reroute queue publication race aborts without partial enqueue',async()=>{
   const req=await input(),before=await state(),original=peers.effect;peers.effect=async request=>{await operator.execute('UPDATE routing_queue SET enabled=0 WHERE tenant_id=? AND id=?',[tenant,fixture.queue]);return original(request);};try{await bad(bff.mutate(req),'STALE_VERSION');}finally{peers.effect=original;await operator.execute('UPDATE routing_queue SET enabled=1 WHERE tenant_id=? AND id=?',[tenant,fixture.queue]);}assert.deepEqual(await state(),before);
  });
  await check('Chat routing sync reroute live admin authority applies to source effect and replay',async()=>{
   const req=await input(),result=await bff.mutate(req),before=await state();
   await restore('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[saved,tenant,f.otherRole],'UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants),tenant,f.otherRole],async()=>{await bad(bff.mutate(req),'FORBIDDEN');const actor=await enrollment.enroll(tenant,hash(session));await bad(peers.source({schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,operation:'routing-reroute-source',command_id:randomUUID(),actor:{kind:'human',principal_id:actor.principalId,delegation_id:actor.delegationId},payload:{id:row.id}}),'FORBIDDEN');});
   assert.deepEqual(await bff.mutate(req),result);assert.deepEqual(await state(),before);
   const next=await input(),original=peers.effect;peers.effect=async request=>{await operator.execute('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[saved,tenant,f.otherRole]);return original(request);};try{await bad(bff.mutate(next),'FORBIDDEN');}finally{peers.effect=original;await operator.execute('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants),tenant,f.otherRole]);}assert.deepEqual(await state(),before);
  });
  await check('Chat routing sync reroute public native CSRF version ETag and strict body',async()=>{
   const req=await input(),post=(extra={},body=req.body)=>fetch(new URL('/api/v1/human-routing/reroute',publicUrl),{method:'POST',headers:{'content-type':'application/json','x-tenant-id':tenant,cookie:'crm_session='+session,origin,'x-csrf-token':req.csrf,'idempotency-key':req.key,'if-match':'"'+req.version+'"',...extra},body:JSON.stringify(body)});
   assert.equal((await post({'x-csrf-token':'bad'})).status,403);assert.equal((await post({}, {...req.body,extra:true})).status,400);const result=await post();assert.equal(result.status,200);const response=await result.json();assert.equal(result.headers.get('etag'),'"'+response.data.version+'"');assert.deepEqual(await (await post()).json(),response);
  });
  await check('Chat routing sync reroute configuration recovery cannot abort reroute journal',async()=>{
   const req=await input();await bff.mutate(req);const savedJob=await job(req),configuration=new NativeRoutingConfiguration(routingPool,capacity);await bad(configuration.proof(tenant,{command_id:savedJob.command_id,binding_digest:savedJob.binding_digest},true),'FORBIDDEN');
  });
  await check('Chat routing sync reroute imported legacy receipt retains exact original body and conflict',async()=>{
   const req=await input(),response={data:{id:req.body.work_id,version:'913'},meta:{correlation_id:randomUUID()}},command=rerouteCommand(tenant,f.otherPrincipal,req.key);
   await operator.execute("INSERT INTO routing_owner_command(tenant_id,command_id,operation,binding_digest,actor_kind,actor_id,resource_kind,resource_id,record_version,owner_revision,control_revision,legacy_route,legacy_key,legacy_request_hash,result_json,state,terminal_digest,terminal_at,version,created_at,updated_at) VALUES (?,?,'legacy-reroute',?,'human',?,'routing_work',?,?,0,0,?,?,?,?, 'committed',?,UTC_TIMESTAMP(6),1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[tenant,command,ownerDigest({legacy:command}),f.otherPrincipal,req.body.work_id,req.version,'POST /api/v1/human-routing/reroute',req.key,ownerDigest({body:req.body,version:req.version}),ownerCanonical(response),ownerDigest(response)]);
   const before=await state();assert.deepEqual(await bff.mutate(req),response);assert.deepEqual(await state(),before);await bad(bff.mutate({...req,version:'0'}),'IDEMPOTENCY_CONFLICT');
  });
  await check('Chat routing sync reroute completed logout cannot replace saved child delegation',async()=>{
   const req=await input(),before=await state(),original=peers.effect;let ref;peers.effect=async request=>{ref=routingRerouteBinding(request).ref;throw new OwnerError('DEPENDENCY_UNAVAILABLE');};try{await bad(bff.mutate(req),'DEPENDENCY_UNAVAILABLE');}finally{peers.effect=original;}
   await ctx.drainingAuth.logout(session,origin,await ctx.auth.csrf(session));session=await ctx.login(f.account);await bad(bff.mutate({...req,session,csrf:await ctx.auth.csrf(session)}),'REVOKED');assert.equal((await commands.proof(tenant,ref)).state,'aborted');assert.deepEqual(await state(),before);
  });
  await check('Chat routing sync reroute late confirmation never revives a newer owner and saves actual version',async()=>{
   const req=await input(),original=ownershipPeers.confirm,command=rerouteCommand(tenant,f.otherPrincipal,req.key);
   ownershipPeers.confirm=async(t,ref,reservation)=>{if(ref.command_id===command)throw new OwnerError('DEPENDENCY_UNAVAILABLE');return original(t,ref,reservation);};
   try{
    await bad(bff.mutate(req),'DEPENDENCY_UNAVAILABLE');
    const current=await record(),actor=await enrollment.enroll(tenant,hash(session)),assignment={schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,operation:'routing-assignment',command_id:randomUUID(),actor:{kind:'human',principal_id:actor.principalId,delegation_id:actor.delegationId},payload:{id:row.id,body:{owner_principal_id:null,team_id:fixture.team,reason:'manual'},expected_version:String(current.version),idempotency_key:randomUUID()}};
    const prepared=await ownership.prepare(assignment,{principal_id:null,kind:null,team_id:fixture.team});await ownership.execute(tenant,{command_id:assignment.command_id,binding_digest:prepared.binding_digest});
   }finally{ownershipPeers.confirm=original;}
   const before=await state(),result=await bff.mutate(req);assert.equal(result.data.version,String(before.work.version));assert.equal(before.record.owner_principal_id,null);assert.deepEqual(await state(),before);assert.deepEqual(await bff.mutate(req),result);
  });
  await check('Chat routing sync reroute work and Chat CAS races cannot partially enqueue',async()=>{
   const req=await input(),before=await state();await bad(bff.mutate({...req,version:'0'}),'VERSION_CONFLICT');assert.deepEqual(await state(),before);
   const original=peers.effect;peers.effect=async request=>{await chatOperator.execute('UPDATE crm_record SET version=version+1 WHERE tenant_id=? AND id=?',[tenant,row.id]);return original(request);};
   try{await bad(bff.mutate(req),'STALE_VERSION');}finally{peers.effect=original;}
   const after=await state();assert.deepEqual(after.work,before.work);assert.deepEqual(after.entries,before.entries);assert.deepEqual(after.allocations,before.allocations);assert.equal(after.record.owner_principal_id,before.record.owner_principal_id);
  });
  await check('Chat routing sync reroute current target availability and field denials leave queue unchanged',async()=>{
   const before=await state(),policy=randomUUID();await operator.execute("INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,'team_id','[]',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[policy,tenant,f.otherRole,f.otherObject]);
   await restore("UPDATE field_policy SET denied_actions='[\"write\"]' WHERE tenant_id=? AND role_id=? AND object_type_id=? AND property_key='team_id'",[tenant,f.otherRole,f.otherObject],"UPDATE field_policy SET denied_actions='[]' WHERE tenant_id=? AND role_id=? AND object_type_id=? AND property_key='team_id'",[tenant,f.otherRole,f.otherObject],()=>bad(input().then(req=>bff.mutate(req)),'FORBIDDEN'));
   await restore("UPDATE principal SET availability='unavailable' WHERE tenant_id=? AND id=?",[tenant,f.otherPrincipal],"UPDATE principal SET availability='available' WHERE tenant_id=? AND id=?",[tenant,f.otherPrincipal],()=>bad(input().then(req=>bff.mutate(req)),'FORBIDDEN'));assert.deepEqual(await state(),before);
  });
 }finally{await operator.execute('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[saved,tenant,f.otherRole]);await operator.execute('UPDATE membership SET seat_code=? WHERE tenant_id=? AND id=?',[savedMember.seat_code,tenant,f.otherMember]);}
}
