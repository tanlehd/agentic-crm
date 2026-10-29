import {randomUUID} from 'node:crypto';
import {markRealtimeChange} from './realtime.js';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerAdmission,OwnerCommandBinding,OwnerCommandRef,OwnerResource} from '@agentic-crm/contracts';
import {ownerCanonical,ownerDigest,ownerFail,ownerRoute,OwnerDomainError,validateOwnerValue,type OwnerCommandRequest,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';
import {enqueueHumanOutbound} from './outbound-job.js';

export const sendOperations=['conversation-post-conversations-id-messages','contact-bound-send'] as const;
export type OutboundPeers={
 admit(tenant:string,command:OwnerCommandRef):Promise<OwnerAdmission>;
 settle(tenant:string,command:OwnerCommandRef,admission:string):Promise<unknown>;
 subject(tenant:string,command:OwnerCommandRef,admission:string):Promise<{account_id:string}>;
 connection(tenant:string,id:string):Promise<{connection_id:string;platform:string}>;
};
const json=(v:any):any=>typeof v==='string'?JSON.parse(v):v;
async function snapshot(c:PoolConnection,tenant:string,id:string){
 const [[row]]=await c.execute<RowDataPacket[]>(`SELECT r.*,v.status,v.contact_id,v.connection_id,h.control_revision
  FROM crm_record r JOIN conversation v ON v.tenant_id=r.tenant_id AND v.record_id=r.id
  JOIN chat_control_head h ON h.tenant_id=r.tenant_id AND h.conversation_id=r.id WHERE r.tenant_id=? AND r.id=? FOR UPDATE`,[tenant,id]);
 if(!row||row.archived_at!==null)ownerFail('NOT_FOUND');
 const [shares]=await c.execute<RowDataPacket[]>('SELECT team_id FROM record_team_access WHERE tenant_id=? AND record_id=? ORDER BY team_id FOR UPDATE',[tenant,id]);
 const resource:OwnerResource={resource_id:id,object_key:'conversation',record_version:String(row.version),owner_revision:String(row.owner_revision),control_revision:String(row.control_revision),owner_principal_id:row.owner_principal_id,team_id:row.team_id,shared_team_ids:shares.map(r=>String(r.team_id)),archived:false};
 return {row,resource};
}

/** Current Identity admission protects each request, including a retained receipt replay. */
export class ChatOutboundSubmit {
 constructor(private readonly commands:ChatOwnerCommands,private readonly peers:OutboundPeers){}
 async send(raw:OwnerCommandRequest){
  if(!(sendOperations as readonly string[]).includes(raw.operation))ownerFail('INVALID_REQUEST');
  const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-'+raw.operation,raw);
  if(input.actor.kind!=='human')ownerFail('FORBIDDEN');
  const tenant=input.tenant_id,id=input.payload.id as string,body=input.payload.body as {text:string;owner_revision:string;crm_contact_id?:string};
  const key=input.payload.idempotency_key as string,expected=input.payload.expected_version??null;
  if(!/^[\x21-\x7e]{1,128}$/.test(key))ownerFail('INVALID_REQUEST');
  const snap=await this.commands.transaction(tenant,c=>snapshot(c,tenant,id));
  const command=randomUUID(),request={payload:input.payload};
  const binding:OwnerCommandBinding={tenant_id:tenant,command_id:command,owner:'chat',operation:input.operation,actor:input.actor,resource:snap.resource,
   target:null,session_id:null,fields:['text'],payload_digest:ownerDigest(request),legacy_receipt_key:'send-admission:'+command,graph:null,dependencies:[]};
  const prepared=await this.commands.prepare(binding,request),ref={command_id:command,binding_digest:prepared.binding_digest};
  let admission:OwnerAdmission|undefined;
  try{
   admission=validateOwnerValue<OwnerAdmission>('OwnerAdmission',await this.peers.admit(tenant,ref));
   if(admission.state!=='admitted'||admission.command_id!==command||admission.binding_digest!==ref.binding_digest||ownerCanonical(admission.allowed_fields)!==ownerCanonical(['text']))ownerFail('FORBIDDEN');
   await this.commands.rememberDependency(tenant,ref,'identity-admission',admission);
   const subject=await this.peers.subject(tenant,ref,admission.admission_id);
   if(!/^[0-9a-f-]{36}$/.test(subject.account_id))ownerFail('FORBIDDEN');
   const channel=await this.peers.connection(tenant,String(snap.row.connection_id));
   if(channel.connection_id!==snap.row.connection_id||channel.platform!=='mock_messenger')ownerFail('REFERENCE_INVALID');
   let response:Record<string,unknown>|undefined;
   await this.commands.commit(tenant,ref,admission.admission_id,async c=>{
    const current=await snapshot(c,tenant,id);
    if(ownerCanonical(current.resource)!==ownerCanonical(snap.resource)||current.row.contact_id!==snap.row.contact_id||current.row.connection_id!==snap.row.connection_id)ownerFail('STALE_VERSION');
    if(input.operation==='contact-bound-send'&&body.crm_contact_id!==current.row.contact_id)throw new OwnerDomainError('CONTACT_BINDING_STALE',input.correlation_id);
    const route=`POST /api/v1/conversations/${id}/messages${input.operation==='contact-bound-send'?'-v2':''}`;
    const digest=ownerDigest({body,version:expected}),actor=input.actor.principal_id;
    const [receipts]=await c.execute<RowDataPacket[]>("SELECT request_hash,status,response_body FROM idempotency_record WHERE tenant_id=? AND actor_kind='human' AND actor_id=? AND route_key=? AND `key`=? FOR UPDATE",[tenant,actor,route,key]);
    if(receipts[0]){
     if(receipts[0].request_hash!==digest)throw new OwnerDomainError('IDEMPOTENCY_CONFLICT',input.correlation_id);
     if(receipts[0].status!=='completed')ownerFail('DEPENDENCY_UNAVAILABLE');
     response=json(receipts[0].response_body);
    }else{
     const [old]=await c.execute<RowDataPacket[]>('SELECT * FROM outbound_intent WHERE tenant_id=? AND actor_id=? AND idempotency_key=? FOR UPDATE',[tenant,actor,key]);
     let data:Record<string,unknown>;
     if(old[0]){
      const intent=old[0];
      if(intent.conversation_id!==id||intent.text!==body.text||String(intent.owner_revision)!==body.owner_revision)throw new OwnerDomainError('IDEMPOTENCY_CONFLICT',input.correlation_id);
      const [[message]]=await c.execute<RowDataPacket[]>('SELECT id FROM message WHERE tenant_id=? AND outbound_intent_id=?',[tenant,intent.id]);
      if(!message)ownerFail('PRECONDITION_REQUIRED');
      data={id:intent.id,conversation_id:id,message_id:message.id,status:String(intent.status).replace(/^remote_/,''),status_url:`/api/v1/conversations/${id}/outbound-intents/${intent.id}`,...(intent.error_code?{error_code:intent.error_code}:{}),...(intent.provider_message_id?{provider_message_id:intent.provider_message_id}:{})};
     }else{
      if(current.row.status==='closed')ownerFail('INVALID_TRANSITION');
      if(current.resource.owner_principal_id!==actor||current.resource.owner_revision!==body.owner_revision)throw new OwnerDomainError('OWNER_CONFLICT',input.correlation_id);
      const intent=randomUUID(),message=randomUUID();
      markRealtimeChange();
      await c.execute("INSERT INTO outbound_intent(id,tenant_id,conversation_id,actor_kind,actor_id,account_id,owner_revision,text,status,idempotency_key,created_at) VALUES (?,?,?,'human',?,?,?,?,'remote_queued',?,UTC_TIMESTAMP(6))",[intent,tenant,id,actor,subject.account_id,body.owner_revision,body.text,key]);
      await c.execute("INSERT INTO message(id,tenant_id,conversation_id,connection_id,outbound_intent_id,direction,text,occurred_at,received_at,status) VALUES (?,?,?,?,?,'outbound',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'queued')",[message,tenant,id,current.row.connection_id,intent,body.text]);
      await this.projections(c,binding,message);
      await enqueueHumanOutbound({context:{tenantId:tenant},query:async(sql,args=[])=> (await c.query(sql,args))[0]},
       {intent,conversation:id,contact:current.row.contact_id,connection:current.row.connection_id,text:body.text,ownerRevision:body.owner_revision,recordVersion:current.resource.record_version,teamId:current.resource.team_id,sharedTeamIds:current.resource.shared_team_ids,enrollment:{principalId:actor,delegationId:input.actor.delegation_id}});
      data={id:intent,conversation_id:id,message_id:message,status:'queued',status_url:`/api/v1/conversations/${id}/outbound-intents/${intent}`};
     }
     response={data,meta:{correlation_id:input.correlation_id}};
     await c.execute("INSERT INTO idempotency_record(id,tenant_id,actor_kind,actor_id,route_key,`key`,request_hash,status,response_status,response_body,created_at,updated_at,expires_at) VALUES (?,?,'human',?,?,?,?,'completed',202,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),TIMESTAMPADD(DAY,7,UTC_TIMESTAMP(6)))",[randomUUID(),tenant,actor,route,key,digest,ownerCanonical(response)]);
     await c.execute("INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,correlation_id,occurred_at,created_at) VALUES (?,?,'human',?,'messages','conversation',?,'accepted',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),tenant,actor,id,ownerCanonical(Object.keys(body)),input.correlation_id]);
    }
    validateOwnerValue('Reply_chat-'+input.operation,{schema_version:1,request_id:input.request_id,tenant_id:tenant,result:response});
    return {effect_id:(response!.data as {id:string}).id,effect_revision:current.resource.record_version};
   });
   await this.peers.settle(tenant,ref,admission.admission_id);
   return response!;
  }catch(error){
   try{await this.commands.abort(tenant,ref);if(admission)await this.peers.settle(tenant,ref,admission.admission_id);}catch{/* Persisted proof is recovered by Identity drain. */}
   throw error;
  }
 }
 private async projections(c:PoolConnection,b:OwnerCommandBinding,message:string){
  const tenant=b.tenant_id,id=b.resource.resource_id;
  const [[workspace]]=await c.execute<RowDataPacket[]>('SELECT latest_inbound_seq FROM conversation_workspace WHERE tenant_id=? AND conversation_id=? FOR UPDATE',[tenant,id]);
  const [[counter]]=await c.execute<RowDataPacket[]>('SELECT last_seq,backfilled FROM conversation_activity_counter WHERE tenant_id=? AND conversation_id=? FOR UPDATE',[tenant,id]);
  const [sessions]=await c.execute<RowDataPacket[]>("SELECT id FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=? AND status='active' FOR UPDATE",[tenant,id]);
  if(!workspace||!counter?.backfilled||sessions.length!==1)ownerFail('PRECONDITION_REQUIRED');
  const session=String(sessions[0]!.id),seq=String(BigInt(counter.last_seq)+1n);
  await c.execute("INSERT INTO message_acquisition_membership(tenant_id,message_id,conversation_id,session_id,resolution,created_at) VALUES (?,?,?,?,'assigned',UTC_TIMESTAMP(6))",[tenant,message,id,session]);
  const [[last]]=await c.execute<RowDataPacket[]>('SELECT MAX(revision) revision FROM session_contribution WHERE tenant_id=? AND session_id=?',[tenant,session]);
  await c.execute("INSERT INTO session_contribution(tenant_id,session_id,id,conversation_id,revision,kind,source_id,source_revision,actor_kind,actor_id,owner_id,team_id,owner_revision,payload,recorded_at) VALUES (?,?,?,?,?,'outbound_submitted',?,'1','human',?,?,?,?,'{}',UTC_TIMESTAMP(6))",[tenant,session,randomUUID(),id,String(BigInt(last?.revision??0)+1n),message,b.actor.principal_id,b.resource.owner_principal_id,b.resource.team_id,b.resource.owner_revision]);
  await c.execute("INSERT INTO conversation_activity(tenant_id,id,conversation_id,activity_seq,source_service,source_kind,source_id,source_revision,kind,actor_kind,actor_id,occurred_at,recorded_at,payload) VALUES (?,?,?,?,'chat','message',?,'1','message',NULL,NULL,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?)",[tenant,randomUUID(),id,seq,message,ownerCanonical({message_id:message})]);
  await c.execute('UPDATE conversation_activity_counter SET last_seq=? WHERE tenant_id=? AND conversation_id=?',[seq,tenant,id]);
  await c.execute('INSERT INTO message_workspace(tenant_id,message_id,conversation_id,reply_through_inbound_seq) VALUES (?,?,?,?)',[tenant,message,id,workspace.latest_inbound_seq]);
  await c.execute('UPDATE conversation_workspace w JOIN message m ON m.tenant_id=w.tenant_id AND m.id=? SET w.last_message_at=m.received_at WHERE w.tenant_id=? AND w.conversation_id=?',[message,tenant,id]);
 }
}
export function chatOutboundSubmitRoutes(submit:ChatOutboundSubmit):Record<string,WorkloadRoute>{
 return Object.fromEntries(sendOperations.map(operation=>['/internal/v1/owners/chat/'+operation,ownerRoute('chat',operation,['bff'],r=>submit.send(r as OwnerCommandRequest))]));
}
