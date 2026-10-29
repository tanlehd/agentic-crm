// Executable contract model, not a database, HTTP handler or native authorization implementation.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export const ownerSchema = JSON.parse(readFileSync(new URL('../../packages/contracts/schemas/chat-owner-v1.json', import.meta.url), 'utf8'));
const ajv = addFormats(new Ajv({ strict: true, allErrors: true }));
ajv.addSchema(ownerSchema);
export const validateOwner = name => ajv.getSchema(ownerSchema.$id + '#/definitions/' + name);
const fail = code => { throw new Error(code); };
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
export const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
export function commandDigest(binding) {
  const { dependencies, ...immutable } = binding;
  return digest(immutable);
}
export function validateRequest(operation, peer, request) {
  if (!peer.authenticated) fail('UNAUTHENTICATED');
  if (peer.target !== operation.owner || !operation.callers.includes(peer.service)) fail('FORBIDDEN');
  if (!peer.tenants.includes(request.tenant_id)) fail('NOT_FOUND');
  if (!validateOwner(operation.input)(request)) fail('INVALID_REQUEST');
}
export function allowed(policy, binding) {
  if (!policy.active || !policy.sessionActive || !policy.seat || policy.kind !== binding.actor.kind) return false;
  if (policy.kind === 'human' && policy.tenantAdmin && policy.adminSeat) return true;
  const r = binding.resource;
  const scope = policy.scope === 'all' || policy.scope === 'own' && r.owner_principal_id === binding.actor.principal_id || policy.scope === 'team' && [r.team_id, ...r.shared_team_ids].some(id => policy.teams.includes(id));
  if (!scope || binding.fields.some(f => policy.denied.includes(f))) return false;
  if (binding.actor.kind === 'app' && (!policy.parentGrant || !policy.messageGrant || binding.fields.some(f => !policy.appFields.includes(f)))) return false;
  if (binding.target?.principal_id && !policy.targetEligible) return false;
  return true;
}
export class AdmissionModel {
  constructor(tenant, resource, policy, state) {
    this.tenant = tenant; this.resource = structuredClone(resource); this.policy = structuredClone(policy);
    this.state = state ?? { commands: new Map(), admissions: new Map(), closing: false, revoked: false, effects: 0 };
  }
  prepare(binding) {
    if (!validateOwner('OwnerCommandBinding')(binding)) fail('INVALID_REQUEST');
    if (binding.tenant_id !== this.tenant) fail('NOT_FOUND');
    const d = commandDigest(binding), old = this.state.commands.get(binding.command_id);
    if (old) { if (old.digest !== d) fail('CONFLICT'); return old; }
    const row = { binding: structuredClone(binding), digest: d, state: 'prepared', effect: null, childrenPending: 0 };
    this.state.commands.set(binding.command_id, row); return row;
  }
  admit(id) {
    const c = this.state.commands.get(id); if (!c) fail('NOT_FOUND');
    const old = this.state.admissions.get(id); if (old) return old;
    if (c.state !== 'prepared') fail('INVALID_TRANSITION');
    if (this.state.closing || this.state.revoked || !allowed(this.policy, c.binding)) fail('REVOKED');
    const a = { digest: c.digest, fields: [...c.binding.fields], state: 'admitted' }; this.state.admissions.set(id, a); return a;
  }
  apply(id, admission, live = this.resource) {
    const c = this.state.commands.get(id); if (!c) fail('NOT_FOUND');
    if (c.state === 'aborted') fail('INVALID_TRANSITION');
    if (c.state === 'committed') return c;
    const own = this.state.admissions.get(id);
    if (!own || own.state !== 'admitted' || canonical(own) !== canonical(admission) || own.digest !== c.digest) fail('FORBIDDEN');
    if (canonical(live) !== canonical(c.binding.resource)) { c.state = 'aborted'; return c; }
    c.state = 'committed'; c.effect = ++this.state.effects; return c;
  }
  abort(id, bindingDigest) {
    const c = this.state.commands.get(id);
    if (!c) { const tombstone = { digest: bindingDigest, state: 'aborted', childrenPending: 0 }; this.state.commands.set(id, tombstone); return tombstone; }
    if (c.digest !== bindingDigest) fail('CONFLICT');
    if (c.childrenPending) fail('CHILD_UNKNOWN');
    if (c.state === 'prepared') c.state = 'aborted'; return c;
  }
  settle(id, ownerAvailable = true) {
    if (!ownerAvailable) fail('DEPENDENCY_UNAVAILABLE');
    const c = this.state.commands.get(id), a = this.state.admissions.get(id);
    if (!c || !a || c.state === 'prepared' || c.childrenPending || c.digest !== a.digest) fail('PENDING');
    a.state = 'settled';
  }
  revoke() {
    this.state.closing = true;
    if ([...this.state.admissions.values()].some(a => a.state === 'admitted')) return 'closing';
    this.state.revoked = true; this.policy.sessionActive = false; return 'completed';
  }
  replay(id) {
    const c = this.state.commands.get(id); if (!c) fail('NOT_FOUND');
    if (this.state.closing || this.state.revoked || !allowed(this.policy, c.binding)) fail('REVOKED');
    return c.state;
  }
}
export class CapacityModel {
  constructor(capacity = 1) { this.capacity = capacity; this.reservations = new Map(); this.allocations = new Map(); }
  reserve(key, session, principal, revision) {
    const binding = { session, principal, revision }, old = this.reservations.get(key);
    if (old) { if (digest(old.binding) !== digest(binding)) fail('CONFLICT'); return old; }
    const current = this.allocations.get(session), same = current?.principal === principal;
    const used = [...this.allocations.values()].filter(a => a.principal === principal).length + [...this.reservations.values()].filter(a => a.state === 'reserved' && a.binding.principal === principal && !a.same).length;
    if (!same && used >= this.capacity) fail('CAPACITY');
    const row = { binding, state: 'reserved', same }; this.reservations.set(key, row); return row;
  }
  confirm(key, proof) {
    const r = this.reservations.get(key); if (!r || proof.state !== 'committed' || digest(r.binding) !== digest(proof.binding)) fail('INVALID_PROOF');
    if (r.state === 'released') return;
    const old = this.allocations.get(r.binding.session);
    if (!old || BigInt(old.revision) < BigInt(r.binding.revision)) this.allocations.set(r.binding.session, r.binding);
    r.state = 'confirmed';
  }
  release(key, proof) {
    const r = this.reservations.get(key); if (!r) fail('NOT_FOUND');
    if (!proof || proof.state !== 'aborted' && proof.state !== 'committed') fail('PENDING');
    if (proof.session !== r.binding.session || proof.key !== key) fail('INVALID_PROOF');
    const old = this.allocations.get(r.binding.session);
    if (proof.state === 'committed' && BigInt(proof.revision) <= BigInt(r.binding.revision)) fail('STALE_VERSION');
    if (old && old.revision === r.binding.revision && old.principal === r.binding.principal) this.allocations.delete(r.binding.session);
    r.state = 'released';
  }
}
export class InboxModel {
  constructor(tenant, producer, consumer) { this.tenant = tenant; this.producer = producer; this.consumer = consumer; this.rows = new Map(); this.watermark = 0n; this.effects = []; }
  receive(peer, notice, canonicalDigest, fault = null) {
    if (!peer.authenticated || peer.service !== this.producer) fail('FORBIDDEN');
    if (notice.tenant_id !== this.tenant || notice.producer !== this.producer || notice.consumer !== this.consumer) fail('NOT_FOUND');
    if (notice.digest !== canonicalDigest) fail('INVALID_PROOF');
    const old = this.rows.get(notice.event_id);
    if (old && old.digest !== notice.digest) { old.state = 'quarantined'; fail('CONFLICT'); }
    if (old?.state === 'applied') return 'duplicate';
    const n = BigInt(notice.stream_sequence);
    if (n <= this.watermark) fail('SEQUENCE_CONFLICT');
    if ([...this.rows.entries()].some(([id, r]) => id !== notice.event_id && r.sequence === n)) fail('SEQUENCE_CONFLICT');
    if (fault === 'before-commit') fail('CRASH');
    const row = { digest: notice.digest, sequence: n, state: 'pending' }; this.rows.set(notice.event_id, row);
    if (n === this.watermark + 1n) {
      row.state = 'applied'; this.effects.push(notice.event_id); this.watermark = n;
      // Worker subsequently replays a pending next event; no guessed gap skipping.
    }
    if (fault === 'lost-ack') fail('TIMEOUT');
    return row.state;
  }
}
export class ChildEffectModel {
  constructor() { this.effects = new Map(); this.references = new Set(); }
  create(key, payloadDigest, fault) {
    const old = this.effects.get(key); if (old && old.digest !== payloadDigest) fail('CONFLICT');
    if (!old) this.effects.set(key, { digest: payloadDigest, id: 'effect-' + (this.effects.size + 1) });
    if (fault === 'lost-ack') fail('TIMEOUT'); return this.effects.get(key);
  }
  reconcile(key, available = true) {
    if (!available) fail('DEPENDENCY_UNAVAILABLE');
    const effect = this.effects.get(key); if (!effect) fail('PENDING'); this.references.add(effect.id); return effect;
  }
}
export function validateSnapshotVector(prepared, current) {
  if (prepared.length !== current.length || prepared.some((p, i) => p.owner !== current[i].owner || p.watermark !== current[i].watermark || p.digest !== current[i].digest)) fail('SNAPSHOT_CHANGED');
  return true;
}

