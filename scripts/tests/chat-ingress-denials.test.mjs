import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { diagnoseIngress, diagnosableIngressError } from '../../services/chat/dist/ingress-denial.js';
import { OwnerError, ExchangeError, ownerDigest } from '../../packages/workload-transport/dist/index.js';

const binding = { tenant_id: randomUUID(), connection_id: randomUUID(), crm_contact_id: randomUUID(), crm_identity_id: randomUUID(), mapping_revision: '1', platform: 'mock_messenger' };
const actor = randomUUID(), team = randomUUID();
const reply = (tenant, owner, input, code = null) => ({ input_digest: ownerDigest({ tenant_id: tenant, ...input }), state: code ? 'denied' : 'valid', error_code: code, service_actor_id: !code && owner === 'connector' ? actor : null, team_id: !code && owner === 'connector' ? team : null });

test('only processing business-boundary errors trigger diagnosis, never transport-like or SQL failures', () => {
  for (const code of ['FORBIDDEN', 'REVOKED', 'REFERENCE_INVALID', 'STALE_VERSION', 'INVALID_TRANSITION']) assert(diagnosableIngressError(new OwnerError(code)));
  for (const code of ['DEPENDENCY_UNAVAILABLE', 'UNAUTHENTICATED', 'INVALID_REQUEST', 'NOT_FOUND', 'CONFLICT', 'PRECONDITION_REQUIRED']) assert.equal(diagnosableIngressError(new OwnerError(code)), false);
  assert.equal(diagnosableIngressError(Object.assign(new Error(), { code: 'FORBIDDEN' })), false);
  assert(diagnosableIngressError(new ExchangeError('REVOKED')));
});
test('canonical denial is tenant/input-bound and stops without inferring other owners', async () => {
  const calls = [];
  const denial = await diagnoseIngress(binding, 'Synthetic subject', async (t, owner, input) => { calls.push(owner); assert.equal(input.external_subject_digest, ownerDigest('Synthetic subject')); assert.equal(input.external_subject_id, undefined); return reply(t, owner, input, 'CONTACT_BINDING_STALE'); });
  assert.deepEqual(calls, ['crm']); assert.equal(denial.error_code, 'CONTACT_BINDING_STALE'); assert.equal(denial.owner, 'crm'); assert.equal(JSON.stringify(denial).includes('Synthetic'), false);
});
test('Identity diagnosis uses only current Channels actor/team; all valid stays retryable', async () => {
  for (const code of [null, 'REVOKED']) {
    const result = await diagnoseIngress(binding, 'Synthetic', async (t, owner, input) => { if (owner === 'identity') assert.deepEqual(input, { service_actor_id: actor, team_id: team }); return reply(t, owner, input, owner === 'identity' ? code : null); });
    assert.equal(result?.error_code ?? null, code);
  }
});
test('wrong scope, contradictory code and leaked actor/transcript reject diagnosis', async () => {
  for (const alter of [r => ({ ...r, input_digest: '0'.repeat(64) }), r => ({ ...r, state: 'denied', error_code: 'REVOKED' }), r => ({ ...r, service_actor_id: actor }), r => ({ ...r, text: 'private' }), r => ({ ...r, error_code: 'CONTACT_BINDING_STALE' })]) {
    await assert.rejects(diagnoseIngress(binding, 'Synthetic', async (t, owner, input) => alter(reply(t, owner, input))));
  }
});
test('owner outage or generic permission error stays unknown instead of a terminal verdict', async () => {
  for (const code of ['DEPENDENCY_UNAVAILABLE', 'FORBIDDEN', 'REVOKED']) await assert.rejects(diagnoseIngress(binding, 'Synthetic', async () => { throw new OwnerError(code); }), { code });
});
