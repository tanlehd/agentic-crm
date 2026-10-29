import {randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {OwnerError,OwnerDomainError,ownerFail} from '@agentic-crm/workload-transport';
import {AuthError,hash} from '../identity/auth/security.js';
import {AccessError} from '../identity/authorization.js';
import type {NativeAuthService} from '../identity/auth/native-service.js';
import type {HumanDispatchEnrollment} from '../identity/dispatch-enrollment.js';
import type {NativeOwnerHumanAuthority} from '../identity/owner-authority.js';
import type {NativeRoutingView} from './owner-view.js';

export class RoutingViewBff{
 constructor(private readonly auth:NativeAuthService,private readonly enrollment:HumanDispatchEnrollment,private readonly authority:NativeOwnerHumanAuthority,private readonly view:NativeRoutingView){}
 async read(session:string|undefined,tenant:string,mine:boolean,correlation:string){
  await this.auth.session(session,true);if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenant))ownerFail('INVALID_REQUEST');
  const principal=await this.authority.routingViewAccess(tenant,hash(session!),mine),actor=await this.enrollment.enroll(tenant,hash(session!));if(actor.principalId!==principal)ownerFail('REVOKED');
  return {...await this.view.read(tenant,{kind:'human',principal_id:principal,delegation_id:actor.delegationId},mine),meta:{correlation_id:correlation}};
 }
}
export function createRoutingViewBff(adapter:RoutingViewBff){return createServer({requestTimeout:15000,headersTimeout:10000,maxHeaderSize:16384},async(req,res)=>{
 const correlation=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
 try{
  const url=new URL(req.url??'','http://localhost');if(req.method!=='GET'||!['/api/v1/human-routing','/api/v1/human-routing/mine'].includes(url.pathname))throw new OwnerError('NOT_FOUND');
  const tenant=req.headers['x-tenant-id'];if(typeof tenant!=='string'||url.search||req.headers['transfer-encoding']!==undefined||req.headers['content-length']!==undefined&&req.headers['content-length']!=='0')ownerFail('INVALID_REQUEST');
  const cookies=(req.headers.cookie??'').split(';').map(x=>x.trim()).filter(x=>x.startsWith('crm_session='));res.end(JSON.stringify(await adapter.read(cookies.length===1?cookies[0]!.slice(12):undefined,tenant,url.pathname.endsWith('/mine'),correlation)));
 }catch(error){
  if(error instanceof OwnerDomainError){res.statusCode=error.status;res.end(JSON.stringify({...error.response(),meta:{correlation_id:correlation}}));return;}
  const failure=error instanceof AuthError||error instanceof OwnerError?error:new OwnerError(error instanceof AccessError?'FORBIDDEN':'DEPENDENCY_UNAVAILABLE');res.statusCode=failure.status;res.end(JSON.stringify({error:{code:failure.code,message:'Không thể đọc phân bổ hội thoại.',fields:[],retryable:failure.status===503},meta:{correlation_id:correlation}}));
 }
});}
