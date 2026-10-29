import { randomUUID } from 'node:crypto';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { OwnerCommandRef, OwnerMetadataSnapshot, OwnerRecoveryProof, OwnerReference } from '@agentic-crm/contracts';
import { nextOwnerCounter, ownerBindingDigest, ownerCounter, ownerDigest, ownerFail, ownerRoute, validateOwnerValue, type WorkloadRoute } from '@agentic-crm/workload-transport';

type ReferenceInput = { command: OwnerCommandRef; resource_id: string; kind: 'contact' | 'mapping' | 'metadata'; expected_revision: string; reservation_id: string | null };
type ProofReader = (tenant: string, command: OwnerCommandRef, abort: boolean) => Promise<OwnerRecoveryProof>;
const json = <T>(value: string | T): T => typeof value === 'string' ? JSON.parse(value) as T : value;

/** CRM-owned metadata and reservations. Credentials have no Chat/Identity table grants. */
export class NativeCrmOwnerMetadata {
  constructor(private readonly pool: Pool, private readonly proof: ProofReader) {}

  private async transaction<T>(tenant: string, work: (c: PoolConnection) => Promise<T>) {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(tenant) ||
        ['01900000-0000-7000-8000-000000000001', '00000000-0000-0000-0000-000000000000'].includes(tenant)) ownerFail('FORBIDDEN');
    const c = await this.pool.getConnection();
    try {
      await c.query("SET time_zone='+00:00'"); await c.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED'); await c.beginTransaction();
      const result = await work(c); await c.commit(); return result;
    } catch (error) { await c.rollback(); throw error; } finally { c.release(); }
  }

  private async snapshot(c: PoolConnection, tenant: string, key: string, revision: string | null): Promise<OwnerMetadataSnapshot> {
    const [rows] = await c.execute<RowDataPacket[]>('SELECT id,`key`,schema_version FROM object_type WHERE tenant_id=? AND `key`=? AND archived_at IS NULL FOR SHARE', [tenant, key]);
    const row = rows[0]; if (!row) ownerFail('NOT_FOUND');
    const current = ownerCounter(String(row.schema_version), true);
    if (revision !== null && ownerCounter(revision, true) !== current) ownerFail('STALE_VERSION');
    const [fields] = await c.execute<RowDataPacket[]>('SELECT id,`key`,type,required,indexed,options,version FROM property_definition WHERE tenant_id=? AND object_type_id=? AND archived_at IS NULL ORDER BY id LIMIT 201 FOR SHARE', [tenant, row.id]);
    if (fields.length > 200) ownerFail('LIMIT_EXCEEDED');
    const body = { tenant_id: tenant, object_type_id: row.id as string, object_key: key,
      schema_revision: current, properties: fields.map(p => ({ id: p.id, key: p.key, type: p.type, required: Boolean(p.required), indexed: Boolean(p.indexed), options: p.options === null ? null : json(p.options), version: ownerCounter(String(p.version), true) })) };
    return validateOwnerValue<OwnerMetadataSnapshot>('OwnerMetadataSnapshot', { ...body, snapshot_digest: ownerDigest(body) });
  }

  read(tenant: string, key: string, revision: string | null) {
    if (!['conversation', 'conversation_session', 'conversation_need'].includes(key)) ownerFail('INVALID_REQUEST');
    return this.transaction(tenant, c => this.snapshot(c, tenant, key, revision));
  }

  classification(tenant:string,revision:string|null,key='conversation_session'){
    return this.transaction(tenant,async c=>{
      const snapshot=await this.snapshot(c,tenant,key,revision);
      const [rows]=await c.execute<RowDataPacket[]>('SELECT id,label,`sensitive`,default_value,created_at FROM property_definition WHERE tenant_id=? AND object_type_id=? AND archived_at IS NULL ORDER BY created_at,id FOR SHARE',[tenant,snapshot.object_type_id]);
      if(rows.length>100||snapshot.properties.some(p=>p.required||p.indexed)||rows.some(p=>p.default_value!==null))ownerFail('REFERENCE_INVALID');
      const definitions=rows.map(row=>({...snapshot.properties.find(p=>p.id===row.id)!,label:row.label,default_value:null,sensitive:Boolean(row.sensitive)}));
      return validateOwnerValue('OwnerClassificationMetadata',{snapshot,definitions});
    });
  }

  private binding(tenant: string, input: ReferenceInput, proof: OwnerRecoveryProof) {
    if (!('binding' in proof) || proof.binding.tenant_id !== tenant || proof.binding.owner !== 'chat' ||
        proof.binding.command_id !== input.command.command_id || proof.binding_digest !== input.command.binding_digest ||
        ownerBindingDigest(proof.binding) !== input.command.binding_digest || !(proof.binding.operation === 'custom-values-patch' ||
          ['need-get-assessment','need-post-assessment','need-post-enrich','conversation-classification-get-conversations-conversation-sessions-session-classification','conversation-classification-post-conversations-conversation-sessions-session-classification','conversation-classification-get-conversations-conversation-sessions-session-contributions'].includes(proof.binding.operation)&&proof.binding.actor.kind==='human'&&proof.binding.session_id&&proof.binding.projection ||
          proof.binding.operation === 'ingress-process' && proof.binding.actor.kind === 'service' && proof.binding.ingress_channel && proof.binding.references && proof.binding.resource.object_key === 'conversation') ||
        proof.binding.metadata?.object_type_id !== input.resource_id || proof.binding.metadata.schema_revision !== input.expected_revision) ownerFail('FORBIDDEN');
    return proof.binding;
  }

  private async gate(c: PoolConnection, tenant: string, input: ReferenceInput, create = false) {
    if (create) await c.execute(`INSERT INTO crm_reference_gate(tenant_id,resource_kind,resource_id,resource_revision,state,version,created_at,updated_at)
      VALUES (?,'metadata',?,?,'open',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE resource_id=resource_id`, [tenant, input.resource_id, input.expected_revision]);
    const [rows] = await c.execute<RowDataPacket[]>("SELECT * FROM crm_reference_gate WHERE tenant_id=? AND resource_kind='metadata' AND resource_id=? FOR UPDATE", [tenant, input.resource_id]);
    if (!rows[0]) ownerFail('NOT_FOUND'); return rows[0];
  }

  private async reservation(c: PoolConnection, tenant: string, input: ReferenceInput) {
    const [rows] = await c.execute<RowDataPacket[]>("SELECT * FROM crm_reference_reservation WHERE tenant_id=? AND caller_owner='chat' AND command_id=? AND resource_kind='metadata' AND resource_id=? FOR UPDATE", [tenant, input.command.command_id, input.resource_id]);
    const row = rows[0];
    if (row && (row.binding_digest !== input.command.binding_digest || String(row.resource_revision) !== input.expected_revision || input.reservation_id !== null && input.reservation_id !== row.id)) ownerFail('CONFLICT');
    return row;
  }
  private result(row: RowDataPacket): OwnerReference {
    return validateOwnerValue<OwnerReference>('OwnerReference', { reservation_id: row.id, command_id: row.command_id, binding_digest: row.binding_digest, resource_id: row.resource_id, revision: String(row.resource_revision), state: row.state === 'held' ? 'reserved' : 'released' });
  }

  async reference(tenant: string, operation: string, raw: ReferenceInput) {
    const input = validateOwnerValue<{ payload: ReferenceInput }>('Request_crm-' + operation, {
      schema_version: 1, request_id: randomUUID(), correlation_id: randomUUID(), tenant_id: tenant, operation, payload: raw,
    }).payload;
    if (input.kind !== 'metadata') ownerFail('REFERENCE_INVALID');
    ownerCounter(input.expected_revision, true);
    if (operation === 'reference-status') return this.transaction(tenant, async c => {
      await this.gate(c, tenant, input); const row = await this.reservation(c, tenant, input);
      if (!row) ownerFail('NOT_FOUND'); return this.result(row);
    });
    // Authenticated owner proof is fetched before any CRM SQL transaction.
    const proof = validateOwnerValue<OwnerRecoveryProof>('OwnerRecoveryProof', await this.proof(tenant, input.command, false));
    const binding = this.binding(tenant, input, proof);
    if (operation === 'reference-release' && proof.state === 'prepared') ownerFail('DEPENDENCY_UNAVAILABLE');
    if (operation === 'reference-reserve' && proof.state === 'aborted') ownerFail('INVALID_TRANSITION');
    return this.transaction(tenant, async c => {
      const gate = await this.gate(c, tenant, input, operation === 'reference-reserve');
      const previous = await this.reservation(c, tenant, input);
      if (previous) {
        if (operation === 'reference-release' && previous.state === 'held') {
          await c.execute("UPDATE crm_reference_reservation SET state='released',terminal_digest=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?", [ownerDigest(proof), tenant, previous.id]);
          previous.state = 'released';
        }
        return this.result(previous);
      }
      if (operation === 'reference-release' || input.reservation_id !== null) ownerFail('NOT_FOUND');
      if (proof.state !== 'prepared' || gate.state !== 'open') ownerFail('INVALID_TRANSITION');
      const snapshot = await this.snapshot(c, tenant, binding.operation.startsWith('need-')?'conversation_need':binding.operation.startsWith('conversation-classification-')?'conversation_session':binding.resource.object_key, input.expected_revision);
      if (snapshot.object_type_id !== input.resource_id || snapshot.snapshot_digest !== binding.metadata!.snapshot_digest) ownerFail('STALE_VERSION');
      await c.execute('UPDATE crm_reference_gate SET resource_revision=?,version=?,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND resource_kind=\'metadata\' AND resource_id=?', [snapshot.schema_revision, nextOwnerCounter(String(gate.version)), tenant, input.resource_id]);
      await c.execute(`INSERT INTO crm_reference_reservation(tenant_id,id,caller_owner,command_id,binding_digest,resource_kind,resource_id,resource_revision,state,version,created_at,updated_at)
        VALUES (?,?,'chat',?,?,'metadata',?,?,'held',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, [tenant, randomUUID(), input.command.command_id, input.command.binding_digest, input.resource_id, input.expected_revision]);
      return this.result((await this.reservation(c, tenant, input))!);
    });
  }

  /** Internal metadata writer barrier. Completion must precede any destructive metadata mutation. */
  async close(tenant: string, object: string, barrier: string) {
    validateOwnerValue('OwnerCommandRef', { command_id: barrier, binding_digest: '0'.repeat(64) });
    await this.transaction(tenant, async c => {
      const [types]=await c.execute<RowDataPacket[]>('SELECT schema_version FROM object_type WHERE tenant_id=? AND id=? AND archived_at IS NULL',[tenant,object]);
      if(!types[0])ownerFail('NOT_FOUND');
      const input = { resource_id: object, expected_revision: String(types[0].schema_version) } as ReferenceInput;
      const gate = await this.gate(c, tenant, input,true);
      if (gate.state !== 'open' && gate.barrier_command_id !== barrier) ownerFail('CONFLICT');
      await c.execute("UPDATE crm_reference_gate SET state='closing',barrier_command_id=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND resource_kind='metadata' AND resource_id=?", [barrier, tenant, object]);
    });
    const held = await this.transaction(tenant, async c => (await c.execute<RowDataPacket[]>("SELECT command_id,binding_digest,resource_revision,id FROM crm_reference_reservation WHERE tenant_id=? AND resource_kind='metadata' AND resource_id=? AND state='held' ORDER BY id LIMIT 100", [tenant, object]))[0]);
    for (const row of held) {
      const command = { command_id: row.command_id, binding_digest: row.binding_digest };
      // Chat abort takes the same lock as local apply. Unknown/unavailable never releases a hold.
      await this.proof(tenant, command, true);
      await this.reference(tenant, 'reference-release', { command, resource_id: object, kind: 'metadata', expected_revision: String(row.resource_revision), reservation_id: row.id });
    }
    return this.transaction(tenant, async c => {
      const gate = await this.gate(c, tenant, { resource_id: object } as ReferenceInput);
      if (!['closing','open'].includes(gate.state) || gate.barrier_command_id !== barrier) ownerFail('CONFLICT');
      // Another same-key writer can finish while this drain is in flight. Its local
      // transaction must replay the receipt under this gate lock, never mutate again.
      if(gate.state==='open')return {state:'reopened' as const,barrier_id:barrier};
      const [pending] = await c.execute<RowDataPacket[]>("SELECT id FROM crm_reference_reservation WHERE tenant_id=? AND resource_kind='metadata' AND resource_id=? AND state='held' LIMIT 1", [tenant, object]);
      return { state: pending.length ? 'closing' as const : 'drained' as const, barrier_id: barrier };
    });
  }

  /** Local writer cancelled its retirement; never reopens a retired resource. */
  async cancelClose(tenant: string, object: string, barrier: string) {
    return this.transaction(tenant, async c => {
      const gate = await this.gate(c, tenant, { resource_id: object } as ReferenceInput);
      if (gate.barrier_command_id !== barrier || !['open', 'closing'].includes(gate.state)) ownerFail('CONFLICT');
      if (gate.state === 'closing') await c.execute("UPDATE crm_reference_gate SET state='open',version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND resource_kind='metadata' AND resource_id=?", [tenant, object]);
    });
  }
}

export function crmOwnerMetadataRoutes(metadata: NativeCrmOwnerMetadata): Record<string, WorkloadRoute> {
  return {
    '/internal/v1/owners/crm/need-metadata-read':ownerRoute('crm','need-metadata-read',['chat'],r=>metadata.classification(r.tenant_id,r.payload.schema_revision as string|null,'conversation_need')),
    '/internal/v1/owners/crm/classification-metadata-read':ownerRoute('crm','classification-metadata-read',['chat'],r=>metadata.classification(r.tenant_id,r.payload.schema_revision as string|null)),
    '/internal/v1/owners/crm/metadata-schema-read': ownerRoute('crm', 'metadata-schema-read', ['chat'], r => metadata.read(r.tenant_id, r.payload.object_key as string, r.payload.schema_revision as string | null)),
    ...Object.fromEntries(['reference-reserve', 'reference-status', 'reference-release'].map(operation => ['/internal/v1/owners/crm/' + operation,
      ownerRoute('crm', operation, ['chat'], r => metadata.reference(r.tenant_id, operation, r.payload as ReferenceInput))])),
  };
}
