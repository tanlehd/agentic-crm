// Executable specification only: trusted peer/authority fixtures, no HTTP/SQL/provider adapter.
import { readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { DispatchReference, canonical } from './dispatch-reference.mjs';

const schema = JSON.parse(await readFile(new URL('../../packages/contracts/schemas/chat-exchange-v1.json', import.meta.url), 'utf8'));
const ajv = addFormats(new Ajv({ strict: true, allErrors: true }));
ajv.addSchema(schema);
export const validateExchange = name => ajv.getSchema(schema.$id + '#/definitions/' + name);
export const payloadDigest = value => createHash('sha256').update(canonical(value), 'utf8').digest('hex');
const same = (a, b) => canonical(a) === canonical(b);
const fail = code => { throw new Error(code); };
const routes = { 'payload-put': ['chat', 'connector'], 'ingress-accept': ['connector', 'chat'], 'ingress-read': ['connector', 'chat'], 'connector-cancel': ['chat', 'connector'], 'cancellation-read': ['connector', 'chat'] };
const key = (...parts) => JSON.stringify(parts);
const bytes = value => Buffer.byteLength(JSON.stringify(value), 'utf8');
const copy = value => structuredClone(value);

export class ExchangeReference {
  constructor(dispatchBinding, ingressBinding, subject = 'synthetic-subject') {
    if (!validateExchange('ExchangeIngressBinding')(ingressBinding)) fail('INVALID_REQUEST');
    this.dispatch = new DispatchReference(dispatchBinding);
    this.ingressBinding = copy(ingressBinding);
    this.mapping = { ...copy(ingressBinding), external_subject_id: subject };
    this.authority = { connectionActive: true, contactActive: true, readAllowed: true };
    this.unavailable = new Set();
    this.requests = new Map(); this.events = new Map(); this.sources = new Map(); this.inbox = new Map(); this.messages = new Map();
    this.staged = null; this.cancellation = null; this.cancelled = false;
    this.messageEffects = 0;
    // Supplied Chat lifecycle output, deliberately not a simulation of session/routing rules.
    this.lifecycleConversationId = dispatchBinding.conversation_id;
  }
  checkPeer(peer, request) {
    if (!peer?.authenticated) fail('UNAUTHENTICATED');
    const [caller, target] = routes[request.operation];
    if (peer.service !== caller || peer.target !== target) fail('FORBIDDEN');
    if (!peer.businessTenants?.includes(request.binding.tenant_id)) fail('NOT_FOUND');
    if (!this.authority.readAllowed) fail('FORBIDDEN');
    if (this.unavailable.has(target)) fail('DEPENDENCY_UNAVAILABLE');
    const expected = request.operation.startsWith('ingress-') ? this.ingressBinding : this.dispatch.binding;
    if (expected.tenant_id !== request.binding.tenant_id) fail('NOT_FOUND');
    if (!same(expected, request.binding)) fail('CONFLICT');
  }
  checkContact(binding, subject) {
    if (this.unavailable.has('crm') || this.unavailable.has('connector')) fail('DEPENDENCY_UNAVAILABLE');
    if (!this.authority.connectionActive || !this.authority.contactActive) fail('REVOKED');
    if (!this.mapping || !same({ ...binding, external_subject_id: subject }, this.mapping)) fail('CONFLICT');
  }
  checkPayload(request) {
    const d = this.dispatch;
    if (request.payload.message.text.length > 4000) fail('INVALID_REQUEST');
    if (this.cancelled || d.chat.state === 'cancelled') fail('INVALID_TRANSITION');
    if (!d.bindingActive || !d.readAllowed) fail('REVOKED');
    d.policy();
    const grant = d.checkGrant(request.grant_id);
    if (grant.state === 'revoked' || grant.revision !== d.auth.revision) fail('REVOKED');
    if (d.now >= grant.expires) fail('EXPIRED');
    // Staging replay after consumption is an acknowledgement only, never a new payload write.
    if (grant.state !== 'issued' && !(grant.state === 'consumed' && this.staged)) fail('INVALID_TRANSITION');
    if (!same(grant.resource, d.resource) || d.owner.principal !== d.binding.principal_id || d.owner.revision !== d.binding.owner_revision || !d.owner.open) fail('REVOKED');
    if (bytes(request.payload) > 65536 || payloadDigest(request.payload) !== request.binding.payload_digest) fail('CONFLICT');
    if (this.staged && (!same(this.staged.binding, request.binding) || this.staged.grant_id !== request.grant_id || !same(this.staged.payload, request.payload))) fail('CONFLICT');
  }
  proof(request) {
    if (this.unavailable.has('chat')) fail('DEPENDENCY_UNAVAILABLE');
    if (!this.cancellation || request.cancellation_id !== this.cancellation.id) fail('NOT_FOUND');
    if (request.reason && request.reason !== this.cancellation.reason) fail('CONFLICT');
    if (this.dispatch.chat.state !== 'cancelled' || this.dispatch.chat.claim_id) fail('INVALID_TRANSITION');
    return { schema_version: 1, request_id: request.request_id, receipt_id: this.dispatch.binding.intent_id, state: 'cancelled', cancellation_id: this.cancellation.id, reason: this.cancellation.reason };
  }
  receipt(request, row) {
    return { schema_version: 1, request_id: request.request_id, receipt_id: row.id, state: row.state,
      ...(row.state === 'processed' ? { conversation_id: row.conversation_id, message_id: row.message_id, duplicate: row.duplicate } : {}),
      ...(row.state === 'failed' ? { error_code: row.error_code } : {}) };
  }
  execute(peer, request, { loseAck = false } = {}) {
    if (!validateExchange('ExchangeRequest')(request)) fail('INVALID_REQUEST');
    if (bytes(request) > (['payload-put', 'ingress-accept'].includes(request.operation) ? 98304 : 16384)) fail('INVALID_REQUEST');
    this.checkPeer(peer, request);
    const ledgerKey = key(peer.target, request.binding.tenant_id, peer.service, request.operation, request.request_id);
    const hash = payloadDigest(request), previous = this.requests.get(ledgerKey);
    if (previous && previous.hash !== hash) fail('CONFLICT');
    // Current authorization is required even for immutable request receipt replay.
    if (request.operation === 'payload-put') this.checkPayload(request);
    if (request.operation === 'ingress-accept') this.checkContact(request.binding, request.intake.external_subject_id);
    if (request.operation === 'ingress-read') {
      const row = this.inbox.get(request.receipt_id);
      if (!row || !same(row.binding, request.binding)) fail('NOT_FOUND');
      this.checkContact(row.binding, row.intake.external_subject_id);
    }
    if (request.operation === 'connector-cancel' || request.operation === 'cancellation-read') this.proof(request);
    if (previous && !request.operation.endsWith('-read')) return copy(previous.reply);
    let reply;
    switch (request.operation) {
      case 'payload-put':
        this.staged ??= copy({ binding: request.binding, grant_id: request.grant_id, payload: request.payload });
        reply = { schema_version: 1, request_id: request.request_id, receipt_id: request.binding.attempt_id, state: 'staged' }; break;
      case 'ingress-accept': reply = this.accept(request); break;
      case 'ingress-read': reply = this.receipt(request, this.inbox.get(request.receipt_id)); break;
      case 'cancellation-read': reply = this.proof(request); break;
      case 'connector-cancel':
        if (this.dispatch.connector && !['prepared', 'cancelled'].includes(this.dispatch.connector.state)) fail('INVALID_TRANSITION');
        this.cancelled = true;
        if (this.dispatch.connector) this.dispatch.connector.state = 'cancelled';
        this.dispatch.local = null; reply = this.proof(request); break;
    }
    if (!validateExchange('ExchangeReply')(reply)) fail('MODEL_INVALID_REPLY');
    // Reads retain request digest but always return a fresh observation.
    this.requests.set(ledgerKey, { hash, ...(request.operation.endsWith('-read') ? {} : { reply: copy(reply) }) });
    if (loseAck) fail('ACK_LOST');
    return copy(reply);
  }
  accept(request) {
    const intake = copy(request.intake);
    if (bytes(intake) > 65536) fail('INVALID_REQUEST');
    if (intake.message.type === 'text' && intake.message.text.length > 4000) fail('INVALID_REQUEST');
    const occurred = new Date(intake.occurred_at).toISOString();
    if (occurred.slice(0, 19) !== intake.occurred_at.slice(0, 19)) fail('INVALID_REQUEST');
    intake.occurred_at = occurred;
    const b = request.binding, eventKey = key(b.tenant_id, b.connection_id, intake.provider_event_id);
    const sourceKey = key(b.tenant_id, b.connection_id, request.source_delivery_id);
    const hash = payloadDigest({ binding: b, intake });
    const source = this.sources.get(sourceKey), priorId = this.events.get(eventKey), prior = this.inbox.get(priorId);
    if (source && (source.eventKey !== eventKey || source.hash !== hash) || prior && prior.hash !== hash) fail('CONFLICT');
    const row = prior ?? { id: randomUUID(), state: 'received', binding: copy(b), intake, hash };
    // Represents one local inbox transaction; no remote calls within this block.
    this.inbox.set(row.id, row); this.events.set(eventKey, row.id); this.sources.set(sourceKey, { eventKey, hash });
    // Acceptance ACK is historical even if processing already completed. Read for current state.
    return this.receipt(request, { id: row.id, state: 'received' });
  }
  process(id, { loseAck = false } = {}) {
    const row = this.inbox.get(id); if (!row) fail('NOT_FOUND');
    if (row.state !== 'received') return row.state;
    if (this.unavailable.has('chat')) fail('DEPENDENCY_UNAVAILABLE');
    try { this.checkContact(row.binding, row.intake.external_subject_id); }
    catch (error) {
      if (error.message === 'DEPENDENCY_UNAVAILABLE') throw error;
      row.state = 'failed'; row.error_code = error.message === 'REVOKED' ? 'REVOKED' : 'CONTACT_BINDING_STALE'; return row.state;
    }
    const b = row.binding, i = row.intake, messageKey = key(b.tenant_id, b.connection_id, i.provider_message_id);
    const fingerprint = payloadDigest({ contact: b.crm_contact_id, identity: b.crm_identity_id, subject: i.external_subject_id, occurred_at: i.occurred_at, message: i.message });
    const prior = this.messages.get(messageKey);
    if (prior && prior.fingerprint !== fingerprint) { row.state = 'failed'; row.error_code = 'MESSAGE_PAYLOAD_CONFLICT'; return row.state; }
    const message = prior ?? { id: randomUUID(), conversation_id: this.lifecycleConversationId, fingerprint };
    this.messages.set(messageKey, message);
    if (!prior) this.messageEffects++;
    Object.assign(row, { state: 'processed', conversation_id: message.conversation_id, message_id: message.id, duplicate: !!prior });
    if (loseAck) fail('ACK_LOST');
    return row.state;
  }
  cancel(reason) {
    if (!['owner_changed', 'conversation_closed', 'authorization_revoked'].includes(reason)) fail('INVALID_REQUEST');
    if (this.dispatch.chat.claim_id) return { state: ['sent', 'unknown'].includes(this.dispatch.chat.state) ? this.dispatch.chat.state : 'in_flight' };
    this.dispatch.chat.state = 'cancelled';
    this.cancellation ??= { id: randomUUID(), reason };
    return { state: 'cancelled', cancellation_id: this.cancellation.id, reason: this.cancellation.reason };
  }
  executeDispatch(peer, request, options) {
    if (['connector-prepare', 'connector-begin'].includes(request.operation)) {
      if (this.cancelled || this.dispatch.chat.state === 'cancelled') fail('INVALID_TRANSITION');
      if (!this.staged || !same(this.staged.binding, request.binding) || this.staged.grant_id !== request.grant_id) fail('CONFLICT');
      if (payloadDigest(this.staged.payload) !== request.binding.payload_digest) fail('CONFLICT');
    }
    return this.dispatch.execute(peer, request, options);
  }
  invokeProvider() {
    if (!this.staged || !same(this.staged.binding, this.dispatch.binding) || payloadDigest(this.staged.payload) !== this.dispatch.binding.payload_digest || this.cancelled) {
      this.dispatch.abortBegin(); fail('CONFLICT');
    }
    return this.dispatch.invokeProvider();
  }
  snapshot() {
    return copy({ dispatch: this.dispatch.snapshot(), ingressBinding: this.ingressBinding, mapping: this.mapping, authority: this.authority,
      requests: [...this.requests], events: [...this.events], sources: [...this.sources], inbox: [...this.inbox], messages: [...this.messages],
      staged: this.staged, cancellation: this.cancellation, cancelled: this.cancelled, messageEffects: this.messageEffects, lifecycleConversationId: this.lifecycleConversationId });
  }
  static restore(snapshot) {
    const state = copy(snapshot), model = new ExchangeReference(state.dispatch.binding, state.ingressBinding);
    Object.assign(model, state, { dispatch: DispatchReference.restore(state.dispatch), unavailable: new Set() });
    for (const field of ['requests', 'events', 'sources', 'inbox', 'messages']) model[field] = new Map(state[field]);
    return model;
  }
}
