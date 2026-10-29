import {randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {OwnerError,OwnerDomainError,strictJson,validateOwnerValue,type OwnerCommandRequest} from '@agentic-crm/workload-transport';
import type {NativeAuthService} from '../modules/identity/auth/native-service.js';
import type {HumanDispatchEnrollment} from '../modules/identity/dispatch-enrollment.js';
import {AuthError,hash} from '../modules/identity/auth/security.js';
import {CommandError} from '../kernel/reliability/commands.js';

type Input={session:string|undefined;origin:unknown;csrf:unknown;tenant:string;id:string;contactBound:boolean;body:unknown;key:unknown;version:string|null;correlation:string};
export class ChatOutboundBff{
 constructor(private readonly auth:NativeAuthService,private readonly identity:HumanDispatchEnrollment,private readonly send:(request:OwnerCommandRequest)=>Promise<unknown>){}
 async mutate(input:Input){
  await this.auth.requireMutation(input.session,input.origin,input.csrf);
  if(typeof input.key!=='string'||!/^[\x21-\x7e]{1,128}$/.test(input.key))throw new CommandError(400,'INVALID_REQUEST');
  const operation=input.contactBound?'contact-bound-send':'conversation-post-conversations-id-messages',placeholder=randomUUID();
  const request=validateOwnerValue<OwnerCommandRequest>('Request_chat-'+operation,{schema_version:1,request_id:randomUUID(),correlation_id:input.correlation,tenant_id:input.tenant,operation,command_id:randomUUID(),actor:{kind:'human',principal_id:placeholder,delegation_id:placeholder},payload:{id:input.id,body:input.body,expected_version:input.version,idempotency_key:input.key}});
  const enrollment=await this.identity.enroll(input.tenant,hash(input.session!));
  request.actor={kind:'human',principal_id:enrollment.principalId,delegation_id:enrollment.delegationId};
  return validateOwnerValue<{result:unknown}>('Reply_chat-'+operation,{schema_version:1,request_id:request.request_id,tenant_id:input.tenant,result:await this.send(request)}).result;
 }
}
/** Candidate public adapter. Main routing is gated on the full Chat cutover. */
export function createChatOutboundBff(adapter:ChatOutboundBff){
 return createServer({requestTimeout:15000,headersTimeout:10000,maxHeaderSize:16384},async(req,res)=>{
  const correlation=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
  try{
   const match=/^\/api\/v1\/conversations\/([0-9a-f-]{36})\/messages(-v2)?$/.exec(req.url??'');
   if(req.method!=='POST'||!match)throw new CommandError(404,'NOT_FOUND');
   const tenant=req.headers['x-tenant-id'],version=req.headers['if-match'];
   if(typeof tenant!=='string'||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')||version!==undefined&&(typeof version!=='string'||!/^"[1-9][0-9]{0,19}"$/.test(version)))throw new CommandError(400,'INVALID_REQUEST');
   const parts:Buffer[]=[];let size=0;
   for await(const chunk of req){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>16384)throw new CommandError(413,'PAYLOAD_TOO_LARGE');parts.push(bytes);}
   let body:unknown;try{body=strictJson(Buffer.concat(parts));}catch{throw new CommandError(400,'INVALID_REQUEST');}
   const cookies=(req.headers.cookie??'').split(';').map(x=>x.trim()).filter(x=>x.startsWith('crm_session='));
   const result=await adapter.mutate({session:cookies.length===1?cookies[0]!.slice(12):undefined,origin:req.headers.origin,csrf:req.headers['x-csrf-token'],tenant,id:match[1]!,contactBound:!!match[2],body,key:req.headers['idempotency-key'],version:typeof version==='string'?version.slice(1,-1):null,correlation});
   res.statusCode=202;res.end(JSON.stringify(result));
  }catch(error){
   const failure=error instanceof AuthError||error instanceof CommandError||error instanceof OwnerError||error instanceof OwnerDomainError?error:new CommandError(503,'TEMPORARILY_UNAVAILABLE');
   res.statusCode=failure.status;res.end(JSON.stringify({error:{code:failure.code,message:'Không thể gửi tin nhắn.',fields:[],retryable:failure.status===503},meta:{correlation_id:correlation}}));
  }
 });
}
