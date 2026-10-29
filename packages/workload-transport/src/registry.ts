import {createPrivateKey,createPublicKey,randomUUID,sign,verify} from 'node:crypto';
import {request} from 'node:https';
import {request as httpRequest} from 'node:http';
import {authenticateLocalHttp,localHttpHeaders} from './local-http.js';
import {workloadIdentity,workloadProtocol,createWorkloadAgent,createLocalWorkloadAgent} from './workload-tls.js';
import type {TLSSocket} from 'node:tls';
import {peer,body,bounded,deadline,TransportError,workloadServices,type CurrentAuthority,type Peer,type TlsMaterial,type WorkloadRoute} from './workload-tls.js';

const path='/internal/v1/workloads/admit';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
class RegistryClockChanged extends Error {}
type Admission={schema_version:1;request_id:string;tenant_id:string;subject:Peer};
function fail():never {throw new TransportError('FORBIDDEN');}
function exact(value:unknown,keys:string[]):asserts value is Record<string,unknown> {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==keys.sort().join(','))fail();
}
function identity(value:unknown):asserts value is Peer {
  exact(value,['service','fingerprint']);
  if(!(workloadServices as readonly string[]).includes(String(value.service))||typeof value.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(value.fingerprint))fail();
}
function admission(value:unknown):asserts value is Admission {
  exact(value,['schema_version','request_id','tenant_id','subject']);
  if(value.schema_version!==1||typeof value.request_id!=='string'||!uuid.test(value.request_id)||typeof value.tenant_id!=='string'||!uuid.test(value.tenant_id))fail();
  identity(value.subject);
}
function canonical(value:unknown):string {
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical((value as Record<string,unknown>)[k])).join(',')+'}';
  return JSON.stringify(value);
}

/** Owning Identity endpoint; createWorkloadServer must use native SQL authority. */
export function registryAdmissionRoute(material:TlsMaterial,keyPem:string|Buffer,keyId:string,authorize:CurrentAuthority):WorkloadRoute {
  if(material.service!=='identity'||!/^[a-zA-Z0-9_-]{1,64}$/.test(keyId))fail();
  const key=createPrivateKey(keyPem);if(key.asymmetricKeyType!=='ed25519')fail();
  const issuer=workloadIdentity(material);
  return {
    callers:workloadServices,
    validate(value){admission(value);return value;},
    async handle(value,caller,signal){
      admission(value);
      // Explicit checks also make the route safe if an adapter changes its admission order.
      await authorize(issuer,value.tenant_id,signal);
      await authorize(caller,value.tenant_id,signal);
      await authorize(value.subject,value.tenant_id,signal);
      if(signal.aborted)throw new TransportError('DEPENDENCY_UNAVAILABLE');
      const result={schema_version:1,key_id:keyId,request_id:value.request_id,tenant_id:value.tenant_id,caller,issuer,subject:value.subject,issued_at_ms:Date.now(),decision:'allow'};
      return {...result,signature:sign(null,Buffer.from(canonical(result)),key).toString('base64url')};
    },
  };
}

