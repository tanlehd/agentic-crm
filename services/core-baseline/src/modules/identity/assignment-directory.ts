import type { OwnerCommandBinding } from '@agentic-crm/contracts';
import { ownerFail } from '@agentic-crm/workload-transport';
import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { fieldAllowed, permits, principalPermissions, seatCapabilities, type Access, type FieldAction } from './domain/authorization.js';

/** Bounded Identity-only directory. AI execution/policy is intentionally deferred. */
export async function assignmentDirectory(scope: TransactionScope, b: OwnerCommandBinding, object: string) {
  const tenant=scope.context.tenantId, team=b.target!.team_id;
  if(!['routing-targets','routing-proposal'].includes(b.operation)) {
    const teams=await scope.query('SELECT id,name,purpose FROM team WHERE tenant_id=? AND active=1 ORDER BY name,id LIMIT 201',[tenant]);
    if(teams.length>200)ownerFail('LIMIT_EXCEEDED');
    return {candidates:[],teams};
  }
  if(team&&!(await scope.query('SELECT id FROM team WHERE tenant_id=? AND id=? AND active=1',[tenant,team])).length)ownerFail('REFERENCE_INVALID');
  const rows=await scope.query(`SELECT p.id,p.kind,p.status,p.availability,p.auth_revision,m.status membership_status,m.seat_code
    FROM principal p LEFT JOIN membership m ON m.tenant_id=p.tenant_id AND m.id=p.membership_id
    ${team?'JOIN team_member selected ON selected.tenant_id=p.tenant_id AND selected.principal_id=p.id AND selected.team_id=? AND selected.active=1':''}
    WHERE p.tenant_id=? ORDER BY p.id LIMIT 201`,team?[team,tenant]:[tenant]);
  if(rows.length>200)ownerFail('LIMIT_EXCEEDED');
  const ids=rows.filter((p:{kind:string})=>p.kind==='human').map((p:{id:string})=>p.id),slots=ids.map(()=>'?').join(',');
  const roles=ids.length?await scope.query(`SELECT pr.principal_id,r.id,r.\`key\`,r.permissions FROM principal_role pr JOIN \`role\` r ON r.tenant_id=pr.tenant_id AND r.id=pr.role_id WHERE pr.tenant_id=? AND pr.principal_id IN (${slots})`,[tenant,...ids]):[];
  const teams=ids.length?await scope.query(`SELECT tm.principal_id,tm.team_id FROM team_member tm JOIN team t ON t.tenant_id=tm.tenant_id AND t.id=tm.team_id WHERE tm.tenant_id=? AND tm.principal_id IN (${slots}) AND tm.active=1 AND t.active=1`,[tenant,...ids]):[];
  const roleIds=[...new Set<string>(roles.map((r:{id:string})=>r.id))];
  const policies=roleIds.length?await scope.query(`SELECT role_id,property_key,denied_actions FROM field_policy WHERE tenant_id=? AND object_type_id=? AND property_key='text' AND role_id IN (${roleIds.map(()=>'?').join(',')})`,[tenant,object,...roleIds]):[];
  const candidates=rows.map((p:any)=>{
    if(p.kind!=='human')return {id:p.id,kind:'ai' as const,eligible:false,reason:'policy' as const};
    const ownRoles=roles.filter((r:any)=>r.principal_id===p.id),ownRoleIds=ownRoles.map((r:any)=>r.id);
    const access:Access={tenantId:tenant,principalId:p.id,revision:String(p.auth_revision),capabilities:seatCapabilities(p.seat_code),...principalPermissions('human',p.seat_code,ownRoles,p.status==='active'&&p.membership_status==='active'),roleIds:ownRoleIds,teamIds:teams.filter((t:any)=>t.principal_id===p.id).map((t:any)=>t.team_id),fieldDenies:policies.filter((f:any)=>ownRoleIds.includes(f.role_id)).map((f:any)=>{
      const actions=typeof f.denied_actions==='string'?JSON.parse(f.denied_actions):f.denied_actions;
      if(!Array.isArray(actions)||actions.some(a=>!['read','write','filter','export'].includes(a)))ownerFail('FORBIDDEN');
      return {resource:'conversation',field:f.property_key,actions:actions as FieldAction[]};
    })};
    const record={tenantId:tenant,ownerPrincipalId:p.id,teamId:team,sharedTeamIds:b.resource.shared_team_ids};
    const reason=p.status!=='active'||p.availability!=='available'||p.membership_status!=='active'?'unavailable':team&&!access.teamIds.includes(team)?'team':!access.capabilities.includes('chat')?'capability':!permits(access,'conversation','read',record)||!permits(access,'conversation','reply',record)?'role':!fieldAllowed(access,'conversation','text','read')||!fieldAllowed(access,'conversation','text','write')?'field':null;
    return {id:p.id,kind:'human' as const,eligible:reason===null,reason};
  });
  return {candidates,teams:[]};
}
