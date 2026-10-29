import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { ExchangeReference, validateExchange, payloadDigest } from '../lib/exchange-reference.mjs';

const fails = (fn, code) => assert.throws(fn, error => error.message === code);
const clone = value => structuredClone(value);
function fixture() {
  const payload = { version: 1, platform: 'mock_messenger', message: { type: 'text', text: 'Synthetic: xin chào 🌱' } };
  const b = { ...Object.fromEntries(['tenant_id', 'conversation_id', 'crm_contact_id', 'connection_id', 'intent_id', 'attempt_id', 'principal_id', 'delegation_id'].map(k => [k, randomUUID()])), actor_kind: 'human', owner_revision: '9007199254740993', record_version: '17', payload_digest: payloadDigest(payload) };
  const inbound = { tenant_id: b.tenant_id, connection_id: b.connection_id, crm_contact_id: b.crm_contact_id, crm_identity_id: randomUUID(), mapping_revision: '1', platform: 'mock_messenger' };
  let model = new ExchangeReference(b, inbound);
  const peer = (service, target) => ({ authenticated: true, service, target, businessTenants: [b.tenant_id] });
  const request = (operation, extra = {}) => ({ schema_version: 1, operation, request_id: randomUUID(), binding: clone(operation.startsWith('ingress-') ? inbound : b), ...extra });
  const run = (request, options) => model.execute(['ingress-accept', 'ingress-read', 'cancellation-read'].includes(request.operation) ? peer('connector', 'chat') : peer('chat', 'connector'), request, options);
  const dispatch = (service, target, request, options) => model.executeDispatch(peer(service, target), request, options);
  const issue = dispatch('chat', 'identity', request('identity-issue', { resource_context: clone(model.dispatch.resource) }));
  const put = request('payload-put', { grant_id: issue.grant_id, payload });
  const intake = { provider_event_id: 'synthetic-event-1', provider_message_id: 'synthetic-message-1', external_subject_id: 'synthetic-subject', occurred_at: '2026-10-18T01:02:03Z', message: { type: 'text', text: 'Synthetic inbound' } };
  const accept = request('ingress-accept', { source_delivery_id: randomUUID(), intake });
  const prepare = () => dispatch('chat', 'connector', request('connector-prepare', { grant_id: issue.grant_id }));
  const claim = () => dispatch('connector', 'chat', request('chat-claim', { grant_id: issue.grant_id }));
  const start = () => {
    run(put); prepare(); const c = claim();
    const begin = request('connector-begin', { grant_id: issue.grant_id, claim_id: c.claim_id });
    dispatch('chat', 'connector', begin);
    const consume = request('identity-consume', { grant_id: issue.grant_id, claim_id: c.claim_id, fence_id: model.dispatch.connector.fence });
    dispatch('connector', 'identity', consume); model.dispatch.start(); return { begin, consume };
  };
  const restore = () => { model = ExchangeReference.restore(JSON.parse(JSON.stringify(model.snapshot()))); };
  return { b, inbound, payload, request, peer, run, dispatch, issue, put, accept, prepare, claim, start, restore, get m() { return model; } };
}

test('exchange generated definitions reuse exact canonical intake/dispatch and five private mTLS operations', async () => {
  const read = async path => JSON.parse(await readFile(new URL('../../' + path, import.meta.url), 'utf8'));
  const schema = await read('packages/contracts/schemas/chat-exchange-v1.json');
  assert.deepEqual(schema.definitions.ExchangeIntake, (await read('packages/contracts/schemas/intake.json')).definitions['intake-request']);
  assert.deepEqual(schema.definitions.ExchangeDispatchBinding, (await read('packages/contracts/schemas/chat-dispatch-v1.json')).definitions.DispatchBinding);
  const api = await read('docs/contracts/chat-exchange.openapi.json');
  assert.equal(Object.keys(api.paths).length, 5); assert.equal(api.components.securitySchemes.workloadMTLS.type, 'mutualTLS');
  assert.deepEqual(api.security, [{ workloadMTLS: [] }, { workloadLocalService: [], workloadLocalKey: [] }]); assert.equal(api.components.securitySchemes.workloadLocalKey.name, 'x-workload-key'); assert.equal(api.components.securitySchemes.workloadLocalService.name, 'x-workload-service');
  for (const [path, methods] of Object.entries(api.paths)) {
    assert.deepEqual(Object.keys(methods), ['post']); assert.equal(path.split('/').at(-1), methods.post.operationId);
    assert.ok(api.components.schemas[methods.post.requestBody.content['application/json'].schema.$ref.split('/').at(-1)]);
  }
});

