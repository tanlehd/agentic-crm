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

// Reference labels for an already authorized automation designer, never role bodies.
export async function workflowIdentityOptions(s:TransactionScope){
  const actors=await s.query('SELECT a.id,a.`key`,a.role_id,r.name role_name FROM service_actor a JOIN `role` r ON r.tenant_id=a.tenant_id AND r.id=a.role_id WHERE a.tenant_id=? AND a.active=1 ORDER BY a.id LIMIT 201',[s.context.tenantId]);
  const teams=await s.query('SELECT id,name,purpose FROM team WHERE tenant_id=? AND active=1 ORDER BY id LIMIT 201',[s.context.tenantId]);
  return {actors,teams};
}
