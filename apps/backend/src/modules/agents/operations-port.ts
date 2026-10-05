import type { DataSource } from 'typeorm';
import { UnitOfWork } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { IdentityAuthorization } from '../identity/authorization.js';
import { permits } from '../identity/domain/authorization.js';
import { conversation,requirePermission } from '../conversation/domain.js';
import { withFieldPolicies } from '../crm/access.js';
import { page } from '../operations/paging.js';
export class AgentOperations {
 private readonly auth:IdentityAuthorization;
 constructor(source:DataSource){this.auth=new IdentityAuthorization(new UnitOfWork(source));}
 list(account:string,tenant:string,query:Record<string,unknown>){return this.auth.runHuman(account,tenant,async(s,raw)=>{
  const a=await withFieldPolicies(s,raw),{limit,cursor}=page(query);if(!a.capabilities.includes('read')||!a.grants.some(g=>g.resource==='automation'&&g.action==='read'))throw new CommandError(403,'FORBIDDEN');
  const rows=await s.query('SELECT id,conversation_id,status,error_code,attention,created_at FROM agent_execution WHERE tenant_id=? AND id>? ORDER BY id LIMIT 201',[tenant,cursor]),data=[];let scanned=cursor;
  for(const r of rows.slice(0,200)){scanned=r.id;try{const c=await conversation(s,r.conversation_id);requirePermission(a,c.record,'read');if(!permits(a,'automation','read',c.record))continue;data.push({id:r.id,conversation_id:r.conversation_id,status:r.status,error_code:r.error_code,attention:!!r.attention,created_at:new Date(r.created_at).toISOString()});}catch(e){if(!(e instanceof CommandError&&[403,404].includes(e.status)))throw e;}if(data.length===limit)break;}
  return {data,next_cursor:rows.some((r:any)=>r.id>scanned)?scanned:null};
 });}
}
