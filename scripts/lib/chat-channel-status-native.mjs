import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {createPool,rootSQL} from './chat-native.mjs';
import {NativeChannelStatus} from '../../services/core-baseline/dist/modules/channels/owner-status.js';
import {chatTransportStatusNative} from './chat-transport-status-native.mjs';

export async function chatChannelStatusNative(ctx){
 const {check,operator,commands,tenant,other,fixture,env,prepare,input,clients,proofClients,chatServer}=ctx;
 assert.equal(fixture.database,'native_identity_test');assert.match(fixture.channelPassword,/^[a-f0-9]{64}$/);
 if(process.argv.includes('--provision'))rootSQL(`CREATE USER IF NOT EXISTS 't05_channel_status_operator_test'@'%' IDENTIFIED BY '${fixture.channelPassword}';
 GRANT SELECT,UPDATE(status) ON native_identity_test.channel_connection TO 't05_channel_status_operator_test'@'%';
 GRANT SELECT,INSERT,UPDATE ON native_identity_test.connector_reference_gate TO 't05_channel_status_operator_test'@'%';
 GRANT SELECT,INSERT,UPDATE ON native_identity_test.connector_reference_reservation TO 't05_channel_status_operator_test'@'%';
 GRANT INSERT,SELECT(id,tenant_id,resource_type,resource_id,action,correlation_id) ON native_identity_test.audit_entry TO 't05_channel_status_operator_test'@'%';`);
 const pool=createPool({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),database:fixture.database,user:'t05_channel_status_operator_test',password:fixture.channelPassword,timezone:'Z'});
 const proof=(t,ref,abort)=>proofClients.connector(t,abort?'command-abort':'command-proof',ref),writer=()=>new NativeChannelStatus(pool,proof),bad=(work,code)=>assert.rejects(work,e=>e.code===code);
 const state=async()=>{const [[row]]=await operator.execute('SELECT status FROM channel_connection WHERE tenant_id=? AND id=?',[tenant,fixture.connection]);return row.status;};
 try{
  await check('Chat references connection status operator least privileges and tenant boundary',async()=>{
   await assert.rejects(pool.query('SELECT * FROM contact LIMIT 1'),e=>e.code==='ER_TABLEACCESS_DENIED_ERROR');
   await assert.rejects(pool.query('SELECT * FROM test_crm_chat_owner.chat_owner_command LIMIT 1'),e=>e.code==='ER_TABLEACCESS_DENIED_ERROR');
   await assert.rejects(pool.query('UPDATE channel_connection SET credential_hash=credential_hash'),e=>['ER_TABLEACCESS_DENIED_ERROR','ER_COLUMNACCESS_DENIED_ERROR'].includes(e.code));
   await bad(()=>writer().disable(other,fixture.connection,randomUUID()),'REFERENCE_INVALID');assert.equal(await state(),'active');
  });
  await check('Chat references connection disable actual HTTP outage restart retained barrier and lost ACK',async()=>{
   const command=await prepare(),request=input(command,'connection'),barrier=randomUUID(),port=chatServer.address().port;
   await clients.connector(tenant,'reference-reserve',request);
   chatServer.closeAllConnections();await new Promise(resolve=>chatServer.close(resolve));
   try{await bad(()=>writer().disable(tenant,fixture.connection,barrier),'DEPENDENCY_UNAVAILABLE');assert.equal(await state(),'active');}
   finally{chatServer.listen(port,'127.0.0.1');await once(chatServer,'listening');}
   try{
    const late=await prepare();await bad(()=>clients.connector(tenant,'reference-reserve',input(late,'connection')),'INVALID_TRANSITION');await commands.abort(tenant,late);
    const result=await writer().disable(tenant,fixture.connection,barrier);assert.equal(result.state,'disabled');assert.equal(await state(),'disabled');assert.equal((await commands.proof(tenant,command)).state,'aborted');
    assert.deepEqual(await writer().disable(tenant,fixture.connection,barrier),result);
    assert.equal((await clients.connector(tenant,'catalog-connection-read',{connection_id:fixture.connection})).connection_id,fixture.connection);
    await bad(()=>clients.connector(tenant,'connection-binding-read',{connection_id:fixture.connection}),'REFERENCE_INVALID');
    const [[audit]]=await operator.execute("SELECT COUNT(*) n FROM audit_entry WHERE tenant_id=? AND resource_id=? AND correlation_id=? AND action='connection.disable'",[tenant,fixture.connection,barrier]);assert.equal(Number(audit.n),1);
    await bad(()=>writer().enable(tenant,fixture.connection,randomUUID()),'CONFLICT');
   }finally{await writer().enable(tenant,fixture.connection,barrier);}
   assert.equal(await state(),'active');assert.equal((await writer().enable(tenant,fixture.connection,barrier)).state,'active');await bad(()=>writer().disable(tenant,fixture.connection,barrier),'INVALID_TRANSITION');
  });
  await check('Chat references connection disable preserves winning commit and reenabled new admission',async()=>{
   const command=await prepare(),request=input(command,'connection'),barrier=randomUUID();await clients.connector(tenant,'reference-reserve',request);
   await commands.commit(tenant,command,randomUUID(),async()=>({effect_id:command.command_id,effect_revision:'1'}));
   try{assert.equal((await writer().disable(tenant,fixture.connection,barrier)).state,'disabled');assert.equal((await commands.proof(tenant,command)).state,'committed');assert.equal((await clients.connector(tenant,'reference-status',request)).state,'released');}
   finally{await writer().enable(tenant,fixture.connection,barrier);}
   const next=await prepare(),held=await clients.connector(tenant,'reference-reserve',input(next,'connection'));assert.equal(held.state,'reserved');await commands.abort(tenant,next);assert.equal((await clients.connector(tenant,'reference-release',input(next,'connection'))).state,'released');
  });
  if(process.argv.includes('--with-transport'))await chatTransportStatusNative({...ctx,pool,proof});
 }finally{await pool.end();}
}
