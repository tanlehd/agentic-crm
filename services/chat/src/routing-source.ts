import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerAdmission,OwnerCommandBinding,OwnerRoutingSnapshot,OwnerRoutingSession} from '@agentic-crm/contracts';
import {ownerCanonical,ownerDigest,ownerFail,ownerRoute,validateOwnerValue,type OwnerCommandRequest,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';
import type {RecordPeers} from './record-action.js';
type Selection={principal_ids:string[];connection_ids:string[];all_channels:boolean;known_session_ids:string[]};
const slots=(ids:string[])=>ids.map(()=>'?').join(',');
const date=(column:string)=>`DATE_FORMAT(${column},'%Y-%m-%dT%H:%i:%s.%fZ')`;
const columns=`a.id session_id,a.conversation_id,c.connection_id,${date('a.opened_at')} opened_at,${date('a.closed_at')} closed_at,a.status,r.owner_principal_id,r.team_id,r.owner_revision,${date('GREATEST(a.opened_at,COALESCE((SELECT MAX(h.created_at) FROM ownership_history h WHERE h.tenant_id=r.tenant_id AND h.record_id=r.id AND h.owner_revision=r.owner_revision),a.opened_at))')} assigned_at`;
const joins='FROM conversation_acquisition_session a JOIN conversation c ON c.tenant_id=a.tenant_id AND c.record_id=a.conversation_id JOIN crm_record r ON r.tenant_id=c.tenant_id AND r.id=c.record_id';
export async function routingSourceSnapshot(c:PoolConnection,tenant:string,input:Selection):Promise<OwnerRoutingSnapshot>{
 const p=input.principal_ids,connections=input.connection_ids,known=input.known_session_ids;
 const filter=[...(p.length?[`r.owner_principal_id IN (${slots(p)})`]:[]),...(input.all_channels?['r.owner_principal_id IS NULL']:connections.length?[`(r.owner_principal_id IS NULL AND c.connection_id IN (${slots(connections)}))`]:[])];
 const [active]=filter.length?await c.execute<RowDataPacket[]>(`SELECT ${columns} ${joins} WHERE a.tenant_id=? AND a.status='active' AND r.archived_at IS NULL AND (${filter.join(' OR ')}) ORDER BY a.opened_at,a.id LIMIT 501 FOR UPDATE`,[tenant,...p,...(input.all_channels?[]:connections)]):[[]];
 if(active.length>500)ownerFail('LIMIT_EXCEEDED');
 const [prior]=known.length?await c.execute<RowDataPacket[]>(`SELECT ${columns} ${joins} WHERE a.tenant_id=? AND a.id IN (${slots(known)}) ORDER BY a.id FOR UPDATE`,[tenant,...known]):[[]];
 const rows=new Map([...active,...prior].map(row=>[String(row.session_id),row]));
 const sessions=[...rows.values()].map(row=>({...row,owner_revision:String(row.owner_revision)} as OwnerRoutingSession)).sort((a,b)=>a.session_id.localeCompare(b.session_id));
 const missing=known.filter(id=>!rows.has(id)).sort(),snapshot_digest=ownerDigest({sessions,missing});
 return validateOwnerValue<OwnerRoutingSnapshot>('OwnerRoutingSnapshot',{sessions,missing,snapshot_digest});
}
/** Registered Routing service only; complete bounded snapshot, never a release from absence. */
export class ChatRoutingSource{
 constructor(private readonly commands:ChatOwnerCommands,private readonly peers:RecordPeers){}
 async read(raw:OwnerCommandRequest){
  const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-routing-sync-snapshot',raw);
  if(input.actor.kind!=='service'||input.actor.principal_id!==input.actor.delegation_id)ownerFail('FORBIDDEN');
  const tenant=input.tenant_id,selection=input.payload as Selection,snapshot=await this.commands.transaction(tenant,c=>routingSourceSnapshot(c,tenant,selection)),command=randomUUID(),request={payload:selection};
  const binding:OwnerCommandBinding={tenant_id:tenant,command_id:command,owner:'chat',operation:input.operation,actor:input.actor,resource:{resource_id:tenant,object_key:'routing_sync',record_version:'0',owner_revision:'0',control_revision:'0',owner_principal_id:null,team_id:null,shared_team_ids:[],archived:false},target:null,session_id:null,fields:['channel_id','owner_principal_id','team_id'],routing_snapshot:snapshot.snapshot_digest,payload_digest:ownerDigest(request),legacy_receipt_key:'routing-source:'+command,graph:null,dependencies:[]};
  const prepared=await this.commands.prepare(binding,request),ref={command_id:command,binding_digest:prepared.binding_digest};let admission:OwnerAdmission|undefined;
  try{
   admission=validateOwnerValue<OwnerAdmission>('OwnerAdmission',await this.peers.admit(tenant,ref));
   if(admission.state!=='admitted'||admission.command_id!==command||admission.binding_digest!==ref.binding_digest||ownerCanonical(admission.allowed_fields)!==ownerCanonical(binding.fields))ownerFail('FORBIDDEN');
   await this.commands.rememberDependency(tenant,ref,'identity-admission',admission);
   await this.commands.commit(tenant,ref,admission.admission_id,async c=>{
    if((await routingSourceSnapshot(c,tenant,selection)).snapshot_digest!==snapshot.snapshot_digest)ownerFail('STALE_VERSION');
    return {effect_id:tenant,effect_revision:'1',data:{snapshot_digest:snapshot.snapshot_digest}};
   });
   await this.peers.settle(tenant,ref,admission.admission_id);return snapshot;
  }catch(error){try{await this.commands.abort(tenant,ref);if(admission)await this.peers.settle(tenant,ref,admission.admission_id);}catch{/* Native policy drain resolves retained proof. */}throw error;}
 }
}
export function chatRoutingSourceRoutes(source:ChatRoutingSource):Record<string,WorkloadRoute>{return {'/internal/v1/owners/chat/routing-sync-snapshot':ownerRoute('chat','routing-sync-snapshot',['routing'],r=>source.read(r as OwnerCommandRequest))};}
