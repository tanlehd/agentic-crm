import { randomUUID } from 'node:crypto';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { OwnerCommandRef, OwnerCommandBinding, OwnerRecoveryProof, OwnerReference } from '@agentic-crm/contracts';
import { ownerBindingDigest, ownerCounter, ownerDigest, ownerFail, validateOwnerValue } from '@agentic-crm/workload-transport';

export type ReferenceInput = { command: OwnerCommandRef; resource_id: string; kind: string; expected_revision: string; reservation_id: string | null };
export type ReferenceProofReader = (tenant: string, command: OwnerCommandRef, abort: boolean) => Promise<OwnerRecoveryProof>;

/** Storage infrastructure only. All tables and resource validation belong to the supplied owner. */
export class OwnerReferenceLedger {
  constructor(private readonly pool: Pool, private readonly owner: 'crm' | 'connector', private readonly kinds: readonly string[],
    private readonly proof: ReferenceProofReader,
    private readonly verify: (tenant: string, input: ReferenceInput, binding: OwnerCommandBinding) => void,
    private readonly live: (c: PoolConnection, tenant: string, input: ReferenceInput, binding: OwnerCommandBinding) => Promise<void>) {}

  async transaction<T>(tenant: string, work: (c: PoolConnection) => Promise<T>): Promise<T> {
    validateOwnerValue('OwnerCommandRef', { command_id: tenant, binding_digest: '0'.repeat(64) });
    if (['01900000-0000-7000-8000-000000000001', '00000000-0000-0000-0000-000000000000'].includes(tenant)) ownerFail('FORBIDDEN');
    const c = await this.pool.getConnection();
    try {
      await c.query("SET time_zone='+00:00'"); await c.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED'); await c.beginTransaction();
      const result = await work(c); await c.commit(); return result;
    } catch (error) { await c.rollback(); throw error; } finally { c.release(); }
  }

