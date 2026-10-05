import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { RoutingIdentityPort } from '../identity/routing-port.js';
import { allows,withFieldPolicies } from '../crm/access.js';
import type { RegistryRecord } from '../crm/registry.js';
// Human-only M2 handoff selection. Does not mutate CRM ownership.
export async function selectSalesHuman(s:TransactionScope,r:RegistryRecord,team:string){
 const identity=new RoutingIdentityPort();await identity.salesTeam(s,team);
 await s.query("INSERT INTO routing_cursor(tenant_id,team_id,capability_key) VALUES (?,?,'sales') ON DUPLICATE KEY UPDATE capability_key=VALUES(capability_key)",[s.context.tenantId,team]);
 const [cursor]=await s.query("SELECT last_principal_id FROM routing_cursor WHERE tenant_id=? AND team_id=? AND capability_key='sales' FOR UPDATE",[s.context.tenantId,team]);
 const ids=await identity.candidates(s,team),ordered=[...ids.filter(x=>x>(cursor.last_principal_id??'')),...ids.filter(x=>x<=(cursor.last_principal_id??''))];
 for(const id of ordered){const p=await identity.principal(s,id,true);if(!p||p.kind!=='human'||!p.available||!p.access.teamIds.includes(team)||!p.access.capabilities.includes('sales'))continue;const a=await withFieldPolicies(s,p.access),target={...r,ownerPrincipalId:id,teamId:team};if(!allows(a,'lead','read',target)||!allows(a,'lead','accept',target))continue;await s.query("UPDATE routing_cursor SET last_principal_id=? WHERE tenant_id=? AND team_id=? AND capability_key='sales'",[id,s.context.tenantId,team]);return id;}
 return null;
}
