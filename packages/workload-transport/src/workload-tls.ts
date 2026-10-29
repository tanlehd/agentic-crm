import {X509Certificate} from 'node:crypto';
import {createServer,request,Agent} from 'node:https';
import {createServer as httpServer,request as httpRequest,Agent as HttpAgent,type IncomingMessage,type RequestListener,type Server} from 'node:http';
import {authenticateLocalHttp,localHttpHeaders,localHttpPeer,localHttpKeys,type LocalHttpKeys} from './local-http.js';
import type {TLSSocket} from 'node:tls';
import {strictJson} from './workload-json.js';
import {OwnerError,OwnerDomainError,isOwnerDomainCode,validateOwnerValue,ownerErrorResponse,ownerResponseLimit,ownerDeadline,OWNER_BODY_LIMIT,type OwnerErrorCode} from './owner-protocol.js';
import {ExchangeError,exchangeErrorResponse,ingressExchangePath,validateExchangeValue} from './exchange-protocol.js';
const ownerPath = (path:string) => /^\/internal\/v1\/owners\/[a-z-]+\/[a-zA-Z0-9-]+$/.test(path);
export function workloadDeadline(path:string):number{
 if(ownerPath(path)){const parts=path.split('/');return ownerDeadline(parts[4]!,parts[5]!);}
 return ['/internal/v1/chat-exchange/ingress-accept','/internal/v1/chat-exchange/ingress-read'].includes(path)?10000:2000;
}

