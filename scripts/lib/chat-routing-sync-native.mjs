import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {once} from 'node:events';
import {ChatRoutingSource,chatRoutingSourceRoutes} from '../../services/chat/dist/routing-source.js';
import {NativeRoutingReconciliation} from '../../services/core-baseline/dist/modules/agents/owner-reconciliation.js';
import {NativeOwnerCapacity} from '../../services/core-baseline/dist/modules/agents/owner-capacity.js';
import {routingOwnerRoutes} from '../../services/core-baseline/dist/modules/agents/owner-http.js';
import {createWorkloadServer,ownerClient,ownerCommandClient,ownerDigest} from '../../packages/workload-transport/dist/index.js';
import {chatRoutingViewNative} from './chat-routing-view-native.mjs';
import {chatRoutingDispatchNative} from './chat-routing-dispatch-native.mjs';
import {chatRoutingRerouteNative} from './chat-routing-reroute-native.mjs';

export async function chatRoutingSyncNative(ctx){
 const {check,operator,chatOperator,chatPool,commands,other:tenant,f,identityClient,chatMaterial,routingMaterial,routingPool,routingAuthority,chatAuthority,protocol,servers,chatServer}=ctx;
 const path='.local/chat-ownership/routing-sync-fixture.json';let fixture;
 try{fixture=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;fixture=Object.fromEntries(['actor','role','policy','member','principal','queue','queueVersion','connection','team'].map(k=>[k,randomUUID()]));fixture.runs=[];await writeFile(path,JSON.stringify(fixture));}
 // Complete teardown of prior interrupted runs, retaining all synthetic history.
 // These sessions belong only to this sequential suite, not overflow/source fixtures.
 const priorSessions=fixture.runs.flatMap(run=>Object.values(run).map(row=>row.session));
 if(priorSessions.length)await chatOperator.execute(`UPDATE conversation_acquisition_session SET status='closed',closed_at=COALESCE(closed_at,UTC_TIMESTAMP(6)),close_reason='agent_closed' WHERE tenant_id=? AND status='active' AND id IN (${priorSessions.map(()=>'?').join(',')})`,[tenant,...priorSessions]);
 const permissions=[{resource:'conversation',action:'read',scope:'all'},{resource:'conversation',action:'assign',scope:'all'}];
 await operator.execute("INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,'t06_routing_sync_service','Synthetic routing sync',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[fixture.role,tenant,JSON.stringify(permissions)]);
 await operator.execute("INSERT INTO service_actor(id,tenant_id,`key`,role_id,created_at,updated_at) VALUES (?,?,'human_routing_dispatch',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[fixture.actor,tenant,fixture.role]);
 await operator.execute("INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,'owner_principal_id','[]',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[fixture.policy,tenant,fixture.role,f.otherObject]);
 await operator.execute("INSERT INTO membership(id,tenant_id,account_id,status,seat_code,created_at,updated_at) VALUES (?,?,?,'active','chat',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[fixture.member,tenant,f.adminAccount]);
 await operator.execute("INSERT INTO principal(id,tenant_id,kind,membership_id,status,created_at,updated_at) VALUES (?,?,'human',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[fixture.principal,tenant,fixture.member]);
 await operator.execute('INSERT INTO principal_role(tenant_id,principal_id,role_id) VALUES (?,?,?) ON DUPLICATE KEY UPDATE role_id=role_id',[tenant,fixture.principal,f.otherRole]);
 for(const principal of [f.otherPrincipal,fixture.principal])await operator.execute('INSERT INTO routing_human_profile(tenant_id,principal_id,capacity,enabled) VALUES (?,?,20,1) ON DUPLICATE KEY UPDATE principal_id=principal_id',[tenant,principal]);
 await operator.execute("INSERT INTO routing_queue(tenant_id,id,name,enabled,version) VALUES (?,?,'Synthetic sync queue',1,1) ON DUPLICATE KEY UPDATE id=id",[tenant,fixture.queue]);
 await operator.execute("INSERT INTO routing_queue_version(tenant_id,id,queue_id,version,team_id,connection_id,skill_ids,priority) VALUES (?,?,?,1,?,?,'[]',0) ON DUPLICATE KEY UPDATE id=id",[tenant,fixture.queueVersion,fixture.queue,fixture.team,fixture.connection]);
 const run={owned:{id:randomUUID(),session:randomUUID()},waiting:{id:randomUUID(),session:randomUUID()},transfer:{id:randomUUID(),session:randomUUID()}};fixture.runs.push(run);await writeFile(path,JSON.stringify(fixture));
 for(const [key,row] of Object.entries(run)){
  await chatOperator.execute("INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,version,owner_revision,custom_values,created_at,updated_at) VALUES (?,?,?,?,1,1,'{}',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[row.id,tenant,f.otherObject,key==='waiting'?null:f.otherPrincipal]);
  await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at) VALUES (?,?,?,?,?,'pending',UTC_TIMESTAMP(6))",[tenant,row.id,randomUUID(),randomUUID(),fixture.connection]);
  await chatOperator.execute('INSERT INTO chat_control_head(tenant_id,conversation_id,registry_revision,control_revision,cancel_through,pause_through,version,created_at,updated_at) VALUES (?,?,1,1,0,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[tenant,row.id]);
  await chatOperator.execute("INSERT INTO conversation_acquisition_session(tenant_id,id,conversation_id,sequence,status,opening_reason,opened_at,opening_occurred_at,source_classification,source_connection_id,policy_version) VALUES (?,?,?,1,'active','first_inbound',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'unknown',?,'conversation_acquisition_v1')",[tenant,row.session,row.id,fixture.connection]);
 }
 const peers={admit:(t,command)=>identityClient(t,'admit',{owner:'chat',command}),settle:(t,command,admission_id)=>identityClient(t,'settle',{owner:'chat',command,admission_id})};
 const source=new ChatRoutingSource(commands,peers),server=createWorkloadServer(chatMaterial,chatAuthority,chatRoutingSourceRoutes(source));servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');
 const call=ownerCommandClient(routingMaterial,routingAuthority,'chat',new URL(protocol+'//127.0.0.1:'+server.address().port+'/'));
 const request=query=>({schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,operation:'routing-sync-snapshot',command_id:randomUUID(),actor:{kind:'service',principal_id:fixture.actor,delegation_id:fixture.actor},payload:query});
 const query={principal_ids:[f.otherPrincipal,fixture.principal],connection_ids:[fixture.connection],all_channels:false,known_session_ids:[]},bad=(p,code)=>assert.rejects(p,e=>e.code===code);
 let hook;const sync=new NativeRoutingReconciliation(routingPool,async(t,q)=>hook?hook(t,q):call({...request(q),tenant_id:t}));
 // Reconcile retained failed reroute test reservations from authoritative proof;
 // never force release or reset synthetic history between runs.
 if(process.argv.includes('--with-reroute')){
  const proof=ownerClient(routingMaterial,routingAuthority,'chat',new URL(protocol+'//127.0.0.1:'+chatServer.address().port+'/'));
  const capacity=new NativeOwnerCapacity(routingPool,(t,ref,abort)=>proof(t,abort?'command-abort':'command-proof',ref));
  const [pending]=await operator.execute("SELECT r.* FROM routing_capacity_reservation r JOIN routing_owner_command j ON j.tenant_id=r.tenant_id AND j.command_id=r.command_id WHERE r.tenant_id=? AND r.state='reserved' AND j.operation='reroute'",[tenant]);
  for(const r of pending){const ref={command_id:r.command_id,binding_digest:r.binding_digest},terminal=await proof(tenant,'command-proof',ref);if(terminal.state!=='prepared')await capacity.settle(tenant,ref,r.session_id,r.id,terminal.state==='aborted');}
 }
 const counts=async()=>{const [[row]]=await operator.execute('SELECT (SELECT COUNT(*) FROM routing_human_allocation WHERE tenant_id=?) allocations,(SELECT COUNT(*) FROM routing_assignment_attempt WHERE tenant_id=?) attempts,(SELECT COUNT(*) FROM routing_queue_entry WHERE tenant_id=?) entries',[tenant,tenant,tenant]);return row;};
 const snapshotKnown=async()=>{const [known]=await operator.execute("SELECT session_id FROM routing_work_item WHERE tenant_id=? AND state<>'completed' ORDER BY id",[tenant]);return call(request({...query,known_session_ids:known.map(w=>w.session_id)}));};
 const restore=async(sql,args,undo,undoArgs,work)=>{await operator.execute(sql,args);try{await work();}finally{await operator.execute(undo,undoArgs);}};
 try{
  await check('Chat routing sync native service snapshot retains active pending and missing explicit',async()=>{
   const result=await call(request(query));for(const row of Object.values(run))assert(result.sessions.some(s=>s.session_id===row.session&&s.status==='active'));
   assert.equal(result.snapshot_digest,ownerDigest({sessions:result.sessions,missing:result.missing}));
   const missing=randomUUID();assert.deepEqual((await call(request({...query,known_session_ids:[missing]}))).missing,[missing]);
   assert(!JSON.stringify(result).includes('contact_id'));await assert.rejects(routingPool.query('SELECT id FROM message LIMIT 1'));await assert.rejects(chatPool.query('SELECT principal_id FROM routing_human_profile LIMIT 1'));
  });
  await check('Chat routing sync current service field and tenant authority',async()=>{
   await bad(call({...request(query),tenant_id:ctx.tenant}),'FORBIDDEN');await bad(call({...request(query),actor:{kind:'human',principal_id:fixture.actor,delegation_id:fixture.actor}}),'FORBIDDEN');
   await restore('UPDATE service_actor SET active=0 WHERE tenant_id=? AND id=?',[tenant,fixture.actor],'UPDATE service_actor SET active=1 WHERE tenant_id=? AND id=?',[tenant,fixture.actor],()=>bad(call(request(query)),'FORBIDDEN'));
   await restore("UPDATE `role` SET permissions='[]' WHERE tenant_id=? AND id=?",[tenant,fixture.role],'UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(permissions),tenant,fixture.role],()=>bad(call(request(query)),'FORBIDDEN'));
   await restore("UPDATE field_policy SET denied_actions='[\"read\"]' WHERE tenant_id=? AND id=?",[tenant,fixture.policy],"UPDATE field_policy SET denied_actions='[]' WHERE tenant_id=? AND id=?",[tenant,fixture.policy],()=>bad(call(request(query)),'FORBIDDEN'));
  });
  await check('Chat routing sync source CAS catches owner change during admission',async()=>{
   const old=peers.admit;peers.admit=async(...args)=>{const result=await old(...args);await chatOperator.execute('UPDATE crm_record SET owner_revision=owner_revision+1,version=version+1 WHERE tenant_id=? AND id=?',[tenant,run.owned.id]);return result;};
   try{await bad(call(request(query)),'STALE_VERSION');}finally{peers.admit=old;}
  });
  await check('Chat routing sync creates own work allocation and queue then repeats without duplicates',async()=>{
   const failingPool={getConnection:async()=>{const connection=await routingPool.getConnection();return new Proxy(connection,{get(target,key){if(key==='execute')return async(sql,...args)=>{if(sql.startsWith('INSERT INTO routing_human_allocation'))throw new Error('SYNTHETIC_ALLOCATION_FAILURE');return target.execute(sql,...args);};const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});}};
   const failing=new NativeRoutingReconciliation(failingPool,(t,q)=>call({...request(q),tenant_id:t})),unchanged=await counts();
   await assert.rejects(failing.reconcile(tenant),/SYNTHETIC_ALLOCATION_FAILURE/);assert.deepEqual(await counts(),unchanged);
   const result=await sync.reconcile(tenant);assert(result.applied>=3);const before=await counts();await sync.reconcile(tenant);assert.deepEqual(await counts(),before);
   const [[waiting]]=await operator.execute("SELECT w.id,w.state,e.queue_version_id FROM routing_work_item w JOIN routing_queue_entry e ON e.tenant_id=w.tenant_id AND e.active_work_id=w.id WHERE w.tenant_id=? AND w.session_id=?",[tenant,run.waiting.session]);assert.equal(waiting.state,'waiting');assert.equal(waiting.queue_version_id,fixture.queueVersion);
   const [[allocated]]=await operator.execute('SELECT COUNT(*) n FROM routing_human_allocation a JOIN routing_work_item w ON w.tenant_id=a.tenant_id AND w.id=a.work_id WHERE a.tenant_id=? AND w.session_id IN (?,?) AND a.released_at IS NULL',[tenant,run.owned.session,run.transfer.session]);assert.equal(Number(allocated.n),2);
  });
  await check('Chat routing sync configuration race and missing source preserve local effects',async()=>{
   const before=await counts();hook=async(t,q)=>{const result=await call(request(q));await operator.execute('UPDATE routing_human_profile SET version=version+1 WHERE tenant_id=? AND principal_id=?',[tenant,f.otherPrincipal]);return result;};
   try{await bad(sync.reconcile(tenant),'STALE_VERSION');}finally{hook=null;}assert.deepEqual(await counts(),before);
   hook=async(t,q)=>{const result=await call(request(q));result.sessions=result.sessions.filter(r=>r.session_id!==run.owned.session);result.missing.push(run.owned.session);result.snapshot_digest=ownerDigest({sessions:result.sessions,missing:result.missing});return result;};
   try{await bad(sync.reconcile(tenant),'REFERENCE_INVALID');}finally{hook=null;}assert.deepEqual(await counts(),before);
  });
  await check('Chat routing sync transfer closes previous allocation and retains event time',async()=>{
   const stale=await snapshotKnown();
   await chatOperator.execute('UPDATE crm_record SET owner_principal_id=?,owner_revision=owner_revision+1,version=version+1 WHERE tenant_id=? AND id=?',[fixture.principal,tenant,run.transfer.id]);
   await sync.reconcile(tenant);
   const [rows]=await operator.execute('SELECT a.* FROM routing_human_allocation a JOIN routing_work_item w ON w.tenant_id=a.tenant_id AND w.id=a.work_id WHERE a.tenant_id=? AND w.session_id=?',[tenant,run.transfer.session]);assert.equal(rows.length,2);assert.equal(rows.find(r=>r.principal_id===f.otherPrincipal).release_reason,'transferred');assert.equal(rows.find(r=>r.principal_id===fixture.principal).released_at,null);
   const before=await counts();await sync.reconcile(tenant);assert.deepEqual(await counts(),before);
   hook=async()=>stale;try{await sync.reconcile(tenant);}finally{hook=null;}assert.deepEqual(await counts(),before);
  });
  await check('Chat routing sync reservation remains pending until real terminal proof confirms',async()=>{
   const proof=ownerClient(routingMaterial,routingAuthority,'chat',new URL(protocol+'//127.0.0.1:'+chatServer.address().port+'/'));
   const capacity=new NativeOwnerCapacity(routingPool,(t,ref)=>proof(t,'command-proof',ref)),capacityServer=createWorkloadServer(routingMaterial,routingAuthority,routingOwnerRoutes(capacity));servers.push(capacityServer);capacityServer.listen(0,'127.0.0.1');await once(capacityServer,'listening');
   const reserve=ownerClient(chatMaterial,chatAuthority,'routing',new URL(protocol+'//127.0.0.1:'+capacityServer.address().port+'/'));
   const [[record]]=await chatOperator.execute('SELECT version,owner_revision FROM crm_record WHERE tenant_id=? AND id=?',[tenant,run.owned.id]);
   const payload={purpose:'synthetic-sync-confirm-boundary'},b={tenant_id:tenant,command_id:randomUUID(),owner:'chat',operation:'routing-assignment',actor:request(query).actor,resource:{resource_id:run.owned.id,object_key:'conversation',record_version:String(record.version),owner_revision:String(record.owner_revision),control_revision:'1',owner_principal_id:f.otherPrincipal,team_id:null,shared_team_ids:[],archived:false},target:{principal_id:fixture.principal,kind:'human',team_id:null},session_id:run.owned.session,fields:['owner_principal_id','team_id'],payload_digest:ownerDigest(payload),legacy_receipt_key:randomUUID(),graph:null,dependencies:[]};
   const prepared=await commands.prepare(b,payload),ref={command_id:b.command_id,binding_digest:prepared.binding_digest},r=await reserve(tenant,'capacity-reserve',{command:ref,session_id:b.session_id,reservation_id:null});
   assert((await sync.reconcile(tenant)).pending>=1);
   const admission=await peers.admit(tenant,ref);
   await commands.commit(tenant,ref,admission.admission_id,async c=>{await c.execute('UPDATE crm_record SET owner_principal_id=?,owner_revision=owner_revision+1,version=version+1 WHERE tenant_id=? AND id=?',[fixture.principal,tenant,run.owned.id]);return {effect_id:run.owned.id,effect_revision:String(BigInt(record.version)+1n)};});await peers.settle(tenant,ref,admission.admission_id);
   assert((await sync.reconcile(tenant)).pending>=1);
   await reserve(tenant,'capacity-confirm',{command:ref,session_id:b.session_id,reservation_id:r.reservation_id});
   await sync.reconcile(tenant);const before=await counts();await reserve(tenant,'capacity-confirm',{command:ref,session_id:b.session_id,reservation_id:r.reservation_id});await sync.reconcile(tenant);assert.deepEqual(await counts(),before);
  });
  await check('Chat routing sync closed work cannot revive from stale source replay',async()=>{
   const stale=await snapshotKnown();
   await chatOperator.execute("UPDATE conversation_acquisition_session SET status='closed',closed_at=UTC_TIMESTAMP(6),close_reason='agent_closed' WHERE tenant_id=? AND id=?",[tenant,run.transfer.session]);await sync.reconcile(tenant);
   hook=async()=>stale;try{await sync.reconcile(tenant);}finally{hook=null;}
   const [[work]]=await operator.execute('SELECT state FROM routing_work_item WHERE tenant_id=? AND session_id=?',[tenant,run.transfer.session]);assert.equal(work.state,'completed');
   const [[count]]=await operator.execute('SELECT COUNT(*) n FROM routing_human_allocation a JOIN routing_work_item w ON w.tenant_id=a.tenant_id AND w.id=a.work_id WHERE a.tenant_id=? AND w.session_id=? AND a.released_at IS NULL',[tenant,run.transfer.session]);assert.equal(Number(count.n),0);
  });
  await check('Chat routing sync actual source outage never releases work',async()=>{
   const before=await counts(),port=server.address().port;await new Promise(resolve=>server.close(resolve));try{await bad(sync.reconcile(tenant),'DEPENDENCY_UNAVAILABLE');}finally{server.listen(port,'127.0.0.1');await once(server,'listening');}assert.deepEqual(await counts(),before);
  });
  await check('Chat routing sync closing local capacity gate blocks reconciliation',async()=>{
   const before=await counts();await restore("UPDATE routing_capacity_gate SET state='closing' WHERE tenant_id=?",[tenant],"UPDATE routing_capacity_gate SET state='open' WHERE tenant_id=?",[tenant],()=>bad(sync.reconcile(tenant),'REVOKED'));assert.deepEqual(await counts(),before);
  });
  await check('Chat routing sync active discovery overflow and complete known500 response',async()=>{
   if(!fixture.overflow){fixture.overflow={connection:randomUUID(),rows:Array.from({length:501},()=>({id:randomUUID(),session:randomUUID()}))};await writeFile(path,JSON.stringify(fixture));}
   const c=await chatOperator.getConnection();try{
    await c.beginTransaction();for(const row of fixture.overflow.rows){
     await c.execute("INSERT INTO crm_record(id,tenant_id,object_type_id,version,owner_revision,custom_values,created_at,updated_at) VALUES (?,?,?,1,1,'{}',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[row.id,tenant,f.otherObject]);
     await c.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at) VALUES (?,?,?,?,?,'open',UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE record_id=record_id",[tenant,row.id,randomUUID(),randomUUID(),fixture.overflow.connection]);
     await c.execute("INSERT INTO conversation_acquisition_session(tenant_id,id,conversation_id,sequence,status,opening_reason,opened_at,opening_occurred_at,source_classification,source_connection_id,policy_version) VALUES (?,?,?,1,'active','first_inbound',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'unknown',?,'conversation_acquisition_v1') ON DUPLICATE KEY UPDATE id=id",[tenant,row.session,row.id,fixture.overflow.connection]);
    }await c.commit();
   }catch(e){await c.rollback();throw e;}finally{c.release();}
   await bad(call(request({principal_ids:[],connection_ids:[fixture.overflow.connection],all_channels:false,known_session_ids:[]})),'LIMIT_EXCEEDED');
   const result=await call(request({principal_ids:[],connection_ids:[],all_channels:false,known_session_ids:fixture.overflow.rows.slice(0,500).map(r=>r.session)}));assert.equal(result.sessions.length,500);assert.equal(result.missing.length,0);
  });
  if(process.argv.includes('--with-view'))await chatRoutingViewNative({...ctx,fixture,run,sync});
  if(process.argv.includes('--with-dispatch'))await chatRoutingDispatchNative({...ctx,fixture,run,sync});
  if(process.argv.includes('--with-reroute'))await chatRoutingRerouteNative({...ctx,fixture,run,sync});
 }finally{
  for(const row of Object.values(run))await chatOperator.execute("UPDATE conversation_acquisition_session SET status='closed',closed_at=COALESCE(closed_at,UTC_TIMESTAMP(6)),close_reason='agent_closed' WHERE tenant_id=? AND id=?",[tenant,row.session]);
  hook=null;await sync.reconcile(tenant);
 }
}
