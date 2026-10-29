// Test specification only. Trusted peer/owner fixtures and JSON snapshots are not runtime adapters.
import { readFile } from 'node:fs/promises';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { canonical } from './dispatch-reference.mjs';
import { payloadDigest } from './exchange-reference.mjs';

const schema = JSON.parse(await readFile(new URL('../../packages/contracts/schemas/chat-control-v1.json', import.meta.url), 'utf8'));
const ajv = addFormats(new Ajv({ strict: true, allErrors: true })); ajv.addSchema(schema);
export const validateControl = name => ajv.getSchema(schema.$id + '#/definitions/' + name);
const copy = value => structuredClone(value);
const fail = code => { throw new Error(code); };
const same = (a, b) => canonical(a) === canonical(b);
const size = value => Buffer.byteLength(JSON.stringify(value), 'utf8');
const consumers = ['crm', 'ai-runtime', 'workflow'];
const counters = ['registry_revision', 'record_version', 'owner_revision', 'control_revision', 'pause_through_revision', 'cancel_through_revision'];

export function checkedSnapshot(value, previous = null) {
  if (!validateControl('ChatRegistrySnapshot')(value) || size(value) > 16384) fail('INVALID_REQUEST');
  if ((value.owner_principal_id === null) !== (value.owner_kind === null)) fail('CONFLICT');
  if (BigInt(value.pause_through_revision) >= BigInt(value.control_revision) || BigInt(value.cancel_through_revision) >= BigInt(value.control_revision)) fail('CONFLICT');
  if (!previous) return value;
  if (value.tenant_id !== previous.tenant_id || value.conversation_id !== previous.conversation_id) fail('NOT_FOUND');
  if (counters.some(k => BigInt(value[k]) < BigInt(previous[k]))) fail('CONFLICT');
  if (value.registry_revision === previous.registry_revision && !same(value, previous)) fail('CONFLICT');
  const ownerChanged = value.owner_principal_id !== previous.owner_principal_id || value.owner_kind !== previous.owner_kind || value.owner_revision !== previous.owner_revision;
  const episodeChanged = value.active_session_id !== previous.active_session_id;
  const closed = value.status === 'closed' && previous.status !== 'closed' || value.archived && !previous.archived;
  const reopened = previous.status === 'closed' && value.status !== 'closed' || previous.archived && !value.archived;
  if ((ownerChanged || episodeChanged || closed || reopened) && BigInt(value.control_revision) <= BigInt(previous.control_revision)) fail('CONFLICT');
  if (value.control_revision !== previous.control_revision && BigInt(value.record_version) <= BigInt(previous.record_version)) fail('CONFLICT');
  if (ownerChanged && (BigInt(value.owner_revision) <= BigInt(previous.owner_revision) || BigInt(value.pause_through_revision) < BigInt(previous.control_revision))) fail('CONFLICT');
  if ((episodeChanged || closed) && BigInt(value.cancel_through_revision) < BigInt(previous.control_revision)) fail('CONFLICT');
  return value;
}

function authenticated(peer, tenant, service, target) {
  if (!peer?.authenticated) fail('UNAUTHENTICATED');
  if (peer.service !== service || peer.target !== target) fail('FORBIDDEN');
  if (!peer.businessTenants?.includes(tenant)) fail('NOT_FOUND');
  if (peer.active === false) fail('REVOKED');
}

