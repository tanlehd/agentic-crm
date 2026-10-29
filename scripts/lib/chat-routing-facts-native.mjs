import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {once} from 'node:events';
import {ChatRoutingFacts,chatRoutingFactsRoutes} from '../../services/chat/dist/routing-facts.js';
import {NativeRoutingReplySource} from '../../services/core-baseline/dist/modules/agents/owner-facts.js';
import {HumanDispatchEnrollment} from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';
import {hash} from '../../services/core-baseline/dist/modules/identity/auth/security.js';
import {createWorkloadServer,ownerCommandClient,ownerDigest} from '../../packages/workload-transport/dist/index.js';

export async function chatRoutingFactsNative(ctx){
 const {check,operator,chatOperator,chatPool,commands,tenant,other,f,identityClient,chatMaterial,routingMaterial,routingAuthority,chatAuthority,protocol,servers}=ctx;
 const path='.local/chat-ownership/routing-facts-fixture.json';let fixture;
 try{fixture=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;fixture={rows:Array.from({length:3},()=>({id:randomUUID(),session:randomUUID()})),team:randomUUID(),second:randomUUID(),overflow:Array.from({length:5001},()=>randomUUID()),facts:Array.from({length:6},()=>randomUUID())};await writeFile(path,JSON.stringify(fixture));}
 const from='2026-01-01T00:00:00.000Z',at='2026-02-01 00:00:00.123456',old='2025-12-01 00:00:00.000000';
 for(const row of fixture.rows){
  await chatOperator.execute("INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,version,owner_revision,custom_values,created_at,updated_at) VALUES (?,?,?,?,1,1,'{}',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[row.id,tenant,f.object,f.adminPrincipal]);
  await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at,closed_at) VALUES (?,?,?,?,?,'closed',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE record_id=record_id",[tenant,row.id,randomUUID(),randomUUID(),randomUUID()]);
  await chatOperator.execute("INSERT INTO conversation_acquisition_session(tenant_id,id,conversation_id,sequence,status,opening_reason,opened_at,opening_occurred_at,closed_at,close_reason,source_classification,source_connection_id,policy_version) VALUES (?,?,?,1,'closed','first_inbound',?,?,?,'agent_closed','unknown',?,'conversation_acquisition_v1') ON DUPLICATE KEY UPDATE id=id",[tenant,row.session,row.id,old,old,at,randomUUID()]);
 }
 const add=async(c,row,id,revision,kind,actorKind,actor,time)=>c.execute('INSERT INTO session_contribution(tenant_id,session_id,id,conversation_id,revision,kind,source_id,source_revision,actor_kind,actor_id,owner_id,team_id,owner_revision,payload,recorded_at) VALUES (?,?,?,?,?,?,?,\'1\',?,?,?,?,1,\'{}\',?) ON DUPLICATE KEY UPDATE id=id',[tenant,row.session,id,row.id,revision,kind,id,actorKind,actor,f.adminPrincipal,fixture.team,time]);
 const cases=[['outbound_submitted','human',f.principal,at],['outbound_submitted','human',fixture.second,at],['outbound_submitted','human',f.principal,old],['outbound_submitted','ai',f.aiPrincipal,at],['assignment','human',f.principal,at],['outbound_submitted','service',f.routingService,at]];
 for(let i=0;i<cases.length;i++)await add(chatOperator,fixture.rows[i===1?1:0],fixture.facts[i],i+1,...cases[i]);
 const [[savedRole]]=await operator.execute('SELECT permissions FROM `role` WHERE tenant_id=? AND id=?',[tenant,f.role]);
 const [[savedMember]]=await operator.execute('SELECT seat_code FROM membership WHERE tenant_id=? AND id=?',[tenant,f.member]);
 const [[savedPolicy]]=await operator.execute('SELECT property_key,denied_actions FROM field_policy WHERE tenant_id=? AND id=?',[tenant,f.policy]);
 const saved=typeof savedRole.permissions==='string'?savedRole.permissions:JSON.stringify(savedRole.permissions),grants=JSON.parse(saved),permissions=[...grants.filter(g=>g.resource!=='routing'),{resource:'routing',action:'read',scope:'all'}];
 await operator.execute('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(permissions),tenant,f.role]);await operator.execute("UPDATE membership SET seat_code='admin' WHERE tenant_id=? AND id=?",[tenant,f.member]);
 let session=ctx.actorSession,enrollment=ctx.enrollment;
 const actor=()=>({kind:'human',principal_id:f.principal,delegation_id:enrollment.delegationId});
 const peers={admit:(t,command)=>identityClient(t,'admit',{owner:'chat',command}),settle:(t,command,admission_id)=>identityClient(t,'settle',{owner:'chat',command,admission_id})};
 const facts=new ChatRoutingFacts(commands,peers),server=createWorkloadServer(chatMaterial,chatAuthority,chatRoutingFactsRoutes(facts));servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');
 const call=ownerCommandClient(routingMaterial,routingAuthority,'chat',new URL(protocol+'//127.0.0.1:'+server.address().port+'/')),source=new NativeRoutingReplySource(call);
 const sessions=fixture.rows.slice(0,2).map(r=>r.session),request=(payload={session_ids:sessions,from,mode:'facts'})=>({schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,operation:'routing-reply-facts',command_id:randomUUID(),actor:actor(),payload});
 const bad=(p,code)=>assert.rejects(p,e=>e.code===code),restore=async(sql,args,undo,undoArgs,work)=>{await operator.execute(sql,args);try{await work();}finally{await operator.execute(undo,undoArgs);}};
 const relogin=async()=>{session=await ctx.login(f.account);enrollment=await new HumanDispatchEnrollment(ctx.ds).enroll(tenant,hash(session));};
 try{
  await check('Chat routing facts actual HTTP aggregate and historical fact semantics',async()=>{
   const result=await call(request());assert.equal(result.facts.length,2);assert.equal(result.snapshot_digest,ownerDigest({facts:result.facts,replies:[]}));
   assert(result.facts.every(r=>r.team_id===fixture.team&&r.recorded_at==='2026-02-01T00:00:00.123456Z'));assert.deepEqual(result.facts.map(r=>r.actor_id).sort(),[f.principal,fixture.second].sort());
   assert.deepEqual(await source.replyFacts(tenant,actor(),sessions,from),result.facts);assert.deepEqual(await source.replies(tenant,actor(),sessions,from),[f.principal,fixture.second].sort().map(principal_id=>({principal_id,submitted_replies:1})));
   assert(!JSON.stringify(result).includes('payload'));assert(!JSON.stringify(result).includes('owner_id'));await assert.rejects(chatPool.query('SELECT principal_id FROM routing_human_profile LIMIT 1'));
  });
  await check('Chat routing facts empty selection still authorizes and missing tenant reference fails',async()=>{
   assert.deepEqual(await source.replyFacts(tenant,actor(),[],from),[]);await bad(call(request({session_ids:[randomUUID()],from,mode:'facts'})),'REFERENCE_INVALID');await bad(call({...request(),tenant_id:other}),'FORBIDDEN');await bad(call({...request(),actor:{kind:'service',principal_id:f.routingService,delegation_id:f.routingService}}),'FORBIDDEN');
  });
  await check('Chat routing facts current role seat scoped grant and field denial',async()=>{
   for(const permissionsDenied of [permissions.filter(g=>g.resource!=='routing'),permissions.map(g=>g.resource==='conversation'&&g.action==='read'?{...g,scope:'own'}:g),permissions.filter(g=>g.resource!=='conversation'||g.action!=='assign')])await restore('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(permissionsDenied),tenant,f.role],'UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(permissions),tenant,f.role],()=>bad(call(request({session_ids:[randomUUID()],from,mode:'facts'})),'FORBIDDEN'));
   await restore("UPDATE membership SET seat_code='chat' WHERE tenant_id=? AND id=?",[tenant,f.member],"UPDATE membership SET seat_code='admin' WHERE tenant_id=? AND id=?",[tenant,f.member],()=>bad(call(request()),'FORBIDDEN'));
   for(const field of ['owner_principal_id','team_id'])await restore("UPDATE field_policy SET property_key=?,denied_actions='[\"read\"]' WHERE tenant_id=? AND id=?",[field,tenant,f.policy],"UPDATE field_policy SET property_key='text',denied_actions='[]' WHERE tenant_id=? AND id=?",[tenant,f.policy],()=>bad(call(request()),'FORBIDDEN'));
  });
  await check('Chat routing facts query bounds duplicate sessions and UTC instant validation',async()=>{
   for(const payload of [{session_ids:[sessions[0],sessions[0]],from,mode:'facts'},{session_ids:Array.from({length:5001},()=>randomUUID()),from,mode:'facts'},{session_ids:sessions,from:'2026-01-01T00:00:00+07:00',mode:'facts'},{session_ids:sessions,from:'2026-02-30T00:00:00.000Z',mode:'facts'},{session_ids:sessions,from,mode:'unknown'}])await bad(call(request(payload)),'INVALID_REQUEST');
  });
  await check('Chat routing facts changed source cannot disclose precommit snapshot',async()=>{
   const commit=commands.commit.bind(commands);commands.commit=async(...args)=>{await chatOperator.execute("UPDATE session_contribution SET recorded_at='2026-02-02 00:00:00.123456' WHERE tenant_id=? AND session_id=? AND id=?",[tenant,fixture.rows[0].session,fixture.facts[0]]);return commit(...args);};
   try{await bad(call(request()),'STALE_VERSION');}finally{commands.commit=commit;await chatOperator.execute('UPDATE session_contribution SET recorded_at=? WHERE tenant_id=? AND session_id=? AND id=?',[at,tenant,fixture.rows[0].session,fixture.facts[0]]);}
  });
  await check('Chat routing facts final session locks serialize concurrent contribution append',async()=>{
   const commit=commands.commit.bind(commands);commands.commit=async(t,ref,admission,effect,...rest)=>commit(t,ref,admission,async(...args)=>{
    const result=await effect(...args),c=await chatOperator.getConnection();
    try{
     await c.query('SET innodb_lock_wait_timeout=1');await c.beginTransaction();
     await assert.rejects(add(c,fixture.rows[0],randomUUID(),100,'outbound_submitted','human',f.principal,at),e=>e.code==='ER_LOCK_WAIT_TIMEOUT');
    }finally{await c.rollback();await c.query('SET innodb_lock_wait_timeout=50');c.release();}
    return result;
   },...rest);
   try{assert.equal((await call(request())).facts.length,2);}finally{commands.commit=commit;}
  });
  await check('Chat routing facts source outage never becomes empty report',async()=>{
   const port=server.address().port;await new Promise(resolve=>server.close(resolve));try{await bad(source.replies(tenant,actor(),sessions,from),'DEPENDENCY_UNAVAILABLE');}finally{server.listen(port,'127.0.0.1');await once(server,'listening');}
  });
  await check('Chat routing facts retained5001 rejects facts but aggregate preserves all replies',async()=>{
   const [existing]=await chatOperator.execute('SELECT id FROM session_contribution WHERE tenant_id=? AND session_id=?',[tenant,fixture.rows[2].session]),retained=new Set(existing.map(r=>r.id));
   const c=await chatOperator.getConnection();try{await c.beginTransaction();for(let i=0;i<fixture.overflow.length;i++)if(!retained.has(fixture.overflow[i]))await add(c,fixture.rows[2],fixture.overflow[i],i+1,'outbound_submitted','human',f.principal,i===5000?old:at);await c.commit();}catch(e){await c.rollback();throw e;}finally{c.release();}
   const selected=[fixture.rows[2].session];assert.equal((await source.replyFacts(tenant,actor(),selected,from)).length,5000);
   await chatOperator.execute('UPDATE session_contribution SET recorded_at=? WHERE tenant_id=? AND session_id=? AND id=?',[at,tenant,selected[0],fixture.overflow[5000]]);
   try{await bad(source.replyFacts(tenant,actor(),selected,from),'OPERATIONS_SOURCE_LIMIT');assert.deepEqual(await source.replies(tenant,actor(),selected,from),[{principal_id:f.principal,submitted_replies:5001}]);}finally{await chatOperator.execute('UPDATE session_contribution SET recorded_at=? WHERE tenant_id=? AND session_id=? AND id=?',[old,tenant,selected[0],fixture.overflow[5000]]);}
  });
  await check('Chat routing facts aggregate500groups completes and501groups never truncates',async()=>{
   const selected=[fixture.rows[2].session];
   await chatOperator.execute('UPDATE session_contribution SET actor_id=id WHERE tenant_id=? AND session_id=? AND revision<=500',[tenant,selected[0]]);
   try{
    await bad(source.replies(tenant,actor(),selected,from),'ROUTING_REPORT_LIMIT');
    await chatOperator.execute('UPDATE session_contribution SET actor_id=? WHERE tenant_id=? AND session_id=? AND revision=500',[f.principal,tenant,selected[0]]);
    assert.equal((await source.replies(tenant,actor(),selected,from)).length,500);
   }finally{await chatOperator.execute('UPDATE session_contribution SET actor_id=? WHERE tenant_id=? AND session_id=? AND revision<=500',[f.principal,tenant,selected[0]]);}
  });
  await check('Chat routing facts completed logout before admission denies existing session',async()=>{
   await ctx.drainingAuth.logout(session,'http://localhost:18080',await ctx.auth.csrf(session));await bad(call(request()),'REVOKED');await relogin();
  });
  await check('Chat routing facts completed logout aborts admitted read before commit',async()=>{
   const commit=commands.commit.bind(commands);commands.commit=async(...args)=>{await ctx.drainingAuth.logout(session,'http://localhost:18080',await ctx.auth.csrf(session));return commit(...args);};
   try{await bad(call(request()),'INVALID_TRANSITION');}finally{commands.commit=commit;}
   const [[pending]]=await operator.execute("SELECT COUNT(*) n FROM identity_owner_admission WHERE tenant_id=? AND principal_id=? AND state='admitted'",[tenant,f.principal]);assert.equal(Number(pending.n),0);
  });
 }finally{
  await operator.execute('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[saved,tenant,f.role]);await operator.execute('UPDATE membership SET seat_code=? WHERE tenant_id=? AND id=?',[savedMember.seat_code,tenant,f.member]);await operator.execute('UPDATE field_policy SET property_key=?,denied_actions=? WHERE tenant_id=? AND id=?',[savedPolicy.property_key,typeof savedPolicy.denied_actions==='string'?savedPolicy.denied_actions:JSON.stringify(savedPolicy.denied_actions),tenant,f.policy]);
 }
}
