import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {once} from 'node:events';
import {createPool} from './chat-native.mjs';
import {outcomeCandidateSchema} from './chat-outcome-schema.mjs';
import {ChatNeedOutcomeWriter,chatNeedOutcomeRoutes} from '../../services/chat/dist/need-outcome.js';
import {NativeNeedOutcomeWriter,needOutcomeWriterRoutes} from '../../services/core-baseline/dist/modules/sales/owner-need-outcome.js';
import {createChatSessionProgressBff} from '../../services/core-baseline/dist/gateway/chat-session-progress-bff.js';
import {HumanDispatchEnrollment} from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';
import {createWorkloadServer,ownerClient,ownerCommandClient,remoteRegistryAuthority,ownerDigest} from '../../packages/workload-transport/dist/index.js';

export async function chatNeedOutcomeNative(ctx){
 const {check,operator,chatOperator,chatPool,commands,tenant,other,f,ref,chatMaterial,bffMaterial,salesMaterial,chatAuthority,registryConfig,protocol,servers,env,chatServer,projectionObjects,v,version,mutate,request,setRole,field,grants}=ctx;
 await outcomeCandidateSchema(operator,ref.crmPassword,process.argv.includes('--provision'));
 const pool=createPool({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),database:ref.database,user:'t05_sales_outcome_test',password:ref.crmPassword,timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true});
 const authority=remoteRegistryAuthority(salesMaterial,registryConfig),proof=ownerClient(salesMaterial,authority,'chat',new URL(protocol+'//127.0.0.1:'+chatServer.address().port+'/')),identity=ownerClient(salesMaterial,authority,'identity',new URL('/',registryConfig.url));
 const sourcePeers={policy:(t,input)=>identity(t,'admission-outcome-link-policy',input)};const source=new NativeNeedOutcomeWriter(pool,(t,command)=>proof(t,'command-proof',command),(t,input)=>sourcePeers.policy(t,input));
 const salesServer=createWorkloadServer(salesMaterial,authority,needOutcomeWriterRoutes(source));servers.push(salesServer);salesServer.listen(0,'127.0.0.1');await once(salesServer,'listening');
 const sales=ownerClient(chatMaterial,chatAuthority,'sales',new URL(protocol+'//127.0.0.1:'+salesServer.address().port+'/'));
 const peers={admit:ctx.peers.admit,settle:ctx.peers.settle,contact:ctx.peers.contact,inspect:(t,command,admission_id)=>sales(t,'outcome-link-inspect',{command,admission_id}),apply:(t,command)=>sales(t,'outcome-link-apply',command),abort:(t,command)=>sales(t,'outcome-link-abort',command)};
 const writer=new ChatNeedOutcomeWriter(commands,peers);ctx.setOutcomeRecovery((t,command)=>writer.recover(t,command));
 const [unfinished]=await operator.execute("SELECT barrier_id FROM identity_account_gate WHERE account_id=? AND state='closing'",[f.account]);for(const barrier of unfinished){await ctx.accountDrain.drain({accountId:f.account,barrierId:barrier.barrier_id});console.log('PASS retained native outcome account drain recovered through terminal Sales proof');}
 const server=createWorkloadServer(chatMaterial,chatAuthority,chatNeedOutcomeRoutes(writer));servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');
 const call=ownerCommandClient(bffMaterial,remoteRegistryAuthority(bffMaterial,registryConfig),'chat',new URL(protocol+'//127.0.0.1:'+server.address().port+'/'));
 const requestLink=(record_id,expected_version,key=randomUUID())=>request('need-post-outcome',{body:{record_id},expected_version,idempotency_key:key}),link=(record,ver,key)=>call(requestLink(record,ver,key)),bad=(p,code)=>assert.rejects(p,e=>e.code===code),objects=projectionObjects.get(tenant);
 const count=async id=>Number((await operator.execute('SELECT COUNT(*) n FROM sales_need_outcome WHERE tenant_id=? AND need_id=? AND record_id=?',[tenant,v.need,id]))[0][0].n);
 async function record(kind='lead',contact=ref.contact,session=v.session){const id=randomUUID();await operator.execute('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[id,tenant,objects[kind],f.principal]);if(kind==='lead')await operator.execute('INSERT INTO `lead`(tenant_id,record_id,contact_id) VALUES (?,?,?)',[tenant,id,contact]);else await operator.execute("INSERT INTO deal(tenant_id,record_id,contact_id,title,amount,currency) VALUES (?,?,?,'Synthetic outcome',0,'VND')",[tenant,id,contact]);await operator.execute("INSERT INTO sales_session_context(tenant_id,id,record_id,conversation_id,session_id,actor_id,kind,recorded_at) VALUES (?,?,?,?,?,?,'follow_up',UTC_TIMESTAMP(6))",[tenant,randomUUID(),id,v.conversation,session,f.principal]);return id;}
 if(process.argv.includes('--outcomes-only'))await chatOperator.execute("UPDATE conversation_acquisition_session SET status='closed',close_reason='agent_closed',closed_at=UTC_TIMESTAMP(6),version=version+1 WHERE tenant_id=? AND id=?",[tenant,v.session]);
 const lead=await record(),deal=await record('deal');let receipt,receiptKey,receiptVersion;
 try{
  await check('Chat need outcome actual Lead closed-session link receipt and isolated grants',async()=>{
   receiptVersion=await version();receiptKey=randomUUID();receipt=await link(lead,receiptVersion,receiptKey);assert.equal(receipt.data.version,receiptVersion);assert.equal(await version(),receiptVersion);assert.equal(await count(lead),1);assert.deepEqual(await link(lead,receiptVersion,receiptKey),receipt);
   await assert.rejects(pool.query('SELECT * FROM test_crm_chat_owner.need_assessment LIMIT 1'));await assert.rejects(chatPool.query('SELECT * FROM native_identity_test.lead LIMIT 1'));await assert.rejects(pool.query('SELECT * FROM auth_session LIMIT 1'));await assert.rejects(pool.execute('UPDATE crm_record SET version=version WHERE tenant_id=? AND id=?',[tenant,lead]));
   const [[persisted]]=await pool.execute('SELECT command_id FROM sales_owner_command WHERE tenant_id=? AND resource_id=? LIMIT 1',[tenant,lead]);const [plan]=await pool.execute('EXPLAIN SELECT state FROM sales_owner_command WHERE tenant_id=? AND command_id=?',[tenant,persisted.command_id]);assert.equal(plan[0].key,'PRIMARY');
  });
  await check('Chat need outcome duplicate concurrent keys preserve one natural link',async()=>{
   const target=await record(),key=randomUUID(),ver=await version(),results=await Promise.all([link(target,ver,key),link(target,ver,key)]);assert.deepEqual(results[0],results[1]);await link(target,ver);assert.equal(await count(target),1);await bad(link(deal,ver,key),'FORBIDDEN');await bad(link(lead,ver,key),'IDEMPOTENCY_CONFLICT');
   await bad(link(lead,String(BigInt(ver)+1n),receiptKey),'VERSION_CONFLICT');await bad(call({...requestLink(lead,ver),tenant_id:other}),'NOT_FOUND');await bad(link(lead,null),'PRECONDITION_REQUIRED');
  });
  await check('Chat need outcome current Sales Contact Conversation fields and replay rights',async()=>{
   for(const name of ['text','contact_id'])await field(f.object,name,['read'],()=>bad(link(lead,receiptVersion,receiptKey),'FIELD_FORBIDDEN'));
   await field(objects.lead,'contact_id',['read'],()=>bad(link(lead,receiptVersion,receiptKey),'FORBIDDEN'));
   for(const reject of [g=>g.resource==='lead'&&g.action==='read',g=>g.resource==='lead'&&g.action==='qualify',g=>g.resource==='conversation'&&g.action==='update']){await setRole(grants.filter(g=>!reject(g)));try{await bad(link(lead,receiptVersion,receiptKey),'FORBIDDEN');}finally{await setRole(grants);}}
   await setRole(grants.filter(g=>g.resource!=='contact'));try{await bad(link(lead,receiptVersion,receiptKey),'NOT_FOUND');}finally{await setRole(grants);}
  });
  await check('Chat need outcome Deal requires Sales capability and current same Contact context',async()=>{
   const ver=await version();await bad(link(deal,ver),'FORBIDDEN');const [[member]]=await operator.execute('SELECT seat_code FROM membership WHERE tenant_id=? AND id=?',[tenant,f.member]);await operator.execute("UPDATE membership SET seat_code='admin',version=version+1 WHERE tenant_id=? AND id=?",[tenant,f.member]);try{await link(deal,ver);assert.equal(await count(deal),1);}finally{await operator.execute('UPDATE membership SET seat_code=?,version=version+1 WHERE tenant_id=? AND id=?',[member.seat_code,tenant,f.member]);}
   const contact=randomUUID();await operator.execute('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[contact,tenant,objects.contact,f.principal]);await operator.execute("INSERT INTO contact(tenant_id,record_id,display_name) VALUES (?,?,'Synthetic unrelated outcome')",[tenant,contact]);const foreign=await record('lead',contact),otherSession=await record('lead',ref.contact,randomUUID());await bad(link(foreign,ver),'OUTCOME_BINDING_MISMATCH');await bad(link(otherSession,ver),'OUTCOME_BINDING_MISMATCH');
  });
  await check('Chat need outcome immutable Sales source race aborts without link',async()=>{
   const target=await record(),ver=await version(),apply=peers.apply;
   peers.apply=async(...args)=>{await operator.execute('UPDATE crm_record SET version=version+1 WHERE tenant_id=? AND id=?',[tenant,target]);return apply(...args);};try{await bad(link(target,ver),'STALE_VERSION');}finally{peers.apply=apply;}assert.equal(await count(target),0);
  });
  await check('Chat need outcome lost Sales ACK recovers committed link and original public receipt',async()=>{
   const target=await record(),ver=await version(),key=randomUUID(),apply=peers.apply;peers.apply=async(...args)=>{await apply(...args);const e=new Error('Synthetic ACK loss');e.code='DEPENDENCY_UNAVAILABLE';throw e;};try{await bad(link(target,ver,key),'DEPENDENCY_UNAVAILABLE');}finally{peers.apply=apply;}assert.equal((await link(target,ver,key)).data.version,ver);assert.equal(await count(target),1);assert.equal(await version(),ver);
  });
  await check('Chat need outcome abort tombstone rejects delayed apply and terminal key reuse',async()=>{
   const target=await record(),ver=await version(),key=randomUUID(),apply=peers.apply;let ref;
   peers.apply=async(t,command)=>{ref=command;return peers.abort(t,command);};try{await bad(link(target,ver,key),'INVALID_TRANSITION');}finally{peers.apply=apply;}await bad(link(target,ver,key),'INVALID_TRANSITION');await bad(apply(tenant,ref),'FORBIDDEN');assert.equal(await count(target),0);
  });
  await check('Chat need outcome in-flight authorized apply loses to permanent abort receipt',async()=>{
   const target=await record(),ver=await version(),key=randomUUID(),policy=sourcePeers.policy;let crossed=false;
   sourcePeers.policy=async(t,input)=>{const decision=await policy(t,input),p=await commands.proof(t,input.command);if(p.binding.operation==='need-outcome-effect'){crossed=true;assert.equal((await peers.abort(t,input.command)).state,'aborted');}return decision;};try{await bad(link(target,ver,key),'INVALID_TRANSITION');}finally{sourcePeers.policy=policy;}assert(crossed);assert.equal(await count(target),0);
  });
  await check('Chat need outcome real outage preserves pending assessment fence and native logout recovery',async()=>{
   const target=await record(),ver=await version(),key=randomUUID(),apply=peers.apply,session=await ctx.login(f.account),enrolled=await new HumanDispatchEnrollment(ctx.ds).enroll(tenant,createHash('sha256').update(session).digest('hex')),req=requestLink(target,ver,key),port=salesServer.address().port;req.actor.delegation_id=enrolled.delegationId;
   peers.apply=async(...args)=>{salesServer.closeAllConnections();await new Promise(r=>salesServer.close(r));return apply(...args);};try{await bad(call(req),'DEPENDENCY_UNAVAILABLE');}finally{peers.apply=apply;}
   try{await bad(mutate({intent:'buy'},ver),'DEPENDENCY_UNAVAILABLE');await assert.rejects(ctx.drainingAuth.logout(session,'http://localhost:18080',await ctx.auth.csrf(session)));}finally{salesServer.listen(port,'127.0.0.1');await once(salesServer,'listening');}
   const [[barrier]]=await operator.execute("SELECT barrier_id,state FROM identity_account_gate WHERE account_id=?",[f.account]);assert.equal(barrier.state,'closing');await ctx.accountDrain.drain({accountId:f.account,barrierId:barrier.barrier_id});await assert.rejects(ctx.auth.session(session));await bad(link(target,ver,key),'INVALID_TRANSITION');assert.equal(await count(target),0);await mutate({intent:'buy'},ver);assert.equal(await version(),String(BigInt(ver)+1n));await bad(link(lead,receiptVersion,receiptKey),'VERSION_CONFLICT');
  });
  await check('Chat need outcome completed logout after Sales commit reconciles before response',async()=>{
   const target=await record(),ver=await version(),key=randomUUID(),apply=peers.apply,session=await ctx.login(f.account),enrolled=await new HumanDispatchEnrollment(ctx.ds).enroll(tenant,createHash('sha256').update(session).digest('hex')),req=requestLink(target,ver,key);req.actor.delegation_id=enrolled.delegationId;
   peers.apply=async(...args)=>{const r=await apply(...args);await ctx.drainingAuth.logout(session,'http://localhost:18080',await ctx.auth.csrf(session));return r;};try{await assert.rejects(call(req),e=>['FORBIDDEN','INVALID_TRANSITION'].includes(e.code));}finally{peers.apply=apply;}assert.equal(await count(target),1);assert.equal((await link(target,ver,key)).data.version,ver);
  });
  await check('Chat need outcome retained legacy receipt is checked under current rights and version',async()=>{
   const ver=await version(),key=randomUUID(),body={record_id:lead},result={data:{thread_id:v.conversation,session_id:v.session,need_id:v.need,version:ver},meta:{correlation_id:randomUUID()}},route=`need-outcome:${v.conversation}:${v.session}:${v.need}`;
   await chatOperator.execute("INSERT INTO idempotency_record(id,tenant_id,actor_kind,actor_id,route_key,`key`,request_hash,status,response_status,response_body,created_at,updated_at,expires_at) VALUES (?,?,'human',?,?,?,?,'completed',200,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),TIMESTAMPADD(DAY,7,UTC_TIMESTAMP(6)))",[randomUUID(),tenant,f.principal,route,key,ownerDigest({body,version:ver}),JSON.stringify(result)]);const replay=await link(lead,ver,key);assert.equal(replay.data.conversation_id,v.conversation);assert(!Object.hasOwn(replay.data,'thread_id'));assert.equal(await count(lead),1);
  });
  await check('Chat need outcome public native CSRF aliases ETag and readonly method rejection',async()=>{
   const publicServer=createChatSessionProgressBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),call);servers.push(publicServer);publicServer.listen(0,'127.0.0.1');await once(publicServer,'listening');const url='http://127.0.0.1:'+publicServer.address().port+'/api/v1/conversations/'+v.conversation+'/sessions/'+v.session+'/needs/'+v.need+'/outcome',ver=await version(),headers={'x-tenant-id':tenant,cookie:'crm_session='+ctx.actorSession,origin:'http://localhost:18080','content-type':'application/json','idempotency-key':randomUUID(),'if-match':'"'+ver+'"'},mutation={method:'POST',headers,body:JSON.stringify({record_id:lead})};assert.equal((await fetch(url,{headers})).status,404);assert.equal((await fetch(url,mutation)).status,403);headers['x-csrf-token']=await ctx.auth.csrf(ctx.actorSession);const response=await fetch(url,mutation);assert.equal(response.status,200);assert.equal(response.headers.get('etag'),'"'+ver+'"');assert.deepEqual(await (await fetch(url.replace('/conversations/','/threads/'),mutation)).json(),await response.json());
  });
 }finally{ctx.setOutcomeRecovery(undefined);await setRole(grants);await pool.end();}
}
