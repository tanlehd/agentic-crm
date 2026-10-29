import assert from 'node:assert/strict';
import {chatTransitionNative} from './chat-transition-native.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {once} from 'node:events';
import {createPool,rootSQL} from './chat-native.mjs';
import {ChatDetail,chatDetailRoutes} from '../../services/chat/dist/detail.js';
import {NativeContactSummary,contactSummaryRoutes} from '../../services/core-baseline/dist/modules/crm/owner-contact-summary.js';
import {NativeChannelDetail,channelDetailRoutes} from '../../services/core-baseline/dist/modules/channels/owner-detail.js';
import {ChatHistoryBff,createChatHistoryBff} from '../../services/core-baseline/dist/gateway/chat-history-bff.js';
import {HumanDispatchEnrollment} from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';
import {createWorkloadServer,ownerClient,ownerCommandClient,remoteRegistryAuthority} from '../../packages/workload-transport/dist/index.js';
import {chatSessionProgressNative} from './chat-session-progress-native.mjs';
import {chatClassificationNative} from './chat-classification-native.mjs';
import {chatNeedNative} from './chat-need-native.mjs';
import {chatSessionFunnelNative} from './chat-session-funnel-native.mjs';
import {chatActivityNative} from './chat-activity-native.mjs';
import {chatNotesNative} from './chat-notes-native.mjs';
import {chatQueueNative} from './chat-queue-native.mjs';
import {nativeChatParity} from './chat-runtime-parity.mjs';

