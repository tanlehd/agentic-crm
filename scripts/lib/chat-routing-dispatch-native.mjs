import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {ChatAssignmentDirectory,chatAssignmentDirectoryRoutes} from '../../services/chat/dist/assignment-directory.js';
import {ChatOwnership} from '../../services/chat/dist/ownership.js';
import {chatRoutingDispatchRoutes} from '../../services/chat/dist/routing-dispatch.js';
import {NativeHumanDispatcher} from '../../services/core-baseline/dist/modules/agents/owner-dispatch.js';
import {NativeOwnerCapacity} from '../../services/core-baseline/dist/modules/agents/owner-capacity.js';
import {NativeRoutingConfiguration} from '../../services/core-baseline/dist/modules/agents/owner-config.js';
import {routingOwnerRoutes} from '../../services/core-baseline/dist/modules/agents/owner-http.js';
import {createWorkloadServer,ownerClient,ownerCommandClient,routingDispatchBinding,OwnerError} from '../../packages/workload-transport/dist/index.js';

export async function chatRoutingDispatchNative(ctx){
 const {check,operator,chatOperator,commands,f,fixture,run,sync,identityClient,chatMaterial,routingMaterial,routingPool,routingAuthority,chatAuthority,protocol,servers,chatServer}=ctx,tenant=ctx.other,created=[];
 await operator.execute("INSERT INTO team(id,tenant_id,name,purpose,active,created_at,updated_at) VALUES (?,?,'Synthetic dispatch team','chat',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[fixture.team,tenant]);
 for(const principal of [f.otherPrincipal,fixture.principal])await operator.execute('INSERT INTO team_member(tenant_id,team_id,principal_id,active) VALUES (?,?,?,1) ON DUPLICATE KEY UPDATE active=1',[tenant,fixture.team,principal]);
 for(const dataset of ['conversion','progress','registry','routing','stage'])await chatOperator.execute('INSERT INTO chat_dataset_head(tenant_id,dataset,revision,version,created_at,updated_at) VALUES (?,?,1,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE tenant_id=tenant_id',[tenant,dataset]);
 const setup=async row=>{await chatOperator.execute('INSERT INTO conversation_activity_counter(tenant_id,conversation_id,last_seq,backfilled) VALUES (?,?,0,1) ON DUPLICATE KEY UPDATE conversation_id=conversation_id',[tenant,row.id]);await chatOperator.execute("INSERT INTO conversation_workspace(tenant_id,conversation_id,last_message_at,waiting_metric_state) VALUES (?,?,UTC_TIMESTAMP(6),'ready') ON DUPLICATE KEY UPDATE conversation_id=conversation_id",[tenant,row.id]);};await setup(run.waiting);
 const create=async()=>{
  const row={id:randomUUID(),session:randomUUID()};created.push(row);
  await chatOperator.execute("INSERT INTO crm_record(id,tenant_id,object_type_id,version,owner_revision,custom_values,created_at,updated_at) VALUES (?,?,?,1,1,'{}',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[row.id,tenant,f.otherObject]);
  await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at) VALUES (?,?,?,?,?,'open',UTC_TIMESTAMP(6))",[tenant,row.id,randomUUID(),randomUUID(),fixture.connection]);
  await chatOperator.execute('INSERT INTO chat_control_head(tenant_id,conversation_id,registry_revision,control_revision,cancel_through,pause_through,version,created_at,updated_at) VALUES (?,?,1,1,0,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[tenant,row.id]);
  await chatOperator.execute("INSERT INTO conversation_acquisition_session(tenant_id,id,conversation_id,sequence,status,opening_reason,opened_at,opening_occurred_at,source_classification,source_connection_id,policy_version) VALUES (?,?,?,1,'active','first_inbound',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'unknown',?,'conversation_acquisition_v1')",[tenant,row.session,row.id,fixture.connection]);await setup(row);return row;
 };
 const recover=ownerClient(routingMaterial,routingAuthority,'chat',new URL(protocol+'//127.0.0.1:'+chatServer.address().port+'/'));
 const capacity=new NativeOwnerCapacity(routingPool,(t,ref,abort)=>recover(t,abort?'command-abort':'command-proof',ref));
 const capacityServer=createWorkloadServer(routingMaterial,routingAuthority,routingOwnerRoutes(capacity));servers.push(capacityServer);capacityServer.listen(0,'127.0.0.1');await once(capacityServer,'listening');
 const routing=ownerClient(chatMaterial,chatAuthority,'routing',new URL(protocol+'//127.0.0.1:'+capacityServer.address().port+'/'));
 const ownershipPeers={admit:(t,command)=>identityClient(t,'admit',{owner:'chat',command}),settle:(t,command,admission_id)=>identityClient(t,'settle',{owner:'chat',command,admission_id}),reserve:(t,command,session_id)=>routing(t,'capacity-reserve',{command,session_id,reservation_id:null}),confirm:async(t,command,reservation_id)=>{const proof=await commands.proof(t,command);await routing(t,'capacity-confirm',{command,session_id:proof.binding.session_id,reservation_id});}};
 const ownership=new ChatOwnership(commands,ownershipPeers),directory=new ChatAssignmentDirectory(commands,{admit:ownershipPeers.admit,settle:ownershipPeers.settle,directory:(t,command,admission_id)=>identityClient(t,'admission-assignment-directory',{command,admission_id}),capacity:()=>{throw new Error('PROPOSAL_MUST_NOT_REENTER_ROUTING');}});
 const server=createWorkloadServer(chatMaterial,chatAuthority,{...chatAssignmentDirectoryRoutes(directory),...chatRoutingDispatchRoutes(commands,ownership)});servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');
 const call=ownerCommandClient(routingMaterial,routingAuthority,'chat',new URL(protocol+'//127.0.0.1:'+server.address().port+'/'));
 const peers={proposal:call,dispatch:call,recover:(t,ref,abort)=>recover(t,abort?'command-abort':'command-proof',ref)},dispatcher=new NativeHumanDispatcher(routingPool,()=>fixture.actor,peers,capacity,sync);
 const record=async row=>(await chatOperator.execute('SELECT owner_principal_id,owner_revision,version FROM crm_record WHERE tenant_id=? AND id=?',[tenant,row.id]))[0][0];
 const jobs=async row=>(await operator.execute("SELECT c.* FROM routing_owner_command c JOIN routing_work_item w ON w.tenant_id=c.tenant_id AND w.id=c.resource_id WHERE c.tenant_id=? AND c.operation='dispatch' AND w.session_id=? ORDER BY c.created_at,c.command_id",[tenant,row.session]))[0];
 const effects=async row=>{const [[r]]=await chatOperator.execute('SELECT (SELECT COUNT(*) FROM ownership_history WHERE tenant_id=? AND record_id=?) history,(SELECT COUNT(*) FROM session_contribution WHERE tenant_id=? AND conversation_id=? AND kind=\'assignment\') contributions,(SELECT COUNT(*) FROM conversation_activity WHERE tenant_id=? AND conversation_id=? AND kind=\'assignment\') activity',[tenant,row.id,tenant,row.id,tenant,row.id]);return r;};
 const restore=async(sql,args,undo,undoArgs,work)=>{await operator.execute(sql,args);try{await work();}finally{await operator.execute(undo,undoArgs);}};
 try{
  await check('Chat routing sync dispatch full owner HTTP saga chooses least load and preserves effects',async()=>{
   await dispatcher.tick(tenant);const state=await record(run.waiting);assert.equal(state.owner_principal_id,f.otherPrincipal);assert.equal(String(state.owner_revision),'2');assert.deepEqual(Object.values(await effects(run.waiting)).map(Number),[1,1,1]);
   const [[history]]=await chatOperator.execute('SELECT reason,actor_kind FROM ownership_history WHERE tenant_id=? AND record_id=?',[tenant,run.waiting.id]);assert.equal(history.reason,'human_routing');assert.equal(history.actor_kind,'service');
   assert.equal((await jobs(run.waiting))[0].state,'committed');const before=await effects(run.waiting);await dispatcher.tick(tenant);assert.deepEqual(await effects(run.waiting),before);
  });
  await check('Chat routing sync dispatch concurrent workers retain one work command and assignment',async()=>{
   const row=await create();const result=await Promise.allSettled([dispatcher.tick(tenant),dispatcher.tick(tenant)]);for(const r of result)if(r.status==='rejected')assert(['STALE_VERSION','DEPENDENCY_UNAVAILABLE'].includes(r.reason.code));await dispatcher.tick(tenant);
   assert.equal(String((await record(row)).owner_revision),'2');assert.equal((await jobs(row)).length,1);assert.deepEqual(Object.values(await effects(row)).map(Number),[1,1,1]);
  });
  await check('Chat routing sync dispatch lost before and after commit ACK retries immutable command',async()=>{
   for(const after of [false,true]){
    const row=await create(),original=peers.dispatch;let failed=false;
    peers.dispatch=async req=>{if(!failed&&req.payload.resource.resource_id===row.id){failed=true;if(after)await original(req);throw new OwnerError('DEPENDENCY_UNAVAILABLE');}return original(req);};
    try{await dispatcher.tick(tenant);}finally{peers.dispatch=original;}
    const first=await jobs(row);assert.equal(first.length,1);assert.equal(first[0].state,'prepared');assert.equal(String((await record(row)).owner_revision),after?'2':'1');
    await dispatcher.tick(tenant);assert.equal((await jobs(row))[0].command_id,first[0].command_id);assert.equal((await jobs(row))[0].state,'committed');assert.deepEqual(Object.values(await effects(row)).map(Number),[1,1,1]);
   }
  });
  await check('Chat routing sync dispatch abort before prepare creates permanent child tombstone',async()=>{
   const row=await create(),original=peers.dispatch;let first;
   peers.dispatch=async req=>{if(!first){first=routingDispatchBinding(req).ref;await recover(tenant,'command-abort',first);}return original(req);};
   try{await dispatcher.tick(tenant);}finally{peers.dispatch=original;}
   assert.equal((await jobs(row))[0].state,'aborted');assert.equal((await commands.proof(tenant,first)).state,'aborted');assert.equal(String((await record(row)).owner_revision),'1');
   await dispatcher.tick(tenant);assert.equal((await jobs(row)).length,2);assert.equal(String((await record(row)).owner_revision),'2');
  });
  await check('Chat routing sync dispatch availability capacity and skill denials leave waiting work',async()=>{
   const row=await create(),ids=[f.otherPrincipal,fixture.principal],slots=ids.map(()=>'?').join(',');
   const [profiles]=await operator.execute(`SELECT principal_id,capacity FROM routing_human_profile WHERE tenant_id=? AND principal_id IN (${slots})`,[tenant,...ids]);
   await restore(`UPDATE principal SET availability='unavailable' WHERE tenant_id=? AND id IN (${slots})`,[tenant,...ids],`UPDATE principal SET availability='available' WHERE tenant_id=? AND id IN (${slots})`,[tenant,...ids],async()=>{await dispatcher.tick(tenant);assert.equal((await jobs(row)).length,0);});
   try{await operator.execute(`UPDATE routing_human_profile SET capacity=0 WHERE tenant_id=? AND principal_id IN (${slots})`,[tenant,...ids]);await dispatcher.tick(tenant);assert.equal((await jobs(row)).length,0);}finally{for(const p of profiles)await operator.execute('UPDATE routing_human_profile SET capacity=? WHERE tenant_id=? AND principal_id=?',[p.capacity,tenant,p.principal_id]);}
   const [[version]]=await operator.execute('SELECT skill_ids FROM routing_queue_version WHERE tenant_id=? AND id=?',[tenant,fixture.queueVersion]);
   await restore('UPDATE routing_queue_version SET skill_ids=? WHERE tenant_id=? AND id=?',[JSON.stringify([randomUUID()]),tenant,fixture.queueVersion],'UPDATE routing_queue_version SET skill_ids=? WHERE tenant_id=? AND id=?',[JSON.stringify(typeof version.skill_ids==='string'?JSON.parse(version.skill_ids):version.skill_ids),tenant,fixture.queueVersion],async()=>{await dispatcher.tick(tenant);assert.equal((await jobs(row)).length,0);});
   await dispatcher.tick(tenant);assert.equal(String((await record(row)).owner_revision),'2');
  });
  await check('Chat routing sync dispatch queue disabled after proposal cannot create child',async()=>{
   const row=await create(),original=peers.proposal;peers.proposal=async req=>{const result=await original(req);await operator.execute('UPDATE routing_queue SET enabled=0 WHERE tenant_id=? AND id=?',[tenant,fixture.queue]);return result;};
   try{await dispatcher.tick(tenant);assert.equal((await jobs(row)).length,0);}finally{peers.proposal=original;await operator.execute('UPDATE routing_queue SET enabled=1 WHERE tenant_id=? AND id=?',[tenant,fixture.queue]);}
   await dispatcher.tick(tenant);assert.equal(String((await record(row)).owner_revision),'2');
  });
  await check('Chat routing sync dispatch target permission revoked after proposal aborts and releases exact reservation',async()=>{
   const policy=randomUUID();await operator.execute("INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,'text','[]',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[policy,tenant,f.otherRole,f.otherObject]);
   const row=await create(),original=peers.dispatch;peers.dispatch=async req=>{await operator.execute("UPDATE field_policy SET denied_actions='[\"write\"]' WHERE tenant_id=? AND role_id=? AND object_type_id=? AND property_key='text'",[tenant,f.otherRole,f.otherObject]);return original(req);};
   try{await dispatcher.tick(tenant);assert.equal((await jobs(row))[0].state,'aborted');assert.equal(String((await record(row)).owner_revision),'1');const [[held]]=await operator.execute("SELECT COUNT(*) n FROM routing_capacity_reservation WHERE tenant_id=? AND session_id=? AND state='reserved'",[tenant,row.session]);assert.equal(Number(held.n),0);}finally{peers.dispatch=original;await operator.execute("UPDATE field_policy SET denied_actions='[]' WHERE tenant_id=? AND role_id=? AND object_type_id=? AND property_key='text'",[tenant,f.otherRole,f.otherObject]);}
   await dispatcher.tick(tenant);assert.equal(String((await record(row)).owner_revision),'2');
  });
  await check('Chat routing sync dispatch journal is isolated from configuration abort surface',async()=>{
   const row=(await jobs(run.waiting))[0],configuration=new NativeRoutingConfiguration(routingPool,capacity);await assert.rejects(configuration.proof(tenant,{command_id:row.command_id,binding_digest:row.binding_digest},true),e=>e.code==='FORBIDDEN');assert.equal((await jobs(run.waiting))[0].state,'committed');
  });
  await check('Chat routing sync dispatch current service revoke after proposal prevents ownership effect',async()=>{
   const row=await create(),original=peers.dispatch;
   peers.dispatch=async req=>{await operator.execute('UPDATE service_actor SET active=0 WHERE tenant_id=? AND id=?',[tenant,fixture.actor]);try{return await original(req);}finally{await operator.execute('UPDATE service_actor SET active=1 WHERE tenant_id=? AND id=?',[tenant,fixture.actor]);}};
   try{await dispatcher.tick(tenant);}finally{peers.dispatch=original;}
   assert.equal((await jobs(row))[0].state,'aborted');assert.equal(String((await record(row)).owner_revision),'1');await dispatcher.tick(tenant);assert.equal(String((await record(row)).owner_revision),'2');
  });
  await check('Chat routing sync dispatch exact entry pin prevents stale queue assignment',async()=>{
   const row=await create(),original=peers.dispatch;let changed=false;
   peers.dispatch=async req=>{if(!changed){changed=true;const pin=req.payload.pin;await operator.execute("UPDATE routing_queue_entry SET state='cancelled',ended_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?",[tenant,pin.entry_id]);await operator.execute("INSERT INTO routing_queue_entry(tenant_id,id,work_id,queue_version_id,state) VALUES (?,?,?,?,'waiting')",[tenant,randomUUID(),pin.work_id,pin.queue_version_id]);}return original(req);};
   try{await dispatcher.tick(tenant);}finally{peers.dispatch=original;}
   assert.equal((await jobs(row))[0].state,'aborted');assert.equal(String((await record(row)).owner_revision),'1');await dispatcher.tick(tenant);assert.equal(String((await record(row)).owner_revision),'2');
  });
  await check('Chat routing sync dispatch lost confirmation ACK retains pending journal and reconciles once',async()=>{
   const row=await create(),original=ownershipPeers.confirm;let lost=false;
   ownershipPeers.confirm=async(...args)=>{await original(...args);if(!lost){lost=true;throw new OwnerError('DEPENDENCY_UNAVAILABLE');}};
   try{await dispatcher.tick(tenant);}finally{ownershipPeers.confirm=original;}
   assert.equal((await jobs(row))[0].state,'prepared');assert.equal(String((await record(row)).owner_revision),'2');const before=await effects(row);await dispatcher.tick(tenant);assert.equal((await jobs(row))[0].state,'committed');assert.deepEqual(await effects(row),before);
  });
 }finally{
  peers.dispatch=call;peers.proposal=call;
  for(const row of created)await chatOperator.execute("UPDATE conversation_acquisition_session SET status='closed',closed_at=COALESCE(closed_at,UTC_TIMESTAMP(6)),close_reason='agent_closed' WHERE tenant_id=? AND id=?",[tenant,row.session]);await sync.reconcile(tenant);
 }
}
