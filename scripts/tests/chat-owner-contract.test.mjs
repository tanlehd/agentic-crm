import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { AdmissionModel, CapacityModel, InboxModel, ChildEffectModel, ReferenceFenceModel, allowed, commandDigest, digest, ownerSchema, validateOwner, validateRequest, validateSnapshotVector } from '../lib/chat-owner-reference.mjs';

const catalog = JSON.parse(readFileSync(new URL('../../docs/architecture/chat-owner-operations.json', import.meta.url), 'utf8'));
const api = JSON.parse(readFileSync(new URL('../../docs/contracts/chat-owner.openapi.json', import.meta.url), 'utf8'));
const clone = structuredClone;
function fixture(kind = 'human') {
  const tenant = randomUUID(), principal = randomUUID();
  const resource = { resource_id: randomUUID(), object_key: 'conversation', record_version: '9007199254740993', owner_revision: '7', control_revision: '9', owner_principal_id: principal, team_id: randomUUID(), shared_team_ids: [], archived: false };
  const binding = { tenant_id: tenant, command_id: randomUUID(), owner: 'chat', operation: 'routing-assignment', actor: { kind, principal_id: principal, delegation_id: randomUUID() }, resource: clone(resource), target: { principal_id: randomUUID(), kind: 'human', team_id: resource.team_id }, session_id: randomUUID(), fields: ['owner_principal_id', 'team_id'], payload_digest: digest({ target: 'synthetic' }), legacy_receipt_key: '/api/v1/records/' + resource.resource_id + '/assignment:key', graph: null, dependencies: [] };
  const policy = { active: true, sessionActive: true, seat: true, kind, scope: 'own', teams: [resource.team_id], denied: [], targetEligible: true, parentGrant: true, messageGrant: true, appFields: binding.fields };
  const m = new AdmissionModel(tenant, resource, policy);
  return { tenant, resource, binding, policy, m, id: binding.command_id };
}
const fails = (fn, code) => assert.throws(fn, e => e.message === code);

test('CO-01 ingress reference pins bind every canonical identifier without exposing the subject', () => {
  const { binding, tenant } = fixture('service'), oldDigest = commandDigest(binding);
  const references = { connection_id: randomUUID(), crm_contact_id: randomUUID(), crm_identity_id: randomUUID(), external_subject_digest: digest('synthetic'),
    mapping_revision: '1', contact_revision: '9007199254740993', platform: 'mock_messenger', connection_revision: '1' };
  const pinned = { ...binding, operation: 'ingress-process', references };
  assert.equal(validateOwner('OwnerCommandBinding')(pinned), true);
  for (const field of ['connection_id', 'crm_contact_id', 'crm_identity_id']) assert.notEqual(commandDigest({ ...pinned, references: { ...references, [field]: randomUUID() } }), commandDigest(pinned));
  for (const patch of [{ external_subject_id: 'synthetic' }, { mapping_revision: '2' }, { platform: 'messenger' }, { connection_revision: '2' }]) assert.equal(validateOwner('OwnerCommandBinding')({ ...pinned, references: { ...references, ...patch } }), false);
  assert.equal(commandDigest(binding), oldDigest);
  const op = catalog.operations.find(o => o.key === 'crm-contact-binding-read');
  const request = { schema_version: 1, request_id: randomUUID(), correlation_id: randomUUID(), tenant_id: tenant, operation: op.name,
    payload: { connection_id: references.connection_id, crm_contact_id: references.crm_contact_id, crm_identity_id: references.crm_identity_id, external_subject_id: 'synthetic' } };
  validateRequest(op, { authenticated: true, service: 'chat', target: 'crm', tenants: [tenant] }, request);
  fails(() => validateRequest(op, { authenticated: true, service: 'connector', target: 'crm', tenants: [tenant] }, request), 'FORBIDDEN');
});

