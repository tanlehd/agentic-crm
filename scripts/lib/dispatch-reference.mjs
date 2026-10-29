// Executable protocol specification ONLY. No server, SQL, mTLS or provider adapter.
import { readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const schema = JSON.parse(await readFile(new URL('../../packages/contracts/schemas/chat-dispatch-v1.json', import.meta.url), 'utf8'));
const ajv = addFormats(new Ajv({ strict: true, allErrors: true }));
ajv.addSchema(schema);
export const validateDispatch = name => ajv.getSchema(schema.$id + '#/definitions/' + name);
export const canonical = value => JSON.stringify(normalize(value));
function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])]));
  return value;
}
const digest = value => createHash('sha256').update(canonical(value), 'utf8').digest('hex');
const same = (a, b) => canonical(a) === canonical(b);
const fail = code => { throw new Error(code); };
const callers = { 'identity-issue': ['chat'], 'identity-consume': ['connector'], 'chat-claim': ['connector'], 'connector-prepare': ['chat'], 'connector-begin': ['chat'], 'connector-result': ['connector'], 'receipt-read': ['chat', 'connector'] };
const targets = { 'identity-issue': 'identity', 'identity-consume': 'identity', 'chat-claim': 'chat', 'connector-prepare': 'connector', 'connector-begin': 'connector', 'connector-result': 'chat' };

