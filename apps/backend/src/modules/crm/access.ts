import type { Access, RecordAccess } from '../identity/domain/authorization.js';
import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError } from '../../kernel/reliability/commands.js';
export function allows(access:Access,resource:string,action:string,record?:RecordAccess):boolean {
  const capable=resource==='schema'?access.capabilities.includes('configure'):action==='read'?access.capabilities.includes('read'):['create','update','assign','archive','qualify'].includes(action)&&access.capabilities.some(c=>['chat','sales','service'].includes(c));
  if(!capable || record&&record.tenantId!==access.tenantId)return false;
  return access.grants.some(g=>g.resource===resource&&g.action===action&&(g.scope==='all'||!!record&&(g.scope==='own'?record.ownerPrincipalId===access.principalId:g.scope==='team'&&access.teamIds.some(t=>t===record.teamId||record.sharedTeamIds.includes(t)))));
}
export async function withFieldPolicies(scope:TransactionScope,access:Access):Promise<Access>{
  if(scope.context.tenantId!==access.tenantId)throw new CommandError(403,'FORBIDDEN');
  const roles=access.roleIds??[];
  if(!roles.length)return access;
  const rows=await scope.query(`SELECT o.\`key\` resource,f.property_key field,f.denied_actions actions FROM field_policy f JOIN object_type o ON o.tenant_id=f.tenant_id AND o.id=f.object_type_id WHERE f.tenant_id=? AND f.role_id IN (${roles.map(()=>'?').join(',')})`,[access.tenantId,...roles]);
  return {...access,fieldDenies:[...access.fieldDenies,...rows.map((r:any)=>{
    const actions=typeof r.actions==='string'?JSON.parse(r.actions):r.actions;
    if(!Array.isArray(actions)||actions.some(a=>!['read','write','filter','export'].includes(a)))throw new CommandError(403,'FORBIDDEN');
    return {...r,actions};
  })]};
}
