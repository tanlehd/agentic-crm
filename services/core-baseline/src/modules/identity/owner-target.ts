import type { OwnerTarget } from '@agentic-crm/contracts';
import { ownerFail, ownerRoute, type WorkloadRoute } from '@agentic-crm/workload-transport';
import { UnitOfWork } from '../../kernel/tenancy/unit-of-work.js';
import { requireActiveTenant } from './authorization.js';

export function identityOwnerTargetRoute(uow: UnitOfWork): Record<string, WorkloadRoute> {
  return {
    '/internal/v1/owners/identity/principal-kind-read': ownerRoute('identity', 'principal-kind-read', ['chat'], request =>
      uow.run({ tenantId: request.tenant_id }, async scope => {
        await requireActiveTenant(scope);
        const { principal_id } = request.payload as { principal_id: string | null };
        if (principal_id === null) return { principal_id, kind: null };
        const [row] = await scope.query('SELECT kind FROM principal WHERE tenant_id=? AND id=?', [request.tenant_id, principal_id]);
        if (!row) ownerFail('NOT_FOUND');
        if (!['human', 'ai'].includes(row.kind)) ownerFail('FORBIDDEN');
        return { principal_id, kind: row.kind };
      })),
    '/internal/v1/owners/identity/target-read': ownerRoute('identity', 'target-read', ['chat'], request =>
    uow.run({ tenantId: request.tenant_id }, async scope => {
      await requireActiveTenant(scope);
      const { principal_id: principal, team_id: team } = request.payload as { principal_id: string | null; team_id: string | null };
      let revision = '1';
      if (team) {
        const [row] = await scope.query('SELECT active,version FROM team WHERE tenant_id=? AND id=?', [request.tenant_id, team]);
        if (!row) ownerFail('NOT_FOUND'); if (!row.active) ownerFail('REVOKED'); revision = String(row.version);
      }
      let kind: OwnerTarget['kind'] = null;
      if (principal) {
        const [row] = await scope.query(`SELECT p.kind,p.status,p.auth_revision,m.status membership_status FROM principal p
          LEFT JOIN membership m ON m.tenant_id=p.tenant_id AND m.id=p.membership_id WHERE p.tenant_id=? AND p.id=?`, [request.tenant_id, principal]);
        if (!row) ownerFail('NOT_FOUND');
        if (row.status !== 'active' || row.kind === 'human' && row.membership_status !== 'active') ownerFail('REVOKED');
        if (!['human', 'ai'].includes(row.kind)) ownerFail('FORBIDDEN');
        if (team && !(await scope.query('SELECT principal_id FROM team_member WHERE tenant_id=? AND principal_id=? AND team_id=? AND active=1', [request.tenant_id, principal, team])).length) ownerFail('REVOKED');
        kind = row.kind; revision = String(row.auth_revision);
      }
      return { target: { principal_id: principal, kind, team_id: team }, observed_revision: revision };
    })) };
}