export const workloadServices = ['identity','chat','connector','routing','bff','crm','sales','ai-runtime','workflow','reporting'] as const;
export type ServiceName=typeof workloadServices[number];
export type Peer={service:ServiceName;fingerprint:string};
export type CurrentAuthority=(peer:Peer,tenant:string,signal:AbortSignal)=>Promise<void>;
export type TlsMaterial={ca:string|Buffer;cert:string|Buffer;key:string|Buffer;service:ServiceName;localHttp?:LocalHttpKeys};
export const workloadProtocol=(material:TlsMaterial)=>material.localHttp?'http:':'https:';
export const workloadIdentity=(material:TlsMaterial)=>material.localHttp?localHttpPeer(material):leaf(new X509Certificate(material.cert),material.service);
export class TransportError extends Error{
 constructor(readonly code:'INVALID_REQUEST'|'UNAUTHENTICATED'|'FORBIDDEN'|'DEPENDENCY_UNAVAILABLE'){super(code);}
}
function invalid():never{throw new TransportError('INVALID_REQUEST');}
function leaf(cert:X509Certificate,expected?:ServiceName):Peer{
 const match=/^URI:spiffe:\/\/agentic-crm\/service\/(identity|chat|connector|routing|bff|crm|sales|ai-runtime|workflow|reporting)$/.exec(cert.subjectAltName??'');
 const from=cert.validFromDate.getTime(),until=cert.validToDate.getTime(),now=Date.now();
 if(cert.ca||!match||until<=from||until-from>86400000||now<from||now>=until||(expected&&match[1]!==expected))throw new TransportError('UNAUTHENTICATED');
 return {service:match[1] as ServiceName,fingerprint:cert.fingerprint256.replaceAll(':','').toLowerCase()};
}
function peer(socket:TLSSocket,expected?:ServiceName):Peer{
 if(!socket.authorized||socket.getProtocol()!=='TLSv1.3')throw new TransportError('UNAUTHENTICATED');
 const raw=socket.getPeerCertificate().raw;if(!raw)throw new TransportError('UNAUTHENTICATED');return leaf(new X509Certificate(raw),expected);
}
function deadline(milliseconds=2000){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),milliseconds);timer.unref();
 return {signal:controller.signal,abort:()=>controller.abort(),clear:()=>clearTimeout(timer)};
}
async function bounded<T>(work:Promise<T>,signal:AbortSignal):Promise<T>{
 if(signal.aborted){void work.catch(()=>{});throw new TransportError('DEPENDENCY_UNAVAILABLE');}
 let abort:()=>void=()=>{};
 try{return await Promise.race([work,new Promise<never>((_resolve,reject)=>{abort=()=>reject(new TransportError('DEPENDENCY_UNAVAILABLE'));signal.addEventListener('abort',abort,{once:true});})]);}
 finally{signal.removeEventListener('abort',abort);}
}
async function body(message:IncomingMessage,limit:number,signal:AbortSignal){
 const chunks:Buffer[]=[];let size=0;
 if(message.headers['content-encoding']||!/^application\/json(?:;\s*charset=utf-8)?$/i.test(message.headers['content-type']??''))invalid();
 const contentLength=message.headers['content-length'];if(contentLength&&(!/^\d+$/.test(contentLength)||Number(contentLength)>limit))invalid();
 // The outer deadline destroys client requests or closes server responses on timeout.
 for await(const chunk of message){if(signal.aborted)throw new TransportError('DEPENDENCY_UNAVAILABLE');const buffer=Buffer.from(chunk);size+=buffer.length;if(size>limit)invalid();chunks.push(buffer);}
 try{return strictJson(Buffer.concat(chunks));}catch{throw new TransportError('INVALID_REQUEST');}
}
const tenantPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export type WorkloadRoute={callers:readonly ServiceName[];bodyLimit?:number;responseLimit?:number;validate:(value:Record<string,unknown>)=>{tenant_id:string;request_id:string};handle:(value:Record<string,unknown>,peer:Peer,signal:AbortSignal)=>Promise<Record<string,unknown>>};
export function createWorkloadAgent(expectedService:ServiceName):Agent{
 // Node 24 isolates per-request custom identity checkers. Configure the checker
 // on the agent so keepalive is possible; peer() still revalidates every request.
 return new Agent({keepAlive:true,maxSockets:32,maxFreeSockets:8,timeout:10000,maxCachedSessions:0,checkServerIdentity:(_host,cert)=>{try{leaf(new X509Certificate(cert.raw),expectedService);return undefined;}catch{return new TransportError('UNAUTHENTICATED');}}});
}
export function createLocalWorkloadAgent():HttpAgent{return new HttpAgent({keepAlive:true,maxSockets:32,maxFreeSockets:8,timeout:10000});}
export function createWorkloadServer(material:TlsMaterial,authorize:CurrentAuthority,routes:Readonly<Record<string,WorkloadRoute>>):Server{
 material={...material,ca:Buffer.from(material.ca),cert:Buffer.from(material.cert),key:Buffer.from(material.key)};
 // Fail startup for invalid own identity as well as checking validity on each request.
 if(material.localHttp)material.localHttp=localHttpKeys(material.localHttp);
 workloadIdentity(material);
 for(const [path,route] of Object.entries(routes)){
  const owning=ownerPath(path),parts=path.split('/');
  if(!owning&&!/^\/internal\/v1\/[a-z0-9/-]+$/.test(path)||![route.bodyLimit??16384,route.responseLimit??16384].every((n,index)=>
   Number.isSafeInteger(n)&&n>0&&n<=(owning?(index===0?OWNER_BODY_LIMIT:ownerResponseLimit(parts[4]!,parts[5]!)):98304)))invalid();
 }
 const listener:RequestListener=(req,res)=>{
  const clock=deadline(workloadDeadline(req.url??''));let requestId:string|null=null;
  const isOwner=ownerPath(req.url??'');
  req.once('aborted',clock.abort);res.once('close',()=>{if(!res.writableFinished)clock.abort();});
  const run=async()=>{
   const remote=material.localHttp?authenticateLocalHttp(material,req.headers):peer(req.socket as TLSSocket),self=workloadIdentity(material);
   const route=Object.hasOwn(routes,req.url??'')?routes[req.url!]:undefined;
   if(req.method!=='POST'||!route||req.headers.authorization||req.headers.cookie)invalid();
   if(!route.callers.includes(remote.service))throw new TransportError('FORBIDDEN');
   const data=await body(req,route.bodyLimit??16384,clock.signal);let context:{tenant_id:string;request_id:string};
   try{context=route.validate(data);if(!tenantPattern.test(context.tenant_id)||!tenantPattern.test(context.request_id))invalid();}catch{throw new TransportError('INVALID_REQUEST');}
   requestId=context.request_id;
   await bounded(Promise.all([authorize(self,context.tenant_id,clock.signal),authorize(remote,context.tenant_id,clock.signal)]),clock.signal);
   if(clock.signal.aborted)throw new TransportError('DEPENDENCY_UNAVAILABLE');
   const output=await bounded(route.handle(data,remote,clock.signal),clock.signal),encoded=JSON.stringify(output);
   if(Buffer.byteLength(encoded)>(route.responseLimit??16384))throw new TransportError('DEPENDENCY_UNAVAILABLE');
   res.writeHead(200,{'content-type':'application/json','cache-control':'no-store',...(material.localHttp?localHttpHeaders(material):{})});res.end(encoded);
  };
  void bounded(run(),clock.signal).catch(error=>{
   if(res.headersSent||res.destroyed)return;
   const ownerError=isOwner?ownerErrorResponse(error,requestId):ingressExchangePath(req.url??'')?exchangeErrorResponse(error,requestId):null;
   if(ownerError){res.writeHead(ownerError.status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(ownerError.body));return;}
   const known=error&&typeof error==='object'&&'code' in error?String(error.code):'';
   const code=['INVALID_REQUEST','UNAUTHENTICATED','FORBIDDEN'].includes(known)?known:'DEPENDENCY_UNAVAILABLE';
   const status=code==='INVALID_REQUEST'?400:code==='UNAUTHENTICATED'?401:code==='FORBIDDEN'?403:503;
   res.writeHead(status,{'content-type':'application/json','connection':'close'});res.end(JSON.stringify({code,request_id:requestId}));
  }).finally(()=>{clock.abort();clock.clear();});
 };
 const server=material.localHttp?httpServer(listener):createServer({...material,minVersion:'TLSv1.3',maxVersion:'TLSv1.3',requestCert:true,rejectUnauthorized:true},listener);
 server.requestTimeout=2000;server.headersTimeout=2000;server.keepAliveTimeout=5000;
 return server;
}
export async function workloadRequest(material:TlsMaterial,authorize:CurrentAuthority,options:{url:URL;expectedService:ServiceName;tenant:string;data:Record<string,unknown>;agent?:Agent;httpAgent?:HttpAgent;responseLimit?:number;signal?:AbortSignal}):Promise<Record<string,unknown>>{
 material={...material,ca:Buffer.from(material.ca),cert:Buffer.from(material.cert),key:Buffer.from(material.key)};
 const self=workloadIdentity(material);
 if(options.url.protocol!==workloadProtocol(material)||options.url.username||options.url.password||options.url.search||options.url.hash||!tenantPattern.test(options.tenant))invalid();
 const isOwner=ownerPath(options.url.pathname),maximum=isOwner?OWNER_BODY_LIMIT:98304;
 const encoded=JSON.stringify(options.data);if(Buffer.byteLength(encoded)>maximum)invalid();
 const parts=options.url.pathname.split('/'),responseMaximum=isOwner?ownerResponseLimit(parts[4]!,parts[5]!):maximum;
 const limit=options.responseLimit??16384;if(!Number.isSafeInteger(limit)||limit<=0||limit>responseMaximum)invalid();
 if(options.signal?.aborted)throw new TransportError('DEPENDENCY_UNAVAILABLE');
 const clock=deadline(workloadDeadline(options.url.pathname));
 options.signal?.addEventListener('abort',clock.abort,{once:true});
 let outgoing:ReturnType<typeof request>|undefined,completed=false;
 try{return await bounded(new Promise<Record<string,unknown>>((resolve,reject)=>{
  outgoing=(material.localHttp?httpRequest:request)(options.url,{...material,agent:material.localHttp?(options.httpAgent??false):options.agent,minVersion:'TLSv1.3',maxVersion:'TLSv1.3',rejectUnauthorized:true,method:'POST',headers:{'content-type':'application/json','content-length':Buffer.byteLength(encoded),...(material.localHttp?localHttpHeaders(material):{})},checkServerIdentity:(_host,cert)=>{try{leaf(new X509Certificate(cert.raw),options.expectedService);return undefined;}catch{return new TransportError('UNAUTHENTICATED');}}},response=>{
   void bounded(body(response,limit,clock.signal),clock.signal).then(data=>{
    if(material.localHttp&&response.statusCode===200)authenticateLocalHttp(material,response.headers,options.expectedService);
    if(response.statusCode!==200){const code=data.code;
       if(ingressExchangePath(options.url.pathname)&&data.request_id===options.data.request_id){
        const failure=validateExchangeValue<{code:ConstructorParameters<typeof ExchangeError>[0]}>('ExchangeFailure',data);
        const known=new ExchangeError(failure.code);if(known.status===response.statusCode)throw known;
        throw new TransportError('DEPENDENCY_UNAVAILABLE');
       }
       if(isOwner&&code==='DOMAIN_ERROR'&&data.request_id===options.data.request_id){
        const failure=validateOwnerValue<{public_error:{error:{code:string};meta:{correlation_id:string}}}>('OwnerFailure',data);
        const publicCode=failure.public_error.error.code;
        if(isOwnerDomainCode(publicCode)){
         const known=new OwnerDomainError(publicCode,failure.public_error.meta.correlation_id);if(known.status===response.statusCode)throw known;
        }
        throw new TransportError('DEPENDENCY_UNAVAILABLE');
       }
     if(isOwner&&data.schema_version===1&&typeof code==='string'&&Object.keys(data).sort().join(',')==='code,request_id,schema_version'&&data.request_id===options.data.request_id){
       const ownerError=new OwnerError(code as OwnerErrorCode);if(ownerError.status===response.statusCode)throw ownerError;
     }if(code==='INVALID_REQUEST'||code==='UNAUTHENTICATED'||code==='FORBIDDEN')throw new TransportError(code);throw new TransportError('DEPENDENCY_UNAVAILABLE');}
    completed=true;resolve(data);
   }).catch(reject);
  });
  outgoing.once('error',()=>reject(new TransportError('DEPENDENCY_UNAVAILABLE')));
  outgoing.once('socket',socket=>{
   const verify=async()=>{
    const remote=material.localHttp?localHttpPeer(material,options.expectedService):peer(socket as TLSSocket,options.expectedService);
    await bounded(Promise.all([authorize(self,options.tenant,clock.signal),authorize(remote,options.tenant,clock.signal)]),clock.signal);
    if(clock.signal.aborted)throw new TransportError('DEPENDENCY_UNAVAILABLE');outgoing!.end(encoded);
   };
   if(material.localHttp||outgoing!.reusedSocket)void verify().catch(reject);else socket.once('secureConnect',()=>{void verify().catch(reject);});
  });
 }),clock.signal);}finally{options.signal?.removeEventListener('abort',clock.abort);clock.abort();clock.clear();if(!completed)outgoing?.destroy();}
}

// Internal helpers shared with the narrowly scoped registry bootstrap. Not package exports.
export {leaf,peer,body,bounded,deadline};
