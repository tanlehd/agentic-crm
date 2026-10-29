import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {once} from 'node:events';
import {createPool} from './chat-native.mjs';
import {ChatSessionFunnel,chatSessionFunnelRoutes,sessionFunnelOperation as op} from '../../services/chat/dist/session-funnel.js';
import {advanceSessionClock,ensureSessionProcess,readSessionProcess} from '../../services/chat/dist/session-progress-storage.js';
import {NativeContactSummary,contactSummaryRoutes} from '../../services/core-baseline/dist/modules/crm/owner-contact-summary.js';
import {createChatSessionProgressBff} from '../../services/core-baseline/dist/gateway/chat-session-progress-bff.js';
import {HumanDispatchEnrollment} from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';
import {createWorkloadServer,ownerClient,ownerCommandClient,remoteRegistryAuthority} from '../../packages/workload-transport/dist/index.js';

export async function chatSessionFunnelNative(ctx){
 const {check,operator,chatOperator,chatPool,commands,tenant,other,f,ref,enrollment,identityClient,chatMaterial,bffMaterial,crmMaterial,chatAuthority,registryConfig,protocol,servers,env,chatServer,setRole,field,grants}=ctx;
 const path='.local/chat-ownership/session-funnel-fixture.json';let fixture;try{fixture=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;fixture={tenant,environment:'retained-test',rounds:[]};}assert.equal(fixture.tenant,tenant);assert.equal(fixture.environment,'retained-test');
 const base=Date.UTC(2026,1,1)+fixture.rounds.length*10000,v=Object.fromEntries(['conversation','identity','full','split','partial','none','other','need','need2','splitNeed1','splitNeed2'].map(k=>[k,randomUUID()]));fixture.rounds.push({...v,base});await writeFile(path,JSON.stringify(fixture),{mode:0o600});const at=n=>new Date(base+n).toISOString(),sql=v=>v.replace('T',' ').replace('Z','');
 await operator.execute('INSERT INTO contact_identity(id,tenant_id,connection_id,contact_id,external_subject_id) VALUES (?,?,?,?,?)',[v.identity,tenant,ref.connection,ref.contact,'synthetic-funnel-'+v.identity]);
 await chatOperator.execute('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[v.conversation,tenant,f.object,f.principal]);
 await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at,closed_at) VALUES (?,?,?,?,?,'closed',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[tenant,v.conversation,ref.contact,v.identity,ref.connection]);
 await chatOperator.execute('INSERT INTO chat_control_head(tenant_id,conversation_id,registry_revision,control_revision,cancel_through,pause_through,version,created_at,updated_at) VALUES (?,?,1,1,0,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[tenant,v.conversation]);
 const process=await commands.transaction(tenant,async c=>{await ensureSessionProcess(c,tenant);return readSessionProcess(c,tenant,'1');});assert(process.definition.milestones.length>=2);
 await chatOperator.execute('INSERT IGNORE INTO session_process_version(tenant_id,version,definition,created_at) VALUES (?,2,?,UTC_TIMESTAMP(3))',[tenant,JSON.stringify(process.definition)]);
 let sequence=0;
 async function session(id,opened,coverage='none',version='1'){
  await chatOperator.execute("INSERT INTO conversation_acquisition_session(tenant_id,id,conversation_id,sequence,status,opening_reason,opened_at,opening_occurred_at,closed_at,close_reason,source_classification,source_channel,source_page_id,source_connection_id,policy_version) VALUES (?,?,?,?,'closed','first_inbound',?,?,?,'agent_closed','organic','mock_messenger','synthetic-funnel',?,'inbox_v2')",[tenant,id,v.conversation,++sequence,sql(opened),sql(opened),sql(at(9000)),ref.connection]);
  if(coverage!=='none')await chatOperator.execute('INSERT INTO session_progress(tenant_id,session_id,process_version,stage_key,coverage,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',[tenant,id,version,process.definition.stages[0].key,coverage,sql(opened),sql(opened)]);
 }
 for(const key of ['full','split','partial','none','other'])await session(v[key],at(100),key==='none'?'none':key==='partial'?'partial':'full',key==='other'?'2':'1');
 for(const [id,sid] of [[v.need,v.full],[v.need2,v.full],[v.splitNeed1,v.split],[v.splitNeed2,v.split]])await chatOperator.execute('INSERT INTO session_need(tenant_id,id,session_id,label,created_at,actor_id) VALUES (?,?,?,\'Synthetic funnel need\',?,?)',[tenant,id,sid,sql(at(150)),f.principal]);
 const event=async(sid,need,revision,key,occurred,recorded,kind='record',parent=null)=>{const id=randomUUID();await chatOperator.execute('INSERT INTO session_milestone_event(tenant_id,id,session_id,need_id,revision,milestone_key,kind,supersedes_id,reason,occurred_at,recorded_at,actor_id) VALUES (?,?,?,?,?,?,?,?,\'Synthetic funnel evidence\',?,?,?)',[tenant,id,sid,need,revision,key,kind,parent,sql(occurred),sql(recorded),f.principal]);return id;};
 await event(v.full,v.need,'1',process.definition.milestones[0].key,at(200),at(300));const second=await event(v.full,v.need,'2',process.definition.milestones[1].key,at(250),at(300));await event(v.full,v.need2,'3',process.definition.milestones[0].key,at(200),at(300));
 await event(v.split,v.splitNeed1,'1',process.definition.milestones[0].key,at(200),at(300));await event(v.split,v.splitNeed2,'2',process.definition.milestones[1].key,at(250),at(300));
 const pool=createPool({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),database:ref.database,user:'t05_crm_detail_test',password:ref.crmPassword,timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true}),authority=remoteRegistryAuthority(crmMaterial,registryConfig),proof=ownerClient(crmMaterial,authority,'chat',new URL(protocol+'//127.0.0.1:'+chatServer.address().port+'/')),identity=ownerClient(crmMaterial,authority,'identity',new URL('/',registryConfig.url));
 const contacts=new NativeContactSummary(pool,(t,command)=>proof(t,'command-proof',command),(t,input)=>identity(t,'admission-contact-policy',input),undefined,undefined,(t,input)=>identity(t,'admission-funnel-contact-policy',input));
 const crmServer=createWorkloadServer(crmMaterial,authority,contactSummaryRoutes(contacts));servers.push(crmServer);crmServer.listen(0,'127.0.0.1');await once(crmServer,'listening');const crm=ownerClient(chatMaterial,chatAuthority,'crm',new URL(protocol+'//127.0.0.1:'+crmServer.address().port+'/'));
 const peers={admit:(t,command)=>identityClient(t,'admit',{owner:'chat',command}),settle:(t,command,admission_id)=>identityClient(t,'settle',{owner:'chat',command,admission_id}),policy:(t,command,admission_id)=>identityClient(t,'admission-funnel-policy',{command,admission_id}),contacts:(t,command,admission_id,ids)=>crm(t,'funnel-contact-read',{command,admission_id,ids})};
 const server=createWorkloadServer(chatMaterial,chatAuthority,chatSessionFunnelRoutes(new ChatSessionFunnel(commands,peers)));servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');const call=ownerCommandClient(bffMaterial,remoteRegistryAuthority(bffMaterial,registryConfig),'chat',new URL(protocol+'//127.0.0.1:'+server.address().port+'/'));
 const request=(payload={})=>({schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,operation:op,command_id:randomUUID(),actor:{kind:'human',principal_id:f.principal,delegation_id:enrollment.delegationId},payload:{from:at(0),to:at(1000),process_version:'1',...payload}}),read=async(payload={})=>(await call(request(payload))).data,bad=(p,code)=>assert.rejects(p,e=>e.code===code);let initial;
 try{
  await check('Chat funnel native same-need cohort coverage dedup and own credentials',async()=>{
   initial=await read();assert.equal(initial.sessions,5);assert.equal(initial.denominator,2);assert.deepEqual(initial.coverage,{full:2,partial:1,none:1,other_version:1});assert.deepEqual(initial.steps.map(s=>s.sessions),[2,1]);assert.equal(initial.steps[1].cohort_rate,0.5);assert.equal(initial.scope,'current_authorized_conversations');
   await assert.rejects(chatPool.query('SELECT * FROM native_identity_test.contact LIMIT 1'));await assert.rejects(pool.query('SELECT * FROM test_crm_chat_owner.session_progress LIMIT 1'));
  });
  await check('Chat funnel committed cutoff corrections historical query and zero denominator',async()=>{
   const recorded=await commands.transaction(tenant,c=>advanceSessionClock(c,tenant));assert(Date.parse(recorded)>Date.parse(initial.as_of));await event(v.full,v.need,'4',process.definition.milestones[1].key,at(250),recorded,'retract',second);
   const current=await read();assert.deepEqual(current.steps.map(s=>s.sessions),[2,0]);const old=await read({as_of:initial.as_of});assert.deepEqual(old,initial);
   const earlier=await read({as_of:at(50)});assert.equal(earlier.sessions,0);assert.equal(earlier.denominator,0);assert.equal(earlier.steps[0].cohort_rate,null);
  });
  await check('Chat funnel current record Contact field and tenant rights',async()=>{
   for(const key of ['contact_id','channel','channel_id','page_id','attribution','text'])await field(f.object,key,['read'],async()=>assert.equal((await read()).sessions,0));
   await setRole(grants.filter(g=>g.resource!=='contact'));try{assert.equal((await read()).sessions,0);}finally{await setRole(grants);}
   await setRole(grants.filter(g=>g.resource!=='conversation'));try{await bad(call(request()),'FORBIDDEN');}finally{await setRole(grants);}
   const [[old]]=await operator.execute('SELECT archived_at FROM crm_record WHERE tenant_id=? AND id=?',[tenant,ref.contact]);await operator.execute('UPDATE crm_record SET archived_at=UTC_TIMESTAMP(6),version=version+1 WHERE tenant_id=? AND id=?',[tenant,ref.contact]);try{assert.equal((await read()).sessions,0);}finally{await operator.execute('UPDATE crm_record SET archived_at=?,version=version+1 WHERE tenant_id=? AND id=?',[old.archived_at,tenant,ref.contact]);}
   await bad(call({...request(),tenant_id:other}),'FORBIDDEN');
  });
  await check('Chat funnel strict windows future cutoff and native public session route',async()=>{
   for(const payload of [{from:'2026-02-30T00:00:00.000Z'},{process_version:'0'}])await bad(call(request(payload)),'INVALID_REQUEST');await bad(call(request({to:at(0)})),'INVALID_WINDOW');await bad(call(request({to:at(94*86400000)})),'INVALID_WINDOW');await bad(call(request({as_of:new Date(Date.now()+86400000).toISOString()})),'INVALID_AS_OF');
   const publicServer=createChatSessionProgressBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),call);servers.push(publicServer);publicServer.listen(0,'127.0.0.1');await once(publicServer,'listening');const url='http://127.0.0.1:'+publicServer.address().port+'/api/v1/session-funnel?'+new URLSearchParams(request().payload),headers={'x-tenant-id':tenant,cookie:'crm_session='+ctx.actorSession};assert.equal((await fetch(url,{headers})).status,200);assert.equal((await fetch(url)).status,401);assert.equal((await fetch(url+'&from='+at(0),{headers})).status,400);assert.equal((await fetch(url+'&limit=1',{headers})).status,400);
  });
  await check('Chat funnel owner outage local snapshot race and native logout delivery fence',async()=>{
   const port=crmServer.address().port;crmServer.closeAllConnections();await new Promise(r=>crmServer.close(r));try{await bad(call(request()),'DEPENDENCY_UNAVAILABLE');}finally{crmServer.listen(port,'127.0.0.1');await once(crmServer,'listening');}
   const contact=peers.contacts;peers.contacts=async(...args)=>{const r=await contact(...args);await chatOperator.execute('UPDATE crm_record SET version=version+1 WHERE tenant_id=? AND id=?',[tenant,v.conversation]);return r;};try{await bad(call(request()),'STALE_VERSION');}finally{peers.contacts=contact;}
   const session=await ctx.login(f.account),enrolled=await new HumanDispatchEnrollment(ctx.ds).enroll(tenant,createHash('sha256').update(session).digest('hex')),req=request();req.actor.delegation_id=enrolled.delegationId;peers.contacts=async(...args)=>{const r=await contact(...args);await ctx.drainingAuth.logout(session,'http://localhost:18080',await ctx.auth.csrf(session));return r;};try{await bad(call(req),'FORBIDDEN');}finally{peers.contacts=contact;}
  });
  await check('Chat funnel rejects cohort and fact overflow without truncating retained data',async()=>{
   for(let offset=0;offset<2001;offset+=200){const rows=Array.from({length:Math.min(200,2001-offset)},()=>[tenant,randomUUID(),v.conversation,++sequence,sql(at(2100)),sql(at(2100)),sql(at(9000)),ref.connection]);await chatOperator.query("INSERT INTO conversation_acquisition_session(tenant_id,id,conversation_id,sequence,opened_at,opening_occurred_at,closed_at,source_connection_id,status,opening_reason,close_reason,source_classification,source_channel,source_page_id,policy_version) VALUES "+rows.map(()=>"(?,?,?,?,?,?,?,?,'closed','first_inbound','agent_closed','organic','mock_messenger','synthetic-overflow','inbox_v2')").join(','),rows.flat());}
   await bad(call(request({from:at(2000),to:at(3000)})),'QUERY_TOO_LARGE');
   const sid=randomUUID(),need=randomUUID();await session(sid,at(4100),'full');await chatOperator.execute("INSERT INTO session_need(tenant_id,id,session_id,label,created_at,actor_id) VALUES (?,?,?,'Synthetic fact bound',?,?)",[tenant,need,sid,sql(at(4150)),f.principal]);
   for(let offset=0;offset<20001;offset+=500){const rows=Array.from({length:Math.min(500,20001-offset)},(_,i)=>[tenant,randomUUID(),sid,need,offset+i+1,process.definition.milestones[0].key,sql(at(4200)),sql(at(4300)),f.principal]);await chatOperator.query("INSERT INTO session_milestone_event(tenant_id,id,session_id,need_id,revision,milestone_key,occurred_at,recorded_at,actor_id,kind,reason) VALUES "+rows.map(()=>"(?,?,?,?,?,?,?,?,?,'record','Synthetic bound')").join(','),rows.flat());}
   await bad(call(request({from:at(4000),to:at(5000)})),'QUERY_TOO_LARGE');
  });
 }finally{await setRole(grants);await pool.end();}
}
