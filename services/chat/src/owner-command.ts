import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { OwnerCommandBinding, OwnerCommandProof, OwnerRecoveryProof, OwnerCommandRef, OwnerAdmission, OwnerCapacity, OwnerReference } from '@agentic-crm/contracts';
import { ownerBindingDigest, ownerCanonical, ownerCounter, ownerDigest, ownerFail, validateOwnerValue } from '@agentic-crm/workload-transport';
import { businessTenant, session } from './database.js';
import { realtimeTransaction } from './realtime.js';

type CommandRow = RowDataPacket & {
  command_id: string; binding_digest: string; state: 'prepared' | 'committed' | 'aborted';
  binding_json: string | OwnerCommandBinding | null; result_json: string | Record<string, unknown> | null;
};
type DependencySlot = 'routing-capacity' | 'identity-admission' | 'crm-metadata' | 'crm-contact' | 'crm-mapping' | 'connector-connection';
function json<T>(value: string | T): T { return typeof value === 'string' ? JSON.parse(value) as T : value; }

/** Chat-local durable command state. No network call or foreign service SQL lives here. */
export class ChatOwnerCommands {
  constructor(private readonly pool: Pool, readonly epoch: string) { ownerCounter(epoch, true); }

  async transaction<T>(tenant: string, work: (connection: PoolConnection) => Promise<T>, exclusive = false): Promise<T> {
    return realtimeTransaction(tenant,()=>this.runTransaction(tenant,work,exclusive));
  }

  private async runTransaction<T>(tenant: string, work: (connection: PoolConnection) => Promise<T>, exclusive: boolean): Promise<T> {
    businessTenant(tenant);
    const connection = await this.pool.getConnection();
    const mutex = exclusive ? 'chat-inbox:' + ownerDigest({ tenant }).slice(0, 48) : null;
    let locked = false;
    try {
      await session(connection);
      if (mutex) {
        const [[row]] = await connection.execute<RowDataPacket[]>('SELECT GET_LOCK(?,10) acquired', [mutex]);
        if (Number(row?.acquired) !== 1) ownerFail('DEPENDENCY_UNAVAILABLE');
        locked = true;
      }
      await connection.beginTransaction();
      const [gates] = await connection.execute<RowDataPacket[]>(
        'SELECT mode,epoch FROM chat_writer_gate WHERE tenant_id=? FOR SHARE', [tenant]);
      if (gates[0]?.mode !== 'active' || String(gates[0].epoch) !== this.epoch) ownerFail('DEPENDENCY_UNAVAILABLE');
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      try { if (locked) await connection.execute('SELECT RELEASE_LOCK(?)', [mutex]); }
      catch { connection.destroy(); }
      finally { connection.release(); }
    }
  }

  private async row(connection: PoolConnection, tenant: string, ref: OwnerCommandRef): Promise<CommandRow | null> {
    const [rows] = await connection.execute<CommandRow[]>(
      'SELECT * FROM chat_owner_command WHERE tenant_id=? AND command_id=? FOR UPDATE', [tenant, ref.command_id]);
    const row = rows[0];
    if (row && row.binding_digest !== ref.binding_digest) ownerFail('CONFLICT');
    return row ?? null;
  }

