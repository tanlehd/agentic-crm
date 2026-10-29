// Scope review, not runtime acceptance. New catalog gaps require explicit triage.
export const chatScopeReview = [
  { operations: ['recover-need'], disposition: 'other-owner', owner: 'workflow', evidence: ['docs/services/workflow.md', 'docs/planning/chat-extraction/consumer-handoff.md', 'services/core-baseline/src/modules/workflow/engine.ts'], note: 'Workflow follow-up implementation and acceptance belong to Workflow. No dedicated recover-need endpoint gates Chat. Fence old direct Chat writes at cutover; preserve existing authorized Chat commands and events.' },
  { operations: ['contribution-apply'], disposition: 'not-required', evidence: ['docs/contracts/chat-sales-conversion-boundary.md', 'services/core-baseline/src/modules/sales/conversion-port.ts', 'services/reporting/src/conversion-catalog.ts'], note: 'CHG-20261024-01: Sales lineage determines conversion; no reverse outcome mirror gate. Preserve historical rows and fence the old direct Chat write at cutover.' },
  { operations: ['snapshot-prepare', 'snapshot-validate', 'snapshot-page', 'snapshot-release', 'routing-facts', 'conversion-facts', 'stage-facts', 'progress-facts'], disposition: 'other-owner', owner: 'reporting', evidence: ['docs/services/reporting.md', 'docs/services/chat.md', 'services/core-baseline/src/modules/reporting/conversion-source.ts', 'services/core-baseline/src/modules/reporting/stage-source.ts'], note: 'Reporting source acquisition, projection/snapshot/facts and composition are accepted by Reporting. Chat persists attribution and publishes its authorized domain API/events; dedicated reporting endpoints are not Chat gates. No cross-service SQL access.' },
  { operations: ['record-batch'], disposition: 'other-owner', owner: 'reporting', evidence: ['services/core-baseline/src/modules/crm/conversion-metadata-port.ts', 'services/chat/src/generic-record.ts', 'docs/services/reporting.md'], note: 'The reviewed registry caller serves composite reporting; its adapter/projection is Reporting acceptance, not a separate Chat gate. No private batch caller requires a new endpoint. Existing generic Conversation reads/writes remain Chat-owned; no stale registry or cross-service SQL fallback.' },
  { operations: ['external-conversations', 'external-conversations-id', 'external-conversations-id-messages', 'external-conversations-id-messages-messageId'], group: 'external-reads', disposition: 'chat-boundary', evidence: ['services/core-baseline/src/modules/external-api/service.ts', 'services/core-baseline/src/gateway/chat-external-read.ts'] },
  { operations: ['agent-context', 'inbound-next', 'prompt-submit'], disposition: 'ai-deferred', evidence: ['docs/planning/human-first-omni-crm.md'] },
  { operations: ['record-archive', 'contact-archive-guard'], disposition: 'archive-removed', evidence: ['docs/contracts/legacy-record-archive.md'] },
  { operations: ['routing-active'], disposition: 'superseded', replacement: 'routing-sync-snapshot', evidence: ['docs/contracts/chat-routing-reconciliation.md'] },
];

export function reviewChatGaps(catalog, registered, review = chatScopeReview) {
  const chat = catalog.operations.filter(o => o.owner === 'chat'), names = new Set(chat.map(o => o.name));
  const decisions = new Map();
  for (const row of review) for (const operation of row.operations) {
    if (!names.has(operation)) throw new Error('Unknown reviewed Chat operation: ' + operation);
    if (decisions.has(operation)) throw new Error('Duplicate Chat scope decision: ' + operation);
    if (row.replacement && !registered.has(row.replacement)) throw new Error('Missing superseding route: ' + row.replacement);
    decisions.set(operation, row);
  }
  const unreviewed = [], unmountedCatalogEntries = chat.filter(o => !registered.has(o.name)).map(o => {
    const row = decisions.get(o.name);
    if (!row) { unreviewed.push(o.name); return null; }
    const { operations: _operations, ...decision } = row;
    return { operation: o.name, capability: o.capability, callers: o.callers, ...decision };
  }).filter(Boolean);
  if (unreviewed.length) throw new Error('Unreviewed Chat catalog entries (not automatic implementation gates): ' + unreviewed.join(', '));
  const boundaryReviewGroups = [...new Set(unmountedCatalogEntries.map(o => o.group).filter(Boolean))].map(group => ({
    group, acceptance: 'OPEN; source review only, no runtime acceptance',
    operations: unmountedCatalogEntries.filter(o => o.group === group).map(o => ({ operation: o.operation, disposition: o.disposition })),
  }));
  return { unmountedCatalogEntries, boundaryReviewGroups };
}
