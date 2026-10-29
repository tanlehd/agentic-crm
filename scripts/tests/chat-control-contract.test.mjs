import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { ChatControlOwners, ChatControlConsumer, checkedSnapshot, validateControl } from '../lib/chat-control-reference.mjs';

const fails = (fn, code) => assert.throws(fn, error => error.message === code);
const copy = value => structuredClone(value);
const inc = value => String(BigInt(value) + 1n);
function fixture(service = 'workflow', revision = '1', maxPending = 1000) {
  const s = { tenant_id: randomUUID(), conversation_id: randomUUID(), registry_revision: revision, record_version: '17', owner_revision: '7', control_revision: '1', pause_through_revision: '0', cancel_through_revision: '0', crm_contact_id: randomUUID(), crm_identity_id: randomUUID(), connection_id: randomUUID(), owner_principal_id: randomUUID(), owner_kind: 'ai', team_id: randomUUID(), shared_team_ids: [], active_session_id: randomUUID(), status: 'open', archived: false };
  const m = new ChatControlConsumer(s.tenant_id, s.conversation_id, service, maxPending), owner = new ChatControlOwners(s);
  const peer = { authenticated: true, service: 'chat', target: service, businessTenants: [s.tenant_id] };
  const job = (control_revision = '1', status = 'running') => ({ id: randomUUID(), tenant_id: s.tenant_id, conversation_id: s.conversation_id, control_revision, status });
  const event = snapshot => ({ schema_version: 1, event_type: 'chat.registry.changed.v1', producer: 'chat', event_id: randomUUID(), tenant_id: snapshot.tenant_id, conversation_id: snapshot.conversation_id, registry_revision: snapshot.registry_revision, occurred_at: '2026-10-18T12:00:00Z', correlation_id: randomUUID(), snapshot: copy(snapshot) });
  const notice = e => ({ schema_version: 1, event_id: e.event_id, tenant_id: e.tenant_id, conversation_id: e.conversation_id, registry_revision: e.registry_revision });
  const receive = (e, faults) => m.receive(peer, notice(e), e, faults);
  const next = (previous, patch = {}) => ({ ...copy(previous), registry_revision: inc(previous.registry_revision), record_version: inc(previous.record_version), ...patch });
  const pause = previous => next(previous, { control_revision: inc(previous.control_revision), pause_through_revision: previous.control_revision, owner_revision: inc(previous.owner_revision), owner_principal_id: randomUUID(), owner_kind: 'human' });
  const close = previous => next(previous, { control_revision: inc(previous.control_revision), cancel_through_revision: previous.control_revision, status: 'closed' });
  m.reconcile(peer, s);
  return { s, m, owner, peer, job, event, notice, receive, next, pause, close };
}

test('six OpenAPI reads have exact request/reply shapes and mTLS; event/notice are distinct', async () => {
  const api = JSON.parse(await readFile(new URL('../../docs/contracts/chat-control.openapi.json', import.meta.url), 'utf8'));
  assert.equal(Object.keys(api.paths).length, 6); assert.deepEqual(api.security, [{ workloadMTLS: [] }, { workloadLocalService: [], workloadLocalKey: [] }]); assert.equal(api.components.securitySchemes.workloadLocalKey.name, 'x-workload-key'); assert.equal(api.components.securitySchemes.workloadLocalService.name, 'x-workload-service');
  for (const [path, methods] of Object.entries(api.paths)) {
    assert.deepEqual(Object.keys(methods), ['post']); assert.equal(path.split('/').at(-1), methods.post.operationId);
    for (const ref of [methods.post.requestBody.content['application/json'].schema.$ref, methods.post.responses[200].content['application/json'].schema.$ref]) assert.ok(api.components.schemas[ref.split('/').at(-1)]);
  }
  const f = fixture(), e = f.event(f.s), notice = f.notice(e);
  assert.ok(validateControl('ChatControlEvent')(e)); assert.ok(validateControl('ChatControlNotice')(notice));
  assert.equal(validateControl('ChatControlNotice')({ ...notice, snapshot: f.s }), false);
});

test('strict snapshots reject text/permission injection, mixed owner nulls and invalid watermarks', () => {
  const f = fixture();
  for (const patch of [{ text: 'private' }, { authorized: true }, { control_revision: 1 }, { registry_revision: '0' }, { shared_team_ids: [f.s.team_id, f.s.team_id] }]) fails(() => checkedSnapshot({ ...f.s, ...patch }), 'INVALID_REQUEST');
  for (const patch of [{ owner_principal_id: null }, { owner_kind: null }, { pause_through_revision: '1' }, { cancel_through_revision: '2' }]) fails(() => checkedSnapshot({ ...f.s, ...patch }), 'CONFLICT');
  checkedSnapshot({ ...f.s, owner_principal_id: null, owner_kind: null });
});

