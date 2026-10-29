import { randomUUID } from 'node:crypto';
import type { OwnerAdmission, OwnerCommandRef, OwnerRecoveryProof, OwnerIngressVerdict,OwnerResource } from '@agentic-crm/contracts';
import { ownerBindingDigest, ownerCanonical, ownerDigest, ownerFail, validateOwnerValue } from '@agentic-crm/workload-transport';
import { UnitOfWork, type TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { AccessError, IdentityAuthorization, requireActiveTenant, requireService } from './authorization.js';
import { lockedNativeSession } from './auth/locked-session.js';
import { parseGrants, permits, type Grant } from './domain/authorization.js';
import type { NativeOwnerHumanAuthority } from './owner-authority.js';
import { DurableCommands } from '../../kernel/reliability/commands.js';

export type ChatOwnerProofPort = (tenant: string, command: OwnerCommandRef, abort: boolean, owner?: 'chat' | 'routing') => Promise<OwnerRecoveryProof>;
type AdmissionRow = { id: string; command_id: string; binding_digest: string; state: string; auth_revision: string;
  allowed_fields: string | string[]; terminal_digest: string | null; owner_service: 'chat' | 'routing' };
const parse = <T>(value: string | T): T => typeof value === 'string' ? JSON.parse(value) as T : value;

/** Candidate only: activation requires every Identity policy/session writer to drain. */
export class NativeOwnerAdmissions {
  constructor(private readonly uow: UnitOfWork, private readonly authority: NativeOwnerHumanAuthority, private readonly chat: ChatOwnerProofPort) {}

  async routingViewPolicy(tenant:string,input:OwnerCommandRef,id:string,directory=false){
    const {ref,proof}=await this.proof(tenant,input,false,'routing');
    if(!('binding' in proof)||proof.state!=='prepared')ownerFail('FORBIDDEN');
    return this.locked(tenant,async scope=>{
      const row=await this.row(scope,ref,id,'routing');if(row.state!=='admitted'||(await this.gate(scope)).state!=='open')ownerFail('REVOKED');
      const access=await this.authority.routingViewPolicy(scope,proof.binding);
      if(access.revision!==String(row.auth_revision)||parse<string[]>(row.allowed_fields).length)ownerFail('REVOKED');
      return directory?this.authority.routingViewDirectory(scope,proof.binding):access.policy;
    });
  }

  async assignmentDirectory(tenant:string,input:OwnerCommandRef,id:string){
    const {ref,proof}=await this.proof(tenant,input);
    if(!('binding' in proof)||proof.state!=='prepared')ownerFail('FORBIDDEN');
    return this.locked(tenant,async scope=>{
      const row=await this.row(scope,ref,id);if(row.state!=='admitted'||(await this.gate(scope)).state!=='open')ownerFail('REVOKED');
      const access=await this.authority.assignmentDirectory(scope,proof.binding);
      if(access.revision!==String(row.auth_revision)||parse<string[]>(row.allowed_fields).length)ownerFail('REVOKED');return access.policy;
    });
  }
  async sessionProgressPolicy(tenant:string,input:OwnerCommandRef,id:string,contact?:OwnerResource){
    const {ref,proof}=await this.proof(tenant,input);if(!('binding' in proof)||proof.state!=='prepared'||!proof.binding.operation.startsWith('session-progress-')&&!proof.binding.operation.startsWith('conversation-classification-')&&!['session-source','read-need','need-post-outcome','need-outcome-effect','need-get-assessment','need-post-assessment','need-post-enrich'].includes(proof.binding.operation))ownerFail('FORBIDDEN');
    return this.locked(tenant,async scope=>{
      const row=await this.row(scope,ref,id);if(row.state!=='admitted'||(await this.gate(scope)).state!=='open')ownerFail('REVOKED');
      const access=proof.binding.operation==='session-source'?await this.authority.sessionSourcePolicy(scope,proof.binding):proof.binding.operation==='read-need'?await this.authority.needSourcePolicy(scope,proof.binding):['need-post-outcome','need-outcome-effect'].includes(proof.binding.operation)?await this.authority.outcomeAccess(scope,proof.binding):(proof.binding.operation.startsWith('conversation-classification-')||proof.binding.operation.startsWith('need-'))?await this.authority.classificationPolicy(scope,proof.binding):await this.authority.sessionProgressPolicy(scope,proof.binding);if(access.revision!==String(row.auth_revision)||ownerCanonical(access.fields)!==ownerCanonical(parse(row.allowed_fields)))ownerFail('REVOKED');
      return contact?this.authority.sessionContactPolicy(scope,proof.binding,contact):access.policy;
    });
  }
  async funnelPolicy(tenant:string,input:OwnerCommandRef,id:string,contacts?:OwnerResource[]){
    const {ref,proof}=await this.proof(tenant,input);if(!('binding' in proof)||proof.state!=='prepared'||proof.binding.operation!=='session-progress-get-session-funnel')ownerFail('FORBIDDEN');
    return this.locked(tenant,async scope=>{
      const row=await this.row(scope,ref,id);if(row.state!=='admitted'||(await this.gate(scope)).state!=='open')ownerFail('REVOKED');
      const access=await this.authority.funnelPolicy(scope,proof.binding);if(access.revision!==String(row.auth_revision)||ownerCanonical(access.fields)!==ownerCanonical(parse(row.allowed_fields)))ownerFail('REVOKED');return contacts?this.authority.funnelContactPolicy(scope,proof.binding,contacts):access.policy;
    });
  }
  async needOutcomesPolicy(tenant:string,input:OwnerCommandRef,id:string,resources:OwnerResource[]){
    const {ref,proof}=await this.proof(tenant,input);if(!('binding' in proof)||proof.state!=='prepared'||proof.binding.operation!=='need-get-assessment')ownerFail('FORBIDDEN');
    return this.locked(tenant,async scope=>{const row=await this.row(scope,ref,id);if(row.state!=='admitted'||(await this.gate(scope)).state!=='open')ownerFail('REVOKED');const policy=await this.authority.needOutcomesPolicy(scope,proof.binding,resources);if(policy.auth_revision!==String(row.auth_revision))ownerFail('REVOKED');return policy;});
  }
  async outcomeLinkPolicy(tenant:string,input:OwnerCommandRef,id:string,resource:OwnerResource){
    const {ref,proof}=await this.proof(tenant,input);if(!('binding' in proof)||proof.state!=='prepared'||!['need-post-outcome','need-outcome-effect'].includes(proof.binding.operation))ownerFail('FORBIDDEN');
    return this.locked(tenant,async scope=>{const row=await this.row(scope,ref,id);if(row.state!=='admitted'||(await this.gate(scope)).state!=='open')ownerFail('REVOKED');const policy=await this.authority.outcomeLinkPolicy(scope,proof.binding,resource);if(policy.auth_revision!==String(row.auth_revision))ownerFail('REVOKED');return policy;});
  }
  async contributionSalesPolicy(tenant:string,input:OwnerCommandRef,id:string,resources:OwnerResource[]){
    const {ref,proof}=await this.proof(tenant,input);if(!('binding' in proof)||proof.state!=='prepared'||proof.binding.operation!=='conversation-classification-get-conversations-conversation-sessions-session-contributions')ownerFail('FORBIDDEN');
    return this.locked(tenant,async scope=>{
      const row=await this.row(scope,ref,id);if(row.state!=='admitted'||(await this.gate(scope)).state!=='open')ownerFail('REVOKED');
      const policy=await this.authority.contributionSalesPolicy(scope,proof.binding,resources);if(policy.auth_revision!==String(row.auth_revision))ownerFail('REVOKED');return policy;
    });
  }

  async workspacePolicy(tenant:string,input:OwnerCommandRef,id:string,resources:OwnerResource[],contacts=false){
    const {ref,proof}=await this.proof(tenant,input);
    if(!('binding' in proof)||proof.state!=='prepared'||proof.binding.resource.object_key!=='chat_workspace_query')ownerFail('FORBIDDEN');
    return this.locked(tenant,async scope=>{
      const row=await this.row(scope,ref,id);if(row.state!=='admitted'||(await this.gate(scope)).state!=='open')ownerFail('REVOKED');
      const access=await this.authority.workspacePolicy(scope,proof.binding,contacts?[]:resources);
      if(access.revision!==String(row.auth_revision)||ownerCanonical(access.fields)!==ownerCanonical(parse(row.allowed_fields)))ownerFail('REVOKED');
      return contacts?this.authority.contactBatchPolicy(scope,proof.binding,resources):access.policy;
    });
  }

  async conversationPolicy(tenant:string,input:OwnerCommandRef,id:string,contact?:OwnerResource){
    const {ref,proof}=await this.proof(tenant,input);
    if(!('binding' in proof)||proof.state!=='prepared'||!['conversation-get-conversations-id','conversation-post-conversations-id-transition'].includes(proof.binding.operation))ownerFail('FORBIDDEN');
    return this.locked(tenant,async scope=>{
      const row=await this.row(scope,ref,id);if(row.state!=='admitted'||(await this.gate(scope)).state!=='open')ownerFail('REVOKED');
      const access=await this.authority.conversationPolicy(scope,proof.binding);
      if(access.revision!==String(row.auth_revision)||ownerCanonical(access.fields)!==ownerCanonical(parse(row.allowed_fields)))ownerFail('REVOKED');
      return contact?this.authority.contactPolicy(scope,proof.binding,contact):access.policy;
    });
  }

  async notePolicy(tenant:string,input:OwnerCommandRef,id:string){
    const {ref,proof}=await this.proof(tenant,input);
    if(!('binding' in proof)||proof.state!=='prepared'||!['conversation-get-conversations-id-notes','workspace-get-activity','conversation-classification-get-conversations-conversation-sessions-session-contributions'].includes(proof.binding.operation))ownerFail('FORBIDDEN');
    return this.locked(tenant,async scope=>{
      const row=await this.row(scope,ref,id);if(row.state!=='admitted'||(await this.gate(scope)).state!=='open')ownerFail('REVOKED');
      const policy=await this.authority.notePolicy(scope,proof.binding);if(policy.auth_revision!==String(row.auth_revision))ownerFail('REVOKED');return policy;
    });
  }
  async activityPolicy(tenant:string,input:OwnerCommandRef,id:string){
    const {ref,proof}=await this.proof(tenant,input);
    if(!('binding' in proof)||proof.state!=='prepared'||proof.binding.operation!=='workspace-get-activity')ownerFail('FORBIDDEN');
    return this.locked(tenant,async scope=>{
      const row=await this.row(scope,ref,id);if(row.state!=='admitted'||(await this.gate(scope)).state!=='open')ownerFail('REVOKED');
      const access=await this.authority.activityPolicy(scope,proof.binding);if(access.revision!==String(row.auth_revision)||ownerCanonical(access.fields)!==ownerCanonical(parse(row.allowed_fields)))ownerFail('REVOKED');return access.policy;
    });
  }
  async noteChild(tenant:string,input:OwnerCommandRef,id:string){
    const {ref,proof}=await this.proof(tenant,input);
    if(!('binding' in proof)||proof.state!=='prepared'||proof.binding.operation!=='note-effect'||!proof.binding.note||!proof.binding.dependencies.some(d=>d.owner==='crm'&&d.receipt_id===ref.command_id&&d.binding_digest===ref.binding_digest))ownerFail('FORBIDDEN');
    return this.locked(tenant,async scope=>{
      const row=await this.row(scope,ref,id);if(row.state!=='admitted'||(await this.gate(scope)).state!=='open')ownerFail('REVOKED');
      const access=await this.authority.authorize(scope,proof.binding);if(access.revision!==String(row.auth_revision)||ownerCanonical(access.fields)!==ownerCanonical(parse(row.allowed_fields)))ownerFail('REVOKED');return this.receipt(row);
    });
  }

  private async locked<T>(tenant: string, work: (scope: TransactionScope) => Promise<T>, recovery = false) {
    return this.uow.run({ tenantId: tenant }, async scope => {
      // Same tenant serialization as native ACL writers, held only across local SQL.
      if (recovery) {
        if (!(await scope.query("SELECT id FROM tenant WHERE id=? AND kind='business' FOR UPDATE", [tenant])).length) ownerFail('NOT_FOUND');
      } else await requireActiveTenant(scope, true);
      return work(scope);
    });
  }
  private async gate(scope: TransactionScope) {
    const [gate] = await scope.query('SELECT * FROM identity_owner_gate WHERE tenant_id=? FOR UPDATE', [scope.context.tenantId]);
    // Explicit fixture/operator enrollment; missing gate must never implicitly enable admissions.
    if (!gate) ownerFail('DEPENDENCY_UNAVAILABLE');
    return gate;
  }
  private receipt(row: AdmissionRow): OwnerAdmission {
    return validateOwnerValue<OwnerAdmission>('OwnerAdmission', { admission_id: row.id, command_id: row.command_id,
      binding_digest: row.binding_digest, state: row.state === 'admitted' ? 'admitted' : 'settled',
      auth_revision: String(row.auth_revision), allowed_fields: parse(row.allowed_fields) });
  }
  private async row(scope: TransactionScope, ref: OwnerCommandRef, id?: string, owner: 'chat' | 'routing' = 'chat'): Promise<AdmissionRow> {
    const [row] = await scope.query('SELECT * FROM identity_owner_admission WHERE tenant_id=? AND owner_service=? AND command_id=? FOR UPDATE', [scope.context.tenantId, owner, ref.command_id]);
    if (!row) ownerFail('NOT_FOUND');
    if (row.binding_digest !== ref.binding_digest || id !== undefined && row.id !== id) ownerFail('CONFLICT');
    return row;
  }
  private async proof(tenant: string, input: OwnerCommandRef, abort = false, owner: 'chat' | 'routing' = 'chat') {
    const ref = validateOwnerValue<OwnerCommandRef>('OwnerCommandRef', input);
    const proof = validateOwnerValue<OwnerRecoveryProof>('OwnerRecoveryProof', await this.chat(tenant, ref, abort, owner));
    if (proof.binding_digest !== ref.binding_digest) ownerFail('FORBIDDEN');
    if ('binding' in proof) {
      if (proof.binding.owner !== owner || proof.binding.tenant_id !== tenant || proof.binding.command_id !== ref.command_id ||
          ownerBindingDigest(proof.binding) !== ref.binding_digest) ownerFail('FORBIDDEN');
    } else if (proof.command_id !== ref.command_id) ownerFail('FORBIDDEN');
    return { ref, proof };
  }

  async admit(tenant: string, input: OwnerCommandRef, owner: 'chat' | 'routing' = 'chat'): Promise<OwnerAdmission> {
    const { ref, proof } = await this.proof(tenant, input, false, owner); // RPC before SQL.
    if (!('binding' in proof) || proof.state !== 'prepared') ownerFail('INVALID_TRANSITION');
    return this.locked(tenant, async scope => {
      const [old] = await scope.query('SELECT * FROM identity_owner_admission WHERE tenant_id=? AND owner_service=? AND command_id=? FOR UPDATE', [tenant, owner, ref.command_id]);
      if (old) { if (old.binding_digest !== ref.binding_digest) ownerFail('CONFLICT'); return this.receipt(old); }
      const gate = await this.gate(scope);
      if (gate.state !== 'open') ownerFail('REVOKED');
      const access = await this.authority.authorize(scope, proof.binding), id = randomUUID();
      await scope.query(`INSERT INTO identity_owner_admission
        (tenant_id,id,owner_service,command_id,binding_digest,account_id,principal_id,delegation_id,auth_revision,gate_revision,state,allowed_fields,version,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,'admitted',?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,
      [tenant, id, owner, ref.command_id, ref.binding_digest, access.accountId, access.principalId, proof.binding.actor.delegation_id, access.revision, String(gate.version), ownerCanonical(access.fields)]);
      const audit = new DurableCommands();
      if (proof.binding.actor.kind === 'service') await audit.systemAudit(scope, ref.command_id, 'identity_owner_admission', id, 'admit', [], { kind: 'service', id: access.principalId });
      else await audit.audit(scope, access.principalId, ref.command_id, 'identity_owner_admission', id, 'admit', []);
      return this.receipt(await this.row(scope, ref, id, owner));
    });
  }
  async read(tenant: string, input: OwnerCommandRef, id: string, owner: 'chat' | 'routing' = 'chat') {
    const ref = validateOwnerValue<OwnerCommandRef>('OwnerCommandRef', input);
    return this.locked(tenant, async scope => this.receipt(await this.row(scope, ref, id, owner)), true);
  }
  async ingressVerdict(tenant: string, input: { service_actor_id: string; team_id: string }): Promise<OwnerIngressVerdict> {
    return this.locked(tenant, async scope => {
      if ((await this.gate(scope)).state !== 'open') ownerFail('DEPENDENCY_UNAVAILABLE');
      let valid = true;
      try { await requireService(scope, input.service_actor_id, 'integration', 'deliver'); }
      catch (error) { if (!(error instanceof AccessError) || error.code !== 'FORBIDDEN') throw error; valid = false; }
      const [team] = await scope.query("SELECT id FROM team WHERE tenant_id=? AND id=? AND active=1 AND purpose IN ('chat','general')", [tenant, input.team_id]);
      valid = valid && !!team;
      return { input_digest: ownerDigest({ tenant_id: tenant, ...input }), state: valid ? 'valid' : 'denied', error_code: valid ? null : 'REVOKED', service_actor_id: null, team_id: null };
    });
  }

  /** Connector may inspect only its pinned referral admission, never Human command fields. */
  async touchpointAdmission(tenant: string, input: OwnerCommandRef, id: string) {
    const { ref, proof } = await this.proof(tenant, input);
    if (!('binding' in proof) || proof.state !== 'prepared' || proof.binding.operation !== 'ingress-process' || !proof.binding.ingress_touchpoint || proof.binding.actor.kind !== 'service' || proof.binding.fields.length) ownerFail('FORBIDDEN');
    return this.locked(tenant, async scope => {
      const row = await this.row(scope, ref, id);
      if (row.state !== 'admitted' || (await this.gate(scope)).state !== 'open') ownerFail('REVOKED');
      const access = await this.authority.authorize(scope, proof.binding);
      if (access.fields.length || access.principalId !== proof.binding.actor.principal_id) ownerFail('FORBIDDEN');
      return this.receipt(row);
    });
  }

  /** Cursor and outbound audit subject come from the admitted native account, never the caller. */
  async catalogPolicy(tenant: string, input: OwnerCommandRef, id: string) {
    const {ref,proof}=await this.proof(tenant,input);
    if(!('binding' in proof)||proof.state!=='prepared'||proof.binding.resource.object_key!=='chat_catalog')ownerFail('FORBIDDEN');
    return this.locked(tenant,async scope=>{
      const row=await this.row(scope,ref,id);
      if(row.state!=='admitted'||(await this.gate(scope)).state!=='open')ownerFail('REVOKED');
      const access=await this.authority.catalogPolicy(scope,proof.binding);
      if(access.revision!==String(row.auth_revision))ownerFail('REVOKED');
      return access.policy;
    });
  }
  async inboxPolicy(tenant:string,input:OwnerCommandRef,id:string){
    const {ref,proof}=await this.proof(tenant,input);
    if(!('binding' in proof)||proof.state!=='prepared'||proof.binding.resource.object_key!=='chat_inbox_catalog')ownerFail('FORBIDDEN');
    return this.locked(tenant,async scope=>{
      const row=await this.row(scope,ref,id);if(row.state!=='admitted'||(await this.gate(scope)).state!=='open')ownerFail('REVOKED');
      const access=await this.authority.inboxPolicy(scope,proof.binding);if(access.revision!==String(row.auth_revision))ownerFail('REVOKED');return access.policy;
    });
  }
  async cursorSubject(tenant: string, input: OwnerCommandRef, id: string) {
    const { ref, proof } = await this.proof(tenant, input);
    if (!('binding' in proof) || proof.state !== 'prepared' || proof.binding.actor.kind !== 'human' ||
        !['conversation-get-conversations','conversation-get-conversations-id-messages', 'conversation-get-conversations-id-message-envelopes', 'conversation-get-conversations-id-message-envelopes-v3', 'contact-bound-send', 'conversation-post-conversations-id-messages'].includes(proof.binding.operation)) ownerFail('FORBIDDEN');
    return this.locked(tenant, async scope => {
      const row = await this.row(scope, ref, id);
      if (row.state !== 'admitted' || (await this.gate(scope)).state !== 'open') ownerFail('REVOKED');
      const [subject] = await scope.query('SELECT account_id FROM identity_owner_admission WHERE tenant_id=? AND id=?', [tenant, id]);
      if (!subject?.account_id) ownerFail('FORBIDDEN');
      return { account_id: subject.account_id as string };
    });
  }
  async settle(tenant: string, input: OwnerCommandRef, id: string, owner: 'chat' | 'routing' = 'chat') {
    const { ref, proof } = await this.proof(tenant, input, false, owner);
    return this.settleProof(tenant, ref, id, proof, owner);
  }
  /** Called only by an Identity-local policy barrier after the gate was closed. */
  async drainTenant(tenant: string) {
    for (;;) {
      const rows = await this.locked(tenant, async s => {
        if ((await this.gate(s)).state !== 'closing') ownerFail('CONFLICT');
        return await s.query("SELECT owner_service,command_id,binding_digest,id FROM identity_owner_admission WHERE tenant_id=? AND state='admitted' ORDER BY id LIMIT 100", [tenant]) as (AdmissionRow & { owner_service: string })[];
      }, true);
      if (!rows.length) return;
      for (const row of rows) {
        if (!['chat', 'routing'].includes(row.owner_service)) ownerFail('DEPENDENCY_UNAVAILABLE');
        const { ref, proof } = await this.proof(tenant, { command_id: row.command_id, binding_digest: row.binding_digest }, true, row.owner_service);
        await this.settleProof(tenant, ref, row.id, proof, row.owner_service);
      }
    }
  }
  private async settleProof(tenant: string, ref: OwnerCommandRef, id: string, proof: OwnerRecoveryProof, owner: 'chat' | 'routing' = 'chat') {
    if (proof.state === 'prepared') ownerFail('DEPENDENCY_UNAVAILABLE');
    const digest = ownerDigest({ ...ref, state: proof.state, effect_id: 'effect_id' in proof ? proof.effect_id : null,
      effect_revision: 'effect_revision' in proof ? proof.effect_revision : null });
    return this.locked(tenant, async scope => {
      const row = await this.row(scope, ref, id, owner);
      if (row.state !== 'admitted') {
        if (row.state !== proof.state || row.terminal_digest !== digest) ownerFail('CONFLICT');
        return this.receipt(row);
      }
      await scope.query(`UPDATE identity_owner_admission SET state=?,terminal_digest=?,settled_at=UTC_TIMESTAMP(6),
        version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?`, [proof.state, digest, tenant, id]);
      await new DurableCommands().systemAudit(scope, ref.command_id, 'identity_owner_admission', id, 'settle', ['state']);
      return this.receipt(await this.row(scope, ref, id, owner));
    }, true);
  }

  /** Native local admin port. The verifier never crosses the owning service boundary. */
  async beginRoleChange(tenant: string, verifier: string, barrierId: string, roleId: string, permissions: readonly Grant[]) {
    validateOwnerValue('OwnerCommandRef', { command_id: barrierId, binding_digest: '0'.repeat(64) });
    const intent = { kind: 'role-permissions', role_id: roleId, permissions: parseGrants(permissions) }, digest = ownerDigest(intent);
    if (Buffer.byteLength(ownerCanonical(intent)) > 262144) ownerFail('LIMIT_EXCEEDED');
    return this.locked(tenant, async scope => {
      const session = await lockedNativeSession(scope, verifier);
      const access = await new IdentityAuthorization(this.uow).loadHuman(scope, session.accountId);
      const [old] = await scope.query('SELECT * FROM identity_owner_barrier WHERE tenant_id=? AND barrier_id=? FOR UPDATE', [tenant, barrierId]);
      if (old) {
        if (old.account_id !== session.accountId || old.request_digest !== digest) ownerFail('CONFLICT');
        return { barrier_id: barrierId, state: old.state as 'closing' | 'completed' };
      }
      if (!permits(access, 'role', 'update')) ownerFail('FORBIDDEN');
      if (!(await scope.query('SELECT id FROM `role` WHERE tenant_id=? AND id=?', [tenant, roleId])).length) ownerFail('NOT_FOUND');
      const gate = await this.gate(scope);
      if (gate.state !== 'open') ownerFail('DEPENDENCY_UNAVAILABLE');
      await scope.query(`INSERT INTO identity_owner_barrier
        (tenant_id,barrier_id,account_id,request_digest,request_json,state,version,created_at,updated_at)
        VALUES (?,?,?,?,?,'closing',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, [tenant, barrierId, session.accountId, digest, ownerCanonical(intent)]);
      await scope.query("UPDATE identity_owner_gate SET state='closing',barrier_id=?,request_digest=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=?", [barrierId, digest, tenant]);
      await new DurableCommands().audit(scope, access.principalId, barrierId, 'identity_owner_barrier', barrierId, 'begin', []);
      return { barrier_id: barrierId, state: 'closing' as const };
    });
  }

  /** Narrow operator recovery; private, no BFF route or arbitrary writer callback. */
  async drainRoleChange(tenant: string, barrierId: string) {
    const pending = await this.locked(tenant, async scope => {
      const [barrier] = await scope.query('SELECT state FROM identity_owner_barrier WHERE tenant_id=? AND barrier_id=?', [tenant, barrierId]);
      if (!barrier) ownerFail('NOT_FOUND');
      if (barrier.state === 'completed') return [] as AdmissionRow[];
      const gate = await this.gate(scope);
      if (gate.state !== 'closing' || gate.barrier_id !== barrierId) ownerFail('CONFLICT');
      return await scope.query("SELECT * FROM identity_owner_admission WHERE tenant_id=? AND state='admitted' ORDER BY id LIMIT 100", [tenant]) as AdmissionRow[];
    });
    // Abort races Chat's commit under its own lock. An outage leaves the gate closing.
    for (const row of pending) {
      if (!['chat', 'routing'].includes(row.owner_service)) ownerFail('DEPENDENCY_UNAVAILABLE');
      const { ref, proof } = await this.proof(tenant, { command_id: row.command_id, binding_digest: row.binding_digest }, true, row.owner_service);
      await this.settleProof(tenant, ref, row.id, proof, row.owner_service);
    }
    return this.locked(tenant, async scope => {
      const [barrier] = await scope.query('SELECT * FROM identity_owner_barrier WHERE tenant_id=? AND barrier_id=? FOR UPDATE', [tenant, barrierId]);
      if (!barrier) ownerFail('NOT_FOUND');
      if (barrier.state === 'completed') return { barrier_id: barrierId, state: 'completed' as const };
      const gate = await this.gate(scope);
      if (gate.state !== 'closing' || gate.barrier_id !== barrierId || gate.request_digest !== barrier.request_digest) ownerFail('CONFLICT');
      if ((await scope.query("SELECT id FROM identity_owner_admission WHERE tenant_id=? AND state='admitted' LIMIT 1", [tenant])).length) return { barrier_id: barrierId, state: 'closing' as const };
      const intent = parse<{ kind: string; role_id: string; permissions: Grant[] }>(barrier.request_json);
      if (intent.kind !== 'role-permissions' || ownerDigest(intent) !== barrier.request_digest) ownerFail('CONFLICT');
      await scope.query('UPDATE `role` SET permissions=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?', [ownerCanonical(parseGrants(intent.permissions)), tenant, intent.role_id]);
      await scope.query(`UPDATE principal p JOIN principal_role pr ON pr.tenant_id=p.tenant_id AND pr.principal_id=p.id
        SET p.auth_revision=p.auth_revision+1,p.version=p.version+1,p.updated_at=UTC_TIMESTAMP(6) WHERE p.tenant_id=? AND pr.role_id=?`, [tenant, intent.role_id]);
      await scope.query('UPDATE service_actor SET auth_revision=auth_revision+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND role_id=?', [tenant, intent.role_id]);
      const changed = await scope.query('SELECT p.id,p.version,p.auth_revision FROM principal p JOIN principal_role pr ON pr.tenant_id=p.tenant_id AND pr.principal_id=p.id WHERE p.tenant_id=? AND pr.role_id=?', [tenant, intent.role_id]);
      const commands = new DurableCommands();
      for (const principal of changed) await commands.fixtureAccessChanged(scope, principal, barrierId);
      await commands.systemAudit(scope, barrierId, 'role', intent.role_id, 'update', ['permissions']);
      await scope.query("UPDATE identity_owner_barrier SET state='completed',completed_at=UTC_TIMESTAMP(6),version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND barrier_id=?", [tenant, barrierId]);
      await scope.query("UPDATE identity_owner_gate SET state='open',version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=?", [tenant]);
      return { barrier_id: barrierId, state: 'completed' as const };
    });
  }
}
