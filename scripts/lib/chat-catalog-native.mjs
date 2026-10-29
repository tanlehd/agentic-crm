import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {once} from 'node:events';
import {ChatCatalog,chatCatalogRoutes} from '../../services/chat/dist/catalog.js';
import {createWorkloadServer,ownerCommandClient,remoteRegistryAuthority} from '../../packages/workload-transport/dist/index.js';
import {createChatCatalogBff} from '../../services/core-baseline/dist/gateway/chat-catalog-bff.js';
import {HumanDispatchEnrollment} from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';
import {nativeChatParity} from './chat-runtime-parity.mjs';

export async function chatCatalogNative(ctx){
 const {check,operator,chatOperator,commands,tenant,other,f,enrollment,identityClient,chatMaterial,bffMaterial,chatAuthority,registryConfig,protocol,servers}=ctx;
 const peers={admit:(t,command)=>identityClient(t,'admit',{owner:'chat',command}),settle:(t,command,admission_id)=>identityClient(t,'settle',{owner:'chat',command,admission_id}),policy:(t,command,admission_id)=>identityClient(t,'admission-catalog-policy',{command,admission_id})};
 const catalog=new ChatCatalog(commands,peers,Buffer.from(f.key,'hex')),server=createWorkloadServer(chatMaterial,chatAuthority,chatCatalogRoutes(catalog));servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');
 const call=ownerCommandClient(bffMaterial,remoteRegistryAuthority(bffMaterial,registryConfig),'chat',new URL(protocol+'//127.0.0.1:'+server.address().port+'/'));
 const request=(kind,action,payload={})=>({schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,operation:'catalog-'+action+'-'+(action==='list'?kind:kind==='tags'?'tag':'snippet'),command_id:randomUUID(),actor:{kind:'human',principal_id:f.principal,delegation_id:enrollment.delegationId},payload});
 const mutation=(kind,action,body,id,version=null,key=randomUUID())=>request(kind,action,{...(id?{id}:{}),body,expected_version:version,idempotency_key:key});
 const bad=(promise,code)=>assert.rejects(promise,e=>e.code===code);
 const [[old]]=await operator.execute('SELECT permissions FROM `role` WHERE tenant_id=? AND id=?',[tenant,f.role]);const original=typeof old.permissions==='string'?JSON.parse(old.permissions):old.permissions;
 const grants=[...original,{resource:'conversation_tag',action:'manage',scope:'all'},{resource:'chat_snippet',action:'read',scope:'all'},{resource:'chat_snippet',action:'manage',scope:'all'}];
 await operator.execute('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants),tenant,f.role]);
 const prefix='Native '+randomUUID().slice(0,8);let tag,snippet,createTag,createSnippet;
 try{
  await check('Chat catalog native tag snippet create replay and minimized atomic events',async()=>{
   createTag=mutation('tags','create',{name:prefix+' A',color:'blue'});tag=await call(createTag);assert.equal(tag.data.name,prefix+' A');assert.deepEqual(await call(createTag),tag);
   createSnippet=mutation('snippets','create',{title:prefix,text:' Synthetic snippet ',shortcut:'n_'+randomUUID().replaceAll('-','').slice(0,20)});snippet=await call(createSnippet);assert.equal(snippet.data.text,' Synthetic snippet ');assert.deepEqual(await call(createSnippet),snippet);
   for(const result of [tag,snippet]){const [events]=await chatOperator.execute('SELECT payload FROM outbox_event WHERE tenant_id=? AND aggregate_id=?',[tenant,result.data.id]);assert.equal(events.length,1);assert(!JSON.stringify(events).includes('Synthetic snippet'));}
  });
  await check('Chat catalog tenant names shortcuts versions archive and retained receipt semantics',async()=>{
   await bad(call(mutation('tags','create',{name:tag.data.name.toUpperCase(),color:'red'})),'NAME_CONFLICT');
   await bad(call(mutation('snippets','create',{title:'Other',text:'Synthetic',shortcut:snippet.data.shortcut})),'SHORTCUT_CONFLICT');
   await bad(call(mutation('tags','patch',{color:'green'},tag.data.id)),'PRECONDITION_REQUIRED');
   await bad(call(mutation('tags','patch',{color:'green'},tag.data.id,'2')),'VERSION_CONFLICT');
   const changed=await call(mutation('tags','patch',{color:'green'},tag.data.id,'1'));assert.equal(changed.data.version,'2');
   const archive=mutation('tags','delete',{},tag.data.id,'2'),done=await call(archive);assert.equal(done.data.archived,true);assert.deepEqual(await call(archive),done);
   await bad(call(request('tags','get',{id:tag.data.id})),'NOT_FOUND');
   await bad(call(mutation('tags','patch',{color:'blue'},tag.data.id,'3')),'ARCHIVED');
   assert.deepEqual(await call(createTag),tag,'create replay retains original response even after archive');
   await bad(call({...request('snippets','get',{id:snippet.data.id}),tenant_id:other}),'FORBIDDEN');
  });
  await check('Chat catalog signed pagination prefix and query binding',async()=>{
   for(const name of ['B','C','D'])await call(mutation('tags','create',{name:prefix+' '+name,color:'amber'}));
   const first=await call(request('tags','list',{q:prefix,limit:1}));assert.equal(first.data.length,1);assert(first.next_cursor);assert(first.meta.allowed_actions.includes('create'));
   const next=await call(request('tags','list',{q:prefix,limit:1,cursor:first.next_cursor}));assert.notEqual(first.data[0].id,next.data[0].id);
   await bad(call(request('tags','list',{q:prefix+' B',limit:1,cursor:first.next_cursor})),'QUERY_CHANGED');
   await bad(call(request('tags','list',{q:prefix,limit:1,cursor:first.next_cursor+'x'})),'INVALID_CURSOR');
  });
  await check('Chat catalog current manage revoke denies receipt replay and removes actions',async()=>{
   await operator.execute('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants.filter(g=>g.action!=='manage')),tenant,f.role]);
   try{
    await bad(call(createSnippet),'FORBIDDEN');
    const read=await call(request('snippets','get',{id:snippet.data.id}));assert.deepEqual(read.data.allowed_actions,[]);
   }finally{await operator.execute('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants),tenant,f.role]);}
  });
  await check('Chat catalog current tags field deny fails closed for list',async()=>{
   const [[old]]=await operator.execute('SELECT property_key,denied_actions FROM field_policy WHERE tenant_id=? AND id=?',[tenant,f.policy]);
   await operator.execute("UPDATE field_policy SET property_key='tags',denied_actions=? WHERE tenant_id=? AND id=?",[JSON.stringify(['read']),tenant,f.policy]);
   try{await bad(call(request('tags','list',{})),'FIELD_FORBIDDEN');}
   finally{await operator.execute('UPDATE field_policy SET property_key=?,denied_actions=? WHERE tenant_id=? AND id=?',[old.property_key,typeof old.denied_actions==='string'?old.denied_actions:JSON.stringify(old.denied_actions),tenant,f.policy]);}
  });
  await check('Chat catalog settlement loss and policy outage cannot duplicate committed definition',async()=>{
   const req=mutation('snippets','patch',{title:prefix+' edited'},snippet.data.id,'1'),settle=peers.settle;let lost=false;
   peers.settle=async(...args)=>{const r=await settle(...args);if(!lost){lost=true;throw new Error('SYNTHETIC_ACK_LOSS');}return r;};
   try{await assert.rejects(call(req));}finally{peers.settle=settle;}
   assert.equal((await call(req)).data.version,'2');
   const policy=peers.policy;peers.policy=async()=>{throw new Error('SYNTHETIC_POLICY_OUTAGE');};
   try{await bad(call(request('snippets','get',{id:snippet.data.id})),'DEPENDENCY_UNAVAILABLE');}finally{peers.policy=policy;}
  });
  await check('Chat catalog concurrent same key resolves one definition and one event',async()=>{
   const command=mutation('tags','create',{name:prefix+' Concurrent',color:'gray'});
   const attempts=await Promise.allSettled(Array.from({length:3},()=>call({...command,request_id:randomUUID()})));
   assert(attempts.some(r=>r.status==='fulfilled'));
   const result=await call(command);for(const attempt of attempts)if(attempt.status==='fulfilled')assert.equal(attempt.value.data.id,result.data.id);
   const [[effects]]=await chatOperator.execute('SELECT COUNT(*) n FROM outbox_event WHERE tenant_id=? AND aggregate_id=?',[tenant,result.data.id]);assert.equal(Number(effects.n),1);
  });
  await check('Chat catalog completed native logout aborts admitted write before effect',async()=>{
   const session=await ctx.login(f.account),enrolled=await new HumanDispatchEnrollment(ctx.ds).enroll(tenant,createHash('sha256').update(session).digest('hex'));
   const command=mutation('tags','create',{name:prefix+' Revoked',color:'gray'});command.actor.delegation_id=enrolled.delegationId;
   const old=peers.policy;peers.policy=async(...args)=>{const policy=await old(...args);await ctx.drainingAuth.logout(session,'http://localhost:18080',await ctx.auth.csrf(session));return policy;};
   try{await bad(call(command),'INVALID_TRANSITION');}finally{peers.policy=old;}
   const [[row]]=await chatOperator.execute('SELECT COUNT(*) n FROM conversation_tag WHERE tenant_id=? AND name=?',[tenant,command.payload.body.name]);assert.equal(Number(row.n),0);
  });
  await check('Chat catalog public native CSRF CRUD filtering and ETag preserve existing wire'+(process.argv.includes('--with-runtime')?' runtime':''),async()=>{
   const candidate=process.argv.includes('--with-runtime')?await nativeChatParity(ctx,{},Buffer.from(f.key,'hex')):null;
   try{
   const publicServer=createChatCatalogBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),candidate?.call??call);servers.push(publicServer);publicServer.listen(0,'127.0.0.1');await once(publicServer,'listening');
   const root='http://127.0.0.1:'+publicServer.address().port+'/api/v1/chat-workspace/tags';
   const headers={'x-tenant-id':tenant,cookie:'crm_session='+ctx.actorSession,origin:'http://localhost:18080','x-csrf-token':await ctx.auth.csrf(ctx.actorSession),'content-type':'application/json','idempotency-key':randomUUID()};
   const body=JSON.stringify({name:prefix+' Public',color:'purple'});
   assert.equal((await fetch(root,{method:'POST',headers:{...headers,'x-csrf-token':'bad'},body})).status,403);
   const created=await fetch(root,{method:'POST',headers,body});assert.equal(created.status,201);const row=await created.json();assert.equal(created.headers.get('etag'),'"1"');
   const replay=await fetch(root,{method:'POST',headers,body});assert.equal(replay.status,201);assert.deepEqual(await replay.json(),row);
   const listed=await fetch(root+'?q='+encodeURIComponent(prefix)+'&limit=1',{headers});assert.equal(listed.status,200);assert.equal((await listed.json()).data.length,1);
   assert.equal((await fetch(root+'/'+row.data.id,{headers})).status,200);
   const patched=await fetch(root+'/'+row.data.id,{method:'PATCH',headers:{...headers,'if-match':'"1"','idempotency-key':randomUUID()},body:JSON.stringify({color:'red'})});assert.equal(patched.status,200);assert.equal(patched.headers.get('etag'),'"2"');
   const archived=await fetch(root+'/'+row.data.id,{method:'DELETE',headers:{...headers,'if-match':'"2"','idempotency-key':randomUUID()},body:'{}'});assert.equal(archived.status,200);assert.equal((await archived.json()).data.archived,true);
   if(candidate){
    const snippetRoot=root.replace(/tags$/,'snippets'),snippet=await fetch(snippetRoot,{method:'POST',headers:{...headers,'idempotency-key':randomUUID()},body:JSON.stringify({title:prefix,text:'Synthetic runtime snippet',shortcut:'r_'+randomUUID().replaceAll('-','').slice(0,20)})});assert.equal(snippet.status,201);const saved=await snippet.json();
    const read=await fetch(snippetRoot+'/'+saved.data.id,{headers});assert.equal(read.status,200);assert.equal((await read.json()).data.text,'Synthetic runtime snippet');assert(candidate.proofCount()>0);
   }
   }finally{if(candidate)await candidate.stop();}
  });
  await check('Chat catalog writer fence and forged actor deny local effects',async()=>{
   const forged=request('tags','list',{});forged.actor.kind='service';await bad(call(forged),'FORBIDDEN');
   const [[gate]]=await chatOperator.execute('SELECT epoch FROM chat_writer_gate WHERE tenant_id=?',[tenant]);await chatOperator.execute('UPDATE chat_writer_gate SET epoch=epoch+1 WHERE tenant_id=?',[tenant]);
   try{await bad(call(request('tags','list',{})),'DEPENDENCY_UNAVAILABLE');}finally{await chatOperator.execute('UPDATE chat_writer_gate SET epoch=? WHERE tenant_id=?',[gate.epoch,tenant]);}
  });
 }finally{await operator.execute('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(original),tenant,f.role]);}
}
