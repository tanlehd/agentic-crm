// T05 own-schema adaptation of the retained D2 protocol; no baseline runtime imports.
// Current tenant admission is enforced by authenticated workload transport; local transactions check writer epoch.
import {randomUUID,createHash} from 'node:crypto';
import {Ajv} from 'ajv';
import {default as formats} from 'ajv-formats';
import {chatDispatchV1Schema,type DispatchRequest,type DispatchReply,type DispatchBinding,type ChatClaimProofRead,type ChatClaimProofReply} from '@agentic-crm/contracts';
import {ChatDispatchStore as UnitOfWork,type DispatchScope as TransactionScope} from './dispatch-storage.js';
import {canonical,CommandError,DispatchEffects as DurableCommands} from './dispatch-storage.js';
import {SYSTEM_TENANT as PLATFORM_TENANT_ID} from './database.js';
type Claim=Extract<DispatchRequest,{operation:'chat-claim'}>;
type Read=Extract<DispatchRequest,{operation:'receipt-read'}>;
type Resource=Extract<DispatchReply,{state:'issued'}>['resource_context'];
interface QuerySource {query(sql:string,args?:unknown[]):Promise<any>}
export interface ChatClaimPorts {
 inspectGrant:(request:Read,signal:AbortSignal)=>Promise<DispatchReply>;
 mockConnectionActive:(binding:DispatchBinding,signal:AbortSignal)=>Promise<boolean>;
}
export interface NativeChatClaimProof {state:'claimed';binding:DispatchBinding;grant_id:string;claim_id:string;resource_context:Resource}
function fail(code:string,status=409):never{throw new CommandError(status,code);}
const json=(v:any)=>typeof v==='string'?JSON.parse(v):v;
const digest=(v:unknown)=>createHash('sha256').update(canonical(v)).digest('hex');
function validator(name:string){const a=new Ajv({strict:true});(formats as unknown as (a:Ajv)=>void)(a);return a.compile({...chatDispatchV1Schema,$ref:'#/definitions/'+name});}
const claimValid=validator('ChatClaim'),readValid=validator('ReceiptRead'),replyValid=validator('DispatchReply'),proofReadValid=validator('ChatClaimProofRead');
function parse<T extends Claim|Read>(tenant:string,input:unknown,read=false):T{
 if(!(read?readValid:claimValid)(input)||Buffer.byteLength(JSON.stringify(input))>16384)fail('INVALID_REQUEST',400);
 const r=structuredClone(input) as T;if(tenant===PLATFORM_TENANT_ID||r.binding.tenant_id!==tenant||r.binding.actor_kind!=='human')fail('FORBIDDEN',403);return r;
}
async function bounded<T>(port:(signal:AbortSignal)=>Promise<T>):Promise<T>{
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([port(controller.signal),new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new CommandError(503,'DEPENDENCY_UNAVAILABLE'));},2000);})]);}finally{if(timer)clearTimeout(timer);}
}

