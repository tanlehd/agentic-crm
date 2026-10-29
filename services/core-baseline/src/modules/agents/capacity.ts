import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { RoutingIdentityPort } from '../identity/routing-port.js';
import { requireActiveTenant } from '../identity/authorization.js';
import { uuid } from '../identity/admin.js';
// Runtime must reserve in the same UoW as execution -> running. No public API.
export class AgentCapacity {
  constructor(private readonly identity=new RoutingIdentityPort()){}
  async running(s:TransactionScope,principal:string):Promise<number>{const [r]=await s.query('SELECT COUNT(*) n FROM agent_capacity_slot WHERE tenant_id=? AND principal_id=? AND released_at IS NULL AND expires_at>UTC_TIMESTAMP(6)',[s.context.tenantId,principal]);return Number(r.n);}
  async reserve(s:TransactionScope,principal:string,execution:string,ttlMs=30000):Promise<boolean>{
    if(!uuid(principal)||!uuid(execution)||!Number.isInteger(ttlMs)||ttlMs<1||ttlMs>30000)throw new CommandError(400,'INVALID_REQUEST');
    await requireActiveTenant(s,true);const p=await this.identity.principal(s,principal,true);
    if(!p||p.kind!=='ai'||!p.available)throw new CommandError(403,'TARGET_INELIGIBLE');
    const [old]=await s.query('SELECT principal_id,released_at,expires_at>UTC_TIMESTAMP(6) live FROM agent_capacity_slot WHERE tenant_id=? AND execution_id=?',[s.context.tenantId,execution]);
    if(old){if(old.principal_id!==principal)throw new CommandError(409,'EXECUTION_CONFLICT');return !old.released_at&&Number(old.live)===1;}
    if(await this.running(s,principal)>=p.maxConcurrency)return false;
    await s.query('INSERT INTO agent_capacity_slot(tenant_id,execution_id,principal_id,expires_at) VALUES (?,?,?,TIMESTAMPADD(MICROSECOND,?,UTC_TIMESTAMP(6)))',[s.context.tenantId,execution,principal,ttlMs*1000]);return true;
  }
  async release(s:TransactionScope,principal:string,execution:string){await requireActiveTenant(s,true);await this.identity.principal(s,principal,true);await s.query('UPDATE agent_capacity_slot SET released_at=COALESCE(released_at,UTC_TIMESTAMP(6)) WHERE tenant_id=? AND execution_id=? AND principal_id=?',[s.context.tenantId,execution,principal]);}
}