test('strict DTOs reject unsupported platform, rich outbound, version, thread/session hints and arbitrary text', () => {
  const f = fixture(), valid = validateExchange('ExchangeRequest');
  assert.ok(valid(f.put)); assert.ok(valid(f.accept));
  for (const bad of [
    { ...f.put, schema_version: 2 }, { ...f.put, token: 'not-a-credential' },
    { ...f.put, payload: { ...f.payload, platform: 'messenger' } },
    { ...f.put, payload: { ...f.payload, message: { type: 'rich', content: {} } } },
    { ...f.put, payload: { ...f.payload, message: { type: 'text', text: ' ' } } },
    { ...f.accept, conversation_id: randomUUID() }, { ...f.accept, session_id: randomUUID() }, { ...f.accept, thread_id: randomUUID() },
    { ...f.accept, binding: { ...f.inbound, mapping_revision: '2' } },
    { ...f.accept, intake: { ...f.accept.intake, raw_provider_payload: {} } }
  ]) assert.equal(valid(bad), false);
});

test('payload canonical digest preserves exact text/Unicode and ignores object key order', () => {
  const f = fixture();
  assert.equal(payloadDigest({ message: { text: f.payload.message.text, type: 'text' }, platform: 'mock_messenger', version: 1 }), f.b.payload_digest);
  assert.notEqual(payloadDigest({ ...f.payload, message: { type: 'text', text: 'é' } }), payloadDigest({ ...f.payload, message: { type: 'text', text: 'e\u0301' } }));
  for (const text of [f.payload.message.text + ' ', 'substitution']) fails(() => f.run({ ...f.put, payload: { ...f.payload, message: { type: 'text', text } } }), 'CONFLICT');
  assert.equal(f.m.staged, null);
});

test('semantic UTF-16 text bound matches current backend even when JSON Schema code-point bound passes', () => {
  const f = fixture(), text = '🌱'.repeat(2001);
  const outbound = { ...f.put, payload: { ...f.payload, message: { type: 'text', text } } };
  assert.ok(validateExchange('ExchangeRequest')(outbound)); fails(() => f.run(outbound), 'INVALID_REQUEST');
  const inbound = { ...f.accept, intake: { ...f.accept.intake, message: { type: 'text', text } } };
  assert.ok(validateExchange('ExchangeRequest')(inbound)); fails(() => f.run(inbound), 'INVALID_REQUEST');
  assert.equal(f.m.inbox.size, 0);
});

test('staging rechecks peer, target, every binding field and business tenant before receipt replay', () => {
  const f = fixture(); f.run(f.put);
  fails(() => f.m.execute({ ...f.peer('chat', 'connector'), authenticated: false }, f.put), 'UNAUTHENTICATED');
  fails(() => f.m.execute(f.peer('identity', 'connector'), f.put), 'FORBIDDEN');
  fails(() => f.m.execute(f.peer('chat', 'chat'), f.put), 'FORBIDDEN');
  fails(() => f.m.execute({ ...f.peer('chat', 'connector'), businessTenants: [] }, f.put), 'NOT_FOUND');
  for (const field of Object.keys(f.b)) {
    const value = field === 'actor_kind' ? 'ai' : ['owner_revision', 'record_version'].includes(field) ? '2' : field === 'payload_digest' ? 'a'.repeat(64) : randomUUID();
    fails(() => f.run({ ...f.put, request_id: randomUUID(), binding: { ...f.b, [field]: value } }), field === 'tenant_id' ? 'NOT_FOUND' : 'CONFLICT');
  }
  f.m.authority.readAllowed = false; fails(() => f.run(f.put), 'FORBIDDEN');
});