// Fixtures represent the authoritative owner response, not client-supplied evidence.
export class ChatControlOwners {
  constructor(snapshot) {
    checkedSnapshot(snapshot); this.snapshot = copy(snapshot); this.events = new Map(); this.unavailable = new Set(); this.readAllowed = true; this.references = new Map();
  }
  execute(peer, request) {
    if (!validateControl('ChatControlRequest')(request) || size(request) > 16384) fail('INVALID_REQUEST');
    const tenant = request.tenant_id ?? request.notice.tenant_id;
    const target = { 'registry-read': 'chat', 'event-read': 'chat', 'contact-check': 'crm', 'connection-check': 'connector', 'principal-check': 'identity', 'metadata-check': 'crm' }[request.operation];
    if (target === 'chat' && !consumers.includes(peer?.service)) fail('FORBIDDEN');
    authenticated(peer, tenant, target === 'chat' ? peer.service : 'chat', target);
    if (!this.readAllowed) fail('FORBIDDEN');
    if (tenant !== this.snapshot.tenant_id) fail('NOT_FOUND');
    if (this.unavailable.has(target)) fail('DEPENDENCY_UNAVAILABLE');
    const common = { schema_version: 1, request_id: request.request_id };
    if (request.operation === 'registry-read') {
      if (request.conversation_id !== this.snapshot.conversation_id) fail('NOT_FOUND');
      if (BigInt(this.snapshot.registry_revision) < BigInt(request.minimum_revision)) fail('DEPENDENCY_UNAVAILABLE');
      checkedSnapshot(this.snapshot); return { ...common, snapshot: copy(this.snapshot) };
    }
    if (request.operation === 'event-read') {
      const event = this.events.get(request.notice.event_id);
      if (!event) fail('NOT_FOUND');
      for (const k of ['tenant_id', 'conversation_id', 'registry_revision', 'event_id']) if (event[k] !== request.notice[k]) fail('CONFLICT');
      return { ...common, event: copy(event) };
    }
    const reference = this.references.get(request.operation);
    if (!reference) fail('NOT_FOUND');
    if (!reference.active) fail('REVOKED');
    const { schema_version: _version, request_id: _id, operation: _operation, ...binding } = request;
    if (!same(binding, reference.binding)) fail('CONFLICT');
    return { ...common, status: 'current', observed_revision: reference.revision };
  }
}

