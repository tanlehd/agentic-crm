import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { canonicalIngress, chatIngressRoutes } from '../../services/chat/dist/ingress.js';
import { ExchangeError, OwnerError, createWorkloadServer, workloadRequest, ownerBindingDigest } from '../../packages/workload-transport/dist/index.js';

const input = () => ({ schema_version: 1, operation: 'ingress-accept', request_id: randomUUID(),
  binding: { tenant_id: randomUUID(), connection_id: randomUUID(), crm_contact_id: randomUUID(), crm_identity_id: randomUUID(), mapping_revision: '1', platform: 'mock_messenger' },
  source_delivery_id: randomUUID(), intake: { provider_event_id: 'synthetic-event', provider_message_id: 'synthetic-message', external_subject_id: 'synthetic-subject', occurred_at: '2026-10-20T03:04:05Z', message: { type: 'text', text: 'Synthetic ingress' } } });

test('ingress canonical timestamp rejects calendar rollover and preserves immutable caller input', () => {
  const value = input(), normalized = canonicalIngress(value);
  assert.equal(normalized.intake.occurred_at, '2026-10-20T03:04:05.000Z');
  assert.equal(value.intake.occurred_at, '2026-10-20T03:04:05Z');
  for (const at of ['2026-02-30T01:00:00Z', '2026-10-20T24:00:00Z', '2026-10-20T03:04:05+00:00', '2026-10-20T03:04:05.0001Z']) {
    assert.throws(() => canonicalIngress({ ...value, intake: { ...value.intake, occurred_at: at } }), { code: 'INVALID_REQUEST' });
  }
  assert.equal(canonicalIngress({ ...value, intake: { ...value.intake, occurred_at: '2024-02-29T03:04:05.1Z' } }).intake.occurred_at, '2024-02-29T03:04:05.100Z');
});

test('ingress schema and normalized UTF-8 budget reject extra fields and overlarge intake', () => {
  const value = input();
  assert.throws(() => canonicalIngress({ ...value, actor_id: randomUUID() }), { code: 'INVALID_REQUEST' });
  assert.throws(() => canonicalIngress({ ...value, intake: { ...value.intake, message: { type: 'text', text: '中'.repeat(65536) } } }), { code: 'INVALID_REQUEST' });
});

test('channel authority pin participates in command digest without changing unpinned legacy bindings', () => {
  const original = { dependencies: [], operation: 'synthetic' };
  assert.equal(ownerBindingDigest(original), ownerBindingDigest({ ...original, dependencies: [{ owner: 'crm' }] }));
  const pinned = { ...original, ingress_channel: { channel_id: 'a', team_id: 'b', service_actor_id: 'c' } };
  for (const field of ['channel_id', 'team_id', 'service_actor_id']) assert.notEqual(ownerBindingDigest(pinned), ownerBindingDigest({ ...pinned, ingress_channel: { ...pinned.ingress_channel, [field]: 'changed' } }));
  assert.notEqual(ownerBindingDigest(original), ownerBindingDigest(pinned));
});

test('ingress HTTP routes enforce Connector caller, exact operation and approved minimized errors', async () => {
  const keys = Object.fromEntries(['chat', 'connector', 'routing'].map(service => [service, randomBytes(32).toString('hex')]));
  const material = service => ({ service, ca: '', cert: '', key: '', localHttp: keys });
  let failure = new ExchangeError('CONFLICT'), calls = 0;
  const routes = chatIngressRoutes({ accept: async () => { calls++; throw failure; }, read: async () => { calls++; throw failure; } });
  const server = createWorkloadServer(material('chat'), async () => {}, routes);
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const value = input(), url = new URL('http://127.0.0.1:' + server.address().port + '/internal/v1/chat-exchange/ingress-accept');
  const call = (service = 'connector', data = value) => workloadRequest(material(service), async () => {}, { url, expectedService: 'chat', tenant: value.binding.tenant_id, data });
  try {
    for (const [code, status] of [['CONFLICT', 409], ['REVOKED', 403], ['NOT_FOUND', 404], ['INVALID_TRANSITION', 409]]) {
      failure = new ExchangeError(code);
      await assert.rejects(call(), e => e instanceof ExchangeError && e.code === code && e.status === status);
    }
    failure = new OwnerError('REFERENCE_INVALID'); await assert.rejects(call(), { code: 'CONFLICT' });
    failure = Object.assign(new Error('private internal details'), { code: 'ER_UNKNOWN_ERROR' }); await assert.rejects(call(), { code: 'DEPENDENCY_UNAVAILABLE' });
    const before = calls;
    await assert.rejects(call('routing'), { code: 'FORBIDDEN' });
    await assert.rejects(call('connector', { ...value, operation: 'ingress-read' }), { code: 'INVALID_REQUEST' });
    assert.equal(calls, before);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
