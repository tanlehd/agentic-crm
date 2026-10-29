import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { DurableCommands } from '../../kernel/reliability/commands.js';
// Caller holds tenant/Conversation lock. Release is safe even for suspended tenant.
export async function releaseExecution(s:TransactionScope,id:string){await s.query('UPDATE agent_capacity_slot SET released_at=COALESCE(released_at,UTC_TIMESTAMP(6)) WHERE tenant_id=? AND execution_id=?',[s.context.tenantId,id]);}
export async function cancelAgentExecutions(s:TransactionScope,conversation:string){
  const rows=await s.query("SELECT id FROM agent_execution WHERE tenant_id=? AND conversation_id=? AND status IN ('queued','running') FOR UPDATE",[s.context.tenantId,conversation]);
  for(const r of rows){await s.query("UPDATE agent_execution SET status='cancelled',error_code='OWNER_OR_STATE_CHANGED',updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?",[s.context.tenantId,r.id]);await s.query("UPDATE tool_execution SET status='cancelled' WHERE tenant_id=? AND agent_execution_id=?",[s.context.tenantId,r.id]);await releaseExecution(s,r.id);await new DurableCommands().systemAudit(s,r.id,'agent_execution',r.id,'runtime.cancel',['status']);}
}
