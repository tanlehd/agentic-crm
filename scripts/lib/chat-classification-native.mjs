import {chatMetadataWriterNative} from './chat-metadata-writer-native.mjs';
import assert from 'node:assert/strict';
import {nativeChatParity} from './chat-runtime-parity.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {once} from 'node:events';
import {createPool} from './chat-native.mjs';
import {ChatClassification,chatClassificationRoutes,classificationOperations as ops} from '../../services/chat/dist/classification.js';
import {NativeCrmOwnerMetadata,crmOwnerMetadataRoutes} from '../../services/core-baseline/dist/modules/crm/owner-metadata.js';
import {NativeContactSummary,contactSummaryRoutes} from '../../services/core-baseline/dist/modules/crm/owner-contact-summary.js';
import {createChatSessionProgressBff} from '../../services/core-baseline/dist/gateway/chat-session-progress-bff.js';
import {HumanDispatchEnrollment} from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';
import {createWorkloadServer,ownerClient,ownerCommandClient,remoteRegistryAuthority,ownerDigest} from '../../packages/workload-transport/dist/index.js';
import {chatContributionsNative} from './chat-contributions-native.mjs';

export async function chatClassificationNative(ctx){
 const {check,operator,chatOperator,chatPool,commands,tenant,other,f,ref,enrollment,identityClient,chatMaterial,bffMaterial,crmMaterial,chatAuthority,registryConfig,protocol,servers,env,chatServer,setRole,field,projectionObjects}=ctx;
 const path='.local/chat-ownership/classification-fixture.json';let fixture;
 try{fixture=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;fixture={tenant,environment:'retained-test',rounds:[]};}
 assert.equal(fixture.tenant,tenant);assert.equal(fixture.environment,'retained-test');const v=Object.fromEntries(['conversation','identity','session'].map(k=>[k,randomUUID()]));fixture.rounds.push(v);await writeFile(path,JSON.stringify(fixture),{mode:0o600});
 await operator.execute('INSERT INTO contact_identity(id,tenant_id,connection_id,contact_id,external_subject_id) VALUES (?,?,?,?,?)',[v.identity,tenant,ref.connection,ref.contact,'synthetic-classification-'+v.identity]);
 await chatOperator.execute('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[v.conversation,tenant,f.object,f.principal]);
 await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at) VALUES (?,?,?,?,?,'open',UTC_TIMESTAMP(6))",[tenant,v.conversation,ref.contact,v.identity,ref.connection]);
 await chatOperator.execute('INSERT INTO chat_control_head(tenant_id,conversation_id,registry_revision,control_revision,cancel_through,pause_through,version,created_at,updated_at) VALUES (?,?,1,1,0,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[tenant,v.conversation]);
 await chatOperator.execute("INSERT INTO conversation_acquisition_session(tenant_id,id,conversation_id,sequence,status,opening_reason,opened_at,opening_occurred_at,source_classification,source_channel,source_page_id,source_connection_id,policy_version) VALUES (?,?,?,1,'active','first_inbound',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'organic','mock_messenger','synthetic-classification',?,'inbox_v2')",[tenant,v.session,v.conversation,ref.connection]);
 const object=projectionObjects.get(tenant).conversation_session,types=['string','decimal','integer','boolean','date','datetime','enum','text'];
 let added=false;for(const type of types){const key='candidate_'+type;const [[old]]=await operator.execute('SELECT id FROM property_definition WHERE tenant_id=? AND object_type_id=? AND `key`=?',[tenant,object,key]);if(!old){await operator.execute('INSERT INTO property_definition(id,tenant_id,object_type_id,`key`,label,type,required,default_value,options,indexed,`sensitive`,created_at,updated_at) VALUES (?,?,?,?,?,?,0,NULL,?,0,0,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[randomUUID(),tenant,object,key,'Synthetic '+type,type,type==='enum'?'["alpha","beta"]':null]);added=true;}}
 if(added)await operator.execute('UPDATE object_type SET schema_version=schema_version+1,version=version+1 WHERE tenant_id=? AND id=?',[tenant,object]);
 const mf=JSON.parse(await readFile('.local/chat-ownership/crm-metadata-fixture.json','utf8'));assert.equal(mf.database,'native_identity_test');assert.equal(mf.tenant,tenant);
 const pool=createPool({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),database:ref.database,user:'t05_crm_detail_test',password:ref.crmPassword,timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true}),metadataPool=createPool({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),database:mf.database,user:'crm_owner_test_runtime',password:mf.runtime,timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true});
 const authority=remoteRegistryAuthority(crmMaterial,registryConfig),proof=ownerClient(crmMaterial,authority,'chat',new URL(protocol+'//127.0.0.1:'+chatServer.address().port+'/')),identity=ownerClient(crmMaterial,authority,'identity',new URL('/',registryConfig.url));
 const metadata=new NativeCrmOwnerMetadata(metadataPool,(t,command,abort)=>proof(t,abort?'command-abort':'command-proof',command)),contacts=new NativeContactSummary(pool,(t,command)=>proof(t,'command-proof',command),(t,input)=>identity(t,'admission-contact-policy',input),undefined,(t,input)=>identity(t,'admission-session-contact-policy',input));
 const crmServer=createWorkloadServer(crmMaterial,authority,{...crmOwnerMetadataRoutes(metadata),...contactSummaryRoutes(contacts)});servers.push(crmServer);crmServer.listen(0,'127.0.0.1');await once(crmServer,'listening');
 const crm=ownerClient(chatMaterial,chatAuthority,'crm',new URL(protocol+'//127.0.0.1:'+crmServer.address().port+'/')),reference=(command,snapshot)=>({command,resource_id:snapshot.object_type_id,kind:'metadata',expected_revision:snapshot.schema_revision,reservation_id:null});
 const peers={metadata:t=>crm(t,'classification-metadata-read',{schema_revision:null}),reserve:(t,command,snapshot)=>crm(t,'reference-reserve',reference(command,snapshot)),release:(t,command,snapshot)=>crm(t,'reference-release',reference(command,snapshot)),admit:(t,command)=>identityClient(t,'admit',{owner:'chat',command}),settle:(t,command,admission_id)=>identityClient(t,'settle',{owner:'chat',command,admission_id}),policy:(t,command,admission_id)=>identityClient(t,'admission-classification-policy',{command,admission_id}),contact:(t,command,admission_id)=>crm(t,'session-contact-read',{command,admission_id})};
 const server=createWorkloadServer(chatMaterial,chatAuthority,chatClassificationRoutes(new ChatClassification(commands,peers)));servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');const call=ownerCommandClient(bffMaterial,remoteRegistryAuthority(bffMaterial,registryConfig),'chat',new URL(protocol+'//127.0.0.1:'+server.address().port+'/'));
 const request=(op=ops.read,payload={})=>({schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,operation:op,command_id:randomUUID(),actor:{kind:'human',principal_id:f.principal,delegation_id:enrollment.delegationId},payload:{conversation:v.conversation,session:v.session,...payload}}),bad=(p,code)=>assert.rejects(p,e=>e.code===code),read=async()=> (await call(request())).data,version=async()=> (await read()).version,mutate=(values,expected_version,key=randomUUID())=>call(request(ops.write,{body:{values},expected_version,idempotency_key:key}));
 const grants=[...ctx.grants,{resource:'conversation',action:'update',scope:'all'}];await setRole(grants);let receipt,key;
 try{
  await check('Chat classification native metadata shape scalar values and isolated credentials',async()=>{
   const r=await read();assert.equal(r.version,'0');assert.equal(r.can_edit,true);assert.equal(r.status,'active');assert.deepEqual(r.values,{});for(const type of types){const d=r.definitions.find(d=>d.key==='candidate_'+type);assert(d);assert.equal(d.label,'Synthetic '+type);assert.equal(d.default_value,null);assert.equal(d.can_write,true);}
   const values={candidate_string:'Synthetic',candidate_decimal:'123.450',candidate_integer:3,candidate_boolean:true,candidate_date:'2026-01-01',candidate_datetime:'2026-01-01T00:00:00Z',candidate_enum:'alpha',candidate_text:'Synthetic classification'};await mutate(values,'0');assert.deepEqual((await read()).values,{...values,candidate_datetime:'2026-01-01T00:00:00.000Z'});
   await assert.rejects(chatPool.query('SELECT * FROM native_identity_test.property_definition LIMIT 1'));await assert.rejects(metadataPool.query('SELECT * FROM test_crm_chat_owner.session_classification LIMIT 1'));await assert.rejects(metadataPool.query('SELECT * FROM auth_session LIMIT 1'));
  });
  await check('Chat classification validation null deletion receipt CAS and concurrent replay',async()=>{
   for(const values of [{missing_field:1},{candidate_integer:1.5},{candidate_decimal:2},{candidate_date:'2026-02-30'},{candidate_enum:'invalid'}])await bad(mutate(values,await version()),'VALIDATION_FAILED');
   key=randomUUID();const current=await version(),values={candidate_string:'Synthetic updated',candidate_boolean:null};const results=await Promise.all([mutate(values,current,key),mutate(values,current,key)]);assert.deepEqual(results[0],results[1]);receipt={result:results[0],values,version:current};assert(!Object.hasOwn((await read()).values,'candidate_boolean'));await bad(mutate({candidate_string:'Different'},current,key),'IDEMPOTENCY_CONFLICT');await bad(mutate(values,current),'VERSION_CONFLICT');
   const [[counts]]=await chatOperator.execute("SELECT COUNT(*) n FROM session_contribution WHERE tenant_id=? AND session_id=? AND kind='classification'",[tenant,v.session]);assert.equal(Number(counts.n),2);
  });
  await check('Chat classification independent session fields and mandatory Conversation rights',async()=>{
   await field(object,'candidate_string',['read'],async()=>{const r=await read();assert(!Object.hasOwn(r.values,'candidate_string'));assert(!r.definitions.some(d=>d.key==='candidate_string'));await bad(mutate(receipt.values,receipt.version,key),'FIELD_FORBIDDEN');});
   await field(object,'candidate_enum',['write'],async()=>{const r=await read();assert.equal(r.definitions.find(d=>d.key==='candidate_enum').can_write,false);await bad(mutate({candidate_enum:'beta'},r.version),'FIELD_FORBIDDEN');});
   for(const fkey of ['contact_id','text'])await field(f.object,fkey,['read'],async()=>bad(call(request()),'FIELD_FORBIDDEN'));
   await setRole(grants.filter(g=>!(g.resource==='conversation'&&g.action==='update')));try{assert.equal((await read()).can_edit,false);await bad(mutate(receipt.values,receipt.version,key),'FORBIDDEN');}finally{await setRole(grants);}
  });
  await check('Chat classification current Contact tenant and source outage denial',async()=>{
   await setRole(grants.filter(g=>g.resource!=='contact'));try{await bad(call(request()),'NOT_FOUND');}finally{await setRole(grants);}
   await bad(call({...request(),tenant_id:other}),'NOT_FOUND');await bad(call(request(ops.read,{session:randomUUID()})),'NOT_FOUND');
   const port=crmServer.address().port;crmServer.closeAllConnections();await new Promise(r=>crmServer.close(r));try{await bad(call(request()),'DEPENDENCY_UNAVAILABLE');}finally{crmServer.listen(port,'127.0.0.1');await once(crmServer,'listening');}
  });
  await check('Chat classification metadata snapshot and drain fence before local commit',async()=>{
   const reserve=peers.reserve,contact=peers.contact,current=await version();let barrier;
   peers.reserve=async(t,command,snapshot)=>{await operator.execute('UPDATE object_type SET schema_version=schema_version+1,version=version+1 WHERE tenant_id=? AND id=?',[tenant,object]);return reserve(t,command,snapshot);};try{await bad(call(request()),'STALE_VERSION');}finally{peers.reserve=reserve;}
   peers.contact=async(...args)=>{const result=await contact(...args);barrier=randomUUID();assert.equal((await metadata.close(tenant,object,barrier)).state,'drained');return result;};try{await bad(mutate({candidate_integer:8},current),'FORBIDDEN');}finally{peers.contact=contact;if(barrier)await metadata.cancelClose(tenant,object,barrier);}
   const [[held]]=await operator.execute("SELECT COUNT(*) n FROM crm_reference_reservation WHERE tenant_id=? AND resource_id=? AND state='held'",[tenant,object]);assert.equal(Number(held.n),0);
  });
  await check('Chat classification local race and completed native logout prevent effects',async()=>{
   const contact=peers.contact;peers.contact=async(...args)=>{const r=await contact(...args);await chatOperator.execute('UPDATE crm_record SET version=version+1 WHERE tenant_id=? AND id=?',[tenant,v.conversation]);return r;};try{await bad(call(request()),'STALE_VERSION');}finally{peers.contact=contact;}
   const current=await version(),session=await ctx.login(f.account),enrolled=await new HumanDispatchEnrollment(ctx.ds).enroll(tenant,createHash('sha256').update(session).digest('hex')),req=request(ops.write,{body:{values:{candidate_integer:9}},expected_version:current,idempotency_key:randomUUID()});req.actor.delegation_id=enrolled.delegationId;
   peers.contact=async(...args)=>{const r=await contact(...args);await ctx.drainingAuth.logout(session,'http://localhost:18080',await ctx.auth.csrf(session));return r;};try{await bad(call(req),'FORBIDDEN');}finally{peers.contact=contact;}assert.equal(await version(),current);
  });
  await check('Chat classification public native session CSRF ETag and strict query'+(process.argv.includes('--with-runtime')?' runtime':''),async()=>{
   const candidate=process.argv.includes('--with-runtime')?await nativeChatParity(ctx,{crm:new URL(protocol+'//127.0.0.1:'+crmServer.address().port+'/')}):null;
   try{
   const publicServer=createChatSessionProgressBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),candidate?.call??call);servers.push(publicServer);publicServer.listen(0,'127.0.0.1');await once(publicServer,'listening');const url='http://127.0.0.1:'+publicServer.address().port+'/api/v1/conversations/'+v.conversation+'/sessions/'+v.session+'/classification',headers={'x-tenant-id':tenant,cookie:'crm_session='+ctx.actorSession};assert.equal((await fetch(url,{headers:{'x-tenant-id':tenant}})).status,401);
   const response=await fetch(url,{headers}),current=(await response.json()).data.version;assert.equal(response.status,200);assert.equal(response.headers.get('etag'),'"'+current+'"');
   const mutation={method:'POST',headers:{...headers,origin:'http://localhost:18080','content-type':'application/json','idempotency-key':randomUUID(),'if-match':'"'+current+'"'},body:JSON.stringify({values:{candidate_integer:7}})};assert.equal((await fetch(url,mutation)).status,403);mutation.headers['x-csrf-token']=await ctx.auth.csrf(ctx.actorSession);const changed=await fetch(url,mutation);assert.equal(changed.status,200);const result=await changed.json();assert.deepEqual(await (await fetch(url,mutation)).json(),result);assert.equal((await fetch(url+'?before_revision=1',{headers})).status,400);
   }finally{if(candidate)await candidate.stop();}
  });
  await check('Chat classification lost metadata release ACK replays one committed effect',async()=>{
   const current=await version(),release=peers.release,receiptKey=randomUUID(),values={candidate_integer:12};let onceOnly=true;
   peers.release=async(...args)=>{const result=await release(...args);if(onceOnly){onceOnly=false;const error=new Error('Synthetic ACK loss');error.code='DEPENDENCY_UNAVAILABLE';throw error;}return result;};
   try{await bad(mutate(values,current,receiptKey),'DEPENDENCY_UNAVAILABLE');}finally{peers.release=release;}
   const replay=await mutate(values,current,receiptKey);assert.equal(replay.data.version,String(BigInt(current)+1n));assert.equal((await read()).values.candidate_integer,12);
  });
  await check('Chat classification closed session replay and retained legacy receipt',async()=>{
   await chatOperator.execute("UPDATE conversation_acquisition_session SET status='closed',close_reason='agent_closed',closed_at=UTC_TIMESTAMP(6),version=version+1 WHERE tenant_id=? AND id=?",[tenant,v.session]);assert.equal((await read()).can_edit,false);assert.deepEqual(await mutate(receipt.values,receipt.version,key),receipt.result);await bad(mutate({candidate_integer:5},await version()),'SESSION_CLOSED');
   const body={values:{candidate_text:'Synthetic imported legacy receipt'}},current=await version(),legacyKey=randomUUID(),result={data:{session_id:v.session,version:current},meta:{correlation_id:randomUUID()}},route=`POST /api/v1/conversations/${v.conversation}/sessions/${v.session}/classification`;
   await chatOperator.execute("INSERT INTO idempotency_record(id,tenant_id,actor_kind,actor_id,route_key,`key`,request_hash,status,response_status,response_body,created_at,updated_at,expires_at) VALUES (?,?,'human',?,?,?,?,'completed',200,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),TIMESTAMPADD(DAY,7,UTC_TIMESTAMP(6)))",[randomUUID(),tenant,f.principal,route,legacyKey,ownerDigest({body,version:current}),JSON.stringify(result)]);assert.deepEqual(await mutate(body.values,current,legacyKey),result);assert.equal(await version(),current);
   const [[counts]]=await chatOperator.execute("SELECT COUNT(*) n FROM outbox_event WHERE tenant_id=? AND aggregate_id=? AND event_type='conversation.classification_changed'",[tenant,v.session]);assert.equal(Number(counts.n),4);
  });
  if(process.argv.includes('--with-metadata-writer'))await chatMetadataWriterNative({...ctx,object,metadata,peers,call,request,read,grants});
  if(process.argv.includes('--with-contributions'))await chatContributionsNative({...ctx,v,peers,call,request,grants});
 }finally{await setRole(ctx.grants);await pool.end();await metadataPool.end();}
}
