import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { DispatchReference, validateDispatch, canonical } from '../lib/dispatch-reference.mjs';

const binding = () => ({ tenant_id: randomUUID(), conversation_id: randomUUID(), crm_contact_id: randomUUID(), connection_id: randomUUID(), intent_id: randomUUID(), attempt_id: randomUUID(), principal_id: randomUUID(), delegation_id: randomUUID(), actor_kind: 'human', owner_revision: '9007199254740993', record_version: '17', payload_digest: 'a'.repeat(64) });
function fixture(actor = 'human', configure = () => {}) {
  const b = { ...binding(), actor_kind: actor }, m = new DispatchReference(b);
  configure(m);
  const req = (operation, extra = {}) => ({ schema_version: 1, operation, request_id: randomUUID(), binding: structuredClone(b), ...(operation === 'identity-issue' ? { resource_context: structuredClone(m.resource) } : {}), ...extra });
  const peer = (service, target) => ({ authenticated: true, service, target, businessTenants: [b.tenant_id] });
  const run = (service, target, request, options) => m.execute(peer(service, target), request, options);
  const issueRequest = req('identity-issue');
  const issue = run('chat', 'identity', issueRequest);
  const prepareRequest = req('connector-prepare', { grant_id: issue.grant_id });
  const claimRequest = req('chat-claim', { grant_id: issue.grant_id });
  const prepare = () => run('chat', 'connector', prepareRequest);
  const claim = () => run('connector', 'chat', claimRequest);
  const ready = () => {
    prepare(); const c = claim();
    const begin = req('connector-begin', { grant_id: issue.grant_id, claim_id: c.claim_id });
    run('chat', 'connector', begin);
    const consume = req('identity-consume', { grant_id: issue.grant_id, claim_id: c.claim_id, fence_id: m.connector.fence });
    return { begin, consume, claim: c };
  };
  return { b, m, req, peer, run, issueRequest, issue, prepare, claim, ready };
}
const fails = (fn, code) => assert.throws(fn, error => error.message === code);

test('wire schema rejects extra fields, unsupported actor/version and malformed binding', () => {
  const f = fixture(), valid = f.req('identity-issue'); assert.ok(validateDispatch('DispatchRequest')(valid));
  const bad = [
    { ...valid, schema_version: 2 }, { ...valid, text: 'must not cross control protocol' },
    ...[{ actor_kind: 'service' }, { tenant_id: '' }, { owner_revision: 1 }, { owner_revision: '0' }, { payload_digest: 'A'.repeat(64) }, { principal_id: 'not-a-uuid' }].map(patch => ({ ...valid, binding: { ...valid.binding, ...patch } }))
  ];
  for (const request of bad) assert.equal(validateDispatch('DispatchRequest')(request), false);
  assert.equal(validateDispatch('DispatchReply')({ schema_version: 1, request_id: randomUUID(), receipt_id: randomUUID(), state: 'sent' }), false);
  assert.equal(validateDispatch('DispatchRequest')(f.req('connector-result', { outcome: 'sent', provider_message_id: 'p', error_code: 'DELIVERY_UNKNOWN' })), false);
});

test('seven legacy operations plus dedicated proof use matching exact schemas and workload mTLS', async () => {
  const api = JSON.parse(await readFile(new URL('../../docs/contracts/chat-dispatch.openapi.json', import.meta.url), 'utf8'));
  assert.equal(Object.keys(api.paths).length, 8); assert.equal(api.components.securitySchemes.workloadMTLS.type, 'mutualTLS');
  assert.equal(api.paths['/internal/v1/dispatch/chat-claim-proof'].post.responses[200].content['application/json'].schema.$ref,'#/components/schemas/ChatClaimProofReply');
  assert.deepEqual(api.security, [{ workloadMTLS: [] }, { workloadLocalService: [], workloadLocalKey: [] }]); assert.equal(api.components.securitySchemes.workloadLocalKey.name, 'x-workload-key'); assert.equal(api.components.securitySchemes.workloadLocalService.name, 'x-workload-service');
  for (const [path, methods] of Object.entries(api.paths)) {
    assert.deepEqual(Object.keys(methods), ['post']); assert.equal(path.split('/').at(-1), methods.post.operationId);
    const definition = methods.post.requestBody.content['application/json'].schema.$ref.split('/').at(-1);
    assert.ok(api.components.schemas[definition]);
  }
});

