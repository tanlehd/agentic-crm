import type {Pool,PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerCommandRef,OwnerCommandProof,OwnerResource} from '@agentic-crm/contracts';
import {ownerBindingDigest,ownerCanonical,ownerFail,OwnerDomainError,ownerRoute,validateOwnerValue,type WorkloadRoute} from '@agentic-crm/workload-transport';
type Input={command:OwnerCommandRef;admission_id:string;ids:string[]};
type Policy={principal_id:string;auth_revision:string;visible_ids:string[]};

/** Sales-owned context visibility only; never reads Chat session or CRM Contact tables. */
export class NativeSalesContributions{
 constructor(private readonly pool:Pool,private readonly proof:(tenant:string,command:OwnerCommandRef)=>Promise<OwnerCommandProof>,private readonly policy:(tenant:string,input:{command:OwnerCommandRef;admission_id:string;resources:OwnerResource[]})=>Promise<Policy>,private readonly needPolicy?:(tenant:string,input:{command:OwnerCommandRef;admission_id:string;resources:OwnerResource[]})=>Promise<{principal_id:string;auth_revision:string;data:{id:string;visible:boolean;can_link:boolean}[]}>){}
 private async snapshot(c:PoolConnection,tenant:string,conversation:string,session:string,ids:string[]){
  if(!ids.length)return [];
  const [rows]=await c.execute<RowDataPacket[]>(`SELECT x.id context_id,r.id,r.version,r.owner_revision,r.owner_principal_id,r.team_id,r.archived_at,o.\`key\` object_key FROM sales_session_context x JOIN crm_record r ON r.tenant_id=x.tenant_id AND r.id=x.record_id JOIN object_type o ON o.tenant_id=r.tenant_id AND o.id=r.object_type_id AND o.\`key\` IN ('lead','deal') WHERE x.tenant_id=? AND x.conversation_id=? AND x.session_id=? AND x.id IN (${ids.map(()=>'?').join(',')}) ORDER BY x.id`,[tenant,conversation,session,...ids]);
  const records=[...new Set(rows.map(r=>String(r.id)))];
  const [shares]=records.length?await c.execute<RowDataPacket[]>(`SELECT record_id,team_id FROM record_team_access WHERE tenant_id=? AND record_id IN (${records.map(()=>'?').join(',')}) ORDER BY record_id,team_id`,[tenant,...records]):[[]];
  return rows.map(r=>({context_id:String(r.context_id),resource:{resource_id:String(r.id),object_key:String(r.object_key),record_version:String(r.version),owner_revision:String(r.owner_revision),control_revision:'0',owner_principal_id:r.owner_principal_id as string|null,team_id:r.team_id as string|null,shared_team_ids:shares.filter(s=>s.record_id===r.id).map(s=>String(s.team_id)),archived:r.archived_at!==null} satisfies OwnerResource}));
 }
 private async transaction<T>(work:(c:PoolConnection)=>Promise<T>){const c=await this.pool.getConnection();try{await c.beginTransaction();const result=await work(c);await c.commit();return result;}catch(error){await c.rollback();throw error;}finally{c.release();}}
 async visible(tenant:string,input:Input){
  const proof=validateOwnerValue<OwnerCommandProof>('OwnerCommandProof',await this.proof(tenant,input.command)),b=proof.binding;
  if(proof.state!=='prepared'||b.tenant_id!==tenant||b.owner!=='chat'||b.actor.kind!=='human'||b.operation!=='conversation-classification-get-conversations-conversation-sessions-session-contributions'||b.resource.object_key!=='conversation'||!b.session_id||!b.projection||b.command_id!==input.command.command_id||proof.binding_digest!==input.command.binding_digest||ownerBindingDigest(b)!==proof.binding_digest)ownerFail('FORBIDDEN');
  const snapshot=await this.transaction(c=>this.snapshot(c,tenant,b.resource.resource_id,b.session_id!,input.ids)),resources=[...new Map(snapshot.map(r=>[r.resource.resource_id,r.resource])).values()];
  const visible:string[]=[];let revision:string|undefined;
  for(let offset=0;offset<Math.max(resources.length,1);offset+=25){
   const batch=resources.slice(offset,offset+25),decision=await this.policy(tenant,{command:input.command,admission_id:input.admission_id,resources:batch});if(decision.principal_id!==b.actor.principal_id||decision.visible_ids.some(id=>!batch.some(r=>r.resource_id===id))||revision!==undefined&&revision!==decision.auth_revision)ownerFail('FORBIDDEN');revision=decision.auth_revision;visible.push(...decision.visible_ids);
  }
  return this.transaction(async c=>{if(ownerCanonical(await this.snapshot(c,tenant,b.resource.resource_id,b.session_id!,input.ids))!==ownerCanonical(snapshot))ownerFail('STALE_VERSION');return {visible_ids:snapshot.filter(r=>visible.includes(r.resource.resource_id)).map(r=>r.context_id)};});
 }
 async needs(tenant:string,input:Omit<Input,'ids'>){
  if(!this.needPolicy)ownerFail('DEPENDENCY_UNAVAILABLE');
  const proof=validateOwnerValue<OwnerCommandProof>('OwnerCommandProof',await this.proof(tenant,input.command)),b=proof.binding;
  if(proof.state!=='prepared'||b.tenant_id!==tenant||b.owner!=='chat'||b.actor.kind!=='human'||b.operation!=='need-get-assessment'||b.resource.object_key!=='conversation'||!b.session_id||!b.projection||!b.need||b.command_id!==input.command.command_id||proof.binding_digest!==input.command.binding_digest||ownerBindingDigest(b)!==proof.binding_digest)ownerFail('FORBIDDEN');
  const collect=async(c:PoolConnection)=>{
   const [contexts]=await c.execute<RowDataPacket[]>(`SELECT x.record_id,MIN(x.id) context_id,EXISTS(SELECT 1 FROM sales_need_outcome n WHERE n.tenant_id=x.tenant_id AND n.need_id=? AND n.record_id=x.record_id) linked FROM sales_session_context x WHERE x.tenant_id=? AND x.conversation_id=? AND x.session_id=? GROUP BY x.tenant_id,x.record_id ORDER BY x.record_id LIMIT 101`,[b.need!.need_id,tenant,b.resource.resource_id,b.session_id!]);
   if(contexts.length>100)throw new OwnerDomainError('OUTCOME_LIMIT_EXCEEDED',b.command_id);
   const records=await this.snapshot(c,tenant,b.resource.resource_id,b.session_id!,contexts.map(r=>String(r.context_id)));
   return records.map(r=>({...r,linked:Boolean(Number(contexts.find(x=>x.context_id===r.context_id)!.linked))}));
  };
  const snapshot=await this.transaction(collect),decisions:{id:string;visible:boolean;can_link:boolean}[]=[];let revision:string|undefined;
  for(let offset=0;offset<Math.max(snapshot.length,1);offset+=25){const resources=snapshot.slice(offset,offset+25).map(r=>r.resource),policy=await this.needPolicy(tenant,{command:input.command,admission_id:input.admission_id,resources});if(policy.principal_id!==b.actor.principal_id||policy.data.length!==resources.length||new Set(policy.data.map(d=>d.id)).size!==resources.length||policy.data.some(d=>!resources.some(r=>r.resource_id===d.id))||revision!==undefined&&revision!==policy.auth_revision)ownerFail('FORBIDDEN');revision=policy.auth_revision;decisions.push(...policy.data);}
  return this.transaction(async c=>{if(ownerCanonical(await collect(c))!==ownerCanonical(snapshot))ownerFail('STALE_VERSION');return {data:snapshot.filter(r=>decisions.find(d=>d.id===r.resource.resource_id)!.visible).map(r=>({id:r.resource.resource_id,label:(r.resource.object_key==='lead'?'Lead':'Deal')+' '+r.resource.resource_id.slice(-8),linked:r.linked,can_link:decisions.find(d=>d.id===r.resource.resource_id)!.can_link}))};});
 }
}
export function salesContributionRoutes(source:NativeSalesContributions):Record<string,WorkloadRoute>{return {'/internal/v1/owners/sales/need-outcomes-list':ownerRoute('sales','need-outcomes-list',['chat'],r=>source.needs(r.tenant_id,r.payload as Omit<Input,'ids'>)),'/internal/v1/owners/sales/contribution-sources-read':ownerRoute('sales','contribution-sources-read',['chat'],r=>source.visible(r.tenant_id,r.payload as Input))};}
