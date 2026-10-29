import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerAdmission,OwnerCommandBinding,OwnerCommandRef,OwnerReadPredicate} from '@agentic-crm/contracts';
import {ownerCanonical,ownerDigest,ownerFail,ownerCounter,OwnerDomainError,ownerRoute,validateOwnerValue,type OwnerCommandRequest,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';
import type {RecordPeers} from './record-action.js';
import {advanceSessionClock,ensureSessionProcess,readSessionProcess,sessionStamp} from './session-progress-storage.js';
import {sessionFunnel,type FunnelSession,type MilestoneFact} from './session-funnel-reducer.js';

export const sessionFunnelOperation='session-progress-get-session-funnel';
type Policy={principal_id:string;auth_revision:string;read:OwnerReadPredicate;fields_visible:boolean};
type Peers=RecordPeers&{policy(tenant:string,command:OwnerCommandRef,admission:string):Promise<Policy>;contacts(tenant:string,command:OwnerCommandRef,admission:string,ids:string[]):Promise<{visible_ids:string[]}>};
const instant=(v:unknown)=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString()!==v)ownerFail('INVALID_REQUEST');return v;};
const sqlTime=(v:string)=>v.replace('T',' ').replace('Z','');
export class ChatSessionFunnel{
 constructor(private readonly commands:ChatOwnerCommands,private readonly peers:Peers){}
 private async cohort(c:PoolConnection,tenant:string,from:string,to:string,asOf:string,correlation:string){
  const [rows]=await c.execute<RowDataPacket[]>(`SELECT x.id,x.conversation_id,x.opened_at,p.process_version,p.coverage,p.created_at progress_at,r.owner_principal_id,r.team_id,r.owner_revision,r.version,r.archived_at,v.contact_id FROM conversation_acquisition_session x JOIN crm_record r ON r.tenant_id=x.tenant_id AND r.id=x.conversation_id JOIN conversation v ON v.tenant_id=x.tenant_id AND v.record_id=x.conversation_id LEFT JOIN session_progress p ON p.tenant_id=x.tenant_id AND p.session_id=x.id WHERE x.tenant_id=? AND x.opened_at>=? AND x.opened_at<? AND x.opened_at<=? ORDER BY x.opened_at,x.id LIMIT 2001`,[tenant,sqlTime(from),sqlTime(to),sqlTime(asOf)]);
  if(rows.length>2000)throw new OwnerDomainError('QUERY_TOO_LARGE',correlation);const ids=[...new Set(rows.map(r=>String(r.conversation_id)))].sort();
  const [shares]=ids.length?await c.execute<RowDataPacket[]>(`SELECT record_id,team_id FROM record_team_access WHERE tenant_id=? AND record_id IN (${ids.map(()=>'?').join(',')}) ORDER BY record_id,team_id`,[tenant,...ids]):[[]];
  return {rows:rows.map(r=>({id:String(r.id),conversation_id:String(r.conversation_id),contact_id:String(r.contact_id),owner_principal_id:r.owner_principal_id as string|null,team_id:r.team_id as string|null,coverage:r.coverage as FunnelSession['coverage'],version:String(r.version),owner_revision:String(r.owner_revision),process_version:r.process_version===null?null:String(r.process_version),opened_at:sessionStamp(r.opened_at),progress_at:sessionStamp(r.progress_at),archived_at:sessionStamp(r.archived_at),shared_team_ids:shares.filter(s=>s.record_id===r.conversation_id).map(s=>String(s.team_id))})),ids};
 }
 async run(raw:OwnerCommandRequest){
  const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-'+sessionFunnelOperation,raw);if(input.actor.kind!=='human')ownerFail('FORBIDDEN');
  const tenant=input.tenant_id,from=instant(input.payload.from),to=instant(input.payload.to),selected=ownerCounter(input.payload.process_version,true);if(Date.parse(to)<=Date.parse(from)||Date.parse(to)-Date.parse(from)>93*86400000)throw new OwnerDomainError('INVALID_WINDOW',input.correlation_id);const requested=input.payload.as_of===undefined?undefined:instant(input.payload.as_of);
  const id=randomUUID(),request={payload:input.payload},fields=['attribution','channel','channel_id','contact_id','page_id','text'];
  const binding:OwnerCommandBinding={tenant_id:tenant,command_id:id,owner:'chat',operation:sessionFunnelOperation,actor:input.actor,resource:{resource_id:tenant,object_key:'session_funnel',record_version:'0',owner_revision:'0',control_revision:'0',owner_principal_id:null,team_id:null,shared_team_ids:[],archived:false},target:null,session_id:null,fields,payload_digest:ownerDigest(request),legacy_receipt_key:'session-funnel:'+id,graph:null,dependencies:[]};
  const prepared=await this.commands.prepare(binding,request),ref={command_id:id,binding_digest:prepared.binding_digest};let admission:OwnerAdmission|undefined;
  try{
   admission=validateOwnerValue<OwnerAdmission>('OwnerAdmission',await this.peers.admit(tenant,ref));if(admission.command_id!==id||admission.binding_digest!==ref.binding_digest||admission.state!=='admitted'||ownerCanonical(admission.allowed_fields)!==ownerCanonical(fields))ownerFail('FORBIDDEN');await this.commands.rememberDependency(tenant,ref,'identity-admission',admission);
   const policy=validateOwnerValue<Policy>('OwnerFunnelPolicy',await this.peers.policy(tenant,ref,admission.admission_id));if(policy.principal_id!==input.actor.principal_id||policy.auth_revision!==admission.auth_revision)ownerFail('FORBIDDEN');
   const snapshot=await this.commands.transaction(tenant,async c=>{const clock=await advanceSessionClock(c,tenant),asOf=requested??clock;if(Date.parse(asOf)>Date.parse(clock))throw new OwnerDomainError('INVALID_AS_OF',input.correlation_id);return {asOf,process:await readSessionProcess(c,tenant,selected),...await this.cohort(c,tenant,from,to,asOf,input.correlation_id)};});
   const authorized=snapshot.rows.filter(r=>r.archived_at===null&&policy.fields_visible&&(policy.read.all||policy.read.own&&r.owner_principal_id===policy.principal_id||policy.read.team_ids.some(t=>t===r.team_id||r.shared_team_ids.includes(t)))),contacts=[...new Set(authorized.map(r=>String(r.contact_id)))],visible=new Set<string>();
   for(let offset=0;offset<contacts.length;offset+=100){const ids=contacts.slice(offset,offset+100),reply=await this.peers.contacts(tenant,ref,admission.admission_id,ids);if(reply.visible_ids.some(id=>!ids.includes(id))||new Set(reply.visible_ids).size!==reply.visible_ids.length)ownerFail('FORBIDDEN');for(const id of reply.visible_ids)visible.add(id);}
   if(ownerCanonical(await this.peers.policy(tenant,ref,admission.admission_id))!==ownerCanonical(policy))ownerFail('REVOKED');let result:Record<string,unknown>|undefined;
   await this.commands.commit(tenant,ref,admission.admission_id,async c=>{
    if(snapshot.ids.length)await c.execute(`SELECT id FROM crm_record WHERE tenant_id=? AND id IN (${snapshot.ids.map(()=>'?').join(',')}) ORDER BY id FOR UPDATE`,[tenant,...snapshot.ids]);await ensureSessionProcess(c,tenant);
    if(ownerCanonical(await this.cohort(c,tenant,from,to,snapshot.asOf,input.correlation_id))!==ownerCanonical({rows:snapshot.rows,ids:snapshot.ids}))ownerFail('STALE_VERSION');
    const rows=authorized.filter(r=>visible.has(String(r.contact_id))),sessions:FunnelSession[]=rows.map(r=>({id:String(r.id),coverage:r.progress_at&&Date.parse(r.progress_at)<=Date.parse(snapshot.asOf)?r.coverage:'none',process_version:String(r.process_version??'')})),full=rows.filter(r=>r.coverage==='full'&&r.process_version===selected).map(r=>String(r.id));let facts:MilestoneFact[]=[];
    if(full.length){const [events]=await c.execute<RowDataPacket[]>(`SELECT id,session_id,need_id,milestone_key,kind,supersedes_id,occurred_at,recorded_at FROM session_milestone_event WHERE tenant_id=? AND session_id IN (${full.map(()=>'?').join(',')}) AND recorded_at<=? ORDER BY recorded_at,revision LIMIT 20001`,[tenant,...full,sqlTime(snapshot.asOf)]);if(events.length>20000)throw new OwnerDomainError('QUERY_TOO_LARGE',input.correlation_id);facts=events.map(r=>({id:r.id,session_id:r.session_id,need_id:r.need_id,milestone_key:r.milestone_key,kind:r.kind,supersedes_id:r.supersedes_id,occurred_at:sessionStamp(r.occurred_at)!,recorded_at:sessionStamp(r.recorded_at)!}));}
    result={data:{...sessionFunnel(sessions,facts,snapshot.process.definition.milestones,selected,snapshot.asOf),from,to,as_of:snapshot.asOf,process_version:selected,timezone:'UTC',scope:'current_authorized_conversations',mode:'same_need_ordered'},meta:{correlation_id:input.correlation_id}};
    validateOwnerValue('Reply_chat-'+sessionFunnelOperation,{schema_version:1,request_id:input.request_id,tenant_id:tenant,result});return {effect_id:tenant,effect_revision:'1'};
   });
   await this.peers.settle(tenant,ref,admission.admission_id);return result!;
  }catch(error){try{await this.commands.abort(tenant,ref);if(admission)await this.peers.settle(tenant,ref,admission.admission_id);}catch{/* Identity drain retains recovery. */}throw error;}
 }
}
export function chatSessionFunnelRoutes(funnel:ChatSessionFunnel):Record<string,WorkloadRoute>{return {['/internal/v1/owners/chat/'+sessionFunnelOperation]:ownerRoute('chat',sessionFunnelOperation,['bff'],r=>funnel.run(r as OwnerCommandRequest))};}
