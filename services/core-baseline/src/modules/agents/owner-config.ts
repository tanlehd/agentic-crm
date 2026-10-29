import { randomUUID } from 'node:crypto';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { OwnerActor, OwnerAdmission, OwnerCommandBinding, OwnerCommandRef, OwnerRecoveryProof } from '@agentic-crm/contracts';
import { nextOwnerCounter, ownerCanonical, ownerCounter, ownerDigest, ownerBindingDigest, validateOwnerValue, ownerFail, OwnerError } from '@agentic-crm/workload-transport';
import type { NativeOwnerCapacity } from './owner-capacity.js';

export type RoutingConfiguration =
  { kind: 'skill'; id: string; expected_version: string; key: string; name: string } |
  { kind: 'profile'; id: string; expected_version: string; capacity: number; enabled: boolean } |
  { kind: 'team-skills'; id: string; expected_version: string; skill_ids: string[] } |
  { kind: 'queue'; id: string; expected_version: string; name: string; enabled: boolean; team_id: string; connection_id: string | null; skill_ids: string[]; priority: number };
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const parse = <T>(v: string | T): T => typeof v === 'string' ? JSON.parse(v) as T : v;

/** Private local port. Caller must validate current config authority and Identity/channel references. */
export class NativeRoutingConfiguration {
  constructor(private readonly pool: Pool, private readonly capacity: NativeOwnerCapacity) {}

