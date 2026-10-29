import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {once} from 'node:events';
import {ChatAssignmentDirectory,chatAssignmentDirectoryRoutes} from '../../services/chat/dist/assignment-directory.js';
import {NativeAssignmentCapacity,assignmentCapacityRoutes} from '../../services/core-baseline/dist/modules/agents/owner-directory.js';
import {ChatOwnershipBff,createChatOwnershipBff} from '../../services/core-baseline/dist/modules/agents/owner-bff.js';
import {HumanDispatchEnrollment} from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';
import {createWorkloadServer,ownerClient,ownerCommandClient,remoteRegistryAuthority} from '../../packages/workload-transport/dist/index.js';

export async function chatAssignmentDirectoryNative(ctx){
 const {check,operator,chatOperator,commands,tenant,other,f,enrollment,identityClient,chatMaterial,bffMaterial,routingMaterial,routingPool,routingAuthority,chatAuthority,registryConfig,protocol,servers}=ctx;
 const fixturePath='.local/chat-ownership/assignment-directory-fixture.json';let fixture;
 try{fixture=JSON.parse(await readFile(fixturePath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;fixture={id:randomUUID(),team:randomUUID(),foreign:randomUUID(),overflow:Array.from({length:201},()=>randomUUID())};await writeFile(fixturePath,JSON.stringify(fixture));}
 const {id,team,foreign}=fixture;
 if(!fixture.load){fixture.load={id:randomUUID(),command:randomUUID(),session:randomUUID()};await writeFile(fixturePath,JSON.stringify(fixture));}
 await chatOperator.execute("INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,version,owner_revision,custom_values,created_at,updated_at) VALUES (?,?,?,?,1,1,'{}',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[id,tenant,f.object,f.adminPrincipal]);
 await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at) VALUES (?,?,?,?,?,'open',UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE record_id=record_id",[tenant,id,randomUUID(),randomUUID(),randomUUID()]);
 await chatOperator.execute('INSERT INTO chat_control_head(tenant_id,conversation_id,registry_revision,control_revision,cancel_through,pause_through,version,created_at,updated_at) VALUES (?,?,1,1,0,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE conversation_id=conversation_id',[tenant,id]);
 for(const [t,tid] of [[tenant,team],[other,foreign]])await operator.execute("INSERT INTO team(id,tenant_id,name,purpose,active,created_at,updated_at) VALUES (?,?,'Synthetic directory team','chat',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[tid,t]);
 await operator.execute('INSERT INTO team_member(tenant_id,team_id,principal_id,active) VALUES (?,?,?,1) ON DUPLICATE KEY UPDATE active=1',[tenant,team,f.principal]);
 await operator.execute('INSERT INTO team_member(tenant_id,team_id,principal_id,active) VALUES (?,?,?,1) ON DUPLICATE KEY UPDATE active=1',[tenant,team,f.aiPrincipal]);
 await chatOperator.execute('UPDATE crm_record SET team_id=? WHERE tenant_id=? AND id=?',[team,tenant,id]);
 const identityUrl=new URL(registryConfig.url);identityUrl.pathname='/';
 const routingIdentity=ownerClient(routingMaterial,routingAuthority,'identity',identityUrl);
 const capacity=new NativeAssignmentCapacity(routingPool,(t,command,admission_id)=>routingIdentity(t,'admission-assignment-directory',{command,admission_id}));
 const capacityServer=createWorkloadServer(routingMaterial,routingAuthority,assignmentCapacityRoutes(capacity));servers.push(capacityServer);capacityServer.listen(0,'127.0.0.1');await once(capacityServer,'listening');
 const routing=ownerClient(chatMaterial,chatAuthority,'routing',new URL(protocol+'//127.0.0.1:'+capacityServer.address().port+'/'));
 const peers={admit:(t,command)=>identityClient(t,'admit',{owner:'chat',command}),settle:(t,command,admission_id)=>identityClient(t,'settle',{owner:'chat',command,admission_id}),directory:(t,command,admission_id)=>identityClient(t,'admission-assignment-directory',{command,admission_id}),capacity:(t,command,admission_id)=>routing(t,'assignment-directory-capacity',{command,admission_id})};
 const directory=new ChatAssignmentDirectory(commands,peers),server=createWorkloadServer(chatMaterial,chatAuthority,chatAssignmentDirectoryRoutes(directory));servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');
 const call=ownerCommandClient(bffMaterial,remoteRegistryAuthority(bffMaterial,registryConfig),'chat',new URL(protocol+'//127.0.0.1:'+server.address().port+'/'));
 const request=(teams=false,selected)=>({schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,operation:teams?'conversation-classification-get-records-id-assignment-teams':'routing-targets',command_id:randomUUID(),actor:{kind:'human',principal_id:f.principal,delegation_id:enrollment.delegationId},payload:{id,...(selected!==undefined?{team_id:selected}:{})}});
 const bad=(promise,code)=>assert.rejects(promise,e=>e.code===code),reason=async()=>{const row=(await call(request(false,team))).data.find(p=>p.id===f.principal);assert(row);return row.reason;};
 const restore=async(sql,args,undo,undoArgs,work)=>{await operator.execute(sql,args);try{await work();}finally{await operator.execute(undo,undoArgs);}};
 await check('Chat directory native owner HTTP and deferred AI preserve public fields',async()=>{
  const result=await call(request());assert(result.data.some(p=>p.id===f.principal));assert.deepEqual(result.data.find(p=>p.id===f.aiPrincipal),{id:f.aiPrincipal,kind:'ai',eligible:false,reason:'policy'});assert(!JSON.stringify(result).includes('permissions'));
  assert((await call(request(true))).data.some(t=>t.id===team&&t.purpose==='chat'));
  assert.deepEqual((await call(request(false,team))).data.map(p=>p.id),[f.principal,f.aiPrincipal].sort());
  await assert.rejects(routingPool.query('SELECT id FROM principal LIMIT 1'));await assert.rejects(ctx.chatPool.query('SELECT id FROM principal LIMIT 1'));
 });
 await check('Chat directory active and foreign team and tenant boundaries',async()=>{
  await bad(call(request(false,foreign)),'REFERENCE_INVALID');await bad(call({...request(),tenant_id:other}),'NOT_FOUND');await bad(call({...request(),actor:{...request().actor,kind:'service'}}),'FORBIDDEN');
  await restore('UPDATE team SET active=0 WHERE tenant_id=? AND id=?',[tenant,team],'UPDATE team SET active=1 WHERE tenant_id=? AND id=?',[tenant,team],async()=>{await bad(call(request(false,team)),'REFERENCE_INVALID');assert(!(await call(request(true))).data.some(t=>t.id===team));});
 });
 await check('Chat directory Human availability seat role and field eligibility',async()=>{
  const [[principal]]=await operator.execute('SELECT availability FROM principal WHERE tenant_id=? AND id=?',[tenant,f.principal]);
  await restore("UPDATE principal SET availability='unavailable' WHERE tenant_id=? AND id=?",[tenant,f.principal],'UPDATE principal SET availability=? WHERE tenant_id=? AND id=?',[principal.availability,tenant,f.principal],async()=>assert.equal(await reason(),'unavailable'));
  const [[member]]=await operator.execute('SELECT seat_code FROM membership WHERE tenant_id=? AND id=?',[tenant,f.member]);
  // Read as admin while evaluating the ordinary Human candidate's seat.
  const old=request().actor,adminEnrollment=await new HumanDispatchEnrollment(ctx.ds).enroll(tenant,(await import('../../services/core-baseline/dist/modules/identity/auth/security.js')).hash(await ctx.login(f.adminAccount)));
  await restore("UPDATE membership SET seat_code='viewer' WHERE tenant_id=? AND id=?",[tenant,f.member],'UPDATE membership SET seat_code=? WHERE tenant_id=? AND id=?',[member.seat_code,tenant,f.member],async()=>{const req=request(false,team);req.actor={...old,principal_id:f.adminPrincipal,delegation_id:adminEnrollment.delegationId};assert.equal((await call(req)).data.find(p=>p.id===f.principal).reason,'capability');});
  const [[role]]=await operator.execute('SELECT permissions FROM `role` WHERE tenant_id=? AND id=?',[tenant,f.role]),grants=typeof role.permissions==='string'?JSON.parse(role.permissions):role.permissions;
  await restore('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants.filter(g=>g.action!=='reply')),tenant,f.role],'UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants),tenant,f.role],async()=>assert.equal(await reason(),'role'));
  const [[policy]]=await operator.execute('SELECT denied_actions FROM field_policy WHERE tenant_id=? AND id=?',[tenant,f.policy]);
  await restore("UPDATE field_policy SET denied_actions='[\"write\"]' WHERE tenant_id=? AND id=?",[tenant,f.policy],'UPDATE field_policy SET denied_actions=? WHERE tenant_id=? AND id=?',[JSON.stringify(typeof policy.denied_actions==='string'?JSON.parse(policy.denied_actions):policy.denied_actions),tenant,f.policy],async()=>assert.equal(await reason(),'field'));
 });
 await check('Chat directory scoped read and assign or takeover rights',async()=>{
  const [[role]]=await operator.execute('SELECT permissions FROM `role` WHERE tenant_id=? AND id=?',[tenant,f.role]),grants=typeof role.permissions==='string'?JSON.parse(role.permissions):role.permissions;
  for(const actions of [['assign'],['assign','takeover'],['read']])await restore('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants.filter(g=>g.resource!=='conversation'||!actions.includes(g.action))),tenant,f.role],'UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants),tenant,f.role],async()=>{if(actions.length===1&&actions[0]==='assign')await call(request());else await bad(call(request()),actions[0]==='read'?'NOT_FOUND':'FORBIDDEN');});
  await restore('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants.map(g=>g.resource==='conversation'&&g.action==='read'?{...g,scope:'own'}:g)),tenant,f.role],'UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants),tenant,f.role],async()=>bad(call(request()),'NOT_FOUND'));
 });
 await check('Chat directory reserved managed work contributes to current capacity load',async()=>{
  const [[profile]]=await operator.execute('SELECT enabled,capacity FROM routing_human_profile WHERE tenant_id=? AND principal_id=?',[tenant,f.principal]);
  await operator.execute('UPDATE routing_human_profile SET enabled=1,capacity=1 WHERE tenant_id=? AND principal_id=?',[tenant,f.principal]);
  const load=fixture.load;
  try{
   await operator.execute("INSERT INTO routing_capacity_reservation(tenant_id,id,command_id,binding_digest,conversation_id,session_id,principal_id,queue_id,queue_version,profile_version,owner_revision,mode,state,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,NULL,0,1,1,'managed','reserved',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE state='reserved'",[tenant,load.id,load.command,'0'.repeat(64),id,load.session,f.principal]);
   assert.equal(await reason(),'capacity');
  }finally{
   await operator.execute("UPDATE routing_capacity_reservation SET state='released' WHERE tenant_id=? AND id=?",[tenant,load.id]);
   await operator.execute('UPDATE routing_human_profile SET enabled=?,capacity=? WHERE tenant_id=? AND principal_id=?',[profile.enabled,profile.capacity,tenant,f.principal]);
  }
 });
 await check('Chat directory capacity profile and current owner exception',async()=>{
  await operator.execute('INSERT INTO routing_human_profile(tenant_id,principal_id,capacity,enabled) VALUES (?,?,1,1) ON DUPLICATE KEY UPDATE principal_id=principal_id',[tenant,f.principal]);
  const [[profile]]=await operator.execute('SELECT enabled FROM routing_human_profile WHERE tenant_id=? AND principal_id=?',[tenant,f.principal]);
  await restore('UPDATE routing_human_profile SET enabled=0 WHERE tenant_id=? AND principal_id=?',[tenant,f.principal],'UPDATE routing_human_profile SET enabled=? WHERE tenant_id=? AND principal_id=?',[profile.enabled,tenant,f.principal],async()=>{assert.equal(await reason(),'capacity');await chatOperator.execute('UPDATE crm_record SET owner_principal_id=? WHERE tenant_id=? AND id=?',[f.principal,tenant,id]);try{assert.equal(await reason(),null);}finally{await chatOperator.execute('UPDATE crm_record SET owner_principal_id=? WHERE tenant_id=? AND id=?',[f.adminPrincipal,tenant,id]);}});
 });
 await check('Chat directory final Identity drift and Chat resource CAS deny disclosure',async()=>{
  const original=peers.directory;let calls=0;
  peers.directory=async(...args)=>{const result=await original(...args);if(++calls===2)await chatOperator.execute('UPDATE crm_record SET version=version+1 WHERE tenant_id=? AND id=?',[tenant,id]);return result;};
  try{await bad(call(request()),'STALE_VERSION');}finally{peers.directory=original;}
  peers.directory=async(...args)=>{const result=await original(...args);if(++calls===2)result.candidates=[];return result;};calls=0;
  try{await bad(call(request()),'STALE_VERSION');}finally{peers.directory=original;}
 });
 await check('Chat directory actual Routing outage and gate closing fail closed',async()=>{
  const port=capacityServer.address().port;await new Promise(resolve=>capacityServer.close(resolve));await bad(call(request()),'DEPENDENCY_UNAVAILABLE');capacityServer.listen(port,'127.0.0.1');await once(capacityServer,'listening');
  await restore("UPDATE routing_capacity_gate SET state='closing' WHERE tenant_id=?",[tenant],"UPDATE routing_capacity_gate SET state='open' WHERE tenant_id=?",[tenant],async()=>bad(call(request()),'REVOKED'));
  await call(request());
 });
 await check('Chat directory public session and strict query validation',async()=>{
  const bff=createChatOwnershipBff(new ChatOwnershipBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),call));servers.push(bff);bff.listen(0,'127.0.0.1');await once(bff,'listening');
  const url='http://127.0.0.1:'+bff.address().port+'/api/v1/records/'+id+'/assignment-',headers={'x-tenant-id':tenant,cookie:'crm_session='+ctx.actorSession};
  assert.equal((await fetch(url+'targets?team_id='+team,{headers})).status,200);
  assert.equal((await fetch(url+'teams',{headers})).status,200);
  assert.equal((await fetch(url+'targets',{headers:{'x-tenant-id':tenant}})).status,401);
  for(const suffix of ['teams?team_id='+team,'targets?team_id=bad','targets?team_id='+team+'&team_id='+team,'targets?unexpected=1'])assert.equal((await fetch(url+suffix,{headers})).status,400);
 });
 await check('Chat directory bounded active team directory never truncates',async()=>{
  try{
   for(const tid of fixture.overflow)await operator.execute("INSERT INTO team(id,tenant_id,name,purpose,active,created_at,updated_at) VALUES (?,?,'Synthetic directory overflow','chat',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE active=1",[tid,tenant]);
   await bad(call(request(true)),'LIMIT_EXCEEDED');
  }finally{for(const tid of fixture.overflow)await operator.execute('UPDATE team SET active=0 WHERE tenant_id=? AND id=?',[tenant,tid]);}
  await call(request(true));
 });
 await check('Chat directory candidate limit uses bounded batch and retained synthetic members',async()=>{
  if(!fixture.candidates){fixture.candidates=Array.from({length:201},()=>({account:randomUUID(),member:randomUUID(),principal:randomUUID()}));fixture.candidateTeam=randomUUID();await writeFile(fixturePath,JSON.stringify(fixture));}
  await operator.execute("INSERT INTO team(id,tenant_id,name,purpose,active,created_at,updated_at) VALUES (?,?,'Synthetic directory candidate limit','chat',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE active=1",[fixture.candidateTeam,tenant]);
  const c=await operator.getConnection();
  try{
   await c.beginTransaction();
   for(const p of fixture.candidates){
    await c.execute("INSERT INTO account(id,issuer,subject,display_name,created_at,updated_at) VALUES (?,'urn:synthetic:directory',?,'Synthetic bounded member',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[p.account,p.account]);
    await c.execute("INSERT INTO membership(id,tenant_id,account_id,status,seat_code,created_at,updated_at) VALUES (?,?,?,'suspended','viewer',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[p.member,tenant,p.account]);
    await c.execute("INSERT INTO principal(id,tenant_id,kind,membership_id,status,created_at,updated_at) VALUES (?,?,'human',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[p.principal,tenant,p.member]);
    await c.execute('INSERT INTO team_member(tenant_id,team_id,principal_id,active) VALUES (?,?,?,1) ON DUPLICATE KEY UPDATE active=1',[tenant,fixture.candidateTeam,p.principal]);
   }
   await c.commit();
  }catch(e){await c.rollback();throw e;}finally{c.release();}
  try{
   await bad(call(request(false,fixture.candidateTeam)),'LIMIT_EXCEEDED');
   await operator.execute('UPDATE team_member SET active=0 WHERE tenant_id=? AND team_id=? AND principal_id=?',[tenant,fixture.candidateTeam,fixture.candidates[0].principal]);
   const result=await call(request(false,fixture.candidateTeam));assert.equal(result.data.length,200);assert(result.data.every(p=>p.reason==='unavailable'));
  }finally{await operator.execute('UPDATE team SET active=0 WHERE tenant_id=? AND id=?',[tenant,fixture.candidateTeam]);}
 });
 await check('Chat directory native completed logout aborts admitted read',async()=>{
  const original=peers.capacity;
  peers.capacity=async(...args)=>{const result=await original(...args);const csrf=await ctx.auth.csrf(ctx.actorSession);await ctx.drainingAuth.logout(ctx.actorSession,'http://localhost:18080',csrf);return result;};
  try{await assert.rejects(call(request()),e=>['REVOKED','FORBIDDEN','INVALID_TRANSITION'].includes(e.code));}finally{peers.capacity=original;}
 });
}
