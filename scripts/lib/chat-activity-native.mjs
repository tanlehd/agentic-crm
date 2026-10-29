import {nativeChatParity} from './chat-runtime-parity.mjs';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID,randomBytes,createHash,createCipheriv,createDecipheriv} from 'node:crypto';
import {once} from 'node:events';
import {createPool,rootSQL} from './chat-native.mjs';
import {ChatActivity,chatActivityRoutes} from '../../services/chat/dist/activity.js';
import {NativeNotes,noteReadRoutes} from '../../services/core-baseline/dist/modules/crm/owner-notes.js';
import {NativeWorkflowActivity,workflowActivityRoutes} from '../../services/core-baseline/dist/modules/workflow/owner-activity.js';
import {crmActivityBindingRoutes} from '../../services/core-baseline/dist/modules/crm/owner-activity-binding.js';
import {workflowActivityBindingRoutes} from '../../services/core-baseline/dist/modules/workflow/owner-activity-binding.js';
import {chatActivityNotificationsNative} from './chat-activity-notifications-native.mjs';
import {channelHistoryOwnerRoutes} from '../../services/core-baseline/dist/modules/channels/history-owner.js';
import {ChatHistoryBff,createChatHistoryBff} from '../../services/core-baseline/dist/gateway/chat-history-bff.js';
import {HumanDispatchEnrollment} from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';
import {createWorkloadServer,ownerClient,ownerCommandClient,remoteRegistryAuthority} from '../../packages/workload-transport/dist/index.js';

