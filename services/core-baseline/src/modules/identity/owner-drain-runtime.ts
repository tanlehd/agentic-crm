import type { DataSource } from 'typeorm';
import { UnitOfWork } from '../../kernel/tenancy/unit-of-work.js';
import { chatConnection, ownerConnection } from '../../gateway/chat-connection.js';
import { NativeOwnerAdmissions } from './owner-admission.js';
import { NativeIdentityPolicyDrain } from './owner-policy-drain.js';
import { NativeOwnerHumanAuthority } from './owner-authority.js';
import type { OwnerRecoveryProof } from '@agentic-crm/contracts';

/** Identity-local recovery uses terminal owner proofs, never cached authorization. */
export function identityDrains(source: DataSource) {
  const chat = chatConnection('identity');
  const routing = ownerConnection('identity', 'routing', 'ROUTING_OWNER_URL');
  const recover = async (tenant: string, command: Parameters<NativeOwnerAdmissions['settle']>[1], abort = false, owner = 'chat') =>
    (await (owner === 'routing' ? routing : chat)()).read<OwnerRecoveryProof>(tenant, abort ? 'command-abort' : 'command-proof', { ...command });
  const uow = new UnitOfWork(source);
  // Only settlement/drain is exposed; these operations do not admit new work.
  const admissions = new NativeOwnerAdmissions(uow, new NativeOwnerHumanAuthority(uow, new Map()), recover);
  return {
    policy: new NativeIdentityPolicyDrain(uow, tenant => admissions.drainTenant(tenant)),
    account: {
      abort: (tenant: string, command: Parameters<NativeOwnerAdmissions['settle']>[1], owner?: 'chat' | 'routing') => recover(tenant, command, true, owner),
      settle: async (tenant: string, command: Parameters<NativeOwnerAdmissions['settle']>[1], id: string, owner?: 'chat' | 'routing') => {
        if (!source.isInitialized) throw new Error('IDENTITY_RECOVERY_SOURCE_NOT_READY');
        return admissions.settle(tenant, command, id, owner);
      },
    },
  };
}
