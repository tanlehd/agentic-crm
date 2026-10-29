import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerAdmission,OwnerCommandBinding,OwnerCommandRef,OwnerOutcomeSource,OwnerOutcomeReceipt} from '@agentic-crm/contracts';
import {ownerCanonical,ownerDigest,ownerFail,OwnerDomainError,ownerRoute,validateOwnerValue,type OwnerCommandRequest,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';
import {recordSnapshot,type RecordPeers} from './record-action.js';

type Peers=RecordPeers&{contact(tenant:string,command:OwnerCommandRef,admission_id:string):Promise<{contact_id:string;version:string}>;inspect(tenant:string,command:OwnerCommandRef,admission_id:string):Promise<OwnerOutcomeSource>;apply(tenant:string,command:OwnerCommandRef):Promise<OwnerOutcomeReceipt>;abort(tenant:string,command:OwnerCommandRef):Promise<OwnerOutcomeReceipt>};
const parse=<T>(value:string|T):T=>typeof value==='string'?JSON.parse(value):value;
const keyId=(value:unknown)=>{const h=ownerDigest(value);return h.slice(0,8)+'-'+h.slice(8,12)+'-5'+h.slice(13,16)+'-a'+h.slice(17,20)+'-'+h.slice(20,32);};
const route=(b:OwnerCommandBinding)=>`need-outcome:${b.resource.resource_id}:${b.session_id}:${b.need!.need_id}`;
export class ChatNeedOutcomeWriter{
 constructor(private readonly commands:ChatOwnerCommands,private readonly peers:Peers){}
 private async snapshot(c:PoolConnection,tenant:string,conversation:string,session:string,need:string){
  const base=await recordSnapshot(c,tenant,conversation),[[row]]=await c.execute<RowDataPacket[]>('SELECT contact_id,connection_id FROM conversation WHERE tenant_id=? AND record_id=?',[tenant,conversation]),[[n]]=await c.execute<RowDataPacket[]>('SELECT s.id,s.status,s.version FROM session_need n JOIN conversation_acquisition_session s ON s.tenant_id=n.tenant_id AND s.id=n.session_id WHERE n.tenant_id=? AND n.id=? AND n.session_id=? AND s.conversation_id=? FOR UPDATE',[tenant,need,session,conversation]);if(!n)ownerFail('NOT_FOUND');
  const [[a]]=await c.execute<RowDataPacket[]>('SELECT version FROM need_assessment WHERE tenant_id=? AND need_id=? FOR UPDATE',[tenant,need]);
  return {resource:base.resource,projection:{contact_id:String(row!.contact_id),connection_id:String(row!.connection_id)},session:{id:String(n.id),status:String(n.status),version:String(n.version)},assessment_version:String(a?.version??0)};
 }
 private async admit(tenant:string,ref:OwnerCommandRef){const a=validateOwnerValue<OwnerAdmission>('OwnerAdmission',await this.peers.admit(tenant,ref));if(a.state!=='admitted'||a.command_id!==ref.command_id||a.binding_digest!==ref.binding_digest||ownerCanonical(a.allowed_fields)!==ownerCanonical(['contact_id','text']))ownerFail('FORBIDDEN');await this.commands.rememberDependency(tenant,ref,'identity-admission',a);return a;}
 private response(b:OwnerCommandBinding){return {data:{conversation_id:b.resource.resource_id,session_id:b.session_id,need_id:b.need!.need_id,version:b.need!.assessment_version},meta:{correlation_id:b.outcome!.correlation_id}};}
 private receipt(c:PoolConnection,tenant:string,b:OwnerCommandBinding){return c.execute<RowDataPacket[]>("SELECT request_hash,status,response_body FROM idempotency_record WHERE tenant_id=? AND actor_kind='human' AND actor_id=? AND route_key=? AND `key`=? FOR UPDATE",[tenant,b.actor.principal_id,route(b),b.outcome!.key]);}
 private terminal(ref:OwnerCommandRef,raw:OwnerOutcomeReceipt,record:string){const r=validateOwnerValue<OwnerOutcomeReceipt>('OwnerOutcomeReceipt',raw);if(ownerCanonical(r.command)!==ownerCanonical(ref)||(r.state==='committed'?r.record_id!==record:r.record_id!==null))ownerFail('FORBIDDEN');return r;}
 private async finish(tenant:string,ref:OwnerCommandRef,result:OwnerOutcomeReceipt){
  const observed=await this.commands.proof(tenant,ref);if(!('binding' in observed)||observed.binding.operation!=='need-outcome-effect'||!observed.binding.outcome||result.state!=='committed')ownerFail('FORBIDDEN');
  const dep=observed.binding.dependencies.find(d=>d.owner==='identity'&&d.binding_digest===ref.binding_digest);if(!dep)ownerFail('FORBIDDEN');
  await this.commands.commit(tenant,ref,dep.receipt_id,async(c,b)=>{
   const [[child]]=await c.execute<RowDataPacket[]>("SELECT state FROM chat_owner_dependency WHERE tenant_id=? AND command_id=? AND slot='sales-outcome' FOR UPDATE",[tenant,ref.command_id]);if(!child||!['pending','committed'].includes(child.state))ownerFail('INVALID_TRANSITION');
   const [[assessment]]=await c.execute<RowDataPacket[]>('SELECT version FROM need_assessment WHERE tenant_id=? AND need_id=? FOR UPDATE',[tenant,b.need!.need_id]);if(String(assessment?.version??0)!==b.need!.assessment_version)ownerFail('STALE_VERSION');
   const response=this.response(b),[[old]]=await this.receipt(c,tenant,b);if(old){if(old.request_hash!==b.outcome!.request_hash||old.status!=='completed'||ownerCanonical(parse(old.response_body))!==ownerCanonical(response))ownerFail('CONFLICT');}
   else await c.execute("INSERT INTO idempotency_record(id,tenant_id,actor_kind,actor_id,route_key,`key`,request_hash,status,response_status,response_body,created_at,updated_at,expires_at) VALUES (?,?,'human',?,?,?,?,'completed',200,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),TIMESTAMPADD(DAY,7,UTC_TIMESTAMP(6)))",[randomUUID(),tenant,b.actor.principal_id,route(b),b.outcome!.key,b.outcome!.request_hash,ownerCanonical(response)]);
   await c.execute("INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,correlation_id,occurred_at,created_at) VALUES (?,?,'human',?,'need.link_outcome','sales_need_outcome',?,'accepted',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),tenant,b.actor.principal_id,b.need!.need_id,ownerCanonical(['record_id']),b.outcome!.correlation_id]);
   await c.execute("UPDATE chat_owner_dependency SET state='committed',proof_json=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND command_id=? AND slot='sales-outcome'",[ownerCanonical(result),tenant,ref.command_id]);return {effect_id:b.need!.need_id,effect_revision:b.resource.record_version,data:response.data};
  });
 }
 async recover(tenant:string,ref:OwnerCommandRef){
  const p=await this.commands.proof(tenant,ref);if(!('binding' in p)||p.binding.operation!=='need-outcome-effect'||!p.binding.outcome)ownerFail('FORBIDDEN');if(p.state!=='prepared')return;
  const result=this.terminal(ref,await this.peers.abort(tenant,ref),p.binding.outcome.record_id);if(result.state==='committed')await this.finish(tenant,ref,result);else{await this.commands.outcomeAborted(tenant,ref);await this.commands.abort(tenant,ref);}
 }
 async link(raw:OwnerCommandRequest){
  if(raw.operation!=='need-post-outcome')ownerFail('INVALID_REQUEST');const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-'+raw.operation,raw),tenant=input.tenant_id,{conversation,session,need,body,expected_version:version,idempotency_key:key}=input.payload as {conversation:string;session:string;need:string;body:{record_id:string};expected_version:string|null;idempotency_key:string};
  if(input.actor.kind!=='human'||!/^[\x21-\x7e]{1,128}$/.test(key))ownerFail('INVALID_REQUEST');if(version===null)ownerFail('PRECONDITION_REQUIRED');
  const snapshot=await this.commands.transaction(tenant,c=>this.snapshot(c,tenant,conversation,session,need));
  const guard=randomUUID(),pin={record_id:body.record_id,source:null,request_hash:ownerDigest({body,version}),key,correlation_id:input.correlation_id},request={conversation,session,need,outcome:pin};
  const binding:OwnerCommandBinding={tenant_id:tenant,command_id:guard,owner:'chat',operation:input.operation,actor:input.actor,resource:snapshot.resource,projection:snapshot.projection,target:null,session_id:session,need:{need_id:need,assessment_version:version},outcome:pin,fields:['contact_id','text'],payload_digest:ownerDigest(request),legacy_receipt_key:'need-outcome-guard:'+guard,graph:null,dependencies:[]};
  const prepared=await this.commands.prepare(binding,request),ref={command_id:guard,binding_digest:prepared.binding_digest};let admission:OwnerAdmission|undefined,effect:OwnerCommandRef|undefined;
  try{
   admission=await this.admit(tenant,ref);const contact=await this.peers.contact(tenant,ref,admission.admission_id);if(contact.contact_id!==snapshot.projection.contact_id)ownerFail('FORBIDDEN');if(snapshot.assessment_version!==version)throw new OwnerDomainError('VERSION_CONFLICT',input.correlation_id);
   const source=validateOwnerValue<OwnerOutcomeSource>('OwnerOutcomeSource',await this.peers.inspect(tenant,ref,admission.admission_id));if(source.resource.resource_id!==body.record_id)ownerFail('FORBIDDEN');let response:Record<string,unknown>|undefined;
   await this.commands.transaction(tenant,async c=>{if(ownerCanonical(await this.snapshot(c,tenant,conversation,session,need))!==ownerCanonical(snapshot))ownerFail('STALE_VERSION');const [[old]]=await this.receipt(c,tenant,binding);if(old){if(old.request_hash!==pin.request_hash)throw new OwnerDomainError('IDEMPOTENCY_CONFLICT',input.correlation_id);if(old.status!=='completed')ownerFail('DEPENDENCY_UNAVAILABLE');const stored=parse<{data:Record<string,unknown>}>(old.response_body),{thread_id,...data}=stored.data;response={...stored,data:{...data,...(thread_id?{conversation_id:data.conversation_id??thread_id}:{})}};}});
   if(!response){
    const command=keyId({tenant,principal:input.actor.principal_id,route:route(binding),key});let p=await this.commands.existing(tenant,command);
    if(!p){const outcome={...pin,source},effectRequest={conversation,session,need,outcome},b:OwnerCommandBinding={...binding,command_id:command,operation:'need-outcome-effect',outcome,payload_digest:ownerDigest(effectRequest),legacy_receipt_key:route(binding)+':'+key};try{await this.commands.prepare(b,effectRequest);}catch(e){p=await this.commands.existing(tenant,command);if(!p)throw e;}p??=await this.commands.existing(tenant,command);}
    if(!p||!('binding' in p)||p.binding.operation!=='need-outcome-effect'||p.binding.actor.principal_id!==input.actor.principal_id||p.binding.resource.resource_id!==conversation||p.binding.session_id!==session||p.binding.need?.need_id!==need||p.binding.outcome?.request_hash!==pin.request_hash)throw new OwnerDomainError('IDEMPOTENCY_CONFLICT',input.correlation_id);
    effect={command_id:command,binding_digest:p.binding_digest};if(p.state==='aborted')ownerFail('INVALID_TRANSITION');
    if(p.state==='prepared'){
     const a=await this.admit(tenant,effect);
     await this.commands.beginOutcome(tenant,effect,async(c,b)=>{const current=await this.snapshot(c,tenant,conversation,session,need);if(ownerCanonical(current.resource)!==ownerCanonical(b.resource)||ownerCanonical(current.projection)!==ownerCanonical(b.projection)||current.assessment_version!==b.need!.assessment_version)ownerFail('STALE_VERSION');});
     const result=this.terminal(effect,await this.peers.apply(tenant,effect),p.binding.outcome!.record_id);if(result.state==='aborted'){await this.commands.outcomeAborted(tenant,effect);await this.commands.abort(tenant,effect);ownerFail('INVALID_TRANSITION');}
     await this.finish(tenant,effect,result);await this.peers.settle(tenant,effect,a.admission_id);
    }
    response=this.response(p.binding);const terminal=await this.commands.proof(tenant,effect);if('binding' in terminal){const a=terminal.binding.dependencies.find(d=>d.owner==='identity');if(a)await this.peers.settle(tenant,effect,a.receipt_id);}
   }
   validateOwnerValue('Reply_chat-'+input.operation,{schema_version:1,request_id:input.request_id,tenant_id:tenant,result:response});
   await this.commands.commit(tenant,ref,admission.admission_id,async c=>{if(ownerCanonical(await this.snapshot(c,tenant,conversation,session,need))!==ownerCanonical(snapshot))ownerFail('STALE_VERSION');return {effect_id:need,effect_revision:snapshot.resource.record_version};});await this.peers.settle(tenant,ref,admission.admission_id);return response;
  }catch(e){
   if(effect)try{await this.recover(tenant,effect);const p=await this.commands.proof(tenant,effect);if('binding' in p){const a=p.binding.dependencies.find(d=>d.owner==='identity');if(a)await this.peers.settle(tenant,effect,a.receipt_id);}}catch{/* Unknown Sales effect keeps the admission and assessment fence pending. */}
   try{await this.commands.abort(tenant,ref);if(admission)await this.peers.settle(tenant,ref,admission.admission_id);}catch{/* Identity drain reconciles the original guard. */}throw e;
  }
 }
}
export function chatNeedOutcomeRoutes(writer:ChatNeedOutcomeWriter):Record<string,WorkloadRoute>{return {'/internal/v1/owners/chat/need-post-outcome':ownerRoute('chat','need-post-outcome',['bff'],r=>writer.link(r as OwnerCommandRequest))};}
