import { randomUUID } from 'node:crypto';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { OwnerCommandRef, OwnerRecoveryProof } from '@agentic-crm/contracts';
import { ownerBindingDigest, ownerDigest, ownerFail, validateOwnerValue } from '@agentic-crm/workload-transport';
import { PLATFORM_TENANT_ID as system } from '../../../kernel/database/system-scope.js';

export type AuthDrainRef = { accountId: string; barrierId: string };
export interface NativeAuthDrain {
  close(connection: PoolConnection, account: string, action: 'logout' | 'password-change' | 'password-reset' | 'session-replace', requestHash: string): Promise<AuthDrainRef>;
  drain(ref: AuthDrainRef): Promise<void>;
}
type PendingAdmission = RowDataPacket & { tenant_id: string; id: string; command_id: string; binding_digest: string; owner_service: string };
type OwnerRecovery = {
  abort(tenant: string, command: OwnerCommandRef, owner?: 'chat' | 'routing'): Promise<OwnerRecoveryProof>;
  settle(tenant: string, command: OwnerCommandRef, admission: string, owner?: 'chat' | 'routing'): Promise<unknown>;
};

/** Identity-owned account fence. close is local SQL; drain is always after commit. */
export class NativeAccountDrain implements NativeAuthDrain {
  constructor(private readonly pool: Pool, private readonly owner: OwnerRecovery) {}

  async close(c: PoolConnection, account: string, action: 'logout' | 'password-change' | 'password-reset' | 'session-replace', requestHash: string): Promise<AuthDrainRef> {
    if (!/^[a-f0-9]{64}$/.test(requestHash) || !['logout', 'password-change', 'password-reset', 'session-replace'].includes(action)) ownerFail('INVALID_REQUEST');
    const [accounts] = await c.execute<RowDataPacket[]>('SELECT id FROM account WHERE tenant_id=? AND id=? FOR UPDATE', [system, account]);
    if (!accounts.length) ownerFail('NOT_FOUND');
    const digest = ownerDigest({ account_id: account, action, request_hash: requestHash });
    const [gates] = await c.execute<RowDataPacket[]>('SELECT * FROM identity_account_gate WHERE tenant_id=? AND account_id=? FOR UPDATE', [system, account]);
    const gate = gates[0];
    if (gate?.state === 'closing') {
      if (gate.request_digest !== digest) ownerFail('DEPENDENCY_UNAVAILABLE');
      return { accountId: account, barrierId: gate.barrier_id };
    }
    const id = randomUUID();
    await c.execute(`INSERT INTO identity_account_barrier
      (tenant_id,barrier_id,account_id,request_digest,request_json,state,version,created_at,updated_at)
      VALUES (?,?,?,?,?,'closing',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, [system, id, account, digest, JSON.stringify({ kind: 'native-auth', action })]);
    await c.execute(`INSERT INTO identity_account_gate(tenant_id,account_id,barrier_id,state,request_digest,version,created_at,updated_at)
      VALUES (?,?,?,'closing',?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))
      ON DUPLICATE KEY UPDATE barrier_id=?,state='closing',request_digest=?,version=version+1,updated_at=UTC_TIMESTAMP(6)`, [system, account, id, digest, id, digest]);
    return { accountId: account, barrierId: id };
  }

  async drain(ref: AuthDrainRef): Promise<void> {
    const [barriers] = await this.pool.execute<RowDataPacket[]>('SELECT account_id,state FROM identity_account_barrier WHERE tenant_id=? AND barrier_id=?', [system, ref.barrierId]);
    if (!barriers[0] || barriers[0].account_id !== ref.accountId) ownerFail('NOT_FOUND');
    if (barriers[0].state === 'completed') return;
    // Account gate is already durable/closing. No SQL transaction spans RPCs.
    const [pending] = await this.pool.execute<PendingAdmission[]>(
      "SELECT tenant_id,id,owner_service,command_id,binding_digest FROM identity_owner_admission WHERE account_id=? AND state='admitted' ORDER BY tenant_id,id LIMIT 100", [ref.accountId]);
    for (const admission of pending) {
      if (admission.owner_service !== 'chat' && admission.owner_service !== 'routing') ownerFail('DEPENDENCY_UNAVAILABLE');
      const command = { command_id: admission.command_id, binding_digest: admission.binding_digest };
      const proof = validateOwnerValue<OwnerRecoveryProof>('OwnerRecoveryProof', await this.owner.abort(admission.tenant_id, command, admission.owner_service));
      if (proof.binding_digest !== command.binding_digest || proof.state === 'prepared') ownerFail('DEPENDENCY_UNAVAILABLE');
      if ('binding' in proof) {
        if (proof.binding.tenant_id !== admission.tenant_id || proof.binding.owner !== admission.owner_service || proof.binding.command_id !== command.command_id || ownerBindingDigest(proof.binding) !== command.binding_digest) ownerFail('FORBIDDEN');
      } else if (proof.command_id !== command.command_id) ownerFail('FORBIDDEN');
      // Settlement independently verifies the owner's terminal state and exact admission.
      await this.owner.settle(admission.tenant_id, command, admission.id, admission.owner_service);
    }
    const c = await this.pool.getConnection();
    try {
      await c.beginTransaction();
      // Same order as admission and native auth: account before gate. SHARE is enough
      // because the still-closing gate excludes admissions, and auth writers use UPDATE.
      await c.execute('SELECT id FROM account WHERE tenant_id=? AND id=? FOR SHARE', [system, ref.accountId]);
      const [gates] = await c.execute<RowDataPacket[]>('SELECT * FROM identity_account_gate WHERE tenant_id=? AND account_id=? FOR UPDATE', [system, ref.accountId]);
      const [current] = await c.execute<RowDataPacket[]>('SELECT state FROM identity_account_barrier WHERE tenant_id=? AND barrier_id=? FOR UPDATE', [system, ref.barrierId]);
      if (current[0]?.state === 'completed') { await c.commit(); return; }
      if (gates[0]?.state !== 'closing' || gates[0].barrier_id !== ref.barrierId) ownerFail('CONFLICT');
      const [remaining] = await c.execute<RowDataPacket[]>("SELECT id FROM identity_owner_admission WHERE account_id=? AND state='admitted' LIMIT 1", [ref.accountId]);
      if (remaining.length) ownerFail('DEPENDENCY_UNAVAILABLE');
      await c.execute("UPDATE identity_account_barrier SET state='completed',completed_at=UTC_TIMESTAMP(6),version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND barrier_id=?", [system, ref.barrierId]);
      await c.execute("UPDATE identity_account_gate SET state='open',version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND account_id=? AND barrier_id=?", [system, ref.accountId, ref.barrierId]);
      await c.commit();
    } catch (error) { await c.rollback(); throw error; } finally { c.release(); }
  }
}