test('registry read rechecks workload, tenant/current authority and minimum revision, never grants permissions', () => {
  const f = fixture(), request = { schema_version: 1, request_id: randomUUID(), operation: 'registry-read', tenant_id: f.s.tenant_id, conversation_id: f.s.conversation_id, minimum_revision: '1' };
  const peer = { ...f.peer, service: 'crm', target: 'chat' };
  assert.deepEqual(f.owner.execute(peer, request).snapshot, f.s);
  fails(() => f.owner.execute({ ...peer, authenticated: false }, request), 'UNAUTHENTICATED');
  fails(() => f.owner.execute({ ...peer, service: 'connector' }, request), 'FORBIDDEN');
  fails(() => f.owner.execute({ ...peer, businessTenants: [] }, request), 'NOT_FOUND');
  fails(() => f.owner.execute(peer, { ...request, minimum_revision: '2' }), 'DEPENDENCY_UNAVAILABLE');
  f.owner.unavailable.add('chat'); fails(() => f.owner.execute(peer, request), 'DEPENDENCY_UNAVAILABLE');
  f.owner.unavailable.clear(); f.owner.readAllowed = false; fails(() => f.owner.execute(peer, request), 'FORBIDDEN');
  assert.equal('permissions' in f.m.projection, false);
});

for (const [operation, target, fields] of [
  ['contact-check', 'crm', s => ({ connection_id: s.connection_id, crm_contact_id: s.crm_contact_id, crm_identity_id: s.crm_identity_id, external_subject_id: 'synthetic-subject', mapping_revision: '1' })],
  ['connection-check', 'connector', s => ({ connection_id: s.connection_id, platform: 'mock_messenger' })],
  ['principal-check', 'identity', s => ({ principal_id: s.owner_principal_id, kind: 'ai', team_id: s.team_id })],
  ['metadata-check', 'crm', () => ({ object_key: 'conversation', schema_revision: '8' })]
]) test(`${operation}: current owner checks immutable binding, revocation, absence and outage`, () => {
  const f = fixture(), binding = { tenant_id: f.s.tenant_id, ...fields(f.s) };
  const request = { schema_version: 1, request_id: randomUUID(), operation, ...binding }, peer = { ...f.peer, target };
  fails(() => f.owner.execute(peer, request), 'NOT_FOUND');
  f.owner.references.set(operation, { binding, active: true, revision: '8' });
  const result = f.owner.execute(peer, request); assert.equal(result.status, 'current'); assert.equal(result.observed_revision, '8');
  const field = Object.keys(binding).find(k => k !== 'tenant_id'), changed = { ...request, [field]: field === 'object_key' ? 'conversation' : randomUUID() };
  if (field === 'object_key') changed.schema_revision = '7';
  fails(() => f.owner.execute(peer, changed), 'CONFLICT');
  f.owner.references.get(operation).active = false; fails(() => f.owner.execute(peer, request), 'REVOKED');
  f.owner.unavailable.add(target); fails(() => f.owner.execute(peer, request), 'DEPENDENCY_UNAVAILABLE');
});

test('broker notice cannot substitute owner event or cross tenant/consumer identity', () => {
  const f = fixture(), e = f.event(f.next(f.s)); f.owner.events.set(e.event_id, e);
  const request = { schema_version: 1, request_id: randomUUID(), operation: 'event-read', notice: f.notice(e) };
  const ownerPeer = { ...f.peer, service: 'workflow', target: 'chat' };
  assert.deepEqual(f.owner.execute(ownerPeer, request).event, e);
  fails(() => f.owner.execute(ownerPeer, { ...request, notice: { ...request.notice, registry_revision: '3' } }), 'CONFLICT');
  fails(() => f.m.receive({ ...f.peer, service: 'broker' }, f.notice(e), e), 'FORBIDDEN');
  fails(() => f.m.receive({ ...f.peer, authenticated: false }, f.notice(e), e), 'UNAUTHENTICATED');
  fails(() => f.m.receive(f.peer, { ...f.notice(e), tenant_id: randomUUID() }, e), 'NOT_FOUND');
  assert.equal(f.m.inbox.size, 0);
});

test('revisions above 2^53 stay exact, equal conflicts and older events do not downgrade', () => {
  const f = fixture('crm', '9007199254740993'), newer = f.next(f.s), e = f.event(newer);
  assert.equal(f.receive(e).state, 'applied'); assert.equal(f.m.projection.registry_revision, '9007199254740994');
  assert.equal(f.receive(f.event(f.s)).state, 'stale'); assert.equal(f.m.projection.registry_revision, newer.registry_revision);
  assert.equal(f.receive(f.event({ ...newer, status: 'pending' })).state, 'quarantined'); assert.equal(f.m.ready, false);
});

