import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {once} from 'node:events';
import {createPool} from './chat-native.mjs';
import {NativeRoutingViewStorage} from '../../services/core-baseline/dist/modules/agents/owner-view-storage.js';
import {NativeRoutingView,routingViewRecoveryRoutes} from '../../services/core-baseline/dist/modules/agents/owner-view.js';
import {RoutingViewBff,createRoutingViewBff} from '../../services/core-baseline/dist/modules/agents/owner-view-bff.js';
import {NativeRoutingConfiguration} from '../../services/core-baseline/dist/modules/agents/owner-config.js';
import {NativeRoutingConnections,routingConnectionRoutes} from '../../services/core-baseline/dist/modules/channels/owner-routing-view.js';
import {ChatRoutingView,chatRoutingViewRoutes} from '../../services/chat/dist/routing-view.js';
import {HumanDispatchEnrollment} from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';
import {hash} from '../../services/core-baseline/dist/modules/identity/auth/security.js';
import {createWorkloadServer,ownerClient,remoteRegistryAuthority} from '../../packages/workload-transport/dist/index.js';

export async function chatRoutingViewNative(ctx){
 const {check,operator,chatOperator,commands,f,fixture,run,sync,routingPool,routingMaterial,routingAuthority,chatMaterial,chatAuthority,connectorMaterial,registryConfig,protocol,servers,env}=ctx,tenant=ctx.other;
 if(!fixture.viewPolicy){fixture.viewPolicy=randomUUID();await writeFile('.local/chat-ownership/routing-sync-fixture.json',JSON.stringify(fixture));}
 await operator.execute("INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,'owner_principal_id','[]',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[fixture.viewPolicy,tenant,f.otherRole,f.otherObject]);
 const [[savedRole]]=await operator.execute('SELECT permissions FROM `role` WHERE tenant_id=? AND id=?',[tenant,f.otherRole]),[[savedMember]]=await operator.execute('SELECT seat_code FROM membership WHERE tenant_id=? AND id=?',[tenant,f.otherMember]),saved=typeof savedRole.permissions==='string'?savedRole.permissions:JSON.stringify(savedRole.permissions),grants=[...JSON.parse(saved).filter(g=>g.resource!=='routing'),{resource:'routing',action:'read',scope:'all'}];
 await operator.execute('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants),tenant,f.otherRole]);await operator.execute("UPDATE membership SET seat_code='admin' WHERE tenant_id=? AND id=?",[tenant,f.otherMember]);
 await operator.execute("INSERT INTO team(id,tenant_id,name,purpose,active,created_at,updated_at) VALUES (?,?,'Synthetic view team','chat',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[fixture.team,tenant]);
 await operator.execute("INSERT INTO channel_connection(id,tenant_id,provider,external_account_id,status,team_id) VALUES (?,?,'mock_messenger',?,'active',?) ON DUPLICATE KEY UPDATE id=id",[fixture.connection,tenant,'synthetic-view-'+fixture.connection,fixture.team]);
 await chatOperator.execute('UPDATE crm_record SET owner_principal_id=?,owner_revision=owner_revision+1,version=version+1 WHERE tenant_id=? AND id=?',[f.otherPrincipal,tenant,run.owned.id]);await sync.reconcile(tenant);
 const contribution=randomUUID(),historicalTeam=randomUUID();await chatOperator.execute("INSERT INTO session_contribution(tenant_id,session_id,id,conversation_id,revision,kind,source_id,source_revision,actor_kind,actor_id,owner_id,team_id,owner_revision,payload,recorded_at) VALUES (?,?,?,?,1,'outbound_submitted',?,'1','human',?,?,?,1,'{}',UTC_TIMESTAMP(6))",[tenant,run.owned.session,contribution,run.owned.id,contribution,f.otherPrincipal,f.otherPrincipal,historicalTeam]);
 const reference=JSON.parse(await readFile('.local/chat-ownership/reference-fixture.json','utf8')),channelPool=createPool({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),database:reference.database,user:'t05_channel_detail_test',password:reference.channelPassword,timezone:'Z'});
 const start=async(server)=>{servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');return new URL(protocol+'//127.0.0.1:'+server.address().port+'/');};
 const identityUrl=new URL(registryConfig.url);identityUrl.pathname='/';const identity=ownerClient(routingMaterial,routingAuthority,'identity',identityUrl),connectorAuthority=remoteRegistryAuthority(connectorMaterial,registryConfig),channelIdentity=ownerClient(connectorMaterial,connectorAuthority,'identity',identityUrl);
 const storage=new NativeRoutingViewStorage(routingPool),recoveryUrl=await start(createWorkloadServer(routingMaterial,routingAuthority,routingViewRecoveryRoutes(storage)));
 ctx.setRecovery(ownerClient(ctx.identityMaterial,ctx.transport,'routing',recoveryUrl));
 // Use the actual Identity workload material/authority, supplied by the harness.
 const policy=(t,command,admission_id)=>identity(t,'admission-routing-view',{command,admission_id});
 const chatSource=new ChatRoutingView(commands,(t,command,admission_id)=>ctx.identityClient(t,'admission-routing-view',{command,admission_id})),chatServer=createWorkloadServer(chatMaterial,chatAuthority,chatRoutingViewRoutes(chatSource)),chatUrl=await start(chatServer),chatCall=ownerClient(routingMaterial,routingAuthority,'chat',chatUrl);
 const channels=new NativeRoutingConnections(channelPool,(t,command,admission_id)=>channelIdentity(t,'admission-routing-view',{command,admission_id})),channelServer=createWorkloadServer(connectorMaterial,connectorAuthority,routingConnectionRoutes(channels)),channelUrl=await start(channelServer),channelCall=ownerClient(routingMaterial,routingAuthority,'connector',channelUrl);
 const peers={admit:(t,command)=>identity(t,'admit',{owner:'routing',command}),settle:(t,command,admission_id)=>identity(t,'settle',{owner:'routing',command,admission_id}),policy,directory:(t,command,admission_id)=>identity(t,'routing-view-directory',{command,admission_id}),chat:(t,command,admission_id)=>chatCall(t,'routing-view',{command,admission_id}),connections:(t,command,admission_id)=>channelCall(t,'routing-view-connections',{command,admission_id})};
 const view=new NativeRoutingView(storage,peers),enrollmentService=new HumanDispatchEnrollment(ctx.ds),bff=new RoutingViewBff(ctx.auth,enrollmentService,ctx.authority,view),publicServer=createRoutingViewBff(bff),publicUrl=await start(publicServer);
 let session=ctx.actorSession,enrollment=await enrollmentService.enroll(tenant,hash(session));const actor=()=>({kind:'human',principal_id:f.otherPrincipal,delegation_id:enrollment.delegationId});
 const read=(mine=false)=>bff.read(session,tenant,mine,randomUUID()),bad=(p,code)=>assert.rejects(p,e=>e.code===code),restore=async(sql,args,undo,undoArgs,fn)=>{await operator.execute(sql,args);try{await fn();}finally{await operator.execute(undo,undoArgs);}};
 try{
  await check('Chat routing sync view actual native admin and mine preserve workload and historical replies',async()=>{
   const admin=(await read()).data,mine=(await read(true)).data;assert(admin.work.some(w=>w.conversation_id===run.waiting.id));assert(mine.work.some(w=>w.conversation_id===run.owned.id));assert(!mine.work.some(w=>w.conversation_id===run.waiting.id));assert(!('replies' in mine));assert(admin.replies.find(r=>r.principal_id===f.otherPrincipal).submitted_replies>=1);assert(admin.connections.some(c=>c.id===fixture.connection));assert(admin.teams.some(t=>t.id===fixture.team));assert.equal(admin.period_days,30);assert.equal(mine.profiles.length,1);assert.equal(mine.profiles[0].principal_id,f.otherPrincipal);
   await assert.rejects(routingPool.query('SELECT id FROM session_contribution LIMIT 1'));await assert.rejects(channelPool.query('SELECT id FROM auth_session LIMIT 1'));
  });
  await check('Chat routing sync view public native cookie tenant and strict query surface',async()=>{
   const get=async(path='/api/v1/human-routing',headers={})=>fetch(new URL(path,publicUrl),{headers:{'x-tenant-id':tenant,cookie:'crm_session='+session,...headers}});
   assert.equal((await get()).status,200);assert.equal((await get('/api/v1/human-routing/mine')).status,200);assert.equal((await get('/api/v1/human-routing?all=1')).status,400);assert.equal((await get('/api/v1/human-routing',{cookie:''})).status,401);assert.equal((await get('/api/v1/human-routing',{'x-tenant-id':randomUUID()})).status,403);
  });
  await check('Chat routing sync view stale local allocation cannot disclose a transferred Conversation in mine',async()=>{
   await chatOperator.execute('UPDATE crm_record SET owner_principal_id=?,owner_revision=owner_revision+1,version=version+1 WHERE tenant_id=? AND id=?',[fixture.principal,tenant,run.owned.id]);
   try{assert(!(await read(true)).data.work.some(w=>w.conversation_id===run.owned.id));}finally{await chatOperator.execute('UPDATE crm_record SET owner_principal_id=?,owner_revision=owner_revision+1,version=version+1 WHERE tenant_id=? AND id=?',[f.otherPrincipal,tenant,run.owned.id]);}
  });
  await check('Chat routing sync view native role seat and fields preserve admin denial and mine masking',async()=>{
   await restore('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[saved,tenant,f.otherRole],'UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants),tenant,f.otherRole],async()=>{await bad(read(),'FORBIDDEN');assert((await read(true)).data.work.some(w=>w.conversation_id===run.owned.id));});
   await restore("UPDATE membership SET seat_code='viewer' WHERE tenant_id=? AND id=?",[tenant,f.otherMember],"UPDATE membership SET seat_code='admin' WHERE tenant_id=? AND id=?",[tenant,f.otherMember],()=>bad(read(true),'FORBIDDEN'));
   await restore("UPDATE field_policy SET denied_actions='[\"read\"]' WHERE tenant_id=? AND id=?",[tenant,fixture.viewPolicy],"UPDATE field_policy SET denied_actions='[]' WHERE tenant_id=? AND id=?",[tenant,fixture.viewPolicy],async()=>{await bad(read(),'FORBIDDEN');assert.equal((await read(true)).data.work.find(w=>w.conversation_id===run.owned.id).principal_id,null);});
  });
  await check('Chat routing sync view local configuration drift rejects mixed snapshot',async()=>{
   const original=peers.chat;peers.chat=async(...args)=>{const response=await original(...args);await operator.execute('UPDATE routing_human_profile SET version=version+1 WHERE tenant_id=? AND principal_id=?',[tenant,f.otherPrincipal]);return response;};
   try{await bad(read(),'STALE_VERSION');}finally{peers.chat=original;}
  });
  await check('Chat routing sync view current target availability stays Identity owned',async()=>{
   const [[before]]=await operator.execute('SELECT availability FROM principal WHERE tenant_id=? AND id=?',[tenant,fixture.principal]);
   await restore("UPDATE principal SET availability='unavailable' WHERE tenant_id=? AND id=?",[tenant,fixture.principal],'UPDATE principal SET availability=? WHERE tenant_id=? AND id=?',[before.availability,tenant,fixture.principal],async()=>assert.equal((await read()).data.profiles.find(p=>p.principal_id===fixture.principal).available,false));
  });
  await check('Chat routing sync view current role revoked after source read rejects disclosure',async()=>{
   const original=peers.chat;peers.chat=async(...args)=>{const response=await original(...args);await operator.execute('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[saved,tenant,f.otherRole]);return response;};
   try{await bad(read(),'FORBIDDEN');}finally{peers.chat=original;await operator.execute('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants),tenant,f.otherRole]);}
  });
  await check('Chat routing sync view source drift rejects stale visibility result',async()=>{
   const original=chatSource.policy;let n=0;chatSource.policy=async(...args)=>{const p=await original(...args);if(++n===2)await chatOperator.execute('UPDATE crm_record SET version=version+1 WHERE tenant_id=? AND id=?',[tenant,run.owned.id]);return p;};
   try{await bad(read(true),'STALE_VERSION');}finally{chatSource.policy=original;}
  });
  await check('Chat routing sync view actual owner outage never returns partial or zero metrics',async()=>{
   const port=channelServer.address().port;await new Promise(resolve=>channelServer.close(resolve));try{await bad(read(),'DEPENDENCY_UNAVAILABLE');assert((await read(true)).data.profiles.length);}finally{channelServer.listen(port,'127.0.0.1');await once(channelServer,'listening');}
  });
  await check('Chat routing sync view recovery is isolated from configuration and late abort preserves commit',async()=>{
   const config=new NativeRoutingConfiguration(routingPool,{}),p=await storage.prepare(tenant,actor(),true);await bad(config.proof(tenant,p.ref,true),'FORBIDDEN');assert.equal((await storage.proof(tenant,p.ref)).state,'prepared');await storage.proof(tenant,p.ref,true);
   const key=randomUUID(),prepared=await config.begin(tenant,key,f.otherPrincipal,{kind:'skill',id:key,expected_version:'0',key:'view_'+key.replaceAll('-',''),name:'Synthetic view isolation'},actor()),configRef={command_id:key,binding_digest:prepared.binding_digest};
   try{await bad(storage.proof(tenant,configRef,true),'FORBIDDEN');assert.equal((await config.proof(tenant,configRef)).state,'prepared');}finally{await config.proof(tenant,configRef,true);}
   let ref;const original=peers.admit;peers.admit=async(t,r)=>{ref=r;return original(t,r);};try{await read(true);}finally{peers.admit=original;}assert.equal((await storage.proof(tenant,ref,true)).state,'committed');
  });
  await check('Chat routing sync view500work response completes and501fails without truncation',async()=>{
   if(!fixture.viewOverflow){fixture.viewOverflow=fixture.overflow.rows.map(r=>({...r,work:randomUUID()}));await writeFile('.local/chat-ownership/routing-sync-fixture.json',JSON.stringify(fixture));}
   const c=await operator.getConnection();try{await c.beginTransaction();for(const row of fixture.viewOverflow)await c.execute("INSERT INTO routing_work_item(tenant_id,id,session_id,conversation_id,state,completed_at) VALUES (?,?,?,?,'completed','2000-01-01') ON DUPLICATE KEY UPDATE id=id",[tenant,row.work,row.session,row.id]);await c.commit();}catch(e){await c.rollback();throw e;}finally{c.release();}
   const [[before]]=await operator.execute("SELECT COUNT(*) n FROM routing_work_item WHERE tenant_id=? AND state<>'completed'",[tenant]),count=500-Number(before.n),selected=fixture.viewOverflow.slice(0,count+1).map(r=>r.work),slots=selected.map(()=>'?').join(',');assert(count>0);
   try{
    await operator.execute(`UPDATE routing_work_item SET state='waiting',completed_at=NULL WHERE tenant_id=? AND id IN (${selected.slice(0,-1).map(()=>'?').join(',')})`,[tenant,...selected.slice(0,-1)]);
    const started=Date.now();assert.equal((await read()).data.work.length,500);console.log('Routing view500work ms',Date.now()-started);
    await operator.execute("UPDATE routing_work_item SET state='waiting',completed_at=NULL WHERE tenant_id=? AND id=?",[tenant,selected.at(-1)]);await bad(read(),'ROUTING_SESSION_LIMIT');
   }finally{await operator.execute(`UPDATE routing_work_item SET state='completed',completed_at='2000-01-01' WHERE tenant_id=? AND id IN (${slots})`,[tenant,...selected]);}
  });
  await check('Chat routing sync view closing capacity gate allows read without mutating gate',async()=>{
   await restore("UPDATE routing_capacity_gate SET state='closing' WHERE tenant_id=?",[tenant],"UPDATE routing_capacity_gate SET state='open' WHERE tenant_id=?",[tenant],async()=>{assert((await read(true)).data.profiles.length);const [[gate]]=await operator.execute('SELECT state FROM routing_capacity_gate WHERE tenant_id=?',[tenant]);assert.equal(gate.state,'closing');});
  });
  await check('Chat routing sync view completed native logout aborts root before disclosure',async()=>{
   const original=peers.chat;peers.chat=async(...args)=>{const response=await original(...args);await ctx.drainingAuth.logout(session,'http://localhost:18080',await ctx.auth.csrf(session));return response;};try{await assert.rejects(read(true),e=>['FORBIDDEN','REVOKED','INVALID_TRANSITION'].includes(e.code));}finally{peers.chat=original;}
   await assert.rejects(read(true),e=>e.status===401);
  });
 }finally{
  await operator.execute('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[saved,tenant,f.otherRole]);await operator.execute('UPDATE membership SET seat_code=? WHERE tenant_id=? AND id=?',[savedMember.seat_code,tenant,f.otherMember]);await operator.execute("UPDATE field_policy SET denied_actions='[]' WHERE tenant_id=? AND id=?",[tenant,fixture.viewPolicy]);await channelPool.end();
 }
}
