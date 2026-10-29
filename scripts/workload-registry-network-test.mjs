import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID,X509Certificate,generateKeyPairSync,sign} from 'node:crypto';
import {databaseSource} from '../services/core-baseline/dist/kernel/database/data-source.js';
import {NativeWorkloadRegistry,WorkloadRegistryOperator} from '../services/core-baseline/dist/modules/identity/workload-registry.js';
import {createWorkloadServer,createWorkloadAgent,workloadRequest,registryAdmissionRoute,remoteRegistryAuthority} from '../packages/workload-transport/dist/index.js';
import {workloadCertificates} from './lib/workload-certificates.mjs';

const env=parseEnv(await readFile('.local/native-auth-test.env','utf8'));
assert.equal(env.APP_ENV,'test');assert.equal(env.MYSQL_DATABASE,'native_identity_test');assert.equal(env.MYSQL_HOST,'127.0.0.1');assert.equal(env.MYSQL_PORT,'13306');Object.assign(process.env,env);
const fixture=JSON.parse(await readFile('.local/identity-dispatch-fixture.json','utf8')),creds=JSON.parse(await readFile('.local/identity-workload-fixture.json','utf8'));
const reader=databaseSource(false,{user:'workload_reader_test',password:creds.reader}),operator=databaseSource(false,{user:'workload_operator_test',password:creds.operator});
const certs=await workloadCertificates(),identity=await certs.material('identity','identity'),chat=await certs.material('chat','chat'),connector=await certs.material('connector','connector');
const keyFile='.local/workload-registry-signing-key.pem';
let key;try{key=await readFile(keyFile);}catch(error){if(error.code!=='ENOENT')throw error;key=generateKeyPairSync('ed25519').privateKey.export({type:'pkcs8',format:'pem'});await writeFile(keyFile,key,{flag:'wx',mode:0o600});}
const {createPublicKey}=await import('node:crypto');const publicKey=createPublicKey(key).export({type:'spki',format:'pem'});
const registry=new NativeWorkloadRegistry(reader),op=new WorkloadRegistryOperator(operator),groups=[],servers=[],agents=[];
const info=m=>{const cert=new X509Certificate(m.cert);return {fingerprint:cert.fingerprint256.replaceAll(':','').toLowerCase(),notBeforeMs:cert.validFromDate.getTime(),notAfterMs:cert.validToDate.getTime()};};
const peer=m=>({service:m.service,fingerprint:info(m).fingerprint});
const version=async service=>String((await operator.query("SELECT version FROM identity_workload_service WHERE tenant_id='01900000-0000-7000-8000-000000000001' AND service=?",[service]))[0].version);
let outage=false,calls=0,currentGroup;
const authority=(p,t)=>{if(outage)throw new Error('synthetic authority outage');return registry.authorize(p.service,p.fingerprint,t);};
async function listen(server,path){servers.push(server);await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});return new URL(`https://127.0.0.1:${server.address().port}${path}`);}
async function test(name,fn){currentGroup=name;await fn();groups.push(name);console.log('PASS '+name);}
const canonical=v=>v&&typeof v==='object'?Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const dir='artifacts/human-outbound';await mkdir(dir,{recursive:true});
try{
  await reader.initialize();await operator.initialize();
  for(const m of [identity,chat,connector]){
    currentGroup='bootstrap '+m.service+' initialize';await op.initialize(m.service);
    currentGroup='bootstrap '+m.service+' enable';await op.setEnabled(m.service,await version(m.service),true);
    currentGroup='bootstrap '+m.service+' admit';await op.admit(m.service,await version(m.service),fixture.tenant,true);
    currentGroup='bootstrap '+m.service+' rotate';await op.rotate(m.service,await version(m.service),info(m),0);
  }
  const route=registryAdmissionRoute(identity,key,'local-test-v1',authority);
  const registryUrl=await listen(createWorkloadServer(identity,authority,{'/internal/v1/workloads/admit':route}),'/internal/v1/workloads/admit');
  const config={url:registryUrl,publicKey,keyId:'local-test-v1'},chatAuthority=remoteRegistryAuthority(chat,config),connectorAuthority=remoteRegistryAuthority(connector,config);
  const business=await listen(createWorkloadServer(connector,connectorAuthority,{'/internal/v1/dispatch/probe':{callers:['chat'],validate:v=>{assert.deepEqual(Object.keys(v).sort(),['request_id','tenant_id']);return v;},handle:async v=>{calls++;return {request_id:v.request_id,ok:true};}}}),'/internal/v1/dispatch/probe');
  const agent=createWorkloadAgent('connector');agents.push(agent);
  const request=()=>workloadRequest(chat,chatAuthority,{url:business,expectedService:'connector',tenant:fixture.tenant,data:{request_id:randomUUID(),tenant_id:fixture.tenant},agent});
  await test('D2-01 actual business TLS uses remote signed native admission on both sides',async()=>{assert.equal((await request()).ok,true);assert.equal((await request()).ok,true);assert.equal(calls,2);});
  await test('D2-01 no tenant wildcard, wrong subject or signing-key substitution',async()=>{
    await assert.rejects(chatAuthority(peer(connector),randomUUID(),new AbortController().signal));
    await assert.rejects(chatAuthority({...peer(connector),fingerprint:'0'.repeat(64)},fixture.tenant,new AbortController().signal));
    const wrong=generateKeyPairSync('ed25519').publicKey.export({type:'spki',format:'pem'});
    await assert.rejects(remoteRegistryAuthority(chat,{...config,publicKey:wrong})(peer(connector),fixture.tenant,new AbortController().signal));assert.equal(calls,2);
  });
  await test('D2-01 signed response still binds nonce tenant caller issuer subject and freshness',async()=>{
    let mode='replay',saved;
    const badRoute={...route,handle:async(v,p,s)=>{
      const good=await route.handle(v,p,s);if(mode==='replay'){if(saved)return saved;saved=good;return good;}
      const {signature,...r}=good;
      if(mode==='nonce')r.request_id=randomUUID();
      if(mode==='tenant')r.tenant_id=randomUUID();
      if(mode==='caller')r.caller=peer(connector);
      if(mode==='issuer')r.issuer=peer(chat);
      if(mode==='subject')r.subject=peer(chat);
      if(mode==='stale')r.issued_at_ms=Date.now()-10000;
      if(mode==='extra')r.extra=true;
      return {...r,signature:sign(null,Buffer.from(canonical(r)),key).toString('base64url')};
    }};
    const url=await listen(createWorkloadServer(identity,authority,{'/internal/v1/workloads/admit':badRoute}),'/internal/v1/workloads/admit');
    const check=remoteRegistryAuthority(chat,{...config,url});
    await check(peer(connector),fixture.tenant,new AbortController().signal);
    for(mode of ['replay','nonce','tenant','caller','issuer','subject','stale','extra'])await assert.rejects(check(peer(connector),fixture.tenant,new AbortController().signal));
  });
  await test('D2-01 live tenant revocation denies reuse of established business connection',async()=>{
    const before=calls;await op.admit('connector',await version('connector'),fixture.tenant,false);
    await assert.rejects(request());assert.equal(calls,before);
    await op.admit('connector',await version('connector'),fixture.tenant,true);assert.equal((await request()).ok,true);
  });
  await test('D2-01 registry outage and parent abort never invoke business handler',async()=>{
    const before=calls;outage=true;await assert.rejects(request());outage=false;
    const controller=new AbortController();controller.abort();
    await assert.rejects(workloadRequest(chat,chatAuthority,{url:business,expectedService:'connector',tenant:fixture.tenant,data:{request_id:randomUUID(),tenant_id:fixture.tenant},signal:controller.signal}));assert.equal(calls,before);
  });
  await test('D2-01 revoked Identity leaf cannot bootstrap current authorization',async()=>{const before=calls;await op.revoke('identity',await version('identity'),info(identity).fingerprint);await assert.rejects(request());assert.equal(calls,before);});
  await writeFile(dir+'/registry.json',JSON.stringify({passed:true,groups,registry:'actual native MySQL via signed TLS admission',business:'synthetic probe only; D2 business composition pending',retained:true},null,2));
}catch(error){console.error('REGISTRY_NETWORK_FAILED in '+currentGroup);await writeFile(dir+'/registry-failure.json',JSON.stringify({passed:false,groups,failedGroup:currentGroup,errorCode:error.code??'FAILED'},null,2));process.exitCode=1;}
finally{for(const a of agents)a.destroy();for(const s of servers){s.closeAllConnections();await new Promise(r=>s.close(r));}if(reader.isInitialized)await reader.destroy();if(operator.isInitialized)await operator.destroy();}