export class DispatchReference {
  constructor(binding, now = 0) {
    if (!validateDispatch('DispatchBinding')(binding)) fail('INVALID_REQUEST');
    this.binding = structuredClone(binding); this.now = now;
    this.auth = { allowed: true, delegationActive: true, revision: '1', chatSeat: true, readScope: 'own', replyScope: 'own', teamIds: [], textRead: true, textWrite: true };
    this.owner = { principal: binding.principal_id, revision: binding.owner_revision, open: true };
    this.resource = { object_key: 'conversation', owner_principal_id: binding.principal_id, owner_revision: binding.owner_revision, record_version: binding.record_version, team_id: null, shared_team_ids: [] };
    this.bindingActive = true; this.readAllowed = true; this.unavailable = new Set();
    this.grants = new Map(); this.requests = new Map(); this.chat = { state: 'queued', claim_id: null, grant_id: null };
    this.connector = null; this.local = null; this.providerEffects = 0;
  }
  policy(context = this.resource) {
    if (this.unavailable.has('identity')) fail('DEPENDENCY_UNAVAILABLE');
    if (!this.auth.allowed || !this.auth.delegationActive) fail('REVOKED');
    const scope = value => value === 'all' || value === 'own' && context.owner_principal_id === this.binding.principal_id || value === 'team' && this.auth.teamIds.some(id => id === context.team_id || context.shared_team_ids.includes(id));
    if (!this.auth.chatSeat || !this.auth.textRead || !this.auth.textWrite || !scope(this.auth.readScope) || !scope(this.auth.replyScope)) fail('REVOKED');
  }
  checkGrant(id) {
    if (this.unavailable.has('identity')) fail('DEPENDENCY_UNAVAILABLE');
    const grant = this.grants.get(id); if (!grant) fail('NOT_FOUND');
    return grant;
  }
  reply(request, receipt, state, extra = {}) { return { schema_version: 1, request_id: request.request_id, receipt_id: receipt, state, ...extra }; }
  connectorReply(request) { return this.reply(request, this.binding.attempt_id, this.connector.state, this.connector.state === 'sent' ? { provider_message_id: this.connector.provider_message_id } : {}); }
  // peer is trusted test fixture context, representing a verified TLS peer + tenant admission.
  // It is intentionally not extracted from request JSON or claimed to implement mTLS.
  execute(peer, request, { loseAck = false } = {}) {
    if (!validateDispatch('DispatchRequest')(request)) fail('INVALID_REQUEST');
    if (!peer?.authenticated) fail('UNAUTHENTICATED');
    if (!callers[request.operation].includes(peer.service) || peer.target !== (targets[request.operation] ?? peer.target) || !['chat', 'identity', 'connector'].includes(peer.target)) fail('FORBIDDEN');
    if (request.binding.tenant_id !== this.binding.tenant_id || !peer.businessTenants?.includes(request.binding.tenant_id)) fail('NOT_FOUND');
    if (!this.readAllowed) fail('FORBIDDEN');
    if (this.unavailable.has(peer.target)) fail('DEPENDENCY_UNAVAILABLE');
    const key = [peer.target, request.binding.tenant_id, peer.service, request.operation, request.request_id].join('/');
    const hash = digest(request), old = this.requests.get(key);
    if (old && old.hash !== hash) fail('CONFLICT');
    if (!same(request.binding, this.binding)) fail('CONFLICT');
    if (old) { if (old.error) fail(old.error); return structuredClone(old.reply); }
    let result;
    try { result = this.transition(peer, request); }
    catch (error) {
      // Transient dependency failures do not become a permanent business rejection.
      if (error.message !== 'DEPENDENCY_UNAVAILABLE') this.requests.set(key, { hash, error: error.message });
      throw error;
    }
    if (!validateDispatch('DispatchReply')(result.reply)) fail('MODEL_INVALID_REPLY');
    // Reads are current observations, not durable cached snapshots of authority.
    if (request.operation !== 'receipt-read') this.requests.set(key, { hash, reply: structuredClone(result.reply) });
    if (loseAck) fail('ACK_LOST');
    if (result.firstConsume && this.local?.fence === request.fence_id) this.local.confirmed = true;
    return structuredClone(result.reply);
  }
  transition(peer, request) {
    const grant = request.grant_id ? this.checkGrant(request.grant_id) : null;
    let reply, firstConsume = false;
    switch (request.operation) {
      case 'identity-issue': {
        const context = request.resource_context;
        if (context.owner_principal_id !== this.binding.principal_id || context.owner_revision !== this.binding.owner_revision || context.record_version !== this.binding.record_version) fail('CONFLICT');
        this.policy(context); const id = randomUUID(), expires = this.now + 10000;
        this.grants.set(id, { id, expires, revision: this.auth.revision, state: 'issued', claim: null, fence: null, resource: structuredClone(context) });
        reply = this.reply(request, id, 'issued', { grant_id: id, expires_at: new Date(expires).toISOString(), resource_context: context }); break;
      }
      case 'connector-prepare': {
        if (!this.bindingActive) fail('REVOKED');
        if (this.connector && this.connector.grant_id !== request.grant_id) fail('CONFLICT');
        if (!this.connector) this.connector = { state: 'prepared', grant_id: request.grant_id, fence: null, provider_message_id: null };
        reply = this.connectorReply(request); break;
      }
      case 'chat-claim': {
        if (this.chat.claim_id) {
          if (this.chat.grant_id !== request.grant_id) fail('CONFLICT');
        } else {
          if (grant.state === 'revoked') fail('REVOKED');
          if (grant.state !== 'issued' || this.now >= grant.expires) fail('EXPIRED');
          if (this.chat.state !== 'queued' || !this.owner.open || this.owner.principal !== this.binding.principal_id || this.owner.revision !== this.binding.owner_revision || !same(grant.resource, this.resource)) fail('STALE_OWNER');
          this.chat = { state: 'claimed', claim_id: randomUUID(), grant_id: request.grant_id };
        }
        reply = this.reply(request, this.chat.claim_id, 'claimed', { claim_id: this.chat.claim_id }); break;
      }
      case 'connector-begin': {
        if (!this.connector || !this.chat.claim_id) fail('INVALID_TRANSITION');
        if (request.claim_id !== this.chat.claim_id || request.grant_id !== this.chat.grant_id || request.grant_id !== this.connector.grant_id) fail('CONFLICT');
        if (this.connector.state === 'prepared') {
          if (!this.bindingActive) fail('REVOKED');
          const fence = randomUUID(); this.connector.state = 'admitting'; this.connector.fence = fence;
          this.local = { fence, deadline: this.now + 5000, confirmed: false, permit: false };
        }
        reply = this.connectorReply(request); break;
      }
      case 'identity-consume': {
        if (this.unavailable.has('chat')) fail('DEPENDENCY_UNAVAILABLE');
        if (request.claim_id !== this.chat.claim_id || request.grant_id !== this.chat.grant_id) fail('CONFLICT');
        if (grant.state === 'consumed') {
          if (grant.claim !== request.claim_id || grant.fence !== request.fence_id) fail('CONFLICT');
        } else {
          this.policy(grant.resource);
          if (this.now >= grant.expires) fail('EXPIRED');
          if (grant.revision !== this.auth.revision) fail('REVOKED');
          grant.state = 'consumed'; grant.claim = request.claim_id; grant.fence = request.fence_id; firstConsume = true;
        }
        reply = this.reply(request, grant.id, 'consumed', { grant_id: grant.id, claim_id: grant.claim, resource_context: grant.resource }); break;
      }
      case 'connector-result': {
        if (!this.chat.claim_id) fail('INVALID_TRANSITION');
        if (this.chat.state === 'sent') {
          if (request.outcome === 'sent' && request.provider_message_id !== this.chat.provider_message_id) fail('CONFLICT');
        } else if (request.outcome === 'sent') { this.chat.state = 'sent'; this.chat.provider_message_id = request.provider_message_id; }
        else this.chat.state = 'unknown';
        reply = this.reply(request, this.binding.intent_id, this.chat.state, this.chat.state === 'sent' ? { provider_message_id: this.chat.provider_message_id } : {}); break;
      }
      case 'receipt-read': {
        if (peer.target === 'identity') {
          const row = this.checkGrant(request.receipt_id);
          reply = row.state === 'consumed' ? this.reply(request, row.id, 'consumed', { grant_id: row.id, claim_id: row.claim, resource_context: row.resource }) : row.state === 'revoked' ? this.reply(request, row.id, 'revoked') : this.now >= row.expires ? this.reply(request, row.id, 'expired') : this.reply(request, row.id, 'issued', { grant_id: row.id, expires_at: new Date(row.expires).toISOString(), resource_context: row.resource });
        } else if (peer.target === 'connector' && this.connector && request.receipt_id === this.binding.attempt_id) reply = this.connectorReply(request);
        else if (peer.target === 'chat' && this.chat.claim_id && request.receipt_id === this.chat.claim_id) reply = this.reply(request, this.chat.claim_id, 'claimed', { claim_id: this.chat.claim_id });
        else if (peer.target === 'chat' && request.receipt_id === this.binding.intent_id && ['sent', 'unknown', 'cancelled'].includes(this.chat.state)) reply = this.reply(request, request.receipt_id, this.chat.state, this.chat.state === 'sent' ? { provider_message_id: this.chat.provider_message_id } : {});
        else fail('NOT_FOUND');
        break;
      }
    }
    return { reply, firstConsume };
  }
  // Remaining steps of the winning Connector begin handler, split to exercise crash points.
  start() {
    if (this.connector?.state !== 'admitting' || !this.local?.confirmed || this.local.fence !== this.connector.fence) fail('INVALID_TRANSITION');
    if (!this.bindingActive) { this.connector.state = 'rejected'; this.local = null; fail('REVOKED'); }
    if (this.now >= this.local.deadline) { this.connector.state = 'unknown'; this.local = null; fail('EXPIRED'); }
    this.connector.state = 'started'; this.local.permit = true;
  }
  invokeProvider() {
    if (!this.local?.permit || this.connector?.state !== 'started') return false;
    this.local.permit = false;
    if (this.now >= this.local.deadline) { this.connector.state = 'unknown'; return false; }
    this.providerEffects++; return true;
  }
  abortBegin() { if (['admitting', 'started'].includes(this.connector?.state)) this.connector.state = 'unknown'; this.local = null; }
  transportResult(outcome, providerId) {
    if (!['started', 'unknown', 'sent'].includes(this.connector?.state)) fail('INVALID_TRANSITION');
    if (outcome === 'sent') {
      if (!this.providerEffects || !providerId) fail('INVALID_TRANSITION');
      if (this.connector.state === 'sent' && this.connector.provider_message_id !== providerId) fail('CONFLICT');
      this.connector.state = 'sent'; this.connector.provider_message_id = providerId;
    } else if (outcome === 'unknown') { if (this.connector.state !== 'sent') this.connector.state = 'unknown'; }
    else fail('INVALID_TRANSITION');
  }
  revoke() { this.auth.allowed = false; this.auth.revision = String(BigInt(this.auth.revision) + 1n); for (const grant of this.grants.values()) if (grant.state === 'issued') grant.state = 'revoked'; }
  takeover() { this.owner.revision = String(BigInt(this.owner.revision) + 1n); if (this.chat.state === 'queued') this.chat.state = 'cancelled'; }
  snapshot() { return structuredClone({ binding: this.binding, now: this.now, auth: this.auth, owner: this.owner, resource: this.resource, bindingActive: this.bindingActive, readAllowed: this.readAllowed, grants: [...this.grants], requests: [...this.requests], chat: this.chat, connector: this.connector, providerEffects: this.providerEffects }); }
  static restore(snapshot) {
    const state = structuredClone(snapshot), model = new DispatchReference(state.binding, state.now);
    Object.assign(model, state, { grants: new Map(state.grants), requests: new Map(state.requests), local: null, unavailable: new Set() });
    if (['admitting', 'started'].includes(model.connector?.state)) model.connector.state = 'unknown';
    return model;
  }
}