test('lost staging ACK and restore deduplicate without a provider effect or renewed TTL', () => {
  const f = fixture(); fails(() => f.run(f.put, { loseAck: true }), 'ACK_LOST'); f.restore();
  assert.equal(f.run(f.put).state, 'staged'); f.prepare(); assert.equal(f.m.dispatch.providerEffects, 0);
  f.m.dispatch.now = 10000; fails(() => f.run(f.put), 'EXPIRED');
  assert.equal(f.m.dispatch.grants.get(f.issue.grant_id).expires, 10000);
});

test('revoked delegation, changed resource, disabled binding and Identity outage deny payload transfer', () => {
  for (const [mutate, code] of [
    [m => m.dispatch.revoke(), 'REVOKED'], [m => { m.dispatch.resource.team_id = randomUUID(); }, 'REVOKED'],
    [m => { m.dispatch.bindingActive = false; }, 'REVOKED'], [m => m.dispatch.unavailable.add('identity'), 'DEPENDENCY_UNAVAILABLE']
  ]) { const f = fixture(); f.run(f.put); mutate(f.m); fails(() => f.run(f.put), code); assert.equal(f.m.dispatch.providerEffects, 0); }
});

test('prepare requires staged payload; corruption between start and invocation fails closed', () => {
  const f = fixture(); fails(f.prepare, 'CONFLICT'); f.start();
  f.m.staged.payload.message.text = 'corrupted'; fails(() => f.m.invokeProvider(), 'CONFLICT');
  assert.equal(f.m.dispatch.providerEffects, 0); assert.equal(f.m.dispatch.connector.state, 'unknown');
});

test('restored started receipts and payload do not rearm; late sent resolves unknown once', () => {
  const f = fixture(), { begin, consume } = f.start(); assert.equal(f.m.invokeProvider(), true);
  f.restore(); assert.equal(f.m.dispatch.connector.state, 'unknown');
  f.dispatch('chat', 'connector', begin); f.dispatch('connector', 'identity', consume);
  assert.equal(f.m.invokeProvider(), false); assert.equal(f.m.dispatch.providerEffects, 1);
  f.m.dispatch.transportResult('sent', 'synthetic-provider-1');
  const result = f.request('connector-result', { outcome: 'sent', provider_message_id: 'synthetic-provider-1' });
  f.dispatch('connector', 'chat', result); f.dispatch('connector', 'chat', result);
  assert.equal(f.m.dispatch.chat.state, 'sent'); assert.equal(f.m.dispatch.providerEffects, 1);
});

test('inbound received ACK is historical; lost ACK/process ACK plus restore create one message', () => {
  const f = fixture(); fails(() => f.run(f.accept, { loseAck: true }), 'ACK_LOST'); f.restore();
  const ack = f.run(f.accept); assert.equal(ack.state, 'received'); assert.equal(f.m.messageEffects, 0);
  const read = f.request('ingress-read', { receipt_id: ack.receipt_id }); assert.equal(f.run(read).state, 'received');
  fails(() => f.m.process(ack.receipt_id, { loseAck: true }), 'ACK_LOST'); f.restore();
  assert.equal(f.m.process(ack.receipt_id), 'processed'); assert.equal(f.run(f.accept).state, 'received');
  const receipt = f.run(read); assert.equal(receipt.state, 'processed'); assert.equal(receipt.conversation_id, f.b.conversation_id);
  assert.equal(f.m.messageEffects, 1); assert.equal(f.m.messages.size, 1);
  for (const field of ['text', 'intake', 'payload', 'session_id', 'external_subject_id']) assert.equal(field in receipt, false);
});

test('request, source delivery and event identities conflict independently', () => {
  const f = fixture(); const ack = f.run(f.accept);
  fails(() => f.run({ ...f.accept, source_delivery_id: randomUUID() }), 'CONFLICT');
  fails(() => f.run({ ...f.accept, request_id: randomUUID(), intake: { ...f.accept.intake, provider_event_id: 'other-event' } }), 'CONFLICT');
  fails(() => f.run({ ...f.accept, request_id: randomUUID(), source_delivery_id: randomUUID(), intake: { ...f.accept.intake, message: { type: 'text', text: 'changed' } } }), 'CONFLICT');
  const anotherSource = { ...f.accept, request_id: randomUUID(), source_delivery_id: randomUUID() };
  assert.equal(f.run(anotherSource).receipt_id, ack.receipt_id); assert.equal(f.m.inbox.size, 1); assert.equal(f.m.sources.size, 2);
});

