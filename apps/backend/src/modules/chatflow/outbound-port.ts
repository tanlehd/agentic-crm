import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { workflowActor } from '../identity/workflow-port.js';
import { RoutingIdentityPort } from '../identity/routing-port.js';
import { withFieldPolicies } from '../crm/access.js';
import { permits } from '../identity/domain/authorization.js';
// Only intents linked by the private Chatflow port can send as AI.
export async function chatflowOutboundAccess(s:TransactionScope,intent:{chatflow_session_id:string|null;conversation_id:string;actor_id:string;owner_revision:string}){
 const [r]=await s.query('SELECT * FROM chatflow_session WHERE tenant_id=? AND id=? AND conversation_id=?',[s.context.tenantId,intent.chatflow_session_id,intent.conversation_id]);
 if(!r||!['running','waiting_message','completed'].includes(r.status)||String(r.owner_revision)!==String(intent.owner_revision)||r.outcome==='disqualified')throw new CommandError(403,'FORBIDDEN');
 const service=await workflowActor(s,r.service_actor_id,r.execution_role_id);if(!permits(service,'conversation','read')||!permits(service,'conversation','assign'))throw new CommandError(403,'FORBIDDEN');
 const p=await new RoutingIdentityPort().principal(s,intent.actor_id,true);if(!p||p.kind!=='ai'||!p.available||p.runtimeAdapter!=='mock'||!p.actions.includes('conversation.reply')||!p.actions.includes('conversation.read')||!p.tools.includes('conversation.propose_reply'))throw new CommandError(403,'FORBIDDEN');return withFieldPolicies(s,p.access);
}