/** Current Chat partition only. Not registered with legacy API/worker. */
export class NativeChatClaims {
 private readonly audit=new DurableCommands();
 constructor(private readonly source:QuerySource,private readonly uow:UnitOfWork,private readonly ports:ChatClaimPorts){}
 private match(row:any,r:Claim|Read){if(!row||canonical(json(row.binding_json))!==canonical(r.binding)||r.operation==='chat-claim'&&row.grant_id!==r.grant_id)fail('CONFLICT');}
 private async recordRequest(s:TransactionScope,r:Claim){
  try{await s.query('INSERT INTO chat_claim_request(tenant_id,request_id,intent_id,request_digest,created_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6))',[s.context.tenantId,r.request_id,r.binding.intent_id,digest(r)]);}catch(e){if((e as {code?:string}).code!=='ER_DUP_ENTRY')throw e;}
  const [old]=await s.query('SELECT intent_id,request_digest FROM chat_claim_request WHERE tenant_id=? AND request_id=?',[s.context.tenantId,r.request_id]);if(old?.intent_id!==r.binding.intent_id||old?.request_digest!==digest(r))fail('CONFLICT');
 }
 async claim(peer:string,tenant:string,input:unknown):Promise<DispatchReply>{
  const r=parse<Claim>(tenant,input),b=r.binding;if(peer!=='connector')fail('FORBIDDEN',403);
  const [existing]=await this.source.query('SELECT * FROM chat_dispatch_claim WHERE tenant_id=? AND intent_id=?',[tenant,b.intent_id]);
  let grant:Extract<DispatchReply,{state:'issued'}>|undefined;
  if(!existing){
   const request:Read={schema_version:1,operation:'receipt-read',request_id:randomUUID(),binding:b,receipt_id:r.grant_id};
   const response=await bounded(signal=>this.ports.inspectGrant(structuredClone(request),signal));
   if(!replyValid(response)||response.request_id!==request.request_id||response.receipt_id!==r.grant_id||response.state!=='issued'||response.grant_id!==r.grant_id)fail('REVOKED',403);
   grant=structuredClone(response);if(!await bounded(signal=>this.ports.mockConnectionActive(structuredClone(b),signal)))fail('REVOKED',403);
  }else this.match(existing,r);
  return this.uow.run({tenantId:tenant},async s=>{

   const [record]=await s.query('SELECT * FROM crm_record WHERE tenant_id=? AND id=? FOR SHARE',[tenant,b.conversation_id]);if(!record)fail('NOT_FOUND',404);
   const [intent]=await s.query('SELECT * FROM outbound_intent WHERE tenant_id=? AND id=? AND conversation_id=? FOR UPDATE',[tenant,b.intent_id,b.conversation_id]);
   const [prior]=await s.query('SELECT * FROM chat_dispatch_claim WHERE tenant_id=? AND intent_id=?',[tenant,b.intent_id]);
   if(prior){this.match(prior,r);await this.recordRequest(s,r);return {schema_version:1,request_id:r.request_id,receipt_id:prior.claim_id,state:'claimed',claim_id:prior.claim_id};}
   if(!grant)fail('INVALID_TRANSITION');
   const [chat]=await s.query('SELECT * FROM conversation WHERE tenant_id=? AND record_id=?',[tenant,b.conversation_id]);
   if(!chat||!intent)fail('NOT_FOUND',404);
   if(record.archived_at!==null||chat.status==='closed'||record.owner_principal_id!==b.principal_id||String(record.owner_revision)!==b.owner_revision||String(record.version)!==b.record_version)fail('STALE_OWNER');
   if(chat.contact_id!==b.crm_contact_id||chat.connection_id!==b.connection_id||intent.actor_id!==b.principal_id||intent.actor_kind!==b.actor_kind||String(intent.owner_revision)!==b.owner_revision)fail('CONFLICT');
   const shares=(await s.query('SELECT team_id FROM record_team_access WHERE tenant_id=? AND record_id=?',[tenant,b.conversation_id])).map((x:any)=>String(x.team_id)).sort();
   const context:Resource={object_key:'conversation',owner_principal_id:b.principal_id,owner_revision:b.owner_revision,record_version:b.record_version,team_id:record.team_id,shared_team_ids:shares};
   if(canonical(context)!==canonical({...grant.resource_context,shared_team_ids:[...grant.resource_context.shared_team_ids].sort()}))fail('STALE_OWNER');
   if(!['queued','remote_queued'].includes(intent.status))fail('INVALID_TRANSITION');
   const [message]=await s.query('SELECT id,text,status,connection_id FROM message WHERE tenant_id=? AND outbound_intent_id=? AND conversation_id=?',[tenant,b.intent_id,b.conversation_id]);
   const payload={version:1,platform:'mock_messenger',message:{type:'text',text:intent.text}};
   if(!message||message.status!=='queued'||message.text!==intent.text||message.connection_id!==b.connection_id||digest(payload)!==b.payload_digest)fail('CONFLICT');
   const claimId=randomUUID();
   try{await s.query('INSERT INTO chat_dispatch_claim(tenant_id,intent_id,attempt_id,claim_id,grant_id,conversation_id,binding_json,resource_json,created_at) VALUES (?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))',[tenant,b.intent_id,b.attempt_id,claimId,r.grant_id,b.conversation_id,canonical(b),canonical(grant.resource_context)]);}catch(e){if((e as {code?:string}).code==='ER_DUP_ENTRY')fail('CONFLICT');throw e;}
   const changed=await s.query("UPDATE outbound_intent SET status=?,dispatch_token=?,sending_at=UTC_TIMESTAMP(6),error_code=NULL WHERE tenant_id=? AND id=? AND status=?",[intent.status==='remote_queued'?'remote_sending':'sending',claimId,tenant,b.intent_id,intent.status]);if(changed.affectedRows!==1)fail('INVALID_TRANSITION');
   const updated=await s.query("UPDATE message SET status='sending' WHERE tenant_id=? AND id=? AND status='queued'",[tenant,message.id]);if(updated.affectedRows!==1)fail('CONFLICT');
   await this.recordRequest(s,r);await this.audit.systemAudit(s,r.request_id,'conversation',b.conversation_id,'dispatch.claim',['status']);
   return {schema_version:1,request_id:r.request_id,receipt_id:claimId,state:'claimed',claim_id:claimId};
  });
 }
 async readProof(peer:string,tenant:string,input:unknown):Promise<NativeChatClaimProof>{
  const r=parse<Read>(tenant,input,true);if(!['identity','connector'].includes(peer))fail('FORBIDDEN',403);
  return this.uow.run({tenantId:tenant},async s=>{const [row]=await s.query('SELECT * FROM chat_dispatch_claim WHERE tenant_id=? AND claim_id=?',[tenant,r.receipt_id]);if(!row)fail('NOT_FOUND',404);this.match(row,r);return {state:'claimed',binding:json(row.binding_json),grant_id:row.grant_id,claim_id:row.claim_id,resource_context:json(row.resource_json)};});
 }
 async readProofWire(peer:string,tenant:string,input:unknown):Promise<ChatClaimProofReply>{
  if(!proofReadValid(input)||Buffer.byteLength(JSON.stringify(input))>16384)fail('INVALID_REQUEST',400);
  const request=structuredClone(input) as ChatClaimProofRead;
  const proof=await this.readProof(peer,tenant,{schema_version:1,operation:'receipt-read',request_id:request.request_id,binding:request.binding,receipt_id:request.claim_id});
  return {schema_version:1,request_id:request.request_id,receipt_id:proof.claim_id,...proof};
 }
 async inspectQueued(peer:string,tenant:string,input:unknown){
  const r=parse<Read>(tenant,input,true),b=r.binding;
  if(peer!=='connector'||r.receipt_id!==b.intent_id)fail('FORBIDDEN',403);
  return this.uow.run({tenantId:tenant},async s=>{

   const [record]=await s.query('SELECT * FROM crm_record WHERE tenant_id=? AND id=? FOR SHARE',[tenant,b.conversation_id]);
   const [intent]=await s.query('SELECT * FROM outbound_intent WHERE tenant_id=? AND id=? FOR SHARE',[tenant,b.intent_id]);
   const [chat]=await s.query('SELECT * FROM conversation WHERE tenant_id=? AND record_id=?',[tenant,b.conversation_id]);
   const [message]=await s.query('SELECT text,status FROM message WHERE tenant_id=? AND outbound_intent_id=?',[tenant,b.intent_id]);
   if(!record||!intent||!chat||!message)fail('NOT_FOUND',404);
   if(record.archived_at!==null||chat.status==='closed'||record.owner_principal_id!==b.principal_id||String(record.owner_revision)!==b.owner_revision||String(record.version)!==b.record_version)fail('STALE_OWNER');
   if(intent.conversation_id!==b.conversation_id||intent.actor_id!==b.principal_id||intent.actor_kind!=='human'||String(intent.owner_revision)!==b.owner_revision||chat.contact_id!==b.crm_contact_id||chat.connection_id!==b.connection_id||!['queued','remote_queued'].includes(intent.status)||message.status!=='queued'||message.text!==intent.text)fail('CONFLICT');
   if(digest({version:1,platform:'mock_messenger',message:{type:'text',text:intent.text}})!==b.payload_digest)fail('CONFLICT');
   const shares=(await s.query('SELECT team_id FROM record_team_access WHERE tenant_id=? AND record_id=?',[tenant,b.conversation_id])).map((x:any)=>String(x.team_id)).sort();
   return {schema_version:1,request_id:r.request_id,receipt_id:b.intent_id,state:'queued',binding:b,resource_context:{object_key:'conversation',owner_principal_id:b.principal_id,owner_revision:b.owner_revision,record_version:b.record_version,team_id:record.team_id,shared_team_ids:shares}};
  });
 }
}