test('CO-09 metadata pin is immutable, optional for old commands and cannot supply field authority', () => {
  const { binding, tenant } = fixture();
  const oldDigest = commandDigest(binding);
  assert.equal(validateOwner('OwnerCommandBinding')(binding), true);
  const metadata = { object_type_id: randomUUID(), schema_revision: '9007199254740993', snapshot_digest: digest({ schema: 'synthetic' }) };
  const pinned = { ...binding, metadata };
  assert.equal(validateOwner('OwnerCommandBinding')(pinned), true);
  assert.notEqual(commandDigest(pinned), oldDigest);
  assert.notEqual(commandDigest({ ...pinned, metadata: { ...metadata, schema_revision: '9007199254740994' } }), commandDigest(pinned));
  assert.equal(validateOwner('OwnerCommandBinding')({ ...pinned, metadata: { ...metadata, writable: true } }), false);
  assert.equal(commandDigest(binding), oldDigest);
  const op = catalog.operations.find(o => o.key === 'crm-metadata-schema-read');
  const request = { schema_version: 1, request_id: randomUUID(), correlation_id: randomUUID(), tenant_id: tenant, operation: op.name, payload: { object_key: 'conversation', schema_revision: null } };
  validateRequest(op, { authenticated: true, service: 'chat', target: 'crm', tenants: [tenant] }, request);
  fails(() => validateRequest(op, { authenticated: true, service: 'bff', target: 'crm', tenants: [tenant] }, request), 'FORBIDDEN');
});

test('CO-16 every named schema compiles under strict Ajv and every operation has exact correlated DTOs', () => {
  for (const name of Object.keys(ownerSchema.definitions)) assert.equal(typeof validateOwner(name), 'function', name);
  assert.deepEqual([...new Set(catalog.operations.map(o => o.capability))].sort((a, b) => a - b), Array.from({ length: 16 }, (_, i) => i + 1));
  assert.equal(Object.keys(api.paths).length, catalog.operations.length);
  for (const o of catalog.operations) {
    const spec = api.paths[`/internal/v1/owners/${o.owner}/${o.name}`].post;
    assert.equal(spec.operationId, o.key); assert.ok(o.callers.length);
    for (const name of [o.input, o.output]) assert.equal(ownerSchema.definitions[name].additionalProperties, false);
    assert.equal(ownerSchema.definitions[o.input].properties.operation.const, o.name);
  }
  assert.equal(new Set(catalog.subscriptions.map(s => s.consumer)).size, 8);
  assert.equal(catalog.runtimeImplemented, false);
});

test('CO-01/16 wrong peer, tenant, operation, unknown keys and numeric revisions fail before effects', () => {
  const f = fixture(), op = catalog.operations.find(o => o.key === 'chat-command-proof');
  const q = { schema_version: 1, request_id: randomUUID(), correlation_id: randomUUID(), tenant_id: f.tenant, operation: op.name, payload: { command_id: f.id, binding_digest: commandDigest(f.binding) } };
  const peer = { authenticated: true, service: 'identity', target: 'chat', tenants: [f.tenant] };
  validateRequest(op, peer, q);
  fails(() => validateRequest(op, { ...peer, authenticated: false }, q), 'UNAUTHENTICATED');
  fails(() => validateRequest(op, { ...peer, service: 'bff' }, q), 'FORBIDDEN');
  fails(() => validateRequest(op, peer, { ...q, tenant_id: randomUUID() }), 'NOT_FOUND');
  for (const patch of [{ token: 'synthetic' }, { operation: 'command-abort' }, { payload: { ...q.payload, allowed: true } }]) fails(() => validateRequest(op, peer, { ...q, ...patch }), 'INVALID_REQUEST');
  assert.equal(validateOwner('OwnerCommandBinding')({ ...f.binding, resource: { ...f.resource, record_version: 9007199254740992 } }), false);
  assert.equal(f.m.state.effects, 0);
});

