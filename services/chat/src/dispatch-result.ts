// T05 own-schema adaptation of the retained D2 protocol; no baseline runtime imports.
// Current tenant admission is enforced by authenticated workload transport; local transactions check writer epoch.
import {createHash,randomUUID} from 'node:crypto';
import {Ajv} from 'ajv';
import {default as formats} from 'ajv-formats';
import {chatDispatchV1Schema,type DispatchRequest,type DispatchReply} from '@agentic-crm/contracts';
import {ChatDispatchStore as UnitOfWork,type DispatchScope as TransactionScope} from './dispatch-storage.js';
import {canonical,CommandError,DispatchEffects as DurableCommands} from './dispatch-storage.js';
import {SYSTEM_TENANT as PLATFORM_TENANT_ID} from './database.js';
import {workspaceSentPrepared} from './dispatch-storage.js';
import {publicIntentStatus} from './outbound-job.js';
type Result=Extract<DispatchRequest,{operation:'connector-result'}>;
type Read=Extract<DispatchRequest,{operation:'receipt-read'}>;
interface QuerySource {query(sql:string,args?:unknown[]):Promise<any>}
export type InspectConnectorResult=(request:Read,signal:AbortSignal)=>Promise<DispatchReply>;
function fail(code:string,status=409):never{throw new CommandError(status,code);}
const json=(v:any)=>typeof v==='string'?JSON.parse(v):v;
function validator(name:string){const a=new Ajv({strict:true});(formats as unknown as (a:Ajv)=>void)(a);return a.compile({...chatDispatchV1Schema,$ref:'#/definitions/'+name});}
const resultValid=validator('ConnectorResult'),replyValid=validator('DispatchReply');

/** Authenticated workload transport supplies peer and tenant; no public registration. */
export class NativeChatResults {
 private readonly commands=new DurableCommands();
 constructor(private readonly source:QuerySource,private readonly uow:UnitOfWork,private readonly inspect:InspectConnectorResult){}
 private async proof(request:Read){
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([this.inspect(structuredClone(request),controller.signal),new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new CommandError(503,'DEPENDENCY_UNAVAILABLE'));},2000);})]);}finally{if(timer)clearTimeout(timer);}
 }
 private async request(s:TransactionScope,r:Result){
  const digest=createHash('sha256').update(canonical(r)).digest('hex');
  try{await s.query('INSERT INTO chat_result_request(tenant_id,request_id,intent_id,request_digest,created_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6))',[s.context.tenantId,r.request_id,r.binding.intent_id,digest]);}catch(e){if((e as {code?:string}).code!=='ER_DUP_ENTRY')throw e;}
  const [old]=await s.query('SELECT intent_id,request_digest FROM chat_result_request WHERE tenant_id=? AND request_id=?',[s.context.tenantId,r.request_id]);if(old?.intent_id!==r.binding.intent_id||old?.request_digest!==digest)fail('CONFLICT');
 }
 async apply(peer:string,tenant:string,input:unknown):Promise<DispatchReply>{
  if(!resultValid(input)||Buffer.byteLength(JSON.stringify(input))>16384)fail('INVALID_REQUEST',400);
  const r=structuredClone(input) as Result,b=r.binding;if(peer!=='connector'||tenant===PLATFORM_TENANT_ID||b.tenant_id!==tenant||b.actor_kind!=='human')fail('FORBIDDEN',403);
  const [known]=await this.source.query('SELECT * FROM chat_dispatch_claim WHERE tenant_id=? AND intent_id=?',[tenant,b.intent_id]);if(!known)fail('NOT_FOUND',404);if(canonical(json(known.binding_json))!==canonical(b))fail('CONFLICT');
  const asked:Read={schema_version:1,operation:'receipt-read',request_id:randomUUID(),binding:b,receipt_id:b.attempt_id};
  const proof=await this.proof(asked);if(!replyValid(proof)||proof.request_id!==asked.request_id||proof.receipt_id!==b.attempt_id||!['sent','unknown'].includes(proof.state))fail('CONFLICT');
  if(r.outcome==='sent'&&(proof.state!=='sent'||proof.provider_message_id!==r.provider_message_id))fail('CONFLICT');
  try{return await this.uow.run({tenantId:tenant},async s=>{
   const [record]=await s.query('SELECT version FROM crm_record WHERE tenant_id=? AND id=? FOR SHARE',[tenant,b.conversation_id]);if(!record)fail('NOT_FOUND',404);
   const [intent]=await s.query('SELECT * FROM outbound_intent WHERE tenant_id=? AND id=? AND conversation_id=? FOR UPDATE',[tenant,b.intent_id,b.conversation_id]);
   const [claim]=await s.query('SELECT * FROM chat_dispatch_claim WHERE tenant_id=? AND intent_id=?',[tenant,b.intent_id]);
   if(!intent||!claim||canonical(json(claim.binding_json))!==canonical(b)||intent.dispatch_token!==claim.claim_id||claim.claim_id!==known.claim_id)fail('CONFLICT');
   const [message]=await s.query('SELECT id,status,provider_message_id FROM message WHERE tenant_id=? AND outbound_intent_id=? AND conversation_id=?',[tenant,b.intent_id,b.conversation_id]);
   const remote=String(intent.status).startsWith('remote_');intent.status=publicIntentStatus(intent.status);
   if(!message||message.status!==intent.status||message.provider_message_id!==intent.provider_message_id)fail('CONFLICT');
   if(!['sending','unknown','sent'].includes(intent.status))fail('INVALID_TRANSITION');
   if(intent.status==='sent'){
    if(r.outcome==='sent'&&r.provider_message_id!==intent.provider_message_id||proof.state==='sent'&&proof.provider_message_id!==intent.provider_message_id)fail('CONFLICT');
   }else if(r.outcome==='unknown'&&proof.state!=='unknown')fail('CONFLICT');
   await this.request(s,r);
   if(intent.status!=='sent'&&intent.status!==r.outcome){
    const provider=r.outcome==='sent'?r.provider_message_id:null,error=r.outcome==='sent'?null:'DELIVERY_UNKNOWN';
    await s.query('UPDATE outbound_intent SET status=?,provider_message_id=?,error_code=? WHERE tenant_id=? AND id=? AND dispatch_token=?',[remote&&r.outcome==='unknown'?'remote_unknown':r.outcome,provider,error,tenant,b.intent_id,claim.claim_id]);
    await s.query('UPDATE message SET status=?,provider_message_id=? WHERE tenant_id=? AND id=?',[r.outcome,provider,tenant,message.id]);
    if(r.outcome==='sent')await workspaceSentPrepared(s,b.conversation_id,message.id);
    await this.commands.systemAudit(s,r.request_id,'conversation',b.conversation_id,'dispatch.result',['status','error_code']);
    await this.commands.conversationEvent(s,r.request_id,r.outcome==='sent'?'message.sent':'message.delivery_failed',b.conversation_id,String(record.version),r.outcome==='sent'?{conversation_id:b.conversation_id,message_id:message.id,outbound_intent_id:b.intent_id}:{conversation_id:b.conversation_id,outbound_intent_id:b.intent_id,error_code:error});
    intent.status=r.outcome;intent.provider_message_id=provider;
   }
   return {schema_version:1,request_id:r.request_id,receipt_id:b.attempt_id,state:intent.status,...(intent.status==='sent'?{provider_message_id:String(intent.provider_message_id)}:{})} as DispatchReply;
  });}catch(e){if((e as {code?:string}).code==='ER_DUP_ENTRY')fail('CONFLICT');throw e;}
 }
}
