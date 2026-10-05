import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError } from '../../kernel/reliability/commands.js';
export async function chatflowParent(s:TransactionScope,id:string,conversation:string,actor:string,allowCompleted=false){
 const [r]=await s.query('SELECT r.status,r.service_actor_id,r.context,v.execution_role_id FROM workflow_run r JOIN workflow_version v ON v.tenant_id=r.tenant_id AND v.id=r.version_id WHERE r.tenant_id=? AND r.id=? FOR UPDATE',[s.context.tenantId,id]);
 const context=typeof r?.context==='string'?JSON.parse(r.context):r?.context;
 if(!r||![...['queued','running','waiting'],...(allowCompleted?['completed']:[])].includes(r.status)||r.service_actor_id!==actor||context.trigger.aggregate_id!==conversation)throw new CommandError(409,'CHATFLOW_PARENT_INVALID');return r.execution_role_id as string;
}
