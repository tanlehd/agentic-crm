import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chatScopeReview, reviewChatGaps } from '../lib/chat-scope-review.mjs';

const catalog = JSON.parse(readFileSync(new URL('../../docs/architecture/chat-owner-operations.json', import.meta.url), 'utf8'));
const reviewed = new Set(chatScopeReview.flatMap(row => row.operations));
const registered = new Set(catalog.operations.filter(o => o.owner === 'chat' && !reviewed.has(o.name)).map(o => o.name));

test('reporting snapshots, facts and registry adapters do not gate Chat acceptance', () => {
  const result = reviewChatGaps(catalog, registered);
  const reporting = result.unmountedCatalogEntries.filter(o => o.owner === 'reporting');
  assert.equal(reporting.length, 9);
  for (const row of reporting) {
    assert.equal(row.disposition, 'other-owner');
    assert.equal(row.group, undefined);
  }
  assert.deepEqual(result.boundaryReviewGroups.map(g => g.group), ['external-reads']);
  assert.match(reporting.find(o => o.operation === 'snapshot-prepare').note, /Chat persists attribution/);
  assert.match(reporting.find(o => o.operation === 'record-batch').note, /Existing generic Conversation reads\/writes remain Chat-owned/);
});

test('a catalog addition requires triage instead of silently becoming an implementation gate', () => {
  const changed = structuredClone(catalog);
  changed.operations.push({ owner: 'chat', name: 'synthetic-new-operation', callers: ['crm'], capability: 15 });
  assert.throws(() => reviewChatGaps(changed, registered), /Unreviewed Chat catalog entries.*synthetic-new-operation/);
});

test('superseded operation cannot hide a missing replacement', () => {
  const missing = new Set(registered); missing.delete('routing-sync-snapshot');
  assert.throws(() => reviewChatGaps(catalog, missing), /Missing superseding route: routing-sync-snapshot/);
});

test('new candidate registration removes only its gap, not other open obligations', () => {
  const mounted = new Set(registered); mounted.add('recover-need');
  const result = reviewChatGaps(catalog, mounted);
  assert.equal(result.unmountedCatalogEntries.some(o => o.operation === 'recover-need'), false);
  assert.equal(result.boundaryReviewGroups.some(g => g.group === 'external-reads'), true);
  assert.equal(result.unmountedCatalogEntries.some(o => o.operation === 'agent-context' && o.disposition === 'ai-deferred'), true);
});

test('Sales outcome mirror is not a Chat acceptance gate; source lineage remains documented', () => {
  const result = reviewChatGaps(catalog, registered);
  const mirror = result.unmountedCatalogEntries.find(o => o.operation === 'contribution-apply');
  assert.equal(mirror.disposition, 'not-required');
  assert.equal(mirror.group, undefined);
  assert.match(mirror.note, /fence the old direct Chat write/);
  assert.equal(result.boundaryReviewGroups.some(g => g.operations.some(o => o.operation === 'contribution-apply')), false);
});

test('review rejects stale and conflicting decisions', () => {
  assert.throws(() => reviewChatGaps(catalog, registered, [...chatScopeReview, chatScopeReview[0]]), /Duplicate Chat scope decision/);
  assert.throws(() => reviewChatGaps(catalog, registered, [...chatScopeReview, { operations: ['synthetic-unknown'] }]), /Unknown reviewed Chat operation/);
});

test('Workflow recovery cannot become a Chat feature gate; old direct writes still require fencing', () => {
  const result = reviewChatGaps(catalog, registered);
  const recovery = result.unmountedCatalogEntries.find(o => o.operation === 'recover-need');
  assert.equal(recovery.disposition, 'other-owner');
  assert.equal(recovery.owner, 'workflow');
  assert.equal(recovery.group, undefined);
  assert.match(recovery.note, /Fence old direct Chat writes/);
  assert.equal(result.boundaryReviewGroups.some(g => g.operations.some(o => o.operation === 'recover-need')), false);
});
