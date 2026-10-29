import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import type { OwnerCommandRef, OwnerRecoveryProof } from '@agentic-crm/contracts';
import { ownerCanonical, ownerFail } from '@agentic-crm/workload-transport';
import { ChatOwnerCommands } from './owner-command.js';
import { businessTenant } from './database.js';

export type CommandRecoveryHandler = (tenant: string, ref: OwnerCommandRef, proof: OwnerRecoveryProof) => Promise<void>;
type Claim = RowDataPacket & { command_id: string; binding_digest: string; operation: string; lease_token: string };

/** Schedules original terminal-proof reconciliation, never a new business command. */
export class ChatCommandRecovery {
  private running = false;
  private cursor = 0;
  readonly tenants: readonly string[];
  private readonly handlers: ReadonlyMap<string, CommandRecoveryHandler>;
  constructor(private readonly commands: ChatOwnerCommands, tenants: readonly string[], handlers: ReadonlyMap<string, CommandRecoveryHandler>) {
    this.tenants = Object.freeze([...new Set(tenants.map(businessTenant))].sort());
    if (!this.tenants.length) throw new Error('CHAT_RECOVERY_TENANTS_REQUIRED');
    this.handlers = new Map(handlers);
  }

  private async discover(tenant: string, limit: number) {
    return this.commands.transaction(tenant, async c => {
      const [rows] = await c.execute<RowDataPacket[]>(`SELECT command_id,binding_digest FROM chat_owner_command p
        WHERE tenant_id=? AND binding_json IS NOT NULL AND updated_at<=UTC_TIMESTAMP(6)-INTERVAL 30 SECOND
        AND NOT EXISTS (SELECT 1 FROM chat_owner_dependency d WHERE d.tenant_id=p.tenant_id AND d.command_id=p.command_id AND d.slot='recovery')
        ORDER BY updated_at,command_id LIMIT ${limit} FOR UPDATE SKIP LOCKED`, [tenant]);
      for (const row of rows) await c.execute(`INSERT INTO chat_owner_dependency
        (tenant_id,command_id,slot,remote_owner,remote_command_id,child_key,binding_digest,receipt_id,state,request_json,proof_json,remote_revision,next_attempt_at,version,created_at,updated_at)
        VALUES (?,?,'recovery','chat',?,?,?,NULL,'prepared',?,NULL,1,UTC_TIMESTAMP(6),1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,
      [tenant, row.command_id, row.command_id, 'recovery:' + row.command_id, row.binding_digest,
        ownerCanonical({ command_id: row.command_id, binding_digest: row.binding_digest })]);
      return rows.length;
    });
  }

  private async claim(tenant: string): Promise<Claim | null> {
    return this.commands.transaction(tenant, async c => {
      const [[row]] = await c.execute<Claim[]>(`SELECT d.command_id,d.binding_digest,p.operation FROM chat_owner_dependency d
        JOIN chat_owner_command p ON p.tenant_id=d.tenant_id AND p.command_id=d.command_id
        WHERE d.tenant_id=? AND d.slot='recovery' AND d.remote_owner='chat' AND d.receipt_id IS NULL AND d.state='prepared'
        AND d.next_attempt_at<=UTC_TIMESTAMP(6) AND (d.lease_until IS NULL OR d.lease_until<=UTC_TIMESTAMP(6))
        ORDER BY d.next_attempt_at,d.command_id LIMIT 1 FOR UPDATE SKIP LOCKED`, [tenant]);
      if (!row) return null;
      const token = randomUUID();
      await c.execute(`UPDATE chat_owner_dependency SET lease_token=?,lease_until=UTC_TIMESTAMP(6)+INTERVAL 30 SECOND,version=version+1,updated_at=UTC_TIMESTAMP(6)
        WHERE tenant_id=? AND command_id=? AND slot='recovery'`, [token, tenant, row.command_id]);
      return { ...row, lease_token: token } as Claim;
    });
  }

  private async finish(tenant: string, claim: Claim, complete: boolean) {
    return this.commands.transaction(tenant, async c => {
      const [result] = await c.execute<any>(`UPDATE chat_owner_dependency SET state=?,lease_token=NULL,lease_until=NULL,
        next_attempt_at=UTC_TIMESTAMP(6)+INTERVAL 30 SECOND,version=version+1,updated_at=UTC_TIMESTAMP(6)
        WHERE tenant_id=? AND command_id=? AND slot='recovery' AND state='prepared' AND lease_token=? AND lease_until>UTC_TIMESTAMP(6)`,
      [complete ? 'released' : 'prepared', tenant, claim.command_id, claim.lease_token]);
      return result.affectedRows === 1;
    });
  }

  private async recover(tenant: string, claim: Claim) {
    const handler = this.handlers.get(claim.operation);
    if (!handler) return 'unsupported' as const;
    const ref = { command_id: claim.command_id, binding_digest: claim.binding_digest };
    await handler(tenant, ref, await this.commands.proof(tenant, ref));
    if ((await this.commands.proof(tenant, ref)).state === 'prepared') ownerFail('DEPENDENCY_UNAVAILABLE');
    return 'complete' as const;
  }

  async tick(limit = 100) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) ownerFail('INVALID_REQUEST');
    if (this.running) return { discovered: 0, attempted: 0, completed: 0, unsupported: 0 };
    this.running = true;
    let discovered = 0, attempted = 0, completed = 0, unsupported = 0, empty = 0;
    try {
      // Discovery and processing share a bounded budget each; rotate even when limit < tenant count.
      const first = this.cursor % this.tenants.length;
      for (let i = 0; i < this.tenants.length && discovered < limit; i++) {
        discovered += await this.discover(this.tenants[(first + i) % this.tenants.length]!, limit - discovered);
      }
      while (attempted < limit && empty < this.tenants.length) {
        const tenant = this.tenants[this.cursor++ % this.tenants.length]!;
        const claim = await this.claim(tenant);
        if (!claim) { empty++; continue; }
        empty = 0; attempted++;
        let complete = false;
        try { const outcome = await this.recover(tenant, claim); complete = outcome === 'complete'; if (!complete) unsupported++; }
        catch { /* An unresolved remote proof is durable pending work, never proof of an abort. */ }
        if (await this.finish(tenant, claim, complete) && complete) completed++;
      }
      return { discovered, attempted, completed, unsupported };
    } finally { this.running = false; }
  }
}
