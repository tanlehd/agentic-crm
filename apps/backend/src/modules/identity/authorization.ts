import { UnitOfWork, type TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { parseGrants, seatCapabilities, type Access } from './domain/authorization.js';
export class AccessError extends Error {
  constructor(readonly code: 'FORBIDDEN' | 'STALE_AUTHORIZATION') { super(code); }
}
export interface AuthorizationStamp { tenantId: string; principalId: string; revision: string }
// accountId must come from the authenticated session; never from request body/header.
// All identity writers must hold tenant FOR UPDATE before changing ACL/revisions.
// The shared tenant lock covers authorization through business commit, preventing
// a revocation from racing between the check and a transactional side effect.
export class IdentityAuthorization {
  constructor(private readonly uow: UnitOfWork) {}
  runHuman<T>(accountId: string, tenantId: string, work: (scope: TransactionScope, access: Access) => Promise<T>, expected?: AuthorizationStamp): Promise<T> {
    return this.uow.run({tenantId}, async scope => {
      return work(scope,await this.loadHuman(scope,accountId,expected));
    });
  }
  async loadHuman(scope: TransactionScope, accountId: string, expected?: AuthorizationStamp, exclusive = false): Promise<Access> {
    const tenantId=scope.context.tenantId;
      const tenants = await scope.query(`SELECT status FROM tenant WHERE id=? ${exclusive ? 'FOR UPDATE' : 'FOR SHARE'}`, [tenantId]);
      if (tenants[0]?.status !== 'active') throw new AccessError('FORBIDDEN');
      const actors = await scope.query(`SELECT p.id,p.auth_revision,m.seat_code FROM membership m
        JOIN principal p ON p.tenant_id=m.tenant_id AND p.membership_id=m.id AND p.kind='human'
        WHERE m.tenant_id=? AND m.account_id=? AND m.status='active' AND p.status='active'`, [tenantId,accountId]);
      const actor = actors[0];
      if (!actor) throw new AccessError('FORBIDDEN');
      const revision = String(actor.auth_revision);
      if (expected && (expected.tenantId !== tenantId || expected.principalId !== actor.id || expected.revision !== revision)) throw new AccessError('STALE_AUTHORIZATION');
      const roles = await scope.query(`SELECT r.id,r.permissions FROM principal_role pr JOIN \`role\` r ON r.tenant_id=pr.tenant_id AND r.id=pr.role_id WHERE pr.tenant_id=? AND pr.principal_id=?`, [tenantId,actor.id]);
      const teams = await scope.query(`SELECT t.id FROM team_member tm JOIN team t ON t.tenant_id=tm.tenant_id AND t.id=tm.team_id WHERE tm.tenant_id=? AND tm.principal_id=? AND tm.active=1 AND t.active=1`, [tenantId,actor.id]);
      const access: Access = {
        tenantId, principalId: actor.id, revision, capabilities: seatCapabilities(actor.seat_code),
        grants: roles.flatMap((row: {permissions: unknown}) => parseGrants(row.permissions)),
        roleIds: roles.map((row: {id: string}) => row.id),
        teamIds: teams.map((row: {id: string}) => row.id), fieldDenies: [],
      };
    return access;
  }
}

// Identity-owned reference validation for CRM ports; caller holds tenant auth lock.
export async function validateOwnershipTarget(scope:TransactionScope,owner:string|null,team:string|null):Promise<void>{
  const tenant=scope.context.tenantId;
  if(team && !(await scope.query('SELECT id FROM team WHERE tenant_id=? AND id=? AND active=1',[tenant,team]))[0])throw new AccessError('FORBIDDEN');
  if(owner){
    const [principal]=await scope.query(`SELECT p.id FROM principal p LEFT JOIN membership m ON m.tenant_id=p.tenant_id AND m.id=p.membership_id WHERE p.tenant_id=? AND p.id=? AND p.status='active' AND (p.kind='ai' OR m.status='active')`,[tenant,owner]);
    if(!principal)throw new AccessError('FORBIDDEN');
    if(team && !(await scope.query('SELECT principal_id FROM team_member WHERE tenant_id=? AND team_id=? AND principal_id=? AND active=1',[tenant,team,owner]))[0])throw new AccessError('FORBIDDEN');
  }
}

export async function requireActiveTenant(scope:TransactionScope,exclusive=false){
  const [tenant]=await scope.query(`SELECT status FROM tenant WHERE id=? ${exclusive?'FOR UPDATE':'FOR SHARE'}`,[scope.context.tenantId]);
  if(tenant?.status!=='active')throw new AccessError('FORBIDDEN');
}

// Internal Channels authorization port. Tenant lock covers service-role revocation.
export async function requireService(scope:TransactionScope,id:string,resource:string,action:string){
  await requireActiveTenant(scope);
  const [actor]=await scope.query('SELECT s.auth_revision,r.permissions FROM service_actor s JOIN `role` r ON r.tenant_id=s.tenant_id AND r.id=s.role_id WHERE s.tenant_id=? AND s.id=? AND s.active=1',[scope.context.tenantId,id]);
  if(!actor||!parseGrants(actor.permissions).some(g=>g.resource===resource&&g.action===action&&g.scope==='all'))throw new AccessError('FORBIDDEN');
  return {id,revision:String(actor.auth_revision)};
}

// Tenant-scoped identity projection for authorized Conversation readers.
export async function conversationOwnerKind(scope:TransactionScope,id:string|null):Promise<'human'|'ai'|null>{
  if(!id)return null;const [row]=await scope.query('SELECT kind FROM principal WHERE tenant_id=? AND id=?',[scope.context.tenantId,id]);
  return row?.kind==='human'||row?.kind==='ai'?row.kind:null;
}
