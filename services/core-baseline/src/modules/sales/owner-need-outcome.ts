import type {Pool,PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerCommandRef,OwnerCommandProof,OwnerResource,OwnerOutcomeSource,OwnerOutcomeReceipt} from '@agentic-crm/contracts';
import {ownerBindingDigest,ownerCanonical,ownerDigest,ownerFail,OwnerDomainError,ownerRoute,validateOwnerValue,type WorkloadRoute} from '@agentic-crm/workload-transport';

type Policy={principal_id:string;auth_revision:string;allowed:boolean};
type Input={command:OwnerCommandRef;admission_id:string};
/** Sales-local source validation and permanent child receipt; no Chat/CRM SQL. */
export class NativeNeedOutcomeWriter{
 constructor(private readonly pool:Pool,private readonly proof:(tenant:string,command:OwnerCommandRef)=>Promise<OwnerCommandProof>,private readonly policy:(tenant:string,input:Input&{resource:OwnerResource})=>Promise<Policy>){}
 private async transaction<T>(work:(c:PoolConnection)=>Promise<T>){const c=await this.pool.getConnection();try{await c.query("SET time_zone='+00:00'");await c.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');await c.beginTransaction();const result=await work(c);await c.commit();return result;}catch(e){await c.rollback();throw e;}finally{c.release();}}
 private async parent(tenant:string,command:OwnerCommandRef){
  const proof=validateOwnerValue<OwnerCommandProof>('OwnerCommandProof',await this.proof(tenant,command)),b=proof.binding;
  if(!['need-post-outcome','need-outcome-effect'].includes(b.operation)||b.tenant_id!==tenant||b.owner!=='chat'||b.actor.kind!=='human'||b.resource.object_key!=='conversation'||!b.need||!b.outcome||!b.session_id||!b.projection||b.command_id!==command.command_id||proof.binding_digest!==command.binding_digest||ownerBindingDigest(b)!==command.binding_digest)ownerFail('FORBIDDEN');return proof;
 }
 private async source(c:PoolConnection,tenant:string,b:OwnerCommandProof['binding'],validateBinding=true):Promise<OwnerOutcomeSource>{
  const [[r]]=await c.execute<RowDataPacket[]>("SELECT r.id,r.version,r.owner_revision,r.owner_principal_id,r.team_id,r.archived_at,o.`key` object_key FROM crm_record r JOIN object_type o ON o.tenant_id=r.tenant_id AND o.id=r.object_type_id WHERE r.tenant_id=? AND r.id=? AND o.`key` IN ('lead','deal') AND o.archived_at IS NULL FOR SHARE",[tenant,b.outcome!.record_id]);if(!r||r.archived_at!==null)ownerFail('NOT_FOUND');
  const [shares]=await c.execute<RowDataPacket[]>('SELECT team_id FROM record_team_access WHERE tenant_id=? AND record_id=? ORDER BY team_id FOR SHARE',[tenant,r.id]);
  const resource:OwnerResource={resource_id:String(r.id),object_key:String(r.object_key),record_version:String(r.version),owner_revision:String(r.owner_revision),control_revision:'0',owner_principal_id:r.owner_principal_id,team_id:r.team_id,shared_team_ids:shares.map(s=>String(s.team_id)),archived:false};
  const [[record]]=await c.execute<RowDataPacket[]>(`SELECT contact_id FROM \`${r.object_key}\` WHERE tenant_id=? AND record_id=? FOR SHARE`,[tenant,r.id]),[[context]]=await c.execute<RowDataPacket[]>('SELECT id FROM sales_session_context WHERE tenant_id=? AND record_id=? AND conversation_id=? AND session_id=? ORDER BY id LIMIT 1 FOR SHARE',[tenant,r.id,b.resource.resource_id,b.session_id]);
  if(validateBinding&&(!record||record.contact_id!==b.projection!.contact_id||!context))throw new OwnerDomainError('OUTCOME_BINDING_MISMATCH',b.outcome!.correlation_id);
  return {resource,source_digest:ownerDigest({resource,contact_id:record?.contact_id??null,context_id:context?.id??null,conversation_id:b.resource.resource_id,session_id:b.session_id})};
 }
 private async allowed(tenant:string,b:OwnerCommandProof['binding'],input:Input,resource:OwnerResource){const result=await this.policy(tenant,{...input,resource});if(result.principal_id!==b.actor.principal_id||!result.allowed)ownerFail('FORBIDDEN');}
 async inspect(tenant:string,input:Input){
  const p=await this.parent(tenant,input.command);if(p.state!=='prepared'||p.binding.operation!=='need-post-outcome')ownerFail('FORBIDDEN');
  const source=await this.transaction(c=>this.source(c,tenant,p.binding,false));await this.allowed(tenant,p.binding,input,source.resource);
  return this.transaction(async c=>{if(ownerCanonical(await this.source(c,tenant,p.binding))!==ownerCanonical(source))ownerFail('STALE_VERSION');return source;});
 }
 async apply(tenant:string,command:OwnerCommandRef,aborting=false):Promise<OwnerOutcomeReceipt>{
  const p=await this.parent(tenant,command),b=p.binding,pin=b.outcome;if(b.operation!=='need-outcome-effect'||!pin?.source)ownerFail('FORBIDDEN');
  const dep=b.dependencies.find(d=>d.owner==='identity'&&d.binding_digest===command.binding_digest);
  if(!aborting){if(p.state!=='prepared'||!dep||!b.dependencies.some(d=>d.owner==='sales'&&d.receipt_id===command.command_id&&d.binding_digest===command.binding_digest))ownerFail('FORBIDDEN');await this.allowed(tenant,b,{command,admission_id:dep.receipt_id},pin.source!.resource);}
  return this.transaction(async c=>{
   const aborted:OwnerOutcomeReceipt={command,state:'aborted',record_id:null};
   if(aborting)await c.execute("INSERT INTO sales_owner_command(tenant_id,command_id,binding_digest,state,result_json,terminal_digest,terminal_at,version,created_at,updated_at) VALUES (?,?,?,'aborted',?,?,UTC_TIMESTAMP(6),1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE command_id=command_id",[tenant,command.command_id,command.binding_digest,ownerCanonical(aborted),ownerDigest(aborted)]);
   else await c.execute("INSERT INTO sales_owner_command(tenant_id,command_id,operation,binding_digest,actor_kind,actor_id,delegation_id,resource_kind,resource_id,record_version,owner_revision,control_revision,binding_json,request_json,admission_id,state,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'prepared',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE command_id=command_id",[tenant,command.command_id,'outcome-link',command.binding_digest,b.actor.kind,b.actor.principal_id,b.actor.delegation_id,pin.source!.resource.object_key,pin.record_id,pin.source!.resource.record_version,pin.source!.resource.owner_revision,'0',ownerCanonical(b),ownerCanonical({need:b.need,source_digest:pin.source!.source_digest}),dep!.receipt_id]);
   const [[row]]=await c.execute<RowDataPacket[]>('SELECT binding_digest,state,result_json FROM sales_owner_command WHERE tenant_id=? AND command_id=? FOR UPDATE',[tenant,command.command_id]);if(!row||row.binding_digest!==command.binding_digest)ownerFail('CONFLICT');
   if(row.state!=='prepared')return validateOwnerValue<OwnerOutcomeReceipt>('OwnerOutcomeReceipt',typeof row.result_json==='string'?JSON.parse(row.result_json):row.result_json);if(aborting)ownerFail('DEPENDENCY_UNAVAILABLE');
   if(ownerCanonical(await this.source(c,tenant,b))!==ownerCanonical(pin.source))ownerFail('STALE_VERSION');
   await c.execute('INSERT IGNORE INTO sales_need_outcome(tenant_id,need_id,record_id,conversation_id,session_id,actor_id,created_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6))',[tenant,b.need!.need_id,pin.record_id,b.resource.resource_id,b.session_id,b.actor.principal_id]);
   const [[link]]=await c.execute<RowDataPacket[]>('SELECT conversation_id,session_id FROM sales_need_outcome WHERE tenant_id=? AND need_id=? AND record_id=?',[tenant,b.need!.need_id,pin.record_id]);if(link!.conversation_id!==b.resource.resource_id||link!.session_id!==b.session_id)ownerFail('CONFLICT');
   const result:OwnerOutcomeReceipt={command,state:'committed',record_id:pin.record_id};await c.execute("UPDATE sales_owner_command SET state='committed',result_json=?,terminal_digest=?,terminal_at=UTC_TIMESTAMP(6),version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND command_id=?",[ownerCanonical(result),ownerDigest(result),tenant,command.command_id]);return result;
  });
 }
}
export function needOutcomeWriterRoutes(writer:NativeNeedOutcomeWriter):Record<string,WorkloadRoute>{return {
 '/internal/v1/owners/sales/outcome-link-inspect':ownerRoute('sales','outcome-link-inspect',['chat'],r=>writer.inspect(r.tenant_id,r.payload as Input)),
 '/internal/v1/owners/sales/outcome-link-apply':ownerRoute('sales','outcome-link-apply',['chat'],r=>writer.apply(r.tenant_id,validateOwnerValue<OwnerCommandRef>('OwnerCommandRef',r.payload))),
 '/internal/v1/owners/sales/outcome-link-abort':ownerRoute('sales','outcome-link-abort',['chat'],r=>writer.apply(r.tenant_id,validateOwnerValue<OwnerCommandRef>('OwnerCommandRef',r.payload),true)),
};}
