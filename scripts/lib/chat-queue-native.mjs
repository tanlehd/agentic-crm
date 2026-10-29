import assert from 'node:assert/strict';
import {nativeChatParity} from './chat-runtime-parity.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID,createHash,createHmac} from 'node:crypto';
import {once} from 'node:events';
import {chatListNative} from './chat-list-native.mjs';
import {ChatWorkspaceQuery,chatWorkspaceQueryRoutes} from '../../services/chat/dist/workspace-query.js';
import {createChatCatalogBff} from '../../services/core-baseline/dist/gateway/chat-catalog-bff.js';
import {HumanDispatchEnrollment} from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';
import {createWorkloadServer,ownerCommandClient,remoteRegistryAuthority} from '../../packages/workload-transport/dist/index.js';

export async function chatQueueNative(ctx){
 const {check,operator,chatOperator,commands,tenant,other,f,ref,enrollment,identityClient,chatMaterial,bffMaterial,chatAuthority,registryConfig,protocol,servers,crm,channel,grants,setRole,field}=ctx;
 const path='.local/chat-ownership/queue-fixture.json';let fixture;
 try{fixture=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;fixture={tenant,environment:'retained-test',tag:randomUUID(),inbox:randomUUID(),hidden:randomUUID(),rows:Array.from({length:5},()=>({id:randomUUID(),identity:randomUUID(),message:randomUUID(),read:randomUUID()}))};await writeFile(path,JSON.stringify(fixture),{flag:'wx',mode:0o600});}
 assert.equal(fixture.tenant,tenant);assert.equal(fixture.environment,'retained-test');
 if(!fixture.capacity){fixture.capacityTag=randomUUID();fixture.capacity=Array.from({length:100},()=>({id:randomUUID(),identity:randomUUID(),message:randomUUID(),read:randomUUID()}));await writeFile(path,JSON.stringify(fixture),{mode:0o600});}
 const id=fixture.rows.map(r=>r.id),key=Buffer.from(f.key,'hex');
 for(const tag of [fixture.tag,fixture.capacityTag])await chatOperator.execute("INSERT INTO conversation_tag(tenant_id,id,name,normalized_name,color,created_at,updated_at) VALUES (?,?,'Queue fixture',?,'blue',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[tenant,tag,Buffer.from('queue fixture '+tag)]);
 const fixtureRows=[...fixture.rows,...fixture.capacity];
 for(let i=0;i<fixtureRows.length;i++){
  const r=fixtureRows[i],owner=i<2||i>=5?f.principal:i===2?f.adminPrincipal:null,when=new Date(Date.UTC(2026,9,20,10,0,i)).toISOString().replace('T',' ').replace('Z','');
  await operator.execute('INSERT INTO contact_identity(id,tenant_id,connection_id,contact_id,external_subject_id) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id',[r.identity,tenant,ref.connection,ref.contact,'synthetic-queue-'+r.identity]);
  await chatOperator.execute('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,team_id,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id',[r.id,tenant,f.object,owner,i===2?ref.team:null]);
  await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,channel,status,opened_at,closed_at) VALUES (?,?,?,?,?,'mock_messenger',?,?,?) ON DUPLICATE KEY UPDATE record_id=record_id",[tenant,r.id,ref.contact,r.identity,ref.connection,i===4?'closed':'open',when,i===4?when:null]);
  await chatOperator.execute('INSERT INTO chat_control_head(tenant_id,conversation_id,registry_revision,control_revision,cancel_through,pause_through,version,created_at,updated_at) VALUES (?,?,1,1,0,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE conversation_id=conversation_id',[tenant,r.id]);
  await chatOperator.execute("INSERT INTO conversation_workspace(tenant_id,conversation_id,latest_inbound_seq,answered_inbound_seq,last_message_at,waiting_since,waiting_metric_state,snoozed_until,snooze_revision) VALUES (?,?,2,0,?,?,?,NULL,0) ON DUPLICATE KEY UPDATE conversation_id=conversation_id",[tenant,r.id,when,i===0?when:null,i===1?'unavailable':'ready']);
  await chatOperator.execute('INSERT INTO conversation_tag_link(tenant_id,conversation_id,tag_id,actor_principal_id,created_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE tag_id=tag_id',[tenant,r.id,i<5?fixture.tag:fixture.capacityTag,f.principal]);
  await chatOperator.execute('INSERT INTO conversation_read_state(tenant_id,conversation_id,principal_id,id,last_read_inbound_seq,revision,updated_at) VALUES (?,?,?,?,?,1,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id',[tenant,r.id,f.principal,r.read,i===2?2:0]);
  await chatOperator.execute("INSERT INTO message(id,tenant_id,conversation_id,connection_id,provider_message_id,direction,text,occurred_at,received_at,status) VALUES (?,?,?,?,?,'inbound',?,?,?,'received') ON DUPLICATE KEY UPDATE id=id",[r.message,tenant,r.id,ref.connection,r.message,i<5?'Synthetic queue fixture':'S'.repeat(4000),when,when]);
 }
 // Fill only absent local projections for older retained native command fixtures.
 // Unknown historical coverage stays explicitly unavailable; no existing row is reset.
 await chatOperator.execute("INSERT INTO conversation_workspace(tenant_id,conversation_id,last_message_at,waiting_metric_state) SELECT c.tenant_id,c.record_id,COALESCE((SELECT MAX(m.received_at) FROM message m WHERE m.tenant_id=c.tenant_id AND m.conversation_id=c.record_id),c.opened_at),'unavailable' FROM conversation c LEFT JOIN conversation_workspace w ON w.tenant_id=c.tenant_id AND w.conversation_id=c.record_id WHERE c.tenant_id=? AND w.conversation_id IS NULL",[tenant]);
 const predicate={scope:'all',status:['open','pending'],snooze:'exclude',unread:'any',tag_ids:[fixture.tag]};
 for(const inbox of [fixture.inbox,fixture.hidden])await chatOperator.execute("INSERT INTO chat_inbox(tenant_id,id,creator_principal_id,name,predicate_schema_version,predicate,sort,created_at,updated_at) VALUES (?,?,?,'Queue fixture',1,?,'latest_message_desc',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[tenant,inbox,f.adminPrincipal,JSON.stringify(predicate)]);
 await chatOperator.execute("INSERT INTO chat_inbox_share(tenant_id,inbox_id,target_kind,target_id,created_at) VALUES (?,?,'principal',?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE target_id=target_id",[tenant,fixture.inbox,f.principal]);
 const peers={subject:(t,command,admission_id)=>identityClient(t,'admission-cursor-subject',{command,admission_id}),admit:(t,command)=>identityClient(t,'admit',{owner:'chat',command}),settle:(t,command,admission_id)=>identityClient(t,'settle',{owner:'chat',command,admission_id}),policy:(t,command,admission_id,resources)=>identityClient(t,'admission-workspace-policy',{command,admission_id,resources}),contacts:(t,command,admission_id,ids)=>crm(t,'contact-summary-batch',{command,admission_id,ids}),channels:(t,items)=>channel(t,'detail-channel-batch',{items})};
 const query=new ChatWorkspaceQuery(commands,peers,key),server=createWorkloadServer(chatMaterial,chatAuthority,chatWorkspaceQueryRoutes(query));servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');
 const call=ownerCommandClient(bffMaterial,remoteRegistryAuthority(bffMaterial,registryConfig),'chat',new URL(protocol+'//127.0.0.1:'+server.address().port+'/'));
 const request=(payload={},operation='workspace-conversations')=>({schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,operation,command_id:randomUUID(),actor:{kind:'human',principal_id:f.principal,delegation_id:enrollment.delegationId},payload:operation==='workspace-conversations'?{tag_ids:fixture.tag,...payload}:payload}),bad=(p,code)=>assert.rejects(p,e=>e.code===code),ids=result=>result.data.map(v=>v.conversation.id);
 try{
  if(process.argv.includes('--focus=Chat list'))await chatListNative({...ctx,fixture,call,peers,request,key});
  await check('Chat queue native exact counts pagination hydration and partial waiting',async()=>{
   const first=await call(request({limit:2}));assert.deepEqual(ids(first),[id[3],id[2]]);assert.equal(first.meta.conversation_count,'4');assert.equal(first.meta.unread_conversation_count,'3');assert.equal(first.meta.waiting_conversation_count,null);assert.equal(first.meta.waiting_metric_coverage,'partial');assert(first.next_cursor);assert.equal(first.data[0].conversation.contact.id,ref.contact);
   const second=await call(request({limit:2,cursor:first.next_cursor}));assert.deepEqual(ids(second),[id[1],id[0]]);assert.equal(second.next_cursor,null);assert.equal(second.meta.conversation_count,'4');
   const waiting=await call(request({sort:'waiting_longest'}));assert.deepEqual(ids(waiting),[id[0],id[2],id[3]].sort((a,b)=>a===id[0]?-1:b===id[0]?1:a.localeCompare(b)).concat(id[1]));
   const closed=await call(request({status:'closed'}));assert.deepEqual(ids(closed),[id[4]]);assert.equal(closed.meta.waiting_conversation_count,'0');assert.equal(closed.data[0].waiting_since,null);
  });
  await check('Chat queue own scope shared inbox intersection and manager sidebar visibility',async()=>{
   await setRole(grants.map(g=>g.resource==='conversation'?{...g,scope:'own'}:g));try{
    assert.deepEqual(ids(await call(request())),[id[1],id[0]]);
    const req=request();req.payload={inbox_id:fixture.inbox};assert.deepEqual(ids(await call(req)),[id[1],id[0]]);
    req.payload={inbox_id:fixture.hidden};await bad(call(req),'NOT_FOUND');
   }finally{await setRole(grants);}
   await setRole([...grants,{resource:'chat_inbox',action:'manage',scope:'all'}]);try{
    const req=request();req.payload={inbox_id:fixture.hidden};assert.equal((await call(req)).meta.conversation_count,'4');
    const sidebar=await call(request({},'workspace-sidebar'));assert(sidebar.data.inboxes.some(i=>i.id===fixture.inbox));assert(!sidebar.data.inboxes.some(i=>i.id===fixture.hidden));assert(sidebar.data.scopes.some(i=>i.key==='mine'));
   }finally{await setRole(grants);}
  });
  await check('Chat queue filter denial redaction Contact ACL and prefix search',async()=>{
   const [[contact]]=await operator.execute('SELECT display_name FROM contact WHERE tenant_id=? AND record_id=?',[tenant,ref.contact]);assert.equal((await call(request({q:contact.display_name.slice(0,3)}))).meta.conversation_count,'4');
   for(const key of ['status','tags'])await field(f.object,key,['filter'],()=>bad(call(request()),'FIELD_FORBIDDEN'));
   await field(ctx.projectionObjects.get(tenant).contact,'display_name',['read'],async()=>{await bad(call(request({q:'Synthetic'})),'FIELD_FORBIDDEN');assert(!('display_name' in (await call(request())).data[0].conversation.contact));});
   await field(f.object,'text',['read'],async()=>{const r=await call(request());assert(r.data.every(v=>!('text' in v.conversation.latest_message)&&!v.conversation.allowed_actions.includes('reply')));});
   await setRole(grants.filter(g=>g.resource!=='contact'));try{assert((await call(request())).data.every(v=>v.conversation.contact===null));assert.equal((await call(request({q:contact.display_name.slice(0,3)}))).meta.conversation_count,'0');}finally{await setRole(grants);}
  });
  await check('Chat queue current team scope membership cursor and viewer seat fencing',async()=>{
   const [[member]]=await operator.execute('SELECT principal_id FROM team_member WHERE tenant_id=? AND team_id=? AND principal_id=?',[tenant,ref.team,f.principal]);
   const before=await call(request({limit:1}));
   if(!member)await operator.execute('INSERT INTO team_member(tenant_id,team_id,principal_id) VALUES (?,?,?)',[tenant,ref.team,f.principal]);
   try{
    if(!member)await bad(call(request({limit:1,cursor:before.next_cursor})),'QUERY_CHANGED');
    await setRole(grants.map(g=>g.resource==='conversation'?{...g,scope:'team'}:g));
    assert.deepEqual(ids(await call(request())),[id[2]]);assert.deepEqual(ids(await call(request({scope:'team',team_id:ref.team}))),[id[2]]);
   }finally{await setRole(grants);if(!member)await operator.execute('DELETE FROM team_member WHERE tenant_id=? AND team_id=? AND principal_id=?',[tenant,ref.team,f.principal]);}
   const [[seat]]=await operator.execute('SELECT seat_code FROM membership WHERE tenant_id=? AND id=?',[tenant,f.member]);await operator.execute("UPDATE membership SET seat_code='viewer' WHERE tenant_id=? AND id=?",[tenant,f.member]);try{await bad(call(request()),'FORBIDDEN');}finally{await operator.execute('UPDATE membership SET seat_code=? WHERE tenant_id=? AND id=?',[seat.seat_code,tenant,f.member]);}
  });
  await check('Chat queue signed cursors reject tamper expiry query and current rights changes',async()=>{
   const first=await call(request({limit:1}));await bad(call(request({limit:1,cursor:first.next_cursor+'x'})),'INVALID_CURSOR');await bad(call(request({limit:2,cursor:first.next_cursor})),'QUERY_CHANGED');
   const decoded=JSON.parse(Buffer.from(first.next_cursor.split('.')[0],'base64url'));decoded.expires=Date.now()-1;const raw=Buffer.from(JSON.stringify(decoded)).toString('base64url'),expired=raw+'.'+createHmac('sha256',key).update(raw).digest('base64url');await bad(call(request({limit:1,cursor:expired})),'CURSOR_EXPIRED');
   await field(f.object,'text',['read'],()=>bad(call(request({limit:1,cursor:first.next_cursor})),'QUERY_CHANGED'));
  });
  await check('Chat queue snooze unread disabled channel and page filter preserve counts',async()=>{
   const [[old]]=await chatOperator.execute('SELECT snoozed_until,snooze_revision FROM conversation_workspace WHERE tenant_id=? AND conversation_id=?',[tenant,id[0]]),[[connection]]=await operator.execute('SELECT status,external_account_id FROM channel_connection WHERE tenant_id=? AND id=?',[tenant,ref.connection]);
   await chatOperator.execute('UPDATE conversation_workspace SET snoozed_until=TIMESTAMPADD(HOUR,1,UTC_TIMESTAMP(6)),snooze_revision=snooze_revision+1 WHERE tenant_id=? AND conversation_id=?',[tenant,id[0]]);await operator.execute("UPDATE channel_connection SET status='disabled' WHERE tenant_id=? AND id=?",[tenant,ref.connection]);
   try{assert.equal((await call(request())).meta.conversation_count,'3');const r=await call(request({snooze:'only',page_id:connection.external_account_id}));assert.deepEqual(ids(r),[id[0]]);assert(r.data[0].snooze);assert.equal((await call(request({snooze:'include',unread:'only'}))).meta.conversation_count,'3');}finally{await chatOperator.execute('UPDATE conversation_workspace SET snoozed_until=?,snooze_revision=? WHERE tenant_id=? AND conversation_id=?',[old.snoozed_until,old.snooze_revision,tenant,id[0]]);await operator.execute('UPDATE channel_connection SET status=? WHERE tenant_id=? AND id=?',[connection.status,tenant,ref.connection]);}
  });
  await check('Chat queue retained lazy cohort differs from materialized principal marker',async()=>{
   await chatOperator.execute('INSERT INTO chat_read_rollout_principal(tenant_id,principal_id,created_at) VALUES (?,?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE principal_id=principal_id',[tenant,f.adminPrincipal]);
   await chatOperator.execute('INSERT INTO chat_read_rollout_conversation(tenant_id,conversation_id,baseline_inbound_seq) VALUES (?,?,1) ON DUPLICATE KEY UPDATE conversation_id=conversation_id',[tenant,id[4]]);
   const session=await ctx.login(f.adminAccount),enrolled=await new HumanDispatchEnrollment(ctx.ds).enroll(tenant,createHash('sha256').update(session).digest('hex')),req=request({status:'closed'});req.actor={kind:'human',principal_id:f.adminPrincipal,delegation_id:enrolled.delegationId};
   const admin=await call(req),human=await call(request({status:'closed'}));assert.equal(admin.data[0].read_state.last_read_inbound_seq,'1');assert.equal(admin.data[0].read_state.unread_message_count,'1');assert.equal(human.data[0].read_state.last_read_inbound_seq,'0');assert.equal(human.data[0].read_state.unread_message_count,'2');
  });
  await check('Chat queue owner outage stale snapshots and tenant service denies',async()=>{
   const port=ctx.crmServer.address().port;ctx.crmServer.closeAllConnections();await new Promise(resolve=>ctx.crmServer.close(resolve));try{await bad(call(request()),'DEPENDENCY_UNAVAILABLE');}finally{ctx.crmServer.listen(port,'127.0.0.1');await once(ctx.crmServer,'listening');}
   const contacts=peers.contacts;peers.contacts=async(...a)=>{const r=await contacts(...a);await chatOperator.execute('UPDATE crm_record SET version=version+1 WHERE tenant_id=? AND id=?',[tenant,id[0]]);return r;};try{await bad(call(request()),'STALE_VERSION');}finally{peers.contacts=contacts;}
   const contactPolicy=ctx.contactPeers.batch;ctx.contactPeers.batch=async(...a)=>{const r=await contactPolicy(...a);await operator.execute('UPDATE crm_record SET version=version+1 WHERE tenant_id=? AND id=?',[tenant,ref.contact]);return r;};try{await bad(call(request()),'STALE_VERSION');}finally{ctx.contactPeers.batch=contactPolicy;}
   const service=request();service.actor.kind='service';await bad(call(service),'FORBIDDEN');await assert.rejects(call({...request(),tenant_id:other}));
  });
  await check('Chat queue completed native logout aborts delayed batch delivery',async()=>{
   const session=await ctx.login(f.account),actor=await new HumanDispatchEnrollment(ctx.ds).enroll(tenant,createHash('sha256').update(session).digest('hex')),req=request();req.actor.delegation_id=actor.delegationId;
   const contacts=peers.contacts;peers.contacts=async(...a)=>{const r=await contacts(...a);await ctx.drainingAuth.logout(session,'http://localhost:18080',await ctx.auth.csrf(session));return r;};try{await assert.rejects(call(req),e=>['FORBIDDEN','REVOKED','INVALID_TRANSITION'].includes(e.code));}finally{peers.contacts=contacts;}
  });
  await check('Chat queue full 100-row batch preserves bounded transport and message content',async()=>{const started=Date.now(),r=await call(request({tag_ids:fixture.capacityTag,limit:100}));assert.equal(r.data.length,100);assert.equal(r.meta.conversation_count,'100');assert.equal(r.next_cursor,null);assert(r.data.every(v=>v.conversation.latest_message.text.length===4000));console.log('Queue 100-row elapsed_ms='+String(Date.now()-started));});
  await check('Chat queue public native session strict query and no-store'+(process.argv.includes('--with-runtime')?' runtime':''),async()=>{
   const candidate=process.argv.includes('--with-runtime')?await nativeChatParity(ctx,{crm:new URL(protocol+'//127.0.0.1:'+ctx.crmServer.address().port+'/'),connector:new URL(protocol+'//127.0.0.1:'+ctx.connectorServer.address().port+'/')},key):null;
   try{
   const publicServer=createChatCatalogBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),candidate?.call??call);servers.push(publicServer);publicServer.listen(0,'127.0.0.1');await once(publicServer,'listening');const url='http://127.0.0.1:'+publicServer.address().port+'/api/v1/chat-workspace/conversations?tag_ids='+fixture.tag,headers={'x-tenant-id':tenant,cookie:'crm_session='+ctx.actorSession};
   assert.equal((await fetch(url)).status,401);const response=await fetch(url,{headers});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).meta.conversation_count,'4');for(const extra of ['&limit=1&limit=2','&fields=text','&scope=invalid'])assert.equal((await fetch(url+extra,{headers})).status,400);
   if(candidate){const sidebar=await fetch(new URL('/api/v1/chat-workspace/sidebar',url),{headers});assert.equal(sidebar.status,200);assert(candidate.proofCount()>0);}
   }finally{if(candidate)await candidate.stop();}
  });
 }finally{await setRole(grants);}
}
