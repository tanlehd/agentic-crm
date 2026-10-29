import { Ajv } from 'ajv';
import { default as addFormats } from 'ajv-formats';
import { chatDispatchV1Schema, type DispatchRequest } from '@agentic-crm/contracts';
import { UnitOfWork, type TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { IdentityAuthorization, requireActiveTenant, AccessError } from './authorization.js';
import { lockedNativeSession } from './auth/locked-session.js';
import { permits, fieldAllowed, type Access } from './domain/authorization.js';

const ajv = new Ajv({strict:true});
type IdentityIssue = Extract<DispatchRequest,{operation:'identity-issue'}>;
(addFormats as unknown as (a:Ajv)=>void)(ajv);
const valid = ajv.compile<IdentityIssue>({...chatDispatchV1Schema,$ref:'#/definitions/IdentityIssue'});
export interface DispatchAuthorizationStamp { principalRevision: string; securityRevision: string }
export type DispatchFieldPolicies = (scope:TransactionScope, access:Access)=>Promise<Access>;

// Local Identity ledger work only. Network/provider I/O must happen after commit.
export class NativeDispatchAuthority {
  private readonly authorization: IdentityAuthorization;
  constructor(private readonly uow:UnitOfWork, private readonly policies:DispatchFieldPolicies) {
    this.authorization = new IdentityAuthorization(uow);
  }
  async runHuman<T>(tenant:string, verifier:string, input:unknown,
    work:(scope:TransactionScope, stamp:DispatchAuthorizationStamp)=>Promise<T>, expected?:DispatchAuthorizationStamp):Promise<T> {
    if (!valid(input) || Buffer.byteLength(JSON.stringify(input)) > 16384 || input.binding.tenant_id !== tenant) throw new AccessError('FORBIDDEN');
    // Copy before awaiting so a caller cannot mutate authorization inputs while locks wait.
    const request = structuredClone(input), b = request.binding, r = request.resource_context;
    if (b.actor_kind !== 'human' || b.principal_id !== r.owner_principal_id || b.owner_revision !== r.owner_revision || b.record_version !== r.record_version) throw new AccessError('FORBIDDEN');
    const pinned = expected && {...expected};
    return this.uow.run({tenantId:tenant}, async scope => {
      await requireActiveTenant(scope);
      const session = await lockedNativeSession(scope, verifier);
      const current = await this.authorization.loadHuman(scope, session.accountId);
      if (current.principalId !== b.principal_id) throw new AccessError('FORBIDDEN');
      const stamp = {principalRevision:current.revision, securityRevision:session.securityRevision};
      if (pinned && (pinned.principalRevision !== stamp.principalRevision || pinned.securityRevision !== stamp.securityRevision)) throw new AccessError('STALE_AUTHORIZATION');
      const access = await this.policies(scope, current);
      if (access.tenantId !== tenant || access.principalId !== current.principalId || access.revision !== current.revision) throw new AccessError('FORBIDDEN');
      const record = {tenantId:tenant, ownerPrincipalId:r.owner_principal_id, teamId:r.team_id, sharedTeamIds:r.shared_team_ids};
      if (!permits(access,'conversation','read',record) || !permits(access,'conversation','reply',record) ||
          !fieldAllowed(access,'conversation','text','read') || !fieldAllowed(access,'conversation','text','write')) throw new AccessError('FORBIDDEN');
      return work(scope, stamp);
    });
  }
}
