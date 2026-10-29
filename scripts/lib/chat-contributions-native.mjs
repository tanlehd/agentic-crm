import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {createPool,rootSQL} from './chat-native.mjs';
import {NativeNotes,noteReadRoutes} from '../../services/core-baseline/dist/modules/crm/owner-notes.js';
import {NativeSalesContributions,salesContributionRoutes} from '../../services/core-baseline/dist/modules/sales/owner-contributions.js';
import {classificationOperations as ops} from '../../services/chat/dist/classification.js';
import {createChatSessionProgressBff} from '../../services/core-baseline/dist/gateway/chat-session-progress-bff.js';
import {HumanDispatchEnrollment} from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';
import {createWorkloadServer,ownerClient,remoteRegistryAuthority} from '../../packages/workload-transport/dist/index.js';

export async function chatContributionsNative(ctx){
 const {check,operator,chatOperator,tenant,f,ref,chatMaterial,crmMaterial,salesMaterial,chatAuthority,registryConfig,protocol,servers,env,chatServer,projectionObjects,v,peers,call,request,setRole,field,grants}=ctx;
 if(process.argv.includes('--provision'))rootSQL(`CREATE USER IF NOT EXISTS 't05_sales_contribution_test'@'%' IDENTIFIED BY '${ref.crmPassword}';
 ${['sales_session_context','crm_record','object_type','record_team_access'].map(table=>`GRANT SELECT ON native_identity_test.${table} TO 't05_sales_contribution_test'@'%';`).join('\n')}`);
 const pool=user=>createPool({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),database:ref.database,user,password:ref.crmPassword,timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true}),crmPool=pool('t05_crm_activity_test'),salesPool=pool('t05_sales_contribution_test');
 const sourceClients={};let salesServer,crmServer;
 for(const owner of ['crm','sales']){
  const material=owner==='crm'?crmMaterial:salesMaterial;assert(material);const authority=remoteRegistryAuthority(material,registryConfig),proof=ownerClient(material,authority,'chat',new URL(protocol+'//127.0.0.1:'+chatServer.address().port+'/')),identity=ownerClient(material,authority,'identity',new URL('/',registryConfig.url));
  const routes=owner==='crm'?noteReadRoutes(new NativeNotes(crmPool,(t,command)=>proof(t,'command-proof',command),(t,input)=>identity(t,'admission-note-policy',input))):salesContributionRoutes(new NativeSalesContributions(salesPool,(t,command)=>proof(t,'command-proof',command),(t,input)=>identity(t,'admission-contribution-sales-policy',input)));
  const server=createWorkloadServer(material,authority,routes);servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');sourceClients[owner]=ownerClient(chatMaterial,chatAuthority,owner,new URL(protocol+'//127.0.0.1:'+server.address().port+'/'));if(owner==='sales')salesServer=server;else crmServer=server;
 }
 peers.visible=(owner,t,command,admission_id,ids)=>sourceClients[owner](t,'contribution-sources-read',{command,admission_id,ids});
 const ids=Object.fromEntries(['note','archived','foreignNote','lead','deal','leadContext','dealContext','foreignContext','empty','full'].map(k=>[k,randomUUID()])),objects=projectionObjects.get(tenant);
 // All source IDs persist in CRM/Sales and Chat rows; no real messages or provider calls.
 for(const key of ['note','archived','foreignNote']){
  await operator.execute('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[ids[key],tenant,objects.activity,f.principal,key==='archived'?'2026-01-01 00:00:00':null]);
  await operator.execute("INSERT INTO activity(tenant_id,record_id,kind,subject,body,related_record_id) VALUES (?,?,'note','Synthetic contribution','Synthetic private body',?)",[tenant,ids[key],key==='foreignNote'?randomUUID():v.conversation]);
 }
 for(const key of ['lead','deal']){
  await operator.execute('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[ids[key],tenant,objects[key],f.principal]);
  await operator.execute("INSERT INTO sales_session_context(tenant_id,id,record_id,conversation_id,session_id,actor_id,kind,recorded_at) VALUES (?,?,?,?,?,?,'follow_up',UTC_TIMESTAMP(6))",[tenant,ids[key+'Context'],ids[key],v.conversation,v.session,f.principal]);
 }
 await operator.execute("INSERT INTO sales_session_context(tenant_id,id,record_id,conversation_id,session_id,actor_id,kind,recorded_at) VALUES (?,?,?,?,?,?,'closing',UTC_TIMESTAMP(6))",[tenant,ids.foreignContext,ids.lead,v.conversation,randomUUID(),f.principal]);
 async function append(kind,source,payload={},session=v.session){
  const [[last]]=await chatOperator.execute('SELECT MAX(revision) revision FROM session_contribution WHERE tenant_id=? AND session_id=?',[tenant,session]);const revision=String(BigInt(last.revision??0)+1n);
  await chatOperator.execute('INSERT INTO session_contribution(tenant_id,session_id,id,conversation_id,revision,kind,source_id,source_revision,actor_kind,actor_id,owner_id,team_id,owner_revision,payload,recorded_at) VALUES (?,?,?,?,?,?,?,1,\'human\',?,?,NULL,1,?,UTC_TIMESTAMP(6))',[tenant,session,randomUUID(),v.conversation,revision,kind,source,f.principal,f.principal,JSON.stringify(payload)]);return revision;
 }
 for(const key of ['note','archived','foreignNote'])await append('note',ids[key],{operation:'created'});
 for(const key of ['leadContext','dealContext','foreignContext'])await append('outcome',ids[key],{role:'follow_up'});
 for(const [i,key] of ['empty','full'].entries())await chatOperator.execute("INSERT INTO conversation_acquisition_session(tenant_id,id,conversation_id,sequence,status,opening_reason,opened_at,opening_occurred_at,closed_at,close_reason,source_classification,source_channel,source_page_id,source_connection_id,policy_version) VALUES (?,?,?,?,'closed','first_inbound','2026-01-01','2026-01-01','2026-01-02','agent_closed','organic','mock_messenger','synthetic-contribution',?,'inbox_v2')",[tenant,ids[key],v.conversation,i+2,ref.connection]);
 await append('opened',ids.full,{},ids.full);
 const read=async(payload={})=>(await call(request(ops.history,payload))).data,visible=(r,id)=>r.history.some(x=>x.source_id===id),all=[...grants,{resource:'activity',action:'read',scope:'all'},{resource:'lead',action:'read',scope:'all'},{resource:'deal',action:'read',scope:'all'}];await setRole(all);
 try{
  await check('Chat classification contributions native source references coverage and closed ownership',async()=>{
   await chatOperator.execute('UPDATE crm_record SET owner_principal_id=?,owner_revision=owner_revision+1,version=version+1 WHERE tenant_id=? AND id=?',[f.adminPrincipal,tenant,v.conversation]);
   const r=await read();assert.equal(r.coverage,'partial');assert.equal(r.owner.id,f.principal);assert(visible(r,ids.note));assert(visible(r,ids.leadContext));assert(visible(r,ids.dealContext));for(const key of ['archived','foreignNote','foreignContext'])assert(!visible(r,ids[key]));assert(!JSON.stringify(r).includes('Synthetic private body'));assert.equal((await read({session:ids.empty})).coverage,'none');assert.equal((await read({session:ids.full})).coverage,'full');
   await assert.rejects(salesPool.query('SELECT * FROM test_crm_chat_owner.session_contribution LIMIT 1'));await assert.rejects(salesPool.query('SELECT * FROM activity LIMIT 1'));await assert.rejects(crmPool.query('SELECT * FROM sales_session_context LIMIT 1'));
  });
  await check('Chat classification contributions independent Activity Sales and field rights',async()=>{
   for(const [resource,source] of [['activity',ids.note],['lead',ids.leadContext],['deal',ids.dealContext]]){await setRole(all.filter(g=>g.resource!==resource));try{assert(!visible(await read(),source));}finally{await setRole(all);}}
   await field(objects.activity,'body',['read'],async()=>assert(visible(await read(),ids.note)));
   for(const key of ['lead','deal'])await field(objects[key],'contact_id',['read'],async()=>assert(!visible(await read(),ids[key+'Context'])));
   await field(objects.conversation_session,'candidate_string',['read'],async()=>{const r=await read();for(const row of r.history.filter(x=>x.kind==='classification'))assert(!Object.hasOwn(row.payload.changes,'candidate_string'));});
   await operator.execute('UPDATE crm_record SET archived_at=UTC_TIMESTAMP(6),version=version+1 WHERE tenant_id=? AND id=?',[tenant,ids.deal]);assert(!visible(await read(),ids.dealContext));
  });
  await check('Chat classification contributions source outages suppress only that source',async()=>{
   for(const [server,source,other] of [[salesServer,ids.leadContext,ids.note],[crmServer,ids.note,ids.leadContext]]){
    const port=server.address().port;server.closeAllConnections();await new Promise(r=>server.close(r));try{const r=await read();assert(!visible(r,source));assert(visible(r,other));}finally{server.listen(port,'127.0.0.1');await once(server,'listening');}
   }
  });
  await check('Chat classification contributions bounded revision paging and public session route',async()=>{
   for(let i=0;i<52;i++)await append('assignment',randomUUID(),{reason:'Synthetic handling fact'});
   const r=await read();assert.equal(r.history.length,50);assert(r.next_before_revision);const older=await read({before_revision:r.next_before_revision});assert(older.history.every(x=>BigInt(x.revision)<BigInt(r.next_before_revision)));assert(visible(older,ids.note));
   const publicServer=createChatSessionProgressBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),call);servers.push(publicServer);publicServer.listen(0,'127.0.0.1');await once(publicServer,'listening');const url='http://127.0.0.1:'+publicServer.address().port+'/api/v1/conversations/'+v.conversation+'/sessions/'+v.session+'/contributions',headers={'x-tenant-id':tenant,cookie:'crm_session='+ctx.actorSession};assert.equal((await fetch(url,{headers})).status,200);assert.equal((await fetch(url+'?limit=1',{headers})).status,400);assert.equal((await fetch(url+'?before_revision=0',{headers})).status,400);
  });
 }finally{await setRole(grants);await crmPool.end();await salesPool.end();}
}
