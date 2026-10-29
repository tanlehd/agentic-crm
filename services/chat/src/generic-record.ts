import {randomUUID} from 'node:crypto';
import type {OwnerAdmission,OwnerCommandBinding,OwnerCommandRef} from '@agentic-crm/contracts';
import {ownerCanonical,ownerDigest,ownerFail,ownerRoute,validateOwnerValue,type OwnerCommandRequest,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';
import {ChatCustomValues,type CustomValuesInput,type CustomValuesPeers} from './custom-values.js';
import {recordProjection,readableValues} from './record-projection.js';

/** Stable public key; the first durable command owns its schema/delegation for all retries. */
export function recordPatchCommandId(tenant:string,principal:string,id:string,key:string){
 const h=ownerDigest({tenant,principal,route:'PATCH /api/v1/objects/conversation/records/'+id,key});
 return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}
export class ChatGenericRecords {
 private readonly values:ChatCustomValues;
 constructor(private readonly commands:ChatOwnerCommands,private readonly peers:CustomValuesPeers){this.values=new ChatCustomValues(commands,peers);}
 async patch(raw:OwnerCommandRequest):Promise<{data:Record<string,unknown>;meta:{correlation_id:string}}>{
  const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-record-patch',raw);
  if(input.actor.kind!=='human')ownerFail('FORBIDDEN');
  const {id,expected_version:version,idempotency_key:key,body}=input.payload;
  if(!/^[\x21-\x7e]{1,128}$/.test(String(key)))ownerFail('INVALID_REQUEST');
  if(version===null)ownerFail('PRECONDITION_REQUIRED');
  const command=recordPatchCommandId(input.tenant_id,input.actor.principal_id,id as string,key as string);
  const previous=await this.commands.existing(input.tenant_id,command);
  let payload:CustomValuesInput['payload'];
  if(previous){
   if(!('binding' in previous)||previous.state==='aborted')ownerFail('INVALID_TRANSITION');
   const saved=await this.commands.request(input.tenant_id,{command_id:command,binding_digest:previous.binding_digest});
   payload=saved.payload as CustomValuesInput['payload'];
   if(previous.binding.operation!=='custom-values-patch'||previous.binding.actor.principal_id!==input.actor.principal_id||!payload.hydrate_record||payload.conversation_id!==id||payload.expected_version!==version||ownerCanonical(payload.input)!==ownerCanonical(body))ownerFail('CONFLICT');
  }else{
   const schema=await this.peers.metadata(input.tenant_id,null);
   payload={conversation_id:id as string,expected_version:version as string,schema_revision:schema.schema_revision,input:body as CustomValuesInput['payload']['input'],hydrate_record:true};
  }
  const request:CustomValuesInput={...input,operation:'custom-values-patch',command_id:command,payload};
  let prepared;
  try{prepared=await this.values.prepare(request);}catch(error){
   if(!previous&&(error as {code?:string}).code==='CONFLICT'&&await this.commands.existing(input.tenant_id,command))return this.patch(input);
   throw error;
  }
  const ref={command_id:command,binding_digest:prepared.binding_digest};
  await this.values.execute(input.tenant_id,ref);
  return this.values.readReceipt(input.tenant_id,ref,input.actor,input.correlation_id);
 }
 async read(raw:OwnerCommandRequest){
  const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-record-get',raw);
  if(input.actor.kind!=='human')ownerFail('FORBIDDEN');
  const tenant=input.tenant_id,id=input.payload.id as string,snapshot=await this.commands.transaction(tenant,c=>recordProjection(c,tenant,id));
  const fields=[...new Set([...Object.keys(snapshot.fields),...Object.keys(snapshot.values)])].sort();if(fields.length>200)ownerFail('LIMIT_EXCEEDED');
  const command=randomUUID(),request={payload:input.payload,snapshot_digest:ownerDigest(snapshot)};
  const binding:OwnerCommandBinding={tenant_id:tenant,command_id:command,owner:'chat',operation:'record-get',actor:input.actor,resource:snapshot.resource,target:null,session_id:null,fields,payload_digest:ownerDigest(request),legacy_receipt_key:'record-get:'+command,graph:null,dependencies:[]};
  const prepared=await this.commands.prepare(binding,request),ref:OwnerCommandRef={command_id:command,binding_digest:prepared.binding_digest};let admission:OwnerAdmission|undefined;
  try{
   admission=validateOwnerValue<OwnerAdmission>('OwnerAdmission',await this.peers.admit(tenant,ref));
   if(admission.state!=='admitted'||admission.command_id!==command||admission.binding_digest!==ref.binding_digest||admission.allowed_fields.some(field=>!fields.includes(field)))ownerFail('FORBIDDEN');
   await this.commands.rememberDependency(tenant,ref,'identity-admission',admission);
   const r=snapshot.resource,result={data:{id,tenant_id:tenant,object_key:'conversation',version:r.record_version,owner_revision:r.owner_revision,owner_principal_id:r.owner_principal_id,team_id:r.team_id,archived:false,fields:readableValues(snapshot.fields,admission.allowed_fields),custom_values:readableValues(snapshot.values,admission.allowed_fields)},meta:{correlation_id:input.correlation_id}};
   validateOwnerValue('Reply_chat-record-get',{schema_version:1,request_id:input.request_id,tenant_id:tenant,result});
   await this.commands.commit(tenant,ref,admission.admission_id,async c=>{
    if(ownerCanonical(await recordProjection(c,tenant,id))!==ownerCanonical(snapshot))ownerFail('STALE_VERSION');
    return {effect_id:id,effect_revision:r.record_version};
   });
   await this.peers.settle(tenant,ref,admission.admission_id);return result;
  }catch(error){try{await this.commands.abort(tenant,ref);if(admission)await this.peers.settle(tenant,ref,admission.admission_id);}catch{/* Native Identity drain retains the proof. */}throw error;}
 }
}
export function chatGenericRecordRoutes(records:ChatGenericRecords):Record<string,WorkloadRoute>{
 return Object.fromEntries(['record-get','record-patch'].map(operation=>['/internal/v1/owners/chat/'+operation,ownerRoute('chat',operation,['crm'],request=>operation==='record-get'?records.read(request as OwnerCommandRequest):records.patch(request as OwnerCommandRequest))]));
}
