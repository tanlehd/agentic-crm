import {randomUUID,createHash} from 'node:crypto';
import {Ajv} from 'ajv';
import {default as formats} from 'ajv-formats';
import {chatDispatchV1Schema,type DispatchRequest,type DispatchReply,type DispatchBinding} from '@agentic-crm/contracts';
import type {DataSource} from 'typeorm';
import {UnitOfWork,type TransactionScope} from '../../kernel/tenancy/unit-of-work.js';
import {canonical,CommandError} from '../../kernel/reliability/commands.js';
import {PLATFORM_TENANT_ID} from '../../kernel/database/system-scope.js';
import {NativeDispatchAuthority,type DispatchFieldPolicies,type DispatchAuthorizationStamp} from './dispatch-authority.js';
type Issue=Extract<DispatchRequest,{operation:'identity-issue'}>;
type Consume=Extract<DispatchRequest,{operation:'identity-consume'}>;
type Read=Extract<DispatchRequest,{operation:'receipt-read'}>;
export interface StableChatClaim {state:'claimed';binding:DispatchBinding;grant_id:string;claim_id:string;resource_context:Issue['resource_context']}
export type InspectChatClaim=(request:Consume,signal:AbortSignal)=>Promise<StableChatClaim>;
const fail=(code:string,status=409):never=>{throw new CommandError(status,code);};
const json=(value:any)=>typeof value==='string'?JSON.parse(value):value;
const hash=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');
function validator(name:string){const a=new Ajv({strict:true});(formats as unknown as (a:Ajv)=>void)(a);return a.compile({...chatDispatchV1Schema,$ref:'#/definitions/'+name});}
const validators={issue:validator('IdentityIssue'),consume:validator('IdentityConsume'),read:validator('ReceiptRead')};
function parse<T extends DispatchRequest>(tenant:string,input:unknown,kind:keyof typeof validators):T {
 if(!validators[kind](input)||Buffer.byteLength(JSON.stringify(input))>16384)fail('INVALID_REQUEST',400);
 const r=structuredClone(input) as T;
 if(tenant===PLATFORM_TENANT_ID||r.binding.tenant_id!==tenant)fail('FORBIDDEN',403);
 if(r.binding.actor_kind!=='human')fail('FORBIDDEN',403);
 return r;
}
const stamp=(row:any):DispatchAuthorizationStamp=>({principalRevision:String(row.principal_revision),securityRevision:String(row.security_revision)});

