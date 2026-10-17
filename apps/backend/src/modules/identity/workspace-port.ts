import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { PLATFORM_TENANT_ID } from '../../kernel/database/system-scope.js';
// Reference checks stay with Identity; the caller holds the tenant authorization lock.
export class WorkspaceIdentityPort {
  async inboxOptions(s:TransactionScope,teams:boolean,principals:boolean){
    const teamRows=teams?await s.query('SELECT id,name FROM team WHERE tenant_id=? AND active=1 ORDER BY name,id LIMIT 201',[s.context.tenantId]):[];
    const people=principals?await s.query("SELECT p.id,a.display_name name FROM principal p JOIN membership m ON m.tenant_id=p.tenant_id AND m.id=p.membership_id JOIN account a ON a.tenant_id=? AND a.id=m.account_id WHERE p.tenant_id=? AND p.kind='human' AND p.status='active' AND m.status='active' AND a.native_status='active' ORDER BY a.display_name,p.id LIMIT 501",[PLATFORM_TENANT_ID,s.context.tenantId]):[];
    if(teamRows.length>200||people.length>500)throw new CommandError(422,'OPTIONS_LIMIT_EXCEEDED');
    return {teams:teamRows as {id:string;name:string}[],principals:people as {id:string;name:string}[]};
  }
  async target(s:TransactionScope,kind:'principal'|'team',id:string){
    const rows=kind==='team'?await s.query('SELECT id FROM team WHERE tenant_id=? AND id=? AND active=1',[s.context.tenantId,id]):await s.query("SELECT p.id FROM principal p JOIN membership m ON m.tenant_id=p.tenant_id AND m.id=p.membership_id WHERE p.tenant_id=? AND p.id=? AND p.kind='human' AND p.status='active' AND m.status='active'",[s.context.tenantId,id]);
    if(!rows[0])throw new CommandError(422,'INVALID_SHARE_TARGET');
  }
}
