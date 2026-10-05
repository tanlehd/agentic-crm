import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { RoutingIdentityPort } from './routing-port.js';
import { requireActiveTenant } from './authorization.js';
import { withFieldPolicies } from '../crm/access.js';
export async function workflowActor(s:TransactionScope,actor:string,role?:string){
  await requireActiveTenant(s,true);
  await s.query('SELECT id FROM service_actor WHERE tenant_id=? AND id=? FOR UPDATE',[s.context.tenantId,actor]);
  const a=await new RoutingIdentityPort().service(s,actor);
  if(role&&!a.roleIds?.includes(role))throw new CommandError(403,'WORKFLOW_ROLE_REVOKED');
  return withFieldPolicies(s,a);
}

// Recovery/cancel must lock consistently even when the tenant has been suspended.
export async function lockWorkflowTenant(s:TransactionScope){await s.query('SELECT id FROM tenant WHERE id=? FOR UPDATE',[s.context.tenantId]);}