export class ChatControlConsumer {
  constructor(tenant, conversation, service, maxPending = 1000) {
    if (!consumers.includes(service) || !Number.isInteger(maxPending) || maxPending < 1 || maxPending > 1000) fail('INVALID_REQUEST');
    this.tenant = tenant; this.conversation = conversation; this.service = service; this.consumerId = service === 'crm' ? 'crm.chat-registry.v1' : service + '.chat-control.v1';
    this.maxPending = maxPending; this.projection = null; this.ready = false; this.attention = false;
    this.inbox = new Map(); this.pending = new Map(); this.quarantine = new Map(); this.jobs = new Map();
  }
  checkPeer(peer) { authenticated(peer, this.tenant, 'chat', this.service); }
  checkBinding(value) { if (value.tenant_id !== this.tenant || value.conversation_id !== this.conversation) fail('NOT_FOUND'); }
  transaction(action, { crashBeforeCommit = false, loseAck = false } = {}) {
    const draft = Object.assign(Object.create(ChatControlConsumer.prototype), copy({ ...this }));
    const result = action(draft);
    if (crashBeforeCommit) fail('CRASH_BEFORE_COMMIT');
    Object.assign(this, draft);
    if (loseAck) fail('ACK_LOST');
    return copy(result);
  }
  quarantineEvent(notice, hash, reason) {
    this.quarantine.set(notice.event_id, { event_id: notice.event_id, digest: hash, reason });
    this.attention = true; this.ready = false; return { state: 'quarantined', event_id: notice.event_id };
  }
  receive(peer, notice, event, faults) {
    this.checkPeer(peer);
    if (!validateControl('ChatControlNotice')(notice)) fail('INVALID_REQUEST'); this.checkBinding(notice);
    const hash = payloadDigest(event);
    return this.transaction(draft => {
      if (!validateControl('ChatControlEvent')(event) || size(event) > 16384) return draft.quarantineEvent(notice, hash, 'INVALID_EVENT');
      if (['event_id', 'tenant_id', 'conversation_id', 'registry_revision'].some(k => event[k] !== notice[k]) || ['tenant_id', 'conversation_id', 'registry_revision'].some(k => event.snapshot[k] !== event[k])) return draft.quarantineEvent(notice, hash, 'BINDING_CONFLICT');
      try { checkedSnapshot(event.snapshot); } catch { return draft.quarantineEvent(notice, hash, 'INVALID_SNAPSHOT'); }
      if (draft.quarantine.has(notice.event_id)) return { state: 'quarantined', event_id: notice.event_id };
      const old = draft.inbox.get(notice.event_id);
      if (old) return old.hash === hash ? { state: old.state, event_id: notice.event_id } : draft.quarantineEvent(notice, hash, 'EVENT_CONFLICT');
      const current = draft.projection, incoming = BigInt(event.registry_revision);
      let state;
      if (current && incoming <= BigInt(current.registry_revision)) {
        if (incoming === BigInt(current.registry_revision) && !same(current, event.snapshot)) return draft.quarantineEvent(notice, hash, 'REVISION_CONFLICT');
        state = 'stale';
      } else if (!draft.ready || !current || incoming !== BigInt(current.registry_revision) + 1n) {
        if (draft.pending.size >= draft.maxPending) fail('BACKPRESSURE');
        draft.pending.set(notice.event_id, copy(notice)); draft.ready = false; state = 'pending';
      } else {
        try { checkedSnapshot(event.snapshot, current); } catch { return draft.quarantineEvent(notice, hash, 'COUNTER_REGRESSION'); }
        draft.projection = copy(event.snapshot); draft.cleanup(); state = 'applied';
      }
      draft.inbox.set(notice.event_id, { hash, state, snapshot: copy(event.snapshot) }); return { state, event_id: notice.event_id };
    }, faults);
  }
  minimumRevision() {
    return [...this.pending.values()].reduce((max, notice) => BigInt(notice.registry_revision) > BigInt(max) ? notice.registry_revision : max, this.projection?.registry_revision ?? '1');
  }
  reconcile(peer, snapshot, faults) {
    this.checkPeer(peer); this.checkBinding(snapshot); checkedSnapshot(snapshot, this.projection);
    if (BigInt(snapshot.registry_revision) < BigInt(this.minimumRevision())) fail('DEPENDENCY_UNAVAILABLE');
    for (const [id] of this.pending) checkedSnapshot(snapshot, this.inbox.get(id).snapshot);
    return this.transaction(draft => {
      draft.projection = copy(snapshot); draft.cleanup();
      for (const [id] of draft.pending) { draft.inbox.get(id).state = 'reconciled'; }
      draft.pending.clear(); draft.ready = !draft.attention;
      return { state: draft.ready ? 'ready' : 'attention', registry_revision: snapshot.registry_revision };
    }, faults);
  }
  // The durable runtime adapter must obtain real owner admission; this is a job fixture only.
  registerJob(job) {
    if (!this.ready || this.attention || !this.projection) fail('NOT_READY');
    if (this.service === 'crm') fail('FORBIDDEN');
    this.checkBinding(job);
    if (!/^[1-9][0-9]{0,19}$/.test(job.control_revision) || !['queued', 'running', 'waiting_message', 'paused_human', 'completed', 'failed', 'cancelled'].includes(job.status) || BigInt(job.control_revision) > BigInt(this.projection.control_revision)) fail('CONFLICT');
    if (this.projection.archived || this.projection.status === 'closed') fail('REVOKED');
    if (this.jobs.has(job.id)) fail('CONFLICT');
    this.jobs.set(job.id, { ...copy(job), fence: 0, releases: 0 }); this.cleanup();
  }
  cleanup() {
    if (!this.projection || this.service === 'crm') return;
    const cancel = BigInt(this.projection.cancel_through_revision), pause = BigInt(this.projection.pause_through_revision);
    for (const job of this.jobs.values()) {
      if (['completed', 'failed', 'cancelled'].includes(job.status)) continue;
      const generation = BigInt(job.control_revision);
      const status = generation <= cancel || this.service === 'ai-runtime' && generation <= pause ? 'cancelled' : generation <= pause ? 'paused_human' : job.status;
      if (status !== job.status) { job.status = status; job.fence++; if (this.service === 'ai-runtime') job.releases = 1; }
    }
  }
  snapshot() { return copy({ ...this, ...Object.fromEntries(['inbox', 'pending', 'quarantine', 'jobs'].map(k => [k, [...this[k]]])) }); }
  static restore(snapshot) {
    const state = copy(snapshot), model = new ChatControlConsumer(state.tenant, state.conversation, state.service, state.maxPending);
    Object.assign(model, state, { ready: false });
    for (const field of ['inbox', 'pending', 'quarantine', 'jobs']) model[field] = new Map(state[field]);
    return model;
  }
}