  async prepare(bindingInput: OwnerCommandBinding, request: Record<string, unknown>): Promise<OwnerCommandProof> {
    const binding = validateOwnerValue<OwnerCommandBinding>('OwnerCommandBinding', bindingInput);
    const tenant = businessTenant(binding.tenant_id);
    if (binding.owner !== 'chat' || binding.dependencies.length) ownerFail('INVALID_REQUEST');
    for (const value of [binding.resource.record_version, binding.resource.owner_revision, binding.resource.control_revision]) ownerCounter(value);
    if (ownerDigest(request) !== binding.payload_digest) ownerFail('CONFLICT');
    const requestJson = ownerCanonical(request);
    if (Buffer.byteLength(requestJson) > 262144) ownerFail('LIMIT_EXCEEDED');
    const ref = { command_id: binding.command_id, binding_digest: ownerBindingDigest(binding) };
    return this.transaction(tenant, async connection => {
      // The resource lock serializes legacy receipt identities even when a caller changes command_id.
      await connection.execute('SELECT id FROM crm_record WHERE tenant_id=? AND id=? FOR UPDATE', [tenant, binding.resource.resource_id]);
      const [legacy] = await connection.execute<RowDataPacket[]>(
        'SELECT command_id,binding_digest FROM chat_owner_command WHERE tenant_id=? AND actor_id=? AND legacy_route=?',
        [tenant, binding.actor.principal_id, binding.legacy_receipt_key]);
      if (legacy.some(row => row.command_id !== binding.command_id || row.binding_digest !== ref.binding_digest)) ownerFail('CONFLICT');
      // The duplicate insert takes the same lock as apply/abort, including a pre-prepare tombstone.
      await connection.execute(`INSERT INTO chat_owner_command
        (tenant_id,command_id,operation,binding_digest,actor_kind,actor_id,delegation_id,resource_kind,resource_id,
         record_version,owner_revision,control_revision,binding_json,request_json,legacy_route,state,version,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'prepared',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))
        ON DUPLICATE KEY UPDATE command_id=command_id`,
      [tenant, binding.command_id, binding.operation, ref.binding_digest, binding.actor.kind, binding.actor.principal_id,
        binding.actor.delegation_id, binding.resource.object_key, binding.resource.resource_id, binding.resource.record_version,
        binding.resource.owner_revision, binding.resource.control_revision, ownerCanonical(binding), requestJson, binding.legacy_receipt_key]);
      const row = (await this.row(connection, tenant, ref))!;
      if (row.state === 'aborted') ownerFail('INVALID_TRANSITION');
      if (ownerCanonical(json(row.binding_json!)) !== ownerCanonical(binding)) ownerFail('CONFLICT');
      return this.proofFrom(row);
    });
  }

  private proofFrom(row: CommandRow): OwnerCommandProof {
    // A pre-prepare tombstone has no actor/resource and is never fabricated into a full binding proof.
    if (row.binding_json === null) ownerFail('INVALID_TRANSITION');
    const binding = json<OwnerCommandBinding>(row.binding_json);
    const result = row.result_json === null ? null : json<Record<string, unknown>>(row.result_json);
    return validateOwnerValue<OwnerCommandProof>('OwnerCommandProof', {
      binding, binding_digest: row.binding_digest, state: row.state,
      effect_id: row.state === 'committed' ? result?.effect_id ?? null : null,
      effect_revision: row.state === 'committed' ? result?.effect_revision ?? null : null,
      children: [], candidate_digest: null, resource_contexts: [],
      ...(binding.operation === 'ingress-process' && binding.ingress_touchpoint && row.state === 'committed' ? { ingress_result: (() => {
        const data = result?.data as Record<string, unknown>;
        return { receipt_id: data.receipt_id, state: data.state, conversation_id: data.conversation_id ?? null, message_id: data.message_id ?? null, touchpoint_id: data.touchpoint_id ?? null, session_id: data.session_id ?? null };
      })() } : {}),
    });
  }

  async proof(tenant: string, refInput: OwnerCommandRef): Promise<OwnerRecoveryProof> {
    businessTenant(tenant);
    const ref = validateOwnerValue<OwnerCommandRef>('OwnerCommandRef', refInput);
    const [rows] = await this.pool.execute<CommandRow[]>(
      'SELECT * FROM chat_owner_command WHERE tenant_id=? AND command_id=?', [tenant, ref.command_id]);
    if (!rows[0]) ownerFail('NOT_FOUND');
    if (rows[0].binding_digest !== ref.binding_digest) ownerFail('CONFLICT');
    if (rows[0].binding_json === null && rows[0].state === 'aborted') return { ...ref, state: 'aborted' };
    const proof = this.proofFrom(rows[0]);
    const [dependencies] = await this.pool.execute<RowDataPacket[]>('SELECT remote_owner,receipt_id,binding_digest FROM chat_owner_dependency WHERE tenant_id=? AND command_id=? AND receipt_id IS NOT NULL ORDER BY slot', [tenant, ref.command_id]);
    return validateOwnerValue<OwnerCommandProof>('OwnerCommandProof', { ...proof, binding: { ...proof.binding,
      dependencies: dependencies.map(d => ({ owner: d.remote_owner, receipt_id: d.receipt_id, binding_digest: d.binding_digest })) } });
  }

  async existing(tenant: string, commandId: string): Promise<OwnerRecoveryProof | null> {
    businessTenant(tenant);
    const [rows] = await this.pool.execute<RowDataPacket[]>('SELECT binding_digest FROM chat_owner_command WHERE tenant_id=? AND command_id=?', [tenant, commandId]);
    return rows[0] ? this.proof(tenant, { command_id: commandId, binding_digest: rows[0].binding_digest }) : null;
  }