  private input(tenant: string, operation: string, raw: ReferenceInput): ReferenceInput {
    const input = validateOwnerValue<{ payload: ReferenceInput }>('Request_' + this.owner + '-' + operation, {
      schema_version: 1, request_id: randomUUID(), correlation_id: randomUUID(), tenant_id: tenant, operation, payload: raw,
    }).payload;
    if (!this.kinds.includes(input.kind)) ownerFail('REFERENCE_INVALID');
    ownerCounter(input.expected_revision, true); return input;
  }
  private async gate(c: PoolConnection, tenant: string, input: ReferenceInput, create = false) {
    if (create) await c.execute(`INSERT INTO ${this.owner}_reference_gate(tenant_id,resource_kind,resource_id,resource_revision,state,version,created_at,updated_at)
      VALUES (?,?,?,?,'open',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE resource_id=resource_id`, [tenant, input.kind, input.resource_id, input.expected_revision]);
    const [rows] = await c.execute<RowDataPacket[]>(`SELECT * FROM ${this.owner}_reference_gate WHERE tenant_id=? AND resource_kind=? AND resource_id=? FOR UPDATE`, [tenant, input.kind, input.resource_id]);
    if (!rows[0]) ownerFail('NOT_FOUND'); return rows[0];
  }
  private async reservation(c: PoolConnection, tenant: string, input: ReferenceInput) {
    const [rows] = await c.execute<RowDataPacket[]>(`SELECT * FROM ${this.owner}_reference_reservation WHERE tenant_id=? AND caller_owner='chat' AND command_id=? AND resource_kind=? AND resource_id=? FOR UPDATE`, [tenant, input.command.command_id, input.kind, input.resource_id]);
    const row = rows[0];
    if (row && (row.binding_digest !== input.command.binding_digest || String(row.resource_revision) !== input.expected_revision || input.reservation_id !== null && input.reservation_id !== row.id)) ownerFail('CONFLICT');
    return row;
  }
  private result(row: RowDataPacket): OwnerReference {
    return validateOwnerValue<OwnerReference>('OwnerReference', { reservation_id: row.id, command_id: row.command_id, binding_digest: row.binding_digest,
      resource_id: row.resource_id, revision: String(row.resource_revision), state: row.state === 'held' ? 'reserved' : 'released' });
  }
  async reference(tenant: string, operation: string, raw: ReferenceInput): Promise<OwnerReference> {
    const input = this.input(tenant, operation, raw);
    if (operation === 'reference-status') return this.transaction(tenant, async c => {
      await this.gate(c, tenant, input); const previous = await this.reservation(c, tenant, input);
      if (!previous) ownerFail('NOT_FOUND'); return this.result(previous);
    });
    // RPC ends before SQL starts. Abort/apply serialize on the Chat command, release on terminal proof only.
    const proof = validateOwnerValue<OwnerRecoveryProof>('OwnerRecoveryProof', await this.proof(tenant, input.command, false));
    if (!('binding' in proof) || proof.binding.tenant_id !== tenant || proof.binding.owner !== 'chat' || proof.binding.command_id !== input.command.command_id ||
        proof.binding_digest !== input.command.binding_digest || ownerBindingDigest(proof.binding) !== input.command.binding_digest) ownerFail('FORBIDDEN');
    this.verify(tenant, input, proof.binding);
    if (operation === 'reference-release' && proof.state === 'prepared') ownerFail('DEPENDENCY_UNAVAILABLE');
    return this.transaction(tenant, async c => {
      const gate = await this.gate(c, tenant, input, operation === 'reference-reserve');
      const previous = await this.reservation(c, tenant, input);
      if (previous) {
        if (operation === 'reference-release' && previous.state === 'held') {
          await c.execute(`UPDATE ${this.owner}_reference_reservation SET state='released',terminal_digest=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?`, [ownerDigest(proof), tenant, previous.id]); previous.state = 'released';
        }
        return this.result(previous);
      }
      if (operation === 'reference-release' || input.reservation_id !== null) ownerFail('NOT_FOUND');
      if (proof.state !== 'prepared' || gate.state !== 'open') ownerFail('INVALID_TRANSITION');
      await this.live(c, tenant, input, proof.binding);
      await c.execute(`UPDATE ${this.owner}_reference_gate SET resource_revision=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND resource_kind=? AND resource_id=?`, [input.expected_revision, tenant, input.kind, input.resource_id]);
      await c.execute(`INSERT INTO ${this.owner}_reference_reservation(tenant_id,id,caller_owner,command_id,binding_digest,resource_kind,resource_id,resource_revision,state,version,created_at,updated_at)
        VALUES (?,?,'chat',?,?,?,?,?,'held',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, [tenant, randomUUID(), input.command.command_id, input.command.binding_digest, input.kind, input.resource_id, input.expected_revision]);
      return this.result((await this.reservation(c, tenant, input))!);
    });
  }

  /** Trusted local writer port. Does not retire the resource or bypass its business archive checks. */
  async close(tenant: string, kind: string, id: string, revision: string, barrier: string, beforeClose?: (c:PoolConnection)=>Promise<void>) {
    const input = this.input(tenant, 'reference-reserve', { command: { command_id: barrier, binding_digest: '0'.repeat(64) }, kind, resource_id: id, expected_revision: revision, reservation_id: null });
    await this.transaction(tenant, async c => {
      const gate = await this.gate(c, tenant, input, true);
      await beforeClose?.(c);
      if (gate.state === 'retired' || gate.state !== 'open' && gate.barrier_command_id !== barrier) ownerFail('CONFLICT');
      if (gate.state === 'open' && gate.barrier_command_id === barrier) ownerFail('INVALID_TRANSITION');
      if (gate.state === 'open') await c.execute(`UPDATE ${this.owner}_reference_gate SET state='closing',barrier_command_id=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND resource_kind=? AND resource_id=?`, [barrier, tenant, kind, id]);
    });
    const held = await this.transaction(tenant, async c => (await c.execute<RowDataPacket[]>(`SELECT command_id,binding_digest,resource_revision,id FROM ${this.owner}_reference_reservation WHERE tenant_id=? AND resource_kind=? AND resource_id=? AND state='held' ORDER BY id LIMIT 100`, [tenant, kind, id]))[0]);
    for (const row of held) {
      const command = { command_id: row.command_id, binding_digest: row.binding_digest };
      await this.proof(tenant, command, true);
      await this.reference(tenant, 'reference-release', { ...input, command, expected_revision: String(row.resource_revision), reservation_id: row.id });
    }
    return this.transaction(tenant, async c => {
      const gate = await this.gate(c, tenant, input);
      if (gate.state !== 'closing' || gate.barrier_command_id !== barrier) ownerFail('CONFLICT');
      const [pending] = await c.execute<RowDataPacket[]>(`SELECT id FROM ${this.owner}_reference_reservation WHERE tenant_id=? AND resource_kind=? AND resource_id=? AND state='held' LIMIT 1`, [tenant, kind, id]);
      return { state: pending.length ? 'closing' as const : 'drained' as const, barrier_id: barrier };
    });
  }
  async cancelClose(tenant: string, kind: string, id: string, barrier: string) {
    const input = this.input(tenant, 'reference-status', { command: { command_id: barrier, binding_digest: '0'.repeat(64) }, kind, resource_id: id, expected_revision: '1', reservation_id: null });
    await this.transaction(tenant, async c => {
      const gate = await this.gate(c, tenant, input);
      if (gate.barrier_command_id !== barrier || !['open', 'closing'].includes(gate.state)) ownerFail('CONFLICT');
      if (gate.state === 'closing') await c.execute(`UPDATE ${this.owner}_reference_gate SET state='open',version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND resource_kind=? AND resource_id=?`, [tenant, kind, id]);
    });
  }
}

export function ingressReferencePin(binding: OwnerCommandBinding): NonNullable<OwnerCommandBinding['references']> {
  if (!['ingress-accept', 'ingress-process', 'ingress-receipt'].includes(binding.operation) || binding.actor.kind !== 'service' || !binding.references || binding.resource.object_key !== 'conversation') ownerFail('FORBIDDEN');
  return binding.references;
}