  private validate(input: RoutingConfiguration) {
    if (!input || !uuid(input.id)) ownerFail('INVALID_REQUEST');
    ownerCounter(input.expected_version);
    const keys = input.kind === 'skill' ? ['kind', 'id', 'expected_version', 'key', 'name'] : input.kind === 'profile' ? ['kind', 'id', 'expected_version', 'capacity', 'enabled'] : input.kind === 'team-skills' ? ['kind', 'id', 'expected_version', 'skill_ids'] : input.kind === 'queue' ? ['kind', 'id', 'expected_version', 'name', 'enabled', 'team_id', 'connection_id', 'skill_ids', 'priority'] : [];
    if (Object.keys(input).length !== keys.length || Object.keys(input).some(k => !keys.includes(k))) ownerFail('INVALID_REQUEST');
    if (input.kind === 'profile' && (!Number.isInteger(input.capacity) || input.capacity < 0 || input.capacity > 100 || typeof input.enabled !== 'boolean')) ownerFail('INVALID_REQUEST');
    if (input.kind === 'skill' && (input.expected_version !== '0' || typeof input.key !== 'string' || !/^[a-z][a-z0-9_.-]{0,63}$/.test(input.key) || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 120)) ownerFail('INVALID_REQUEST');
    if (input.kind !== 'profile' && input.kind !== 'skill' && (!Array.isArray(input.skill_ids) || input.skill_ids.length > 200 || new Set(input.skill_ids).size !== input.skill_ids.length || !input.skill_ids.every(uuid))) ownerFail('INVALID_REQUEST');
    if (input.kind === 'queue' && (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 120 || typeof input.enabled !== 'boolean' || !uuid(input.team_id) || input.connection_id !== null && !uuid(input.connection_id) || !Number.isInteger(input.priority) || input.priority < 0 || input.priority > 999)) ownerFail('INVALID_REQUEST');
    return structuredClone(input);
  }
  private async transaction<T>(tenant: string, work: (c: PoolConnection, gate: RowDataPacket) => Promise<T>) {
    if (!uuid(tenant) || ['01900000-0000-7000-8000-000000000001', '00000000-0000-0000-0000-000000000000'].includes(tenant)) ownerFail('FORBIDDEN');
    const c = await this.pool.getConnection();
    try {
      await c.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED'); await c.beginTransaction();
      const [rows] = await c.execute<RowDataPacket[]>('SELECT * FROM routing_capacity_gate WHERE tenant_id=? FOR UPDATE', [tenant]);
      if (!rows[0]) ownerFail('DEPENDENCY_UNAVAILABLE');
      const result = await work(c, rows[0]); await c.commit(); return result;
    } catch (e) { await c.rollback(); throw e; } finally { c.release(); }
  }
  async begin(tenant: string, command: string, actor: string, raw: RoutingConfiguration, nativeActor?: OwnerActor) {
    if (!uuid(command) || !uuid(actor)) ownerFail('INVALID_REQUEST');
    const input = this.validate(raw);
    const binding = nativeActor ? validateOwnerValue<OwnerCommandBinding>('OwnerCommandBinding', {
      tenant_id: tenant, command_id: command, owner: 'routing', operation: 'routing-configuration-' + input.kind, actor: nativeActor,
      resource: { resource_id: input.id, object_key: 'routing_configuration', record_version: input.expected_version, owner_revision: '0', control_revision: '0', owner_principal_id: null, team_id: null, shared_team_ids: [], archived: false },
      target: input.kind === 'skill' ? null : { principal_id: input.kind === 'profile' ? input.id : null, kind: input.kind === 'profile' ? 'human' : null, team_id: input.kind === 'team-skills' ? input.id : input.kind === 'queue' ? input.team_id : null },
      session_id: null, fields: Object.keys(input).sort(), payload_digest: ownerDigest(input), legacy_receipt_key: command, graph: null, dependencies: [],
    }) : null;
    if (nativeActor && (nativeActor.kind !== 'human' || nativeActor.principal_id !== actor)) ownerFail('FORBIDDEN');
    const digest = binding ? ownerBindingDigest(binding) : ownerDigest({ tenant, actor, input });
    return this.transaction(tenant, async (c, gate) => {
      const [rows] = await c.execute<RowDataPacket[]>('SELECT * FROM routing_owner_command WHERE tenant_id=? AND command_id=? FOR UPDATE', [tenant, command]);
      if (rows[0]) {
        if (rows[0].actor_id !== actor || ownerCanonical(parse(rows[0].request_json)) !== ownerCanonical(input) ||
            !!parse<Record<string, unknown>>(rows[0].binding_json)?.owner !== !!binding) ownerFail('CONFLICT');
        return { command_id: command, binding_digest: rows[0].binding_digest as string, state: rows[0].state as string };
      }
      if (gate.state !== 'open') ownerFail('DEPENDENCY_UNAVAILABLE');
      await c.execute(`INSERT INTO routing_owner_command(tenant_id,command_id,operation,binding_digest,actor_kind,actor_id,resource_kind,resource_id,record_version,owner_revision,control_revision,binding_json,request_json,state,version,created_at,updated_at)
        VALUES (?,?,'configuration',?,'human',?,'routing_configuration',?,?,0,0,?,?,'prepared',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,
      [tenant, command, digest, actor, input.id, input.expected_version, ownerCanonical(binding ?? { tenant, actor, input_digest: ownerDigest(input) }), ownerCanonical(input)]);
      await c.execute("UPDATE routing_capacity_gate SET state='closing',barrier_command_id=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=?", [command, tenant]);
      return { command_id: command, binding_digest: digest, state: 'prepared' };
    });
  }
  async complete(tenant: string, command: string) {
    if (!uuid(command)) ownerFail('INVALID_REQUEST');
    const prior = await this.transaction(tenant, async (c, gate) => {
      const [rows] = await c.execute<RowDataPacket[]>('SELECT * FROM routing_owner_command WHERE tenant_id=? AND command_id=? FOR UPDATE', [tenant, command]);
      if (!rows[0]) ownerFail('NOT_FOUND');
      if (rows[0].state !== 'prepared') return parse<{ version?: string; error?: string }>(rows[0].result_json);
      if (gate.state !== 'closing' || gate.barrier_command_id !== command) ownerFail('CONFLICT');
      return null;
    });
    if (prior) return prior;
    await this.capacity.drainTenant(tenant);
    return this.transaction(tenant, async (c, gate) => {
      const [rows] = await c.execute<RowDataPacket[]>('SELECT * FROM routing_owner_command WHERE tenant_id=? AND command_id=? FOR UPDATE', [tenant, command]);
      const row = rows[0]!;
      if (row.state !== 'prepared') return parse<{ version?: string; error?: string }>(row.result_json);
      if (gate.state !== 'closing' || gate.barrier_command_id !== command) ownerFail('CONFLICT');
      if ((await c.execute<RowDataPacket[]>("SELECT id FROM routing_capacity_reservation WHERE tenant_id=? AND state='reserved' LIMIT 1", [tenant]))[0].length) ownerFail('DEPENDENCY_UNAVAILABLE');
      const input = this.validate(parse<RoutingConfiguration>(row.request_json));
      const binding = parse<OwnerCommandBinding>(row.binding_json);
      if (binding.owner === 'routing') {
        if (ownerBindingDigest(binding) !== row.binding_digest || binding.payload_digest !== ownerDigest(input)) ownerFail('CONFLICT');
        if (!row.admission_id) ownerFail('FORBIDDEN');
      } else if (ownerDigest({ tenant, actor: row.actor_id, input }) !== row.binding_digest) ownerFail('CONFLICT');
      let result: { version?: string; error?: string };
      await c.query('SAVEPOINT routing_configuration');
      try { result = { version: await this.write(c, tenant, input) }; }
      catch (e) {
        if (!(e instanceof OwnerError) || !['STALE_VERSION', 'REFERENCE_INVALID', 'LIMIT_EXCEEDED', 'CONFLICT'].includes(e.code)) throw e;
        await c.query('ROLLBACK TO SAVEPOINT routing_configuration'); result = { error: e.code };
      }
      await c.execute('UPDATE routing_owner_command SET state=?,result_json=?,terminal_digest=?,terminal_at=UTC_TIMESTAMP(6),version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND command_id=?', [result.error ? 'aborted' : 'committed', ownerCanonical(result), ownerDigest(result), tenant, command]);
      await c.execute("UPDATE routing_capacity_gate SET state='open',version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND barrier_command_id=?", [tenant, command]);
      return result;
    });
  }
  async proof(tenant: string, input: OwnerCommandRef, abort = false): Promise<OwnerRecoveryProof> {
    const ref = validateOwnerValue<OwnerCommandRef>('OwnerCommandRef', input);
    return this.transaction(tenant, async (c, gate) => {
      const [rows] = await c.execute<RowDataPacket[]>('SELECT * FROM routing_owner_command WHERE tenant_id=? AND command_id=? FOR UPDATE', [tenant, ref.command_id]);
      let row = rows[0];
      if (!row) {
        if (!abort) ownerFail('NOT_FOUND');
        await c.execute("INSERT INTO routing_owner_command(tenant_id,command_id,binding_digest,state,terminal_digest,terminal_at,version,created_at,updated_at) VALUES (?,?,?,'aborted',?,UTC_TIMESTAMP(6),1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [tenant, ref.command_id, ref.binding_digest, ownerDigest(ref)]);
        return { ...ref, state: 'aborted' };
      }
      if (row.binding_digest !== ref.binding_digest) ownerFail('CONFLICT');
      if(row.operation!==null&&row.operation!=='configuration')ownerFail('FORBIDDEN');
      if (!row.binding_json) return { ...ref, state: 'aborted' };
      const binding = validateOwnerValue<OwnerCommandBinding>('OwnerCommandBinding', parse(row.binding_json));
      if (binding.owner !== 'routing' || ownerBindingDigest(binding) !== ref.binding_digest) ownerFail('FORBIDDEN');
      if (abort && row.state === 'prepared') {
        const result = { error: 'REVOKED' };
        await c.execute("UPDATE routing_owner_command SET state='aborted',result_json=?,terminal_digest=?,terminal_at=UTC_TIMESTAMP(6),version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND command_id=?", [ownerCanonical(result), ownerDigest(result), tenant, ref.command_id]);
        if (gate.state === 'closing' && gate.barrier_command_id === ref.command_id) await c.execute("UPDATE routing_capacity_gate SET state='open',version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=?", [tenant]);
        row = { ...row, state: 'aborted', result_json: result } as RowDataPacket;
      }
      const result = row.result_json ? parse<{ version?: string }>(row.result_json) : null;
      return validateOwnerValue<OwnerRecoveryProof>('OwnerRecoveryProof', { binding, binding_digest: ref.binding_digest, state: row.state, effect_id: row.state === 'committed' ? binding.resource.resource_id : null, effect_revision: row.state === 'committed' ? result?.version : null, children: [], candidate_digest: null, resource_contexts: [] });
    });
  }
  /** Only the composition's authenticated Identity response may enter this local port. */
  async admit(tenant: string, ref: OwnerCommandRef, input: OwnerAdmission) {
    const admission = validateOwnerValue<OwnerAdmission>('OwnerAdmission', input);
    if (admission.command_id !== ref.command_id || admission.binding_digest !== ref.binding_digest || admission.state !== 'admitted') ownerFail('FORBIDDEN');
    await this.transaction(tenant, async c => {
      const [rows] = await c.execute<RowDataPacket[]>('SELECT * FROM routing_owner_command WHERE tenant_id=? AND command_id=? FOR UPDATE', [tenant, ref.command_id]);
      const row = rows[0];
      if (!row || row.binding_digest !== ref.binding_digest) ownerFail('CONFLICT');
      if (row.state !== 'prepared') ownerFail('INVALID_TRANSITION');
      const binding = parse<OwnerCommandBinding>(row.binding_json);
      if (ownerCanonical([...admission.allowed_fields].sort()) !== ownerCanonical([...binding.fields].sort())) ownerFail('FORBIDDEN');
      if (row.admission_id && row.admission_id !== admission.admission_id) ownerFail('CONFLICT');
      await c.execute('UPDATE routing_owner_command SET admission_id=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND command_id=?', [admission.admission_id, tenant, ref.command_id]);
    });
  }
  async admissionId(tenant: string, ref: OwnerCommandRef): Promise<string | null> {
    const [rows] = await this.pool.execute<RowDataPacket[]>('SELECT admission_id,binding_digest FROM routing_owner_command WHERE tenant_id=? AND command_id=?', [tenant, ref.command_id]);
    if (!rows[0] || rows[0].binding_digest !== ref.binding_digest) ownerFail('CONFLICT');
    return rows[0].admission_id as string | null;
  }
  private async write(c: PoolConnection, tenant: string, input: RoutingConfiguration) {
    if (input.kind === 'skill') {
      if ((await c.execute<RowDataPacket[]>('SELECT id FROM routing_skill WHERE tenant_id=? AND skill_key=?', [tenant, input.key]))[0].length) ownerFail('CONFLICT');
      if (Number((await c.execute<RowDataPacket[]>('SELECT COUNT(*) n FROM routing_skill WHERE tenant_id=?', [tenant]))[0][0]!.n) >= 200) ownerFail('LIMIT_EXCEEDED');
      await c.execute('INSERT INTO routing_skill(tenant_id,id,skill_key,name) VALUES (?,?,?,?)', [tenant, input.id, input.key, input.name.trim()]); return '1';
    }
    const table = input.kind === 'profile' ? 'routing_human_profile' : input.kind === 'queue' ? 'routing_queue' : 'routing_team_skill';
    const key = input.kind === 'profile' ? 'principal_id' : input.kind === 'queue' ? 'id' : 'team_id';
    const [rows] = await c.execute<RowDataPacket[]>(`SELECT version FROM ${table} WHERE tenant_id=? AND ${key}=? FOR UPDATE`, [tenant, input.id]);
    if (String(rows[0]?.version ?? 0) !== input.expected_version) ownerFail('STALE_VERSION');
    const version = nextOwnerCounter(input.expected_version);
    if (input.kind !== 'profile') for (const skill of input.skill_ids) {
      if (!(await c.execute<RowDataPacket[]>('SELECT id FROM routing_skill WHERE tenant_id=? AND id=?', [tenant, skill]))[0].length) ownerFail('REFERENCE_INVALID');
    }
    if (input.kind === 'profile') {
      if (!rows.length && Number((await c.execute<RowDataPacket[]>('SELECT COUNT(*) n FROM routing_human_profile WHERE tenant_id=?', [tenant]))[0][0]!.n) >= 500) ownerFail('LIMIT_EXCEEDED');
      await c.execute('INSERT INTO routing_human_profile(tenant_id,principal_id,capacity,enabled,version) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE capacity=?,enabled=?,version=?,updated_at=UTC_TIMESTAMP(6)', [tenant, input.id, input.capacity, input.enabled, version, input.capacity, input.enabled, version]);
    } else if (input.kind === 'team-skills') {
      await c.execute('INSERT INTO routing_team_skill(tenant_id,team_id,skill_ids,version) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE skill_ids=?,version=?,updated_at=UTC_TIMESTAMP(6)', [tenant, input.id, ownerCanonical(input.skill_ids), version, ownerCanonical(input.skill_ids), version]);
    } else {
      if (!rows.length && Number((await c.execute<RowDataPacket[]>('SELECT COUNT(*) n FROM routing_queue WHERE tenant_id=?', [tenant]))[0][0]!.n) >= 50) ownerFail('LIMIT_EXCEEDED');
      await c.execute('INSERT INTO routing_queue(tenant_id,id,name,enabled,version) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE name=?,enabled=?,version=?,updated_at=UTC_TIMESTAMP(6)', [tenant, input.id, input.name.trim(), input.enabled, version, input.name.trim(), input.enabled, version]);
      await c.execute('INSERT INTO routing_queue_version(tenant_id,id,queue_id,version,team_id,connection_id,skill_ids,priority) VALUES (?,?,?,?,?,?,?,?)', [tenant, randomUUID(), input.id, version, input.team_id, input.connection_id, ownerCanonical(input.skill_ids), input.priority]);
    }
    return version;
  }
}
