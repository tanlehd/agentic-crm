import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {once} from 'node:events';
import {createPool,rootSQL} from './chat-native.mjs';
import {migrate,migrations,ready} from '../../services/crm-connector/dist/schema.js';
import {ConnectorConnectionStatus,connectorConnectionStatusRoutes,lockActiveConnection} from '../../services/crm-connector/dist/connection-status.js';
import {PayloadStore} from '../../services/crm-connector/dist/payload-store.js';
import {PreparationStore} from '../../services/crm-connector/dist/preparation-store.js';
import {AttemptStore} from '../../services/crm-connector/dist/attempt-store.js';
import {AttemptExecutor} from '../../services/crm-connector/dist/attempt-executor.js';
import {NativeChannelStatus} from '../../services/core-baseline/dist/modules/channels/owner-status.js';
import {createWorkloadServer,remoteRegistryAuthority,ownerClient,ownerCanonical,OwnerError} from '../../packages/workload-transport/dist/index.js';

export async function chatTransportStatusNative(ctx){
 const {check,operator,tenant,other,fixture,env,connectorMaterial,registryConfig,protocol,servers,pool,proof,prepare,input,clients,commands}=ctx;
 assert.equal(env.MYSQL_HOST,'127.0.0.1');assert.equal(Number(env.MYSQL_PORT),13306);assert.equal(env.MYSQL_DATABASE,'native_identity_test');
 const config={host:'127.0.0.1',port:13306,database:'native_connector_test',timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,connectionLimit:8};
 const db=createPool({...config,user:env.MYSQL_MIGRATION_USER,password:env.MYSQL_MIGRATION_PASSWORD});
 let runtime;
 const digest=value=>createHash('sha256').update(ownerCanonical(value)).digest('hex');
 const bad=(fn,code)=>assert.rejects(fn,e=>e.code===code),id=fixture.connection;
 try{
  await check('Chat references global transport populated forward6 preserves retained Connector rows and journal',async()=>{
   const [journal]=await db.query('SELECT * FROM connector_schema_migration ORDER BY version');assert([5,6].includes(journal.length));
   const [tables]=await db.query("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME<>'connector_schema_migration' AND TABLE_NAME<>'connector_connection_barrier' ORDER BY TABLE_NAME");
   const before={};for(const {name} of tables){assert(/^[a-z_]+$/.test(name));const [rows]=await db.query('SELECT * FROM '+name);before[name]={count:rows.length,digest:digest(rows.map(r=>ownerCanonical(r)).sort())};}
   if(journal.length===5){assert(process.argv.includes('--provision'));assert.equal(await migrate(db),1);}assert.equal(await migrate(db),0);await ready(db);
   const [after]=await db.query('SELECT * FROM connector_schema_migration ORDER BY version');assert.deepEqual(after.slice(0,journal.length),journal);assert.equal(after[5].checksum,migrations[5].checksum);
   for(const {name} of tables){const [rows]=await db.query('SELECT * FROM '+name);assert.deepEqual({count:rows.length,digest:digest(rows.map(r=>ownerCanonical(r)).sort())},before[name]);}
   const evidence={database:config.database,from:journal.length,to:6,preserved:before};await writeFile('artifacts/chat-extraction/continuation-20261022/disable-migration.json',JSON.stringify(evidence,null,2));if(journal.length===5)await writeFile('artifacts/chat-extraction/continuation-20261022/disable-migration-upgrade.json',JSON.stringify(evidence,null,2));
  });
  if(process.argv.includes('--provision'))rootSQL(`CREATE USER IF NOT EXISTS 't05_transport_status_test'@'%' IDENTIFIED BY '${fixture.channelPassword}';
GRANT SELECT(tenant_id,id,status,remote_connection_id),UPDATE(status) ON native_connector_test.connector_connection TO 't05_transport_status_test'@'%';
GRANT SELECT,INSERT,UPDATE ON native_connector_test.connector_connection_barrier TO 't05_transport_status_test'@'%';
GRANT SELECT,INSERT,UPDATE ON native_connector_test.connector_dispatch_guard TO 't05_transport_status_test'@'%';
GRANT SELECT,INSERT ON native_connector_test.connector_dispatch_payload TO 't05_transport_status_test'@'%';
GRANT SELECT,INSERT ON native_connector_test.connector_payload_request TO 't05_transport_status_test'@'%';
GRANT SELECT,INSERT ON native_connector_test.connector_dispatch_request TO 't05_transport_status_test'@'%';
GRANT SELECT,INSERT ON native_connector_test.connector_attempt_event TO 't05_transport_status_test'@'%';`);
  runtime=createPool({...config,user:'t05_transport_status_test',password:fixture.channelPassword});
  const [[existing]]=await db.execute('SELECT tenant_id,remote_connection_id,status FROM connector_connection WHERE id=?',[id]);
  if(existing){assert.equal(existing.tenant_id,tenant);assert.equal(existing.remote_connection_id,id);assert.equal(existing.status,'active');}
  else await db.execute("INSERT INTO connector_connection(id,tenant_id,token_hash,remote_connection_id,remote_token_env,status) VALUES (?,?,?,?,?,'active')",[id,tenant,digest({id}),id,'SYNTHETIC_STATUS_TEST']);
  const status=new ConnectorConnectionStatus(runtime),authority=remoteRegistryAuthority(connectorMaterial,registryConfig);
  const server=createWorkloadServer(connectorMaterial,authority,connectorConnectionStatusRoutes(status));servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');
  const call=ownerClient(connectorMaterial,authority,'connector',new URL(protocol+'//127.0.0.1:'+server.address().port+'/'));
  const transport={disable:(t,connection_id,barrier_id)=>call(t,'transport-disable',{connection_id,barrier_id}),enable:(t,connection_id,barrier_id)=>call(t,'transport-enable',{connection_id,barrier_id})};
  const writer=()=>new NativeChannelStatus(pool,proof,transport),state=async()=>{const [[row]]=await db.execute('SELECT status FROM connector_connection WHERE tenant_id=? AND id=?',[tenant,id]);return row.status;};
  const attempts=new AttemptStore(runtime,undefined,lockActiveConnection),payloads=new PayloadStore(runtime),preparation=new PreparationStore(runtime);
  const fresh=async()=>{const payload={version:1,platform:'mock_messenger',message:{type:'text',text:'Synthetic disable acceptance'}},binding={tenant_id:tenant,connection_id:id,conversation_id:randomUUID(),crm_contact_id:fixture.contact,intent_id:randomUUID(),attempt_id:randomUUID(),principal_id:randomUUID(),delegation_id:randomUUID(),actor_kind:'human',owner_revision:'1',record_version:'1',payload_digest:digest(payload)},grant_id=randomUUID();
   await payloads.persistAuthorizedPayload(tenant,{schema_version:1,operation:'payload-put',request_id:randomUUID(),binding,grant_id,payload},'issued');await preparation.prepareAuthorized(tenant,{schema_version:1,operation:'connector-prepare',request_id:randomUUID(),binding,grant_id});return {schema_version:1,operation:'connector-begin',request_id:randomUUID(),binding,grant_id,claim_id:randomUUID()};};
  const read=r=>attempts.readAuthorized(tenant,{schema_version:1,operation:'receipt-read',request_id:randomUUID(),binding:r.binding,receipt_id:r.binding.attempt_id});
  await check('Chat references global transport least privilege, native owner HTTP and tenant negatives',async()=>{
   await assert.rejects(runtime.query('SELECT token_hash FROM connector_connection LIMIT 1'));await assert.rejects(runtime.query('SELECT * FROM native_identity_test.channel_connection LIMIT 1'));
   const barrier=randomUUID();assert.equal((await call(tenant,'transport-status',{connection_id:id,barrier_id:barrier})).state,'absent');await bad(()=>call(other,'transport-disable',{connection_id:id,barrier_id:barrier}),'NOT_FOUND');await bad(()=>call(tenant,'transport-enable',{connection_id:id,barrier_id:barrier}),'NOT_FOUND');assert.equal(await state(),'active');
  });
  await check('Chat references global disable native HTTP proof drain, Connector outage and lost ACK resume',async()=>{
   const command=await prepare(),ref=input(command,'connection'),barrier=randomUUID(),port=server.address().port;await clients.connector(tenant,'reference-reserve',ref);
   server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
   try{await bad(()=>writer().disable(tenant,id,barrier),'DEPENDENCY_UNAVAILABLE');assert.equal(await state(),'active');assert.equal((await commands.proof(tenant,command)).state,'aborted');}
   finally{server.listen(port,'127.0.0.1');await once(server,'listening');}
   const original=transport.disable;let drop=true;transport.disable=async(...args)=>{const r=await original(...args);if(drop){drop=false;throw new OwnerError('DEPENDENCY_UNAVAILABLE');}return r;};
   try{await bad(()=>writer().disable(tenant,id,barrier),'DEPENDENCY_UNAVAILABLE');assert.equal(await state(),'disabled');}finally{transport.disable=original;}
   assert.equal((await writer().disable(tenant,id,barrier)).state,'disabled');assert.equal((await call(tenant,'transport-status',{connection_id:id,barrier_id:barrier})).state,'disabled');
   assert.equal((await writer().enable(tenant,id,barrier)).state,'active');assert.equal(await state(),'active');
  });
  await check('Chat references global disable serializes before local start and never rearms unknown',async()=>{
   const request=await fresh(),barrier=randomUUID();let sends=0;
   const executor=new AttemptExecutor(attempts,{authorizeBegin:async()=>{},bindingActive:async()=>true,consume:async r=>{await writer().disable(tenant,id,barrier);return {schema_version:1,request_id:r.request_id,receipt_id:r.grant_id,state:'consumed',grant_id:r.grant_id,claim_id:r.claim_id,resource_context:{object_key:'conversation',owner_principal_id:r.binding.principal_id,owner_revision:'1',record_version:'1',team_id:null,shared_team_ids:[]}};},send:async()=>{sends++;return {provider_message_id:'synthetic-status'};}});
   try{assert.equal((await executor.execute(tenant,request)).state,'unknown');assert.equal(sends,0);const blocked=await fresh();await bad(()=>attempts.beginAuthorized(tenant,blocked),'FORBIDDEN');}
   finally{await writer().enable(tenant,id,barrier);}
   assert.equal((await executor.execute(tenant,request)).state,'unknown');assert.equal(sends,0);assert.equal((await read(request)).state,'unknown');
  });
  await check('Chat references global disable preserves started attempt and persists synthetic late terminal result',async()=>{
   const request=await fresh(),begun=await attempts.beginAuthorized(tenant,request),fence=attempts.admissionInfo(begun.live).fence,permit=await attempts.startLive(begun.live);await attempts.takeLivePayload(permit);
   const barrier=randomUUID();try{await writer().disable(tenant,id,barrier);assert.equal((await read(request)).state,'started');
    await attempts.recordResultAuthorized(tenant,{schema_version:1,operation:'connector-result',request_id:randomUUID(),binding:request.binding,outcome:'unknown',error_code:'DELIVERY_UNKNOWN'},fence);assert.equal((await read(request)).state,'unknown');
    await attempts.recordResultAuthorized(tenant,{schema_version:1,operation:'connector-result',request_id:randomUUID(),binding:request.binding,outcome:'sent',provider_message_id:'synthetic-late-status'},fence);assert.equal((await read(request)).state,'sent');
   }finally{await writer().enable(tenant,id,barrier);}
  });
  await check('Chat references global disable permanent barriers survive two cycles and delayed old operations',async()=>{
   const first=randomUUID(),second=randomUUID();await writer().disable(tenant,id,first);await writer().enable(tenant,id,first);await writer().disable(tenant,id,second);
   try{await bad(()=>transport.enable(tenant,id,first),'CONFLICT');assert.equal(await state(),'disabled');}finally{await writer().enable(tenant,id,second);}
   await bad(()=>writer().disable(tenant,id,first),'INVALID_TRANSITION');await bad(()=>transport.disable(tenant,id,first),'INVALID_TRANSITION');assert.equal(await state(),'active');
   const [[gate]]=await operator.execute("SELECT state FROM connector_reference_gate WHERE tenant_id=? AND resource_kind='connection' AND resource_id=?",[tenant,id]);assert.equal(gate.state,'open');
   const [plan]=await db.execute("EXPLAIN SELECT barrier_id FROM connector_connection_barrier WHERE tenant_id=? AND connection_id=? AND state='disabled' LIMIT 1",[tenant,id]);assert.equal(plan[0].key,'ix_connector_barrier_connection');
   const [[row]]=await db.execute('SELECT state,version FROM connector_connection_barrier WHERE tenant_id=? AND barrier_id=?',[tenant,first]);assert.equal(row.state,'enabled');assert.equal(String(row.version),'2');
  });
 }finally{await runtime?.end();await db.end();}
}