test('CO-04 revoke wins before admission; no TTL or permission snapshot can apply it', () => {
  const f = fixture(); f.m.prepare(f.binding); assert.equal(f.m.revoke(), 'completed');
  fails(() => f.m.admit(f.id), 'REVOKED'); fails(() => f.m.apply(f.id, { state: 'admitted' }), 'FORBIDDEN');
  assert.equal(f.m.state.effects, 0);
});
test('CO-04 admission wins: revoke closes new commands, waits terminal owner proof then completes', () => {
  const f = fixture(); f.m.prepare(f.binding); const a = clone(f.m.admit(f.id));
  assert.equal(f.m.revoke(), 'closing');
  const second = { ...f.binding, command_id: randomUUID() }; f.m.prepare(second); fails(() => f.m.admit(second.command_id), 'REVOKED');
  fails(() => f.m.settle(f.id), 'PENDING'); assert.equal(f.m.apply(f.id, a).state, 'committed');
  fails(() => f.m.settle(f.id, false), 'DEPENDENCY_UNAVAILABLE'); assert.equal(f.m.revoke(), 'closing');
  f.m.settle(f.id); assert.equal(f.m.revoke(), 'completed'); fails(() => f.m.replay(f.id), 'REVOKED');
});
test('CO-04 lost admission ACK/restart recovers the same command once, not a fresh grant', () => {
  const f = fixture(); f.m.prepare(f.binding); f.m.admit(f.id);
  const restarted = new AdmissionModel(f.tenant, f.resource, f.policy, f.m.state);
  const a = clone(restarted.admit(f.id)); restarted.apply(f.id, a); restarted.apply(f.id, a);
  assert.equal(restarted.state.effects, 1); restarted.settle(f.id); assert.equal(restarted.revoke(), 'completed');
});
test('CO-04 abort tombstone before delayed prepare and competing apply prevent resurrection', () => {
  const f = fixture(); f.m.abort(f.id, commandDigest(f.binding)); assert.equal(f.m.prepare(f.binding).state, 'aborted');
  fails(() => f.m.admit(f.id), 'INVALID_TRANSITION');
  const g = fixture(); g.m.prepare(g.binding); const a = clone(g.m.admit(g.id)); g.m.abort(g.id, commandDigest(g.binding));
  fails(() => g.m.apply(g.id, a), 'INVALID_TRANSITION'); g.m.settle(g.id); assert.equal(g.m.state.effects, 0);
});
test('CO-04 local owner/share/control CAS independently aborts an Identity-admitted stale operation', () => {
  for (const patch of [{ record_version: '9007199254740994' }, { owner_revision: '8' }, { control_revision: '10' }, { shared_team_ids: [randomUUID()] }, { archived: true }]) {
    const f = fixture(); f.m.prepare(f.binding); const a = clone(f.m.admit(f.id));
    assert.equal(f.m.apply(f.id, a, { ...f.resource, ...patch }).state, 'aborted'); assert.equal(f.m.state.effects, 0); f.m.settle(f.id);
  }
});
test('CO-04 request key binds actor/target/payload/graph and does not accept D2 grant-shaped data', () => {
  const f = fixture(); f.m.prepare(f.binding);
  for (const patch of [{ payload_digest: digest('different') }, { target: null }, { actor: { ...f.binding.actor, principal_id: randomUUID() } }, { operation: 'record-archive' }]) fails(() => f.m.prepare({ ...f.binding, ...patch }), 'CONFLICT');
  const a = clone(f.m.admit(f.id)); fails(() => f.m.apply(f.id, { ...a, grant_id: randomUUID() }), 'FORBIDDEN');
});
test('CO-02/07 current own/team scopes and field deny; super-admin exception is Human-only', () => {
  const f = fixture(); assert.equal(allowed(f.policy, f.binding), true);
  assert.equal(allowed({ ...f.policy, scope: 'team', teams: [] }, f.binding), false);
  assert.equal(allowed({ ...f.policy, denied: ['team_id'] }, f.binding), false);
  assert.equal(allowed({ ...f.policy, denied: ['team_id'], tenantAdmin: true, adminSeat: true }, f.binding), true);
  assert.equal(allowed({ ...f.policy, kind: 'ai', denied: ['team_id'], tenantAdmin: true, adminSeat: true }, f.binding), false);
  assert.equal(allowed({ ...f.policy, targetEligible: false }, f.binding), false);
});
test('CO-15 app must intersect parent/message selected-field grants; token revoke blocks replay', () => {
  const f = fixture('app'); assert.equal(allowed(f.policy, f.binding), true);
  for (const patch of [{ parentGrant: false }, { messageGrant: false }, { appFields: [] }, { sessionActive: false }]) assert.equal(allowed({ ...f.policy, ...patch }, f.binding), false);
  f.m.prepare(f.binding); const a = clone(f.m.admit(f.id)); f.m.apply(f.id, a); f.m.settle(f.id); f.m.revoke(); fails(() => f.m.replay(f.id), 'REVOKED');
});
test('CO-05 pending reservations consume capacity; no release on missing/unknown proof', () => {
  const c = new CapacityModel(), s = randomUUID(), p = randomUUID(); c.reserve('a', s, p, '8');
  fails(() => c.reserve('b', randomUUID(), p, '8'), 'CAPACITY');
  fails(() => c.release('a', null), 'PENDING');
  c.release('a', { key: 'a', session: s, state: 'aborted' }); c.reserve('b', randomUUID(), p, '8');
});
test('CO-05 lost confirmation ACK, same-owner assignment and delayed release preserve newest allocation', () => {
  const c = new CapacityModel(), s = randomUUID(), p = randomUUID();
  const a = c.reserve('a', s, p, '8'); c.confirm('a', { state: 'committed', binding: a.binding }); c.confirm('a', { state: 'committed', binding: a.binding });
  const b = c.reserve('b', s, p, '9'); c.confirm('b', { state: 'committed', binding: b.binding });
  c.release('a', { key: 'a', session: s, state: 'committed', revision: '9' });
  assert.equal(c.allocations.get(s).revision, '9'); c.confirm('a', { state: 'committed', binding: a.binding }); assert.equal(c.allocations.get(s).revision, '9');
  fails(() => c.release('b', { key: 'other', session: s, state: 'committed', revision: '10' }), 'INVALID_PROOF');
});
test('CO-11/12 note or context child effect lost ACK is reconciled once, parent cannot abort unknown child', () => {
  const f = fixture(); f.m.prepare(f.binding); f.m.admit(f.id); f.m.state.commands.get(f.id).childrenPending = 1;
  const c = new ChildEffectModel(), key = f.id + ':note:v1'; fails(() => c.create(key, digest('synthetic-note'), 'lost-ack'), 'TIMEOUT');
  fails(() => f.m.abort(f.id, commandDigest(f.binding)), 'CHILD_UNKNOWN'); fails(() => c.reconcile(key, false), 'DEPENDENCY_UNAVAILABLE');
  c.create(key, digest('synthetic-note')); c.reconcile(key); c.reconcile(key); assert.equal(c.effects.size, 1); assert.equal(c.references.size, 1);
  fails(() => c.create(key, digest('other')), 'CONFLICT');
});
function inboxFixture() {
  const tenant = randomUUID(), producer = 'crm', consumer = 'chat.activity.note.v1';
  const inbox = new InboxModel(tenant, producer, consumer), peer = { authenticated: true, service: producer };
  const notice = (n, event_id = randomUUID()) => ({ tenant_id: tenant, producer, consumer, event_id, stream_sequence: String(n), digest: digest({ event_id }) });
  return { inbox, peer, notice };
}
test('CO-16 consumer crash before commit vs lost ACK after effect; replay is exactly-once local effect', () => {
  const f = inboxFixture(), n = f.notice(1);
  fails(() => f.inbox.receive(f.peer, n, n.digest, 'before-commit'), 'CRASH'); assert.equal(f.inbox.rows.size, 0);
  fails(() => f.inbox.receive(f.peer, n, n.digest, 'lost-ack'), 'TIMEOUT'); assert.equal(f.inbox.receive(f.peer, n, n.digest), 'duplicate'); assert.equal(f.inbox.effects.length, 1);
});
test('CO-13/16 reordered business events wait for gap and source digest conflicts quarantine', () => {
  const f = inboxFixture(), a = f.notice(1), b = f.notice(2);
  assert.equal(f.inbox.receive(f.peer, b, b.digest), 'pending'); assert.equal(f.inbox.watermark, 0n);
  f.inbox.receive(f.peer, a, a.digest); assert.equal(f.inbox.receive(f.peer, b, b.digest), 'applied'); assert.deepEqual(f.inbox.effects, [a.event_id, b.event_id]);
  const changed = { ...b, digest: digest('changed') }; fails(() => f.inbox.receive(f.peer, changed, changed.digest), 'CONFLICT');
  assert.equal(f.inbox.rows.get(b.event_id).state, 'quarantined');
});
test('CO-11/13/16 broker/body identity cannot substitute producer or cross tenant/consumer', () => {
  const f = inboxFixture(), n = f.notice(1);
  fails(() => f.inbox.receive({ ...f.peer, service: 'workflow' }, n, n.digest), 'FORBIDDEN');
  for (const patch of [{ tenant_id: randomUUID() }, { consumer: 'workflow.starter.v1' }, { producer: 'chat' }]) fails(() => f.inbox.receive(f.peer, { ...n, ...patch }, n.digest), 'NOT_FOUND');
  fails(() => f.inbox.receive(f.peer, n, digest('not-the-source')), 'INVALID_PROOF'); assert.equal(f.inbox.effects.length, 0);
});
test('CO-07/08 eight Chat event schemas retain strict fields and reject transcript injection', () => {
  const f = fixture(), e = { event_id: randomUUID(), tenant_id: f.tenant, aggregate_id: f.resource.resource_id, aggregate_type: 'conversation', aggregate_version: '9', stream_sequence: '1', occurred_at: '2026-10-18T16:00:00Z', correlation_id: 'synthetic-legacy-correlation', causation_id: null, actor: { kind: 'human', id: f.binding.actor.principal_id }, producer: 'chat', consumer: 'chat.snooze.v1', event_type: 'chat.snooze.changed', schema_version: 1, data: { conversation_id: f.resource.resource_id, until: null, snooze_revision: '9', cause: 'assignment' } };
  assert.ok(validateOwner('OwnerChatEvent')(e)); assert.equal(validateOwner('OwnerChatEvent')({ ...e, data: { ...e.data, transcript: 'synthetic' } }), false);
  assert.equal(validateOwner('OwnerChatEvent')({ ...e, producer: 'crm' }), false);
});
test('CO-09/10 v1 thread and v2 conversation events coexist without rewriting immutable payload', () => {
  const f = fixture(), base = { event_id: randomUUID(), tenant_id: f.tenant, aggregate_id: randomUUID(), aggregate_type: 'conversation_need', aggregate_version: '1', stream_sequence: '1', occurred_at: '2026-10-18T16:00:00Z', correlation_id: 'synthetic-legacy-correlation', causation_id: null, actor: { kind: 'human', id: f.binding.actor.principal_id }, producer: 'chat', event_type: 'need.assessed' };
  const shared = { session_id: randomUUID(), need_id: base.aggregate_id, assessment_version: '1', contact_id: randomUUID(), connection_id: randomUUID() };
  const old = { ...base, schema_version: 1, data: { ...shared, thread_id: f.resource.resource_id } }, current = { ...base, schema_version: 2, data: { ...shared, conversation_id: f.resource.resource_id } };
  assert.ok(validateOwner('OwnerDomainEvent')(old)); assert.ok(validateOwner('OwnerDomainEvent')(current)); assert.equal(validateOwner('OwnerDomainEvent')({ ...old, schema_version: 2 }), false);
  assert.equal(old.data.thread_id, f.resource.resource_id);
});
test('CO-14 composite source vector rejects a concurrent owner write instead of mixed snapshot', () => {
  const p = [{ owner: 'chat', watermark: '9', digest: digest('chat') }, { owner: 'sales', watermark: '5', digest: digest('sales') }];
  assert.ok(validateSnapshotVector(p, clone(p))); fails(() => validateSnapshotVector(p, [p[0], { ...p[1], watermark: '6' }]), 'SNAPSHOT_CHANGED');
});
test('CO-02/14 source batch bounds/freshness are mandatory; no unbounded or arbitrary transcript fields', () => {
  const op = catalog.operations.find(o => o.key === 'chat-record-batch'), f = fixture();
  const q = { schema_version: 1, request_id: randomUUID(), correlation_id: randomUUID(), tenant_id: f.tenant, operation: op.name, actor: f.binding.actor, command_id: f.id, payload: { ids: [randomUUID()], page: { limit: 100, cursor: null, minimum_watermark: '0', fields: ['status'] } } };
  assert.ok(validateOwner(op.input)(q)); assert.equal(validateOwner(op.input)({ ...q, payload: { ...q.payload, ids: Array.from({ length: 101 }, randomUUID) } }), false);
  assert.equal(validateOwner('OwnerSnapshotRow')({ kind: 'need', id: randomUUID(), session_id: randomUUID(), created_at: '2026-10-18T16:00:00Z', transcript: 'synthetic' }), false);
});
test('CO-16 exhaustive admission/revoke/abort interleavings cannot create an effect after completed revoke', () => {
  function permutations(xs) { return xs.length ? xs.flatMap((x, i) => permutations(xs.filter((_, j) => i !== j)).map(p => [x, ...p])) : [[]]; }
  let count = 0;
  for (const order of permutations(['admit', 'apply', 'abort', 'settle', 'revoke'])) {
    const f = fixture(); f.m.prepare(f.binding); let a, completedAtEffects;
    for (const action of order) {
      try {
        if (action === 'admit') a = clone(f.m.admit(f.id));
        if (action === 'apply') f.m.apply(f.id, a);
        if (action === 'abort') f.m.abort(f.id, commandDigest(f.binding));
        if (action === 'settle') f.m.settle(f.id);
        if (action === 'revoke' && f.m.revoke() === 'completed') completedAtEffects = f.m.state.effects;
      } catch (e) { assert.match(e.message, /^(REVOKED|FORBIDDEN|INVALID_TRANSITION|PENDING)$/); }
      if (completedAtEffects !== undefined) assert.equal(f.m.state.effects, completedAtEffects);
      assert.ok(f.m.state.effects <= 1);
    }
    count++;
  }
  assert.equal(count, 120);
});

