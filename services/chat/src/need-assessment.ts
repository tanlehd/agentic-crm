import { writeChatOutbox } from './event-store.js';
import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerAdmission,OwnerClassificationMetadata,OwnerClassificationPolicy,OwnerCommandBinding,OwnerCommandRef,OwnerCustomProperty,OwnerMetadataSnapshot,OwnerReference} from '@agentic-crm/contracts';
import {nextOwnerCounter,ownerCanonical,ownerDigest,ownerFail,OwnerDomainError,ownerRoute,validateOwnerValue,type OwnerCommandRequest,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';
import {recordSnapshot,type RecordPeers} from './record-action.js';
import {customPropertyValue} from './custom-values.js';
import {requireNeedOutcomeSettled} from './need-outcome-fence.js';
import {sessionStamp} from './session-progress-storage.js';

export const needOperations={read:'need-get-assessment',write:'need-post-assessment',enrich:'need-post-enrich'} as const;
export const needDefaults:Record<string,unknown>={assessment_status:'unassessed',need_clarity:'none',intent:'other',product_interest:'',unresolved_reason:''};
export const needBuiltins=[
 {key:'assessment_status',label:'Trạng thái đánh giá',type:'enum' as const,options:['unassessed','insufficient','assessed']},
 {key:'need_clarity',label:'Độ rõ nhu cầu',type:'enum' as const,options:['none','ambiguous','clear']},
 {key:'intent',label:'Ý định',type:'enum' as const,options:['research','buy','support','cancel','other']},
 {key:'product_interest',label:'Sản phẩm quan tâm',type:'text' as const,options:null},
 {key:'unresolved_reason',label:'Lý do chưa giải quyết',type:'text' as const,options:null},
].map(p=>({...p,id:'standard:'+p.key,required:false,default_value:null,indexed:false,sensitive:true,version:'1'}));
type Peers=RecordPeers&{
 metadata(tenant:string):Promise<OwnerClassificationMetadata>;
 reserve(tenant:string,command:OwnerCommandRef,snapshot:OwnerMetadataSnapshot):Promise<OwnerReference>;
 release(tenant:string,command:OwnerCommandRef,snapshot:OwnerMetadataSnapshot):Promise<unknown>;
 policy(tenant:string,command:OwnerCommandRef,admission:string):Promise<OwnerClassificationPolicy>;
 contact(tenant:string,command:OwnerCommandRef,admission:string):Promise<{contact_id:string;version:string}>;
 outcomes(tenant:string,command:OwnerCommandRef,admission:string):Promise<{data:{id:string;label:string;linked:boolean;can_link:boolean}[]}>;
};
const parse=<T>(v:string|T):T=>typeof v==='string'?JSON.parse(v):v;
export class ChatNeedAssessments{
 constructor(private readonly commands:ChatOwnerCommands,private readonly peers:Peers){}
 private async snapshot(c:PoolConnection,tenant:string,input:OwnerCommandRequest){
  const id=input.payload.conversation as string,base=await recordSnapshot(c,tenant,id),[[row]]=await c.execute<RowDataPacket[]>('SELECT contact_id,connection_id FROM conversation WHERE tenant_id=? AND record_id=?',[tenant,id]);
  const [[need]]=await c.execute<RowDataPacket[]>('SELECT n.id,n.label,x.id session_id,x.status,x.version FROM session_need n JOIN conversation_acquisition_session x ON x.tenant_id=n.tenant_id AND x.id=n.session_id WHERE n.tenant_id=? AND n.id=? AND n.session_id=? AND x.conversation_id=? FOR UPDATE',[tenant,input.payload.need as string,input.payload.session as string,id]);if(!need)ownerFail('NOT_FOUND');
  const [[assessment]]=await c.execute<RowDataPacket[]>('SELECT version FROM need_assessment WHERE tenant_id=? AND need_id=?',[tenant,need.id]);
  return {resource:base.resource,projection:{contact_id:String(row!.contact_id),connection_id:String(row!.connection_id)},session:{id:String(need.session_id),status:String(need.status),version:String(need.version)},need:{id:String(need.id),label:String(need.label)},assessment_version:String(assessment?.version??0)};
 }
 async run(raw:OwnerCommandRequest){
  if(!(Object.values(needOperations) as string[]).includes(raw.operation))ownerFail('INVALID_REQUEST');const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-'+raw.operation,raw),enrich=input.operation===needOperations.enrich,write=input.operation!==needOperations.read,tenant=input.tenant_id;if(input.actor.kind!=='human')ownerFail('FORBIDDEN');
  if(write&&input.payload.expected_version===null)ownerFail('PRECONDITION_REQUIRED');if(write&&!/^[\x21-\x7e]{1,128}$/.test(input.payload.idempotency_key as string))ownerFail('INVALID_REQUEST');
  const snapshot=await this.commands.transaction(tenant,c=>this.snapshot(c,tenant,input)),metadata=validateOwnerValue<OwnerClassificationMetadata>('OwnerClassificationMetadata',await this.peers.metadata(tenant)),{snapshot_digest:digest,...metaBody}=metadata.snapshot;
  if(metaBody.tenant_id!==tenant||metaBody.object_key!=='conversation_need'||ownerDigest(metaBody)!==digest||metaBody.properties.some(p=>p.required||p.indexed)||new Set(metadata.definitions.map(d=>d.id)).size!==metadata.definitions.length||metadata.definitions.length!==metaBody.properties.length||metadata.definitions.some(d=>{const {label,sensitive,default_value,...p}=d;return !label||typeof sensitive!=='boolean'||default_value!==null||ownerCanonical(p)!==ownerCanonical(metaBody.properties.find(m=>m.id===p.id));}))ownerFail('REFERENCE_INVALID');
  const definitions=[...needBuiltins,...metadata.definitions];if(new Set(definitions.map(p=>p.key)).size!==definitions.length)ownerFail('REFERENCE_INVALID');
  const fields=definitions.map(p=>p.key).sort(),body=input.payload.body as {values?:Record<string,unknown>;release_pins?:string[]}|undefined,patch=body?.values??{},released=body?.release_pins??[],keys=(enrich?needBuiltins.map(p=>p.key):[...new Set([...Object.keys(patch),...released])]).sort(),id=randomUUID(),request={payload:input.payload,metadata};
  const binding:OwnerCommandBinding={tenant_id:tenant,command_id:id,owner:'chat',operation:input.operation,actor:input.actor,resource:snapshot.resource,projection:snapshot.projection,target:null,session_id:snapshot.session.id,need:{need_id:snapshot.need.id,assessment_version:write?input.payload.expected_version as string:snapshot.assessment_version},metadata:{object_type_id:metaBody.object_type_id,schema_revision:metaBody.schema_revision,snapshot_digest:digest},fields,session_write_fields:write?keys:[],payload_digest:ownerDigest(request),legacy_receipt_key:'need-assessment:'+id,graph:null,dependencies:[]};
  const prepared=await this.commands.prepare(binding,request),ref={command_id:id,binding_digest:prepared.binding_digest};let admission:OwnerAdmission|undefined,reserved=false;
  try{
   const reservation=validateOwnerValue<OwnerReference>('OwnerReference',await this.peers.reserve(tenant,ref,metadata.snapshot));reserved=true;if(reservation.command_id!==id||reservation.binding_digest!==ref.binding_digest||reservation.resource_id!==metaBody.object_type_id||reservation.revision!==metaBody.schema_revision||reservation.state!=='reserved')ownerFail('FORBIDDEN');await this.commands.rememberDependency(tenant,ref,'crm-metadata',reservation);
   admission=validateOwnerValue<OwnerAdmission>('OwnerAdmission',await this.peers.admit(tenant,ref));if(admission.command_id!==id||admission.binding_digest!==ref.binding_digest||admission.state!=='admitted'||admission.allowed_fields.some(f=>!fields.includes(f)))ownerFail('FORBIDDEN');await this.commands.rememberDependency(tenant,ref,'identity-admission',admission);
   const policy=validateOwnerValue<OwnerClassificationPolicy>('OwnerClassificationPolicy',await this.peers.policy(tenant,ref,admission.admission_id));if(policy.principal_id!==input.actor.principal_id||policy.auth_revision!==admission.auth_revision||ownerCanonical(policy.read_fields)!==ownerCanonical(admission.allowed_fields)||policy.write_fields.some(f=>!policy.read_fields.includes(f))||write&&(!policy.can_edit||keys.some(f=>fields.includes(f)&&!policy.write_fields.includes(f))))ownerFail('FORBIDDEN');
   const contact=await this.peers.contact(tenant,ref,admission.admission_id);if(contact.contact_id!==snapshot.projection.contact_id)ownerFail('FORBIDDEN');const outcomes=write?[]:(await this.peers.outcomes(tenant,ref,admission.admission_id)).data;
   if(ownerCanonical(await this.peers.policy(tenant,ref,admission.admission_id))!==ownerCanonical(policy))ownerFail('REVOKED');let result:Record<string,unknown>|undefined;
   await this.commands.commit(tenant,ref,admission.admission_id,async c=>{
    const {assessment_version:latestAssessment,...latest}=await this.snapshot(c,tenant,input),{assessment_version:initialAssessment,...initial}=snapshot;
    if(ownerCanonical(latest)!==ownerCanonical(initial)||!write&&latestAssessment!==initialAssessment)ownerFail('STALE_VERSION');
    const [[row]]=await c.execute<RowDataPacket[]>('SELECT * FROM need_assessment WHERE tenant_id=? AND need_id=? FOR UPDATE',[tenant,snapshot.need.id]),old=row?parse<Record<string,unknown>>(row.values_json):needDefaults,pins=row?parse<string[]>(row.pinned_json):[],proposal=row?parse<Record<string,unknown>>(row.proposal_json):{},current=String(row?.version??0);
    if(write){
     const version=input.payload.expected_version as string,key=input.payload.idempotency_key as string,route=`POST /api/v1/threads/${snapshot.resource.resource_id}/sessions/${snapshot.session.id}/needs/${snapshot.need.id}/${enrich?'enrich':'assessment'}`,hash=ownerDigest({body,version});
     const [[receipt]]=await c.execute<RowDataPacket[]>("SELECT request_hash,status,response_body FROM idempotency_record WHERE tenant_id=? AND actor_kind='human' AND actor_id=? AND route_key=? AND `key`=? FOR UPDATE",[tenant,binding.actor.principal_id,route,key]);
     if(receipt){if(receipt.request_hash!==hash)throw new OwnerDomainError('IDEMPOTENCY_CONFLICT',input.correlation_id);if(receipt.status!=='completed')ownerFail('DEPENDENCY_UNAVAILABLE');const stored=parse<{data:Record<string,unknown>;meta:Record<string,unknown>}>(receipt.response_body),{thread_id,...data}=stored.data;result={...stored,data:{...data,...(thread_id?{conversation_id:data.conversation_id??thread_id}:{})}};}
     else{
      if(current!==version)throw new OwnerDomainError('VERSION_CONFLICT',input.correlation_id);if(enrich)throw new OwnerDomainError('AI_CONFIGURATION_REQUIRED',input.correlation_id);await requireNeedOutcomeSettled(c,tenant,snapshot.resource.resource_id,snapshot.need.id);if(!keys.length||released.some(key=>!fields.includes(key)))ownerFail('INVALID_REQUEST');
      if(Object.keys(patch).length>100||Buffer.byteLength(JSON.stringify(patch))>65536)throw new OwnerDomainError('INVALID_NEED_VALUES',input.correlation_id);
      const values={...old};for(const [key,value] of Object.entries(patch)){const property=definitions.find(p=>p.key===key);if(!property||value===null&&needBuiltins.some(p=>p.key===key))throw new OwnerDomainError('INVALID_NEED_VALUES',input.correlation_id);if(value===null)delete values[key];else{try{customPropertyValue(property as OwnerCustomProperty,value);}catch{throw new OwnerDomainError('VALIDATION_FAILED',input.correlation_id);}Object.defineProperty(values,key,{value,enumerable:true,writable:true,configurable:true});}}
      if(Buffer.byteLength(JSON.stringify(values))>65536)throw new OwnerDomainError('VALUES_TOO_LARGE',input.correlation_id);const nextPins=[...new Set([...pins.filter(k=>!released.includes(k)),...Object.keys(patch)])],next=nextOwnerCounter(version);
      await c.execute('INSERT INTO need_assessment(tenant_id,need_id,conversation_id,session_id,values_json,pinned_json,proposal_json,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE values_json=?,pinned_json=?,proposal_json=?,version=?,updated_at=UTC_TIMESTAMP(6)',[tenant,snapshot.need.id,snapshot.resource.resource_id,snapshot.session.id,ownerCanonical(values),ownerCanonical(nextPins),ownerCanonical(proposal),next,ownerCanonical(values),ownerCanonical(nextPins),ownerCanonical(proposal),next]);
      await c.execute('INSERT INTO need_assessment_revision(tenant_id,need_id,version,values_json,pinned_json,proposal_json,actor_id,recorded_at) VALUES (?,?,?,?,?,?,?,UTC_TIMESTAMP(6))',[tenant,snapshot.need.id,next,ownerCanonical(values),ownerCanonical(nextPins),ownerCanonical(proposal),binding.actor.principal_id]);
      await writeChatOutbox(c, "INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,'need.assessed',2,'conversation_need',?,?,?,?,'human',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')",[randomUUID(),tenant,snapshot.need.id,next,ownerCanonical({conversation_id:snapshot.resource.resource_id,session_id:snapshot.session.id,need_id:snapshot.need.id,assessment_version:next,contact_id:snapshot.projection.contact_id,connection_id:snapshot.projection.connection_id}),input.correlation_id,binding.actor.principal_id]);
      await c.execute("INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,correlation_id,occurred_at,created_at) VALUES (?,?,'human',?,'need.update','conversation_need',?,'accepted',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),tenant,binding.actor.principal_id,snapshot.need.id,ownerCanonical(Object.keys(patch)),input.correlation_id]);
      result={data:{conversation_id:snapshot.resource.resource_id,session_id:snapshot.session.id,need_id:snapshot.need.id,version:next},meta:{correlation_id:input.correlation_id}};
      await c.execute("INSERT INTO idempotency_record(id,tenant_id,actor_kind,actor_id,route_key,`key`,request_hash,status,response_status,response_body,created_at,updated_at,expires_at) VALUES (?,?,'human',?,?,?,?,'completed',200,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),TIMESTAMPADD(DAY,7,UTC_TIMESTAMP(6)))",[randomUUID(),tenant,binding.actor.principal_id,route,key,hash,ownerCanonical(result)]);
     }
    }else{
     const filter=(v:Record<string,unknown>)=>Object.fromEntries(Object.entries(v).filter(([key])=>policy.read_fields.includes(key))),safeProposal=(p:Record<string,unknown>)=>({...p,values:filter((p.values??{}) as Record<string,unknown>)});
     const [history]=await c.execute<RowDataPacket[]>('SELECT version,values_json,proposal_json,recorded_at FROM need_assessment_revision WHERE tenant_id=? AND need_id=? ORDER BY version DESC LIMIT 50',[tenant,snapshot.need.id]);
     result={data:{conversation_id:snapshot.resource.resource_id,session_id:snapshot.session.id,need_id:snapshot.need.id,version:current,outcomes,can_edit:policy.can_edit,definitions:definitions.filter(p=>policy.read_fields.includes(p.key)).map(p=>({...p,can_write:policy.write_fields.includes(p.key)})),values:filter(old),pinned:pins.filter(k=>policy.read_fields.includes(k)),proposal:safeProposal(proposal),history:history.map(r=>({version:String(r.version),values:filter(parse(r.values_json)),recorded_at:sessionStamp(r.recorded_at),proposal:safeProposal(parse(r.proposal_json))}))},meta:{correlation_id:input.correlation_id}};
    }
    validateOwnerValue('Reply_chat-'+input.operation,{schema_version:1,request_id:input.request_id,tenant_id:tenant,result});return {effect_id:snapshot.need.id,effect_revision:snapshot.resource.record_version};
   });await this.peers.release(tenant,ref,metadata.snapshot);await this.peers.settle(tenant,ref,admission.admission_id);return result!;
  }catch(error){try{await this.commands.abort(tenant,ref);if(reserved)await this.peers.release(tenant,ref,metadata.snapshot);if(admission)await this.peers.settle(tenant,ref,admission.admission_id);}catch{/* Retained metadata and Identity drains reconcile terminal proof. */}throw error;}
 }
}
export function chatNeedAssessmentRoutes(need:ChatNeedAssessments):Record<string,WorkloadRoute>{return Object.fromEntries(Object.values(needOperations).map(op=>['/internal/v1/owners/chat/'+op,ownerRoute('chat',op,['bff'],r=>need.run(r as OwnerCommandRequest))]));}
