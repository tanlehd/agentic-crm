import { randomUUID } from 'node:crypto';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { OwnerCapacity, OwnerCommandBinding, OwnerCommandRef, OwnerRecoveryProof } from '@agentic-crm/contracts';
import { nextOwnerCounter, ownerBindingDigest, ownerDigest, ownerFail, OwnerDomainError, validateOwnerValue } from '@agentic-crm/workload-transport';
import {completeReroute,lockedRerouteJob,rerouteJob} from './owner-reroute-journal.js';

type Reservation = RowDataPacket & {
  id: string; command_id: string; binding_digest: string; conversation_id: string; session_id: string;
  principal_id: string | null; queue_id: string | null; queue_version: string; profile_version: string;
  owner_revision: string; mode: 'managed' | 'not-managed' | 'unassign' | 'close'; state: 'reserved' | 'confirmed' | 'released'; terminal_digest: string | null;
};
export type CapacityRecovery = (tenant: string, command: OwnerCommandRef, abort?: boolean) => Promise<OwnerRecoveryProof>;
function uuid(value: string) { if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) ownerFail('INVALID_REQUEST'); }

/** Candidate Routing owner. The pool has no Identity, Chat or CRM grants. */
export class NativeOwnerCapacity {
  constructor(private readonly pool: Pool, private readonly recovery: CapacityRecovery) {}

  private async transaction<T>(tenant: string, work: (c: PoolConnection, open: boolean) => Promise<T>) {
    uuid(tenant);
    if (['01900000-0000-7000-8000-000000000001', '00000000-0000-0000-0000-000000000000'].includes(tenant)) ownerFail('FORBIDDEN');
    const c = await this.pool.getConnection();
    try {
      await c.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED'); await c.beginTransaction();
      const [gate] = await c.execute<RowDataPacket[]>('SELECT state FROM routing_capacity_gate WHERE tenant_id=? FOR UPDATE', [tenant]);
      if (!gate[0]) ownerFail('DEPENDENCY_UNAVAILABLE');
      const result = await work(c, gate[0].state === 'open'); await c.commit(); return result;
    } catch (e) { await c.rollback(); throw e; } finally { c.release(); }
  }

  private async row(c: PoolConnection, tenant: string, command: OwnerCommandRef, session: string, id: string | null) {
    const [rows] = await c.execute<Reservation[]>('SELECT * FROM routing_capacity_reservation WHERE tenant_id=? AND command_id=? FOR UPDATE', [tenant, command.command_id]);
    const row = rows[0];
    if (row && (row.binding_digest !== command.binding_digest || row.session_id !== session || id !== null && row.id !== id)) ownerFail('CONFLICT');
    return row;
  }

  private async receipt(c: PoolConnection, tenant: string, r: Reservation): Promise<OwnerCapacity> {
    const [queues] = r.queue_id ? await c.execute<RowDataPacket[]>('SELECT id FROM routing_queue_version WHERE tenant_id=? AND queue_id=? AND version=?', [tenant, r.queue_id, r.queue_version]) : [[]];
    const [allocations] = await c.execute<RowDataPacket[]>('SELECT id FROM routing_human_allocation WHERE tenant_id=? AND id=?', [tenant, r.id]);
    return validateOwnerValue<OwnerCapacity>('OwnerCapacity', {
      reservation_id: r.id, command_id: r.command_id, binding_digest: r.binding_digest, session_id: r.session_id,
      principal_id: r.principal_id, owner_revision: String(r.owner_revision), state: r.mode === 'not-managed' && r.state === 'reserved' ? 'not-managed' : r.state,
      allocation_id: allocations[0]?.id ?? null, queue_version_id: queues[0]?.id ?? null,
    });
  }

  private async proof(tenant: string, command: OwnerCommandRef, session: string) {
    validateOwnerValue('OwnerCommandRef', command); uuid(session);
    const proof = validateOwnerValue<OwnerRecoveryProof>('OwnerRecoveryProof', await this.recovery(tenant, command));
    if (proof.binding_digest !== command.binding_digest) ownerFail('FORBIDDEN');
    if ('binding' in proof) {
      const b = proof.binding;
      if (b.tenant_id !== tenant || b.owner !== 'chat' || b.command_id !== command.command_id || b.session_id !== session || ownerBindingDigest(b) !== command.binding_digest) ownerFail('FORBIDDEN');
    } else if (proof.command_id !== command.command_id) ownerFail('FORBIDDEN');
    return proof;
  }

