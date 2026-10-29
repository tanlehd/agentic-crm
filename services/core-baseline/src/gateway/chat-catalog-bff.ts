import {randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {OwnerError,OwnerDomainError,strictJson,validateOwnerValue,type OwnerCommandRequest} from '@agentic-crm/workload-transport';
import type {NativeAuthService} from '../modules/identity/auth/native-service.js';
import type {HumanDispatchEnrollment} from '../modules/identity/dispatch-enrollment.js';
import {AuthError,hash} from '../modules/identity/auth/security.js';
import {CommandError} from '../kernel/reliability/commands.js';

/** Candidate public tag/snippet catalog; main mount follows complete Chat routing gates. */
export function createChatCatalogBff(auth:NativeAuthService,identity:HumanDispatchEnrollment,owner:(request:OwnerCommandRequest)=>Promise<unknown>){
 return createServer({requestTimeout:15000,headersTimeout:10000,maxHeaderSize:16384},async(req,res)=>{
  const correlation=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
  try{
   const url=new URL(req.url??'/','http://localhost'),match=/^\/api\/v1\/chat-workspace\/(tags|snippets|inboxes|inbox-options|capabilities|conversations|sidebar)(?:\/([0-9a-f-]{36}))?(\/shares)?$/.exec(url.pathname);if(!match)throw new CommandError(404,'NOT_FOUND');
   const kind=match[1]!,id=match[2],shares=!!match[3],options=['inbox-options','capabilities','conversations','sidebar'].includes(kind);
   if(shares&&(kind!=='inboxes'||!id)||options&&id)throw new CommandError(404,'NOT_FOUND');
   const action=options?(req.method==='GET'?'options':null):shares?(req.method==='PUT'?'shares':null):req.method==='GET'?id?'get':'list':req.method==='POST'&&!id?'create':req.method==='PATCH'&&id?'patch':req.method==='DELETE'&&id?'delete':null;
   if(!action)throw new CommandError(404,'NOT_FOUND');const mutation=!['get','list','options'].includes(action);
   const cookies=(req.headers.cookie??'').split(';').map(x=>x.trim()).filter(x=>x.startsWith('crm_session=')),session=cookies.length===1?cookies[0]!.slice(12):undefined;
   if(mutation)await auth.requireMutation(session,req.headers.origin,req.headers['x-csrf-token']);else await auth.session(session,true);
   const tenant=req.headers['x-tenant-id'],key=req.headers['idempotency-key'],version=req.headers['if-match'];
   if(typeof tenant!=='string'||mutation&&(typeof key!=='string'||!/^[\x21-\x7e]{1,128}$/.test(key)||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))||version!==undefined&&(typeof version!=='string'||!/^"[1-9][0-9]{0,19}"$/.test(version)))throw new CommandError(400,'INVALID_REQUEST');
   const payload:Record<string,unknown>={...(id?{id}:{})};
   if(kind==='conversations')for(const [key,value] of url.searchParams){if(!['limit','cursor','scope','team_id','status','snooze','unread','channel','channel_id','page_id','q','sort','inbox_id','tag_ids'].includes(key)||url.searchParams.getAll(key).length!==1)throw new CommandError(400,'INVALID_REQUEST');payload[key]=key==='limit'?Number(value):value;}
   else if(action==='list')for(const [key,value] of url.searchParams){if(!['limit','cursor',kind==='inboxes'?'group':'q'].includes(key)||url.searchParams.getAll(key).length!==1)throw new CommandError(400,'INVALID_REQUEST');payload[key]=key==='limit'?Number(value):value;}
   else if(url.search)throw new CommandError(400,'INVALID_REQUEST');
   if(mutation){
    const chunks:Buffer[]=[];let size=0;for await(const chunk of req){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>16384)throw new CommandError(413,'PAYLOAD_TOO_LARGE');chunks.push(bytes);}
    try{payload.body=strictJson(Buffer.concat(chunks));}catch{throw new CommandError(400,'INVALID_REQUEST');}
    payload.expected_version=typeof version==='string'?version.slice(1,-1):null;payload.idempotency_key=key;
   }
   const operation=options?kind==='inbox-options'?'catalog-inbox-options':'workspace-'+kind:shares?'catalog-inbox-shares':'catalog-'+action+'-'+(action==='list'?kind:kind==='tags'?'tag':kind==='inboxes'?'inbox':'snippet'),placeholder=randomUUID();
   const request=validateOwnerValue<OwnerCommandRequest>('Request_chat-'+operation,{schema_version:1,request_id:randomUUID(),correlation_id:correlation,tenant_id:tenant,operation,command_id:randomUUID(),actor:{kind:'human',principal_id:placeholder,delegation_id:placeholder},payload});
   const actor=await identity.enroll(tenant,hash(session!));request.actor={kind:'human',principal_id:actor.principalId,delegation_id:actor.delegationId};
   const result=validateOwnerValue<{result:unknown}>('Reply_chat-'+operation,{schema_version:1,request_id:request.request_id,tenant_id:tenant,result:await owner(request)}).result;
   const data=(result as {data?:{version?:unknown}}).data;if(mutation&&typeof data?.version==='string')res.setHeader('ETag','"'+data.version+'"');res.statusCode=action==='create'?201:200;res.end(JSON.stringify(result));
  }catch(error){
   const failure=error instanceof AuthError||error instanceof CommandError||error instanceof OwnerError||error instanceof OwnerDomainError?error:new CommandError(503,'TEMPORARILY_UNAVAILABLE');
   res.statusCode=failure.status;res.end(JSON.stringify({error:{code:failure.code,message:'Không thể hoàn tất yêu cầu hộp thư.',fields:[],retryable:failure.status===503},meta:{correlation_id:correlation}}));
  }
 });
}
