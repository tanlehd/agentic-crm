import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { ownerBindingDigest, validateOwnerValue } from '../../packages/workload-transport/dist/index.js';

test('referral pin binds every source field while unpinned legacy digests remain stable', () => {
  const original = { operation: 'ingress-process', dependencies: [] };
  const pin = { id: randomUUID(), receipt_id: randomUUID(), provider_message_digest: 'a'.repeat(64), occurred_at: '2026-10-21T00:00:00.000Z', ad_id: 'ad', campaign_id: null };
  validateOwnerValue('OwnerIngressTouchpoint', pin);
  const b = { ...original, ingress_touchpoint: pin }, digest = ownerBindingDigest(b);
  assert.equal(ownerBindingDigest(original), ownerBindingDigest({ ...original, dependencies: [{ owner: 'connector' }] }));
  for (const key of Object.keys(pin)) assert.notEqual(digest, ownerBindingDigest({ ...b, ingress_touchpoint: { ...pin, [key]: 'changed' } }));
  assert.throws(() => validateOwnerValue('OwnerIngressTouchpoint', { ...pin, text: 'private' }), { code: 'INVALID_REQUEST' });
});

test('terminal referral proof and owner receipt reject extra transcript and incomplete IDs', () => {
  const result = { receipt_id: randomUUID(), state: 'processed', conversation_id: randomUUID(), message_id: randomUUID(), touchpoint_id: randomUUID(), session_id: null };
  validateOwnerValue('OwnerIngressResult', result);
  assert.throws(() => validateOwnerValue('OwnerIngressResult', { ...result, transcript: 'private' }), { code: 'INVALID_REQUEST' });
  assert.throws(() => validateOwnerValue('OwnerIngressResult', { ...result, message_id: undefined }), { code: 'INVALID_REQUEST' });
  const receipt = { id: result.touchpoint_id, command: { command_id: randomUUID(), binding_digest: 'a'.repeat(64) }, state: 'bound', conversation_id: result.conversation_id, message_id: result.message_id, session_id: null };
  validateOwnerValue('OwnerTouchpointReceipt', receipt);
  assert.throws(() => validateOwnerValue('OwnerTouchpointReceipt', { ...receipt, state: 'processed' }), { code: 'INVALID_REQUEST' });
});
