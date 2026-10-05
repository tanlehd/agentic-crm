import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError } from '../../kernel/reliability/commands.js';
export async function chatflowExecutionStatus(s:TransactionScope,id:string,session:string){const [r]=await s.query('SELECT status FROM agent_execution WHERE tenant_id=? AND id=? AND session_id=?',[s.context.tenantId,id,session]);if(!r)throw new CommandError(409,'SESSION_NOT_AVAILABLE');return r.status as string;}
