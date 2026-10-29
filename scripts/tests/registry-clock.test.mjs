import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,randomBytes,randomUUID,sign} from 'node:crypto';
import {once} from 'node:events';
import {createWorkloadServer,registryAdmissionRoute,remoteRegistryAuthority,workloadIdentity} from '../../packages/workload-transport/dist/index.js';
import {workloadCertificates} from '../lib/workload-certificates.mjs';
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);

test('registry discards clock-step proofs, retries one fresh nonce within original deadline, and preserves freshness/revocation',async()=>{
 const pair=generateKeyPairSync('ed25519'),key=pair.privateKey.export({type:'pkcs8',format:'pem'}),publicKey=pair.publicKey.export({type:'spki',format:'pem'});
 const keys=Object.fromEntries(['chat','identity'].map(s=>[s,randomBytes(32).toString('hex')])),material=service=>({service,ca:'',cert:'',key:'',localHttp:keys}),tenant=randomUUID();
 const originalNow=Date.now;let offset=0,calls=0,mode='normal',revoked=false,saved,connections=0;
 const native=async()=>{if(revoked)throw Object.assign(new Error(),{code:'FORBIDDEN'});};
 const route=registryAdmissionRoute(material('identity'),key,'test',native),path='/internal/v1/workloads/admit';
 const nonces=[];
 const server=createWorkloadServer(material('identity'),native,{[path]:{...route,handle:async(v,p,s)=>{
  calls++;nonces.push(v.request_id);if(mode==='clock'&&calls===1||mode==='repeated-clock')offset-=3000;
  if(mode==='slow-clock'){await new Promise(r=>setTimeout(r,1100));offset-=3000;}
  const good=await route.handle(v,p,s);if(mode==='replay'){if(saved)return saved;saved=good;}
  const {signature,...body}=good;if(mode==='stale')body.issued_at_ms-=10000;if(mode==='nonce')body.request_id=randomUUID();
  return {...body,signature:sign(null,Buffer.from(canonical(body)),key).toString('base64url')};
 }}});server.on('connection',()=>connections++);server.listen(0,'127.0.0.1');await once(server,'listening');
 const remote=remoteRegistryAuthority(material('chat'),{url:new URL('http://127.0.0.1:'+server.address().port+path),publicKey,keyId:'test'}),call=()=>remote(workloadIdentity(material('identity')),tenant,new AbortController().signal);
 Date.now=()=>originalNow()+offset;
 try{
  await call();await call();assert.equal(connections,1);
  calls=0;mode='clock';await call();assert.equal(calls,2);assert.notEqual(nonces.at(-1),nonces.at(-2));
  for(mode of ['stale','nonce']){calls=0;await assert.rejects(call());assert.equal(calls,1);}
  mode='repeated-clock';calls=0;await assert.rejects(call());assert.equal(calls,2);
  mode='replay';await call();await assert.rejects(call());
  mode='slow-clock';calls=0;const started=performance.now();await assert.rejects(call());assert(performance.now()-started<2600);assert(calls<=2);
  mode='normal';revoked=true;await assert.rejects(call());
 }finally{Date.now=originalNow;server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('signed TLS registry pooling authenticates reused connections and observes current revocation',async()=>{
 const certificates=await workloadCertificates(),identity=await certificates.material('inbox-registry','identity'),chat=await certificates.material('inbox-chat','chat');
 const pair=generateKeyPairSync('ed25519'),key=pair.privateKey.export({type:'pkcs8',format:'pem'}),publicKey=pair.publicKey.export({type:'spki',format:'pem'}),tenant=randomUUID();let revoked=false,connections=0;
 const authority=async()=>{if(revoked)throw Object.assign(new Error(),{code:'FORBIDDEN'});},path='/internal/v1/workloads/admit';
 const server=createWorkloadServer(identity,authority,{[path]:registryAdmissionRoute(identity,key,'tls-test',authority)});server.on('secureConnection',()=>connections++);server.listen(0,'127.0.0.1');await once(server,'listening');
 const remote=remoteRegistryAuthority(chat,{url:new URL('https://127.0.0.1:'+server.address().port+path),publicKey,keyId:'tls-test'}),call=()=>remote(workloadIdentity(identity),tenant,new AbortController().signal);
 try{await call();await call();assert.equal(connections,1);revoked=true;await assert.rejects(call());}
 finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
