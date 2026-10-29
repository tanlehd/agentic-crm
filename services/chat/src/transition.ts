import {randomUUID} from 'node:crypto';
import type {RowDataPacket,PoolConnection} from 'mysql2/promise';
import type {OwnerAdmission,OwnerCommandBinding,OwnerConversationPolicy,OwnerContactSummary} from '@agentic-crm/contracts';
import {nextOwnerCounter,ownerCanonical,ownerDigest,ownerFail,ownerRoute,OwnerDomainError,validateOwnerValue,type OwnerCommandRequest,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';
import {detailData,detailSnapshot,type DetailPeers} from './detail.js';
import {ChatOwnership,type CloseInput} from './ownership.js';
import {advanceOwnershipDatasets,ownershipControlEvent} from './ownership-effects.js';
import {saveTransitionReceipt,transitionReceipt,transitionRoute,type TransitionResponse} from './transition-receipt.js';

const operation='conversation-post-conversations-id-transition';
const fields=['attribution','channel','channel_id','channel_name','page_id','text'];
export function transitionCommandId(tenant:string,principal:string,id:string,key:string){
 const h=ownerDigest({tenant,principal,route:transitionRoute(id),key});
 return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}
function disclose(response:TransitionResponse,policy:OwnerConversationPolicy,contact:OwnerContactSummary|null){
 const data=response.data;
 for(const f of fields.filter(f=>f!=='text'))if(Object.hasOwn(data,f)&&!policy.allowed_fields.includes(f))ownerFail('FORBIDDEN');
 if(data.latest_message&&Object.hasOwn(data.latest_message as object,'text')&&!policy.allowed_fields.includes('text'))ownerFail('FORBIDDEN');
 if(data.contact&&(!contact||Object.keys(data.contact).some(f=>!Object.hasOwn(contact,f))))ownerFail('FORBIDDEN');
}
/** Parent admission fences disclosure; the close child retains the proven Routing protocol. */
export class ChatTransitions{
 constructor(private readonly commands:ChatOwnerCommands,private readonly peers:DetailPeers,private readonly ownership:ChatOwnership){}
 async transition(raw:OwnerCommandRequest):Promise<TransitionResponse>{
  if(raw.operation!==operation)ownerFail('INVALID_REQUEST');
  const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-'+operation,raw);
  if(input.actor.kind!=='human')ownerFail('FORBIDDEN');
  const body=input.payload.body as {target_status:string;reason:string};
  if(typeof body.reason!=='string'||!body.reason.trim()||body.reason.length>1000||!['open','pending','closed'].includes(body.target_status))throw new OwnerDomainError('VALIDATION_FAILED',input.correlation_id);
  if(!/^[\x21-\x7e]{1,128}$/.test(String(input.payload.idempotency_key)))ownerFail('INVALID_REQUEST');
  // A concurrent same-key command can win after the snapshot; a fresh parent then replays it.
  for(let attempt=0;attempt<3;attempt++)try{return await this.attempt(input);}catch(error){
   if(attempt===2||!['STALE_VERSION','CONFLICT'].includes((error as {code?:string}).code??''))throw error;
  }
  return ownerFail('DEPENDENCY_UNAVAILABLE');
 }
 private async attempt(input:OwnerCommandRequest):Promise<TransitionResponse>{
  const tenant=input.tenant_id,id=input.payload.id as string,body=input.payload.body as {target_status:string;reason:string};
  const snapshot=await this.commands.transaction(tenant,c=>detailSnapshot(c,tenant,id)),command=randomUUID(),request={payload:input.payload};
  const b:OwnerCommandBinding={tenant_id:tenant,command_id:command,owner:'chat',operation,actor:input.actor,resource:snapshot.resource,projection:snapshot.projection,target:null,session_id:null,fields,payload_digest:ownerDigest(request),legacy_receipt_key:'transition-parent:'+command,graph:null,dependencies:[]};
  const prepared=await this.commands.prepare(b,request),ref={command_id:command,binding_digest:prepared.binding_digest};let admission:OwnerAdmission|undefined;
  try{
   admission=validateOwnerValue<OwnerAdmission>('OwnerAdmission',await this.peers.admit(tenant,ref));
   if(admission.state!=='admitted'||admission.command_id!==command||admission.binding_digest!==ref.binding_digest||admission.allowed_fields.some(f=>!fields.includes(f)))ownerFail('FORBIDDEN');
   await this.commands.rememberDependency(tenant,ref,'identity-admission',admission);
   const policy=validateOwnerValue<OwnerConversationPolicy>('OwnerConversationPolicy',await this.peers.policy(tenant,ref,admission.admission_id));
   if(policy.principal_id!==input.actor.principal_id||policy.auth_revision!==admission.auth_revision||ownerCanonical(policy.allowed_fields)!==ownerCanonical(admission.allowed_fields))ownerFail('FORBIDDEN');
   const contact=await this.peers.contact(tenant,ref,admission.admission_id),channel=await this.peers.channel(tenant,snapshot.projection.connection_id,id);
   if(contact.contact_id!==snapshot.projection.contact_id||channel.channel_id!==snapshot.projection.connection_id)ownerFail('FORBIDDEN');
   let response=await this.commands.transaction(tenant,async c=>{
    if(ownerCanonical(await detailSnapshot(c,tenant,id))!==ownerCanonical(snapshot))ownerFail('STALE_VERSION');
    return transitionReceipt(c,b,input.payload);
   }),closed=false;
   if(response&&body.target_status==='closed'){
    const childId=transitionCommandId(tenant,input.actor.principal_id,id,input.payload.idempotency_key as string),child=await this.commands.existing(tenant,childId);
    if(child?.state==='committed')await this.ownership.execute(tenant,{command_id:childId,binding_digest:child.binding_digest});
   }
   if(!response&&body.target_status==='closed'){
    if(input.payload.expected_version===null)ownerFail('PRECONDITION_REQUIRED');
    if(input.payload.expected_version!==snapshot.resource.record_version)throw new OwnerDomainError('VERSION_CONFLICT',input.correlation_id);
    const data=await this.commands.transaction(tenant,async c=>{
     if(ownerCanonical(await detailSnapshot(c,tenant,id))!==ownerCanonical(snapshot))ownerFail('STALE_VERSION');
     return detailData(c,tenant,id,snapshot,policy,contact.summary,channel);
    });
    const child=await this.ownership.prepareClose({...input,command_id:transitionCommandId(tenant,input.actor.principal_id,id,input.payload.idempotency_key as string)} as CloseInput,async()=>policy.owner_kind,{data,meta:{correlation_id:input.correlation_id}});
    if(ownerCanonical(child.binding.resource)!==ownerCanonical(snapshot.resource))ownerFail('STALE_VERSION');
    await this.ownership.execute(tenant,{command_id:child.binding.command_id,binding_digest:child.binding_digest});closed=true;
   }
   await this.commands.commit(tenant,ref,admission.admission_id,async c=>{
    const expected=closed?{...snapshot,status:'closed',resource:{...snapshot.resource,record_version:nextOwnerCounter(snapshot.resource.record_version),control_revision:nextOwnerCounter(snapshot.resource.control_revision)}}:snapshot;
    if(ownerCanonical(await detailSnapshot(c,tenant,id))!==ownerCanonical(expected))ownerFail('STALE_VERSION');
    response=await transitionReceipt(c,b,input.payload);
    if(!response){
     if(closed)ownerFail('DEPENDENCY_UNAVAILABLE');
     if(input.payload.expected_version===null)ownerFail('PRECONDITION_REQUIRED');
     if(input.payload.expected_version!==snapshot.resource.record_version)throw new OwnerDomainError('VERSION_CONFLICT',input.correlation_id);
     if(snapshot.status==='closed'||snapshot.status===body.target_status)ownerFail('INVALID_TRANSITION');
     await this.changeStatus(c,b,body.target_status,snapshot.status,policy);
     const updated=await detailSnapshot(c,tenant,id);
     response={data:await detailData(c,tenant,id,updated,policy,contact.summary,channel),meta:{correlation_id:input.correlation_id}};
     await saveTransitionReceipt(c,b,input.payload,response);
    }
    disclose(response,policy,contact.summary);
    validateOwnerValue('Reply_chat-'+operation,{schema_version:1,request_id:input.request_id,tenant_id:tenant,result:response});
    const current=await detailSnapshot(c,tenant,id);return {effect_id:id,effect_revision:current.resource.record_version};
   });
   await this.peers.settle(tenant,ref,admission.admission_id);return response!;
  }catch(error){try{await this.commands.abort(tenant,ref);if(admission)await this.peers.settle(tenant,ref,admission.admission_id);}catch{/* Identity drain can recover both durable proofs. */}throw error;}
 }
 private async changeStatus(c:PoolConnection,b:OwnerCommandBinding,status:string,from:string,policy:OwnerConversationPolicy){
  const tenant=b.tenant_id,id=b.resource.resource_id,version=nextOwnerCounter(b.resource.record_version);
  const [[head]]=await c.execute<RowDataPacket[]>('SELECT registry_revision,cancel_through,pause_through FROM chat_control_head WHERE tenant_id=? AND conversation_id=? FOR UPDATE',[tenant,id]);
  const [[counter]]=await c.execute<RowDataPacket[]>('SELECT last_seq,backfilled FROM conversation_activity_counter WHERE tenant_id=? AND conversation_id=? FOR UPDATE',[tenant,id]);
  const [sessions]=await c.execute<RowDataPacket[]>("SELECT id FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=? AND status='active' FOR UPDATE",[tenant,id]);
  if(!counter?.backfilled||sessions.length!==1)ownerFail('PRECONDITION_REQUIRED');
  const sequence=nextOwnerCounter(String(counter.last_seq)),registry=nextOwnerCounter(String(head!.registry_revision));
  await c.execute('UPDATE crm_record SET version=?,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[version,tenant,id]);
  await c.execute('UPDATE conversation SET status=?,closed_at=NULL WHERE tenant_id=? AND record_id=?',[status,tenant,id]);
  await c.execute('UPDATE chat_control_head SET registry_revision=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND conversation_id=?',[registry,tenant,id]);
  await c.execute("INSERT INTO conversation_activity(tenant_id,id,conversation_id,activity_seq,source_service,source_kind,source_id,source_revision,kind,actor_kind,actor_id,occurred_at,recorded_at,payload) VALUES (?,?,?,?,'chat','lifecycle',?,?,'lifecycle','human',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?)",[tenant,randomUUID(),id,sequence,id,version,b.actor.principal_id,ownerCanonical({from_status:from,to_status:status})]);
  await c.execute('UPDATE conversation_activity_counter SET last_seq=? WHERE tenant_id=? AND conversation_id=?',[sequence,tenant,id]);
  await c.execute("INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,correlation_id,occurred_at,created_at) VALUES (?,?,'human',?,'transition','conversation',?,'accepted',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),tenant,b.actor.principal_id,id,ownerCanonical(['target_status','reason']),b.command_id]);
  await ownershipControlEvent(c,{...b,session_id:String(sessions[0]!.id),target:{principal_id:b.resource.owner_principal_id,team_id:b.resource.team_id,kind:policy.owner_kind}},version,b.resource.owner_revision,registry,b.resource.control_revision,{pause:String(head!.pause_through),cancel:String(head!.cancel_through)});
  await advanceOwnershipDatasets(c,tenant);
 }
}
export function chatTransitionRoutes(transitions:ChatTransitions):Record<string,WorkloadRoute>{return {['/internal/v1/owners/chat/'+operation]:ownerRoute('chat',operation,['bff'],r=>transitions.transition(r as OwnerCommandRequest))};}
