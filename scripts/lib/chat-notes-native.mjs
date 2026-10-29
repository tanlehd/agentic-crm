import assert from 'node:assert/strict';
import {nativeChatParity} from './chat-runtime-parity.mjs';
import {chatNoteWriteNative} from './chat-note-write-native.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {once} from 'node:events';
import {createPool,rootSQL} from './chat-native.mjs';
import {ChatNotes,chatNoteReadRoutes} from '../../services/chat/dist/notes.js';
import {NativeNotes,noteReadRoutes} from '../../services/core-baseline/dist/modules/crm/owner-notes.js';
import {ChatHistoryBff,createChatHistoryBff} from '../../services/core-baseline/dist/gateway/chat-history-bff.js';
import {HumanDispatchEnrollment} from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';
import {createWorkloadServer,ownerClient,ownerCommandClient,remoteRegistryAuthority} from '../../packages/workload-transport/dist/index.js';

export async function chatNotesNative(ctx){
 const {check,operator,chatOperator,chatPool,commands,tenant,other,f,ref,fixture,enrollment,identityClient,chatMaterial,bffMaterial,crmMaterial,chatAuthority,registryConfig,protocol,servers,env,projectionObjects,chatServer,setRole,field}=ctx;
 const path='.local/chat-ownership/notes-fixture.json';let fixtureNotes;
 try{fixtureNotes=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;fixtureNotes={tenant,environment:'retained-test',notes:Array.from({length:5},()=>randomUUID()).sort()};await writeFile(path,JSON.stringify(fixtureNotes),{flag:'wx',mode:0o600});}
 assert.equal(fixtureNotes.tenant,tenant);assert.equal(fixtureNotes.environment,'retained-test');const ids=fixtureNotes.notes;
 if(process.argv.includes('--provision'))rootSQL(`CREATE USER IF NOT EXISTS 't05_crm_notes_test'@'%' IDENTIFIED BY '${ref.crmPassword}';\n${['activity','crm_record','object_type','record_team_access'].map(t=>`GRANT SELECT ON native_identity_test.${t} TO 't05_crm_notes_test'@'%';`).join('\n')}`);
 const pool=createPool({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),database:ref.database,user:'t05_crm_notes_test',password:ref.crmPassword,timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true});
 // Retained pre-extraction registry reference for the existing legacy FK; runtime never reads it.
 await operator.execute('INSERT INTO crm_record(id,tenant_id,object_type_id,created_at,updated_at) VALUES (?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id',[fixture.conversation,tenant,f.object]);
 for(let i=0;i<ids.length;i++){
  await operator.execute('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,team_id,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id',[ids[i],tenant,projectionObjects.get(tenant).activity,i===0?f.principal:f.adminPrincipal,i===1?ref.team:null,i===4?'2026-10-20 00:00:00':null]);
  await operator.execute("INSERT INTO activity(tenant_id,record_id,kind,subject,body,related_record_id) VALUES (?,?,'note','Synthetic owner note','Synthetic CRM-only note',?) ON DUPLICATE KEY UPDATE record_id=record_id",[tenant,ids[i],fixture.conversation]);
 }
 await operator.execute('INSERT INTO record_team_access(tenant_id,record_id,team_id) VALUES (?,?,?) ON DUPLICATE KEY UPDATE record_id=record_id',[tenant,ids[2],ref.team]);
 const crmAuthority=remoteRegistryAuthority(crmMaterial,registryConfig),identity=ownerClient(crmMaterial,crmAuthority,'identity',new URL('/',registryConfig.url)),proof=ownerClient(crmMaterial,crmAuthority,'chat',new URL(protocol+'//127.0.0.1:'+chatServer.address().port+'/'));
 const native=new NativeNotes(pool,(t,command,abort)=>proof(t,abort?'command-abort':'command-proof',command),(t,input)=>identity(t,'admission-note-policy',input));
 const crmServer=createWorkloadServer(crmMaterial,crmAuthority,noteReadRoutes(native));servers.push(crmServer);crmServer.listen(0,'127.0.0.1');await once(crmServer,'listening');
 const crm=ownerClient(chatMaterial,chatAuthority,'crm',new URL(protocol+'//127.0.0.1:'+crmServer.address().port+'/'));
 const peers={admit:(t,command)=>identityClient(t,'admit',{owner:'chat',command}),settle:(t,command,admission_id)=>identityClient(t,'settle',{owner:'chat',command,admission_id}),list:(t,input)=>crm(t,'note-list',input)};
 const notes=new ChatNotes(commands,peers),server=createWorkloadServer(chatMaterial,chatAuthority,chatNoteReadRoutes(notes));servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');
 const call=ownerCommandClient(bffMaterial,remoteRegistryAuthority(bffMaterial,registryConfig),'chat',new URL(protocol+'//127.0.0.1:'+server.address().port+'/'));
 const request=(payload={})=>({schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,operation:'conversation-get-conversations-id-notes',command_id:randomUUID(),actor:{kind:'human',principal_id:f.principal,delegation_id:enrollment.delegationId},payload:{id:fixture.conversation,...payload}}),bad=(p,code)=>assert.rejects(p,e=>e.code===code);
 const grants=[...ctx.grants,{resource:'activity',action:'read',scope:'all'}];await setRole(grants);
 try{
  await check('Chat notes native CRM-only bodies archived exclusion and UUID pagination',async()=>{
   const all=await call(request());assert.deepEqual(all.data.map(r=>r.id),ids.slice(0,4));assert(all.data.every(r=>r.body==='Synthetic CRM-only note'));assert.equal(all.next_cursor,null);
   const first=await call(request({limit:2})),second=await call(request({limit:2,cursor:first.next_cursor}));assert.equal(first.next_cursor,ids[1]);assert.deepEqual(second.data.map(r=>r.id),ids.slice(2,4));assert.equal(second.next_cursor,null);
   await assert.rejects(chatPool.query('SELECT * FROM native_identity_test.activity LIMIT 1'));await assert.rejects(pool.query('SELECT * FROM test_crm_chat_owner.conversation LIMIT 1'));await assert.rejects(pool.query('SELECT * FROM auth_session LIMIT 1'));
   const [[row]]=await chatOperator.execute("SELECT COUNT(*) n FROM chat_owner_command WHERE tenant_id=? AND operation='conversation-get-conversations-id-notes' AND (JSON_SEARCH(request_json,'one','Synthetic CRM-only note') IS NOT NULL OR JSON_SEARCH(result_json,'one','Synthetic CRM-only note') IS NOT NULL)",[tenant]);assert.equal(Number(row.n),0);
  });
  await check('Chat notes current Activity all own team and shared-team ACL',async()=>{
   await setRole(ctx.grants);try{assert.deepEqual((await call(request())).data,[]);}finally{await setRole(grants);}
   await setRole([...ctx.grants,{resource:'activity',action:'read',scope:'own'}]);try{assert.deepEqual((await call(request())).data.map(r=>r.id),[ids[0]]);}finally{await setRole(grants);}
   const [[member]]=await operator.execute('SELECT principal_id FROM team_member WHERE tenant_id=? AND team_id=? AND principal_id=?',[tenant,ref.team,f.principal]);if(!member)await operator.execute('INSERT INTO team_member(tenant_id,team_id,principal_id) VALUES (?,?,?)',[tenant,ref.team,f.principal]);
   await setRole([...ctx.grants,{resource:'activity',action:'read',scope:'team'}]);try{assert.deepEqual((await call(request())).data.map(r=>r.id),ids.slice(1,3));}finally{await setRole(grants);if(!member)await operator.execute('DELETE FROM team_member WHERE tenant_id=? AND team_id=? AND principal_id=?',[tenant,ref.team,f.principal]);}
  });
  await check('Chat notes independent body redaction and native viewer read entitlement',async()=>{
   await field(projectionObjects.get(tenant).activity,'body',['read'],async()=>{const r=await call(request());assert.equal(r.data.length,4);assert(r.data.every(v=>!('body' in v)));});
   await field(f.object,'text',['read'],async()=>assert.equal((await call(request())).data.length,4));
   const [[seat]]=await operator.execute('SELECT seat_code FROM membership WHERE tenant_id=? AND id=?',[tenant,f.member]);await operator.execute("UPDATE membership SET seat_code='viewer' WHERE tenant_id=? AND id=?",[tenant,f.member]);try{assert.equal((await call(request())).data.length,4);}finally{await operator.execute('UPDATE membership SET seat_code=? WHERE tenant_id=? AND id=?',[seat.seat_code,tenant,f.member]);}
  });
  await check('Chat notes fresh Conversation denial wrong tenant actor and malformed cursor',async()=>{
   await setRole(grants.filter(g=>g.resource!=='conversation'));try{await bad(call(request()),'NOT_FOUND');}finally{await setRole(grants);}
   await bad(call({...request(),tenant_id:other}),'NOT_FOUND');const service=request();service.actor.kind='service';await bad(call(service),'FORBIDDEN');await bad(call(request({cursor:'invalid'})),'INVALID_REQUEST');
  });
  await check('Chat notes actual CRM outage and concurrent Conversation snapshot fence',async()=>{
   const port=crmServer.address().port;crmServer.closeAllConnections();await new Promise(resolve=>crmServer.close(resolve));try{await bad(call(request()),'DEPENDENCY_UNAVAILABLE');}finally{crmServer.listen(port,'127.0.0.1');await once(crmServer,'listening');}
   const list=peers.list;peers.list=async(...args)=>{const result=await list(...args);await chatOperator.execute('UPDATE crm_record SET version=version+1 WHERE tenant_id=? AND id=?',[tenant,fixture.conversation]);return result;};try{await bad(call(request()),'STALE_VERSION');}finally{peers.list=list;}
  });
  await check('Chat notes completed native logout rejects delayed CRM body delivery',async()=>{
   const session=await ctx.login(f.account),enrolled=await new HumanDispatchEnrollment(ctx.ds).enroll(tenant,createHash('sha256').update(session).digest('hex')),req=request();req.actor.delegation_id=enrolled.delegationId;
   const list=peers.list;peers.list=async(...args)=>{const r=await list(...args);await ctx.drainingAuth.logout(session,'http://localhost:18080',await ctx.auth.csrf(session));return r;};try{await bad(call(req),'INVALID_TRANSITION');}finally{peers.list=list;}
  });
  await check('Chat notes public native session no-store and strict query checks'+(process.argv.includes('--with-runtime')?' runtime':''),async()=>{
   const candidate=process.argv.includes('--with-runtime')?await nativeChatParity(ctx,{crm:new URL(protocol+'//127.0.0.1:'+crmServer.address().port+'/')}):null;
   try{
   const publicServer=createChatHistoryBff(new ChatHistoryBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),candidate?.call??call));servers.push(publicServer);publicServer.listen(0,'127.0.0.1');await once(publicServer,'listening');const url='http://127.0.0.1:'+publicServer.address().port+'/api/v1/conversations/'+fixture.conversation+'/notes',headers={'x-tenant-id':tenant,cookie:'crm_session='+ctx.actorSession};
   assert.equal((await fetch(url,{headers:{'x-tenant-id':tenant}})).status,401);const response=await fetch(url,{headers});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).data.length,4);
   for(const q of ['?limit=0','?limit=1&limit=2','?fields=body','?cursor=invalid'])assert.equal((await fetch(url+q,{headers})).status,400);
   }finally{if(candidate)await candidate.stop();}
  });
  await check('Chat notes bounded100row response crosses both native owner hops',async()=>{
   if(!fixtureNotes.bulk){fixtureNotes.bulk={conversation:randomUUID(),ids:Array.from({length:100},()=>randomUUID()).sort()};await writeFile(path,JSON.stringify(fixtureNotes),{mode:0o600});}
   const bulk=fixtureNotes.bulk;
   if(!bulk.identity){bulk.identity=randomUUID();await writeFile(path,JSON.stringify(fixtureNotes),{mode:0o600});}
   await operator.execute('INSERT INTO contact_identity(id,tenant_id,connection_id,contact_id,external_subject_id) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id',[bulk.identity,tenant,ref.connection,ref.contact,'synthetic-notes-'+bulk.identity]);
   for(const db of [operator,chatOperator])await db.execute('INSERT INTO crm_record(id,tenant_id,object_type_id,created_at,updated_at) VALUES (?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id',[bulk.conversation,tenant,f.object]);
   await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at) VALUES (?,?,?,?,?,'open',UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE record_id=record_id",[tenant,bulk.conversation,ref.contact,bulk.identity,ref.connection]);
   await chatOperator.execute('INSERT INTO chat_control_head(tenant_id,conversation_id,registry_revision,control_revision,cancel_through,pause_through,version,created_at,updated_at) VALUES (?,?,1,1,0,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE conversation_id=conversation_id',[tenant,bulk.conversation]);
   for(const id of bulk.ids){
    await operator.execute('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id',[id,tenant,projectionObjects.get(tenant).activity,f.principal]);
    await operator.execute("INSERT INTO activity(tenant_id,record_id,kind,subject,body,related_record_id) VALUES (?,?,'note','Synthetic bulk note',?,?) ON DUPLICATE KEY UPDATE record_id=record_id",[tenant,id,'Synthetic note '+'.'.repeat(3985),bulk.conversation]);
   }
   const start=Date.now(),result=await call(request({id:bulk.conversation,limit:100}));assert.deepEqual(result.data.map(r=>r.id),bulk.ids);assert(result.data.every(r=>r.body.length===4000));assert.equal(result.next_cursor,null);console.log('INFO notes100-row elapsed_ms='+String(Date.now()-start));
  });
  if(process.argv.includes('--with-write'))await chatNoteWriteNative(ctx);
 }finally{await setRole(ctx.grants);await pool.end();}
}