export async function detailFixtureObjects(operator,tenant){
 const ids={};for(const key of ['contact','activity','conversation_session','conversation_need','lead','deal']){
  const [[old]]=await operator.execute('SELECT id FROM object_type WHERE tenant_id=? AND `key`=?',[tenant,key]);
  ids[key]=old?.id??randomUUID();if(!old)await operator.execute("INSERT INTO object_type(id,tenant_id,`key`,label,kind,created_at,updated_at) VALUES (?,?,?,?,'standard',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[ids[key],tenant,key,'Synthetic '+key]);
 }return new Map([[tenant,ids]]);
}
export async function chatDetailNative(ctx){
 const {check,operator,chatOperator,chatPool,commands,tenant,other,f,enrollment,identityClient,chatMaterial,bffMaterial,crmMaterial,connectorMaterial,chatAuthority,registryConfig,protocol,servers,env,projectionObjects,chatServer}=ctx;
 const ref=JSON.parse(await readFile('.local/chat-ownership/reference-fixture.json','utf8'));assert.equal(ref.database,'native_identity_test');assert.equal(ref.tenant,tenant);
 const path='.local/chat-ownership/detail-fixture.json';let fixture;
 try{fixture=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;fixture={tenant,environment:'retained-test',...Object.fromEntries(['conversation','identity','message','touchpoint','contactPolicy'].map(k=>[k,randomUUID()]))};await writeFile(path,JSON.stringify(fixture),{flag:'wx',mode:0o600});}
 assert.equal(fixture.tenant,tenant);assert.equal(fixture.environment,'retained-test');assert.match(ref.crmPassword,/^[a-f0-9]{64}$/);assert.match(ref.channelPassword,/^[a-f0-9]{64}$/);
 if(process.argv.includes('--provision')){
  rootSQL(`CREATE USER IF NOT EXISTS 't05_crm_detail_test'@'%' IDENTIFIED BY '${ref.crmPassword}';
  ${['contact','crm_record','object_type','record_team_access'].map(table=>`GRANT SELECT ON native_identity_test.${table} TO 't05_crm_detail_test'@'%';`).join('\n')}
  CREATE USER IF NOT EXISTS 't05_channel_detail_test'@'%' IDENTIFIED BY '${ref.channelPassword}';
  ${['channel_connection','facebook_page','touchpoint','channel_ingress_touchpoint'].map(table=>`GRANT SELECT ON native_identity_test.${table} TO 't05_channel_detail_test'@'%';`).join('\n')}`);
 }
 const pools=Object.fromEntries(['crm','channel'].map(owner=>[owner,createPool({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),database:ref.database,user:'t05_'+owner+'_detail_test',password:ref[owner+'Password'],timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true})]));
 const old=[];for(const table of ['role','field_policy']){const [[row]]=await operator.execute('SELECT * FROM `'+table+'` WHERE tenant_id=? AND id=?',[tenant,table==='role'?f.role:f.policy]);old.push(row);}
 const original=typeof old[0].permissions==='string'?JSON.parse(old[0].permissions):old[0].permissions,grants=[...original,{resource:'conversation',action:'note',scope:'all'},{resource:'contact',action:'read',scope:'all'}];
 const setRole=permissions=>operator.execute('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(permissions),tenant,f.role]);
 await operator.execute('INSERT INTO contact_identity(id,tenant_id,connection_id,contact_id,external_subject_id) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id',[fixture.identity,tenant,ref.connection,ref.contact,'synthetic-detail-'+fixture.identity]);
 await chatOperator.execute("INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[fixture.conversation,tenant,f.object,f.principal]);
 await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at) VALUES (?,?,?,?,?,'open',UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE record_id=record_id",[tenant,fixture.conversation,ref.contact,fixture.identity,ref.connection]);
 await chatOperator.execute('INSERT INTO chat_control_head(tenant_id,conversation_id,registry_revision,control_revision,cancel_through,pause_through,version,created_at,updated_at) VALUES (?,?,1,1,0,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE conversation_id=conversation_id',[tenant,fixture.conversation]);
 await chatOperator.execute("INSERT INTO conversation_workspace(tenant_id,conversation_id,latest_inbound_seq,answered_inbound_seq,waiting_metric_state,last_message_at) VALUES (?,?,1,0,'ready',UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE conversation_id=conversation_id",[tenant,fixture.conversation]);
 await chatOperator.execute("INSERT INTO message(id,tenant_id,conversation_id,connection_id,provider_message_id,direction,text,occurred_at,received_at,status) VALUES (?,?,?,?,?,'inbound','Synthetic detail fixture',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'received') ON DUPLICATE KEY UPDATE id=id",[fixture.message,tenant,fixture.conversation,ref.connection,fixture.message]);
 const crmAuthority=remoteRegistryAuthority(crmMaterial,registryConfig),crmIdentity=ownerClient(crmMaterial,crmAuthority,'identity',new URL('/',registryConfig.url)),crmProof=ownerClient(crmMaterial,crmAuthority,'chat',new URL(protocol+'//127.0.0.1:'+chatServer.address().port+'/'));
 const contactPeers={policy:(t,input)=>crmIdentity(t,'admission-contact-policy',input),batch:(t,input)=>crmIdentity(t,'admission-contact-batch-policy',input)};
 const contacts=new NativeContactSummary(pools.crm,(t,command,abort)=>crmProof(t,abort?'command-abort':'command-proof',command),(t,input)=>contactPeers.policy(t,input),(t,input)=>contactPeers.batch(t,input));
 const crmServer=createWorkloadServer(crmMaterial,crmAuthority,contactSummaryRoutes(contacts));servers.push(crmServer);crmServer.listen(0,'127.0.0.1');await once(crmServer,'listening');
 const connectorServer=createWorkloadServer(connectorMaterial,remoteRegistryAuthority(connectorMaterial,registryConfig),channelDetailRoutes(new NativeChannelDetail(pools.channel)));servers.push(connectorServer);connectorServer.listen(0,'127.0.0.1');await once(connectorServer,'listening');
 const crm=ownerClient(chatMaterial,chatAuthority,'crm',new URL(protocol+'//127.0.0.1:'+crmServer.address().port+'/')),channel=ownerClient(chatMaterial,chatAuthority,'connector',new URL(protocol+'//127.0.0.1:'+connectorServer.address().port+'/'));
 const peers={admit:(t,command)=>identityClient(t,'admit',{owner:'chat',command}),settle:(t,command,admission_id)=>identityClient(t,'settle',{owner:'chat',command,admission_id}),policy:(t,command,admission_id)=>identityClient(t,'admission-conversation-policy',{command,admission_id}),contact:(t,command,admission_id)=>crm(t,'contact-summary-read',{command,admission_id}),channel:(t,connection_id,conversation_id)=>channel(t,'detail-channel-read',{connection_id,conversation_id})};
 const detail=new ChatDetail(commands,peers),server=createWorkloadServer(chatMaterial,chatAuthority,chatDetailRoutes(detail));servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');
 const call=ownerCommandClient(bffMaterial,remoteRegistryAuthority(bffMaterial,registryConfig),'chat',new URL(protocol+'//127.0.0.1:'+server.address().port+'/'));
 const request=()=>({schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,operation:'conversation-get-conversations-id',command_id:randomUUID(),actor:{kind:'human',principal_id:f.principal,delegation_id:enrollment.delegationId},payload:{id:fixture.conversation}}),bad=(p,code)=>assert.rejects(p,e=>e.code===code);
 const field=async(object,key,actions,work)=>{
  await operator.execute('UPDATE field_policy SET object_type_id=?,property_key=?,denied_actions=? WHERE tenant_id=? AND id=?',[object,key,JSON.stringify(actions),tenant,f.policy]);
  try{await work();}finally{await operator.execute('UPDATE field_policy SET object_type_id=?,property_key=?,denied_actions=? WHERE tenant_id=? AND id=?',[old[1].object_type_id,old[1].property_key,typeof old[1].denied_actions==='string'?old[1].denied_actions:JSON.stringify(old[1].denied_actions),tenant,f.policy]);}
 };
 await setRole(grants);
 try{
  if(process.argv.includes('--with-runtime'))await check('Chat detail runtime public read preserves Contact hydration current fields and dependency outage',async()=>{
   const candidate=await nativeChatParity(ctx,{crm:new URL(protocol+'//127.0.0.1:'+crmServer.address().port+'/'),connector:new URL(protocol+'//127.0.0.1:'+connectorServer.address().port+'/')});
   try{
    const publicServer=createChatHistoryBff(new ChatHistoryBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),candidate.call));servers.push(publicServer);publicServer.listen(0,'127.0.0.1');await once(publicServer,'listening');
    const url='http://127.0.0.1:'+publicServer.address().port+'/api/v1/conversations/'+fixture.conversation,headers={'x-tenant-id':tenant,cookie:'crm_session='+ctx.actorSession};
    const response=await fetch(url,{headers});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');const body=await response.json();assert.equal(body.data.id,fixture.conversation);assert.equal(body.data.contact.id,ref.contact);assert.equal(body.data.latest_message.id,fixture.message);
    await field(f.object,'text',['read'],async()=>{const r=await fetch(url,{headers});assert.equal(r.status,200);assert(!('text' in (await r.json()).data.latest_message));});
    assert.equal((await fetch(url+'?fields=text',{headers})).status,400);
    const port=crmServer.address().port;crmServer.closeAllConnections();await new Promise(r=>crmServer.close(r));try{assert.equal((await fetch(url,{headers})).status,503);}finally{crmServer.listen(port,'127.0.0.1');await once(crmServer,'listening');}
    assert(candidate.proofCount()>0,'owner callbacks must reach the independent Chat API');
   }finally{await candidate.stop();}
  });
  if(process.argv.includes('--with-transitions'))await chatTransitionNative({...ctx,ref,fixture,grants,setRole,field,peers,crmServer,connectorServer});
  if(process.argv.includes('--focus=Chat need'))await chatNeedNative({...ctx,ref,fixture,grants,setRole,field,sourceChannel:(t,connection_id,conversation_id)=>channel(t,'source-channel-read',{connection_id,conversation_id}),sourceChannelServer:connectorServer});
  if(process.argv.includes('--focus=Chat funnel'))await chatSessionFunnelNative({...ctx,ref,fixture,grants,setRole,field});
  if(process.argv.includes('--focus=Chat classification'))await chatClassificationNative({...ctx,ref,fixture,grants,setRole,field});
  if(process.argv.includes('--focus=Chat session'))await chatSessionProgressNative({...ctx,ref,fixture,grants,setRole,field});
  if(process.argv.includes('--focus=Chat activity'))await chatActivityNative({...ctx,ref,fixture,grants,setRole,field,channel});
  if(process.argv.includes('--focus=Chat notes'))await chatNotesNative({...ctx,ref,fixture,grants,setRole,field});
  if(process.argv.some(a=>['--focus=Chat queue','--focus=Chat list'].includes(a)))await chatQueueNative({...ctx,ref,fixture,crm,channel,crmServer,connectorServer,contactPeers,grants,setRole,field});
  await check('Chat detail native own snapshot CRM Contact Channels labels and current actions',async()=>{
   const result=await call(request());assert.equal(result.data.id,fixture.conversation);assert.equal(result.data.contact.id,ref.contact);assert.equal(result.data.channel_id,ref.connection);assert.equal(result.data.latest_message.id,fixture.message);assert.equal(result.data.owner_kind,'human');assert(result.data.allowed_actions.includes('reply'));assert(result.data.allowed_actions.includes('note'));
   await assert.rejects(chatPool.query('SELECT * FROM native_identity_test.contact LIMIT 1'));await assert.rejects(pools.crm.query('SELECT * FROM test_crm_chat_owner.conversation LIMIT 1'));await assert.rejects(pools.channel.query('SELECT * FROM contact LIMIT 1'));
  });
  await check('Chat detail current Contact denial and independent field redaction',async()=>{
   await setRole(original);try{assert.equal((await call(request())).data.contact,null);}finally{await setRole(grants);}
   await field(projectionObjects.get(tenant).contact,'display_name',['read'],async()=>{const r=await call(request());assert(!('display_name' in r.data.contact));assert.equal(r.data.contact.id,ref.contact);});
   await field(f.object,'text',['read'],async()=>{const r=await call(request());assert(!('text' in r.data.latest_message));assert(!r.data.allowed_actions.includes('reply'));assert(!r.data.allowed_actions.includes('note'));});
   for(const key of ['page_id','attribution'])await field(f.object,key,['read'],async()=>assert(!(key in (await call(request())).data)));
   await field(projectionObjects.get(tenant).activity,'body',['write'],async()=>{const r=await call(request());assert(!r.data.allowed_actions.includes('note'));assert(r.data.allowed_actions.includes('reply'));});
  });
  await check('Chat detail native viewer seat owner scope tenant and service actor checks',async()=>{
   const [[member]]=await operator.execute('SELECT seat_code FROM membership WHERE tenant_id=? AND id=?',[tenant,f.member]);await operator.execute("UPDATE membership SET seat_code='viewer' WHERE tenant_id=? AND id=?",[tenant,f.member]);try{const r=await call(request());assert.deepEqual(r.data.allowed_actions,[]);assert.equal(r.data.id,fixture.conversation);}finally{await operator.execute('UPDATE membership SET seat_code=? WHERE tenant_id=? AND id=?',[member.seat_code,tenant,f.member]);}
   const [[record]]=await chatOperator.execute('SELECT owner_principal_id FROM crm_record WHERE tenant_id=? AND id=?',[tenant,fixture.conversation]);await setRole(grants.map(g=>g.resource==='conversation'?{...g,scope:'own'}:g));await chatOperator.execute('UPDATE crm_record SET owner_principal_id=? WHERE tenant_id=? AND id=?',[f.adminPrincipal,tenant,fixture.conversation]);try{await bad(call(request()),'NOT_FOUND');}finally{await setRole(grants);await chatOperator.execute('UPDATE crm_record SET owner_principal_id=? WHERE tenant_id=? AND id=?',[record.owner_principal_id,tenant,fixture.conversation]);}
   await bad(call({...request(),tenant_id:other}),'NOT_FOUND');const service=request();service.actor.kind='service';await bad(call(service),'FORBIDDEN');
  });
  await check('Chat detail disabled connection retains history and causal need coverage',async()=>{
   const [[connection]]=await operator.execute('SELECT status FROM channel_connection WHERE tenant_id=? AND id=?',[tenant,ref.connection]);await operator.execute("UPDATE channel_connection SET status='disabled' WHERE tenant_id=? AND id=?",[tenant,ref.connection]);
   const [[state]]=await chatOperator.execute('SELECT waiting_since,waiting_metric_state FROM conversation_workspace WHERE tenant_id=? AND conversation_id=?',[tenant,fixture.conversation]);
   try{
    assert.equal((await call(request())).data.channel_id,ref.connection);
    await chatOperator.execute("UPDATE conversation_workspace SET waiting_since=UTC_TIMESTAMP(6),waiting_metric_state='ready' WHERE tenant_id=? AND conversation_id=?",[tenant,fixture.conversation]);assert.equal((await call(request())).data.need_response,null);
    await chatOperator.execute("UPDATE conversation_workspace SET waiting_since=NULL,waiting_metric_state='ready' WHERE tenant_id=? AND conversation_id=?",[tenant,fixture.conversation]);assert.equal((await call(request())).data.need_response,false);
    await chatOperator.execute("UPDATE conversation SET status='closed',closed_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND record_id=?",[tenant,fixture.conversation]);const closed=await call(request());assert.deepEqual(closed.data.allowed_actions,[]);assert.equal(closed.data.need_response,false);
   }finally{await operator.execute('UPDATE channel_connection SET status=? WHERE tenant_id=? AND id=?',[connection.status,tenant,ref.connection]);await chatOperator.execute('UPDATE conversation_workspace SET waiting_since=?,waiting_metric_state=? WHERE tenant_id=? AND conversation_id=?',[state.waiting_since,state.waiting_metric_state,tenant,fixture.conversation]);await chatOperator.execute("UPDATE conversation SET status='open',closed_at=NULL WHERE tenant_id=? AND record_id=?",[tenant,fixture.conversation]);}
  });
  await check('Chat detail retained finalized referral hydration uses Channels-owned evidence',async()=>{
   const [[row]]=await operator.execute("SELECT conversation_id,evidence FROM channel_ingress_touchpoint WHERE tenant_id=? AND connection_id=? AND state='bound' ORDER BY created_at,id LIMIT 1",[tenant,ref.connection]);assert(row,'Run retained native referral acceptance before detail acceptance');
   const evidence=typeof row.evidence==='string'?JSON.parse(row.evidence):row.evidence;
   const metadata=await channel(tenant,'detail-channel-read',{connection_id:ref.connection,conversation_id:row.conversation_id});assert.deepEqual(metadata.attribution,{source:'ctm',ad_id:evidence.ad_id,campaign_id:evidence.campaign_id});
  });
  await check('Chat detail owner outage stale Chat and stale CRM snapshots fail closed',async()=>{
   const port=crmServer.address().port;crmServer.closeAllConnections();await new Promise(resolve=>crmServer.close(resolve));try{await bad(call(request()),'DEPENDENCY_UNAVAILABLE');}finally{crmServer.listen(port,'127.0.0.1');await once(crmServer,'listening');}
   const policy=peers.policy;peers.policy=async(...a)=>{const p=await policy(...a);await chatOperator.execute('UPDATE crm_record SET version=version+1 WHERE tenant_id=? AND id=?',[tenant,fixture.conversation]);return p;};try{await bad(call(request()),'STALE_VERSION');}finally{peers.policy=policy;}
   const contactPolicy=contactPeers.policy;contactPeers.policy=async(...a)=>{const p=await contactPolicy(...a);await operator.execute('UPDATE crm_record SET version=version+1 WHERE tenant_id=? AND id=?',[tenant,ref.contact]);return p;};try{await bad(call(request()),'STALE_VERSION');}finally{contactPeers.policy=contactPolicy;}
  });
  await check('Chat detail completed native logout blocks delayed Contact hydration',async()=>{
   const session=await ctx.login(f.account),enrolled=await new HumanDispatchEnrollment(ctx.ds).enroll(tenant,createHash('sha256').update(session).digest('hex')),req=request();req.actor.delegation_id=enrolled.delegationId;
   const contact=peers.contact;peers.contact=async(...a)=>{const r=await contact(...a);await ctx.drainingAuth.logout(session,'http://localhost:18080',await ctx.auth.csrf(session));return r;};try{await bad(call(req),'INVALID_TRANSITION');}finally{peers.contact=contact;}
  });
  await check('Chat detail public native session read no-store and forged query denial',async()=>{
   const publicServer=createChatHistoryBff(new ChatHistoryBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),call));servers.push(publicServer);publicServer.listen(0,'127.0.0.1');await once(publicServer,'listening');
   const url='http://127.0.0.1:'+publicServer.address().port+'/api/v1/conversations/'+fixture.conversation,headers={'x-tenant-id':tenant,cookie:'crm_session='+ctx.actorSession};assert.equal((await fetch(url)).status,400);const response=await fetch(url,{headers});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).data.contact.id,ref.contact);assert.equal((await fetch(url+'?fields=text',{headers})).status,400);
  });
 }finally{await setRole(original);await Promise.all(Object.values(pools).map(p=>p.end()));}
}
