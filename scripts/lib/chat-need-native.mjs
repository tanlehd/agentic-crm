import assert from 'node:assert/strict';
import {nativeChatParity} from './chat-runtime-parity.mjs';
import {chatNeedSourceNative} from './chat-need-source-native.mjs';
import {chatSessionSourceNative} from './chat-session-source-native.mjs';
import {chatNeedOutcomeNative} from './chat-need-outcome-native.mjs';
import {ensureSessionProcess,readSessionProcess} from '../../services/chat/dist/session-progress-storage.js';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {once} from 'node:events';
import {createPool,rootSQL} from './chat-native.mjs';
import {ChatNeedAssessments,chatNeedAssessmentRoutes,needOperations as ops} from '../../services/chat/dist/need-assessment.js';
import {NativeCrmOwnerMetadata,crmOwnerMetadataRoutes} from '../../services/core-baseline/dist/modules/crm/owner-metadata.js';
import {NativeContactSummary,contactSummaryRoutes} from '../../services/core-baseline/dist/modules/crm/owner-contact-summary.js';
import {createChatSessionProgressBff} from '../../services/core-baseline/dist/gateway/chat-session-progress-bff.js';
import {HumanDispatchEnrollment} from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';
import {createWorkloadServer,ownerClient,ownerCommandClient,remoteRegistryAuthority,ownerDigest} from '../../packages/workload-transport/dist/index.js';
import {NativeSalesContributions,salesContributionRoutes} from '../../services/core-baseline/dist/modules/sales/owner-contributions.js';