export async function chatActivityNative(ctx){
 const {check,operator,chatOperator,chatPool,commands,tenant,other,f,ref,enrollment,identityClient,chatMaterial,bffMaterial,crmMaterial,workflowMaterial,connectorMaterial,chatAuthority,registryConfig,protocol,servers,env,projectionObjects,chatServer,setRole,field}=ctx;
 const path='.local/chat-ownership/activity-fixture.json';let fixture;
 try{fixture=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;fixture={tenant,environment:'retained-test',...Object.fromEntries(['conversation','identity','message','reply','note','archived','run','definition','version','actor','event','tag'].map(k=>[k,randomUUID()])),key:randomBytes(32).toString('hex')};await writeFile(path,JSON.stringify(fixture),{flag:'wx',mode:0o600});}
 assert.equal(fixture.tenant,tenant);assert.equal(fixture.environment,'retained-test');
 if(process.argv.includes('--provision'))rootSQL(`CREATE USER IF NOT EXISTS 't05_crm_activity_test'@'%' IDENTIFIED BY '${ref.crmPassword}';
 ${['activity','crm_record','object_type','record_team_access','outbox_event'].map(t=>`GRANT SELECT ON native_identity_test.${t} TO 't05_crm_activity_test'@'%';`).join('\n')}
 CREATE USER IF NOT EXISTS 't05_workflow_activity_test'@'%' IDENTIFIED BY '${ref.crmPassword}';
 ${['workflow_run','outbox_event'].map(t=>`GRANT SELECT ON native_identity_test.${t} TO 't05_workflow_activity_test'@'%';`).join('\n')}`);
 const pool=user=>createPool({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),database:ref.database,user,password:user==='t05_channel_detail_test'?ref.channelPassword:ref.crmPassword,timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true});
 const crmPool=pool('t05_crm_activity_test'),workflowPool=pool('t05_workflow_activity_test'),channelPool=pool('t05_channel_detail_test');
 async function seedConversation(v){
  await operator.execute('INSERT INTO contact_identity(id,tenant_id,connection_id,contact_id,external_subject_id) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id',[v.identity,tenant,ref.connection,ref.contact,'synthetic-activity-'+v.identity]);
  await chatOperator.execute('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id',[v.conversation,tenant,f.object,f.principal]);
  await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at) VALUES (?,?,?,?,?,'open',UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE record_id=record_id",[tenant,v.conversation,ref.contact,v.identity,ref.connection]);
  await chatOperator.execute('INSERT INTO chat_control_head(tenant_id,conversation_id,registry_revision,control_revision,cancel_through,pause_through,version,created_at,updated_at) VALUES (?,?,1,1,0,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE conversation_id=conversation_id',[tenant,v.conversation]);
  await chatOperator.execute('INSERT INTO conversation_activity_counter(tenant_id,conversation_id,backfilled) VALUES (?,?,TRUE) ON DUPLICATE KEY UPDATE conversation_id=conversation_id',[tenant,v.conversation]);
 }
 async function append(id,kind,source,revision,payload){
  const service=kind==='note'?'crm':kind==='automation'?'workflow':'chat';
  const [[old]]=await chatOperator.execute('SELECT id FROM conversation_activity WHERE tenant_id=? AND conversation_id=? AND source_service=? AND source_kind=? AND source_id=? AND source_revision=?',[tenant,id,service,kind,source,revision]);if(old)return;
  const c=await chatOperator.getConnection();try{await c.beginTransaction();await c.execute('SELECT id FROM crm_record WHERE tenant_id=? AND id=? FOR UPDATE',[tenant,id]);await c.execute('UPDATE conversation_activity_counter SET last_seq=last_seq+1 WHERE tenant_id=? AND conversation_id=?',[tenant,id]);
   await c.execute('INSERT INTO conversation_activity(tenant_id,id,conversation_id,activity_seq,source_service,source_kind,source_id,source_revision,kind,occurred_at,recorded_at,payload) SELECT tenant_id,?,conversation_id,last_seq,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),? FROM conversation_activity_counter WHERE tenant_id=? AND conversation_id=?',[randomUUID(),service,kind,source,revision,kind,JSON.stringify(payload),tenant,id]);await c.commit();
  }catch(e){await c.rollback();throw e;}finally{c.release();}
 }
 await seedConversation(fixture);
 for(const id of [fixture.reply,fixture.message])await chatOperator.execute("INSERT INTO message(id,tenant_id,conversation_id,connection_id,provider_message_id,direction,text,occurred_at,received_at,status) VALUES (?,?,?,?,?,'inbound','Synthetic activity message',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'received') ON DUPLICATE KEY UPDATE id=id",[id,tenant,fixture.conversation,ref.connection,id]);
 await chatOperator.execute('INSERT INTO message_content(tenant_id,message_id,content) VALUES (?,?,?) ON DUPLICATE KEY UPDATE message_id=message_id',[tenant,fixture.message,JSON.stringify({version:1,message_type:'text',text:'Synthetic activity message',reply_to:{external_msg_id:fixture.reply},attachment:null})]);
 for(const id of [fixture.note,fixture.archived]){
  await operator.execute('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id',[id,tenant,projectionObjects.get(tenant).activity,f.principal,id===fixture.archived?'2026-10-20 00:00:00':null]);
  await operator.execute("INSERT INTO activity(tenant_id,record_id,kind,subject,body,related_record_id) VALUES (?,?,'note','Synthetic activity note','Synthetic CRM activity body',?) ON DUPLICATE KEY UPDATE record_id=record_id",[tenant,id,fixture.conversation]);
 }
 await operator.execute("INSERT INTO service_actor(id,tenant_id,`key`,role_id,created_at,updated_at) VALUES (?,?,?, ?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[fixture.actor,tenant,'activity-'+fixture.actor,f.role]);
 await operator.execute('INSERT INTO workflow_definition(id,tenant_id,`key`,name,service_actor_id) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id',[fixture.definition,tenant,'activity-'+fixture.definition,'Synthetic activity source',fixture.actor]);
 await operator.execute("INSERT INTO workflow_version(id,tenant_id,definition_id,number,graph,execution_role_id,state) VALUES (?,?,?,1,'{}',?,'draft') ON DUPLICATE KEY UPDATE id=id",[fixture.version,tenant,fixture.definition,f.role]);
 const trigger={aggregate_id:fixture.conversation,contact_id:ref.contact,connection_id:ref.connection};
 await operator.execute("INSERT INTO workflow_run(id,tenant_id,definition_id,version_id,trigger_event_id,service_actor_id,current_node,context,status,correlation_id,activity_revision) VALUES (?,?,?,?,?,?,'test',?,'completed',?,2) ON DUPLICATE KEY UPDATE id=id",[fixture.run,tenant,fixture.definition,fixture.version,fixture.event,fixture.actor,JSON.stringify({trigger}),fixture.event]);
 await append(fixture.conversation,'message',fixture.message,'1',{message_id:fixture.message});
 await append(fixture.conversation,'note',fixture.note,'1',{activity_id:fixture.note});
 await append(fixture.conversation,'note',fixture.archived,'1',{activity_id:fixture.archived});
 await append(fixture.conversation,'assignment',fixture.conversation,'1',{from_principal_id:null,to_principal_id:f.principal,owner_revision:'1',reason:'Synthetic assignment'});
 await append(fixture.conversation,'lifecycle',fixture.conversation,'1',{from_status:'open',to_status:'pending'});
 await append(fixture.conversation,'snooze',fixture.conversation,'1',{until:null,cause:'manual'});
 await append(fixture.conversation,'tags',fixture.conversation,'1',{tag_id:fixture.tag,operation:'attached'});
 await append(fixture.conversation,'automation',fixture.run,'1',{source_service:'workflow',run_id:fixture.run,definition_version_id:fixture.version,state:'started'});
 const listen=async(material,routes)=>{const server=createWorkloadServer(material,remoteRegistryAuthority(material,registryConfig),routes);servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');return server;};
 const client=(material,owner,server)=>ownerClient(material,remoteRegistryAuthority(material,registryConfig),owner,new URL(protocol+'//127.0.0.1:'+server.address().port+'/'));
 const sourcePeers=material=>({proof:client(material,'chat',chatServer),identity:ownerClient(material,remoteRegistryAuthority(material,registryConfig),'identity',new URL('/',registryConfig.url))});
 const cp=sourcePeers(crmMaterial),wp=sourcePeers(workflowMaterial);
 const crmServer=await listen(crmMaterial,{...noteReadRoutes(new NativeNotes(crmPool,(t,command)=>cp.proof(t,'command-proof',command),(t,input)=>cp.identity(t,'admission-note-policy',input))),...crmActivityBindingRoutes(crmPool)});
 const workflowServer=await listen(workflowMaterial,{...workflowActivityRoutes(new NativeWorkflowActivity(workflowPool,(t,command)=>wp.proof(t,'command-proof',command),(t,input)=>wp.identity(t,'admission-activity-policy',input))),...workflowActivityBindingRoutes(workflowPool)});
 const channelServer=await listen(connectorMaterial,channelHistoryOwnerRoutes(channelPool));
 const crm=client(chatMaterial,'crm',crmServer),workflow=client(chatMaterial,'workflow',workflowServer),channel=client(chatMaterial,'connector',channelServer);
 const peers={admit:(t,command)=>identityClient(t,'admit',{owner:'chat',command}),settle:(t,command,admission_id)=>identityClient(t,'settle',{owner:'chat',command,admission_id}),policy:(t,command,admission_id)=>identityClient(t,'admission-activity-policy',{command,admission_id}),notes:(t,input)=>crm(t,'activity-notes',input),runs:(t,input)=>workflow(t,'activity-runs',input),platform:(t,connection_id)=>channel(t,'history-platform-read',{connection_id})};
 const server=await listen(chatMaterial,chatActivityRoutes(new ChatActivity(commands,peers,fixture.key))),call=ownerCommandClient(bffMaterial,remoteRegistryAuthority(bffMaterial,registryConfig),'chat',new URL(protocol+'//127.0.0.1:'+server.address().port+'/'));
 const request=(payload={})=>({schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,operation:'workspace-get-activity',command_id:randomUUID(),actor:{kind:'human',principal_id:f.principal,delegation_id:enrollment.delegationId},payload:{id:fixture.conversation,...payload}}),bad=(p,code)=>assert.rejects(p,e=>e.code===code);
 const grants=[...ctx.grants,{resource:'activity',action:'read',scope:'all'},{resource:'automation',action:'read',scope:'all'}];await setRole(grants);
 const outage=async(server,work)=>{const port=server.address().port;server.closeAllConnections();await new Promise(r=>server.close(r));try{await work();}finally{server.listen(port,'127.0.0.1');await once(server,'listening');}};
 try{
  await check('Chat activity seven kinds native owners and current message envelope',async()=>{
   const r=await call(request());assert.deepEqual(r.data.map(x=>x.kind),['message','note','assignment','lifecycle','snooze','tags','automation']);assert.equal(r.meta.state,'ready');assert.equal(r.data[0].payload.envelope.reply_to.internal_message_id,fixture.reply);assert.equal(r.data[1].payload.body,'Synthetic CRM activity body');
   if(!fixture.intent){fixture.intent=randomUUID();await writeFile(path,JSON.stringify(fixture),{mode:0o600});}
   await chatOperator.execute("INSERT INTO outbound_intent(id,tenant_id,conversation_id,actor_kind,actor_id,account_id,owner_revision,text,status,idempotency_key,created_at) VALUES (?,?,?,'human',?,?,1,'Synthetic activity message','sent',?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[fixture.intent,tenant,fixture.conversation,f.principal,f.account,fixture.intent]);
   await chatOperator.execute("UPDATE message SET direction='outbound',status='sent',outbound_intent_id=? WHERE tenant_id=? AND id=?",[fixture.intent,tenant,fixture.message]);try{assert.equal((await call(request())).data[0].payload.envelope.status,'sent');}finally{await chatOperator.execute("UPDATE message SET direction='inbound',status='received',outbound_intent_id=NULL WHERE tenant_id=? AND id=?",[tenant,fixture.message]);}
   await assert.rejects(chatPool.query('SELECT * FROM native_identity_test.activity LIMIT 1'));await assert.rejects(crmPool.query('SELECT * FROM test_crm_chat_owner.conversation LIMIT 1'));await assert.rejects(workflowPool.query('SELECT * FROM native_identity_test.activity LIMIT 1'));await assert.rejects(workflowPool.query('SELECT * FROM auth_session LIMIT 1'));
  });
  await check('Chat activity encrypted older pagination and forward hidden watermark',async()=>{
   const all=await call(request()),first=await call(request({limit:'3'})),second=await call(request({limit:'3',before:first.older_cursor})),last=await call(request({limit:'3',before:second.older_cursor}));assert.deepEqual([...last.data,...second.data,...first.data].map(x=>x.id),all.data.map(x=>x.id));assert.equal(last.has_more,false);assert.equal(last.older_cursor,null);
   const poll=await call(request({after:all.newer_cursor}));assert.deepEqual(poll.data,[]);assert.equal(poll.has_more,false);await bad(call(request({before:first.older_cursor,after:all.newer_cursor})),'INVALID_REQUEST');
  });
  await check('Chat activity independent note ACL body tags text and automation policy',async()=>{
   const initial=await call(request());await setRole(ctx.grants);try{const r=await call(request());assert(r.data.every(x=>!['note','automation'].includes(x.kind)));await bad(call(request({after:initial.newer_cursor})),'QUERY_CHANGED');}finally{await setRole(grants);}
   await field(projectionObjects.get(tenant).activity,'body',['read'],async()=>{const r=await call(request());assert(!('body' in r.data.find(x=>x.kind==='note').payload));await bad(call(request({after:initial.newer_cursor})),'QUERY_CHANGED');});
   await field(f.object,'text',['read'],async()=>{const e=(await call(request())).data.find(x=>x.kind==='message').payload.envelope;for(const key of ['text','reply_to','attachment'])assert(!Object.hasOwn(e,key));});
   await field(f.object,'tags',['read'],async()=>assert((await call(request())).data.every(x=>x.kind!=='tags')));
  });
  await check('Chat activity Workflow trigger and definition binding without Chat SQL',async()=>{
   await operator.execute('UPDATE workflow_run SET context=? WHERE tenant_id=? AND id=?',[JSON.stringify({trigger:{...trigger,contact_id:randomUUID()}}),tenant,fixture.run]);try{assert((await call(request())).data.every(x=>x.kind!=='automation'));}finally{await operator.execute('UPDATE workflow_run SET context=? WHERE tenant_id=? AND id=?',[JSON.stringify({trigger}),tenant,fixture.run]);}
  });
  await check('Chat activity actual CRM Workflow Channels outage reports partial freshness',async()=>{
   for(const [s,kind,name] of [[crmServer,'note','crm'],[workflowServer,'automation','workflow'],[channelServer,'message','chat']])await outage(s,async()=>{const r=await call(request());assert.equal(r.meta.state,'partial');assert.equal(r.meta.sources.find(x=>x.service===name).state,'unavailable');assert(r.data.every(x=>x.kind!==kind));});
  });
  await check('Chat activity pending failed source notifications and backfilling',async()=>{
   const event=randomUUID();await operator.execute("INSERT INTO outbox_event(id,tenant_id,event_type,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,'crm.conversation_note.changed','activity',?,1,?,?,'system',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')",[event,tenant,fixture.note,JSON.stringify({conversation_id:fixture.conversation}),event,tenant]);
   try{assert.equal((await call(request())).meta.sources.find(x=>x.service==='crm').state,'delayed');await operator.execute("UPDATE outbox_event SET status='failed' WHERE tenant_id=? AND id=?",[tenant,event]);assert.equal((await call(request())).meta.sources.find(x=>x.service==='crm').state,'unavailable');}finally{await operator.execute("UPDATE outbox_event SET status='dispatched' WHERE tenant_id=? AND id=?",[tenant,event]);}
   await chatOperator.execute('UPDATE conversation_activity_counter SET backfilled=0 WHERE tenant_id=? AND conversation_id=?',[tenant,fixture.conversation]);try{assert.equal((await call(request())).meta.state,'backfilling');}finally{await chatOperator.execute('UPDATE conversation_activity_counter SET backfilled=1 WHERE tenant_id=? AND conversation_id=?',[tenant,fixture.conversation]);}
  });
  await check('Chat activity invalid expired and retained old-query cursors reject',async()=>{
   await bad(call(request({before:'invalid'})),'INVALID_CURSOR');const token=(exp,binding='old-raw-access')=>{const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',createHash('sha256').update(fixture.key).digest(),iv),body=Buffer.concat([cipher.update(JSON.stringify({binding,seq:'1',exp})),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64url');};await bad(call(request({before:token(Date.now()-1)})),'CURSOR_EXPIRED');await bad(call(request({before:token(Date.now()+300000)})),'QUERY_CHANGED');await bad(call({...request(),tenant_id:other}),'NOT_FOUND');
  });
  await check('Chat activity local snapshot and completed logout delivery fences',async()=>{
   const notes=peers.notes;peers.notes=async(...args)=>{const r=await notes(...args);await chatOperator.execute('UPDATE crm_record SET version=version+1 WHERE tenant_id=? AND id=?',[tenant,fixture.conversation]);return r;};try{await bad(call(request()),'STALE_VERSION');}finally{peers.notes=notes;}
   const session=await ctx.login(f.account),enrolled=await new HumanDispatchEnrollment(ctx.ds).enroll(tenant,createHash('sha256').update(session).digest('hex')),req=request();req.actor.delegation_id=enrolled.delegationId;
   peers.notes=async(...args)=>{const r=await notes(...args);await ctx.drainingAuth.logout(session,'http://localhost:18080',await ctx.auth.csrf(session));return r;};try{await bad(call(req),'FORBIDDEN');}finally{peers.notes=notes;}
  });
  await check('Chat activity public native session no-store and query validation'+(process.argv.includes('--with-runtime')?' runtime':''),async()=>{
   const candidate=process.argv.includes('--with-runtime')?await nativeChatParity(ctx,{crm:new URL(protocol+'//127.0.0.1:'+crmServer.address().port+'/'),workflow:new URL(protocol+'//127.0.0.1:'+workflowServer.address().port+'/'),connector:new URL(protocol+'//127.0.0.1:'+channelServer.address().port+'/')},fixture.key):null;
   try{
   const publicServer=createChatHistoryBff(new ChatHistoryBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),candidate?.call??call));servers.push(publicServer);publicServer.listen(0,'127.0.0.1');await once(publicServer,'listening');const url='http://127.0.0.1:'+publicServer.address().port+'/api/v1/conversations/'+fixture.conversation+'/activity',headers={'x-tenant-id':tenant,cookie:'crm_session='+ctx.actorSession};assert.equal((await fetch(url,{headers:{'x-tenant-id':tenant}})).status,401);const response=await fetch(url+'?limit=2',{headers});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).data.length,2);for(const query of ['?limit=0','?limit=101','?limit=1&limit=2','?cursor=x','?before=x&after=y'])assert.equal((await fetch(url+query,{headers})).status,400);
   }finally{if(candidate)await candidate.stop();}
  });
  await check('Chat activity bounded100 rich rows and2000 hidden references',async()=>{
   if(!fixture.bulk){fixture.bulk={conversation:randomUUID(),identity:randomUUID(),messages:Array.from({length:100},()=>randomUUID()),hidden:Array.from({length:2001},()=>randomUUID())};await writeFile(path,JSON.stringify(fixture),{mode:0o600});}const bulk=fixture.bulk;await seedConversation(bulk);
   for(const id of bulk.messages){await chatOperator.execute("INSERT INTO message(id,tenant_id,conversation_id,connection_id,provider_message_id,direction,text,occurred_at,received_at,status) VALUES (?,?,?,?,?,'inbound',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'received') ON DUPLICATE KEY UPDATE id=id",[id,tenant,bulk.conversation,ref.connection,id,'Synthetic '+'.'.repeat(3990)]);await append(bulk.conversation,'message',id,'1',{message_id:id});}
   // First page validates >256KiB transport on reruns too, using the retained authenticated boundary before hidden refs.
   let boundary;const baseline=await call(request({id:bulk.conversation,limit:'100'}));if(baseline.data.length===100)boundary=baseline.newer_cursor;
   for(const id of bulk.hidden)await append(bulk.conversation,'note',id,'1',{activity_id:id});
   const initial=await call(request({id:bulk.conversation,limit:'100'}));assert.equal(initial.data.length,0);assert.equal(initial.has_more,true);const started=Date.now(),older=await call(request({id:bulk.conversation,limit:'100',before:initial.older_cursor}));assert.equal(older.data.length,100);assert(older.data.every(x=>x.payload.envelope.text.length===4000));assert.equal(older.has_more,false);console.log('INFO activity100-row elapsed_ms='+String(Date.now()-started));
   // Reconstruct the retained pre-hidden boundary with the same policy binding on repeat runs.
   if(!boundary){const raw=Buffer.from(older.newer_cursor,'base64url'),key=createHash('sha256').update(fixture.key).digest(),dec=createDecipheriv('aes-256-gcm',key,raw.subarray(0,12));dec.setAuthTag(raw.subarray(12,28));const value=JSON.parse(Buffer.concat([dec.update(raw.subarray(28)),dec.final()]).toString()),iv=randomBytes(12),enc=createCipheriv('aes-256-gcm',key,iv),body=Buffer.concat([enc.update(JSON.stringify({...value,seq:'100'})),enc.final()]);boundary=Buffer.concat([iv,enc.getAuthTag(),body]).toString('base64url');}
   const forward=await call(request({id:bulk.conversation,after:boundary,limit:'100'}));assert.equal(forward.data.length,0);assert.equal(forward.has_more,true);assert.equal((await call(request({id:bulk.conversation,after:forward.newer_cursor}))).has_more,false);
  });
  if(process.argv.includes('--with-notifications'))await chatActivityNotificationsNative({...ctx,fixture,path,seedConversation,listen,client,crm,workflow,crmServer,workflowServer,outage});
 }finally{await setRole(ctx.grants);await Promise.all([crmPool.end(),workflowPool.end(),channelPool.end()]);}
}
