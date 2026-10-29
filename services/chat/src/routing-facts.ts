import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerAdmission,OwnerCommandBinding,OwnerRoutingReplyFact,OwnerRoutingReplySnapshot} from '@agentic-crm/contracts';
import {ownerCanonical,ownerDigest,ownerFail,OwnerDomainError,ownerRoute,validateOwnerValue,type OwnerCommandRequest,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';
import type {RecordPeers} from './record-action.js';

type Query={session_ids:string[];from:string;mode:'aggregate'|'facts'};
export async function routingReplySnapshot(c:PoolConnection,tenant:string,q:Query,correlation:string):Promise<OwnerRoutingReplySnapshot>{
 const slots=q.session_ids.map(()=>'?').join(','),facts:OwnerRoutingReplyFact[]=[],replies:OwnerRoutingReplySnapshot['replies']=[];
 if(q.session_ids.length){
  // Contributions are append-only. The same-owner session FK makes new inserts
  // wait on these parent locks; no UPDATE grant on immutable facts is needed.
  const [sessions]=await c.execute<RowDataPacket[]>(`SELECT id FROM conversation_acquisition_session WHERE tenant_id=? AND id IN (${slots}) ORDER BY id FOR UPDATE`,[tenant,...q.session_ids]);
  if(sessions.length!==q.session_ids.length)ownerFail('REFERENCE_INVALID');
  const where=`FROM session_contribution WHERE tenant_id=? AND session_id IN (${slots}) AND kind='outbound_submitted' AND actor_kind='human' AND recorded_at>=?`,params=[tenant,...q.session_ids,q.from.slice(0,-1).replace('T',' ')];
  if(q.mode==='aggregate'){
   const [rows]=await c.execute<RowDataPacket[]>(`SELECT actor_id principal_id,COUNT(*) submitted_replies ${where} GROUP BY actor_id ORDER BY actor_id LIMIT 501`,params);
   if(rows.length>500)throw new OwnerDomainError('ROUTING_REPORT_LIMIT',correlation);
   for(const r of rows)replies.push({principal_id:String(r.principal_id),submitted_replies:Number(r.submitted_replies)});
  }else{
   const [rows]=await c.execute<RowDataPacket[]>(`SELECT id,session_id,actor_id,team_id,DATE_FORMAT(recorded_at,'%Y-%m-%dT%H:%i:%s.%fZ') recorded_at ${where} ORDER BY recorded_at,id LIMIT 5001`,params);
   if(rows.length>5000)throw new OwnerDomainError('OPERATIONS_SOURCE_LIMIT',correlation);
   for(const r of rows)facts.push({id:String(r.id),session_id:String(r.session_id),actor_id:String(r.actor_id),team_id:r.team_id,recorded_at:String(r.recorded_at)});
  }
 }
 return validateOwnerValue<OwnerRoutingReplySnapshot>('OwnerRoutingReplySnapshot',{facts,replies,snapshot_digest:ownerDigest({facts,replies})});
}

/** Chat owns submitted reply facts. Permission admission precedes existence/data reads. */
export class ChatRoutingFacts{
 constructor(private readonly commands:ChatOwnerCommands,private readonly peers:RecordPeers){}
 async read(raw:OwnerCommandRequest){
  const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-routing-reply-facts',raw);
  if(input.actor.kind!=='human')ownerFail('FORBIDDEN');
  const tenant=input.tenant_id,q=input.payload as Query,command=randomUUID(),request={payload:q};
  const binding:OwnerCommandBinding={tenant_id:tenant,command_id:command,owner:'chat',operation:input.operation,actor:input.actor,resource:{resource_id:tenant,object_key:'routing_facts',record_version:'0',owner_revision:'0',control_revision:'0',owner_principal_id:null,team_id:null,shared_team_ids:[],archived:false},target:null,session_id:null,fields:['owner_principal_id','team_id'],routing_snapshot:ownerDigest(q),payload_digest:ownerDigest(request),legacy_receipt_key:'routing-facts:'+command,graph:null,dependencies:[]};
  const prepared=await this.commands.prepare(binding,request),ref={command_id:command,binding_digest:prepared.binding_digest};let admission:OwnerAdmission|undefined;
  try{
   admission=validateOwnerValue<OwnerAdmission>('OwnerAdmission',await this.peers.admit(tenant,ref));
   if(admission.state!=='admitted'||admission.command_id!==command||admission.binding_digest!==ref.binding_digest||ownerCanonical(admission.allowed_fields)!==ownerCanonical(binding.fields))ownerFail('FORBIDDEN');
   await this.commands.rememberDependency(tenant,ref,'identity-admission',admission);
   const result=await this.commands.transaction(tenant,c=>routingReplySnapshot(c,tenant,q,input.correlation_id));
   await this.commands.commit(tenant,ref,admission.admission_id,async c=>{
    if((await routingReplySnapshot(c,tenant,q,input.correlation_id)).snapshot_digest!==result.snapshot_digest)ownerFail('STALE_VERSION');
    return {effect_id:tenant,effect_revision:'1',data:{snapshot_digest:result.snapshot_digest}};
   });
   await this.peers.settle(tenant,ref,admission.admission_id);return result;
  }catch(error){try{await this.commands.abort(tenant,ref);if(admission)await this.peers.settle(tenant,ref,admission.admission_id);}catch{/* Retained native policy drain resolves terminal proof. */}throw error;}
 }
}
export function chatRoutingFactsRoutes(facts:ChatRoutingFacts):Record<string,WorkloadRoute>{return {'/internal/v1/owners/chat/routing-reply-facts':ownerRoute('chat','routing-reply-facts',['routing'],r=>facts.read(r as OwnerCommandRequest))};}
