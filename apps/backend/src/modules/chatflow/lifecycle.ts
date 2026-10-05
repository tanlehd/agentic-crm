import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError } from '../../kernel/reliability/commands.js';
export async function stopSessions(s:TransactionScope,conversation:string,cancel=false){
  const rows=await s.query("SELECT id FROM chatflow_session WHERE tenant_id=? AND conversation_id=? AND status IN('running','waiting_message','paused_human') FOR UPDATE",[s.context.tenantId,conversation]);
  for(const r of rows){await s.query("UPDATE chatflow_session SET status=?,error_code=?,version=version+1 WHERE tenant_id=? AND id=?",[cancel?'cancelled':'paused_human',cancel?'CONVERSATION_CLOSED':'OWNER_CHANGED',s.context.tenantId,r.id]);await s.query("UPDATE chatflow_node_run SET lease_until=NULL,fencing_token=fencing_token+1,status='cancelled' WHERE tenant_id=? AND session_id=? AND status<>'succeeded'",[s.context.tenantId,r.id]);}
}
export async function requireInactiveSession(s:TransactionScope,id:string|null){if(!id)return;const [r]=await s.query("SELECT id FROM chatflow_session WHERE tenant_id=? AND id=? AND status IN('running','waiting_message','paused_human')",[s.context.tenantId,id]);if(r)throw new CommandError(409,'SESSION_ORCHESTRATION_REQUIRED');}
