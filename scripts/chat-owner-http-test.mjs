import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID, X509Certificate } from 'node:crypto';
import { once } from 'node:events';
import { workloadCertificates } from './lib/workload-certificates.mjs';
import { createPool } from './lib/chat-native.mjs';
import { ChatOwnerCommands } from '../services/chat/dist/owner-command.js';
import { chatOwnerRecoveryRoutes } from '../services/chat/dist/owner-http.js';
import { createWorkloadServer, ownerClient, workloadRequest, OwnerError } from '../packages/workload-transport/dist/index.js';

const cfg=JSON.parse(await readFile('.local/chat-ownership/credentials.json','utf8'));
if(cfg.environment!=='retained-test'||cfg.database!=='test_crm_chat_owner'||cfg.host!=='127.0.0.1'||cfg.port!==13306)throw new Error('TEST_CONFIGURATION_DENIED');
const pool=createPool({host:cfg.host,port:cfg.port,database:cfg.database,user:'chat_owner_test_runtime',password:cfg.runtime,timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,jsonStrings:true});
const tenant='01900000-0000-7000-8000-000000004101', results=[],certs=await workloadCertificates();
const chat=await certs.material('owner-chat','chat'),identity=await certs.material('owner-identity','identity'),routing=await certs.material('owner-routing','routing'),bff=await certs.material('owner-bff','bff');
const fingerprint=m=>new X509Certificate(m.cert).fingerprint256.replaceAll(':','').toLowerCase();
const enrolled=new Set([chat,identity,routing,bff].map(fingerprint));
// Synthetic transport enrollment only. This does not stand in for native Identity policy/admission.
const authority=async(peer,t)=>{if(t!==tenant||!enrolled.has(peer.fingerprint))throw new OwnerError('FORBIDDEN');};
const commands=new ChatOwnerCommands(pool,'1');
const validate=x=>({tenant_id:x.tenant_id,request_id:x.request_id});
const server=createWorkloadServer(chat,authority,{
  ...chatOwnerRecoveryRoutes(commands),
  '/internal/v1/owners/chat/body-test':{callers:['identity'],bodyLimit:262144,responseLimit:262144,validate,async handle(x){return {length:x.padding.length};}},
  '/internal/v1/legacy/probe':{callers:['identity'],validate,async handle(){return {state:'ok'};}},
});
async function check(name,fn){await fn();results.push({name,status:'PASS'});console.log('PASS '+name);}
try{
  server.listen(0,'127.0.0.1');await once(server,'listening');const url=new URL('https://127.0.0.1:'+server.address().port+'/');
  const client=ownerClient(identity,authority,'chat',url), router=ownerClient(routing,authority,'chat',url);
  const command={command_id:randomUUID(),binding_digest:'d'.repeat(64)};
  await check('real mTLS owner abort/proof preserves native tombstone and echoed correlation',async()=>{
    assert.deepEqual(await client(tenant,'command-abort',command),{...command,state:'aborted'});
    assert.deepEqual(await router(tenant,'command-proof',command),{...command,state:'aborted'});
  });
  await check('owner errors preserve404/409 and wrong peer or tenant fails closed',async()=>{
    await assert.rejects(client(tenant,'command-proof',{...command,command_id:randomUUID()}),e=>e.code==='NOT_FOUND'&&e.status===404);
    await assert.rejects(client(tenant,'command-proof',{...command,binding_digest:'e'.repeat(64)}),e=>e.code==='CONFLICT'&&e.status===409);
    await assert.rejects(ownerClient(bff,authority,'chat',url)(tenant,'command-proof',command),e=>e.code==='FORBIDDEN');
    await assert.rejects(client(randomUUID(),'command-proof',command),e=>e.code==='FORBIDDEN');
  });
  await check('per-request certificate enrollment revocation blocks subsequent owner RPC',async()=>{
    enrolled.delete(fingerprint(routing));
    await assert.rejects(router(tenant,'command-proof',command),e=>e.code==='FORBIDDEN');
    enrolled.add(fingerprint(routing));
  });
  await check('owner256KiB opt-in leaves legacy16KiB default and96KiB client cap unchanged',async()=>{
    const request={tenant_id:tenant,request_id:randomUUID(),padding:'x'.repeat(100*1024)};
    const owner=await workloadRequest(identity,authority,{url:new URL('/internal/v1/owners/chat/body-test',url),expectedService:'chat',tenant,data:request});
    assert.equal(owner.length,100*1024);
    await assert.rejects(workloadRequest(identity,authority,{url:new URL('/internal/v1/legacy/probe',url),expectedService:'chat',tenant,data:request}),e=>e.code==='INVALID_REQUEST');
    await assert.rejects(workloadRequest(identity,authority,{url:new URL('/internal/v1/legacy/probe',url),expectedService:'chat',tenant,data:{...request,padding:'x'.repeat(20*1024)}}),e=>e.code==='INVALID_REQUEST');
    await assert.rejects(workloadRequest(identity,authority,{url:new URL('/internal/v1/owners/chat/body-test',url),expectedService:'chat',tenant,data:{...request,padding:'x'.repeat(262144)}}),e=>e.code==='INVALID_REQUEST');
  });
  await mkdir('artifacts/chat-extraction/t04',{recursive:true});
  await writeFile('artifacts/chat-extraction/t04/http.json',JSON.stringify({results,scope:'real TLS/native Chat command ledger; synthetic transport enrollment, native business Identity/Routing NOT_RUN'},null,2));
}finally{
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await pool.end();
}