  async abort(tenant: string, refInput: OwnerCommandRef): Promise<{ command_id: string; binding_digest: string; state: 'committed' | 'aborted' }> {
    const ref = validateOwnerValue<OwnerCommandRef>('OwnerCommandRef', refInput);
    return this.transaction(tenant, async connection => {
      const terminal = { ...ref, state: 'aborted' as const };
      await connection.execute(`INSERT INTO chat_owner_command
        (tenant_id,command_id,binding_digest,state,terminal_digest,terminal_at,version,created_at,updated_at)
        VALUES (?,?,?,'aborted',?,UTC_TIMESTAMP(6),1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))
        ON DUPLICATE KEY UPDATE command_id=command_id`, [tenant, ref.command_id, ref.binding_digest, ownerDigest(terminal)]);
      const row = (await this.row(connection, tenant, ref))!;
      if (row.state === 'committed') return { ...ref, state: 'committed' };
      if (row.state === 'aborted') return terminal;
      const [children] = await connection.execute<RowDataPacket[]>(
        "SELECT slot FROM chat_owner_dependency WHERE tenant_id=? AND command_id=? AND state IN ('pending','committed') FOR UPDATE", [tenant, ref.command_id]);
      // Pending child effect needs terminal proof; timeout is not proof of absence.
      if (children.length) ownerFail('DEPENDENCY_UNAVAILABLE');
      await connection.execute(`UPDATE chat_owner_command SET state='aborted',terminal_digest=?,terminal_at=UTC_TIMESTAMP(6),
        version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND command_id=?`, [ownerDigest(terminal), tenant, ref.command_id]);
      return terminal;
    });
  }

  /** Internal local commit port. The coordinator verifies remote receipts before calling it. */
  async commit(tenant: string, refInput: OwnerCommandRef, admissionId: string,
    effect: (connection: PoolConnection, binding: OwnerCommandBinding, request: Record<string, unknown>) => Promise<{ effect_id: string; effect_revision: string; data?: Record<string, unknown> }>, exclusive = false): Promise<OwnerCommandProof> {
    const ref = validateOwnerValue<OwnerCommandRef>('OwnerCommandRef', refInput);
    const observed = await this.proof(tenant, ref);
    if (!('binding' in observed)) ownerFail('INVALID_TRANSITION');
    return this.transaction(tenant, async connection => {
      await connection.execute('SELECT id FROM crm_record WHERE tenant_id=? AND id=? FOR UPDATE', [tenant, observed.binding.resource.resource_id]);
      const row = await this.row(connection, tenant, ref);
      if (!row) ownerFail('NOT_FOUND');
      if (row.state === 'aborted') ownerFail('INVALID_TRANSITION');
      if (row.state === 'committed') return this.proofFrom(row);
      const result = await effect(connection, json<OwnerCommandBinding>(row.binding_json!), json<Record<string, unknown>>(row.request_json));
      ownerCounter(result.effect_revision, true);
      if (Buffer.byteLength(ownerCanonical(result)) > 262144) ownerFail('LIMIT_EXCEEDED');
      await connection.execute(`UPDATE chat_owner_command SET state='committed',admission_id=?,result_json=?,terminal_digest=?,
        terminal_at=UTC_TIMESTAMP(6),version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND command_id=?`,
      [admissionId, ownerCanonical(result), ownerDigest({ ...ref, state: 'committed', ...result }), tenant, ref.command_id]);
      return this.proofFrom((await this.row(connection, tenant, ref))!);
    }, exclusive);
  }

  async request(tenant: string, ref: OwnerCommandRef): Promise<Record<string, unknown>> {
    const proof = await this.proof(tenant, ref);
    if (!('binding' in proof)) ownerFail('INVALID_TRANSITION');
    const [rows] = await this.pool.execute<RowDataPacket[]>('SELECT request_json FROM chat_owner_command WHERE tenant_id=? AND command_id=?', [tenant, ref.command_id]);
    if (!rows[0]?.request_json) ownerFail('INVALID_TRANSITION');
    const request = json<Record<string, unknown>>(rows[0].request_json);
    if (ownerDigest(request) !== proof.binding.payload_digest) ownerFail('CONFLICT');
    return request;
  }

