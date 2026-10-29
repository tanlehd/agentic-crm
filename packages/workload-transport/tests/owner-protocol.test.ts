import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { ownerCounter, nextOwnerCounter, ownerCanonical, ownerDigest, ownerBindingDigest, validateOwnerValue } from '../src/owner-protocol.js';
import type { OwnerCommandBinding } from '@agentic-crm/contracts';

describe('owner protocol safety boundaries', () => {
  it('preserves large counters and rejects uint64 overflow, exponent and fractional inputs', () => {
    expect(nextOwnerCounter('9007199254740993')).toBe('9007199254740994');
    expect(ownerCounter('18446744073709551615')).toBe('18446744073709551615');
    for (const value of ['18446744073709551616', '01', '1e2', '-1', '1.1', 1]) expect(() => ownerCounter(value)).toThrow('INVALID_REQUEST');
    expect(() => nextOwnerCounter('18446744073709551615')).toThrow('LIMIT_EXCEEDED');
    expect(() => ownerCounter('0', true)).toThrow('INVALID_REQUEST');
  });
  it('canonicalizes objects without changing array order or silently dropping values', () => {
    expect(ownerDigest({ b: 2, a: [1,2] })).toBe(ownerDigest({ a: [1,2], b: 2 }));
    expect(ownerDigest([1,2])).not.toBe(ownerDigest([2,1]));
    for (const value of [NaN, Infinity, undefined, { field: undefined }, new Date(), 1n]) expect(() => ownerCanonical(value)).toThrow('INVALID_REQUEST');
  });
  it('accepts only an exact aborted tombstone without fabricated resource or authority', () => {
    const tombstone = { command_id: randomUUID(), binding_digest: 'a'.repeat(64), state: 'aborted' };
    expect(validateOwnerValue('OwnerRecoveryProof', tombstone)).toEqual(tombstone);
    for (const extra of [{ state: 'committed' }, { allowed: true }, { binding: {} }]) expect(() => validateOwnerValue('OwnerRecoveryProof', { ...tombstone, ...extra })).toThrow('INVALID_REQUEST');
    expect(() => validateOwnerValue('OwnerAdmission', tombstone)).toThrow('INVALID_REQUEST');
  });
  it('excludes dependency receipts only; tenant and owner CAS stay digest-bound', () => {
    const b = { tenant_id: randomUUID(), command_id: randomUUID(), owner: 'chat', operation: 'routing-assignment',
      actor: { kind:'human', principal_id:randomUUID(), delegation_id:randomUUID() },
      resource: { resource_id:randomUUID(), object_key:'conversation', record_version:'1', owner_revision:'1', control_revision:'1', owner_principal_id:null, team_id:null, shared_team_ids:[], archived:false },
      target:null, session_id:null, fields:[], payload_digest:'b'.repeat(64), legacy_receipt_key:'route:key', graph:null, dependencies:[] } as OwnerCommandBinding;
    const digest = ownerBindingDigest(b);
    expect(ownerBindingDigest({ ...b, dependencies:[{ owner:'routing', receipt_id:randomUUID(), binding_digest:digest }] })).toBe(digest);
    expect(ownerBindingDigest({ ...b, tenant_id:randomUUID() })).not.toBe(digest);
    expect(ownerBindingDigest({ ...b, resource:{ ...b.resource, owner_revision:'2' } })).not.toBe(digest);
    expect(ownerBindingDigest({ ...b, payload_digest:'c'.repeat(64) })).not.toBe(digest);
  });
});
