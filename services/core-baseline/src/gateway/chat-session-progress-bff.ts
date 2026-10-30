import {randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {OwnerError,OwnerDomainError,strictJson,validateOwnerValue,type OwnerCommandRequest} from '@agentic-crm/workload-transport';
import type {NativeAuthService} from '../modules/identity/auth/native-service.js';
import type {HumanDispatchEnrollment} from '../modules/identity/dispatch-enrollment.js';
import {AuthError,hash} from '../modules/identity/auth/security.js';
import {CommandError} from '../kernel/reliability/commands.js';

function processInput(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['stages','milestones','automations'].includes(k)))throw new CommandError(400,'INVALID_REQUEST');
 const definition=value as Record<string,unknown>;
 for(const [kind,max] of [['stages',20],['milestones',12]] as const){const rows=definition[kind];if(!Array.isArray(rows)||!rows.length||rows.length>max)throw new CommandError(422,'INVALID_PROCESS');const keys=new Set();
  for(const row of rows){if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(k=>!(kind==='stages'?['key','label','description','color','requirements','type']:['key','label']).includes(k)))throw new CommandError(400,'INVALID_REQUEST');if(typeof row.key!=='string'||!/^[a-z][a-z0-9_]{0,63}$/.test(row.key)||['won','lost','revenue','consent'].includes(row.key)||keys.has(row.key)||typeof row.label!=='string'||!row.label.trim()||row.label.length>120)throw new CommandError(422,'INVALID_PROCESS');keys.add(row.key);}
 }
}

/** Candidate listener preserves native session/CSRF, process and progress CAS wires. */
export function createChatSessionProgressBff(auth:NativeAuthService,identity:HumanDispatchEnrollment,send:(request:OwnerCommandRequest)=>Promise<unknown>){
 return createServer({requestTimeout:15000,headersTimeout:10000,maxHeaderSize:16384},async(req,res)=>{
  const correlation=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
  try{
   const url=new URL(req.url??'','http://candidate.invalid'),process=url.pathname==='/api/v1/session-process',funnel=url.pathname==='/api/v1/session-funnel',match=/^\/api\/v1\/conversations\/([0-9a-f-]{36})\/sessions\/([0-9a-f-]{36})\/(progress|classification|contributions)$/.exec(url.pathname),need=/^\/api\/v1\/(?:conversations|threads)\/([0-9a-f-]{36})\/sessions\/([0-9a-f-]{36})\/needs\/([0-9a-f-]{36})\/(assessment|outcome|enrich)$/.exec(url.pathname),classification=match?.[3]==='classification',contributions=match?.[3]==='contributions';
   if(!['GET','POST'].includes(req.method??'')||!process&&!funnel&&!match&&!need||(contributions||funnel)&&req.method!=='GET'||need&&need[4]!=='assessment'&&req.method!=='POST')throw new CommandError(404,'NOT_FOUND');const mutation=req.method==='POST',operation=need?(need[4]==='outcome'?'need-post-outcome':need[4]==='enrich'?'need-post-enrich':mutation?'need-post-assessment':'need-get-assessment'):funnel?'session-progress-get-session-funnel':(classification||contributions?'conversation-classification-':'session-progress-')+(mutation?'post-':'get-')+(process?'session-process':'conversations-conversation-sessions-session-'+(classification?'classification':contributions?'contributions':'progress'));
   const cookies=(req.headers.cookie??'').split(';').map(x=>x.trim()).filter(x=>x.startsWith('crm_session=')),session=cookies.length===1?cookies[0]!.slice(12):undefined;
   if(mutation)await auth.requireMutation(session,req.headers.origin,req.headers['x-csrf-token']);else await auth.session(session,true);
   const tenant=req.headers['x-tenant-id'],version=req.headers['if-match'],key=req.headers['idempotency-key'];
   if(typeof tenant!=='string'||mutation&&(typeof key!=='string'||!/^[\x21-\x7e]{1,128}$/.test(key)||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))||version!==undefined&&(typeof version!=='string'||!/^"(0|[1-9][0-9]{0,19})"$/.test(version)))throw new CommandError(400,'INVALID_REQUEST');
   const payload:Record<string,unknown>=process||funnel?{}:need?{conversation:need[1],session:need[2],need:need[3]}:{conversation:match![1],session:match![2]};
   if(mutation){
    if(url.search)throw new CommandError(400,'INVALID_REQUEST');let size=0;const chunks:Buffer[]=[];for await(const chunk of req){const data=Buffer.from(chunk);size+=data.length;if(size>65536)throw new CommandError(413,'PAYLOAD_TOO_LARGE');chunks.push(data);}let body:unknown;try{body=strictJson(Buffer.concat(chunks));}catch{throw new CommandError(400,'INVALID_REQUEST');}
    if(process)processInput(body);Object.assign(payload,{body,expected_version:typeof version==='string'?version.slice(1,-1):null,idempotency_key:key});
   }else{
    if(req.headers['transfer-encoding']!==undefined||req.headers['content-length']!==undefined&&req.headers['content-length']!=='0')throw new CommandError(400,'INVALID_REQUEST');
    for(const [name,value] of url.searchParams){if(need||classification||!(funnel?['from','to','as_of','process_version']:[process?'version':'before_revision']).includes(name)||Object.hasOwn(payload,name))throw new CommandError(400,'INVALID_REQUEST');payload[name]=value;}
   }
   const placeholder=randomUUID(),request=validateOwnerValue<OwnerCommandRequest>('Request_chat-'+operation,{schema_version:1,request_id:randomUUID(),correlation_id:correlation,tenant_id:tenant,operation,command_id:randomUUID(),actor:{kind:'human',principal_id:placeholder,delegation_id:placeholder},payload}),enrolled=await identity.enroll(tenant,hash(session!));request.actor={kind:'human',principal_id:enrolled.principalId,delegation_id:enrolled.delegationId};
   const result=validateOwnerValue<{result:{data:{version?:string}}}>('Reply_chat-'+operation,{schema_version:1,request_id:request.request_id,tenant_id:tenant,result:await send(request)}).result;if(typeof result.data.version==='string')res.setHeader('ETag','"'+result.data.version+'"');res.end(JSON.stringify(result));
  }catch(error){const failure=error instanceof AuthError||error instanceof CommandError||error instanceof OwnerError||error instanceof OwnerDomainError?error:new CommandError(503,'TEMPORARILY_UNAVAILABLE');res.statusCode=failure.status;res.end(JSON.stringify({error:{code:failure.code,message:'Không thể hoàn tất yêu cầu tiến trình phiên.',fields:[],retryable:failure.status===503},meta:{correlation_id:correlation}}));}
 });
}
