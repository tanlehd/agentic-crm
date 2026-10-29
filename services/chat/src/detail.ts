import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerAdmission,OwnerCommandBinding,OwnerCommandRef,OwnerConversationPolicy,OwnerContactSummary} from '@agentic-crm/contracts';
import {ownerCanonical,ownerDigest,ownerFail,ownerRoute,validateOwnerValue,type OwnerCommandRequest,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';
import {recordSnapshot,type RecordPeers} from './record-action.js';
export type Channel={channel:'mock_messenger'|'messenger';channel_id:string;page_id:string;channel_name:string;attribution:{source:'unknown'|'ctm';ad_id:string|null;campaign_id:string|null}};
export type DetailPeers=RecordPeers&{policy(tenant:string,command:OwnerCommandRef,admission:string):Promise<OwnerConversationPolicy>;contact(tenant:string,command:OwnerCommandRef,admission:string):Promise<{contact_id:string;summary:OwnerContactSummary|null}>;channel(tenant:string,connection:string,conversation:string):Promise<Channel>};
const stamp=(v:unknown)=>v==null?null:v instanceof Date?v.toISOString():new Date(String(v).replace(' ','T').replace(/Z?$/,'Z')).toISOString();
export async function detailSnapshot(c:PoolConnection,tenant:string,id:string){const base=await recordSnapshot(c,tenant,id);const [[row]]=await c.execute<RowDataPacket[]>('SELECT contact_id,connection_id FROM conversation WHERE tenant_id=? AND record_id=?',[tenant,id]);return {...base,projection:{contact_id:String(row!.contact_id),connection_id:String(row!.connection_id)}};}
export async function detailData(c:PoolConnection,tenant:string,id:string,snapshot:Awaited<ReturnType<typeof detailSnapshot>>,policy:OwnerConversationPolicy,contact:OwnerContactSummary|null,channel:Channel){
    const [[row]]=await c.execute<RowDataPacket[]>('SELECT v.*,w.waiting_since,w.waiting_metric_state FROM conversation v LEFT JOIN conversation_workspace w ON w.tenant_id=v.tenant_id AND w.conversation_id=v.record_id WHERE v.tenant_id=? AND v.record_id=?',[tenant,id]);
    const [[message]]=await c.execute<RowDataPacket[]>(`SELECT id,status,direction,received_at${policy.allowed_fields.includes('text')?',text':''} FROM message WHERE tenant_id=? AND conversation_id=? ORDER BY received_at DESC,id DESC LIMIT 1`,[tenant,id]);
    return {id,contact_id:row!.contact_id,contact_identity_id:row!.contact_identity_id,connection_id:row!.connection_id,...Object.fromEntries(Object.entries(channel).filter(([f])=>policy.allowed_fields.includes(f))),status:row!.status,need_response:row!.status==='closed'||row!.waiting_metric_state==='ready'&&row!.waiting_since==null?false:null,opened_at:stamp(row!.opened_at),closed_at:stamp(row!.closed_at),version:snapshot.resource.record_version,owner_revision:snapshot.resource.owner_revision,owner_principal_id:snapshot.resource.owner_principal_id,owner_kind:policy.owner_kind,allowed_actions:row!.status==='closed'?[]:policy.allowed_actions,team_id:snapshot.resource.team_id,contact,latest_message:message?{...message,received_at:stamp(message.received_at)}:null};
}
export class ChatDetail{
 constructor(private readonly commands:ChatOwnerCommands,private readonly peers:DetailPeers){}

 async read(raw:OwnerCommandRequest){
  if(raw.operation!=='conversation-get-conversations-id')ownerFail('INVALID_REQUEST');const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-'+raw.operation,raw);if(input.actor.kind!=='human')ownerFail('FORBIDDEN');
  const tenant=input.tenant_id,id=input.payload.id as string,snapshot=await this.commands.transaction(tenant,c=>detailSnapshot(c,tenant,id)),command=randomUUID(),request={payload:input.payload},fields=['attribution','channel','channel_id','channel_name','page_id','text'];
  const binding:OwnerCommandBinding={tenant_id:tenant,command_id:command,owner:'chat',operation:input.operation,actor:input.actor,resource:snapshot.resource,projection:snapshot.projection,target:null,session_id:null,fields,payload_digest:ownerDigest(request),legacy_receipt_key:'detail:'+command,graph:null,dependencies:[]};
  const prepared=await this.commands.prepare(binding,request),ref={command_id:command,binding_digest:prepared.binding_digest};let admission:OwnerAdmission|undefined;
  try{
   admission=validateOwnerValue<OwnerAdmission>('OwnerAdmission',await this.peers.admit(tenant,ref));if(admission.state!=='admitted'||admission.command_id!==command||admission.binding_digest!==ref.binding_digest||admission.allowed_fields.some(f=>!fields.includes(f)))ownerFail('FORBIDDEN');await this.commands.rememberDependency(tenant,ref,'identity-admission',admission);
   const policy=validateOwnerValue<OwnerConversationPolicy>('OwnerConversationPolicy',await this.peers.policy(tenant,ref,admission.admission_id));if(policy.principal_id!==input.actor.principal_id||policy.auth_revision!==admission.auth_revision||ownerCanonical(policy.allowed_fields)!==ownerCanonical(admission.allowed_fields))ownerFail('FORBIDDEN');
   const contact=await this.peers.contact(tenant,ref,admission.admission_id),channel=await this.peers.channel(tenant,snapshot.projection.connection_id,id);if(contact.contact_id!==snapshot.projection.contact_id||channel.channel_id!==snapshot.projection.connection_id)ownerFail('FORBIDDEN');
   let result:Record<string,unknown>|undefined;
   await this.commands.commit(tenant,ref,admission.admission_id,async c=>{
    if(ownerCanonical(await detailSnapshot(c,tenant,id))!==ownerCanonical(snapshot))ownerFail('STALE_VERSION');
    const data=await detailData(c,tenant,id,snapshot,policy,contact.summary,channel);
    result={data,meta:{correlation_id:input.correlation_id}};validateOwnerValue('Reply_chat-'+input.operation,{schema_version:1,request_id:input.request_id,tenant_id:tenant,result});return {effect_id:id,effect_revision:snapshot.resource.record_version};
   });
   await this.peers.settle(tenant,ref,admission.admission_id);return result!;
  }catch(error){try{await this.commands.abort(tenant,ref);if(admission)await this.peers.settle(tenant,ref,admission.admission_id);}catch{/* Current Identity drain recovers the durable terminal proof. */}throw error;}
 }
}
export function chatDetailRoutes(detail:ChatDetail):Record<string,WorkloadRoute>{return {'/internal/v1/owners/chat/conversation-get-conversations-id':ownerRoute('chat','conversation-get-conversations-id',['bff'],r=>detail.read(r as OwnerCommandRequest))};}