test('snapshot semantic evolution rejects owner/close/session changes without generation fences', () => {
  const f = fixture();
  for (const patch of [{ owner_principal_id: randomUUID() }, { status: 'closed' }, { archived: true }, { active_session_id: randomUUID() }]) fails(() => checkedSnapshot(f.next(f.s, patch), f.s), 'CONFLICT');
  const paused = f.pause(f.s); checkedSnapshot(paused, f.s); checkedSnapshot(f.close(paused), paused);
  fails(() => checkedSnapshot({ ...paused, owner_revision: f.s.owner_revision }, f.s), 'CONFLICT');
  fails(() => checkedSnapshot({ ...paused, pause_through_revision: '0' }, f.s), 'CONFLICT');
  fails(() => checkedSnapshot({ ...paused, record_version: f.s.record_version }, f.s), 'CONFLICT');
  fails(() => checkedSnapshot(f.next(f.s, { owner_revision: inc(f.s.owner_revision) }), f.s), 'CONFLICT');
});

test('gap blocks new registration until owner snapshot covers all pending revisions', () => {
  const f = fixture(), r2 = f.pause(f.s), r3 = f.next(r2), e = f.event(r3);
  assert.equal(f.receive(e).state, 'pending'); assert.equal(f.m.minimumRevision(), '3');
  fails(() => f.m.registerJob(f.job()), 'NOT_READY'); fails(() => f.m.reconcile(f.peer, r2), 'DEPENDENCY_UNAVAILABLE');
  assert.equal(f.m.reconcile(f.peer, r3).state, 'ready'); assert.equal(f.m.pending.size, 0);
  assert.equal(f.receive(e).state, 'reconciled'); assert.equal(f.receive(f.event(r2)).state, 'stale');
});

test('repair cannot erase a cancellation seen in pending owner event or change same-revision image', () => {
  const f = fixture(), r2 = f.pause(f.s), r3 = f.close(r2); f.receive(f.event(r3));
  fails(() => f.m.reconcile(f.peer, { ...r3, cancel_through_revision: '0' }), 'CONFLICT');
  fails(() => f.m.reconcile(f.peer, { ...r3, registry_revision: '4', cancel_through_revision: '0' }), 'CONFLICT');
  assert.equal(f.m.ready, false); assert.equal(f.m.projection.registry_revision, '1');
});

for (const service of ['ai-runtime', 'workflow']) test(`${service}: pause/close cleanup is idempotent and leaves completed work intact`, () => {
  const f = fixture(service), running = f.job(), terminal = f.job('1', 'completed'); f.m.registerJob(running); f.m.registerJob(terminal);
  const paused = f.pause(f.s), e = f.event(paused); f.receive(e); f.receive(e);
  assert.equal(f.m.jobs.get(running.id).status, service === 'ai-runtime' ? 'cancelled' : 'paused_human');
  assert.equal(f.m.jobs.get(running.id).fence, 1); assert.equal(f.m.jobs.get(terminal.id).status, 'completed');
  const closed = f.close(paused); f.receive(f.event(closed));
  assert.equal(f.m.jobs.get(running.id).status, 'cancelled'); assert.equal(f.m.jobs.get(running.id).releases, service === 'ai-runtime' ? 1 : 0);
  assert.equal(f.m.jobs.get(terminal.id).fence, 0);
});

test('later pause carries previous close watermark; out-of-order close cannot be lost', () => {
  const f = fixture(), job = f.job(); f.m.registerJob(job);
  const closed = f.close(f.s), reopened = f.next(closed, { control_revision: '3', status: 'open' }), paused = f.pause(reopened);
  f.receive(f.event(paused)); f.m.reconcile(f.peer, paused);
  assert.equal(f.m.jobs.get(job.id).status, 'cancelled');
  f.receive(f.event(closed)); assert.equal(f.m.jobs.get(job.id).status, 'cancelled');
  const currentJob = f.job(paused.control_revision); f.m.registerJob(currentJob);
  f.receive(f.event(closed)); assert.equal(f.m.jobs.get(currentJob.id).status, 'running');
});

test('late registration of an old-generation job is fenced immediately; unknown future generation rejected', () => {
  const f = fixture('ai-runtime'), paused = f.pause(f.s); f.receive(f.event(paused));
  const late = f.job(); f.m.registerJob(late); assert.equal(f.m.jobs.get(late.id).status, 'cancelled'); assert.equal(f.m.jobs.get(late.id).releases, 1);
  fails(() => f.m.registerJob(f.job('3')), 'CONFLICT');
  fails(() => f.m.registerJob({ ...f.job(), tenant_id: randomUUID() }), 'NOT_FOUND');
});

