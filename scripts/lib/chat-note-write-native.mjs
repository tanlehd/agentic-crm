import assert from 'node:assert/strict';
import {nativeChatParity} from './chat-runtime-parity.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {once} from 'node:events';
import {createPool} from './chat-native.mjs';
import {noteCandidateSchema} from './chat-note-schema.mjs';
import {ChatNoteWriter,chatNoteWriteRoutes} from '../../services/chat/dist/note-write.js';
import {NativeNoteWriter,noteWriteRoutes} from '../../services/core-baseline/dist/modules/crm/owner-note-write.js';
import {createChatNotesBff} from '../../services/core-baseline/dist/gateway/chat-notes-bff.js';
import {HumanDispatchEnrollment} from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';
import {OwnerError,ownerDigest,ownerCanonical,createWorkloadServer,ownerClient,ownerCommandClient,remoteRegistryAuthority} from '../../packages/workload-transport/dist/index.js';

export async function chatNoteWriteNative(ctx){
 const {check,operator,chatOperator,commands,tenant,other,f,ref,enrollment,identityClient,chatMaterial,bffMaterial,crmMaterial,chatAuthority,registryConfig,protocol,servers,env,projectionObjects,chatServer,setRole,field}=ctx;
 await noteCandidateSchema(operator,ref.crmPassword,process.argv.includes('--provision'));
 const pool=createPool({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),database:ref.database,user:'t05_crm_note_writer_test',password:ref.crmPassword,timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true});
 const path='.local/chat-ownership/note-write-fixture.json';let fixture;
 try{fixture=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;fixture={tenant,environment:'retained-test',conversation:randomUUID(),identity:randomUUID(),session:randomUUID()};await writeFile(path,JSON.stringify(fixture),{flag:'wx',mode:0o600});}
 assert.equal(fixture.tenant,tenant);assert.equal(fixture.environment,'retained-test');
 async function seed(v){
  await operator.execute('INSERT INTO contact_identity(id,tenant_id,connection_id,contact_id,external_subject_id) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id',[v.identity,tenant,ref.connection,ref.contact,'synthetic-note-write-'+v.identity]);
  await chatOperator.execute('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,team_id,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id',[v.conversation,tenant,f.object,f.adminPrincipal,ref.team]);
  await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at) VALUES (?,?,?,?,?,'open',UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE record_id=record_id",[tenant,v.conversation,ref.contact,v.identity,ref.connection]);
  await chatOperator.execute('INSERT INTO chat_control_head(tenant_id,conversation_id,registry_revision,control_revision,cancel_through,pause_through,version,created_at,updated_at) VALUES (?,?,1,1,0,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE conversation_id=conversation_id',[tenant,v.conversation]);
  await chatOperator.execute('INSERT INTO conversation_activity_counter(tenant_id,conversation_id,backfilled) VALUES (?,?,TRUE) ON DUPLICATE KEY UPDATE conversation_id=conversation_id',[tenant,v.conversation]);
  await chatOperator.execute("INSERT INTO conversation_acquisition_session(tenant_id,id,conversation_id,sequence,status,opening_reason,opened_at,opening_occurred_at,source_classification,source_channel,source_page_id,source_connection_id,policy_version) VALUES (?,?,?,1,'active','first_inbound',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'organic','mock_messenger','synthetic-notes',?,'inbox_v2') ON DUPLICATE KEY UPDATE id=id",[tenant,v.session,v.conversation,ref.connection]);
 }
 await seed(fixture);
 const crmAuthority=remoteRegistryAuthority(crmMaterial,registryConfig),identity=ownerClient(crmMaterial,crmAuthority,'identity',new URL('/',registryConfig.url)),proof=ownerClient(crmMaterial,crmAuthority,'chat',new URL(protocol+'//127.0.0.1:'+chatServer.address().port+'/'));
 const native=new NativeNoteWriter(pool,(t,command,abort)=>proof(t,abort?'command-abort':'command-proof',command),(t,command,admission_id)=>identity(t,'admission-note-child',{command,admission_id}));
 const crmServer=createWorkloadServer(crmMaterial,crmAuthority,noteWriteRoutes(native));servers.push(crmServer);crmServer.listen(0,'127.0.0.1');await once(crmServer,'listening');
 const crm=ownerClient(chatMaterial,chatAuthority,'crm',new URL(protocol+'//127.0.0.1:'+crmServer.address().port+'/'));
 const peers={admit:(t,command)=>identityClient(t,'admit',{owner:'chat',command}),settle:(t,command,admission_id)=>identityClient(t,'settle',{owner:'chat',command,admission_id}),create:(t,command,text)=>crm(t,'note-create',{command,text}),abort:(t,command)=>crm(t,'note-abort',command)};
 const writer=new ChatNoteWriter(commands,peers);ctx.setNoteRecovery((t,command)=>writer.recover(t,command));
 const server=createWorkloadServer(chatMaterial,chatAuthority,chatNoteWriteRoutes(writer));servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');
 const call=ownerCommandClient(bffMaterial,remoteRegistryAuthority(bffMaterial,registryConfig),'chat',new URL(protocol+'//127.0.0.1:'+server.address().port+'/'));
 const request=(key=randomUUID(),payload={})=>({schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,operation:'conversation-post-conversations-id-notes',command_id:randomUUID(),actor:{kind:'human',principal_id:f.principal,delegation_id:enrollment.delegationId},payload:{id:fixture.conversation,body:{text:'Synthetic saga note'},expected_version:null,idempotency_key:key,...payload}}),bad=(p,code)=>assert.rejects(p,e=>e.code===code);
 const effect=async key=>{const [[row]]=await chatOperator.execute("SELECT command_id,binding_digest FROM chat_owner_command WHERE tenant_id=? AND operation='note-effect' AND JSON_UNQUOTE(JSON_EXTRACT(binding_json,'$.note.key'))=?",[tenant,key]);assert(row);return {command_id:row.command_id,binding_digest:row.binding_digest};};
 const assertEffect=async(id,conversation=fixture.conversation,session=fixture.session)=>{
  const [[note]]=await operator.execute('SELECT a.body,a.related_record_id,r.owner_principal_id,r.team_id FROM activity a JOIN crm_record r ON r.tenant_id=a.tenant_id AND r.id=a.record_id WHERE a.tenant_id=? AND a.record_id=?',[tenant,id]);assert.equal(note.related_record_id,conversation);assert.equal(note.owner_principal_id,f.principal);assert.equal(note.team_id,ref.team);
  const [[a]]=await chatOperator.execute("SELECT COUNT(*) n FROM conversation_activity WHERE tenant_id=? AND conversation_id=? AND source_id=? AND kind='note'",[tenant,conversation,id]);assert.equal(Number(a.n),1);
  const [contributions]=await chatOperator.execute("SELECT owner_id,team_id,payload FROM session_contribution WHERE tenant_id=? AND session_id=? AND source_id=? AND kind='note'",[tenant,session,id]);assert.equal(contributions.length,1);assert.equal(contributions[0].owner_id,f.adminPrincipal);assert.equal(contributions[0].team_id,ref.team);
  const [[events]]=await operator.execute("SELECT COUNT(*) n FROM outbox_event WHERE tenant_id=? AND aggregate_id=? AND event_type='crm.conversation_note.changed'",[tenant,id]);assert.equal(Number(events.n),1);
 };
 const grants=ctx.grants.filter(g=>g.resource!=='activity');await setRole(grants);
 try{
  await check('Chat notes write nonowner without activity.create and no CRM Conversation registry',async()=>{
   assert(!(await operator.execute('SELECT id FROM crm_record WHERE tenant_id=? AND id=?',[tenant,fixture.conversation]))[0].length);const r=await call(request());await assertEffect(r.data.id);
   await assert.rejects(pool.query('SELECT * FROM test_crm_chat_owner.conversation LIMIT 1'));await assert.rejects(pool.query('SELECT * FROM auth_session LIMIT 1'));await assert.rejects(pool.query('DELETE FROM activity WHERE 1=0'));
  });
  await check('Chat notes write concurrent same key has one Activity and stable public receipt',async()=>{
   const key=randomUUID(),req=request(key),[a,b]=await Promise.all([call(req),call({...request(key),correlation_id:randomUUID()})]);assert.deepEqual(a,b);await assertEffect(a.data.id);assert.deepEqual(await call(request(key)),a);await bad(call(request(key,{body:{text:'Synthetic conflicting note'}})),'IDEMPOTENCY_CONFLICT');
  });
  await check('Chat notes write fresh rights and both object field policies protect replay',async()=>{
   const key=randomUUID();await call(request(key));
   for(const [object,name] of [[f.object,'text'],[projectionObjects.get(tenant).activity,'body']])for(const action of ['read','write'])await field(object,name,[action],()=>bad(call(request(key)),'FORBIDDEN'));
   await setRole(grants.filter(g=>g.action!=='note'));try{await bad(call(request(key)),'FORBIDDEN');}finally{await setRole(grants);}
   await bad(call({...request(),tenant_id:other}),'NOT_FOUND');const service=request();service.actor.kind='service';await bad(call(service),'FORBIDDEN');
  });
  await check('Chat notes write imported completed legacy receipt bypasses new effect creation',async()=>{
   const key=randomUUID(),activity=randomUUID(),req=request(key),response={data:{id:activity,conversation_id:fixture.conversation},meta:{correlation_id:randomUUID()}};
   await operator.execute('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,team_id,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[activity,tenant,projectionObjects.get(tenant).activity,f.principal,ref.team]);
   await operator.execute("INSERT INTO activity(tenant_id,record_id,kind,subject,body,related_record_id) VALUES (?,?,'note','Synthetic legacy receipt','Synthetic saga note',?)",[tenant,activity,fixture.conversation]);
   await chatOperator.execute("INSERT INTO idempotency_record(id,tenant_id,actor_kind,actor_id,route_key,`key`,request_hash,status,response_status,response_body,created_at,updated_at,expires_at) VALUES (?,?,'human',?,?,?,?,'completed',201,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),TIMESTAMPADD(DAY,7,UTC_TIMESTAMP(6)))",[randomUUID(),tenant,f.principal,'POST /api/v1/conversations/'+fixture.conversation+'/notes',key,ownerDigest({body:req.payload.body,version:null}),ownerCanonical(response)]);
   assert.deepEqual(await call(req),response);const [[row]]=await chatOperator.execute("SELECT COUNT(*) n FROM chat_owner_command WHERE tenant_id=? AND operation='note-effect' AND JSON_UNQUOTE(JSON_EXTRACT(binding_json,'$.note.key'))=?",[tenant,key]);assert.equal(Number(row.n),0);
  });
  await check('Chat notes write lost CRM ACK resolves one committed note before replay',async()=>{
   const key=randomUUID(),create=peers.create;let id;peers.create=async(...args)=>{const r=await create(...args);id=r.activity_id;throw new OwnerError('DEPENDENCY_UNAVAILABLE');};try{await bad(call(request(key)),'DEPENDENCY_UNAVAILABLE');}finally{peers.create=create;}
   const r=await call(request(key));assert.equal(r.data.id,id);await assertEffect(id);assert.equal((await commands.proof(tenant,await effect(key))).state,'committed');
  });
  await check('Chat notes write pre-effect outage stays pending then abort tombstone rejects late create',async()=>{
   const key=randomUUID(),create=peers.create,abort=peers.abort;peers.create=async()=>{throw new OwnerError('DEPENDENCY_UNAVAILABLE');};peers.abort=async()=>{throw new OwnerError('DEPENDENCY_UNAVAILABLE');};try{await bad(call(request(key)),'DEPENDENCY_UNAVAILABLE');}finally{peers.create=create;peers.abort=abort;}
   const command=await effect(key);assert.equal((await commands.proof(tenant,command)).state,'prepared');await bad(commands.abort(tenant,command),'DEPENDENCY_UNAVAILABLE');await writer.recover(tenant,command);assert.equal((await commands.proof(tenant,command)).state,'aborted');
   const p=await commands.proof(tenant,command),a=p.binding.dependencies.find(d=>d.owner==='identity');await identityClient(tenant,'settle',{owner:'chat',command,admission_id:a.receipt_id});await bad(create(tenant,command,'Synthetic saga note'),'FORBIDDEN');await bad(call(request(key)),'INVALID_TRANSITION');
  });
  await check('Chat notes write completed native logout reconciles CRM effect before returning',async()=>{
   const session=await ctx.login(f.account),enrolled=await new HumanDispatchEnrollment(ctx.ds).enroll(tenant,createHash('sha256').update(session).digest('hex')),key=randomUUID(),req=request(key);req.actor.delegation_id=enrolled.delegationId;
   const create=peers.create;let id;peers.create=async(...args)=>{const r=await create(...args);id=r.activity_id;await ctx.drainingAuth.logout(session,'http://localhost:18080',await ctx.auth.csrf(session));return r;};try{await bad(call(req),'INVALID_TRANSITION');}finally{peers.create=create;}
   await assertEffect(id);assert.equal((await commands.proof(tenant,await effect(key))).state,'committed');assert.equal((await call(request(key))).data.id,id);
  });
  await check('Chat notes write logout before acceptance aborts parent and child without Activity',async()=>{
   const session=await ctx.login(f.account),enrolled=await new HumanDispatchEnrollment(ctx.ds).enroll(tenant,createHash('sha256').update(session).digest('hex')),key=randomUUID(),req=request(key);req.actor.delegation_id=enrolled.delegationId;
   const admit=peers.admit;peers.admit=async(t,command)=>{const result=await admit(t,command),p=await commands.proof(t,command);if(p.binding.operation==='note-effect')await ctx.drainingAuth.logout(session,'http://localhost:18080',await ctx.auth.csrf(session));return result;};try{await bad(call(req),'INVALID_TRANSITION');}finally{peers.admit=admit;}
   const command=await effect(key);assert.equal((await commands.proof(tenant,command)).state,'aborted');const [[r]]=await operator.execute('SELECT state,result_json FROM crm_owner_command WHERE tenant_id=? AND command_id=?',[tenant,command.command_id]);assert.equal(r.state,'aborted');assert.equal((typeof r.result_json==='string'?JSON.parse(r.result_json):r.result_json).activity_id,null);
  });
  await check('Chat notes write native logout remains incomplete during real CRM outage and recovers',async()=>{
   const session=await ctx.login(f.account),enrolled=await new HumanDispatchEnrollment(ctx.ds).enroll(tenant,createHash('sha256').update(session).digest('hex')),csrf=await ctx.auth.csrf(session),key=randomUUID(),req=request(key);req.actor.delegation_id=enrolled.delegationId;
   const create=peers.create,port=crmServer.address().port;let id,barrier;
   peers.create=async(...args)=>{const result=await create(...args);id=result.activity_id;crmServer.closeAllConnections();await new Promise(resolve=>crmServer.close(resolve));throw new OwnerError('DEPENDENCY_UNAVAILABLE');};
   try{
    await bad(call(req),'DEPENDENCY_UNAVAILABLE');peers.create=create;const command=await effect(key);assert.equal((await commands.proof(tenant,command)).state,'prepared');
    await bad(ctx.drainingAuth.logout(session,'http://localhost:18080',csrf),'DEPENDENCY_UNAVAILABLE');
    const [[row]]=await operator.execute('SELECT barrier_id,state FROM identity_account_gate WHERE account_id=?',[f.account]);assert.equal(row.state,'closing');barrier=row.barrier_id;await bad(call(request()),'REVOKED');
   }finally{
    peers.create=create;if(!crmServer.listening){crmServer.listen(port,'127.0.0.1');await once(crmServer,'listening');}
    if(barrier)await ctx.accountDrain.drain({accountId:f.account,barrierId:barrier});
   }
   const [[row]]=await operator.execute('SELECT state FROM identity_account_barrier WHERE barrier_id=?',[barrier]);assert.equal(row.state,'completed');await assertEffect(id);assert.equal((await call(request(key))).data.id,id);
  });
  await check('Chat notes write accepted session and owner survive later close and reassignment',async()=>{
   const v={conversation:randomUUID(),identity:randomUUID(),session:randomUUID()};await seed(v);const key=randomUUID(),create=peers.create;let id;
   peers.create=async(...args)=>{const r=await create(...args);id=r.activity_id;await chatOperator.execute('UPDATE crm_record SET owner_principal_id=?,owner_revision=owner_revision+1,version=version+1 WHERE tenant_id=? AND id=?',[f.principal,tenant,v.conversation]);await chatOperator.execute("UPDATE conversation SET status='closed',closed_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND record_id=?",[tenant,v.conversation]);await chatOperator.execute("UPDATE conversation_acquisition_session SET status='closed',closed_at=UTC_TIMESTAMP(6),close_reason='agent_closed' WHERE tenant_id=? AND id=?",[tenant,v.session]);return r;};
   try{await bad(call(request(key,{id:v.conversation})),'STALE_VERSION');}finally{peers.create=create;}
   await assertEffect(id,v.conversation,v.session);assert.equal((await call(request(key,{id:v.conversation}))).data.id,id);
  });
  await check('Chat notes write closed Conversation preserves no active-session contribution',async()=>{
   const v={conversation:randomUUID(),identity:randomUUID(),session:randomUUID()};await seed(v);
   await chatOperator.execute("UPDATE conversation SET status='closed',closed_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND record_id=?",[tenant,v.conversation]);await chatOperator.execute("UPDATE conversation_acquisition_session SET status='closed',closed_at=UTC_TIMESTAMP(6),close_reason='agent_closed' WHERE tenant_id=? AND id=?",[tenant,v.session]);
   const result=await call(request(randomUUID(),{id:v.conversation}));const [[row]]=await chatOperator.execute("SELECT COUNT(*) n FROM session_contribution WHERE tenant_id=? AND source_id=? AND kind='note'",[tenant,result.data.id]);assert.equal(Number(row.n),0);
  });
  await check('Chat notes write public session CSRF strict body and201 receipt replay'+(process.argv.includes('--with-runtime')?' runtime':''),async()=>{
   // Retained historical sessions may already be closed by lifecycle acceptance.
   // Preserve them and retain a new round for this active-session assertion.
   const active=process.argv.includes('--with-runtime')?{conversation:randomUUID(),identity:randomUUID(),session:randomUUID()}:fixture;
   if(active!==fixture){fixture.runtimeRounds??=[];fixture.runtimeRounds.push(active);await writeFile(path,JSON.stringify(fixture),{mode:0o600});await seed(active);}
   const candidate=process.argv.includes('--with-runtime')?await nativeChatParity(ctx,{crm:new URL(protocol+'//127.0.0.1:'+crmServer.address().port+'/')}):null;
   try{
   const publicServer=createChatNotesBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),candidate?.call??call);servers.push(publicServer);publicServer.listen(0,'127.0.0.1');await once(publicServer,'listening');const url='http://127.0.0.1:'+publicServer.address().port+'/api/v1/conversations/'+active.conversation+'/notes',key=randomUUID(),headers={'x-tenant-id':tenant,cookie:'crm_session='+ctx.actorSession,origin:'http://localhost:18080','x-csrf-token':await ctx.auth.csrf(ctx.actorSession),'content-type':'application/json','idempotency-key':key},body=JSON.stringify({text:'Synthetic public saga note'});
   assert.equal((await fetch(url,{method:'POST',headers:{...headers,'x-csrf-token':'bad'},body})).status,403);const first=await fetch(url,{method:'POST',headers,body});assert.equal(first.status,201);assert.equal(first.headers.get('cache-control'),'no-store');const result=await first.json(),repeat=await fetch(url,{method:'POST',headers,body});assert.equal(repeat.status,201);assert.deepEqual(await repeat.json(),result);await assertEffect(result.data.id,active.conversation,active.session);
   assert.equal((await fetch(url,{method:'POST',headers:{...headers,'idempotency-key':randomUUID()},body:'{"text":"one","text":"two"}'})).status,400);
   if(candidate){
    // Post-write recovery stays on the same owning database. Retain the CRM
    // effect, Chat receipt and original session; never return to a stale writer.
    const [[gate]]=await chatOperator.execute('SELECT mode,epoch FROM chat_writer_gate WHERE tenant_id=?',[tenant]);assert.equal(gate.mode,'active');
    const command=await effect(key),before=await commands.proof(tenant,command);
    const retry={method:'POST',headers:{...headers,'idempotency-key':randomUUID()},body};
    await chatOperator.execute("UPDATE chat_writer_gate SET mode='frozen' WHERE tenant_id=? AND epoch=?",[tenant,gate.epoch]);
    try{
     assert.equal((await fetch(url,retry)).status,503);
     await candidate.crash();
    }finally{
     await chatOperator.execute('UPDATE chat_writer_gate SET mode=? WHERE tenant_id=? AND epoch=?',[gate.mode,tenant,gate.epoch]);
    }
    await candidate.start();
     const r=await candidate.call(request(key,{id:active.conversation,body:{text:'Synthetic public saga note'}}));assert.deepEqual(r,result);
     assert.deepEqual(await commands.proof(tenant,command),before);await assertEffect(result.data.id,active.conversation,active.session);
     await candidate.crashRestart();assert.deepEqual(await candidate.call(request(key,{id:active.conversation,body:{text:'Synthetic public saga note'}})),result);await assertEffect(result.data.id,active.conversation,active.session);
     console.log('PASS Chat notes runtime post-write freeze rejects new effects, crash and forward recovery preserve exact receipt and CRM reference');
   }
   }finally{if(candidate)await candidate.stop();}
  });
  await check('Chat notes write stored ledgers contain digests and references only',async()=>{
   for(const [db,table] of [[operator,'crm_owner_command'],[chatOperator,'chat_owner_command']]){const [[row]]=await db.execute("SELECT COUNT(*) n FROM "+table+" WHERE tenant_id=? AND (JSON_SEARCH(request_json,'one','Synthetic saga note') IS NOT NULL OR JSON_SEARCH(result_json,'one','Synthetic saga note') IS NOT NULL)",[tenant]);assert.equal(Number(row.n),0);}
   const [plans]=await operator.query("EXPLAIN SELECT a.record_id FROM activity a JOIN crm_record r ON r.tenant_id=a.tenant_id AND r.id=a.record_id WHERE a.tenant_id=? AND a.related_record_id=? AND a.kind='note' AND r.archived_at IS NULL ORDER BY a.record_id LIMIT 101",[tenant,fixture.conversation]);assert(plans.length);console.log('INFO note EXPLAIN tables='+plans.map(p=>p.table+':'+p.type).join(','));
  });
 }finally{await setRole(ctx.grants);ctx.setNoteRecovery(null);await pool.end();}
}
