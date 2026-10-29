import type {Pool,PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerCommandRef,OwnerCommandProof,OwnerResource,OwnerContactDecision} from '@agentic-crm/contracts';
import {ownerBindingDigest,ownerCanonical,ownerFail,ownerRoute,validateOwnerValue,type WorkloadRoute} from '@agentic-crm/workload-transport';
import type {ReferenceProofReader} from '../../kernel/reliability/owner-reference.js';
type Policy={principal_id:string;auth_revision:string;allowed:boolean;fields:string[]};
type Input={command:OwnerCommandRef;admission_id:string};
export class NativeContactSummary{
 constructor(private readonly pool:Pool,private readonly proof:ReferenceProofReader,private readonly policy:(tenant:string,input:Input&{resource:OwnerResource})=>Promise<Policy>,private readonly batchPolicy?:(tenant:string,input:Input&{resources:OwnerResource[]})=>Promise<{principal_id:string;auth_revision:string;data:OwnerContactDecision[]}>,private readonly sessionPolicy?:(tenant:string,input:Input&{resource:OwnerResource})=>Promise<{principal_id:string;auth_revision:string;allowed:boolean}>,private readonly funnelPolicy?:(tenant:string,input:Input&{resources:OwnerResource[]})=>Promise<{principal_id:string;auth_revision:string;visible_ids:string[]}>){}
 private async transaction<T>(work:(c:PoolConnection)=>Promise<T>){const c=await this.pool.getConnection();try{await c.beginTransaction();const result=await work(c);await c.commit();return result;}catch(error){await c.rollback();throw error;}finally{c.release();}}
 private async snapshot(c:PoolConnection,tenant:string,id:string){
  const [[row]]=await c.execute<RowDataPacket[]>("SELECT r.version,r.owner_revision,r.owner_principal_id,r.team_id,r.archived_at,ct.record_id id,ct.display_name,ct.normalized_phone,ct.normalized_email FROM crm_record r JOIN object_type o ON o.tenant_id=r.tenant_id AND o.id=r.object_type_id AND o.`key`='contact' JOIN contact ct ON ct.tenant_id=r.tenant_id AND ct.record_id=r.id WHERE r.tenant_id=? AND r.id=?",[tenant,id]);if(!row)ownerFail('NOT_FOUND');
  const [shares]=await c.execute<RowDataPacket[]>('SELECT team_id FROM record_team_access WHERE tenant_id=? AND record_id=? ORDER BY team_id',[tenant,id]);
  const resource:OwnerResource={resource_id:id,object_key:'contact',record_version:String(row.version),owner_revision:String(row.owner_revision),control_revision:'0',owner_principal_id:row.owner_principal_id,team_id:row.team_id,shared_team_ids:shares.map(r=>String(r.team_id)),archived:row.archived_at!==null};
  const summary={id,display_name:String(row.display_name),normalized_phone:row.normalized_phone as string|null,normalized_email:row.normalized_email as string|null};return {resource,summary};
 }
 private async snapshots(c:PoolConnection,tenant:string,ids:string[]){
  if(!ids.length)return [];
  const marks=ids.map(()=>'?').join(',');
  const [rows]=await c.execute<RowDataPacket[]>(`SELECT r.version,r.owner_revision,r.owner_principal_id,r.team_id,r.archived_at,ct.record_id id,ct.display_name,ct.normalized_phone,ct.normalized_email FROM crm_record r JOIN object_type o ON o.tenant_id=r.tenant_id AND o.id=r.object_type_id AND o.\`key\`='contact' JOIN contact ct ON ct.tenant_id=r.tenant_id AND ct.record_id=r.id WHERE r.tenant_id=? AND r.id IN (${marks})`,[tenant,...ids]);
  if(rows.length!==ids.length)ownerFail('NOT_FOUND');
  const [shares]=await c.execute<RowDataPacket[]>(`SELECT record_id,team_id FROM record_team_access WHERE tenant_id=? AND record_id IN (${marks}) ORDER BY record_id,team_id`,[tenant,...ids]);
  return ids.map(id=>{
   const row=rows.find(r=>r.id===id)!;
   const resource:OwnerResource={resource_id:id,object_key:'contact',record_version:String(row.version),owner_revision:String(row.owner_revision),control_revision:'0',owner_principal_id:row.owner_principal_id,team_id:row.team_id,shared_team_ids:shares.filter(r=>r.record_id===id).map(r=>String(r.team_id)),archived:row.archived_at!==null};
   return {resource,summary:{id,display_name:String(row.display_name),normalized_phone:row.normalized_phone as string|null,normalized_email:row.normalized_email as string|null}};
  });
 }
 async read(tenant:string,input:Input){
  const proof=validateOwnerValue<OwnerCommandProof>('OwnerCommandProof',await this.proof(tenant,input.command,false)),b=proof.binding;
  if(proof.state!=='prepared'||b.tenant_id!==tenant||b.owner!=='chat'||b.actor.kind!=='human'||!['conversation-get-conversations-id','conversation-post-conversations-id-transition'].includes(b.operation)||!b.projection||b.command_id!==input.command.command_id||proof.binding_digest!==input.command.binding_digest||ownerBindingDigest(b)!==proof.binding_digest)ownerFail('FORBIDDEN');
  const snapshot=await this.transaction(c=>this.snapshot(c,tenant,b.projection!.contact_id));
  const decision=await this.policy(tenant,{...input,resource:snapshot.resource});
  if(decision.principal_id!==b.actor.principal_id||decision.fields.some(f=>!['id','display_name','normalized_phone','normalized_email'].includes(f)))ownerFail('FORBIDDEN');
  return this.transaction(async c=>{
   const current=await this.snapshot(c,tenant,b.projection!.contact_id);if(ownerCanonical(current)!==ownerCanonical(snapshot))ownerFail('STALE_VERSION');
   return {contact_id:b.projection!.contact_id,summary:decision.allowed?Object.fromEntries(Object.entries(current.summary).filter(([f])=>decision.fields.includes(f))):null};
  });
 }
 async session(tenant:string,input:Input){
  if(!this.sessionPolicy)ownerFail('DEPENDENCY_UNAVAILABLE');
  const proof=validateOwnerValue<OwnerCommandProof>('OwnerCommandProof',await this.proof(tenant,input.command,false)),b=proof.binding;
  if(proof.state!=='prepared'||b.tenant_id!==tenant||b.owner!=='chat'||(b.operation==='session-source'?(!['human','service'].includes(b.actor.kind)||b.actor.kind==='service'&&b.actor.delegation_id!==b.actor.principal_id):b.operation==='read-need'?(b.actor.kind!=='service'||b.actor.delegation_id!==b.actor.principal_id||!b.need):b.actor.kind!=='human')||!['session-source','read-need','need-post-outcome','need-outcome-effect','need-get-assessment','need-post-assessment','need-post-enrich','session-progress-get-conversations-conversation-sessions-session-progress','session-progress-post-conversations-conversation-sessions-session-progress','conversation-classification-get-conversations-conversation-sessions-session-classification','conversation-classification-post-conversations-conversation-sessions-session-classification','conversation-classification-get-conversations-conversation-sessions-session-contributions'].includes(b.operation)||!b.projection||b.operation!=='session-source'&&!b.session_id||b.command_id!==input.command.command_id||proof.binding_digest!==input.command.binding_digest||ownerBindingDigest(b)!==proof.binding_digest)ownerFail('FORBIDDEN');
  const snapshot=await this.transaction(c=>this.snapshot(c,tenant,b.projection!.contact_id)),decision=await this.sessionPolicy(tenant,{...input,resource:snapshot.resource});
  if(decision.principal_id!==b.actor.principal_id)ownerFail('FORBIDDEN');if(!decision.allowed||snapshot.resource.archived)ownerFail('NOT_FOUND');
  return this.transaction(async c=>{if(ownerCanonical(await this.snapshot(c,tenant,b.projection!.contact_id))!==ownerCanonical(snapshot))ownerFail('STALE_VERSION');return {contact_id:b.projection!.contact_id,version:snapshot.resource.record_version};});
 }
 async funnel(tenant:string,input:Input&{ids:string[]}){
  if(!this.funnelPolicy)ownerFail('DEPENDENCY_UNAVAILABLE');
  const proof=validateOwnerValue<OwnerCommandProof>('OwnerCommandProof',await this.proof(tenant,input.command,false)),b=proof.binding;
  if(proof.state!=='prepared'||b.tenant_id!==tenant||b.owner!=='chat'||b.actor.kind!=='human'||b.operation!=='session-progress-get-session-funnel'||b.resource.object_key!=='session_funnel'||b.command_id!==input.command.command_id||proof.binding_digest!==input.command.binding_digest||ownerBindingDigest(b)!==proof.binding_digest)ownerFail('FORBIDDEN');
  if(!input.ids.length)return {visible_ids:[]};
  const snapshot=await this.transaction(async c=>{const [found]=await c.execute<RowDataPacket[]>(`SELECT record_id FROM contact WHERE tenant_id=? AND record_id IN (${input.ids.map(()=>'?').join(',')}) ORDER BY record_id`,[tenant,...input.ids]);return this.snapshots(c,tenant,found.map(r=>String(r.record_id)));});
  const visible:string[]=[];let revision:string|undefined;
  for(let offset=0;offset<Math.max(snapshot.length,1);offset+=25){const resources=snapshot.slice(offset,offset+25).map(r=>r.resource),policy=await this.funnelPolicy(tenant,{command:input.command,admission_id:input.admission_id,resources});if(policy.principal_id!==b.actor.principal_id||policy.visible_ids.some(id=>!resources.some(r=>r.resource_id===id))||revision!==undefined&&revision!==policy.auth_revision)ownerFail('FORBIDDEN');revision=policy.auth_revision;visible.push(...policy.visible_ids);}
  return this.transaction(async c=>{if(ownerCanonical(await this.snapshots(c,tenant,snapshot.map(r=>r.resource.resource_id)))!==ownerCanonical(snapshot))ownerFail('STALE_VERSION');return {visible_ids:visible};});
 }
 async batch(tenant:string,input:Input&{ids:string[]}){
  if(!this.batchPolicy)ownerFail('DEPENDENCY_UNAVAILABLE');
  const proof=validateOwnerValue<OwnerCommandProof>('OwnerCommandProof',await this.proof(tenant,input.command,false)),b=proof.binding;
  if(proof.state!=='prepared'||b.tenant_id!==tenant||b.owner!=='chat'||b.actor.kind!=='human'||b.resource.object_key!=='chat_workspace_query'||!['workspace-conversations','workspace-sidebar','conversation-get-conversations','conversation-channels'].includes(b.operation)||b.command_id!==input.command.command_id||proof.binding_digest!==input.command.binding_digest||ownerBindingDigest(b)!==proof.binding_digest||input.ids.length>100||new Set(input.ids).size!==input.ids.length)ownerFail('FORBIDDEN');
  const snapshots=await this.transaction(c=>this.snapshots(c,tenant,input.ids));
  const decisions:OwnerContactDecision[]=[];let revision:string|undefined;
  // 25 resources fit the 256 KiB request bound even with 200 shared teams each.
  for(let offset=0;offset<snapshots.length;offset+=25){
   const resources=snapshots.slice(offset,offset+25).map(s=>s.resource),reply=await this.batchPolicy(tenant,{command:input.command,admission_id:input.admission_id,resources});
   if(reply.principal_id!==b.actor.principal_id||reply.data.length!==resources.length||reply.data.some(d=>!resources.some(r=>r.resource_id===d.id))||revision!==undefined&&revision!==reply.auth_revision)ownerFail('FORBIDDEN');
   revision=reply.auth_revision;decisions.push(...reply.data);
  }
  if(new Set(decisions.map(d=>d.id)).size!==snapshots.length)ownerFail('FORBIDDEN');
  return this.transaction(async c=>{
   const data=[],currentRows=await this.snapshots(c,tenant,input.ids);
   for(const snapshot of snapshots){
    const id=snapshot.resource.resource_id,current=currentRows.find(r=>r.resource.resource_id===id)!,decision=decisions.find(d=>d.id===id);
    if(!decision||decision.fields.some(f=>!['id','display_name','normalized_phone','normalized_email'].includes(f)))ownerFail('FORBIDDEN');
    if(ownerCanonical(current)!==ownerCanonical(snapshot))ownerFail('STALE_VERSION');
    data.push({contact_id:id,summary:decision.allowed?Object.fromEntries(Object.entries(current.summary).filter(([f])=>decision.fields.includes(f))):null});
   }
   return {data};
  });
 }
}
export function contactSummaryRoutes(summary:NativeContactSummary):Record<string,WorkloadRoute>{return {'/internal/v1/owners/crm/funnel-contact-read':ownerRoute('crm','funnel-contact-read',['chat'],r=>summary.funnel(r.tenant_id,r.payload as Input&{ids:string[]})),'/internal/v1/owners/crm/session-contact-read':ownerRoute('crm','session-contact-read',['chat'],r=>summary.session(r.tenant_id,r.payload as Input)),'/internal/v1/owners/crm/contact-summary-read':ownerRoute('crm','contact-summary-read',['chat'],r=>summary.read(r.tenant_id,r.payload as Input)),'/internal/v1/owners/crm/contact-summary-batch':ownerRoute('crm','contact-summary-batch',['chat'],r=>summary.batch(r.tenant_id,r.payload as Input&{ids:string[]}))};}