test('archive tombstone blocks new jobs, survives restore and is not undone by old open events', () => {
  const f = fixture(), archived = f.next(f.s, { archived: true, control_revision: '2', cancel_through_revision: '1' }); f.receive(f.event(archived));
  fails(() => f.m.registerJob(f.job('2')), 'REVOKED');
  const restored = ChatControlConsumer.restore(JSON.parse(JSON.stringify(f.m.snapshot())));
  assert.equal(restored.ready, false); restored.reconcile(f.peer, archived);
  const old = f.event(f.s); restored.receive(f.peer, f.notice(old), old);
  assert.equal(restored.projection.archived, true);
});

test('crash before local commit redelivers; lost ACK after commit/restore never repeats cleanup', () => {
  const f = fixture('ai-runtime'), job = f.job(); f.m.registerJob(job); const paused = f.pause(f.s), e = f.event(paused);
  fails(() => f.receive(e, { crashBeforeCommit: true }), 'CRASH_BEFORE_COMMIT'); assert.equal(f.m.inbox.size, 0); assert.equal(f.m.jobs.get(job.id).status, 'running');
  fails(() => f.receive(e, { loseAck: true }), 'ACK_LOST'); assert.equal(f.m.jobs.get(job.id).releases, 1);
  const restored = ChatControlConsumer.restore(JSON.parse(JSON.stringify(f.m.snapshot())));
  assert.equal(restored.receive(f.peer, f.notice(e), e).state, 'applied'); assert.equal(restored.ready, false);
  restored.reconcile(f.peer, paused); assert.equal(restored.jobs.get(job.id).releases, 1); assert.equal(restored.jobs.get(job.id).fence, 1);
});

test('fresh consumer cannot initialize from stale queued event without owner snapshot', () => {
  const f = fixture(), fresh = new ChatControlConsumer(f.s.tenant_id, f.s.conversation_id, 'workflow'), old = f.event(f.s);
  assert.equal(fresh.receive(f.peer, f.notice(old), old).state, 'pending'); assert.equal(fresh.projection, null);
  const current = f.close(f.s); fresh.reconcile(f.peer, current); assert.equal(fresh.projection.status, 'closed');
});

test('unknown version, binding conflict and event ID reuse quarantine without business effect', () => {
  for (const mutate of [e => ({ ...e, schema_version: 2 }), e => ({ ...e, snapshot: { ...e.snapshot, tenant_id: randomUUID() } })]) {
    const f = fixture(), job = f.job(); f.m.registerJob(job); const e = f.event(f.pause(f.s));
    assert.equal(f.m.receive(f.peer, f.notice(e), mutate(e)).state, 'quarantined'); assert.equal(f.m.jobs.get(job.id).status, 'running');
    assert.equal(f.m.ready, false); assert.equal(f.m.quarantine.size, 1); assert.equal('snapshot' in [...f.m.quarantine.values()][0], false);
  }
  const f = fixture(), e = f.event(f.next(f.s)); f.receive(e);
  assert.equal(f.receive({ ...e, correlation_id: randomUUID() }).state, 'quarantined'); assert.equal(f.receive(e).state, 'quarantined');
  assert.equal(f.m.reconcile(f.peer, e.snapshot).state, 'attention');
});

test('counter regression is quarantined, not accepted as a new record revision', () => {
  const f = fixture(), paused = f.pause(f.s); f.receive(f.event(paused));
  const e = f.event(f.next(paused, { pause_through_revision: '0' }));
  assert.equal(f.receive(e).state, 'quarantined'); assert.equal(f.m.projection.pause_through_revision, '1');
});

test('pending backlog bound backpressures without ACK/receipt or partial commit', () => {
  const f = fixture('workflow', '1', 2);
  for (const registry_revision of ['3', '4']) assert.equal(f.receive(f.event({ ...f.s, registry_revision })).state, 'pending');
  const extra = f.event({ ...f.s, registry_revision: '5' }); fails(() => f.receive(extra), 'BACKPRESSURE');
  assert.equal(f.m.pending.size, 2); assert.equal(f.m.inbox.has(extra.event_id), false);
});

test('projection and owner replies are copied; consumer restarts preserve identity and pending work', () => {
  const f = fixture(), e = f.event(f.next(f.s)); f.receive(e); e.snapshot.status = 'closed'; assert.equal(f.m.projection.status, 'open');
  const pending = f.event({ ...f.m.projection, registry_revision: '4' }); f.receive(pending);
  const restored = ChatControlConsumer.restore(JSON.parse(JSON.stringify(f.m.snapshot())));
  assert.equal(restored.consumerId, 'workflow.chat-control.v1'); assert.equal(restored.pending.size, 1); assert.equal(restored.minimumRevision(), '4');
  const snap = copy(pending.snapshot); restored.reconcile(f.peer, snap); snap.status = 'closed'; assert.equal(restored.projection.status, 'open');
});