/** Baseline Identity local storage. Peer arguments must come from trusted transport context. */
export class IdentityDispatchLedger {
 private readonly authority:NativeDispatchAuthority;
 constructor(private readonly source:DataSource,policies:DispatchFieldPolicies,private readonly inspectClaim:InspectChatClaim){this.authority=new NativeDispatchAuthority(new UnitOfWork(source),policies);}
 private async claim(request:Consume):Promise<StableChatClaim>{
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([this.inspectClaim(structuredClone(request),controller.signal),new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new CommandError(503,'DEPENDENCY_UNAVAILABLE'));},2000);})]);}
  finally{if(timer)clearTimeout(timer);}
 }
 private async delegation(tenant:string,id:string){const [d]=await this.source.query('SELECT * FROM identity_dispatch_delegation WHERE tenant_id=? AND id=?',[tenant,id]);if(!d)fail('NOT_FOUND',404);return d;}
 private async lockedDelegation(s:TransactionScope,r:Issue,d:any){
  // No-op update grants an exclusive record lock without changing immutable data.
  await s.query('UPDATE identity_dispatch_delegation SET id=id WHERE tenant_id=? AND id=?',[s.context.tenantId,r.binding.delegation_id]);
  const [row]=await s.query('SELECT * FROM identity_dispatch_delegation WHERE tenant_id=? AND id=? FOR UPDATE',[s.context.tenantId,r.binding.delegation_id]);
  if(!row||row.principal_id!==r.binding.principal_id||row.session_hash!==d.session_hash||canonical(stamp(row))!==canonical(stamp(d)))fail('CONFLICT');
 }
 private async event(s:TransactionScope,g:any){await s.query('INSERT INTO identity_dispatch_event(tenant_id,grant_id,version,state,claim_id,fence_id,created_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6))',[s.context.tenantId,g.id,g.version,g.state,g.claim_id,g.fence_id]);}
 private async request(s:TransactionScope,caller:string,operation:string,r:DispatchRequest,g:any){
  try{await s.query('INSERT INTO identity_dispatch_request(tenant_id,caller,operation,request_id,grant_id,request_digest,created_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6))',[s.context.tenantId,caller,operation,r.request_id,g.id,hash(r)]);}catch(e){if((e as {code?:string}).code!=='ER_DUP_ENTRY')throw e;}
  const [old]=await s.query('SELECT grant_id,request_digest FROM identity_dispatch_request WHERE tenant_id=? AND caller=? AND operation=? AND request_id=?',[s.context.tenantId,caller,operation,r.request_id]);
  if(old?.grant_id!==g.id||old?.request_digest!==hash(r))fail('CONFLICT');
 }
 private match(g:any,r:DispatchRequest){if(canonical(json(g.binding_json))!==canonical(r.binding))fail('CONFLICT');}
 private async reply(s:TransactionScope,r:{request_id:string},g:any):Promise<DispatchReply>{
  const basic={schema_version:1 as const,request_id:r.request_id,receipt_id:String(g.id)};
  if(g.state==='consumed')return {...basic,state:'consumed',grant_id:g.id,claim_id:g.claim_id,resource_context:json(g.resource_json)};
  if(g.state==='revoked')return {...basic,state:'revoked'};
  const [time]=await s.query('SELECT expires_at<=UTC_TIMESTAMP(6) AS expired FROM identity_dispatch_grant WHERE tenant_id=? AND id=?',[s.context.tenantId,g.id]);
  if(Number(time.expired))return {...basic,state:'expired'};
  return {...basic,state:'issued',grant_id:g.id,expires_at:new Date(g.expires_at).toISOString(),resource_context:json(g.resource_json)};
 }
 async registerHuman(tenant:string,verifier:string,input:unknown):Promise<void>{
  const r=parse<Issue>(tenant,input,'issue');
  await this.authority.runHuman(tenant,verifier,r,async(s,current)=>{
   try{await s.query('INSERT INTO identity_dispatch_delegation(tenant_id,id,principal_id,session_hash,principal_revision,security_revision,created_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6))',[tenant,r.binding.delegation_id,r.binding.principal_id,verifier,current.principalRevision,current.securityRevision]);}catch(e){if((e as {code?:string}).code!=='ER_DUP_ENTRY')throw e;}
   await this.lockedDelegation(s,r,{session_hash:verifier,principal_revision:current.principalRevision,security_revision:current.securityRevision});
  });
 }
 async issue(peer:string,tenant:string,input:unknown):Promise<DispatchReply>{
  const r=parse<Issue>(tenant,input,'issue');if(peer!=='chat')fail('FORBIDDEN',403);
  const d=await this.delegation(tenant,r.binding.delegation_id);
  return this.authority.runHuman(tenant,d.session_hash,r,async(s,current)=>{
   await this.lockedDelegation(s,r,d);
   let [g]=await s.query('SELECT * FROM identity_dispatch_grant WHERE tenant_id=? AND intent_id=? FOR UPDATE',[tenant,r.binding.intent_id]);
   if(!g){const id=randomUUID();try{await s.query("INSERT INTO identity_dispatch_grant(tenant_id,id,intent_id,attempt_id,delegation_id,binding_json,resource_json,principal_revision,security_revision,state,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'issued',TIMESTAMPADD(SECOND,10,UTC_TIMESTAMP(6)),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[tenant,id,r.binding.intent_id,r.binding.attempt_id,r.binding.delegation_id,canonical(r.binding),canonical(r.resource_context),current.principalRevision,current.securityRevision]);}catch(e){if((e as {code?:string}).code==='ER_DUP_ENTRY')fail('CONFLICT');throw e;}
    [g]=await s.query('SELECT * FROM identity_dispatch_grant WHERE tenant_id=? AND id=?',[tenant,id]);await this.event(s,g);
   }
   this.match(g,r);if(canonical(json(g.resource_json))!==canonical(r.resource_context))fail('CONFLICT');
   await this.request(s,'chat','issue',r,g);return this.reply(s,r,g);
  },stamp(d));
 }
 private async inspect(tenant:string,r:Consume|Read){
  const id=r.operation==='identity-consume'?r.grant_id:r.receipt_id;
  const [g]=await this.source.query('SELECT * FROM identity_dispatch_grant WHERE tenant_id=? AND id=?',[tenant,id]);if(!g)fail('NOT_FOUND',404);this.match(g,r);
  const d=await this.delegation(tenant,r.binding.delegation_id);
  const issue:Issue={schema_version:1,operation:'identity-issue',request_id:r.request_id,binding:r.binding,resource_context:json(g.resource_json)};
  return {g,d,issue};
 }
 async consume(peer:string,tenant:string,input:unknown):Promise<DispatchReply>{
  const r=parse<Consume>(tenant,input,'consume');if(peer!=='connector')fail('FORBIDDEN',403);
  const {g:observed,d,issue}=await this.inspect(tenant,r);
  const proof=await this.claim(r);
  if(!proof||proof.state!=='claimed'||proof.grant_id!==r.grant_id||proof.claim_id!==r.claim_id||canonical(proof.binding)!==canonical(r.binding)||canonical(proof.resource_context)!==canonical(issue.resource_context))fail('FORBIDDEN',403);
  return this.authority.runHuman(tenant,d.session_hash,issue,async s=>{
   await this.lockedDelegation(s,issue,d);
   const [g]=await s.query('SELECT * FROM identity_dispatch_grant WHERE tenant_id=? AND id=? FOR UPDATE',[tenant,r.grant_id]);this.match(g,r);
   if(g.state==='revoked')fail('REVOKED',403);
   if(g.state==='consumed'){if(g.claim_id!==r.claim_id||g.fence_id!==r.fence_id)fail('CONFLICT');}
   else{
    const changed=await s.query("UPDATE identity_dispatch_grant SET state='consumed',claim_id=?,fence_id=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=? AND state='issued' AND version=? AND expires_at>UTC_TIMESTAMP(6)",[r.claim_id,r.fence_id,tenant,g.id,g.version]);
    if(changed.affectedRows!==1)fail('EXPIRED');g.state='consumed';g.claim_id=r.claim_id;g.fence_id=r.fence_id;g.version=String(BigInt(g.version)+1n);await this.event(s,g);
   }
   await this.request(s,'connector','consume',r,g);return this.reply(s,r,g);
  },stamp(observed));
 }
 // Internal operator of the native Human session only, not a new wire endpoint.
 async revokeHuman(tenant:string,verifier:string,input:unknown):Promise<DispatchReply>{
  const r=parse<Read>(tenant,input,'read'),{d,issue}=await this.inspect(tenant,r);if(d.session_hash!==verifier)fail('FORBIDDEN',403);
  return this.authority.runHuman(tenant,verifier,issue,async s=>{
   await this.lockedDelegation(s,issue,d);
   const [g]=await s.query('SELECT * FROM identity_dispatch_grant WHERE tenant_id=? AND id=? FOR UPDATE',[tenant,r.receipt_id]);this.match(g,r);
   if(g.state==='issued'){await s.query("UPDATE identity_dispatch_grant SET state='revoked',version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=? AND version=?",[tenant,g.id,g.version]);g.state='revoked';g.version=String(BigInt(g.version)+1n);await this.event(s,g);}
   await this.request(s,'identity','revoke',r,g);return this.reply(s,r,g);
  });
 }
 async read(peer:string,tenant:string,input:unknown):Promise<DispatchReply>{
  const r=parse<Read>(tenant,input,'read');if(!['chat','connector'].includes(peer))fail('FORBIDDEN',403);
  const {d,issue}=await this.inspect(tenant,r);
  return this.authority.runHuman(tenant,d.session_hash,issue,async s=>{await this.lockedDelegation(s,issue,d);const [g]=await s.query('SELECT * FROM identity_dispatch_grant WHERE tenant_id=? AND id=? FOR SHARE',[tenant,r.receipt_id]);this.match(g,r);return this.reply(s,r,g);});
 }
}
