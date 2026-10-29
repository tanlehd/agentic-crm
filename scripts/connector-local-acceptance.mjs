// Final D1 acceptance against the running native backend, never a fake receiver.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash, randomUUID, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { localContext, preflight, evidence, docker, backendSql, schemaSnapshot, pending, until, start, observe, fixtureId, connectorOrigin, apiOrigin, uuid } from './lib/connector-local.mjs';

const ctx = await localContext();
const opsOnly=process.argv[2]==='--ops';
assert.ok(process.argv.length===2||(opsOnly&&process.argv.length===3),'Only optional --ops is supported');
const c = ctx.config;
const headers = { 'content-type':'application/json', 'x-connection-id':c.CONNECTOR_CONNECTION_ID, authorization:'Bearer '+c.CONNECTOR_INGRESS_TOKEN };
const input = key => ({ provider_event_id:key,provider_message_id:key,external_subject_id:'synthetic-src107-local',display_label:'Connector local synthetic',occurred_at:'2026-10-18T00:00:00Z',message:{type:'text',text:'Synthetic SRC-107 native Connector ingress'} });
async function call(path, body, override = {}) {
  const r = await fetch(connectorOrigin+'/connector/v1/'+path,{method:body===undefined?'GET':'POST',headers:{...headers,...override},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(8000)});
  return {status:r.status,body:await r.json()};
}
async function accept(body, override) {
  const r=await call('deliveries',body,override);assert.equal(r.status,202);assert.ok(uuid(r.body.data.delivery_id));return r.body.data.delivery_id;
}
async function status(id, override) {const r=await call('deliveries/'+id,undefined,override);assert.equal(r.status,200);return r.body.data;}
async function completed(id) {await until(async()=>{const row=await status(id);assert.ok(!['blocked','attention'].includes(row.status),'Delivery unexpectedly terminal');return row.status==='completed';},'NATIVE_DELIVERY_TIMEOUT');return status(id);}
async function message(event, localId) {
  const local=await completed(localId),r=await ctx.remote('deliveries/'+local.remote_delivery_id);
  assert.equal(r.status,200);assert.equal(r.body.data.status,'processed');assert.ok(uuid(r.body.data.message_id));
  assert.match(event.provider_message_id,/^[a-zA-Z0-9-]+$/);
  const rows=await backendSql(`SELECT COUNT(*),MIN(id),MIN(SHA2(text,256)) FROM message WHERE tenant_id='${c.CONNECTOR_TENANT_ID}' AND connection_id='${c.CONNECTOR_REMOTE_CONNECTION_ID}' AND provider_message_id='${event.provider_message_id}';`);
  const [count,id,hash]=rows.split('\t');assert.equal(count,'1');assert.equal(id,r.body.data.message_id);assert.equal(hash,createHash('sha256').update(event.message.text).digest('hex'));
  return {delivery:localId,remoteDelivery:local.remote_delivery_id,message:id,conversation:r.body.data.conversation_id};
}
async function runRollout(mode) {
  await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['scripts/connector-rollout.mjs',mode],{windowsHide:true,stdio:['ignore','ignore','ignore']});
    child.once('error',()=>reject(new Error('ROLLOUT_UNAVAILABLE')));child.once('exit',code=>code===0?resolve():reject(new Error('ROLLOUT_FAILED')));
  });
}
const groups=[],receipts=[];let currentGroup,proxy,usingProxy=false;
async function test(name,fn) {if(opsOnly&&!/^DLV-0[45]/.test(name))return;currentGroup=name;await fn();groups.push(name);console.log('PASS '+name);}
const facts=await preflight(ctx);
const baseJournal=await schemaSnapshot(ctx);
let proxyMode='pass',droppedAck,forwarded=0;
const faultOverride='.local/connector-native-fault.compose.yaml';
async function startProxy() {
  proxy=createServer((req,res)=>{
    void(async()=>{
      if(req.headers.authorization!==headers.authorization.replace(c.CONNECTOR_INGRESS_TOKEN,c.CONNECTOR_REMOTE_TOKEN_LOCAL)||req.headers['x-connection-id']!==c.CONNECTOR_REMOTE_CONNECTION_ID) {res.writeHead(403).end('{}');return;}
      if(!/^\/api\/v1\/integrations\/(?:mock-messenger\/(?:binding|deliveries-v2)|contact-identities\/(?:lookup|resolve)|deliveries\/[a-f0-9-]{36})$/.test(req.url??'')){res.writeHead(404).end('{}');return;}
      if(proxyMode==='outage'){res.writeHead(503).end('{}');return;}
      let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>65536){res.writeHead(413).end('{}');return;}}
      const reply=await fetch(apiOrigin+req.url,{method:req.method,redirect:'error',headers:{authorization:'Bearer '+c.CONNECTOR_REMOTE_TOKEN_LOCAL,'x-connection-id':c.CONNECTOR_REMOTE_CONNECTION_ID,'content-type':'application/json'},...(body?{body}:{}),signal:AbortSignal.timeout(5000)});
      const text=await reply.text();
      if(req.url.endsWith('/deliveries-v2')&&reply.status===202){
        forwarded++;
        if(proxyMode==='drop-ack'){droppedAck=JSON.parse(text).data.delivery_id;proxyMode='pass';res.destroy();return;}
      }
      res.writeHead(reply.status,{'content-type':'application/json'}).end(text);
    })().catch(()=>{if(!res.destroyed)res.writeHead(503).end('{}');});
  });
  await new Promise((resolve,reject)=>{proxy.once('error',reject);proxy.listen(13112,'0.0.0.0',resolve);});
  await writeFile(faultOverride,"services:\n  connector-worker:\n    environment:\n      CONNECTOR_REMOTE_ORIGIN: http://host.docker.internal:13112\n");
  usingProxy=true;
  await docker([...ctx.compose,'-f',faultOverride,'up','-d','--no-build','--no-deps','--wait','--wait-timeout','90','connector-worker'],undefined,ctx.env);
}
async function restoreProxy() {
  if(usingProxy){await ctx.dc(['up','-d','--no-build','--no-deps','--force-recreate','--wait','--wait-timeout','90','connector-worker']);usingProxy=false;}
  if(proxy){proxy.closeAllConnections();await new Promise(resolve=>proxy.close(resolve));proxy=undefined;}
}
try {
  if(opsOnly)receipts.push(await message(input('src107-native-stable'),await accept(input('src107-native-stable'))));
  await test('DLV-01 pinned schema, no-op and narrow own-DB runtime',async()=>{
    assert.deepEqual(baseJournal.map(({state,...row})=>{assert.equal(state,'applied');return row;}),facts.manifest);
    await ctx.dc(['run','--rm','--no-deps','connector-admin','node','dist/main.js','migrate']);
    assert.deepEqual(await schemaSnapshot(ctx),baseJournal);
    for(const role of ['connector-api','connector-worker']){
      const id=await ctx.dc(['ps','-q',role]);const info=JSON.parse(await docker(['inspect',id,'--format','{{json .}}']));
      assert.equal(info.Image,c.CONNECTOR_IMAGE);assert.equal(info.Config.User,'node');assert.equal(info.HostConfig.ReadonlyRootfs,true);assert.ok(!info.Config.Env.some(v=>v.startsWith('CONNECTOR_MIGRATION_PASSWORD=')));
    }
    const check="const a=require('node:assert/strict'),m=require('mysql2/promise'),e=process.env;(async()=>{const p=await m.createConnection({host:e.CONNECTOR_DB_HOST,database:e.CONNECTOR_DB_NAME,user:e.CONNECTOR_DB_USER,password:e.CONNECTOR_DB_PASSWORD});try{for(const sql of ['SELECT * FROM mysql.user LIMIT 1','SELECT * FROM agentic_crm.tenant LIMIT 1']){let denied=false;try{await p.query(sql)}catch(x){denied=['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(x.code)}a.ok(denied)}const[g]=await p.query('SHOW GRANTS');for(const r of g)a.doesNotMatch(Object.values(r).join(' '),/GRANT .*\\b(CREATE|ALTER|DROP|ALL PRIVILEGES|GRANT OPTION)\\b/i);console.log('restricted')}finally{await p.end()}})().catch(()=>process.exit(1))";
    assert.equal(await ctx.dc(['exec','-T','connector-worker','node','-e',check]),'restricted');
  });
  await test('DLV-02 native HTTP to persisted Chat message; replay/conflict/tenant denial',async()=>{
    const event=input('src107-native-stable'),id=await accept(event);receipts.push(await message(event,id));
    assert.equal(await accept(event),id);
    assert.equal((await call('deliveries',{...event,message:{type:'text',text:'Synthetic conflict'}})).status,409);
    assert.equal((await call('deliveries',event,{'x-tenant-id':fixtureId('clinic_beta')})).status,403);
    assert.equal((await call('deliveries',event,{'x-connection-id':fixtureId('beta:mock_connection')})).status,401);
    assert.equal((await ctx.remote('deliveries/'+receipts[0].remoteDelivery,undefined,'beta')).status,404);
    assert.deepEqual(await message(event,id),receipts[0]);
  });
  await test('DLV-03 tenant binding mismatch blocked before forwarding',async()=>{
    const path='.local/connector-native-mismatch.json';let fixture;
    try{fixture=JSON.parse(await readFile(path,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;fixture={id:randomUUID(),token:randomBytes(32).toString('hex')};await writeFile(path,JSON.stringify(fixture),{flag:'wx',mode:0o600});}
    assert.ok(uuid(fixture.id));assert.match(fixture.token,/^[a-f0-9]{64}$/);
    const tokenHash=createHash('sha256').update(fixture.token).digest('hex'),tenant=fixtureId('clinic_beta');
    const existing=await ctx.ownSql(`SELECT CONCAT(tenant_id,':',remote_connection_id,':',token_hash) FROM connector_connection WHERE id='${fixture.id}';`);
    if(existing)assert.equal(existing,tenant+':'+c.CONNECTOR_REMOTE_CONNECTION_ID+':'+tokenHash);
    else await ctx.ownSql(`INSERT INTO connector_connection(id,tenant_id,token_hash,remote_connection_id,remote_token_env) VALUES ('${fixture.id}','${tenant}','${tokenHash}','${c.CONNECTOR_REMOTE_CONNECTION_ID}','CONNECTOR_REMOTE_TOKEN_LOCAL');`);
    await ctx.ownSql(`UPDATE connector_connection SET status='active' WHERE id='${fixture.id}' AND tenant_id='${tenant}';`);
    try{
      const event=input('src107-mismatch-'+randomUUID()),override={'x-connection-id':fixture.id,authorization:'Bearer '+fixture.token},id=await accept(event,override);
      await until(async()=>(await status(id,override)).status==='blocked','MISMATCH_NOT_BLOCKED');
      assert.equal((await status(id,override)).error_code,'REMOTE_BINDING_MISMATCH');
      assert.equal(await backendSql(`SELECT COUNT(*) FROM inbound_delivery WHERE tenant_id='${c.CONNECTOR_TENANT_ID}' AND connection_id='${c.CONNECTOR_REMOTE_CONNECTION_ID}' AND provider_event_id='${event.provider_event_id}';`),'0');
    }finally{await ctx.ownSql(`UPDATE connector_connection SET status='disabled' WHERE id='${fixture.id}' AND tenant_id='${tenant}';`);}
  });
  await test('DLV-03 actual upstream outage and lost-ACK recovery',async()=>{
    assert.equal(await pending(ctx),0);await startProxy();proxyMode='outage';
    const outage=input('src107-outage-'+randomUUID()),outageId=await accept(outage);
    await until(async()=>(await status(outageId)).error_code==='REMOTE_UNAVAILABLE','OUTAGE_NOT_OBSERVED');
    assert.equal((await status(outageId)).status,'queued');assert.equal((await fetch('http://127.0.0.1:3011/connector/v1/health/ready')).status,200);
    proxyMode='pass';receipts.push(await message(outage,outageId));
    proxyMode='drop-ack';const lost=input('src107-lostack-'+randomUUID()),lostId=await accept(lost);
    await until(async()=>!!droppedAck,'LOST_ACK_NOT_OBSERVED');
    const receipt=await message(lost,lostId);assert.equal(receipt.remoteDelivery,droppedAck);assert.ok(forwarded>=3);receipts.push(receipt);
    assert.equal(await backendSql(`SELECT COUNT(*) FROM inbound_delivery WHERE tenant_id='${c.CONNECTOR_TENANT_ID}' AND connection_id='${c.CONNECTOR_REMOTE_CONNECTION_ID}' AND provider_event_id='${lost.provider_event_id}';`),'1');
    await restoreProxy();
  });
  await test('DLV-04 graceful restart preserves receipts and independent readiness',async()=>{
    const apiId=await ctx.dc(['ps','-q','connector-api']),workerId=await ctx.dc(['ps','-q','connector-worker']);
    await ctx.dc(['stop','connector-api','connector-worker']);
    for(const id of [apiId,workerId]){const state=JSON.parse(await docker(['inspect',id,'--format','{{json .State}}']));assert.equal(state.ExitCode,0);assert.equal(state.OOMKilled,false);}
    await start(ctx);assert.deepEqual(await message(input('src107-native-stable'),await accept(input('src107-native-stable'))),receipts[0]);
    const observation=await observe(ctx);
    for(const id of ['connector-api','connector-worker']){const s=observation.currentRegistry.services.find(s=>s.id===id);assert.equal(s.health,'ready');assert.equal(s.owned,false);}
    for(const probe of observation.health)assert.equal(probe.status,200);
    await evidence('services',observation);
  });
  await test('DLV-05 scoped drain/disable rollback and reapply retain native result',async()=>{
    await runRollout('--rollback');
    assert.equal(await ctx.ownSql(`SELECT status FROM connector_connection WHERE id='${c.CONNECTOR_CONNECTION_ID}';`),'disabled');
    assert.equal(await pending(ctx),0);
    // Verify disabled credential is rejected while only the ingress API is temporarily started.
    await ctx.dc(['up','-d','--no-build','--wait','--wait-timeout','90','connector-api']);
    assert.equal((await call('deliveries',input('src107-disabled-'+randomUUID()))).status,403);
    await runRollout('--apply');
    assert.deepEqual(await message(input('src107-native-stable'),await accept(input('src107-native-stable'))),receipts[0]);
    assert.deepEqual(await schemaSnapshot(ctx),baseJournal);
    assert.equal(await backendSql('SELECT MAX(version) FROM schema_migration;'),facts.backendSchema);
  });
  await evidence(opsOnly?'acceptance-ops':'acceptance',{passed:true,groups,image:c.CONNECTOR_IMAGE,backendSchema:facts.backendSchema,connectorSchema:5,receipts,retained:true,provider:'synthetic mock input; actual native HTTP/worker/MySQL'});
}catch(error){
  await evidence('acceptance-failure',{passed:false,groups,failedGroup:currentGroup,error:'ACCEPTANCE_FAILED',retained:true});
  console.error('ACCEPTANCE_FAILED in '+currentGroup);process.exitCode=1;
}finally{await restoreProxy();}
