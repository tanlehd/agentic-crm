import assert from 'node:assert/strict';
import {nativeChatParity} from './chat-runtime-parity.mjs';
import {readFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {once} from 'node:events';
import {createPool} from './chat-native.mjs';
import {ChatInboxes,chatInboxRoutes} from '../../services/chat/dist/inbox.js';
import {createWorkloadServer,ownerClient,ownerCommandClient,remoteRegistryAuthority} from '../../packages/workload-transport/dist/index.js';
import {NativeChannelReferences,channelReferenceOwnerRoutes} from '../../services/core-baseline/dist/modules/channels/owner-reference.js';
import {createChatCatalogBff} from '../../services/core-baseline/dist/gateway/chat-catalog-bff.js';
import {HumanDispatchEnrollment} from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';

export async function chatInboxNative(ctx){
 const {check,operator,chatOperator,commands,tenant,other,f,enrollment,identityClient,chatMaterial,bffMaterial,connectorMaterial,chatAuthority,registryConfig,protocol,servers,env}=ctx;
 const fixture=JSON.parse(await readFile('.local/chat-ownership/reference-fixture.json','utf8'));
 assert.equal(fixture.database,'native_identity_test');assert.equal(fixture.tenant,tenant);
 const channelPool=createPool({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),database:fixture.database,user:'t05_channel_reference_test',password:fixture.channelPassword,timezone:'Z'});
 const channelAuthority=remoteRegistryAuthority(connectorMaterial,registryConfig),channelServer=createWorkloadServer(connectorMaterial,channelAuthority,channelReferenceOwnerRoutes(new NativeChannelReferences(channelPool,()=>{throw new Error('UNUSED_PROOF');})));
 servers.push(channelServer);channelServer.listen(0,'127.0.0.1');await once(channelServer,'listening');
 const channel=ownerClient(chatMaterial,chatAuthority,'connector',new URL(protocol+'//127.0.0.1:'+channelServer.address().port+'/'));
 const peers={admit:(t,command)=>identityClient(t,'admit',{owner:'chat',command}),settle:(t,command,admission_id)=>identityClient(t,'settle',{owner:'chat',command,admission_id}),policy:(t,command,admission_id)=>identityClient(t,'admission-inbox-policy',{command,admission_id}),connection:(t,connection_id)=>channel(t,'catalog-connection-read',{connection_id})};
 const inboxes=new ChatInboxes(commands,peers,Buffer.from(f.key,'hex'));
 const server=createWorkloadServer(chatMaterial,chatAuthority,chatInboxRoutes(inboxes));servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');
 const call=ownerCommandClient(bffMaterial,remoteRegistryAuthority(bffMaterial,registryConfig),'chat',new URL(protocol+'//127.0.0.1:'+server.address().port+'/'));
 const actor={kind:'human',principal_id:f.principal,delegation_id:enrollment.delegationId};
 const adminEnrollment=await new HumanDispatchEnrollment(ctx.ds).enroll(tenant,createHash('sha256').update(ctx.adminSession).digest('hex'));
 const admin={kind:'human',principal_id:f.adminPrincipal,delegation_id:adminEnrollment.delegationId};
 const request=(action,payload={},who=actor)=>({schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,operation:action==='options'?'catalog-inbox-options':action==='shares'?'catalog-inbox-shares':'catalog-'+action+'-'+(action==='list'?'inboxes':'inbox'),command_id:randomUUID(),actor:who,payload});
 const mutation=(action,body,id,version=null,key=randomUUID(),who=actor)=>request(action,{...(id?{id}:{}),body,expected_version:version,idempotency_key:key},who);
 const prefix='Native inbox '+randomUUID().slice(0,8),body=(name,shares=[])=>({name:prefix+' '+name,predicate_schema_version:1,predicate:{scope:'all'},sort:'latest_message_desc',shares});
 const bad=(p,code)=>assert.rejects(p,e=>e.code===code);
 const [[oldRole]]=await operator.execute('SELECT permissions FROM `role` WHERE tenant_id=? AND id=?',[tenant,f.role]);
 const [[oldAdmin]]=await operator.execute('SELECT permissions,`key` FROM `role` WHERE tenant_id=? AND id=?',[tenant,f.adminRole]);
 const original=typeof oldRole.permissions==='string'?JSON.parse(oldRole.permissions):oldRole.permissions;
 const own=[...original,{resource:'chat_inbox',action:'manage',scope:'own'},{resource:'chat_inbox',action:'share',scope:'own'}];
 const manager=[...own,{resource:'chat_inbox',action:'manage',scope:'all'}];
 const setRole=permissions=>operator.execute('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(permissions),tenant,f.role]);
 const setAdmin=permissions=>operator.execute('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(permissions),tenant,f.adminRole]);
 const createdIds=new Set(),create=async(req)=>{const r=await call(req);createdIds.add(r.data.id);return r;};
 let first,firstRequest;
 await setRole(own);await setAdmin(own);await operator.execute("UPDATE `role` SET `key`='inbox_viewer_fixture' WHERE tenant_id=? AND id=?",[tenant,f.adminRole]);
 try{
  await check('Chat inbox native create replay options and atomic event',async()=>{
   firstRequest=mutation('create',body('Own'));first=await create(firstRequest);assert.equal(first.data.version,'1');assert(first.data.allowed_actions.includes('share'));assert.deepEqual(await call(firstRequest),first);
   const options=await call(request('options'));assert(options.data.filter_fields.includes('status'));assert(options.data.principals.some(p=>p.id===f.adminPrincipal));
   const [[event]]=await chatOperator.execute('SELECT COUNT(*) n FROM outbox_event WHERE tenant_id=? AND aggregate_id=?',[tenant,first.data.id]);assert.equal(Number(event.n),1);
  });
  await check('Chat inbox own shared manager list and creator-only share',async()=>{
   await bad(call(request('get',{id:first.data.id},admin)),'NOT_FOUND');
   await setAdmin(manager);
   const listed=await call(request('list',{limit:100},admin));assert(!listed.data.some(r=>r.id===first.data.id));assert.equal((await call(request('get',{id:first.data.id},admin))).data.id,first.data.id);
   await bad(call(mutation('shares',{shares:[]},first.data.id,'1',randomUUID(),admin)),'FORBIDDEN');
   await setAdmin(own);
   const shared=await call(mutation('shares',{shares:[{kind:'principal',id:f.adminPrincipal}]},first.data.id,'1'));assert.equal(shared.data.version,'2');
   const view=await call(request('get',{id:first.data.id},admin));assert.equal(view.data.shared,true);assert(!('shares' in view.data));assert.deepEqual(view.data.allowed_actions,[]);
   await call(mutation('shares',{shares:[]},first.data.id,'2'));await bad(call(request('get',{id:first.data.id},admin)),'NOT_FOUND');
  });
  await check('Chat inbox active targets filter fields disabled connection and retained replay',async()=>{
   await bad(call(mutation('create',body('Bad target',[{kind:'principal',id:randomUUID()}]))),'INVALID_SHARE_TARGET');
   await bad(call(mutation('create',body('Cross tenant target',[{kind:'principal',id:f.otherPrincipal}]))),'INVALID_SHARE_TARGET');
   const req=mutation('create',body('Reference',[{kind:'team',id:fixture.team}]));req.payload.body.predicate={scope:'team',team_id:fixture.team,channel_id:fixture.connection};
   const [[connection]]=await operator.execute('SELECT status FROM channel_connection WHERE tenant_id=? AND id=?',[tenant,fixture.connection]);
   await operator.execute("UPDATE channel_connection SET status='disabled' WHERE tenant_id=? AND id=?",[tenant,fixture.connection]);
   let result;
   try{result=await create(req);}finally{await operator.execute('UPDATE channel_connection SET status=? WHERE tenant_id=? AND id=?',[connection.status,tenant,fixture.connection]);}
   const [[team]]=await operator.execute('SELECT active FROM team WHERE tenant_id=? AND id=?',[tenant,fixture.team]);await operator.execute('UPDATE team SET active=0 WHERE tenant_id=? AND id=?',[tenant,fixture.team]);
   try{assert.deepEqual(await call(req),result);await bad(call({...req,payload:{...req.payload,idempotency_key:randomUUID()}}),'INVALID_SHARE_TARGET');}finally{await operator.execute('UPDATE team SET active=? WHERE tenant_id=? AND id=?',[team.active,tenant,fixture.team]);}
   const [[policy]]=await operator.execute('SELECT property_key,denied_actions FROM field_policy WHERE tenant_id=? AND id=?',[tenant,f.policy]);
   await operator.execute("UPDATE field_policy SET property_key='status',denied_actions=? WHERE tenant_id=? AND id=?",[JSON.stringify(['filter']),tenant,f.policy]);
   try{await bad(call(mutation('create',body('Field denied'))),'FIELD_FORBIDDEN');assert.deepEqual(await call(req),result);}finally{await operator.execute('UPDATE field_policy SET property_key=?,denied_actions=? WHERE tenant_id=? AND id=?',[policy.property_key,typeof policy.denied_actions==='string'?policy.denied_actions:JSON.stringify(policy.denied_actions),tenant,f.policy]);}
  });
  await check('Chat inbox versions archive transfer and fresh replay authorization',async()=>{
   await bad(call(mutation('patch',{name:prefix+' Edited'},first.data.id)),'PRECONDITION_REQUIRED');
   await bad(call(mutation('patch',{name:prefix+' Edited'},first.data.id,'1')),'VERSION_CONFLICT');
   await bad(call(mutation('patch',{creator_principal_id:f.adminPrincipal},first.data.id,'3')),'FORBIDDEN');
   await setRole(manager);
   const transferred=await call(mutation('patch',{creator_principal_id:f.adminPrincipal},first.data.id,'3'));assert.equal(transferred.data.version,'4');assert.equal(transferred.data.creator_principal_id,f.adminPrincipal);
   await setRole(own);await bad(call(firstRequest),'NOT_FOUND');
   const archive=mutation('delete',{},first.data.id,'4',randomUUID(),admin),done=await call(archive);assert.equal(done.data.archived,true);assert.deepEqual(await call(archive),done);await bad(call(request('get',{id:first.data.id},admin)),'NOT_FOUND');
  });
  await check('Chat inbox concurrent same key and serialized creator quota',async()=>{
   const req=mutation('create',body('Concurrent'));const attempts=await Promise.allSettled(Array.from({length:3},()=>call({...req,request_id:randomUUID()})));assert(attempts.some(r=>r.status==='fulfilled'));
   const one=await create(req);for(const attempt of attempts)if(attempt.status==='fulfilled')assert.equal(attempt.value.data.id,one.data.id);
   const [[event]]=await chatOperator.execute('SELECT COUNT(*) n FROM outbox_event WHERE tenant_id=? AND aggregate_id=?',[tenant,one.data.id]);assert.equal(Number(event.n),1);
   const [[count]]=await chatOperator.execute('SELECT COUNT(*) n FROM chat_inbox WHERE tenant_id=? AND creator_principal_id=? AND archived_at IS NULL',[tenant,f.principal]);
   assert(Number(count.n)<49,'Retained fixture creator must have room for quota boundary');
   const fillers=[];for(let n=Number(count.n);n<49;n++){const id=randomUUID();fillers.push(id);await chatOperator.execute("INSERT INTO chat_inbox(tenant_id,id,creator_principal_id,name,predicate,sort,created_at,updated_at) VALUES (?,?,?,?,?,'latest_message_desc',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[tenant,id,f.principal,prefix+' Quota',JSON.stringify({scope:'all',status:['open','pending'],snooze:'exclude',unread:'any'})]);}
   try{
    const results=await Promise.allSettled([call(mutation('create',body('Quota A'))),call(mutation('create',body('Quota B')))]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'INBOX_QUOTA');for(const r of results)if(r.status==='fulfilled')createdIds.add(r.value.data.id);
   }finally{for(const id of fillers)await chatOperator.execute('UPDATE chat_inbox SET archived_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[tenant,id]);}
  });
  await check('Chat inbox cursor binds query current rights and team membership',async()=>{
   for(const name of ['Page A','Page B'])await create(mutation('create',body(name)));
   const page=await call(request('list',{limit:1}));assert(page.next_cursor);const next=await call(request('list',{limit:1,cursor:page.next_cursor}));assert.notEqual(next.data[0].id,page.data[0].id);
   await bad(call(request('list',{limit:1,group:'by_me',cursor:page.next_cursor})),'QUERY_CHANGED');await bad(call(request('list',{limit:1,cursor:page.next_cursor+'x'})),'INVALID_CURSOR');
   await setRole(manager);try{await bad(call(request('list',{limit:1,cursor:page.next_cursor})),'QUERY_CHANGED');}finally{await setRole(own);}
   const req=mutation('create',body('Team visibility',[{kind:'team',id:fixture.team}])),shared=await create(req);
   const [[member]]=await operator.execute('SELECT principal_id FROM team_member WHERE tenant_id=? AND team_id=? AND principal_id=?',[tenant,fixture.team,f.adminPrincipal]);
   if(!member)await operator.execute('INSERT INTO team_member(tenant_id,team_id,principal_id) VALUES (?,?,?)',[tenant,fixture.team,f.adminPrincipal]);
   try{assert.equal((await call(request('get',{id:shared.data.id},admin))).data.id,shared.data.id);}finally{if(!member)await operator.execute('DELETE FROM team_member WHERE tenant_id=? AND team_id=? AND principal_id=?',[tenant,fixture.team,f.adminPrincipal]);}
   if(!member)await bad(call(request('get',{id:shared.data.id},admin)),'NOT_FOUND');
  });
  await check('Chat inbox lost settlement ACK replay and completed logout fence',async()=>{
   const req=mutation('create',body('ACK')),settle=peers.settle;let lost=false;peers.settle=async(...a)=>{const r=await settle(...a);if(!lost){lost=true;throw new Error('SYNTHETIC_ACK_LOSS');}return r;};
   try{await assert.rejects(call(req));}finally{peers.settle=settle;}const result=await create(req);assert.equal(result.data.version,'1');
   const session=await ctx.login(f.account),enrolled=await new HumanDispatchEnrollment(ctx.ds).enroll(tenant,createHash('sha256').update(session).digest('hex'));
   const denied=mutation('create',body('Logged out'));denied.actor={...actor,delegation_id:enrolled.delegationId};const policy=peers.policy;
   peers.policy=async(...a)=>{const p=await policy(...a);await ctx.drainingAuth.logout(session,'http://localhost:18080',await ctx.auth.csrf(session));return p;};
   try{await bad(call(denied),'INVALID_TRANSITION');}finally{peers.policy=policy;}
   const [[row]]=await chatOperator.execute('SELECT COUNT(*) n FROM chat_inbox WHERE tenant_id=? AND name=?',[tenant,denied.payload.body.name]);assert.equal(Number(row.n),0);
  });
  await check('Chat inbox public native session CSRF ETag and share routes'+(process.argv.includes('--with-runtime')?' runtime':''),async()=>{
   const candidate=process.argv.includes('--with-runtime')?await nativeChatParity(ctx,{connector:new URL(protocol+'//127.0.0.1:'+channelServer.address().port+'/')},Buffer.from(f.key,'hex')):null;
   try{
   const publicServer=createChatCatalogBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),candidate?.call??call);servers.push(publicServer);publicServer.listen(0,'127.0.0.1');await once(publicServer,'listening');
   const root='http://127.0.0.1:'+publicServer.address().port+'/api/v1/chat-workspace',headers={'x-tenant-id':tenant,cookie:'crm_session='+ctx.actorSession,origin:'http://localhost:18080','x-csrf-token':await ctx.auth.csrf(ctx.actorSession),'content-type':'application/json','idempotency-key':randomUUID()},payload=JSON.stringify(body('Public'));
   assert.equal((await fetch(root+'/inboxes',{method:'POST',headers:{...headers,'x-csrf-token':'bad'},body:payload})).status,403);
   const response=await fetch(root+'/inboxes',{method:'POST',headers,body:payload});assert.equal(response.status,201);assert.equal(response.headers.get('etag'),'"1"');const result=await response.json();createdIds.add(result.data.id);
   assert.equal((await fetch(root+'/inbox-options',{headers})).status,200);assert.equal((await fetch(root+'/inboxes?group=by_me&limit=1',{headers})).status,200);
   const shared=await fetch(root+'/inboxes/'+result.data.id+'/shares',{method:'PUT',headers:{...headers,'if-match':'"1"','idempotency-key':randomUUID()},body:JSON.stringify({shares:[{kind:'principal',id:f.adminPrincipal}]})});assert.equal(shared.status,200);assert.equal(shared.headers.get('etag'),'"2"');
   }finally{if(candidate)await candidate.stop();}
  });
  await check('Chat inbox current permission tenant service and writer fencing',async()=>{
   await setRole(original);try{await bad(call(request('options')),'FORBIDDEN');await bad(call(mutation('create',body('Revoked'))),'FORBIDDEN');}finally{await setRole(own);}
   await bad(call({...request('list'),tenant_id:other}),'FORBIDDEN');await bad(call({...request('list'),actor:{...actor,kind:'service'}}),'FORBIDDEN');
   const [[gate]]=await chatOperator.execute('SELECT epoch FROM chat_writer_gate WHERE tenant_id=?',[tenant]);await chatOperator.execute('UPDATE chat_writer_gate SET epoch=epoch+1 WHERE tenant_id=?',[tenant]);try{await bad(call(request('list')),'DEPENDENCY_UNAVAILABLE');}finally{await chatOperator.execute('UPDATE chat_writer_gate SET epoch=? WHERE tenant_id=?',[gate.epoch,tenant]);}
  });
 }finally{
  await setRole(original);await operator.execute('UPDATE `role` SET permissions=?,`key`=? WHERE tenant_id=? AND id=?',[typeof oldAdmin.permissions==='string'?oldAdmin.permissions:JSON.stringify(oldAdmin.permissions),oldAdmin.key,tenant,f.adminRole]);
  // Keep all synthetic definitions/receipts/events; archive this run's definitions to reuse creator quota.
  for(const id of createdIds)await chatOperator.execute('UPDATE chat_inbox SET archived_at=COALESCE(archived_at,UTC_TIMESTAMP(6)) WHERE tenant_id=? AND id=?',[tenant,id]);
  await channelPool.end();
 }
}