/** Only registry DTOs can cross this bootstrap boundary; no arbitrary URL/body or allow callback. */
export function remoteRegistryAuthority(material:TlsMaterial,config:{url:URL;publicKey:string|Buffer;keyId:string}):CurrentAuthority {
  material={...material,ca:Buffer.from(material.ca),cert:Buffer.from(material.cert),key:Buffer.from(material.key)};
  const url=new URL(config.url);
  if(url.protocol!==workloadProtocol(material)||url.pathname!==path||url.search||url.hash||url.username||url.password||!/^[a-zA-Z0-9_-]{1,64}$/.test(config.keyId))fail();
  const publicKey=createPublicKey(config.publicKey),keyId=config.keyId;
  if(publicKey.asymmetricKeyType!=='ed25519')fail();
  const agent=material.localHttp?createLocalWorkloadAgent():createWorkloadAgent('identity');
  const attempt:CurrentAuthority=async(subject,tenant,signal)=>{
    if(signal.aborted)throw new TransportError('DEPENDENCY_UNAVAILABLE');
    const data:Admission={schema_version:1,request_id:randomUUID(),tenant_id:tenant,subject:structuredClone(subject)};
    admission(data);
    const self=workloadIdentity(material),encoded=JSON.stringify(data),started=Date.now(),monotonicStart=performance.now();
    const clock=deadline();signal.addEventListener('abort',clock.abort,{once:true});
    let outgoing:ReturnType<typeof request>|undefined,completed=false;
    try {
      await bounded(new Promise<void>((resolve,reject)=>{
        let remote:Peer|undefined;
        outgoing=(material.localHttp?httpRequest:request)(url,{...material,agent,minVersion:'TLSv1.3',maxVersion:'TLSv1.3',rejectUnauthorized:true,method:'POST',headers:{'content-type':'application/json','content-length':Buffer.byteLength(encoded),...(material.localHttp?localHttpHeaders(material):{})}},response=>{
          void bounded(body(response,16384,clock.signal),clock.signal).then(reply=>{
            if(material.localHttp)remote=authenticateLocalHttp(material,response.headers,'identity');
            if(response.statusCode!==200||!remote)fail();
            exact(reply,['schema_version','key_id','request_id','tenant_id','caller','issuer','subject','issued_at_ms','decision','signature']);
            const {signature,...signed}=reply;
            if(typeof signature!=='string'||!/^[A-Za-z0-9_-]{86}$/.test(signature)||!verify(null,Buffer.from(canonical(signed)),publicKey,Buffer.from(signature,'base64url')))fail();
            if(reply.schema_version!==1||reply.key_id!==keyId||reply.request_id!==data.request_id||reply.tenant_id!==tenant||reply.decision!=='allow')fail();
            identity(reply.caller);identity(reply.issuer);identity(reply.subject);
            if(canonical(reply.caller)!==canonical(self)||canonical(reply.issuer)!==canonical(remote)||canonical(reply.subject)!==canonical(data.subject))fail();
            const now=Date.now(),elapsed=performance.now()-monotonicStart;
            if(!Number.isSafeInteger(reply.issued_at_ms)||elapsed>2000||clock.signal.aborted)fail();
            if(Number(reply.issued_at_ms)<started-1000||Number(reply.issued_at_ms)>now+1000||now-started>2000){
              // Never accept the suspect proof. A fresh nonce may be requested once,
              // within the original monotonic deadline, only for a measured local clock step.
              if(Math.abs((now-started)-elapsed)>250)throw new RegistryClockChanged();
              fail();
            }
            completed=true;resolve();
          }).catch(reject);
        });
        outgoing.once('error',()=>reject(new TransportError('DEPENDENCY_UNAVAILABLE')));
        if(material.localHttp)outgoing.end(encoded);
        else outgoing.once('socket',socket=>{
          const send=()=>{try {remote=peer(socket as TLSSocket,'identity');if(clock.signal.aborted)throw new TransportError('DEPENDENCY_UNAVAILABLE');outgoing!.end(encoded);}catch(error){reject(error);}};
          if(outgoing!.reusedSocket)send();else socket.once('secureConnect',send);
        });
      }),clock.signal);
    } finally {signal.removeEventListener('abort',clock.abort);clock.abort();clock.clear();if(!completed)outgoing?.destroy();}
  };
  return async(subject,tenant,signal)=>{
    if(signal.aborted)throw new TransportError('DEPENDENCY_UNAVAILABLE');
    const budget=deadline();signal.addEventListener('abort',budget.abort,{once:true});
    try{
      try{await attempt(subject,tenant,budget.signal);}
      catch(error){if(!(error instanceof RegistryClockChanged)||budget.signal.aborted)throw error;await attempt(subject,tenant,budget.signal);}
    }finally{signal.removeEventListener('abort',budget.abort);budget.abort();budget.clear();}
  };
}