  /** Accept one CRM note child under the same registry/command lock used by abort. */
  async beginNote(tenant:string,ref:OwnerCommandRef,accept:(c:PoolConnection,b:OwnerCommandBinding)=>Promise<void>){
    const observed=await this.proof(tenant,ref);if(!('binding' in observed)||observed.binding.operation!=='note-effect')ownerFail('FORBIDDEN');
    return this.transaction(tenant,async c=>{
      await c.execute('SELECT id FROM crm_record WHERE tenant_id=? AND id=? FOR UPDATE',[tenant,observed.binding.resource.resource_id]);
      const row=await this.row(c,tenant,ref);if(!row||row.state!=='prepared')ownerFail('INVALID_TRANSITION');
      const [[child]]=await c.execute<RowDataPacket[]>("SELECT state FROM chat_owner_dependency WHERE tenant_id=? AND command_id=? AND slot='crm-note' FOR UPDATE",[tenant,ref.command_id]);
      if(child){if(child.state!=='pending')ownerFail('INVALID_TRANSITION');return;}
      const b=json<OwnerCommandBinding>(row.binding_json!);await accept(c,b);
      await c.execute(`INSERT INTO chat_owner_dependency(tenant_id,command_id,slot,remote_owner,remote_command_id,child_key,binding_digest,receipt_id,state,request_json,remote_revision,next_attempt_at,version,created_at,updated_at)
        VALUES (?,?,'crm-note','crm',?,?,?,?,'pending',?,1,UTC_TIMESTAMP(6),1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,[tenant,ref.command_id,ref.command_id,ref.command_id+':note:v1',ref.binding_digest,ref.command_id,ownerCanonical(ref)]);
    });
  }

  /** Internal resolver supplies verified CRM terminal state; terminal children are immutable. */
  async noteAborted(tenant:string,ref:OwnerCommandRef){
    await this.transaction(tenant,async c=>{
      const row=await this.row(c,tenant,ref);if(!row||row.state!=='prepared')return;
      const [[child]]=await c.execute<RowDataPacket[]>("SELECT state FROM chat_owner_dependency WHERE tenant_id=? AND command_id=? AND slot='crm-note' FOR UPDATE",[tenant,ref.command_id]);
      if(child?.state==='committed')ownerFail('CONFLICT');
      if(child?.state==='pending')await c.execute("UPDATE chat_owner_dependency SET state='aborted',version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND command_id=? AND slot='crm-note'",[tenant,ref.command_id]);
    });
  }

  /** Accept one Sales outcome child under the same registry/command lock used by abort. */
  async beginOutcome(tenant:string,ref:OwnerCommandRef,accept:(c:PoolConnection,b:OwnerCommandBinding)=>Promise<void>){
    const observed=await this.proof(tenant,ref);if(!('binding' in observed)||observed.binding.operation!=='need-outcome-effect')ownerFail('FORBIDDEN');
    return this.transaction(tenant,async c=>{
      await c.execute('SELECT id FROM crm_record WHERE tenant_id=? AND id=? FOR UPDATE',[tenant,observed.binding.resource.resource_id]);
      const row=await this.row(c,tenant,ref);if(!row||row.state!=='prepared')ownerFail('INVALID_TRANSITION');
      const [[child]]=await c.execute<RowDataPacket[]>("SELECT state FROM chat_owner_dependency WHERE tenant_id=? AND command_id=? AND slot='sales-outcome' FOR UPDATE",[tenant,ref.command_id]);
      if(child){if(child.state!=='pending')ownerFail('INVALID_TRANSITION');return;}
      const b=json<OwnerCommandBinding>(row.binding_json!);await accept(c,b);
      await c.execute(`INSERT INTO chat_owner_dependency(tenant_id,command_id,slot,remote_owner,remote_command_id,child_key,binding_digest,receipt_id,state,request_json,remote_revision,next_attempt_at,version,created_at,updated_at)
        VALUES (?,?,'sales-outcome','sales',?,?,?,?,'pending',?,1,UTC_TIMESTAMP(6),1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,[tenant,ref.command_id,ref.command_id,ref.command_id+':outcome:v1',ref.binding_digest,ref.command_id,ownerCanonical(ref)]);
    });
  }

  /** Internal resolver supplies verified Sales terminal state; terminal children are immutable. */
  async outcomeAborted(tenant:string,ref:OwnerCommandRef){
    await this.transaction(tenant,async c=>{
      const row=await this.row(c,tenant,ref);if(!row||row.state!=='prepared')return;
      const [[child]]=await c.execute<RowDataPacket[]>("SELECT state FROM chat_owner_dependency WHERE tenant_id=? AND command_id=? AND slot='sales-outcome' FOR UPDATE",[tenant,ref.command_id]);
      if(child?.state==='committed')ownerFail('CONFLICT');
      if(child?.state==='pending')await c.execute("UPDATE chat_owner_dependency SET state='aborted',version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND command_id=? AND slot='sales-outcome'",[tenant,ref.command_id]);
    });
  }

  /** Internal only; the caller must separately admit delivery under current rights. */
  async result(tenant: string, ref: OwnerCommandRef): Promise<Record<string, unknown>> {
    const proof = await this.proof(tenant, ref);
    if (proof.state !== 'committed') ownerFail('INVALID_TRANSITION');
    const [rows] = await this.pool.execute<RowDataPacket[]>('SELECT result_json FROM chat_owner_command WHERE tenant_id=? AND command_id=?', [tenant, ref.command_id]);
    if (!rows[0]?.result_json) ownerFail('INVALID_TRANSITION');
    return json<Record<string, unknown>>(rows[0].result_json);
  }

  async dependency(tenant: string, ref: OwnerCommandRef, slot: DependencySlot): Promise<OwnerCapacity | OwnerAdmission | OwnerReference | null> {
    await this.proof(tenant, ref);
    const [rows] = await this.pool.execute<RowDataPacket[]>('SELECT proof_json FROM chat_owner_dependency WHERE tenant_id=? AND command_id=? AND slot=?', [tenant, ref.command_id, slot]);
    return rows[0] ? json(rows[0].proof_json) : null;
  }

  async rememberDependency(tenant: string, ref: OwnerCommandRef, slot: DependencySlot, input: OwnerCapacity | OwnerAdmission | OwnerReference): Promise<void> {
    const capacity = slot === 'routing-capacity';
    const metadata = ['crm-metadata', 'crm-contact', 'crm-mapping', 'connector-connection'].includes(slot);
    const proof = validateOwnerValue<OwnerCapacity | OwnerAdmission | OwnerReference>(metadata ? 'OwnerReference' : capacity ? 'OwnerCapacity' : 'OwnerAdmission', input);
    if (proof.command_id !== ref.command_id || proof.binding_digest !== ref.binding_digest) ownerFail('FORBIDDEN');
    const receipt = 'reservation_id' in proof ? proof.reservation_id : proof.admission_id;
    await this.transaction(tenant, async connection => {
      const command = await this.row(connection, tenant, ref);
      if (!command || command.state === 'aborted') ownerFail('INVALID_TRANSITION');
      if (command.state === 'committed') {
        const [stored] = await connection.execute<RowDataPacket[]>('SELECT proof_json FROM chat_owner_dependency WHERE tenant_id=? AND command_id=? AND slot=?', [tenant, ref.command_id, slot]);
        if (!stored[0]) ownerFail('INVALID_TRANSITION');
        if (ownerCanonical(json(stored[0].proof_json)) !== ownerCanonical(proof)) ownerFail('CONFLICT');
        return;
      }
      await connection.execute(`INSERT INTO chat_owner_dependency
        (tenant_id,command_id,slot,remote_owner,remote_command_id,child_key,binding_digest,receipt_id,state,request_json,proof_json,remote_revision,next_attempt_at,version,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,'prepared',?,?,1,UTC_TIMESTAMP(6),1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))
        ON DUPLICATE KEY UPDATE slot=slot`,
      [tenant, ref.command_id, slot, slot === 'connector-connection' ? 'connector' : metadata ? 'crm' : capacity ? 'routing' : 'identity', ref.command_id, slot + ':' + ref.command_id, ref.binding_digest, receipt, ownerCanonical(ref), ownerCanonical(proof)]);
      const [rows] = await connection.execute<RowDataPacket[]>('SELECT proof_json FROM chat_owner_dependency WHERE tenant_id=? AND command_id=? AND slot=? FOR UPDATE', [tenant, ref.command_id, slot]);
      if (ownerCanonical(json(rows[0]!.proof_json)) !== ownerCanonical(proof)) ownerFail('CONFLICT');
    });
  }
}
