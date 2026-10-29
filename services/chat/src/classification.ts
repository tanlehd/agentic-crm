import { writeChatOutbox } from './event-store.js';
import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerAdmission,OwnerClassificationMetadata,OwnerClassificationPolicy,OwnerCommandBinding,OwnerCommandRef,OwnerMetadataSnapshot,OwnerReference} from '@agentic-crm/contracts';
import {nextOwnerCounter,ownerCanonical,ownerDigest,ownerFail,OwnerDomainError,ownerRoute,validateOwnerValue,type OwnerCommandRequest,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';
import {recordSnapshot,type RecordPeers} from './record-action.js';
import {customPropertyValue} from './custom-values.js';
import {sessionProgressContribution} from './session-progress-storage.js';
import {sessionContributions,visibleContributions} from './contributions.js';

export const classificationOperations={read:'conversation-classification-get-conversations-conversation-sessions-session-classification',write:'conversation-classification-post-conversations-conversation-sessions-session-classification',history:'conversation-classification-get-conversations-conversation-sessions-session-contributions'} as const;
type Peers=RecordPeers&{
 metadata(tenant:string):Promise<OwnerClassificationMetadata>;
 reserve(tenant:string,command:OwnerCommandRef,snapshot:OwnerMetadataSnapshot):Promise<OwnerReference>;
 release(tenant:string,command:OwnerCommandRef,snapshot:OwnerMetadataSnapshot):Promise<unknown>;
 policy(tenant:string,command:OwnerCommandRef,admission:string):Promise<OwnerClassificationPolicy>;
 contact(tenant:string,command:OwnerCommandRef,admission:string):Promise<{contact_id:string;version:string}>;
 visible?(owner:'crm'|'sales',tenant:string,command:OwnerCommandRef,admission:string,ids:string[]):Promise<{visible_ids:string[]}>;
};
const parse=(v:unknown):Record<string,unknown>=>typeof v==='string'?JSON.parse(v):v as Record<string,unknown>;
export class ChatClassification{
 constructor(private readonly commands:ChatOwnerCommands,private readonly peers:Peers){}
 private async snapshot(c:PoolConnection,tenant:string,input:OwnerCommandRequest){
  const id=input.payload.conversation as string,base=await recordSnapshot(c,tenant,id),[[row]]=await c.execute<RowDataPacket[]>('SELECT contact_id,connection_id FROM conversation WHERE tenant_id=? AND record_id=?',[tenant,id]);
  const [[session]]=await c.execute<RowDataPacket[]>('SELECT id,status,version FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=? AND id=? FOR UPDATE',[tenant,id,input.payload.session as string]);if(!session)ownerFail('NOT_FOUND');
  return {resource:base.resource,projection:{contact_id:String(row!.contact_id),connection_id:String(row!.connection_id)},session:{id:String(session.id),status:String(session.status),version:String(session.version)},...(input.operation===classificationOperations.history?{contributions:await sessionContributions(c,tenant,id,String(session.id),input.payload.before_revision as string|undefined)}:{})};
 }
 private merge(metadata:OwnerClassificationMetadata,old:Record<string,unknown>,patch:Record<string,unknown>,correlation:string){
  const result={...old};
  for(const [key,value] of Object.entries(patch)){
   const p=metadata.snapshot.properties.find(p=>p.key===key);if(!p)throw new OwnerDomainError('VALIDATION_FAILED',correlation);
   if(value===null)delete result[key];else{
    let validated;try{validated=customPropertyValue(p,value);}catch{throw new OwnerDomainError('VALIDATION_FAILED',correlation);}
    Object.defineProperty(result,key,{value:validated,enumerable:true,writable:true,configurable:true});
   }
  }
  if(Buffer.byteLength(JSON.stringify(result))>65536)throw new OwnerDomainError('VALUES_TOO_LARGE',correlation);return result;
 }
 async run(raw:OwnerCommandRequest){
  if(!(Object.values(classificationOperations) as string[]).includes(raw.operation))ownerFail('INVALID_REQUEST');
  const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-'+raw.operation,raw),write=input.operation===classificationOperations.write,tenant=input.tenant_id;if(input.actor.kind!=='human')ownerFail('FORBIDDEN');
  if(input.operation===classificationOperations.history&&input.payload.before_revision!==undefined&&!/^[1-9][0-9]{0,19}$/.test(input.payload.before_revision as string))ownerFail('INVALID_REQUEST');
  if(write&&input.payload.expected_version===null)ownerFail('PRECONDITION_REQUIRED');if(write&&!/^[\x21-\x7e]{1,128}$/.test(input.payload.idempotency_key as string))ownerFail('INVALID_REQUEST');
  const snapshot=await this.commands.transaction(tenant,c=>this.snapshot(c,tenant,input)),metadata=validateOwnerValue<OwnerClassificationMetadata>('OwnerClassificationMetadata',await this.peers.metadata(tenant));
  const {snapshot_digest:digest,...metaBody}=metadata.snapshot;
  if(metaBody.tenant_id!==tenant||metaBody.object_key!=='conversation_session'||ownerDigest(metaBody)!==digest||metaBody.properties.length>100||new Set(metaBody.properties.map(p=>p.key)).size!==metaBody.properties.length||metaBody.properties.some(p=>p.required||p.indexed)||metadata.definitions.length!==metaBody.properties.length||metadata.definitions.some(d=>{const {label,sensitive,default_value,...p}=d;return !label||typeof sensitive!=='boolean'||default_value!==null||ownerCanonical(p)!==ownerCanonical(metaBody.properties.find(m=>m.id===p.id));}))ownerFail('REFERENCE_INVALID');
  const body=input.payload.body as {values:Record<string,unknown>}|undefined,patch=body?.values??{},fields=metaBody.properties.map(p=>p.key).sort(),id=randomUUID(),request={payload:input.payload,metadata};
  const binding:OwnerCommandBinding={tenant_id:tenant,command_id:id,owner:'chat',operation:input.operation,actor:input.actor,resource:snapshot.resource,projection:snapshot.projection,target:null,session_id:snapshot.session.id,fields,session_write_fields:write?Object.keys(patch).sort():[],metadata:{object_type_id:metaBody.object_type_id,schema_revision:metaBody.schema_revision,snapshot_digest:digest},payload_digest:ownerDigest(request),legacy_receipt_key:'classification:'+id,graph:null,dependencies:[]};
  const prepared=await this.commands.prepare(binding,request),ref={command_id:id,binding_digest:prepared.binding_digest};let admission:OwnerAdmission|undefined,reserved=false;
  try{
   const reservation=validateOwnerValue<OwnerReference>('OwnerReference',await this.peers.reserve(tenant,ref,metadata.snapshot));reserved=true;
   if(reservation.command_id!==id||reservation.binding_digest!==ref.binding_digest||reservation.resource_id!==metaBody.object_type_id||reservation.revision!==metaBody.schema_revision||reservation.state!=='reserved')ownerFail('FORBIDDEN');await this.commands.rememberDependency(tenant,ref,'crm-metadata',reservation);
   admission=validateOwnerValue<OwnerAdmission>('OwnerAdmission',await this.peers.admit(tenant,ref));if(admission.command_id!==id||admission.binding_digest!==ref.binding_digest||admission.state!=='admitted'||admission.allowed_fields.some(f=>!fields.includes(f)))ownerFail('FORBIDDEN');await this.commands.rememberDependency(tenant,ref,'identity-admission',admission);
   const policy=validateOwnerValue<OwnerClassificationPolicy>('OwnerClassificationPolicy',await this.peers.policy(tenant,ref,admission.admission_id));
   if(policy.principal_id!==binding.actor.principal_id||policy.auth_revision!==admission.auth_revision||ownerCanonical(policy.read_fields)!==ownerCanonical(admission.allowed_fields)||policy.write_fields.some(f=>!policy.read_fields.includes(f))||write&&(!policy.can_edit||Object.keys(patch).some(f=>fields.includes(f)&&!policy.write_fields.includes(f))))ownerFail('FORBIDDEN');
   const contact=await this.peers.contact(tenant,ref,admission.admission_id);if(contact.contact_id!==snapshot.projection.contact_id)ownerFail('FORBIDDEN');
   const visible=async(owner:'crm'|'sales',kind:string)=>{
    const ids=[...new Set(snapshot.contributions?.history.filter(r=>r.kind===kind).map(r=>r.source_id)??[])];if(!ids.length)return [];
    if(!this.peers.visible)ownerFail('DEPENDENCY_UNAVAILABLE');
    try{const reply=await this.peers.visible(owner,tenant,ref,admission!.admission_id,ids);if(reply.visible_ids.some(id=>!ids.includes(id))||new Set(reply.visible_ids).size!==reply.visible_ids.length)ownerFail('FORBIDDEN');return reply.visible_ids;}
    catch(error){if((error as {code?:string}).code==='DEPENDENCY_UNAVAILABLE')return [];throw error;}
   };
   const notes=await visible('crm','note'),sales=await visible('sales','outcome');
   if(ownerCanonical(await this.peers.policy(tenant,ref,admission.admission_id))!==ownerCanonical(policy))ownerFail('REVOKED');
   let result:Record<string,unknown>|undefined;
   await this.commands.commit(tenant,ref,admission.admission_id,async c=>{
    if(ownerCanonical(await this.snapshot(c,tenant,input))!==ownerCanonical(snapshot))ownerFail('STALE_VERSION');
    const [[row]]=await c.execute<RowDataPacket[]>('SELECT values_json,version FROM session_classification WHERE tenant_id=? AND session_id=? FOR UPDATE',[tenant,binding.session_id!]),old=row?parse(row.values_json):{};
    if(write){
     const values=this.merge(metadata,old,patch,input.correlation_id),version=input.payload.expected_version as string,key=input.payload.idempotency_key as string,route=`POST /api/v1/conversations/${binding.resource.resource_id}/sessions/${binding.session_id}/classification`,hash=ownerDigest({body,version});
     const [[receipt]]=await c.execute<RowDataPacket[]>("SELECT request_hash,status,response_body FROM idempotency_record WHERE tenant_id=? AND actor_kind='human' AND actor_id=? AND route_key=? AND `key`=? FOR UPDATE",[tenant,binding.actor.principal_id,route,key]);
     if(receipt){if(receipt.request_hash!==hash)throw new OwnerDomainError('IDEMPOTENCY_CONFLICT',input.correlation_id);if(receipt.status!=='completed')ownerFail('DEPENDENCY_UNAVAILABLE');result=parse(receipt.response_body);}
     else{
      if(snapshot.session.status!=='active')throw new OwnerDomainError('SESSION_CLOSED',input.correlation_id);if(String(row?.version??0)!==version)throw new OwnerDomainError('VERSION_CONFLICT',input.correlation_id);const next=nextOwnerCounter(version);
      await c.execute('INSERT INTO session_classification(tenant_id,session_id,values_json,version,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE values_json=?,version=?,updated_at=UTC_TIMESTAMP(6)',[tenant,binding.session_id!,ownerCanonical(values),next,ownerCanonical(values),next]);
      const changes=Object.fromEntries(Object.keys(patch).map(k=>[k,{before:old[k]??null,after:values[k]??null}]));await sessionProgressContribution(c,binding,snapshot.session.status,'classification',binding.session_id!,next,{changes});
      await c.execute("INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,correlation_id,occurred_at,created_at) VALUES (?,?,'human',?,'classification.update','conversation_session',?,'accepted',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),tenant,binding.actor.principal_id,binding.session_id!,ownerCanonical(Object.keys(patch)),input.correlation_id]);
      await writeChatOutbox(c, "INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,'conversation.classification_changed',2,'conversation_session',?,?,?,?,'human',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')",[randomUUID(),tenant,binding.session_id!,next,ownerCanonical({conversation_id:binding.resource.resource_id,session_id:binding.session_id,version:next,changed_keys:Object.keys(patch)}),input.correlation_id,binding.actor.principal_id]);
      result={data:{session_id:binding.session_id,version:next},meta:{correlation_id:input.correlation_id}};
      await c.execute("INSERT INTO idempotency_record(id,tenant_id,actor_kind,actor_id,route_key,`key`,request_hash,status,response_status,response_body,created_at,updated_at,expires_at) VALUES (?,?,'human',?,?,?,?,'completed',200,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),TIMESTAMPADD(DAY,7,UTC_TIMESTAMP(6)))",[randomUUID(),tenant,binding.actor.principal_id,route,key,hash,ownerCanonical(result)]);
     }
    }else result={data:snapshot.contributions?visibleContributions(snapshot.contributions,binding,snapshot.session.status,policy.read_fields,notes,sales):{session_id:binding.session_id,conversation_id:binding.resource.resource_id,status:snapshot.session.status,version:String(row?.version??0),can_edit:snapshot.session.status==='active'&&policy.can_edit,definitions:metadata.definitions.filter(p=>policy.read_fields.includes(p.key)).map(p=>({...p,can_write:policy.write_fields.includes(p.key)})),values:Object.fromEntries(Object.entries(old).filter(([key])=>policy.read_fields.includes(key)))},meta:{correlation_id:input.correlation_id}};
    validateOwnerValue('Reply_chat-'+input.operation,{schema_version:1,request_id:input.request_id,tenant_id:tenant,result});return {effect_id:binding.session_id!,effect_revision:snapshot.resource.record_version};
   });
   await this.peers.release(tenant,ref,metadata.snapshot);await this.peers.settle(tenant,ref,admission.admission_id);return result!;
  }catch(error){try{await this.commands.abort(tenant,ref);if(reserved)await this.peers.release(tenant,ref,metadata.snapshot);if(admission)await this.peers.settle(tenant,ref,admission.admission_id);}catch{/* CRM metadata and Identity drains retain terminal proof recovery. */}throw error;}
 }
}
export function chatClassificationRoutes(classification:ChatClassification):Record<string,WorkloadRoute>{return Object.fromEntries(Object.values(classificationOperations).map(op=>['/internal/v1/owners/chat/'+op,ownerRoute('chat',op,['bff'],r=>classification.run(r as OwnerCommandRequest))]));}