test('CO-01/11 Contact archive waits admitted use, rejects active thread, abort proof releases fence', () => {
  const r = new ReferenceFenceModel(); r.reserve('ingress'); assert.equal(r.retire(0), 'pending');
  fails(() => r.finishArchive('committed'), 'PENDING');
  fails(() => r.reserve('late-ingress'), 'REFERENCE_INVALID'); fails(() => r.settle('ingress', 'unknown'), 'PENDING');
  r.settle('ingress', 'committed'); assert.equal(r.retire(1), 'ACTIVE_DEPENDENCY'); r.finishArchive('aborted');
  r.reserve('next-ingress'); r.settle('next-ingress', 'aborted'); assert.equal(r.retire(0), 'guarded');
  r.finishArchive('committed'); fails(() => r.reserve('reopen'), 'REFERENCE_INVALID');
});
test('CO-10 outcome/recovery race has two explicit orders, never stale-negative recovery', () => {
  const first = new ReferenceFenceModel(); first.linkOutcome(); fails(() => first.reserve('recovery'), 'OUTCOME_EXISTS');
  assert.equal(first.recovered, false);
  const second = new ReferenceFenceModel(); second.reserve('recovery'); assert.equal(second.linkOutcome(), 'pending');
  second.recover('recovery'); assert.equal(second.linkOutcome(), 'linked'); assert.equal(second.recovered, true);
  fails(() => second.recover('recovery'), 'INVALID_TRANSITION');
});
