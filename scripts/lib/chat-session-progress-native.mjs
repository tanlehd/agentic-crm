import assert from 'node:assert/strict';
import {nativeChatParity} from './chat-runtime-parity.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {once} from 'node:events';
import {createPool} from './chat-native.mjs';
import {ChatSessionProgress,chatSessionProgressRoutes,sessionProgressOperations as ops} from '../../services/chat/dist/session-progress.js';
import {NativeContactSummary,contactSummaryRoutes} from '../../services/core-baseline/dist/modules/crm/owner-contact-summary.js';
import {createChatSessionProgressBff} from '../../services/core-baseline/dist/gateway/chat-session-progress-bff.js';
import {HumanDispatchEnrollment} from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';
import {createWorkloadServer,ownerClient,ownerCommandClient,remoteRegistryAuthority,ownerDigest} from '../../packages/workload-transport/dist/index.js';

export async function chatSessionProgressNative(ctx){
 const {check,operator,chatOperator,chatPool,commands,tenant,other,f,ref,enrollment,identityClient,chatMaterial,bffMaterial,crmMaterial,chatAuthority,registryConfig,protocol,servers,env,chatServer,setRole,field}=ctx;
 const path='.local/chat-ownership/session-progress-fixture.json';let fixture;
 try{fixture=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;fixture={tenant,environment:'retained-test',rounds:[]};}
 assert.equal(fixture.tenant,tenant);assert.equal(fixture.environment,'retained-test');const v=Object.fromEntries(['conversation','identity','session','message','foreignMessage'].map(k=>[k,randomUUID()]));fixture.rounds.push(v);await writeFile(path,JSON.stringify(fixture),{mode:0o600});
 await operator.execute('INSERT INTO contact_identity(id,tenant_id,connection_id,contact_id,external_subject_id) VALUES (?,?,?,?,?)',[v.identity,tenant,ref.connection,ref.contact,'synthetic-progress-'+v.identity]);
 await chatOperator.execute('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[v.conversation,tenant,f.object,f.principal]);
 await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at) VALUES (?,?,?,?,?,'open',UTC_TIMESTAMP(6))",[tenant,v.conversation,ref.contact,v.identity,ref.connection]);
 await chatOperator.execute('INSERT INTO chat_control_head(tenant_id,conversation_id,registry_revision,control_revision,cancel_through,pause_through,version,created_at,updated_at) VALUES (?,?,1,1,0,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[tenant,v.conversation]);
 await chatOperator.execute("INSERT INTO conversation_acquisition_session(tenant_id,id,conversation_id,sequence,status,opening_reason,opened_at,opening_occurred_at,source_classification,source_channel,source_page_id,source_connection_id,policy_version) VALUES (?,?,?,1,'active','first_inbound','2026-01-01 00:00:00','2026-01-01 00:00:00','organic','mock_messenger','synthetic-progress',?,'inbox_v2')",[tenant,v.session,v.conversation,ref.connection]);
 for(const id of [v.message,v.foreignMessage])await chatOperator.execute("INSERT INTO message(id,tenant_id,conversation_id,connection_id,provider_message_id,direction,text,occurred_at,received_at,status) VALUES (?,?,?,?,?,'inbound','Synthetic progress evidence',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'received')",[id,tenant,v.conversation,ref.connection,id]);
 await chatOperator.execute("INSERT INTO message_acquisition_membership(tenant_id,message_id,conversation_id,session_id,resolution,created_at) VALUES (?,?,?,?,'assigned',UTC_TIMESTAMP(6))",[tenant,v.message,v.conversation,v.session]);
 const pool=createPool({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),database:ref.database,user:'t05_crm_detail_test',password:ref.crmPassword,timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true});
 const authority=remoteRegistryAuthority(crmMaterial,registryConfig),proof=ownerClient(crmMaterial,authority,'chat',new URL(protocol+'//127.0.0.1:'+chatServer.address().port+'/')),identity=ownerClient(crmMaterial,authority,'identity',new URL('/',registryConfig.url));
 const contacts=new NativeContactSummary(pool,(t,command)=>proof(t,'command-proof',command),(t,input)=>identity(t,'admission-contact-policy',input),undefined,(t,input)=>identity(t,'admission-session-contact-policy',input));
 const crmServer=createWorkloadServer(crmMaterial,authority,contactSummaryRoutes(contacts));servers.push(crmServer);crmServer.listen(0,'127.0.0.1');await once(crmServer,'listening');
 const crm=ownerClient(chatMaterial,chatAuthority,'crm',new URL(protocol+'//127.0.0.1:'+crmServer.address().port+'/')),peers={admit:(t,command)=>identityClient(t,'admit',{owner:'chat',command}),settle:(t,command,admission_id)=>identityClient(t,'settle',{owner:'chat',command,admission_id}),policy:(t,command,admission_id)=>identityClient(t,'admission-session-progress-policy',{command,admission_id}),contact:(t,command,admission_id)=>crm(t,'session-contact-read',{command,admission_id})};
 const server=createWorkloadServer(chatMaterial,chatAuthority,chatSessionProgressRoutes(new ChatSessionProgress(commands,peers)));servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');const call=ownerCommandClient(bffMaterial,remoteRegistryAuthority(bffMaterial,registryConfig),'chat',new URL(protocol+'//127.0.0.1:'+server.address().port+'/'));
 const request=(op=ops.read,payload={})=>({schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,operation:op,command_id:randomUUID(),actor:{kind:'human',principal_id:f.principal,delegation_id:enrollment.delegationId},payload:{...([ops.read,ops.write].includes(op)?{conversation:v.conversation,session:v.session}:{}),...payload}}),bad=(p,code)=>assert.rejects(p,e=>e.code===code),read=async()=> (await call(request())).data,version=async()=> (await read()).version;
 const mutate=(body,expected_version,key=randomUUID())=>call(request(ops.write,{body,expected_version,idempotency_key:key}));
 const grants=[...ctx.grants,{resource:'conversation',action:'update',scope:'all'},{resource:'schema',action:'update',scope:'all'}];await setRole(grants);const [[seat]]=await operator.execute('SELECT seat_code FROM membership WHERE tenant_id=? AND id=?',[tenant,f.member]);
 let process,need,evidence,correction,stageReceipt,stageKey;
 try{
  if(globalThis.process.argv.includes('--with-runtime'))await check('Chat session runtime public process enrollment progress evidence and persisted attribution',async()=>{
   const candidate=await nativeChatParity(ctx,{crm:new URL(protocol+'//127.0.0.1:'+crmServer.address().port+'/')});
   try{
    const http=createChatSessionProgressBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),candidate.call);servers.push(http);http.listen(0,'127.0.0.1');await once(http,'listening');
    const root='http://127.0.0.1:'+http.address().port+'/api/v1',url=root+'/conversations/'+v.conversation+'/sessions/'+v.session+'/progress';
    const headers={'x-tenant-id':tenant,cookie:'crm_session='+ctx.actorSession,origin:'http://localhost:18080','x-csrf-token':await ctx.auth.csrf(ctx.actorSession),'content-type':'application/json'};
    const processResponse=await fetch(root+'/session-process',{headers});assert.equal(processResponse.status,200);const definition=(await processResponse.json()).data.definition;
    let response=await fetch(url,{headers});assert.equal(response.status,200);let state=(await response.json()).data;assert.equal(state.coverage,'none');
    const mutatePublic=async body=>{const options={method:'POST',headers:{...headers,'if-match':'"'+state.version+'"','idempotency-key':randomUUID()},body:JSON.stringify(body)};const r=await fetch(url,options);assert.equal(r.status,200);const result=await r.json();assert.deepEqual(await (await fetch(url,options)).json(),result);state=(await (await fetch(url,{headers})).json()).data;return result;};
    await mutatePublic({action:'enroll'});assert.equal(state.coverage,'partial');await mutatePublic({action:'stage',stage_key:definition.stages[1].key,reason:'Synthetic runtime progress'});
    const need=(await mutatePublic({action:'need',label:'Synthetic runtime need'})).data.id;
    await mutatePublic({action:'record',need_id:need,milestone_key:definition.milestones[0].key,occurred_at:'2026-06-01T00:00:00.000Z',reason:'Synthetic runtime evidence',message_id:v.message});assert(state.history.length>=2);
    const [[source]]=await chatOperator.execute('SELECT source_classification,source_connection_id FROM conversation_acquisition_session WHERE tenant_id=? AND id=?',[tenant,v.session]);assert.equal(source.source_classification,'organic');assert.equal(source.source_connection_id,ref.connection);assert(candidate.proofCount()>0);
   }finally{await candidate.stop();}
  });
  await check('Chat session native no-coverage process read and owner credentials',async()=>{
   const r=await read();assert.equal(r.coverage,'none');assert.equal(r.version,'0');assert.equal(r.can_edit,true);assert.deepEqual(r.history,[]);process=(await call(request(ops.process))).data;assert(process.definition.stages.length>1);
   await assert.rejects(chatPool.query('SELECT * FROM native_identity_test.contact LIMIT 1'));await assert.rejects(pool.query('SELECT * FROM test_crm_chat_owner.session_progress LIMIT 1'));await assert.rejects(pool.query('SELECT * FROM auth_session LIMIT 1'));
  });
  await check('Chat session process publish permission immutable pins and head CAS',async()=>{
   const publish=()=>request(ops.publish,{body:process.definition,expected_version:process.current_version,idempotency_key:randomUUID()});await bad(call(publish()),'FORBIDDEN');
   await operator.execute("UPDATE membership SET seat_code='admin' WHERE tenant_id=? AND id=?",[tenant,f.member]);
   const published=await call(publish());const key=randomUUID();const enrolled=await mutate({action:'enroll'},'0',key);assert.equal(enrolled.data.version,'1');assert.deepEqual(await mutate({action:'enroll'},'0',key),enrolled);let r=await read();assert.equal(r.process.version,published.data.version);assert.equal(r.coverage,'partial');
   const newer=await call(request(ops.publish,{body:process.definition,expected_version:published.data.version,idempotency_key:randomUUID()}));assert.equal((await read()).process.version,published.data.version);assert.equal((await read()).process.current_version,newer.data.version);await bad(call(publish()),'VERSION_CONFLICT');
   const duplicate=structuredClone(process.definition);duplicate.stages[1].key=duplicate.stages[0].key;await bad(call(request(ops.publish,{body:duplicate,expected_version:newer.data.version,idempotency_key:randomUUID()})),'INVALID_PROCESS');
   await operator.execute('UPDATE membership SET seat_code=? WHERE tenant_id=? AND id=?',[seat.seat_code,tenant,f.member]);
  });
  await check('Chat session concurrent stage replay CAS and fresh authorization',async()=>{
   const current=await version();stageKey=randomUUID();const body={action:'stage',stage_key:process.definition.stages[1].key,reason:'Synthetic consultation'};
   const results=await Promise.all([mutate(body,current,stageKey),mutate(body,current,stageKey)]);assert.deepEqual(results[0],results[1]);stageReceipt=results[0];assert.equal((await read()).history.length,1);await bad(mutate({...body,reason:'Changed'},current,stageKey),'IDEMPOTENCY_CONFLICT');await bad(mutate({action:'need',label:'Stale'},current),'VERSION_CONFLICT');
   await setRole(grants.filter(g=>!(g.resource==='conversation'&&g.action==='update')));try{await bad(mutate(body,current,stageKey),'FORBIDDEN');}finally{await setRole(grants);}
  });
  await check('Chat session needs same-session evidence corrections and historical owner',async()=>{
   need=(await mutate({action:'need',label:'Synthetic need'},await version())).data.id;const occurred_at='2026-06-01T00:00:00.000Z',milestone_key=process.definition.milestones[0].key;
   await bad(mutate({action:'record',need_id:need,milestone_key,occurred_at,reason:'Synthetic evidence',message_id:v.foreignMessage},await version()),'INVALID_EVIDENCE');
   evidence=(await mutate({action:'record',need_id:need,milestone_key,occurred_at,reason:'Synthetic evidence',message_id:v.message},await version())).data.id;
   correction=(await mutate({action:'replace',supersedes_id:evidence,occurred_at:'2026-06-02T00:00:00.000Z',reason:'Synthetic correction'},await version())).data.id;
   await bad(mutate({action:'retract',supersedes_id:evidence,reason:'Already replaced'},await version()),'EVIDENCE_CONFLICT');
   const r=await read();assert.equal(r.history.find(x=>x.id===evidence).corrected_by,correction);assert.equal(r.needs[0].id,need);assert.equal(r.history.find(x=>x.id===correction).message_id,null);
  });
  await check('Chat session current Contact field tenant and source outage denial',async()=>{
   for(const key of ['contact_id','channel','channel_id','page_id','attribution','text'])await field(f.object,key,['read'],async()=>bad(call(request()),'FIELD_FORBIDDEN'));
   await setRole(grants.filter(g=>g.resource!=='contact'));try{await bad(call(request()),'NOT_FOUND');}finally{await setRole(grants);}
   await bad(call({...request(),tenant_id:other}),'NOT_FOUND');await bad(call(request(ops.read,{session:randomUUID()})),'NOT_FOUND');
   const port=crmServer.address().port;crmServer.closeAllConnections();await new Promise(r=>crmServer.close(r));try{await bad(call(request()),'DEPENDENCY_UNAVAILABLE');}finally{crmServer.listen(port,'127.0.0.1');await once(crmServer,'listening');}
  });
  await check('Chat session closed stage denial late evidence and immutable contributor ownership',async()=>{
   await chatOperator.execute("UPDATE conversation_acquisition_session SET status='closed',closed_at=UTC_TIMESTAMP(6),close_reason='agent_closed',version=version+1 WHERE tenant_id=? AND id=?",[tenant,v.session]);
   await chatOperator.execute("UPDATE conversation SET status='closed',closed_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND record_id=?",[tenant,v.conversation]);await chatOperator.execute('UPDATE crm_record SET owner_principal_id=?,owner_revision=owner_revision+1,version=version+1 WHERE tenant_id=? AND id=?',[f.adminPrincipal,tenant,v.conversation]);
   await bad(mutate({action:'stage',stage_key:process.definition.stages[0].key,reason:'Closed'},await version()),'SESSION_CLOSED');await bad(mutate({action:'need',label:'Closed'},await version()),'SESSION_CLOSED');
   const review=(await mutate({action:'identify_need',label:'Synthetic post-close review'},await version())).data;const [[contribution]]=await chatOperator.execute('SELECT owner_id FROM session_contribution WHERE tenant_id=? AND session_id=? AND source_id=?',[tenant,v.session,review.id]);assert.equal(contribution.owner_id,f.principal);
   await mutate({action:'retract',supersedes_id:correction,reason:'Synthetic historical correction'},await version());assert.equal((await read()).status,'closed');await bad(mutate({action:'record',need_id:need,milestone_key:process.definition.milestones[0].key,occurred_at:new Date(Date.now()+86400000).toISOString(),reason:'Future'},await version()),'EVIDENCE_TIME_OUTSIDE_SESSION');
  });
  await check('Chat session stale local snapshot and native logout before commit',async()=>{
   const contact=peers.contact;peers.contact=async(...args)=>{const r=await contact(...args);await chatOperator.execute('UPDATE crm_record SET version=version+1 WHERE tenant_id=? AND id=?',[tenant,v.conversation]);return r;};try{await bad(call(request()),'STALE_VERSION');}finally{peers.contact=contact;}
   const session=await ctx.login(f.account),enrolled=await new HumanDispatchEnrollment(ctx.ds).enroll(tenant,createHash('sha256').update(session).digest('hex')),req=request(ops.write,{body:{action:'identify_need',label:'Synthetic revoked command'},expected_version:await version(),idempotency_key:randomUUID()});req.actor.delegation_id=enrolled.delegationId;const before=await version();
   peers.contact=async(...args)=>{const r=await contact(...args);await ctx.drainingAuth.logout(session,'http://localhost:18080',await ctx.auth.csrf(session));return r;};try{await bad(call(req),'INVALID_TRANSITION');}finally{peers.contact=contact;}assert.equal(await version(),before);
  });
  await check('Chat session public session CSRF ETag strict query and retained receipt',async()=>{
   const publicServer=createChatSessionProgressBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),call);servers.push(publicServer);publicServer.listen(0,'127.0.0.1');await once(publicServer,'listening');const root='http://127.0.0.1:'+publicServer.address().port,url=root+'/api/v1/conversations/'+v.conversation+'/sessions/'+v.session+'/progress',headers={'x-tenant-id':tenant,cookie:'crm_session='+ctx.actorSession};assert.equal((await fetch(url,{headers:{'x-tenant-id':tenant}})).status,401);
   const readResponse=await fetch(url,{headers});assert.equal(readResponse.status,200);assert.equal(readResponse.headers.get('cache-control'),'no-store');const current=(await readResponse.json()).data.version;assert.equal(readResponse.headers.get('etag'),'"'+current+'"');
   const mutation={method:'POST',headers:{...headers,origin:'http://localhost:18080','content-type':'application/json','idempotency-key':randomUUID(),'if-match':'"'+current+'"'},body:JSON.stringify({action:'identify_need',label:'Synthetic public progress'})};assert.equal((await fetch(url,mutation)).status,403);mutation.headers['x-csrf-token']=await ctx.auth.csrf(ctx.actorSession);const response=await fetch(url,mutation);assert.equal(response.status,200);const result=await response.json();assert.equal(response.headers.get('etag'),'"'+result.data.version+'"');assert.deepEqual(await (await fetch(url,mutation)).json(),result);
   for(const query of ['?limit=2','?before_revision=1&before_revision=2'])assert.equal((await fetch(url+query,{headers})).status,400);assert.equal((await fetch(root+'/api/v1/session-process',{headers})).status,200);
   const invalidProcess=structuredClone(process.definition);invalidProcess.stages[0].key='won';const invalid=await fetch(root+'/api/v1/session-process',{...mutation,body:JSON.stringify(invalidProcess)});assert.equal(invalid.status,422);assert.equal((await invalid.json()).error.code,'INVALID_PROCESS');
   assert(stageReceipt&&stageKey);const [[counts]]=await chatOperator.execute("SELECT COUNT(*) n FROM outbox_event WHERE tenant_id=? AND aggregate_id=? AND event_type='session.progress_changed'",[tenant,v.session]);assert(Number(counts.n)>=7);
  });
  await check('Chat session retained legacy receipt and no duplicate historical effect',async()=>{
   const body={action:'identify_need',label:'Synthetic imported receipt'},current=await version(),key=randomUUID(),result={data:{id:need,session_id:v.session,version:current,action:'identify_need'},meta:{correlation_id:randomUUID()}},route=`POST /api/v1/conversations/${v.conversation}/sessions/${v.session}/progress`;
   await chatOperator.execute("INSERT INTO idempotency_record(id,tenant_id,actor_kind,actor_id,route_key,`key`,request_hash,status,response_status,response_body,created_at,updated_at,expires_at) VALUES (?,?,'human',?,?,?,?,'completed',200,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),TIMESTAMPADD(DAY,7,UTC_TIMESTAMP(6)))",[randomUUID(),tenant,f.principal,route,key,ownerDigest({body,version:current}),JSON.stringify(result)]);
   const [[before]]=await chatOperator.execute('SELECT COUNT(*) n FROM session_need WHERE tenant_id=? AND session_id=?',[tenant,v.session]);assert.deepEqual(await mutate(body,current,key),result);assert.equal(await version(),current);const [[after]]=await chatOperator.execute('SELECT COUNT(*) n FROM session_need WHERE tenant_id=? AND session_id=?',[tenant,v.session]);assert.equal(after.n,before.n);
  });
 }finally{await operator.execute('UPDATE membership SET seat_code=? WHERE tenant_id=? AND id=?',[seat.seat_code,tenant,f.member]);await setRole(ctx.grants);await pool.end();}
}
