import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {once} from 'node:events';
import {readFile,writeFile} from 'node:fs/promises';
import {createPool,rootSQL} from './chat-native.mjs';
import {NativeRoutingConfiguration} from '../../services/core-baseline/dist/modules/agents/owner-config.js';
import {RoutingConfigurationBff,createRoutingConfigurationBff,routingConfigurationRecovery} from '../../services/core-baseline/dist/modules/agents/owner-config-bff.js';
import {NativeOwnerCapacity} from '../../services/core-baseline/dist/modules/agents/owner-capacity.js';
import {RoutingChannelReferences} from '../../services/core-baseline/dist/modules/channels/routing-reference.js';
import {HumanDispatchEnrollment} from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';
import {hash} from '../../services/core-baseline/dist/modules/identity/auth/security.js';
import {createWorkloadServer,ownerClient,OwnerError} from '../../packages/workload-transport/dist/index.js';

export async function routingConfigNative(ctx){
 const {check,operator,routingPool,tenant,other,f,ds,auth,authConfig,authority,identity,adminSession,login,drainingAuth,
  routingMaterial,identityMaterial,routingAuthority,transport,identityServer,chatServer,protocol,servers,setRecovery,grants,prepare,commands}=ctx;
 const path='.local/chat-ownership/routing-config-fixture.json';let fixture;
 try{fixture=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;fixture={tenant,database:'native_identity_test',team:randomUUID(),connection:randomUUID(),queue:randomUUID(),skillKey:'candidate_'+randomUUID().replaceAll('-',''),skillCommand:randomUUID(),password:randomBytes(32).toString('hex')};await writeFile(path,JSON.stringify(fixture),{flag:'wx',mode:0o600});}
 assert.equal(fixture.tenant,tenant);assert.equal(fixture.database,'native_identity_test');
 await operator.execute("INSERT INTO team(id,tenant_id,name,purpose,created_at,updated_at) VALUES (?,?,'Synthetic Routing config','chat',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[fixture.team,tenant]);
 await operator.execute("INSERT INTO channel_connection(id,tenant_id,provider,external_account_id,status,team_id) VALUES (?,?,'mock_messenger',?,'active',?) ON DUPLICATE KEY UPDATE id=id",[fixture.connection,tenant,fixture.connection,fixture.team]);
 rootSQL(`CREATE USER IF NOT EXISTS 'routing_config_channels_test'@'%' IDENTIFIED BY '${fixture.password}';\nGRANT SELECT ON native_identity_test.channel_connection TO 'routing_config_channels_test'@'%';`);
 // First authorized queue publication may enroll its dispatcher in Identity-owned tables.
 rootSQL("GRANT INSERT ON native_identity_test.`role` TO 'identity_owner_test_runtime'@'%';\nGRANT INSERT ON native_identity_test.service_actor TO 'identity_owner_test_runtime'@'%';");
 const channelsPool=createPool({host:'127.0.0.1',port:13306,database:'native_identity_test',user:'routing_config_channels_test',password:fixture.password});
 const channels=new RoutingChannelReferences(channelsPool);
 const chat=ownerClient(routingMaterial,routingAuthority,'chat',new URL(protocol+'//127.0.0.1:'+chatServer.address().port+'/'));
 let recoveryUnavailable=false;
 const capacity=new NativeOwnerCapacity(routingPool,(t,ref,abort)=>{if(recoveryUnavailable)throw new OwnerError('DEPENDENCY_UNAVAILABLE');return chat(t,abort?'command-abort':'command-proof',ref);});
 const config=new NativeRoutingConfiguration(routingPool,capacity);
 const recoveryServer=createWorkloadServer(routingMaterial,routingAuthority,routingConfigurationRecovery(config));servers.push(recoveryServer);recoveryServer.listen(0,'127.0.0.1');await once(recoveryServer,'listening');
 const recovery=ownerClient(identityMaterial,transport,'routing',new URL(protocol+'//127.0.0.1:'+recoveryServer.address().port+'/'));setRecovery(recovery);
 const client=ownerClient(routingMaterial,routingAuthority,'identity',new URL(protocol+'//127.0.0.1:'+identityServer.address().port+'/'));
 const [[gate]]=await operator.execute('SELECT state,barrier_command_id FROM routing_capacity_gate WHERE tenant_id=?',[tenant]);
 if(gate.state==='closing'){
  const [[pending]]=await operator.execute('SELECT binding_digest,binding_json,admission_id FROM routing_owner_command WHERE tenant_id=? AND command_id=?',[tenant,gate.barrier_command_id]);
  const binding=typeof pending?.binding_json==='string'?JSON.parse(pending.binding_json):pending?.binding_json;
  assert.equal(binding?.owner,'routing','Only native candidate commands may be recovered');assert([f.principal,f.adminPrincipal].includes(binding.actor.principal_id));
  const ref={command_id:gate.barrier_command_id,binding_digest:pending.binding_digest};await recovery(tenant,'command-abort',ref);
  if(pending.admission_id)await client(tenant,'settle',{owner:'routing',command:ref,admission_id:pending.admission_id});
 }
 let unavailable=false,lost=false;
 const adapter=new RoutingConfigurationBff(auth,new HumanDispatchEnrollment(ds),authority,config,async(...args)=>{
  if(unavailable)throw new OwnerError('DEPENDENCY_UNAVAILABLE');const result=await client(...args);
  if(lost&&args[1]==='settle'){lost=false;throw new OwnerError('DEPENDENCY_UNAVAILABLE');}return result;
 },(t,id)=>channels.connection(t,id));
 const server=createRoutingConfigurationBff(adapter);servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');
 const headers={'Content-Type':'application/json','X-Tenant-Id':tenant,Origin:authConfig.origin,'X-CSRF-Token':await auth.csrf(adminSession),Cookie:'crm_session='+adminSession};
 async function call(kind,body,version,key=randomUUID(),extra={}){const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/v1/human-routing/'+kind,{method:'POST',headers:{...headers,'Idempotency-Key':key,...(version===undefined?{}:{'If-Match':'"'+version+'"'}),...extra},body:JSON.stringify(body)});return {status:response.status,etag:response.headers.get('etag'),body:await response.json()};}
 const version=async(table,key,id)=>String((await operator.execute(`SELECT version FROM ${table} WHERE tenant_id=? AND ${key}=?`,[tenant,id]))[0][0]?.version??'0');
 const ok=response=>{assert.equal(response.status,200,response.body.error?.code);return response.body.data;};
 try{
  await check('Routing config public HTTP validates session CSRF current rights references and immutable replay',async()=>{
   const original=await version('routing_human_profile','principal_id',f.principal),body={principal_id:f.principal,capacity:1,enabled:true},key=randomUUID();
   assert.equal((await call('profiles',body,original,key,{'X-CSRF-Token':'invalid'})).status,403);
   assert.equal((await call('profiles',body,undefined)).status,428);
   const deniedSession=await login(f.account);
   assert.equal((await call('profiles',body,original,key,{Cookie:'crm_session='+deniedSession,'X-CSRF-Token':await auth.csrf(deniedSession)})).status,403);
   assert.equal((await call('profiles',body,original,key,{'X-Tenant-Id':other})).status,403);
   unavailable=true;try{assert.equal((await call('profiles',body,original,key)).status,503);}finally{unavailable=false;}
   assert.equal(await version('routing_human_profile','principal_id',f.principal),original);
   lost=true;assert.equal((await call('profiles',body,original,key)).status,503);
   const result=ok(await call('profiles',body,original,key));assert.equal(result.version,(BigInt(original)+1n).toString());
   const concurrent=await Promise.all([call('profiles',body,original,key),call('profiles',body,original,key)]);for(const r of concurrent)assert.deepEqual(ok(r),result);
   assert.equal((await call('profiles',{...body,capacity:2},original,key)).status,409);
   assert.equal((await call('profiles',body,original)).status,409);
   const invalidProfile=await call('profiles',{...body,principal_id:randomUUID()},'0');assert.equal(invalidProfile.status,422,invalidProfile.body.error?.code);
   const skill=ok(await call('skills',{key:fixture.skillKey,name:'Synthetic skill'},undefined,fixture.skillCommand));
   ok(await call('team-skills',{team_id:fixture.team,skill_ids:[skill.id]},await version('routing_team_skill','team_id',fixture.team)));
   assert.equal((await call('team-skills',{team_id:randomUUID(),skill_ids:[]},'0')).status,403);
   const queue={id:fixture.queue,name:'Synthetic queue',enabled:false,team_id:fixture.team,connection_id:fixture.connection,skill_ids:[skill.id],priority:1};
   assert.equal((await call('queues',{...queue,connection_id:randomUUID()},'0')).status,422);
   ok(await call('queues',queue,await version('routing_queue','id',fixture.queue)));
   for(const sql of ['SELECT id FROM principal LIMIT 1','SELECT id FROM test_crm_chat_owner.crm_record LIMIT 1'])await assert.rejects(routingPool.query(sql),e=>['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(e.code));
   await assert.rejects(channelsPool.query('SELECT id FROM principal LIMIT 1'),e=>e.code==='ER_TABLEACCESS_DENIED_ERROR');
  });
  await check('Routing config public capacity reduction drains native Chat reservation after outage and retry',async()=>{
   const ref=await prepare(),proof=await commands.proof(tenant,ref),session=proof.binding.session_id;
   const held=await capacity.reserve(tenant,ref,session);
   const original=await version('routing_human_profile','principal_id',f.principal),body={principal_id:f.principal,capacity:0,enabled:false},key=randomUUID();
   recoveryUnavailable=true;try{assert.equal((await call('profiles',body,original,key)).status,503);}finally{recoveryUnavailable=false;}
   assert.equal(await version('routing_human_profile','principal_id',f.principal),original);
   assert.equal((await commands.proof(tenant,ref)).state,'prepared');
   const result=ok(await call('profiles',body,original,key));
   assert.equal((await commands.proof(tenant,ref)).state,'aborted');
   assert.equal((await capacity.status(tenant,ref,session,held.reservation_id)).state,'released');
   ok(await call('profiles',{...body,capacity:1,enabled:true},result.version));
  });
  await check('Routing config native Identity role revoke drains prepared command before config commit',async()=>{
   const [[membership]]=await operator.execute('SELECT seat_code FROM membership WHERE tenant_id=? AND id=?',[tenant,f.member]);
   await operator.execute("UPDATE membership SET seat_code='admin' WHERE tenant_id=? AND id=?",[tenant,f.member]);
   const permitted=[...grants,{resource:'routing',action:'manage',scope:'all'}];
   let barrier=randomUUID();await identity.beginRoleChange(tenant,hash(adminSession),barrier,f.role,permitted);await identity.drainRoleChange(tenant,barrier);
   try{
    const session=await login(f.account),actor=await new HumanDispatchEnrollment(ds).enroll(tenant,hash(session));
    const original=await version('routing_human_profile','principal_id',f.principal),command=randomUUID();
    const prepared=await config.begin(tenant,command,f.principal,{kind:'profile',id:f.principal,expected_version:original,capacity:0,enabled:false},{kind:'human',principal_id:actor.principalId,delegation_id:actor.delegationId});
    const ref={command_id:command,binding_digest:prepared.binding_digest},admission=await client(tenant,'admit',{owner:'routing',command:ref});await config.admit(tenant,ref,admission);
    assert.equal((await recovery(tenant,'command-proof',ref)).state,'prepared');
    barrier=randomUUID();await identity.beginRoleChange(tenant,hash(adminSession),barrier,f.role,[]);await identity.drainRoleChange(tenant,barrier);
    assert.equal((await config.proof(tenant,ref)).state,'aborted');assert.deepEqual(await config.complete(tenant,command),{error:'REVOKED'});
    assert.equal(await version('routing_human_profile','principal_id',f.principal),original);
    assert.equal((await identity.read(tenant,ref,admission.admission_id,'routing')).state,'settled');
    assert.equal((await call('profiles',{principal_id:f.principal,capacity:1,enabled:true},original,randomUUID(),{Cookie:'crm_session='+session,'X-CSRF-Token':await auth.csrf(session)})).status,403);
   }finally{const restore=randomUUID();await identity.beginRoleChange(tenant,hash(adminSession),restore,f.role,grants);await identity.drainRoleChange(tenant,restore);await operator.execute('UPDATE membership SET seat_code=? WHERE tenant_id=? AND id=?',[membership.seat_code,tenant,f.member]);}
  });
  await check('Routing config native account logout drains Routing proof and blocks late commit',async()=>{
   const session=await login(f.adminAccount),actor=await new HumanDispatchEnrollment(ds).enroll(tenant,hash(session)),command=randomUUID();
   const original=await version('routing_human_profile','principal_id',f.principal);
   const prepared=await config.begin(tenant,command,actor.principalId,{kind:'profile',id:f.principal,expected_version:original,capacity:0,enabled:false},{kind:'human',principal_id:actor.principalId,delegation_id:actor.delegationId});
   const ref={command_id:command,binding_digest:prepared.binding_digest},admission=await client(tenant,'admit',{owner:'routing',command:ref});await config.admit(tenant,ref,admission);
   const csrf=await auth.csrf(session);await drainingAuth.logout(session,authConfig.origin,csrf);
   assert.equal((await config.proof(tenant,ref)).state,'aborted');assert.equal((await identity.read(tenant,ref,admission.admission_id,'routing')).state,'settled');
   assert.equal(await version('routing_human_profile','principal_id',f.principal),original);
   assert.equal((await call('profiles',{principal_id:f.principal,capacity:1,enabled:true},original,randomUUID(),{Cookie:'crm_session='+session,'X-CSRF-Token':csrf})).status,401);
  });
 }finally{await channelsPool.end();}
}