  async status(tenant: string, command: OwnerCommandRef, session: string, id: string | null) {
    validateOwnerValue('OwnerCommandRef', command); uuid(session);
    return this.transaction(tenant, async c => {
      const row = await this.row(c, tenant, command, session, id); if (!row) ownerFail('NOT_FOUND');
      return this.receipt(c, tenant, row);
    });
  }

  /** Routing-local barrier worker. Network recovery never runs in a Routing transaction. */
  async drainTenant(tenant: string) {
    for (;;) {
      const rows = await this.transaction(tenant, async (c, open) => {
        if (open) ownerFail('CONFLICT');
        return (await c.execute<Reservation[]>("SELECT * FROM routing_capacity_reservation WHERE tenant_id=? AND state='reserved' ORDER BY id LIMIT 100", [tenant]))[0];
      });
      if (!rows.length) return;
      for (const row of rows) {
        const command = { command_id: row.command_id, binding_digest: row.binding_digest };
        const proof = validateOwnerValue<OwnerRecoveryProof>('OwnerRecoveryProof', await this.recovery(tenant, command, true));
        if (proof.state === 'prepared') ownerFail('DEPENDENCY_UNAVAILABLE');
        // settle independently obtains and validates the current owning proof.
        await this.settle(tenant, command, row.session_id, row.id, proof.state === 'aborted');
      }
    }
  }

