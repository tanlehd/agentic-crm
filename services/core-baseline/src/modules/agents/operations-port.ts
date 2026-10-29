import type { DataSource } from 'typeorm';
import { UnitOfWork } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { IdentityAuthorization } from '../identity/authorization.js';
import { withFieldPolicies } from '../crm/access.js';
import { page } from '../operations/paging.js';
export class AgentOperations {
 private readonly auth:IdentityAuthorization;
 constructor(source:DataSource){this.auth=new IdentityAuthorization(new UnitOfWork(source));}
 list(account:string,tenant:string,query:Record<string,unknown>){return this.auth.runHuman(account,tenant,async(s,raw)=>{
  const a=await withFieldPolicies(s,raw),{cursor}=page(query);if(!a.capabilities.includes('read')||!a.grants.some(g=>g.resource==='automation'&&g.action==='read'))throw new CommandError(403,'FORBIDDEN');
  const rows=await s.query('SELECT id,conversation_id,status,error_code,attention,created_at FROM agent_execution WHERE tenant_id=? AND id>? ORDER BY id LIMIT 201',[tenant,cursor]);
  // Historical executions stay owned by AI; per-Conversation ACL needs its accepted remote adapter.
  if(rows.length)throw new CommandError(503,'AI_CHAT_UNAVAILABLE');
  return {data:[],next_cursor:null};
 });}
}
