import type { DataSource } from 'typeorm';
import { UnitOfWork } from '../../kernel/tenancy/unit-of-work.js';
import { IdentityAuthorization } from '../identity/authorization.js';
import { permits } from '../identity/domain/authorization.js';

/** Connected projections belong to Reporting; the baseline no longer assembles them from Chat SQL. */
export async function connectedPolicy(source: DataSource, account: string, tenant: string) {
  return new IdentityAuthorization(new UnitOfWork(source)).runHuman(account, tenant, async (_scope, access) => ({
    authRevision: access.revision,
    policy: { allowMock: permits(access, 'report_mock_source', 'read'), operations: null, conversion: null, stage: null },
  }));
}
