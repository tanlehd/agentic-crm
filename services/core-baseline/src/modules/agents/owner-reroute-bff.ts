import {randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {ownerFail,OwnerError,strictJson,OWNER_BODY_LIMIT} from '@agentic-crm/workload-transport';
import {CommandError} from '../../kernel/reliability/commands.js';
import {AuthError,hash} from '../identity/auth/security.js';
import {AccessError} from '../identity/authorization.js';
import type {NativeAuthService} from '../identity/auth/native-service.js';
import type {HumanDispatchEnrollment} from '../identity/dispatch-enrollment.js';
import type {NativeOwnerHumanAuthority} from '../identity/owner-authority.js';
import type {NativeRoutingReroute} from './owner-reroute.js';
import {humanRoutingInput} from './human-routing-input.js';

export class RoutingRerouteBff{
 constructor(private readonly auth:NativeAuthService,private readonly enrollment:HumanDispatchEnrollment,private readonly authority:NativeOwnerHumanAuthority,private readonly reroute:NativeRoutingReroute){}
 async mutate(input:{session:string|undefined;origin:unknown;csrf:unknown;tenant:string;key:unknown;version:string|undefined;body:Record<string,unknown>;correlation:string}){
  await this.auth.requireMutation(input.session,input.origin,input.csrf);if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.tenant))ownerFail('INVALID_REQUEST');
  const principal=await this.authority.configurationAccess(input.tenant,hash(input.session!)),actor=await this.enrollment.enroll(input.tenant,hash(input.session!));if(actor.principalId!==principal)ownerFail('REVOKED');
  return this.reroute.mutate(input.tenant,{kind:'human',principal_id:principal,delegation_id:actor.delegationId},humanRoutingInput('reroute',input.body),input.version,input.key,input.correlation);
 }
}
export function createRoutingRerouteBff(adapter:RoutingRerouteBff){return createServer({requestTimeout:15000,headersTimeout:10000,maxHeaderSize:16384},async(req,res)=>{
 const correlation=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
 try{
  if(req.method!=='POST'||req.url!=='/api/v1/human-routing/reroute')throw new CommandError(404,'NOT_FOUND');
  const tenant=req.headers['x-tenant-id'],version=req.headers['if-match'];if(typeof tenant!=='string'||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')||version!==undefined&&(typeof version!=='string'||!/^"(0|[1-9][0-9]{0,19})"$/.test(version)))ownerFail('INVALID_REQUEST');
  const cookies=(req.headers.cookie??'').split(';').map(x=>x.trim()).filter(x=>x.startsWith('crm_session='));let size=0;const parts:Buffer[]=[];
  for await(const chunk of req){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>OWNER_BODY_LIMIT)throw new CommandError(413,'PAYLOAD_TOO_LARGE');parts.push(bytes);}
  let body:Record<string,unknown>;try{body=strictJson(Buffer.concat(parts));}catch{ownerFail('INVALID_REQUEST');}
  const result=await adapter.mutate({session:cookies.length===1?cookies[0]!.slice(12):undefined,origin:req.headers.origin,csrf:req.headers['x-csrf-token'],tenant,key:req.headers['idempotency-key'],version:typeof version==='string'?version.slice(1,-1):undefined,body,correlation});res.setHeader('ETag',`"${result.data.version}"`);res.end(JSON.stringify(result));
 }catch(error){
  const failure=error instanceof AuthError||error instanceof OwnerError||error instanceof CommandError?error:error instanceof AccessError?new CommandError(403,'FORBIDDEN'):new CommandError(503,'TEMPORARILY_UNAVAILABLE');
  const codes:Record<string,string>={STALE_VERSION:'VERSION_CONFLICT',CAPACITY:'HUMAN_CAPACITY_FULL',INVALID_TRANSITION:'SESSION_CLOSED'},code=codes[failure.code]??failure.code;
  res.statusCode=failure.status;res.end(JSON.stringify({error:{code,message:'Không thể phân bổ lại hội thoại.',fields:[],retryable:failure.status===503},meta:{correlation_id:correlation}}));
 }
});}