  async reserve(tenant: string, command: OwnerCommandRef, session: string, id: string | null = null) {
    const proof = await this.proof(tenant, command, session);
    return this.transaction(tenant, async (c, open) => {
      const old = await this.row(c, tenant, command, session, id); if (old) return this.receipt(c, tenant, old);
      if (!open) ownerFail('REVOKED');
      if (!('binding' in proof) || proof.state !== 'prepared') ownerFail('INVALID_TRANSITION');
      const b = proof.binding;
      if (!['routing-assignment', 'routing-takeover', 'conversation-close'].includes(b.operation) || !b.target) ownerFail('INVALID_REQUEST');
      const closing = b.operation === 'conversation-close';
      if (closing && (b.target.principal_id !== b.resource.owner_principal_id || b.target.team_id !== b.resource.team_id)) ownerFail('FORBIDDEN');
      if (!closing && b.target.kind !== null && b.target.kind !== 'human') ownerFail('FORBIDDEN');
      const [heads] = await c.execute<RowDataPacket[]>('SELECT * FROM routing_allocation_head WHERE tenant_id=? AND session_id=? FOR UPDATE', [tenant, session]);
      if (heads[0] && (heads[0].conversation_id !== b.resource.resource_id || heads[0].state === 'closed' || BigInt(heads[0].owner_revision) > BigInt(b.resource.owner_revision))) ownerFail('STALE_VERSION');
      const [works] = await c.execute<RowDataPacket[]>('SELECT * FROM routing_work_item WHERE tenant_id=? AND session_id=? FOR UPDATE', [tenant, session]);
      const work = works[0];
      if (work && (work.conversation_id !== b.resource.resource_id || work.state === 'completed')) ownerFail('STALE_VERSION');
      const target = b.target.principal_id;
      const [profiles] = target ? await c.execute<RowDataPacket[]>('SELECT * FROM routing_human_profile WHERE tenant_id=? AND principal_id=? FOR UPDATE', [tenant, target]) : [[]];
      const profile = profiles[0];
      const [currentProfiles] = await c.execute<RowDataPacket[]>('SELECT principal_id FROM routing_human_profile WHERE tenant_id=? AND principal_id=?', [tenant, b.resource.owner_principal_id]);
      const [queues] = await c.execute<RowDataPacket[]>('SELECT id FROM routing_queue WHERE tenant_id=? AND enabled=1 LIMIT 1', [tenant]);
      if (!closing && !work && queues.length) ownerFail('REFERENCE_INVALID');
      const managed = !!(work || profile || currentProfiles.length);
      if (!closing && managed && target && b.target.kind === 'human' && !profile) {if(b.routing_reroute)throw new OwnerDomainError('HUMAN_PROFILE_REQUIRED',b.command_id);ownerFail('CAPACITY');}
      const mode = closing ? 'close' : !target ? 'unassign' : profile ? 'managed' : 'not-managed';
      const [entries] = work ? await c.execute<RowDataPacket[]>(`SELECT e.id,e.state,e.queue_version_id,v.queue_id,v.version,v.team_id,v.skill_ids,q.enabled FROM routing_queue_entry e
        JOIN routing_queue_version v ON v.tenant_id=e.tenant_id AND v.id=e.queue_version_id JOIN routing_queue q ON q.tenant_id=v.tenant_id AND q.id=v.queue_id
        WHERE e.tenant_id=? AND e.work_id=? ORDER BY e.wait_started_at DESC,e.id DESC LIMIT 1`, [tenant, work.id]) : [[]];
      let entry = entries[0];
      if(b.routing_reroute){
        const pin=b.routing_reroute;
        if(b.routing_dispatch||b.actor.kind!=='human'||b.operation!=='routing-assignment'||!work||work.id!==pin.work_id||String(work.version)!==pin.work_version)ownerFail('STALE_VERSION');
        const job=await lockedRerouteJob(c,tenant,b);if(job.state!=='prepared')ownerFail('INVALID_TRANSITION');
        const [[pending]]=await c.execute<RowDataPacket[]>("SELECT id FROM routing_capacity_reservation WHERE tenant_id=? AND session_id=? AND state='reserved' LIMIT 1",[tenant,session]);if(pending)ownerFail('CONFLICT');
        const [[selected]]=await c.execute<RowDataPacket[]>(`SELECT v.id queue_version_id,v.queue_id,v.version,v.team_id,v.skill_ids,q.enabled FROM routing_queue_version v JOIN routing_queue q ON q.tenant_id=v.tenant_id AND q.id=v.queue_id AND q.version=v.version WHERE v.tenant_id=? AND v.id=?`,[tenant,pin.queue_version_id]);
        if(!selected||!selected.enabled||selected.team_id!==b.target.team_id||selected.queue_id!==rerouteJob(tenant,job).saved.body.queue_id)ownerFail('STALE_VERSION');
        entry=selected;
      }
      if(b.routing_dispatch&&(b.actor.kind!=='service'||b.operation!=='routing-assignment'||b.resource.owner_principal_id!==null||work?.state!=='waiting'||work.id!==b.routing_dispatch.work_id||entry?.state!=='waiting'||entry.id!==b.routing_dispatch.entry_id||entry.queue_version_id!==b.routing_dispatch.queue_version_id||entry.team_id!==b.target.team_id))ownerFail('STALE_VERSION');
      if (mode === 'managed') {
        const [same] = await c.execute<RowDataPacket[]>(`SELECT a.id FROM routing_human_allocation a JOIN routing_work_item w ON w.tenant_id=a.tenant_id AND w.id=a.work_id
          WHERE a.tenant_id=? AND w.session_id=? AND a.principal_id=? AND a.released_at IS NULL`, [tenant, session, target]);
        const [load] = await c.execute<RowDataPacket[]>(`SELECT COUNT(*) n FROM (
          SELECT w.session_id FROM routing_human_allocation a JOIN routing_work_item w ON w.tenant_id=a.tenant_id AND w.id=a.work_id
          WHERE a.tenant_id=? AND a.principal_id=? AND a.released_at IS NULL
          UNION SELECT session_id FROM routing_capacity_reservation WHERE tenant_id=? AND principal_id=? AND mode='managed' AND state='reserved'
        ) occupied`, [tenant, target, tenant, target]);
        if (!same.length && (!profile!.enabled || Number(load[0]!.n) >= Number(profile!.capacity))) {if(b.routing_reroute)throw new OwnerDomainError('HUMAN_CAPACITY_FULL',b.command_id);ownerFail('CAPACITY');}
        if (entry) {
          const [skills] = await c.execute<RowDataPacket[]>('SELECT skill_ids FROM routing_team_skill WHERE tenant_id=? AND team_id=?', [tenant, b.target.team_id]);
          const array = (v: unknown): string[] => typeof v === 'string' ? JSON.parse(v) : v as string[];
          if (!entry.enabled || !array(entry.skill_ids).every(s => array(skills[0]?.skill_ids ?? []).includes(s))) {if(b.routing_reroute)throw new OwnerDomainError('NO_MATCHING_SKILL',b.command_id);ownerFail('CAPACITY');}
        }
      }
      const reservation = randomUUID();
      await c.execute(`INSERT INTO routing_capacity_reservation
        (tenant_id,id,command_id,binding_digest,conversation_id,session_id,principal_id,queue_id,queue_version,profile_version,owner_revision,mode,state,version,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'reserved',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,
      [tenant, reservation, command.command_id, command.binding_digest, b.resource.resource_id, session, target, entry?.queue_id ?? null, entry?.version ?? '0', profile?.version ?? '0', closing ? b.resource.owner_revision : nextOwnerCounter(b.resource.owner_revision), mode]);
      return this.receipt(c, tenant, (await this.row(c, tenant, command, session, reservation))!);
    });
  }

  async settle(tenant: string, command: OwnerCommandRef, session: string, id: string | null, release: boolean) {
    const proof = await this.proof(tenant, command, session);
    if (proof.state === 'prepared') ownerFail('DEPENDENCY_UNAVAILABLE');
    if (!release && proof.state !== 'committed') ownerFail('INVALID_TRANSITION');
    return this.transaction(tenant, async c => {
      const r = await this.row(c, tenant, command, session, id); if (!r) ownerFail('NOT_FOUND');
      const digest = ownerDigest(proof);
      if (release && proof.state === 'committed') {
        // The newer head was itself accepted only from an authenticated committed
        // Chat proof. It is durable evidence of transfer/close, not a live-state guess.
        const [heads] = await c.execute<RowDataPacket[]>('SELECT owner_revision,state FROM routing_allocation_head WHERE tenant_id=? AND session_id=? FOR UPDATE', [tenant, session]);
        if (!heads[0] || !(BigInt(heads[0].owner_revision) > BigInt(r.owner_revision) ||
            heads[0].state === 'closed' && r.mode !== 'close' && BigInt(heads[0].owner_revision) === BigInt(r.owner_revision))) ownerFail('STALE_VERSION');
        if (r.state === 'released') {
          if (r.terminal_digest !== digest) ownerFail('CONFLICT');
          return this.receipt(c, tenant, r);
        }
        await c.execute("UPDATE routing_capacity_reservation SET state='released',terminal_digest=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?", [digest, tenant, r.id]);
        if('binding' in proof)await completeReroute(c,tenant,proof.binding);
        return this.receipt(c, tenant, (await this.row(c, tenant, command, session, id))!);
      }
      if (r.state !== 'reserved') {
        if (r.terminal_digest !== digest) ownerFail('CONFLICT');
        return this.receipt(c, tenant, r);
      }
      if (proof.state === 'committed') {
        if (!('binding' in proof) || proof.effect_id !== r.conversation_id || proof.effect_revision !== nextOwnerCounter(proof.binding.resource.record_version) ||
            (r.mode === 'close' ? proof.binding.resource.owner_revision : nextOwnerCounter(proof.binding.resource.owner_revision)) !== String(r.owner_revision) ||
            (r.mode === 'close') !== (proof.binding.operation === 'conversation-close')) ownerFail('FORBIDDEN');
        await this.allocate(c, tenant, r, proof.binding);
        await completeReroute(c,tenant,proof.binding);
      }
      await c.execute('UPDATE routing_capacity_reservation SET state=?,terminal_digest=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?', [release ? 'released' : 'confirmed', digest, tenant, r.id]);
      return this.receipt(c, tenant, (await this.row(c, tenant, command, session, id))!);
    });
  }

  private async allocate(c: PoolConnection, tenant: string, r: Reservation, b: OwnerCommandBinding) {
    const [heads] = await c.execute<RowDataPacket[]>('SELECT * FROM routing_allocation_head WHERE tenant_id=? AND session_id=? FOR UPDATE', [tenant, r.session_id]);
    const head = heads[0];
    if (head) {
      const order = BigInt(head.owner_revision) - BigInt(r.owner_revision);
      if (order > 0n || head.state === 'closed') return;
      if (order === 0n && r.mode !== 'close') {
        if (head.reservation_id !== r.id) ownerFail('CONFLICT');
        return;
      }
    }
    const [works] = await c.execute<RowDataPacket[]>('SELECT * FROM routing_work_item WHERE tenant_id=? AND session_id=? FOR UPDATE', [tenant, r.session_id]);
    let work = works[0];
    if (!work && r.mode === 'managed') {
      const workId = randomUUID();
      await c.execute("INSERT INTO routing_work_item(tenant_id,id,session_id,conversation_id,state) VALUES (?,?,?,?,'waiting')", [tenant, workId, r.session_id, r.conversation_id]);
      work = { id: workId } as RowDataPacket;
    }
    if (work) {
      let rerouteEntry:string|null=null;
      if(b.routing_reroute){
        if(work.id!==b.routing_reroute.work_id)ownerFail('CONFLICT');
        await c.execute("UPDATE routing_queue_entry SET state='cancelled',ended_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND work_id=? AND state='waiting'",[tenant,work.id]);
        rerouteEntry=randomUUID();
        await c.execute("INSERT INTO routing_queue_entry(tenant_id,id,work_id,queue_version_id,state) VALUES (?,?,?,?,'waiting')",[tenant,rerouteEntry,work.id,b.routing_reroute.queue_version_id]);
      }
      const [active] = await c.execute<RowDataPacket[]>('SELECT principal_id FROM routing_human_allocation WHERE tenant_id=? AND work_id=? AND released_at IS NULL', [tenant, work.id]);
      const same = r.mode === 'managed' && active[0]?.principal_id === r.principal_id;
      if (!same) await c.execute('UPDATE routing_human_allocation SET released_at=UTC_TIMESTAMP(6),release_reason=? WHERE tenant_id=? AND work_id=? AND released_at IS NULL', [r.mode === 'close' ? 'completed' : 'transferred', tenant, work.id]);
      if (r.mode === 'managed' && !same) {
        const attempt = randomUUID();
        await c.execute('INSERT INTO routing_assignment_attempt(tenant_id,id,work_id,entry_id,principal_id,owner_revision,reason) VALUES (?,?,?,?,?,?,?)', [tenant, attempt, work.id, rerouteEntry, r.principal_id, r.owner_revision,rerouteEntry?'routed':'owner_sync']);
        await c.execute('INSERT INTO routing_human_allocation(tenant_id,id,work_id,attempt_id,principal_id,team_id) VALUES (?,?,?,?,?,?)', [tenant, r.id, work.id, attempt, r.principal_id, b.target?.team_id ?? null]);
      }
      await c.execute("UPDATE routing_work_item SET state=?,completed_at=IF(?='completed',UTC_TIMESTAMP(6),completed_at),version=version+? WHERE tenant_id=? AND id=?", [r.mode === 'close' ? 'completed' : r.principal_id ? 'assigned' : 'waiting', r.mode === 'close' ? 'completed' : '',rerouteEntry&&r.principal_id?2:1, tenant, work.id]);
      if(!rerouteEntry||r.principal_id)await c.execute("UPDATE routing_queue_entry SET state=?,ended_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND work_id=? AND state='waiting'", [r.mode === 'close' ? 'cancelled' : r.principal_id ? 'assigned' : 'cancelled', tenant, work.id]);
      if (r.mode === 'unassign'&&!rerouteEntry) {
        const [entries] = await c.execute<RowDataPacket[]>('SELECT queue_version_id FROM routing_queue_entry WHERE tenant_id=? AND work_id=? ORDER BY wait_started_at DESC,id DESC LIMIT 1', [tenant, work.id]);
        if (entries[0]) await c.execute("INSERT INTO routing_queue_entry(tenant_id,id,work_id,queue_version_id,state) VALUES (?,?,?,?,'waiting')", [tenant, randomUUID(), work.id, entries[0].queue_version_id]);
      }
    }
    const state = r.mode === 'close' ? 'closed' : r.principal_id ? 'active' : 'unassigned';
    await c.execute(`INSERT INTO routing_allocation_head(tenant_id,session_id,conversation_id,principal_id,reservation_id,owner_revision,state,version,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE principal_id=?,reservation_id=?,owner_revision=?,state=?,version=version+1,updated_at=UTC_TIMESTAMP(6)`,
    [tenant, r.session_id, r.conversation_id, r.principal_id, r.id, r.owner_revision, state, r.principal_id, r.id, r.owner_revision, state]);
  }
}