test('UTC timestamp canonicalization deduplicates equivalent event bodies and rejects invalid calendar', () => {
  const f = fixture(), ack = f.run(f.accept);
  const request = { ...f.accept, request_id: randomUUID(), intake: { ...f.accept.intake, occurred_at: '2026-10-18T01:02:03.000Z' } };
  assert.equal(f.run(request).receipt_id, ack.receipt_id);
  fails(() => f.run({ ...request, request_id: randomUUID(), intake: { ...request.intake, occurred_at: '2026-02-30T01:02:03Z' } }), 'INVALID_REQUEST');
});

test('missing/stale/foreign Contact binding and CRM outage never create substitute Contact or inbox', () => {
  for (const [mutate, code] of [[m => { m.mapping = null; }, 'CONFLICT'], [m => { m.mapping.crm_contact_id = randomUUID(); }, 'CONFLICT'], [m => { m.mapping.tenant_id = randomUUID(); }, 'CONFLICT'], [m => m.unavailable.add('crm'), 'DEPENDENCY_UNAVAILABLE'], [m => { m.authority.contactActive = false; }, 'REVOKED']]) {
    const f = fixture(); mutate(f.m); fails(() => f.run(f.accept), code); assert.equal(f.m.inbox.size, 0); assert.equal(f.m.messageEffects, 0);
  }
});

test('mapping/contact revalidated before processing; transient outage remains received', () => {
  const f = fixture(), ack = f.run(f.accept); f.m.unavailable.add('crm');
  fails(() => f.m.process(ack.receipt_id), 'DEPENDENCY_UNAVAILABLE'); assert.equal(f.m.inbox.get(ack.receipt_id).state, 'received');
  f.m.unavailable.clear(); f.m.mapping.crm_identity_id = randomUUID();
  assert.equal(f.m.process(ack.receipt_id), 'failed'); assert.equal(f.m.inbox.get(ack.receipt_id).error_code, 'CONTACT_BINDING_STALE'); assert.equal(f.m.messageEffects, 0);
  const g = fixture(), second = g.run(g.accept); g.m.authority.contactActive = false; assert.equal(g.m.process(second.receipt_id), 'failed'); assert.equal(g.m.messageEffects, 0);
});

test('accept replay and receipt read require current contact and connection even after processing', () => {
  const f = fixture(), ack = f.run(f.accept); f.m.process(ack.receipt_id);
  const read = f.request('ingress-read', { receipt_id: ack.receipt_id });
  f.m.authority.connectionActive = false; fails(() => f.run(f.accept), 'REVOKED'); fails(() => f.run(read), 'REVOKED');
  f.m.authority.connectionActive = true;
  fails(() => f.run({ ...read, binding: { ...f.inbound, tenant_id: randomUUID() } }), 'NOT_FOUND');
  fails(() => f.run({ ...read, binding: { ...f.inbound, crm_contact_id: randomUUID() } }), 'CONFLICT');
  fails(() => f.run({ ...read, receipt_id: randomUUID() }), 'NOT_FOUND');
});

test('new event same message deduplicates; changed text/time conflicts without a second effect', () => {
  const f = fixture(), ack = f.run(f.accept); f.m.process(ack.receipt_id);
  for (const [patch, expected] of [[{ referral: { source: 'ctm', ad_id: 'synthetic-ad' } }, 'processed'], [{ message: { type: 'text', text: 'changed' } }, 'failed'], [{ occurred_at: '2026-10-18T01:02:04Z' }, 'failed']]) {
    const next = f.run({ ...f.accept, request_id: randomUUID(), source_delivery_id: randomUUID(), intake: { ...f.accept.intake, ...patch, provider_event_id: randomUUID() } });
    assert.equal(f.m.process(next.receipt_id), expected);
    const row = f.m.inbox.get(next.receipt_id);
    if (expected === 'processed') { assert.equal(row.duplicate, true); assert.equal(row.message_id, f.m.inbox.get(ack.receipt_id).message_id); }
    else assert.equal(row.error_code, 'MESSAGE_PAYLOAD_CONFLICT');
  }
  assert.equal(f.m.messageEffects, 1);
});