export async function chatNeedNative(ctx){
 const {check,operator,chatOperator,chatPool,commands,tenant,other,f,ref,enrollment,identityClient,chatMaterial,bffMaterial,crmMaterial,chatAuthority,registryConfig,protocol,servers,env,chatServer,setRole,field,projectionObjects}=ctx;
 const path='.local/chat-ownership/need-fixture.json';let fixture;
 try{fixture=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;fixture={tenant,environment:'retained-test',rounds:[]};}
 assert.equal(fixture.tenant,tenant);assert.equal(fixture.environment,'retained-test');const v=Object.fromEntries(['conversation','identity','session','need'].map(k=>[k,randomUUID()]));fixture.rounds.push(v);await writeFile(path,JSON.stringify(fixture),{mode:0o600});
 await operator.execute('INSERT INTO contact_identity(id,tenant_id,connection_id,contact_id,external_subject_id) VALUES (?,?,?,?,?)',[v.identity,tenant,ref.connection,ref.contact,'synthetic-need-'+v.identity]);
 await chatOperator.execute('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[v.conversation,tenant,f.object,f.principal]);
 await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at) VALUES (?,?,?,?,?,'open',UTC_TIMESTAMP(6))",[tenant,v.conversation,ref.contact,v.identity,ref.connection]);
 await chatOperator.execute('INSERT INTO chat_control_head(tenant_id,conversation_id,registry_revision,control_revision,cancel_through,pause_through,version,created_at,updated_at) VALUES (?,?,1,1,0,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[tenant,v.conversation]);
 await chatOperator.execute("INSERT INTO conversation_acquisition_session(tenant_id,id,conversation_id,sequence,status,opening_reason,opened_at,opening_occurred_at,source_classification,source_channel,source_page_id,source_connection_id,policy_version) VALUES (?,?,?,1,'active','first_inbound',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'organic','mock_messenger','synthetic-need',?,'inbox_v2')",[tenant,v.session,v.conversation,ref.connection]);
 await ensureSessionProcess(chatOperator,tenant);const processDefinition=await readSessionProcess(chatOperator,tenant);await chatOperator.execute("INSERT INTO session_progress(tenant_id,session_id,process_version,stage_key,coverage,created_at,updated_at) VALUES (?,?,?,?,'partial',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[tenant,v.session,processDefinition.version,processDefinition.definition.stages[0].key]);
 await chatOperator.execute("INSERT INTO session_need(tenant_id,id,session_id,label,created_at,actor_id) VALUES (?,?,?,'Synthetic Human need',UTC_TIMESTAMP(6),?)",[tenant,v.need,v.session,f.principal]);
 const object=projectionObjects.get(tenant).conversation_need,types=['string','decimal','integer','boolean','date','datetime','enum','text'];
 let added=false;for(const type of types){const key='candidate_'+type;const [[old]]=await operator.execute('SELECT id FROM property_definition WHERE tenant_id=? AND object_type_id=? AND `key`=?',[tenant,object,key]);if(!old){await operator.execute('INSERT INTO property_definition(id,tenant_id,object_type_id,`key`,label,type,required,default_value,options,indexed,`sensitive`,created_at,updated_at) VALUES (?,?,?,?,?,?,0,NULL,?,0,0,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[randomUUID(),tenant,object,key,'Synthetic '+type,type,type==='enum'?'["alpha","beta"]':null]);added=true;}}
 if(added)await operator.execute('UPDATE object_type SET schema_version=schema_version+1,version=version+1 WHERE tenant_id=? AND id=?',[tenant,object]);
 const mf=JSON.parse(await readFile('.local/chat-ownership/crm-metadata-fixture.json','utf8'));assert.equal(mf.database,'native_identity_test');assert.equal(mf.tenant,tenant);
 const pool=createPool({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),database:ref.database,user:'t05_crm_detail_test',password:ref.crmPassword,timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true}),metadataPool=createPool({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),database:mf.database,user:'crm_owner_test_runtime',password:mf.runtime,timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true});
 const authority=remoteRegistryAuthority(crmMaterial,registryConfig),proof=ownerClient(crmMaterial,authority,'chat',new URL(protocol+'//127.0.0.1:'+chatServer.address().port+'/')),identity=ownerClient(crmMaterial,authority,'identity',new URL('/',registryConfig.url));
 const metadata=new NativeCrmOwnerMetadata(metadataPool,(t,command,abort)=>proof(t,abort?'command-abort':'command-proof',command)),contacts=new NativeContactSummary(pool,(t,command)=>proof(t,'command-proof',command),(t,input)=>identity(t,'admission-contact-policy',input),undefined,(t,input)=>identity(t,'admission-session-contact-policy',input));
 const crmServer=createWorkloadServer(crmMaterial,authority,{...crmOwnerMetadataRoutes(metadata),...contactSummaryRoutes(contacts)});servers.push(crmServer);crmServer.listen(0,'127.0.0.1');await once(crmServer,'listening');
 const crm=ownerClient(chatMaterial,chatAuthority,'crm',new URL(protocol+'//127.0.0.1:'+crmServer.address().port+'/')),reference=(command,snapshot)=>({command,resource_id:snapshot.object_type_id,kind:'metadata',expected_revision:snapshot.schema_revision,reservation_id:null});
 const peers={metadata:t=>crm(t,'need-metadata-read',{schema_revision:null}),reserve:(t,command,snapshot)=>crm(t,'reference-reserve',reference(command,snapshot)),release:(t,command,snapshot)=>crm(t,'reference-release',reference(command,snapshot)),admit:(t,command)=>identityClient(t,'admit',{owner:'chat',command}),settle:(t,command,admission_id)=>identityClient(t,'settle',{owner:'chat',command,admission_id}),policy:(t,command,admission_id)=>identityClient(t,'admission-need-policy',{command,admission_id}),contact:(t,command,admission_id)=>crm(t,'session-contact-read',{command,admission_id})};
 if(process.argv.includes('--provision'))rootSQL(`GRANT SELECT ON native_identity_test.sales_need_outcome TO 't05_sales_contribution_test'@'%';`);
 const salesPool=createPool({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),database:ref.database,user:'t05_sales_contribution_test',password:ref.crmPassword,timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true});
 const salesAuthority=remoteRegistryAuthority(ctx.salesMaterial,registryConfig),salesProof=ownerClient(ctx.salesMaterial,salesAuthority,'chat',new URL(protocol+'//127.0.0.1:'+chatServer.address().port+'/')),salesIdentity=ownerClient(ctx.salesMaterial,salesAuthority,'identity',new URL('/',registryConfig.url));
 const sales=new NativeSalesContributions(salesPool,(t,command)=>salesProof(t,'command-proof',command),(t,input)=>salesIdentity(t,'admission-contribution-sales-policy',input),(t,input)=>salesIdentity(t,'admission-need-outcomes-policy',input));
 const salesServer=createWorkloadServer(ctx.salesMaterial,salesAuthority,salesContributionRoutes(sales));servers.push(salesServer);salesServer.listen(0,'127.0.0.1');await once(salesServer,'listening');
 const salesClient=ownerClient(chatMaterial,chatAuthority,'sales',new URL(protocol+'//127.0.0.1:'+salesServer.address().port+'/'));peers.outcomes=(t,command,admission_id)=>salesClient(t,'need-outcomes-list',{command,admission_id});
 const server=createWorkloadServer(chatMaterial,chatAuthority,chatNeedAssessmentRoutes(new ChatNeedAssessments(commands,peers)));servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');const call=ownerCommandClient(bffMaterial,remoteRegistryAuthority(bffMaterial,registryConfig),'chat',new URL(protocol+'//127.0.0.1:'+server.address().port+'/'));
 const request=(op=ops.read,payload={})=>({schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,operation:op,command_id:randomUUID(),actor:{kind:'human',principal_id:f.principal,delegation_id:enrollment.delegationId},payload:{conversation:v.conversation,session:v.session,need:v.need,...payload}}),bad=(p,code)=>assert.rejects(p,e=>e.code===code),read=async()=> (await call(request())).data,version=async()=> (await read()).version,mutate=(values,expected_version,key=randomUUID(),release_pins=[])=>call(request(ops.write,{body:{values,release_pins},expected_version,idempotency_key:key}));
 const grants=[...ctx.grants,{resource:'conversation',action:'update',scope:'all'},{resource:'lead',action:'read',scope:'all'},{resource:'lead',action:'qualify',scope:'all'},{resource:'deal',action:'read',scope:'all'},{resource:'deal',action:'update',scope:'all'}];await setRole(grants);let receipt,key;
 const objects=projectionObjects.get(tenant),ids={lead:randomUUID(),deal:randomUUID()};
 for(const kind of ['lead','deal']){await operator.execute('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[ids[kind],tenant,objects[kind],f.principal]);await operator.execute("INSERT INTO sales_session_context(tenant_id,id,record_id,conversation_id,session_id,actor_id,kind,recorded_at) VALUES (?,?,?,?,?,?,'follow_up',UTC_TIMESTAMP(6))",[tenant,randomUUID(),ids[kind],v.conversation,v.session,f.principal]);}
 try{
  if(process.argv.includes('--source-only')){
   await mutate({assessment_status:'assessed',need_clarity:'clear',intent:'buy',product_interest:'Synthetic product',unresolved_reason:'Synthetic question',candidate_string:'Hidden custom'},'0');
   await chatOperator.execute("UPDATE conversation_acquisition_session SET status='closed',close_reason='agent_closed',closed_at=UTC_TIMESTAMP(6),version=version+1 WHERE tenant_id=? AND id=?",[tenant,v.session]);
   if(process.argv.includes('--with-session-source'))await chatSessionSourceNative({...ctx,v,peers,crmServer});
   else await chatNeedSourceNative({...ctx,v,peers,version,crmServer});return;
  }
  await check('Chat need native defaults custom metadata scalar edits pins and own credentials',async()=>{
   const r=await read();assert.equal(r.version,'0');assert.equal(r.can_edit,true);assert.equal(r.values.assessment_status,'unassessed');assert.equal(r.definitions.length,13);assert.equal(r.outcomes.length,2);
   const values={assessment_status:'assessed',need_clarity:'clear',intent:'buy',product_interest:'Synthetic product',unresolved_reason:'Synthetic question',candidate_string:'Synthetic',candidate_decimal:'123.450',candidate_integer:3,candidate_boolean:true,candidate_date:'2026-01-01',candidate_datetime:'2026-01-01T00:00:00Z',candidate_enum:'alpha',candidate_text:'Synthetic need'};
   await mutate(values,'0');const result=await read();assert.deepEqual(result.values,values);assert.deepEqual(result.pinned,Object.keys(values));assert.equal(result.history.length,1);
   await assert.rejects(chatPool.query('SELECT * FROM native_identity_test.sales_need_outcome LIMIT 1'));await assert.rejects(salesPool.query('SELECT * FROM test_crm_chat_owner.need_assessment LIMIT 1'));await assert.rejects(metadataPool.query('SELECT * FROM auth_session LIMIT 1'));
  });
  await check('Chat need Human pin release null removal preserved proposal validation and CAS',async()=>{
   for(const values of [{missing_field:1},{intent:null}])await bad(mutate(values,await version()),'INVALID_NEED_VALUES');
   for(const values of [{candidate_integer:1.5},{candidate_decimal:2},{candidate_date:'2026-02-30'},{intent:'invalid'}])await bad(mutate(values,await version()),'VALIDATION_FAILED');
   await bad(mutate({},await version()),'INVALID_REQUEST');await bad(mutate({},await version(),randomUUID(),['missing']),'INVALID_REQUEST');
   const proposal={values:{intent:'research',candidate_string:'Synthetic proposal'},confidence:0.7,evidence_ids:[],provider:'retained-synthetic',model:'retained-synthetic',config_version:'1',input_fingerprint:'synthetic',assessed_at:'2026-01-01T00:00:00.000Z'};
   await chatOperator.execute('UPDATE need_assessment SET proposal_json=? WHERE tenant_id=? AND need_id=?',[JSON.stringify(proposal),tenant,v.need]);
   const current=await version();key=randomUUID();const values={candidate_string:'Synthetic updated',candidate_boolean:null};const results=await Promise.all([mutate(values,current,key,['intent','candidate_string']),mutate(values,current,key,['intent','candidate_string'])]);assert.deepEqual(results[0],results[1]);receipt={result:results[0],values,version:current,release:['intent','candidate_string']};
   const r=await read();assert(!Object.hasOwn(r.values,'candidate_boolean'));assert(!r.pinned.includes('intent'));assert(r.pinned.includes('candidate_string'));assert.deepEqual(r.proposal,proposal);
   await bad(mutate({candidate_string:'Different'},current,key),'IDEMPOTENCY_CONFLICT');await bad(mutate(values,current),'VERSION_CONFLICT');assert.equal(r.history.length,2);
  });
  await check('Chat need current field rights redact values pins proposal history and replay',async()=>{
   await field(object,'candidate_string',['read'],async()=>{const r=await read();assert(!Object.hasOwn(r.values,'candidate_string'));assert(!r.definitions.some(d=>d.key==='candidate_string'));assert(!r.pinned.includes('candidate_string'));assert(!Object.hasOwn(r.proposal.values,'candidate_string'));assert(r.history.every(h=>!Object.hasOwn(h.values,'candidate_string')&&!Object.hasOwn(h.proposal.values,'candidate_string')));await bad(mutate(receipt.values,receipt.version,key,receipt.release),'FIELD_FORBIDDEN');});
   await field(object,'intent',['write'],async()=>{const r=await read();assert.equal(r.definitions.find(d=>d.key==='intent').can_write,false);await bad(mutate({intent:'support'},r.version),'FIELD_FORBIDDEN');});
   for(const name of ['contact_id','text'])await field(f.object,name,['read'],()=>bad(call(request()),'FIELD_FORBIDDEN'));
   await setRole(grants.filter(g=>!(g.resource==='conversation'&&g.action==='update')));try{assert.equal((await read()).can_edit,false);await bad(mutate(receipt.values,receipt.version,key,receipt.release),'FORBIDDEN');}finally{await setRole(grants);}
  });
  await check('Chat need Sales visibility link eligibility and exact need context',async()=>{
   await operator.execute('INSERT INTO sales_need_outcome(tenant_id,need_id,record_id,conversation_id,session_id,actor_id,created_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6))',[tenant,v.need,ids.lead,v.conversation,v.session,f.principal]);
   let r=await read();assert.equal(r.outcomes.find(x=>x.id===ids.lead).linked,true);assert.equal(r.outcomes.find(x=>x.id===ids.lead).can_link,true);
   await setRole(grants.filter(g=>!(g.resource==='lead'&&g.action==='qualify')));try{assert.equal((await read()).outcomes.find(x=>x.id===ids.lead).can_link,false);}finally{await setRole(grants);}
   await setRole(grants.filter(g=>g.resource!=='deal'));try{assert.deepEqual((await read()).outcomes.map(x=>x.id),[ids.lead]);}finally{await setRole(grants);}
   await field(objects.lead,'contact_id',['read'],async()=>assert((await read()).outcomes.some(x=>x.id===ids.lead)));
   await operator.execute('UPDATE crm_record SET archived_at=UTC_TIMESTAMP(6),version=version+1 WHERE tenant_id=? AND id=?',[tenant,ids.deal]);try{assert.equal((await read()).outcomes.length,1);}finally{await operator.execute('UPDATE crm_record SET archived_at=NULL,version=version+1 WHERE tenant_id=? AND id=?',[tenant,ids.deal]);}
   await bad(call({...request(),tenant_id:other}),'NOT_FOUND');for(const payload of [{session:randomUUID()},{need:randomUUID()},{conversation:randomUUID()}])await bad(call(request(ops.read,payload)),'NOT_FOUND');
  });
  await check('Chat need current Contact and real CRM Sales owner outage fail closed',async()=>{
   await setRole(grants.filter(g=>g.resource!=='contact'));try{await bad(call(request()),'NOT_FOUND');}finally{await setRole(grants);}
   for(const source of [crmServer,salesServer]){const port=source.address().port;source.closeAllConnections();await new Promise(r=>source.close(r));try{await bad(call(request()),'DEPENDENCY_UNAVAILABLE');}finally{source.listen(port,'127.0.0.1');await once(source,'listening');}}
  });
  await check('Chat need metadata reservation drain and local snapshot race block commit',async()=>{
   const reserve=peers.reserve,contact=peers.contact,current=await version();let barrier;
   peers.reserve=async(t,command,snapshot)=>{await operator.execute('UPDATE object_type SET schema_version=schema_version+1,version=version+1 WHERE tenant_id=? AND id=?',[tenant,object]);return reserve(t,command,snapshot);};try{await bad(call(request()),'STALE_VERSION');}finally{peers.reserve=reserve;}
   peers.contact=async(...args)=>{const result=await contact(...args);barrier=randomUUID();assert.equal((await metadata.close(tenant,object,barrier)).state,'drained');return result;};try{await bad(mutate({candidate_integer:8},current),'FORBIDDEN');}finally{peers.contact=contact;if(barrier)await metadata.cancelClose(tenant,object,barrier);}
   peers.contact=async(...args)=>{const r=await contact(...args);await chatOperator.execute('UPDATE crm_record SET version=version+1 WHERE tenant_id=? AND id=?',[tenant,v.conversation]);return r;};try{await bad(call(request()),'STALE_VERSION');}finally{peers.contact=contact;}assert.equal(await version(),current);
  });
  await check('Chat need completed native logout prevents Human assessment effect',async()=>{
   const current=await version(),contact=peers.contact,session=await ctx.login(f.account),enrolled=await new HumanDispatchEnrollment(ctx.ds).enroll(tenant,createHash('sha256').update(session).digest('hex')),req=request(ops.write,{body:{values:{candidate_integer:9}},expected_version:current,idempotency_key:randomUUID()});req.actor.delegation_id=enrolled.delegationId;
   peers.contact=async(...args)=>{const r=await contact(...args);await ctx.drainingAuth.logout(session,'http://localhost:18080',await ctx.auth.csrf(session));return r;};try{await bad(call(req),'FORBIDDEN');}finally{peers.contact=contact;}assert.equal(await version(),current);
  });
  await check('Chat need native public session CSRF ETag strict queries and legacy alias'+(process.argv.includes('--with-runtime')?' runtime':''),async()=>{
   const candidate=process.argv.includes('--with-runtime')?await nativeChatParity(ctx,{crm:new URL(protocol+'//127.0.0.1:'+crmServer.address().port+'/'),sales:new URL(protocol+'//127.0.0.1:'+salesServer.address().port+'/')}):null;
   try{
   const publicServer=createChatSessionProgressBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),candidate?.call??call);servers.push(publicServer);publicServer.listen(0,'127.0.0.1');await once(publicServer,'listening');const url='http://127.0.0.1:'+publicServer.address().port+'/api/v1/conversations/'+v.conversation+'/sessions/'+v.session+'/needs/'+v.need+'/assessment',headers={'x-tenant-id':tenant,cookie:'crm_session='+ctx.actorSession};assert.equal((await fetch(url,{headers:{'x-tenant-id':tenant}})).status,401);
   const response=await fetch(url,{headers}),current=(await response.json()).data.version;assert.equal(response.status,200);assert.equal(response.headers.get('etag'),'"'+current+'"');
   const mutation={method:'POST',headers:{...headers,origin:'http://localhost:18080','content-type':'application/json','idempotency-key':randomUUID(),'if-match':'"'+current+'"'},body:JSON.stringify({values:{candidate_integer:7}})};assert.equal((await fetch(url,mutation)).status,403);mutation.headers['x-csrf-token']=await ctx.auth.csrf(ctx.actorSession);const changed=await fetch(url,mutation);assert.equal(changed.status,200);const result=await changed.json();assert.deepEqual(await (await fetch(url.replace('/conversations/','/threads/'),mutation)).json(),result);assert.equal((await fetch(url+'?before_revision=1',{headers})).status,400);
   }finally{if(candidate)await candidate.stop();}
  });
  await check('Chat need lost ACK one effect replay and closed session Human editing',async()=>{
   const current=await version(),release=peers.release,receiptKey=randomUUID(),values={candidate_integer:12};let onceOnly=true;
   peers.release=async(...args)=>{const result=await release(...args);if(onceOnly){onceOnly=false;const error=new Error('Synthetic ACK loss');error.code='DEPENDENCY_UNAVAILABLE';throw error;}return result;};try{await bad(mutate(values,current,receiptKey),'DEPENDENCY_UNAVAILABLE');}finally{peers.release=release;}
   assert.equal((await mutate(values,current,receiptKey)).data.version,String(BigInt(current)+1n));
   await chatOperator.execute("UPDATE conversation_acquisition_session SET status='closed',close_reason='agent_closed',closed_at=UTC_TIMESTAMP(6),version=version+1 WHERE tenant_id=? AND id=?",[tenant,v.session]);assert.equal((await read()).can_edit,true);await mutate({intent:'support'},await version());assert.deepEqual(await mutate(receipt.values,receipt.version,key,receipt.release),receipt.result);
   const body={values:{candidate_text:'Synthetic imported legacy'},release_pins:[]},legacyVersion=await version(),legacyKey=randomUUID(),result={data:{thread_id:v.conversation,session_id:v.session,need_id:v.need,version:legacyVersion},meta:{correlation_id:randomUUID()}},route=`POST /api/v1/threads/${v.conversation}/sessions/${v.session}/needs/${v.need}/assessment`;
   await chatOperator.execute("INSERT INTO idempotency_record(id,tenant_id,actor_kind,actor_id,route_key,`key`,request_hash,status,response_status,response_body,created_at,updated_at,expires_at) VALUES (?,?,'human',?,?,?,?,'completed',200,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),TIMESTAMPADD(DAY,7,UTC_TIMESTAMP(6)))",[randomUUID(),tenant,f.principal,route,legacyKey,ownerDigest({body,version:legacyVersion}),JSON.stringify(result)]);const replay=await mutate(body.values,legacyVersion,legacyKey);assert.equal(replay.data.conversation_id,v.conversation);assert(!Object.hasOwn(replay.data,'thread_id'));assert.equal(await version(),legacyVersion);
   const [[counts]]=await chatOperator.execute("SELECT COUNT(*) n FROM outbox_event WHERE tenant_id=? AND aggregate_id=? AND event_type='need.assessed'",[tenant,v.need]);assert.equal(Number(counts.n),5);
  });
  await check('Chat need deferred enrich preserves state and requires current builtin rights',async()=>{
   const before=await read(),enrich=(key=randomUUID(),expected_version=before.version)=>call(request(ops.enrich,{body:{},expected_version,idempotency_key:key}));
   await bad(enrich(),'AI_CONFIGURATION_REQUIRED');assert.deepEqual(await read(),before);for(const name of ['assessment_status','need_clarity','intent','product_interest','unresolved_reason'])await field(object,name,['write'],()=>bad(enrich(),'FIELD_FORBIDDEN'));
   await bad(enrich(randomUUID(),String(BigInt(before.version)+1n)),'VERSION_CONFLICT');
   const publicServer=createChatSessionProgressBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),call);servers.push(publicServer);publicServer.listen(0,'127.0.0.1');await once(publicServer,'listening');const url='http://127.0.0.1:'+publicServer.address().port+'/api/v1/conversations/'+v.conversation+'/sessions/'+v.session+'/needs/'+v.need+'/enrich',headers={'x-tenant-id':tenant,cookie:'crm_session='+ctx.actorSession,origin:'http://localhost:18080','content-type':'application/json','idempotency-key':randomUUID(),'if-match':'"'+before.version+'"'},mutation={method:'POST',headers,body:'{}'};assert.equal((await fetch(url,mutation)).status,403);headers['x-csrf-token']=await ctx.auth.csrf(ctx.actorSession);const reply=await fetch(url,mutation);assert.equal(reply.status,409);assert.equal((await reply.json()).error.code,'AI_CONFIGURATION_REQUIRED');assert.equal((await fetch(url,{headers})).status,404);
  });
  await check('Chat need deferred enrich replays legacy receipt without provider or revision',async()=>{
   const current=await version(),key=randomUUID(),body={},result={data:{thread_id:v.conversation,session_id:v.session,need_id:v.need,version:current},meta:{correlation_id:randomUUID()}},route=`POST /api/v1/threads/${v.conversation}/sessions/${v.session}/needs/${v.need}/enrich`;
   await chatOperator.execute("INSERT INTO idempotency_record(id,tenant_id,actor_kind,actor_id,route_key,`key`,request_hash,status,response_status,response_body,created_at,updated_at,expires_at) VALUES (?,?,'human',?,?,?,?,'completed',200,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),TIMESTAMPADD(DAY,7,UTC_TIMESTAMP(6)))",[randomUUID(),tenant,f.principal,route,key,ownerDigest({body,version:current}),JSON.stringify(result)]);
   const req=request(ops.enrich,{body,expected_version:current,idempotency_key:key}),r=await call(req);assert.equal(r.data.conversation_id,v.conversation);assert(!Object.hasOwn(r.data,'thread_id'));assert.equal(await version(),current);await field(object,'intent',['read'],()=>bad(call(req),'FIELD_FORBIDDEN'));
  });
  if(process.argv.includes('--with-source'))await chatNeedSourceNative({...ctx,v,peers,version,crmServer});
  if(process.argv.includes('--with-outcomes'))await chatNeedOutcomeNative({...ctx,v,peers,read,version,mutate,request,grants});
  await check('Chat need bounded fifty revision history over default transport limit',async()=>{
   const current=BigInt(await version()),values={product_interest:'x'.repeat(4000),candidate_text:'y'.repeat(4000)};
   for(let i=1n;i<=51n;i++)await chatOperator.execute('INSERT INTO need_assessment_revision(tenant_id,need_id,version,values_json,pinned_json,proposal_json,actor_id,recorded_at) VALUES (?,?,?,?,?,?,?,UTC_TIMESTAMP(6))',[tenant,v.need,String(current+i),JSON.stringify(values),'[]','{}',f.principal]);
   await chatOperator.execute('UPDATE need_assessment SET version=? WHERE tenant_id=? AND need_id=?',[String(current+51n),tenant,v.need]);const r=await read();assert.equal(r.history.length,50);assert.equal(r.history[0].version,String(current+51n));assert.equal(r.history.at(-1).version,String(current+2n));assert(Buffer.byteLength(JSON.stringify(r))>262144);
  });
  await check('Chat need Sales candidate overflow fails before silently truncating',async()=>{
   for(let i=0;i<99;i++){const id=randomUUID();await operator.execute('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[id,tenant,objects.lead,f.principal]);await operator.execute("INSERT INTO sales_session_context(tenant_id,id,record_id,conversation_id,session_id,actor_id,kind,recorded_at) VALUES (?,?,?,?,?,?,'follow_up',UTC_TIMESTAMP(6))",[tenant,randomUUID(),id,v.conversation,v.session,f.principal]);}
   await bad(call(request()),'OUTCOME_LIMIT_EXCEEDED');
  });
 }finally{await setRole(ctx.grants);await pool.end();await metadataPool.end();await salesPool.end();}
}
