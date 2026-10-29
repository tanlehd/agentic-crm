import {createHash,randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import type {OwnerAdmission} from '@agentic-crm/contracts';
import {ownerCanonical,ownerFail,OwnerError,ownerRoute,strictJson,OWNER_BODY_LIMIT,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {CommandError} from '../../kernel/reliability/commands.js';
import {AuthError,hash} from '../identity/auth/security.js';
import {AccessError} from '../identity/authorization.js';
import type {NativeAuthService} from '../identity/auth/native-service.js';
import type {HumanDispatchEnrollment} from '../identity/dispatch-enrollment.js';
import type {NativeOwnerHumanAuthority} from '../identity/owner-authority.js';
import {NativeRoutingConfiguration,type RoutingConfiguration} from './owner-config.js';
import {humanRoutingInput} from './human-routing-input.js';

type Kind='skills'|'profiles'|'team-skills'|'queues';
type IdentityClient=<T>(tenant:string,operation:string,payload:Record<string,unknown>)=>Promise<T>;
export function routingConfigurationRecovery(config:NativeRoutingConfiguration):Record<string,WorkloadRoute>{
 return Object.fromEntries(['command-proof','command-abort'].map(operation=>['/internal/v1/owners/routing/'+operation,ownerRoute('routing',operation,['identity'],request=>config.proof(request.tenant_id,request.payload as {command_id:string;binding_digest:string},operation==='command-abort'))]));
}
/** Baseline candidate composition. Each injected owner port uses only its own SQL. */
export class RoutingConfigurationBff{
 constructor(private readonly auth:NativeAuthService,private readonly enrollment:HumanDispatchEnrollment,private readonly authority:NativeOwnerHumanAuthority,
  private readonly config:NativeRoutingConfiguration,private readonly identity:IdentityClient,private readonly connection:(tenant:string,id:string)=>Promise<void>){}
 async mutate(input:{session:string|undefined;origin:unknown;csrf:unknown;tenant:string;kind:Kind;key:unknown;version:string|undefined;body:Record<string,unknown>;correlation:string}){
  await this.auth.requireMutation(input.session,input.origin,input.csrf);
  if(!/^[a-f0-9-]{36}$/.test(input.tenant)||typeof input.key!=='string'||! /^[\x21-\x7e]{1,128}$/.test(input.key))ownerFail('INVALID_REQUEST');
  if(input.kind!=='skills'&&input.version===undefined)throw new CommandError(428,'PRECONDITION_REQUIRED');
  const principal=await this.authority.configurationAccess(input.tenant,hash(input.session!));
  const digest=createHash('sha256').update(ownerCanonical({tenant:input.tenant,principal,route:'/api/v1/human-routing/'+input.kind,key:input.key})).digest('hex');
  const command=`${digest.slice(0,8)}-${digest.slice(8,12)}-5${digest.slice(13,16)}-a${digest.slice(17,20)}-${digest.slice(20,32)}`;
  const b=humanRoutingInput(input.kind,input.body),keys={skills:['key','name'],profiles:['principal_id','capacity','enabled'],'team-skills':['team_id','skill_ids'],queues:['id','name','team_id','connection_id','skill_ids','priority','enabled']}[input.kind];
  if(Object.keys(b).some(k=>!keys.includes(k)))ownerFail('INVALID_REQUEST');
  const kind={skills:'skill',profiles:'profile','team-skills':'team-skills',queues:'queue'}[input.kind];
  const id=input.kind==='profiles'?b.principal_id:input.kind==='team-skills'?b.team_id:input.kind==='queues'?b.id??command:command;
  const raw:Record<string,unknown>={...b,kind,id,expected_version:input.version??'0'};
  if(input.kind==='profiles')delete raw.principal_id;
  if(input.kind==='team-skills')delete raw.team_id;
  // Validate connection references at their owner before any Routing gate is closed.
  if(input.kind==='queues'&&b.connection_id!==null){if(typeof b.connection_id!=='string')ownerFail('INVALID_REQUEST');await this.connection(input.tenant,b.connection_id);}
  const actor=await this.enrollment.enroll(input.tenant,hash(input.session!));
  const prepared=await this.config.begin(input.tenant,command,principal,raw as RoutingConfiguration,{kind:'human',principal_id:actor.principalId,delegation_id:actor.delegationId});
  const ref={command_id:command,binding_digest:prepared.binding_digest};
  if(prepared.state==='prepared'){
   try{
    const admission=await this.identity<OwnerAdmission>(input.tenant,'admit',{owner:'routing',command:ref});
    await this.config.admit(input.tenant,ref,admission);
   }catch(error){
    const proof=await this.config.proof(input.tenant,ref);
    if(proof.state!=='committed'){
     if(error instanceof OwnerError&&['FORBIDDEN','REVOKED','REFERENCE_INVALID'].includes(error.code))await this.config.proof(input.tenant,ref,true);
     throw error;
    }
   }
  }
  const result=await this.config.complete(input.tenant,command),admission=await this.config.admissionId(input.tenant,ref);
  if(admission)await this.identity(input.tenant,'settle',{owner:'routing',command:ref,admission_id:admission});
  if(result.error)throw new OwnerError(result.error as ConstructorParameters<typeof OwnerError>[0]);
  return {data:{id,version:result.version!},meta:{correlation_id:input.correlation}};
 }
}
export function createRoutingConfigurationBff(adapter:RoutingConfigurationBff){
 return createServer({requestTimeout:15000,headersTimeout:10000,maxHeaderSize:16384},async(req,res)=>{
  const correlation=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
  try{
   const path=/^\/api\/v1\/human-routing\/(skills|profiles|team-skills|queues)$/.exec(req.url??'');
   if(req.method!=='POST'||!path)throw new CommandError(404,'NOT_FOUND');
   const tenant=req.headers['x-tenant-id'],version=req.headers['if-match'];
   if(typeof tenant!=='string'||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')||version!==undefined&&(typeof version!=='string'||!/^"(0|[1-9][0-9]{0,19})"$/.test(version)))ownerFail('INVALID_REQUEST');
   const cookies=(req.headers.cookie??'').split(';').map(x=>x.trim()).filter(x=>x.startsWith('crm_session='));
   let size=0;const parts:Buffer[]=[];
   for await(const chunk of req){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>OWNER_BODY_LIMIT)throw new CommandError(413,'PAYLOAD_TOO_LARGE');parts.push(bytes);}
   let body:Record<string,unknown>;try{body=strictJson(Buffer.concat(parts));}catch{ownerFail('INVALID_REQUEST');}
   const result=await adapter.mutate({session:cookies.length===1?cookies[0]!.slice(12):undefined,origin:req.headers.origin,csrf:req.headers['x-csrf-token'],tenant,kind:path[1] as Kind,key:req.headers['idempotency-key'],version:typeof version==='string'?version.slice(1,-1):undefined,body,correlation});
   res.setHeader('ETag',`"${result.data.version}"`);res.end(JSON.stringify(result));
  }catch(error){
   const failure=error instanceof AuthError||error instanceof OwnerError||error instanceof CommandError?error:error instanceof AccessError?new CommandError(403,'FORBIDDEN'):new CommandError(503,'TEMPORARILY_UNAVAILABLE');
   res.statusCode=failure.status;res.end(JSON.stringify({error:{code:failure.code,message:'Không thể hoàn tất cấu hình phân bổ.',fields:[],retryable:failure.status===503},meta:{correlation_id:correlation}}));
  }
 });
}