test('stable proof is separate from the legacy minimized claimed reply',()=>{
 const f=fixture(),claim=f.claim(),request=f.req('chat-claim-proof',{claim_id:claim.claim_id});
 assert.equal(validateDispatch('ChatClaimProofRead')(request),true);assert.equal(validateDispatch('DispatchRequest')(request),false);
 const reply={schema_version:1,request_id:request.request_id,receipt_id:claim.claim_id,state:'claimed',claim_id:claim.claim_id,grant_id:f.issue.grant_id,binding:f.b,resource_context:f.m.resource};
 assert.equal(validateDispatch('ChatClaimProofReply')(reply),true);assert.equal(validateDispatch('DispatchReply')(reply),false);assert.equal(validateDispatch('DispatchReply')(claim),true);
 for(const value of [{...reply,session:'synthetic'}, {...reply,resource_context:{...reply.resource_context,shared_team_ids:[f.b.tenant_id,f.b.tenant_id]}}, {...reply,grant_id:'bad'}])assert.equal(validateDispatch('ChatClaimProofReply')(value),false);
});

test('peer authentication, audience, tenant and every immutable binding field are checked', () => {
  const f = fixture(), request = f.req('identity-issue'), caller = f.peer('chat', 'identity');
  fails(() => f.m.execute({ ...caller, authenticated: false }, request), 'UNAUTHENTICATED');
  fails(() => f.m.execute({ ...caller, service: 'connector' }, request), 'FORBIDDEN');
  fails(() => f.m.execute({ ...caller, target: 'chat' }, request), 'FORBIDDEN');
  fails(() => f.m.execute({ ...caller, businessTenants: [] }, request), 'NOT_FOUND');
  for (const field of Object.keys(f.b)) {
    const value = field === 'actor_kind' ? 'ai' : ['owner_revision', 'record_version'].includes(field) ? '2' : field === 'payload_digest' ? 'b'.repeat(64) : randomUUID();
    const changed = { ...request, request_id: randomUUID(), binding: { ...f.b, [field]: value } };
    fails(() => f.m.execute(caller, changed), field === 'tenant_id' ? 'NOT_FOUND' : 'CONFLICT');
  }
});

test('canonical replay accepts property reordering, conflicts on payload change and rechecks read rights', () => {
  const f = fixture();
  const reordered = Object.fromEntries(Object.entries(f.issueRequest).reverse());
  assert.equal(canonical(reordered), canonical(f.issueRequest));
  assert.deepEqual(f.run('chat', 'identity', reordered), f.issue);
  assert.equal(f.m.grants.size, 1);
  fails(() => f.run('chat', 'identity', { ...f.issueRequest, binding: { ...f.b, payload_digest: 'b'.repeat(64) } }), 'CONFLICT');
  f.m.readAllowed = false; fails(() => f.run('chat', 'identity', f.issueRequest), 'FORBIDDEN');
});

for (const actor of ['human', 'ai']) test(`${actor}: duplicate begin/consume/invoke gives one simulated transport effect`, () => {
  const f = fixture(actor), r = f.ready();
  const consumed = f.run('connector', 'identity', r.consume);
  assert.deepEqual(f.run('connector', 'identity', r.consume), consumed);
  f.run('chat', 'connector', r.begin); f.run('chat', 'connector', { ...r.begin, request_id: randomUUID() });
  f.m.start(); assert.equal(f.m.invokeProvider(), true); assert.equal(f.m.invokeProvider(), false);
  f.m.transportResult('sent', 'provider-1');
  const result = f.req('connector-result', { outcome: 'sent', provider_message_id: 'provider-1' });
  f.run('connector', 'chat', result); f.run('connector', 'chat', result);
  assert.equal(f.m.providerEffects, 1); assert.equal(f.m.chat.state, 'sent');
});

test('takeover before claim blocks; takeover after claim remains in flight and cannot cancel it', () => {
  const before = fixture(); before.prepare(); before.m.takeover(); fails(before.claim, 'STALE_OWNER'); assert.equal(before.m.chat.state, 'cancelled');
  const after = fixture(), r = after.ready(); after.m.takeover(); after.run('connector', 'identity', r.consume); after.m.start();
  assert.equal(after.m.invokeProvider(), true); assert.equal(after.m.owner.revision, '9007199254740994');
});

test('revocation before consume blocks; revocation after consume leaves that one admission in flight', () => {
  const before = fixture(), a = before.ready(); before.m.revoke(); fails(() => before.run('connector', 'identity', a.consume), 'REVOKED');
  fails(() => before.m.start(), 'INVALID_TRANSITION'); assert.equal(before.m.providerEffects, 0);
  const after = fixture(), b = after.ready(); after.run('connector', 'identity', b.consume); after.m.revoke(); after.m.start();
  assert.equal(after.m.invokeProvider(), true); assert.equal(after.m.invokeProvider(), false);
  assert.equal(after.m.grants.get(after.issue.grant_id).state, 'consumed');
});

