import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { parseGrants,seatCapabilities,type Access } from './domain/authorization.js';
import { validateOwnershipTarget } from './authorization.js';
export interface RoutingPrincipal { id:string;kind:'human'|'ai';available:boolean;access:Access;maxConcurrency:number;actions:string[];tools:string[];policyId:string|null;policyVersion:string;timeoutMs:number;maxToolCalls:number;runtimeAdapter:string|null }
// Identity owns all SQL for principal/membership/team/policy projections.
export class RoutingIdentityPort {
  async team(s:TransactionScope,id:string|null){await validateOwnershipTarget(s,null,id);}
  async chatTeam(s:TransactionScope,id:string){await this.team(s,id);const [t]=await s.query('SELECT purpose FROM team WHERE tenant_id=? AND id=?',[s.context.tenantId,id]);if(!['chat','general'].includes(t?.purpose))throw new CommandError(422,'CHAT_TEAM_REQUIRED');}
  async candidates(s:TransactionScope,team:string|null):Promise<string[]>{return (await s.query(`SELECT p.id FROM principal p ${team?'JOIN team_member tm ON tm.tenant_id=p.tenant_id AND tm.principal_id=p.id AND tm.team_id=? AND tm.active=1':''} WHERE p.tenant_id=? ORDER BY p.id`,team?[team,s.context.tenantId]:[s.context.tenantId])).map((r:any)=>r.id);}
  async principal(s:TransactionScope,id:string,lock=false):Promise<RoutingPrincipal|null>{
    const tenant=s.context.tenantId;
    if(lock)await s.query('SELECT id FROM principal WHERE tenant_id=? AND id=? FOR UPDATE',[tenant,id]);
    const [p]=await s.query(`SELECT p.*,m.status membership_status,m.seat_code,a.max_concurrency,a.runtime_adapter,pol.id policy_id,pol.version policy_version,pol.timeout_ms,pol.max_tool_calls,pol.allowed_actions,pol.allowed_tools FROM principal p LEFT JOIN membership m ON m.tenant_id=p.tenant_id AND m.id=p.membership_id LEFT JOIN ai_agent a ON a.tenant_id=p.tenant_id AND a.id=p.ai_agent_id LEFT JOIN agent_policy pol ON pol.tenant_id=a.tenant_id AND pol.id=a.policy_id WHERE p.tenant_id=? AND p.id=?`,[tenant,id]);
    if(!p)return null;
    const roles=await s.query('SELECT r.id,r.permissions FROM principal_role pr JOIN `role` r ON r.tenant_id=pr.tenant_id AND r.id=pr.role_id WHERE pr.tenant_id=? AND pr.principal_id=?',[tenant,id]);
    const teams=await s.query('SELECT tm.team_id FROM team_member tm JOIN team t ON t.tenant_id=tm.tenant_id AND t.id=tm.team_id WHERE tm.tenant_id=? AND tm.principal_id=? AND tm.active=1 AND t.active=1',[tenant,id]);
    const array=(value:any):string[]=>{const a=typeof value==='string'?JSON.parse(value):value;return Array.isArray(a)&&a.every(x=>typeof x==='string')?a:[];};
    return {id,kind:p.kind,policyId:p.policy_id??null,policyVersion:String(p.policy_version??0),timeoutMs:Number(p.timeout_ms??0),maxToolCalls:Number(p.max_tool_calls??0),runtimeAdapter:p.runtime_adapter??null,available:p.status==='active'&&p.availability==='available'&&(p.kind==='ai'?!!p.max_concurrency:p.membership_status==='active'),maxConcurrency:Number(p.max_concurrency??0),actions:array(p.allowed_actions),tools:array(p.allowed_tools),access:{tenantId:tenant,principalId:id,revision:String(p.auth_revision),capabilities:p.kind==='human'?seatCapabilities(p.seat_code):['read','chat','sales'],grants:roles.flatMap((r:any)=>parseGrants(r.permissions)),roleIds:roles.map((r:any)=>r.id),teamIds:teams.map((r:any)=>r.team_id),fieldDenies:[]}};
  }
  async locale(s:TransactionScope){const [t]=await s.query('SELECT locale,timezone FROM tenant WHERE id=?',[s.context.tenantId]);return {locale:t.locale as string,timezone:t.timezone as string};}
  async service(s:TransactionScope,id:string):Promise<Access>{
    const [actor]=await s.query('SELECT s.auth_revision,r.id role_id,r.permissions FROM service_actor s JOIN `role` r ON r.tenant_id=s.tenant_id AND r.id=s.role_id WHERE s.tenant_id=? AND s.id=? AND s.active=1',[s.context.tenantId,id]);
    if(!actor)throw new CommandError(403,'FORBIDDEN');
    return {tenantId:s.context.tenantId,principalId:id,revision:String(actor.auth_revision),capabilities:['read','chat','sales'],grants:parseGrants(actor.permissions).filter(g=>g.scope==='all'),roleIds:[actor.role_id],teamIds:[],fieldDenies:[]};
  }
}