export class ReferenceFenceModel {
  constructor() { this.closing = false; this.guarded = false; this.archived = false; this.holds = new Map(); this.outcome = false; this.recovered = false; }
  reserve(command) {
    if (this.holds.has(command)) return;
    if (this.closing || this.archived) fail('REFERENCE_INVALID');
    if (this.outcome) fail('OUTCOME_EXISTS');
    this.holds.set(command, 'reserved');
  }
  retire(openThreads) {
    this.closing = true;
    if ([...this.holds.values()].some(s => s === 'reserved')) return 'pending';
    this.guarded = openThreads === 0;
    return openThreads ? 'ACTIVE_DEPENDENCY' : 'guarded';
  }
  finishArchive(coreProof) {
    if (!this.closing || !['committed', 'aborted'].includes(coreProof) || coreProof === 'committed' && !this.guarded) fail('PENDING');
    if (coreProof === 'committed') this.archived = true; else this.closing = false;
  }
  settle(command, chatProof) {
    if (!this.holds.has(command) || !['committed', 'aborted'].includes(chatProof)) fail('PENDING');
    this.holds.set(command, chatProof);
  }
  recover(command) {
    if (this.holds.get(command) !== 'reserved' || this.outcome) fail('INVALID_TRANSITION');
    this.recovered = true; this.settle(command, 'committed');
  }
  linkOutcome() {
    if ([...this.holds.values()].some(s => s === 'reserved')) return 'pending';
    this.outcome = true; return 'linked';
  }
}