test('revoked native delegation and changed auth revision never reuse issuance as permission', () => {
  for (const change of [m => { m.auth.delegationActive = false; }, m => { m.auth.revision = '2'; }]) {
    const f = fixture(), r = f.ready(); change(f.m); fails(() => f.run('connector', 'identity', r.consume), 'REVOKED'); assert.equal(f.m.providerEffects, 0);
  }
});

test('binding disable before start blocks; after start it cannot recall an in-flight operation', () => {
  const a = fixture(), ar = a.ready(); a.run('connector', 'identity', ar.consume); a.m.bindingActive = false;
  fails(() => a.m.start(), 'REVOKED'); assert.equal(a.m.invokeProvider(), false);
  const b = fixture(), br = b.ready(); b.run('connector', 'identity', br.consume); b.m.start(); b.m.bindingActive = false;
  assert.equal(b.m.invokeProvider(), true);
});

test('grant TTL and local deadline reject exact expiry boundaries', () => {
  const ttl = fixture(), t = ttl.ready(); ttl.m.now = 10000; fails(() => ttl.run('connector', 'identity', t.consume), 'EXPIRED');
  const local = fixture(), l = local.ready(); local.m.now = 4999; local.run('connector', 'identity', l.consume); local.m.now = 5000;
  fails(() => local.m.start(), 'EXPIRED'); assert.equal(local.m.invokeProvider(), false);
  const io = fixture(), i = io.ready(); io.run('connector', 'identity', i.consume); io.m.start(); io.m.now = 5000;
  assert.equal(io.m.invokeProvider(), false); assert.equal(io.m.connector.state, 'unknown');
});

test('authority outage fails closed and does not turn transient failure into permanent replay rejection', () => {
  const f = fixture(), r = f.ready();
  for (const authority of ['identity', 'chat']) {
    f.m.unavailable.add(authority); fails(() => f.run('connector', 'identity', r.consume), 'DEPENDENCY_UNAVAILABLE');
    assert.equal(f.m.grants.get(f.issue.grant_id).state, 'issued'); f.m.unavailable.delete(authority);
  }
  f.run('connector', 'identity', r.consume); f.m.start(); assert.equal(f.m.invokeProvider(), true);
});

test('lost consume ACK is historical consumption, never a fresh send permission on replay', () => {
  const f = fixture(), r = f.ready(); fails(() => f.run('connector', 'identity', r.consume, { loseAck: true }), 'ACK_LOST');
  assert.equal(f.run('connector', 'identity', r.consume).state, 'consumed');
  assert.equal(f.run('connector', 'identity', { ...r.consume, request_id: randomUUID() }).state, 'consumed');
  f.m.abortBegin(); assert.equal(f.m.connector.state, 'unknown');
  fails(() => f.m.start(), 'INVALID_TRANSITION'); assert.equal(f.m.providerEffects, 0);
});

test('different consume fence or claim cannot reuse an admitted grant', () => {
  const f = fixture(), r = f.ready(); f.run('connector', 'identity', r.consume);
  for (const field of ['fence_id', 'claim_id']) fails(() => f.run('connector', 'identity', { ...r.consume, request_id: randomUUID(), [field]: randomUUID() }), 'CONFLICT');
});

for (const point of ['admitting', 'consumed', 'started', 'effect']) test(`restore after ${point} never reconstructs volatile invoke permission`, () => {
  const f = fixture(), r = f.ready();
  if (point !== 'admitting') f.run('connector', 'identity', r.consume);
  if (['started', 'effect'].includes(point)) f.m.start();
  if (point === 'effect') f.m.invokeProvider();
  const restored = DispatchReference.restore(JSON.parse(JSON.stringify(f.m.snapshot())));
  assert.equal(restored.connector.state, 'unknown');
  restored.execute(f.peer('chat', 'connector'), r.begin);
  assert.equal(restored.invokeProvider(), false); fails(() => restored.start(), 'INVALID_TRANSITION');
  assert.equal(restored.providerEffects, point === 'effect' ? 1 : 0);
});

