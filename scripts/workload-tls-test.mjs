import {workloadCertificates} from './lib/workload-certificates.mjs';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {spawnSync} from 'node:child_process';
import {randomBytes,randomUUID,X509Certificate} from 'node:crypto';
import {resolve} from 'node:path';
import {request,Agent,createServer} from 'node:https';
import {databaseSource} from '../services/core-baseline/dist/kernel/database/data-source.js';
import {PLATFORM_TENANT_ID as system} from '../services/core-baseline/dist/kernel/database/system-scope.js';
import {NativeWorkloadRegistry,WorkloadRegistryOperator} from '../services/core-baseline/dist/modules/identity/workload-registry.js';
import {createWorkloadServer,createWorkloadAgent,workloadRequest} from '../services/core-baseline/dist/kernel/transport/workload-tls.js';
const env=parseEnv(await readFile('.local/native-auth-test.env','utf8')),f=JSON.parse(await readFile('.local/identity-dispatch-fixture.json','utf8')),creds=JSON.parse(await readFile('.local/identity-workload-fixture.json','utf8'));
assert.equal(env.APP_ENV,'test');assert.equal(env.MYSQL_DATABASE,'native_identity_test');assert.equal(env.MYSQL_HOST,'127.0.0.1');assert.equal(env.MYSQL_PORT,'13306');Object.assign(process.env,env);
const dir='artifacts/workload-tls',privateDir=resolve('.local/workload-tls'),runDir=resolve(privateDir,randomUUID());await mkdir(dir,{recursive:true});await mkdir(runDir,{recursive:true});
const {material,ca,otherCa}=await workloadCertificates();
const identity=await material('identity','identity'),chat=await material('chat','chat'),connector=await material('connector','connector');
const wrongCa=await material('wrong-ca','chat',otherCa),longLeaf=await material('long','chat',ca,2),multiSan=await material('multiple-san','chat',ca,1,',DNS:localhost');
const reader=databaseSource(false,{user:'workload_reader_test',password:creds.reader}),operator=databaseSource(false,{user:'workload_operator_test',password:creds.operator});await reader.initialize();await operator.initialize();const registry=new NativeWorkloadRegistry(reader),op=new WorkloadRegistryOperator(operator);
const info=m=>{const cert=new X509Certificate(m.cert);return {fingerprint:cert.fingerprint256.replaceAll(':','').toLowerCase(),notBeforeMs:cert.validFromDate.getTime(),notAfterMs:cert.validToDate.getTime()};};
const version=async service=>String((await operator.query('SELECT version FROM identity_workload_service WHERE tenant_id=? AND service=?',[system,service]))[0].version);
const authority=(peer,tenant)=>registry.authorize(peer.service,peer.fingerprint,tenant);
const groups=[],servers=[],agents=[];let calls=0,mode='normal',aborted=false;
const test=async(name,fn)=>{await fn();groups.push(name);console.log('PASS '+name);};
const probe=()=>({tenant_id:f.tenant,request_id:randomUUID()});
const validate=v=>{assert.deepEqual(Object.keys(v).sort(),['request_id','tenant_id']);return v;};
const route={callers:['chat'],validate,handle:async(v,peer)=>{calls++;return {schema_version:1,request_id:v.request_id,peer_service:peer.service};}};
async function listen(server){servers.push(server);await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});return new URL(`https://127.0.0.1:${server.address().port}/internal/v1/workload-probe`);}
const raw=async(url,m=chat,{data=JSON.stringify(probe()),headers={},agent,method='POST',tls='TLSv1.3',timeout=4000}={})=>new Promise((resolve,reject)=>{
 const r=request(url,{ca:identity.ca,cert:m?.cert,key:m?.key,agent,minVersion:tls,maxVersion:tls,rejectUnauthorized:true,checkServerIdentity:()=>undefined,method,headers:{'content-type':'application/json','content-length':Buffer.byteLength(data),...headers}},response=>{const parts=[],port=response.socket.localPort,protocol=response.socket.getProtocol();response.on('data',p=>parts.push(p));response.on('end',()=>resolve({status:response.statusCode,body:JSON.parse(Buffer.concat(parts).toString('utf8')),port,protocol,connection:response.headers.connection,keep:response.headers['keep-alive'],reused:r.reusedSocket}));});
 r.on('error',reject);r.setTimeout(timeout,()=>r.destroy(new Error('raw timeout')));r.end(data);
});
try{
 for(const m of [identity,chat,connector]){await op.initialize(m.service);await op.setEnabled(m.service,await version(m.service),true);await op.admit(m.service,await version(m.service),f.tenant,true);await op.rotate(m.service,await version(m.service),info(m),0);}
 const server=createWorkloadServer(identity,async(peer,tenant,signal)=>{
  if(mode==='outage')throw new Error('private SQL body secret must not escape');
  if(mode==='timeout'){signal.addEventListener('abort',()=>{aborted=true;});return new Promise(resolve=>setTimeout(resolve,2200));}
  return authority(peer,tenant,signal);
 },{'/internal/v1/workload-probe':route});const url=await listen(server);
 await test('WTLS-01 actual TLS1.3 mutual CA and native registry on client and server',async()=>{
  const data=probe(),reply=await workloadRequest(chat,authority,{url,expectedService:'identity',tenant:f.tenant,data});assert.deepEqual(reply,{schema_version:1,request_id:data.request_id,peer_service:'chat'});
  const response=await raw(url);assert.equal(response.status,200);assert.equal(response.protocol,'TLSv1.3');
 });
 await test('WTLS-02 absent client cert unknown CA TLS1.2 and wrong caller rejected',async()=>{
  const before=calls;await assert.rejects(raw(url,null));await assert.rejects(raw(url,wrongCa));await assert.rejects(raw(url,chat,{tls:'TLSv1.2'}));
  const reply=await raw(url,connector,{headers:{'x-service':'chat'}});assert.equal(reply.status,403);assert.equal(calls,before);
 });
 await test('WTLS-01 production client helper reuses TLS socket and checks registry every request',async()=>{
  const agent=createWorkloadAgent('identity');agents.push(agent);let connections=0,checks=0;const count=()=>connections++;server.on('secureConnection',count);
  const current=(...args)=>{checks++;return authority(...args);};
  try{for(let i=0;i<2;i++)await workloadRequest(chat,current,{url,expectedService:'identity',tenant:f.tenant,data:probe(),agent});assert.equal(connections,1);assert.equal(checks,4);}finally{server.off('secureConnection',count);}
 });
 await test('WTLS-02 oversized lifetime multiple SAN and unexpected server identity rejected',async()=>{
  const before=calls;for(const m of [longLeaf,multiSan]){const reply=await raw(url,m);assert.equal(reply.status,401);}
  await assert.rejects(workloadRequest(chat,authority,{url,expectedService:'connector',tenant:f.tenant,data:probe()}));
  assert.throws(()=>createWorkloadServer({...identity,cert:longLeaf.cert,key:longLeaf.key},authority,{}));assert.equal(calls,before);
 });
 await test('WTLS-03 same keepalive connection denies current service disable and cert revoke',async()=>{
  const agent=new Agent({keepAlive:true,maxSockets:1,maxCachedSessions:0,checkServerIdentity:()=>undefined});agents.push(agent);
  const first=await raw(url,chat,{agent});assert.equal(first.status,200);const before=calls;
  await op.setEnabled('chat',await version('chat'),false);const disabled=await raw(url,chat,{agent});assert.equal(disabled.status,403);assert.equal(disabled.port,first.port);assert.equal(calls,before);
  await op.setEnabled('chat',await version('chat'),true);const again=await raw(url,chat,{agent});assert.equal(again.status,200);
  await op.revoke('chat',await version('chat'),info(chat).fingerprint);const revoked=await raw(url,chat,{agent});assert.equal(revoked.status,403);assert.equal(revoked.port,again.port);
  const next=await material('chat-rotated','chat');await op.rotate('chat',await version('chat'),info(next),0);Object.assign(chat,next);
 });
 await test('WTLS-03 tenant admission checked on reused connection and client before send',async()=>{
  const agent=new Agent({keepAlive:true,maxSockets:1,maxCachedSessions:0,checkServerIdentity:()=>undefined});agents.push(agent);const first=await raw(url,chat,{agent});assert.equal(first.status,200);const before=calls;
  await op.admit('chat',await version('chat'),f.tenant,false);const denied=await raw(url,chat,{agent});assert.equal(denied.status,403);assert.equal(denied.port,first.port);
  await assert.rejects(workloadRequest(chat,authority,{url,expectedService:'identity',tenant:f.tenant,data:probe()}),e=>e.code==='FORBIDDEN');assert.equal(calls,before);await op.admit('chat',await version('chat'),f.tenant,true);
 });
 await test('WTLS-04 duplicate escaped keys oversized invalid UTF8 and unknown fields rejected',async()=>{
  const before=calls;const requests=['{"tenant_id":"'+f.tenant+'","tenant_id":"'+f.other+'","request_id":"'+randomUUID()+'"}','{"tenant_id":"'+f.tenant+'","\\u0074enant_id":"'+f.other+'","request_id":"'+randomUUID()+'"}',JSON.stringify({...probe(),extra:true}),'[]','{'+ ' '.repeat(16384)+'}',Buffer.from([0x7b,0x22,0xff,0x22,0x3a,0x31,0x7d])];
  for(const data of requests){const result=await raw(url,chat,{data});assert.equal(result.status,400);assert.deepEqual(Object.keys(result.body).sort(),['code','request_id']);}assert.equal(calls,before);
 });
 await test('WTLS-04 query wrong method credentials compression and content type reject',async()=>{
  const before=calls;const query=new URL(url);query.search='?tenant=x';assert.equal((await raw(query)).status,400);
  for(const config of [{method:'GET'},{headers:{authorization:'synthetic'}},{headers:{cookie:'synthetic'}},{headers:{'content-encoding':'gzip'}},{headers:{'content-type':'text/plain'}}])assert.equal((await raw(url,chat,config)).status,400);assert.equal(calls,before);
 });
 await test('WTLS-05 current authority unavailable and stalled lookup fail closed at deadline',async()=>{
  const before=calls;mode='outage';let response=await raw(url);assert.equal(response.status,503);assert.deepEqual(Object.keys(response.body).sort(),['code','request_id']);assert.ok(!JSON.stringify(response).includes('private SQL'));
  mode='timeout';const start=Date.now();response=await raw(url);assert.equal(response.status,503);assert.ok(Date.now()-start>=1800&&Date.now()-start<3500);assert.equal(aborted,true);await new Promise(resolve=>setTimeout(resolve,250));assert.equal(calls,before);mode='normal';
 });
 await test('WTLS-05 client timeout aborts authority before send without retry',async()=>{
  const before=calls;let abortedClient=false;const start=Date.now();await assert.rejects(workloadRequest(chat,(_p,_t,signal)=>new Promise(()=>signal.addEventListener('abort',()=>{abortedClient=true;})),{url,expectedService:'identity',tenant:f.tenant,data:probe()}),e=>e.code==='DEPENDENCY_UNAVAILABLE');assert.equal(abortedClient,true);assert.ok(Date.now()-start<3500);assert.equal(calls,before);
 });
 await test('WTLS-06 client rejects oversized and duplicate-key response with bounded parse',async()=>{
  let responseMode='duplicate';const malicious=createServer({...identity,minVersion:'TLSv1.3',maxVersion:'TLSv1.3',requestCert:true,rejectUnauthorized:true},(req,res)=>{req.resume();res.writeHead(200,{'content-type':'application/json'});res.end(responseMode==='duplicate'?'{"ok":1,"ok":2}':'{"a":"'+ 'x'.repeat(17000)+'"}');});const maliciousUrl=await listen(malicious);
  await assert.rejects(workloadRequest(chat,authority,{url:maliciousUrl,expectedService:'identity',tenant:f.tenant,data:probe()}));responseMode='oversize';await assert.rejects(workloadRequest(chat,authority,{url:maliciousUrl,expectedService:'identity',tenant:f.tenant,data:probe()}));
 });
 await test('WTLS-03 current server certificate revocation denies at client and server',async()=>{
  const agent=new Agent({keepAlive:true,maxSockets:1,maxCachedSessions:0,checkServerIdentity:()=>undefined});agents.push(agent);const first=await raw(url,chat,{agent});assert.equal(first.status,200);const before=calls;
  await op.revoke('identity',await version('identity'),info(identity).fingerprint);const response=await raw(url,chat,{agent});assert.equal(response.status,403);assert.equal(response.port,first.port);
  await assert.rejects(workloadRequest(chat,authority,{url,expectedService:'identity',tenant:f.tenant,data:probe()}),e=>e.code==='FORBIDDEN');assert.equal(calls,before);
 });
 await writeFile(dir+'/native.json',JSON.stringify({node:process.version,platform:process.platform,groups,tls:'TLSv1.3 mutual CA',registry:'native MySQL local authoritative callbacks',syntheticProbe:true,dispatchEndpoints:false,remoteRegistry:false,mainActivation:false,retained:true},null,2));
}finally{for(const agent of agents)agent.destroy();for(const server of servers){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}await reader.destroy();await operator.destroy();}
