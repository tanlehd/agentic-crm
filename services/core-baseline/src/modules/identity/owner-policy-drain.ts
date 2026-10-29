import { createHash } from 'node:crypto';
import { ownerCanonical, ownerDigest, ownerFail } from '@agentic-crm/workload-transport';
import { UnitOfWork, type TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { AccessError, requireActiveTenant } from './authorization.js';

export interface IdentityPolicyDrain {
  run<T>(tenant: string, account: string, route: string, key: string, input: Record<string, unknown>, authorize: (scope: TransactionScope) => Promise<void>, write: (scope: TransactionScope) => Promise<T>): Promise<T>;
}
type Outcome = { status: number; code: string } | null;
type Request = { input: Record<string, unknown>; outcome: Outcome };
const parse = (v: string | Request): Request => typeof v === 'string' ? JSON.parse(v) : v;

/** Owner-local wrapper for existing Identity policy writers; never holds SQL over RPC. */
export class NativeIdentityPolicyDrain implements IdentityPolicyDrain {
  constructor(private readonly uow: UnitOfWork, private readonly drain: (tenant: string) => Promise<void>) {}

  private async locked<T>(tenant: string, work: (s: TransactionScope) => Promise<T>) {
    return this.uow.run({ tenantId: tenant }, async s => { await requireActiveTenant(s, true); return work(s); });
  }
  async run<T>(tenant: string, account: string, route: string, key: string, input: Record<string, unknown>, authorize: (scope: TransactionScope) => Promise<void>, write: (scope: TransactionScope) => Promise<T>): Promise<T> {
    const stable = createHash('sha256').update(ownerCanonical({ tenant, account, route, key })).digest('hex');
    const id = `${stable.slice(0, 8)}-${stable.slice(8, 12)}-5${stable.slice(13, 16)}-a${stable.slice(17, 20)}-${stable.slice(20, 32)}`;
    const intent = { route, ...input }, digest = ownerDigest(intent);
    if (Buffer.byteLength(ownerCanonical(intent)) > 240000) ownerFail('LIMIT_EXCEEDED');
    const prior = await this.locked(tenant, async s => {
      await authorize(s);
      const [old] = await s.query('SELECT * FROM identity_owner_barrier WHERE tenant_id=? AND barrier_id=? FOR UPDATE', [tenant, id]);
      if (old) {
        if (old.account_id !== account || old.request_digest !== digest) ownerFail('CONFLICT');
        return { completed: old.state === 'completed', outcome: parse(old.request_json).outcome };
      }
      const [gate] = await s.query('SELECT * FROM identity_owner_gate WHERE tenant_id=? FOR UPDATE', [tenant]);
      if (gate?.state !== 'open') ownerFail('DEPENDENCY_UNAVAILABLE');
      await s.query("INSERT INTO identity_owner_barrier(tenant_id,barrier_id,account_id,request_digest,request_json,state,version,created_at,updated_at) VALUES (?,?,?,?,?,'closing',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [tenant, id, account, digest, ownerCanonical({ input: intent, outcome: null })]);
      await s.query("UPDATE identity_owner_gate SET state='closing',barrier_id=?,request_digest=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=?", [id, digest, tenant]);
      return { completed: false, outcome: null };
    });
    if (prior.completed) {
      if (prior.outcome) throw new CommandError(prior.outcome.status, prior.outcome.code);
      // The successful original writer has an immutable idempotency receipt.
      return this.locked(tenant, write);
    }
    await this.drain(tenant);
    const completed = await this.locked(tenant, async s => {
      const [barrier] = await s.query('SELECT * FROM identity_owner_barrier WHERE tenant_id=? AND barrier_id=? FOR UPDATE', [tenant, id]);
      if (!barrier || barrier.request_digest !== digest) ownerFail('CONFLICT');
      if (barrier.state === 'completed') {
        const outcome = parse(barrier.request_json).outcome;
        return outcome ? { error: outcome } : { result: await write(s) };
      }
      const [gate] = await s.query('SELECT * FROM identity_owner_gate WHERE tenant_id=? FOR UPDATE', [tenant]);
      if (gate?.state !== 'closing' || gate.barrier_id !== id || gate.request_digest !== digest) ownerFail('CONFLICT');
      if ((await s.query("SELECT id FROM identity_owner_admission WHERE tenant_id=? AND state='admitted' LIMIT 1", [tenant])).length) ownerFail('DEPENDENCY_UNAVAILABLE');
      let result: T | undefined, error: Outcome = null;
      await s.query('SAVEPOINT identity_policy_write');
      try { result = await write(s); }
      catch (e) {
        const failure = e instanceof AccessError ? new CommandError(403, e.code) :
          (e as { code?: string }).code === 'ER_DUP_ENTRY' ? new CommandError(409, 'ALREADY_EXISTS') : e;
        if (!(failure instanceof CommandError) || ![400, 403, 404, 409, 422, 428].includes(failure.status)) throw e;
        await s.query('ROLLBACK TO SAVEPOINT identity_policy_write'); error = { status: failure.status, code: failure.code };
      }
      await s.query("UPDATE identity_owner_barrier SET state='completed',request_json=?,completed_at=UTC_TIMESTAMP(6),version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND barrier_id=?", [ownerCanonical({ input: intent, outcome: error }), tenant, id]);
      await s.query("UPDATE identity_owner_gate SET state='open',version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND barrier_id=?", [tenant, id]);
      return error ? { error } : { result: result! };
    });
    if (completed.error) throw new CommandError(completed.error.status, completed.error.code);
    return completed.result!;
  }
}