test('unknown reconciles only to stable sent; negative lookup and stale/conflicting callbacks cannot retry/downgrade', () => {
  const f = fixture(), r = f.ready(); f.run('connector', 'identity', r.consume); f.m.start(); f.m.invokeProvider(); f.m.transportResult('unknown');
  f.run('connector', 'chat', f.req('connector-result', { outcome: 'unknown', error_code: 'DELIVERY_UNKNOWN' }));
  fails(() => f.m.transportResult('not-found'), 'INVALID_TRANSITION'); assert.equal(f.m.connector.state, 'unknown');
  f.m.transportResult('sent', 'provider-1'); f.run('connector', 'chat', f.req('connector-result', { outcome: 'sent', provider_message_id: 'provider-1' }));
  f.run('connector', 'chat', f.req('connector-result', { outcome: 'unknown', error_code: 'DELIVERY_UNKNOWN' })); assert.equal(f.m.chat.state, 'sent');
  fails(() => f.run('connector', 'chat', f.req('connector-result', { outcome: 'sent', provider_message_id: 'provider-2' })), 'CONFLICT');
  const stale = f.req('connector-result', { outcome: 'sent', provider_message_id: 'provider-1' }); stale.binding.attempt_id = randomUUID();
  fails(() => f.run('connector', 'chat', stale), 'CONFLICT'); assert.equal(f.m.providerEffects, 1);
});

test('receipt reads are owner-bound current observations, not cached capability or an expiry reset', () => {
  const f = fixture(); const read = f.req('receipt-read', { receipt_id: f.issue.grant_id });
  assert.equal(f.run('chat', 'identity', read).state, 'issued'); f.m.now = 10000;
  assert.equal(f.run('chat', 'identity', read).state, 'expired');
  fails(() => f.run('chat', 'connector', read), 'NOT_FOUND');
  f.m.readAllowed = false; fails(() => f.run('chat', 'identity', read), 'FORBIDDEN');
});

test('Chat claim rejects changed record/team/share context and Identity rejects mismatched owner context', () => {
  for (const change of [m => { m.resource.record_version = '18'; }, m => { m.resource.team_id = randomUUID(); }, m => { m.resource.shared_team_ids = [randomUUID()]; }]) {
    const f = fixture(); f.prepare(); change(f.m); fails(f.claim, 'STALE_OWNER');
  }
  const f = fixture(), request = f.req('identity-issue'); request.resource_context.owner_principal_id = randomUUID();
  fails(() => f.run('chat', 'identity', request), 'CONFLICT');
});

test('current team membership, seat and text policy are rechecked against admitted resource facts', () => {
  const team = randomUUID();
  const setup = m => { m.resource.shared_team_ids = [team]; m.auth.readScope = 'team'; m.auth.replyScope = 'team'; m.auth.teamIds = [team]; };
  const allowed = fixture('human', setup), a = allowed.ready(); allowed.run('connector', 'identity', a.consume); allowed.m.start(); assert.equal(allowed.m.invokeProvider(), true);
  for (const change of [m => { m.auth.teamIds = []; }, m => { m.auth.chatSeat = false; }, m => { m.auth.textRead = false; }, m => { m.auth.textWrite = false; }]) {
    const denied = fixture('human', setup), r = denied.ready(); change(denied.m);
    fails(() => denied.run('connector', 'identity', r.consume), 'REVOKED'); assert.equal(denied.m.providerEffects, 0);
  }
});

test('wire reply mutation cannot change the durable resource snapshot or replay receipt', () => {
  const f = fixture(), r = f.ready(), reply = f.run('connector', 'identity', r.consume);
  reply.resource_context.shared_team_ids.push(randomUUID());
  const replay = f.run('connector', 'identity', r.consume);
  assert.deepEqual(replay.resource_context.shared_team_ids, []);
  assert.deepEqual(f.m.grants.get(f.issue.grant_id).resource.shared_team_ids, []);
});

test('49 ordered takeover/revoke interleavings respect both authority boundaries and at-most-one simulated effect', () => {
  for (let takeover = 0; takeover <= 6; takeover++) for (let revoke = 0; revoke <= 6; revoke++) {
    const f = fixture(); let claim;
    const actions = [f.prepare, () => { claim = f.claim(); },
      () => f.run('chat', 'connector', f.req('connector-begin', { grant_id: f.issue.grant_id, claim_id: claim.claim_id })),
      () => f.run('connector', 'identity', f.req('identity-consume', { grant_id: f.issue.grant_id, claim_id: claim.claim_id, fence_id: f.m.connector.fence })),
      () => f.m.start(), () => f.m.invokeProvider()];
    for (let step = 0; step <= 6; step++) {
      if (step === takeover) f.m.takeover(); if (step === revoke) f.m.revoke();
      if (step === 6) break;
      try { actions[step](); } catch (error) { assert.ok(['STALE_OWNER', 'REVOKED'].includes(error.message)); break; }
    }
    assert.equal(f.m.providerEffects, takeover >= 2 && revoke >= 4 ? 1 : 0, `takeover=${takeover}, revoke=${revoke}`);
    assert.equal(f.m.invokeProvider(), false);
  }
});