test('rich inbound preserves content/text_source; changed rich body for same message conflicts', () => {
  const f = fixture();
  const content = { version: 1, message_type: 'media', text: 'Synthetic extracted text', text_source: 'extracted', reply_to: { external_msg_id: 'synthetic-parent' }, attachment: { version: 1, kind: 'media', items: [{ media_type: 'image', external_media_id: 'synthetic-asset', name: null }] } };
  const request = { ...f.accept, intake: { ...f.accept.intake, message: { type: 'rich', content } } };
  const ack = f.run(request); f.m.process(ack.receipt_id);
  assert.deepEqual(f.m.inbox.get(ack.receipt_id).intake.message.content, content);
  const second = f.run({ ...request, request_id: randomUUID(), source_delivery_id: randomUUID(), intake: { ...request.intake, provider_event_id: randomUUID(), message: { type: 'rich', content: { ...content, text_source: 'preview' } } } });
  assert.equal(f.m.process(second.receipt_id), 'failed'); assert.equal(f.m.messageEffects, 1);
});

for (const prepared of [false, true]) test(`cancel ${prepared ? 'after' : 'before'} prepare blocks reordered staging/claim and survives ACK loss`, () => {
  const f = fixture(); if (prepared) { f.run(f.put); f.prepare(); }
  const proof = f.m.cancel('owner_changed');
  const read = f.request('cancellation-read', { cancellation_id: proof.cancellation_id }); assert.equal(f.run(read).state, 'cancelled');
  const notice = f.request('connector-cancel', { cancellation_id: proof.cancellation_id, reason: proof.reason });
  fails(() => f.run(notice, { loseAck: true }), 'ACK_LOST'); f.restore(); assert.equal(f.run(notice).state, 'cancelled');
  fails(() => f.run(f.put), 'INVALID_TRANSITION'); fails(f.prepare, 'INVALID_TRANSITION'); fails(f.claim, 'STALE_OWNER');
  assert.equal(f.m.dispatch.providerEffects, 0);
});

test('claim-before-cancel reports in flight, cannot forge cancellation or recall started/unknown', () => {
  const f = fixture(); f.start(); assert.equal(f.m.cancel('owner_changed').state, 'in_flight');
  fails(() => f.run(f.request('connector-cancel', { cancellation_id: randomUUID(), reason: 'owner_changed' })), 'NOT_FOUND');
  f.restore(); assert.equal(f.m.dispatch.connector.state, 'unknown'); assert.equal(f.m.invokeProvider(), false);
  f.dispatch('connector', 'chat', f.request('connector-result', { outcome: 'unknown', error_code: 'DELIVERY_UNKNOWN' }));
  assert.equal(f.m.cancel('conversation_closed').state, 'unknown'); assert.equal(f.m.dispatch.providerEffects, 0);
});

test('cancel cleanup survives sender revoke/binding disable, but proof outage and mismatches fail closed', () => {
  const f = fixture(); f.run(f.put); f.prepare(); const proof = f.m.cancel('authorization_revoked');
  f.m.dispatch.revoke(); f.m.dispatch.bindingActive = false;
  const request = f.request('connector-cancel', { cancellation_id: proof.cancellation_id, reason: proof.reason });
  f.m.unavailable.add('chat'); fails(() => f.run(request), 'DEPENDENCY_UNAVAILABLE'); assert.equal(f.m.cancelled, false);
  f.m.unavailable.clear(); fails(() => f.run({ ...request, reason: 'owner_changed' }), 'CONFLICT');
  assert.equal(f.run(request).state, 'cancelled'); assert.equal(f.m.dispatch.connector.state, 'cancelled');
});

test('returned receipt/payload copies cannot corrupt retained request and message state', () => {
  const f = fixture(); const put = clone(f.put); const staged = f.run(put); put.payload.message.text = 'mutated'; staged.state = 'sent';
  assert.equal(f.m.staged.payload.message.text, f.payload.message.text); assert.equal(f.run(f.put).state, 'staged');
  const ack = f.run(f.accept); f.m.process(ack.receipt_id); const read = f.request('ingress-read', { receipt_id: ack.receipt_id });
  const response = f.run(read); const originalId = response.message_id; response.message_id = randomUUID();
  assert.equal(f.run(read).message_id, originalId);
});
