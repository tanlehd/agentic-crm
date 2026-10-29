import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerAdmission,OwnerCommandBinding,OwnerCommandRef,OwnerSessionSource} from '@agentic-crm/contracts';
import {ownerCanonical,ownerDigest,ownerFail,OwnerDomainError,ownerRoute,validateOwnerValue,type OwnerCommandRequest,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';
import {detailSnapshot,type Channel} from './detail.js';
import type {RecordPeers} from './record-action.js';
type Input={conversation_id:string;session_id:string|null;contact_id:string};
type Acquisition=RowDataPacket&{id:string;version:string;status:string;source_touchpoint_id:string|null;source_classification:'paid'|'organic'|'unknown';source_channel:string|null;source_connection_id:string|null;source_page_id:string|null;source_ad_id:string|null;source_campaign_id:string|null};
type Peers=RecordPeers&{
 contact(tenant:string,ref:OwnerCommandRef,admission:string):Promise<{contact_id:string;version:string}>;
 channel(tenant:string,connection:string,conversation:string):Promise<Channel&{source_touchpoint_id:string|null}>;
};
const fields=['attribution','channel','channel_id','contact_id','page_id'];
export class ChatSessionSource{
 constructor(private readonly commands:ChatOwnerCommands,private readonly peers:Peers){}
 private async snapshot(c:PoolConnection,tenant:string,input:Input){
  const base=await detailSnapshot(c,tenant,input.conversation_id);
  const [rows]=await c.execute<Acquisition[]>(`SELECT id,version,status,source_touchpoint_id,source_classification,source_channel,source_connection_id,source_page_id,source_ad_id,source_campaign_id FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=? AND ${input.session_id?'id=?':"status='active'"} ORDER BY sequence LIMIT 2 FOR UPDATE`,[tenant,input.conversation_id,...(input.session_id?[input.session_id]:[])]);
  if(rows.length>1)ownerFail('CONFLICT');
  const [[prior]]=await c.execute<RowDataPacket[]>('SELECT id FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=? LIMIT 1 FOR SHARE',[tenant,input.conversation_id]);
  return {...base,hasHistory:!!prior,session:rows[0]?{...rows[0],version:String(rows[0].version)}:null};
 }
 async read(raw:OwnerCommandRequest){
  const request=validateOwnerValue<OwnerCommandRequest>('Request_chat-session-source',raw);
  if(!['human','service'].includes(request.actor.kind)||request.actor.kind==='service'&&request.actor.principal_id!==request.actor.delegation_id)ownerFail('FORBIDDEN');
  const input=request.payload as Input,tenant=request.tenant_id,snapshot=await this.commands.transaction(tenant,c=>this.snapshot(c,tenant,input));
  const id=randomUUID(),payload={payload:input},binding:OwnerCommandBinding={tenant_id:tenant,command_id:id,owner:'chat',operation:'session-source',actor:request.actor,resource:snapshot.resource,projection:snapshot.projection,session_id:snapshot.session?.id??null,fields,target:null,graph:null,dependencies:[],payload_digest:ownerDigest(payload),legacy_receipt_key:'session-source:'+id};
  const prepared=await this.commands.prepare(binding,payload),ref={command_id:id,binding_digest:prepared.binding_digest};let admission:OwnerAdmission|undefined;
  try{
   admission=validateOwnerValue<OwnerAdmission>('OwnerAdmission',await this.peers.admit(tenant,ref));
   if(admission.state!=='admitted'||admission.command_id!==id||admission.binding_digest!==ref.binding_digest||ownerCanonical(admission.allowed_fields)!==ownerCanonical(fields))ownerFail('FORBIDDEN');
   await this.commands.rememberDependency(tenant,ref,'identity-admission',admission);
   if(snapshot.projection.contact_id!==input.contact_id)throw new OwnerDomainError('CONTACT_BINDING_MISMATCH',request.correlation_id);
   if(input.session_id&&!snapshot.session)ownerFail('NOT_FOUND');
   if(!snapshot.session&&snapshot.hasHistory)throw new OwnerDomainError('SESSION_SELECTION_REQUIRED',request.correlation_id);
   if((await this.peers.contact(tenant,ref,admission.admission_id)).contact_id!==input.contact_id)ownerFail('FORBIDDEN');
   const session=snapshot.session,channel=session?null:await this.peers.channel(tenant,snapshot.projection.connection_id,input.conversation_id);
   if(channel&&channel.channel_id!==snapshot.projection.connection_id)ownerFail('FORBIDDEN');
   const result=validateOwnerValue<OwnerSessionSource>('OwnerSessionSource',{conversation_id:input.conversation_id,session_id:session?.id??null,crm_contact_id:input.contact_id,record_version:snapshot.resource.record_version,session_revision:session?.version??'0',
    source_touchpoint_id:session?session.source_touchpoint_id:channel!.source_touchpoint_id,source_classification:session?session.source_classification:channel!.attribution.source==='ctm'?'paid':channel!.page_id?'organic':'unknown',
    source_channel:session?session.source_channel:channel!.channel,source_connection_id:session?session.source_connection_id:channel!.channel_id,source_page_id:session?session.source_page_id:channel!.page_id,source_ad_id:session?session.source_ad_id:channel!.attribution.ad_id,source_campaign_id:session?session.source_campaign_id:channel!.attribution.campaign_id});
   await this.commands.commit(tenant,ref,admission.admission_id,async c=>{if(ownerCanonical(await this.snapshot(c,tenant,input))!==ownerCanonical(snapshot))ownerFail('STALE_VERSION');return {effect_id:input.conversation_id,effect_revision:snapshot.resource.record_version};});
   await this.peers.settle(tenant,ref,admission.admission_id);return result;
  }catch(error){try{await this.commands.abort(tenant,ref);if(admission)await this.peers.settle(tenant,ref,admission.admission_id);}catch{/* Recover original proof through the native drain. */}throw error;}
 }
}
export function chatSessionSourceRoutes(source:ChatSessionSource):Record<string,WorkloadRoute>{return {'/internal/v1/owners/chat/session-source':ownerRoute('chat','session-source',['sales','workflow'],r=>source.read(r as OwnerCommandRequest))};}
