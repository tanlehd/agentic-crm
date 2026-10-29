import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerAdmission,OwnerCommandBinding,OwnerCommandRef,OwnerNoteReceipt} from '@agentic-crm/contracts';
import {ownerCanonical,ownerDigest,ownerFail,OwnerDomainError,nextOwnerCounter,ownerRoute,validateOwnerValue,type OwnerCommandRequest,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';
import {recordSnapshot,type RecordPeers} from './record-action.js';
import {markRealtimeChange} from './realtime.js';

type Peers=RecordPeers&{create(tenant:string,command:OwnerCommandRef,text:string):Promise<OwnerNoteReceipt>;abort(tenant:string,command:OwnerCommandRef):Promise<OwnerNoteReceipt>};
const route=(id:string)=>'POST /api/v1/conversations/'+id+'/notes';
const keyId=(value:unknown)=>{const h=ownerDigest(value);return h.slice(0,8)+'-'+h.slice(8,12)+'-5'+h.slice(13,16)+'-a'+h.slice(17,20)+'-'+h.slice(20,32);};
const parse=<T>(value:string|T):T=>typeof value==='string'?JSON.parse(value):value;

export class ChatNoteWriter{
 constructor(private readonly commands:ChatOwnerCommands,private readonly peers:Peers){}
 private async snapshot(c:PoolConnection,tenant:string,id:string){const base=await recordSnapshot(c,tenant,id),[[session]]=await c.execute<RowDataPacket[]>("SELECT id FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=? AND status='active' FOR UPDATE",[tenant,id]);return {...base,session_id:session?.id as string??null};}
 private async admit(tenant:string,ref:OwnerCommandRef){const a=validateOwnerValue<OwnerAdmission>('OwnerAdmission',await this.peers.admit(tenant,ref));if(a.state!=='admitted'||a.command_id!==ref.command_id||a.binding_digest!==ref.binding_digest||ownerCanonical([...a.allowed_fields].sort())!==ownerCanonical(['body','text']))ownerFail('FORBIDDEN');await this.commands.rememberDependency(tenant,ref,'identity-admission',a);return a;}
 private receipt(c:PoolConnection,tenant:string,principal:string,id:string,key:string){return c.execute<RowDataPacket[]>("SELECT request_hash,status,response_status,response_body FROM idempotency_record WHERE tenant_id=? AND actor_kind='human' AND actor_id=? AND route_key=? AND `key`=? FOR UPDATE",[tenant,principal,route(id),key]);}
 private response(b:OwnerCommandBinding,id:string){return {data:{id,conversation_id:b.resource.resource_id},meta:{correlation_id:b.note!.correlation_id}};}
 private terminal(tenant:string,ref:OwnerCommandRef,raw:OwnerNoteReceipt){const result=validateOwnerValue<OwnerNoteReceipt>('OwnerNoteReceipt',raw);if(ownerCanonical(result.command)!==ownerCanonical(ref)||(result.state==='committed'?!result.activity_id||!result.occurred_at:result.activity_id!==null||result.occurred_at!==null))ownerFail('FORBIDDEN');return result;}
 private async finish(tenant:string,ref:OwnerCommandRef,result:OwnerNoteReceipt){
  const observed=await this.commands.proof(tenant,ref);if(!('binding' in observed)||!observed.binding.note||result.state!=='committed'||!result.activity_id||!result.occurred_at)ownerFail('FORBIDDEN');
  const dep=observed.binding.dependencies.find(d=>d.owner==='identity'&&d.binding_digest===ref.binding_digest);if(!dep)ownerFail('FORBIDDEN');
  await this.commands.commit(tenant,ref,dep.receipt_id,async(c,b)=>{
   markRealtimeChange();
   const id=b.resource.resource_id,pin=b.note!,activity=result.activity_id!;
   const [[child]]=await c.execute<RowDataPacket[]>("SELECT state FROM chat_owner_dependency WHERE tenant_id=? AND command_id=? AND slot='crm-note' FOR UPDATE",[tenant,ref.command_id]);if(!child||!['pending','committed'].includes(child.state))ownerFail('INVALID_TRANSITION');
   const [[counter]]=await c.execute<RowDataPacket[]>('SELECT last_seq,backfilled FROM conversation_activity_counter WHERE tenant_id=? AND conversation_id=? FOR UPDATE',[tenant,id]);if(!counter?.backfilled)ownerFail('PRECONDITION_REQUIRED');
   const [[old]]=await c.execute<RowDataPacket[]>("SELECT id FROM conversation_activity WHERE tenant_id=? AND conversation_id=? AND source_service='crm' AND source_kind='note' AND source_id=? AND source_revision=1",[tenant,id,activity]);
   if(!old){const seq=nextOwnerCounter(String(counter.last_seq));await c.execute(`INSERT INTO conversation_activity(tenant_id,id,conversation_id,activity_seq,source_service,source_kind,source_id,source_revision,kind,actor_kind,actor_id,occurred_at,recorded_at,payload)
     VALUES (?,?,?,?,'crm','note',?,1,'note','human',?,?,UTC_TIMESTAMP(6),?)`,[tenant,randomUUID(),id,seq,activity,b.actor.principal_id,result.occurred_at!.replace('T',' ').replace('Z',''),ownerCanonical({activity_id:activity})]);await c.execute('UPDATE conversation_activity_counter SET last_seq=? WHERE tenant_id=? AND conversation_id=?',[seq,tenant,id]);}
   if(b.session_id){
    const [[prior]]=await c.execute<RowDataPacket[]>("SELECT id FROM session_contribution WHERE tenant_id=? AND session_id=? AND kind='note' AND source_id=? AND source_revision=1",[tenant,b.session_id,activity]);
    if(!prior){const [[last]]=await c.execute<RowDataPacket[]>('SELECT MAX(revision) revision FROM session_contribution WHERE tenant_id=? AND session_id=?',[tenant,b.session_id]);await c.execute(`INSERT INTO session_contribution(tenant_id,session_id,id,conversation_id,revision,kind,source_id,source_revision,actor_kind,actor_id,owner_id,team_id,owner_revision,payload,recorded_at)
      VALUES (?,?,?,?,?,'note',?,1,'human',?,?,?,?,?,UTC_TIMESTAMP(6))`,[tenant,b.session_id,randomUUID(),id,nextOwnerCounter(String(last?.revision??'0')),activity,b.actor.principal_id,b.resource.owner_principal_id,b.resource.team_id,b.resource.owner_revision,ownerCanonical({operation:'created'})]);}
   }
   const response=this.response(b,activity),[[receipt]]=await this.receipt(c,tenant,b.actor.principal_id,id,pin.key);
   if(receipt){if(receipt.request_hash!==pin.request_hash||receipt.status!=='completed'||ownerCanonical(parse(receipt.response_body))!==ownerCanonical(response))ownerFail('CONFLICT');}
   else await c.execute("INSERT INTO idempotency_record(id,tenant_id,actor_kind,actor_id,route_key,`key`,request_hash,status,response_status,response_body,created_at,updated_at,expires_at) VALUES (?,?,'human',?,?,?,?,'completed',201,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),TIMESTAMPADD(DAY,7,UTC_TIMESTAMP(6)))",[randomUUID(),tenant,b.actor.principal_id,route(id),pin.key,pin.request_hash,ownerCanonical(response)]);
   await c.execute("INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,correlation_id,occurred_at,created_at) VALUES (?,?,'human',?,'notes','conversation',?,'accepted',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),tenant,b.actor.principal_id,id,ownerCanonical(['text']),pin.correlation_id]);
   await c.execute("UPDATE chat_owner_dependency SET state='committed',proof_json=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND command_id=? AND slot='crm-note'",[ownerCanonical(result),tenant,ref.command_id]);
   return {effect_id:activity,effect_revision:'1',data:response.data};
  });
 }
 async recover(tenant:string,ref:OwnerCommandRef){
  const p=await this.commands.proof(tenant,ref);if(!('binding' in p)||p.binding.operation!=='note-effect'||!p.binding.note)ownerFail('FORBIDDEN');if(p.state!=='prepared')return;
  const terminal=this.terminal(tenant,ref,await this.peers.abort(tenant,ref));
  if(terminal.state==='committed')await this.finish(tenant,ref,terminal);else{await this.commands.noteAborted(tenant,ref);await this.commands.abort(tenant,ref);}
 }
 async create(raw:OwnerCommandRequest){
  if(raw.operation!=='conversation-post-conversations-id-notes')ownerFail('INVALID_REQUEST');const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-'+raw.operation,raw);if(input.actor.kind!=='human')ownerFail('FORBIDDEN');
  const tenant=input.tenant_id,id=input.payload.id as string,key=input.payload.idempotency_key as string,body=input.payload.body as {text:string},version=input.payload.expected_version??null;
  if(!/^[\x21-\x7e]{1,128}$/.test(key)||!body.text.trim())ownerFail('INVALID_REQUEST');
  const digest=ownerDigest({body,version}),snapshot=await this.commands.transaction(tenant,c=>this.snapshot(c,tenant,id)),guard=randomUUID(),request={id,key,request_hash:digest};
  const binding:OwnerCommandBinding={tenant_id:tenant,command_id:guard,owner:'chat',operation:input.operation,actor:input.actor,resource:snapshot.resource,target:null,session_id:null,fields:['body','text'],payload_digest:ownerDigest(request),legacy_receipt_key:'note-delivery:'+guard,graph:null,dependencies:[]};
  const prepared=await this.commands.prepare(binding,request),ref={command_id:guard,binding_digest:prepared.binding_digest};let admission:OwnerAdmission|undefined,effect:OwnerCommandRef|undefined;
  try{
   admission=await this.admit(tenant,ref);
   let response:Record<string,unknown>|undefined;
   await this.commands.transaction(tenant,async c=>{if(ownerCanonical(await this.snapshot(c,tenant,id))!==ownerCanonical(snapshot))ownerFail('STALE_VERSION');const [[old]]=await this.receipt(c,tenant,input.actor.principal_id,id,key);if(old){if(old.request_hash!==digest)throw new OwnerDomainError('IDEMPOTENCY_CONFLICT',input.correlation_id);if(old.status!=='completed')ownerFail('DEPENDENCY_UNAVAILABLE');response=parse(old.response_body);}});
   if(!response){
    const command=keyId({tenant,principal:input.actor.principal_id,route:route(id),key});let p=await this.commands.existing(tenant,command);
    if(!p){const note={body_digest:ownerDigest(body),request_hash:digest,key,correlation_id:input.correlation_id},effectRequest={id,note},b:OwnerCommandBinding={...binding,command_id:command,operation:'note-effect',session_id:snapshot.session_id,note,payload_digest:ownerDigest(effectRequest),legacy_receipt_key:'note-effect:'+route(id)+':'+key};try{await this.commands.prepare(b,effectRequest);}catch(error){p=await this.commands.existing(tenant,command);if(!p)throw error;}p??=await this.commands.existing(tenant,command);}
    if(!p||!('binding' in p)||p.binding.operation!=='note-effect'||p.binding.resource.resource_id!==id||p.binding.actor.principal_id!==input.actor.principal_id||p.binding.note?.request_hash!==digest)throw new OwnerDomainError('IDEMPOTENCY_CONFLICT',input.correlation_id);
    effect={command_id:command,binding_digest:p.binding_digest};if(p.state==='aborted')ownerFail('INVALID_TRANSITION');
    if(p.state==='prepared'){
     const a=await this.admit(tenant,effect);
     await this.commands.beginNote(tenant,effect,async(c,b)=>{const current=await this.snapshot(c,tenant,id);if(ownerCanonical(current.resource)!==ownerCanonical(b.resource)||current.session_id!==b.session_id)ownerFail('STALE_VERSION');const [[counter]]=await c.execute<RowDataPacket[]>('SELECT backfilled FROM conversation_activity_counter WHERE tenant_id=? AND conversation_id=?',[tenant,id]);if(!counter?.backfilled)ownerFail('PRECONDITION_REQUIRED');});
     const result=this.terminal(tenant,effect,await this.peers.create(tenant,effect,body.text));if(result.state==='aborted'){await this.commands.noteAborted(tenant,effect);await this.commands.abort(tenant,effect);ownerFail('INVALID_TRANSITION');}
     await this.finish(tenant,effect,result);await this.peers.settle(tenant,effect,a.admission_id);
    }
    const result=await this.commands.result(tenant,effect);response=this.response(p.binding,String(result.effect_id));
    const terminalProof=await this.commands.proof(tenant,effect);if('binding' in terminalProof){const a=terminalProof.binding.dependencies.find(d=>d.owner==='identity');if(a)await this.peers.settle(tenant,effect,a.receipt_id);}
   }
   validateOwnerValue('Reply_chat-'+input.operation,{schema_version:1,request_id:input.request_id,tenant_id:tenant,result:response});
   await this.commands.commit(tenant,ref,admission.admission_id,async c=>{if(ownerCanonical(await this.snapshot(c,tenant,id))!==ownerCanonical(snapshot))ownerFail('STALE_VERSION');return {effect_id:id,effect_revision:snapshot.resource.record_version};});
   await this.peers.settle(tenant,ref,admission.admission_id);return response;
  }catch(error){
   if(effect)try{await this.recover(tenant,effect);const p=await this.commands.proof(tenant,effect);if('binding' in p){const a=p.binding.dependencies.find(d=>d.owner==='identity');if(a)await this.peers.settle(tenant,effect,a.receipt_id);}}catch{/* Unknown remote child keeps its admission unsettled. */}
   try{await this.commands.abort(tenant,ref);if(admission)await this.peers.settle(tenant,ref,admission.admission_id);}catch{/* Current Identity drain resolves the retained proof. */}throw error;
  }
 }
}
export function chatNoteWriteRoutes(notes:ChatNoteWriter):Record<string,WorkloadRoute>{return {'/internal/v1/owners/chat/conversation-post-conversations-id-notes':ownerRoute('chat','conversation-post-conversations-id-notes',['bff'],r=>notes.create(r as OwnerCommandRequest))};}
