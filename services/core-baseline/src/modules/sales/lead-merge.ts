import { CommandError,DurableCommands } from '../../kernel/reliability/commands.js';
import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import type { Access } from '../identity/domain/authorization.js';
import { CrmRecords } from '../crm/records.js';
import { RecordRegistry } from '../crm/registry.js';
import { allows,withFieldPolicies } from '../crm/access.js';
import { object,checkField,fieldError } from '../crm/properties.js';
import { contactReferences } from '../crm/core.js';
import { uuid } from '../identity/admin.js';
import { sourceKeys } from './source.js';

export class LeadMerge {
 constructor(private readonly records:CrmRecords){}
 async history(account:string,tenant:string,id:string){
  if(!uuid(id))throw new CommandError(400,'INVALID_REQUEST');
  return this.records.authorization.runHuman(account,tenant,async(s,raw)=>{
   const a=await withFieldPolicies(s,raw),registry=new RecordRegistry(),r=await registry.get(s,id);registry.read(a,r);if(r.objectKey!=='lead')throw new CommandError(404,'NOT_FOUND');
   checkField(a,'lead','qualification','read');
   const rows=await s.query('SELECT source_id,target_id,recorded_at FROM lead_merge WHERE tenant_id=? AND (source_id=? OR target_id=?) ORDER BY recorded_at DESC,source_id LIMIT 51',[tenant,id,id]),data=[];
   for(const row of rows.slice(0,50)){try{registry.read(a,await registry.get(s,row.source_id));registry.read(a,await registry.get(s,row.target_id));data.push(row);}catch(e){if(e instanceof CommandError&&e.status===404)continue;throw e;}}
   return {data,has_more:rows.length>50};
  });
 }
 private async pair(s:TransactionScope,a:Access,source:string,target:string){
  if(!uuid(source)||!uuid(target)||source===target)throw new CommandError(422,'INVALID_MERGE');
  const registry=new RecordRegistry(),rs=new Map();
  for(const id of [source,target].sort()){
   const r=await registry.get(s,id,true);registry.read(a,r);if(r.objectKey!=='lead')throw new CommandError(404,'NOT_FOUND');
   if(!allows(a,'lead','qualify',r)||id===source&&!allows(a,'lead','archive',r))throw new CommandError(403,'FORBIDDEN');
   for(const f of ['contact_id','status','qualification',...sourceKeys])checkField(a,'lead',f,'read');rs.set(id,r);
  }
  const [src]=await s.query('SELECT * FROM `lead` WHERE tenant_id=? AND record_id=?',[s.context.tenantId,source]),[dst]=await s.query('SELECT * FROM `lead` WHERE tenant_id=? AND record_id=?',[s.context.tenantId,target]);
  if(src.contact_id!==dst.contact_id)throw new CommandError(422,'CONTACT_BINDING_MISMATCH');await contactReferences.requireActive(s,a,src.contact_id);
  return {registry,source:rs.get(source),target:rs.get(target),src,dst};
 }
 private async eligible(s:TransactionScope,p:Awaited<ReturnType<LeadMerge['pair']>>){
  if(p.source.archived||p.target.archived||[p.src.status,p.dst.status].includes('disqualified'))throw new CommandError(409,'INVALID_TRANSITION');

  if((await s.query("SELECT id FROM lead_handoff WHERE tenant_id=? AND lead_id IN (?,?) AND status='pending' LIMIT 1",[s.context.tenantId,p.source.id,p.target.id])).length)throw new CommandError(409,'ACTIVE_DEPENDENCY');
  if((await s.query('SELECT source_id FROM lead_merge WHERE tenant_id=? AND (source_id IN (?,?) OR target_id=?) LIMIT 1',[s.context.tenantId,p.source.id,p.target.id,p.source.id])).length)throw new CommandError(409,'MERGE_CHAIN_NOT_ALLOWED');
 }
 async preview(account:string,tenant:string,id:string,input:unknown){
  const b=object(input,['target_id']);
  return this.records.authorization.runHuman(account,tenant,async(s,raw)=>{
   const a=await withFieldPolicies(s,raw),p=await this.pair(s,a,id,b.target_id);await this.eligible(s,p);
   return {data:{source:await this.records.output(s,a,p.source),target:await this.records.output(s,a,p.target),policy:'retain_target_and_preserve_source_history'}};
  });
 }
 async merge(account:string,tenant:string,id:string,input:unknown,key:string,version:string|undefined,correlation:string){
  if(!version)throw new CommandError(428,'PRECONDITION_REQUIRED');
  const b=object(input,['target_id','target_version','reason']);if(!/^[1-9][0-9]{0,19}$/.test(version)||typeof b.target_version!=='string'||!/^[1-9][0-9]{0,19}$/.test(b.target_version)||!key||key.length>128||!/^[\x21-\x7e]+$/.test(key))throw new CommandError(400,'INVALID_REQUEST');
  if(typeof b.reason!=='string'||!b.reason.trim()||b.reason.length>1000)fieldError('reason');
  return this.records.uow.run({tenantId:tenant},async s=>{
   const a=await withFieldPolicies(s,await this.records.authorization.loadHuman(s,account,undefined,true)),p=await this.pair(s,a,id,b.target_id),commands=new DurableCommands();
   const cmd={actorId:a.principalId,correlationId:correlation,route:`POST /api/v1/leads/${id}/merge`,key,body:b,version};const replay=await commands.replay(s,cmd,async()=>{});if(replay)return replay;
   await this.eligible(s,p);
   await p.registry.bump(s,p.source,version);await p.registry.bump(s,p.target,b.target_version);
   await s.query('INSERT INTO lead_merge(tenant_id,source_id,target_id,actor_id,source_version,target_version,reason,recorded_at) VALUES (?,?,?,?,?,?,?,UTC_TIMESTAMP(6))',[tenant,id,b.target_id,a.principalId,version,b.target_version,b.reason.trim()]);
   await s.query('UPDATE crm_record SET archived_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[tenant,id]);
   await commands.audit(s,a.principalId,correlation,'lead',id,'lead.merge',['archived_at','canonical_lead_id']);
   await commands.audit(s,a.principalId,correlation,'lead',b.target_id,'lead.merge_target',['version']);
   const response={status:200,body:{data:{id,version:String(BigInt(version)+1n),target_id:b.target_id,target_version:String(BigInt(b.target_version)+1n),archived:true},meta:{correlation_id:correlation}}};await commands.complete(s,cmd,response);return response;
  });
 }
}
