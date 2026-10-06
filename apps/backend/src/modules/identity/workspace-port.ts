import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError } from '../../kernel/reliability/commands.js';
// Reference checks stay with Identity; the caller holds the tenant authorization lock.
export class WorkspaceIdentityPort {
  async target(s:TransactionScope,kind:'principal'|'team',id:string){
    const rows=kind==='team'?await s.query('SELECT id FROM team WHERE tenant_id=? AND id=? AND active=1',[s.context.tenantId,id]):await s.query("SELECT p.id FROM principal p JOIN membership m ON m.tenant_id=p.tenant_id AND m.id=p.membership_id WHERE p.tenant_id=? AND p.id=? AND p.kind='human' AND p.status='active' AND m.status='active'",[s.context.tenantId,id]);
    if(!rows[0])throw new CommandError(422,'INVALID_SHARE_TARGET');
  }
}
