import {randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {OwnerError,OwnerDomainError,strictJson,validateOwnerValue,type OwnerCommandRequest} from '@agentic-crm/workload-transport';
import type {NativeAuthService} from '../modules/identity/auth/native-service.js';
import type {HumanDispatchEnrollment} from '../modules/identity/dispatch-enrollment.js';
import {AuthError,hash} from '../modules/identity/auth/security.js';
import {CommandError} from '../kernel/reliability/commands.js';

/** Public lifecycle facade with native session, Origin/CSRF, If-Match and idempotency. */
export function createChatTransitionBff(auth:NativeAuthService,identity:HumanDispatchEnrollment,owner:(request:OwnerCommandRequest)=>Promise<unknown>){
 return createServer({requestTimeout:15000,headersTimeout:10000,maxHeaderSize:16384},async(req,res)=>{
  const correlation=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
  try{
   const match=/^\/api\/v1\/conversations\/([0-9a-f-]{36})\/transition$/.exec(req.url??'');
   if(!match||req.method!=='POST')throw new CommandError(404,'NOT_FOUND');
   const mutation=true,operation='conversation-post-conversations-id-transition';
   const cookies=(req.headers.cookie??'').split(';').map(x=>x.trim()).filter(x=>x.startsWith('crm_session=')),session=cookies.length===1?cookies[0]!.slice(12):undefined;
   if(mutation)await auth.requireMutation(session,req.headers.origin,req.headers['x-csrf-token']);else await auth.session(session,true);
   const tenant=req.headers['x-tenant-id'],key=req.headers['idempotency-key'],version=req.headers['if-match'];
   if(typeof tenant!=='string'||mutation&&(typeof key!=='string'||!/^[\x21-\x7e]{1,128}$/.test(key)||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))||version!==undefined&&(typeof version!=='string'||!/^"[1-9][0-9]{0,19}"$/.test(version)))throw new CommandError(400,'INVALID_REQUEST');
   let body:unknown;
   if(mutation){let size=0;const chunks:Buffer[]=[];for await(const chunk of req){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>65536)throw new CommandError(413,'PAYLOAD_TOO_LARGE');chunks.push(bytes);}try{body=strictJson(Buffer.concat(chunks));}catch{throw new CommandError(400,'INVALID_REQUEST');}}
   else if(req.headers['transfer-encoding']!==undefined||req.headers['content-length']!==undefined&&req.headers['content-length']!=='0')throw new CommandError(400,'INVALID_REQUEST');
   const placeholder=randomUUID(),request=validateOwnerValue<OwnerCommandRequest>('Request_chat-'+operation,{schema_version:1,request_id:randomUUID(),correlation_id:correlation,tenant_id:tenant,operation,command_id:randomUUID(),actor:{kind:'human',principal_id:placeholder,delegation_id:placeholder},payload:{id:match[1],...(mutation?{body,expected_version:typeof version==='string'?version.slice(1,-1):null,idempotency_key:key}:{})}});
   const enrolled=await identity.enroll(tenant,hash(session!));request.actor={kind:'human',principal_id:enrolled.principalId,delegation_id:enrolled.delegationId};
   const result=validateOwnerValue<{result:{data:{version:string}}}>('Reply_chat-'+operation,{schema_version:1,request_id:request.request_id,tenant_id:tenant,result:await owner(request)}).result;
   res.setHeader('ETag','"'+result.data.version+'"');res.end(JSON.stringify(result));
  }catch(error){const failure=error instanceof AuthError||error instanceof CommandError||error instanceof OwnerError||error instanceof OwnerDomainError?error:new CommandError(503,'TEMPORARILY_UNAVAILABLE');res.statusCode=failure.status;res.end(JSON.stringify({error:{code:failure.code,message:'Không thể hoàn tất yêu cầu hồ sơ.',fields:[],retryable:failure.status===503},meta:{correlation_id:correlation}}));}
 });
}
