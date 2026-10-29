// Read-only source/route-factory inventory. This never starts a server or certifies runtime parity.
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { sourceFiles } from './source-files.mjs';
import { chatScopeReview, reviewChatGaps } from './lib/chat-scope-review.mjs';
import { chatRecoverableOperations } from '../services/chat/dist/command-reconciliation.js';
import { chatSubscriptions } from '../services/chat/dist/event-store.js';

const out = 'artifacts/chat-extraction/t06-delivery', root = 'services/chat/src/';
const catalog = JSON.parse(await readFile('docs/architecture/chat-owner-operations.json', 'utf8'));
const dictionary = JSON.parse(await readFile('services/chat/migrations/dictionary.json', 'utf8'));
const review = JSON.parse(await readFile('docs/architecture/chat-storage-review.json', 'utf8'));
const boundary = JSON.parse(await readFile('artifacts/chat-boundary/summary.json', 'utf8'));
const baseline = JSON.parse(await readFile('docs/architecture/chat-dependencies.json', 'utf8'));
const removed = new Set(boundary.removed.map(e => JSON.stringify(e)));
const hashes = {}, handlers = [], failures = [];
for (const file of (await readdir(root)).filter(f => f.endsWith('.ts')).sort()) {
  hashes[root + file] = createHash('sha256').update(await readFile(root + file)).digest('hex');
  if (!(await readFile(root + file, 'utf8')).match(/export function chat\w*Routes\(/)) continue;
  const exports = await import('../services/chat/dist/' + file.replace(/\.ts$/, '.js'));
  for (const [factory, fn] of Object.entries(exports).filter(([name]) => /^chat\w*Routes$/.test(name))) {
    try {
      const routes = fn(); // Route declarations close over handlers; never invoke a request or dependency.
      for (const [path, route] of Object.entries(routes)) handlers.push({ operation: path.split('/').at(-1), source: root + file, factory, path, callers: route.callers });
    } catch (error) { failures.push({ source: root + file, factory, error: error.message }); }
  }
}
if (failures.length) throw new Error('Uninspected route factories: ' + JSON.stringify(failures));
const registered = new Set(handlers.map(h => h.operation));
const scopeReview = reviewChatGaps(catalog, registered);
for (const file of new Set(chatScopeReview.flatMap(row => row.evidence))) {
  hashes[file] = createHash('sha256').update(await readFile(file)).digest('hex');
}
const chatTables = new Set(dictionary.tables.map(t => t.name)), partition = new Set(review.owners.partition);
const oldSql = [];
for (const file of (await sourceFiles()).map(f=>f.replaceAll('\\','/')).filter(f => f.startsWith('services/core-baseline/src/') && f.endsWith('.ts') && !f.includes('/tests/')).sort()) {
  const text = await readFile(file, 'utf8');
  const tables = new Set();
  for (const m of text.matchAll(/\b(?:FROM|JOIN|UPDATE|INTO)\s+`?([a-z][a-z0-9_]*)/gi)) if (chatTables.has(m[1])) tables.add(m[1]);
  if (!tables.size) continue;
  oldSql.push({ source: file, sha256: createHash('sha256').update(text).digest('hex'), ownTables: [...tables].filter(t => !partition.has(t)).sort(), partitionTables: [...tables].filter(t => partition.has(t)).sort() });
}
const report = { scope: 'Static candidate factories and conservative baseline SQL/import candidate list; no main mount or grant/fence acceptance. Dynamic SQL needs the T02 manual review.',
  handlers, ...scopeReview, scopeReviewReference: 'docs/planning/chat-extraction/remaining-boundaries.md / CHG-20261024-05',
  recoveryOperations: [...new Set(chatRecoverableOperations)].sort(), outgoingSubscriptions: chatSubscriptions,
  inboundLegacyDependencies: baseline.edges.filter(e => !removed.has(JSON.stringify(e)) && !e.from.startsWith('services/core-baseline/src/modules/conversation/') && e.to.startsWith('services/core-baseline/src/modules/conversation/')),
  oldSql, hashes };
await mkdir(out, { recursive: true }); await writeFile(out + '/runtime-inventory.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ candidateOperations: registered.size, registrations: handlers.length,
  unmountedCatalogEntries: scopeReview.unmountedCatalogEntries.length, boundaryReviewGroups: scopeReview.boundaryReviewGroups,
  dispositions: Object.fromEntries([...new Set(scopeReview.unmountedCatalogEntries.map(o => o.disposition))].map(d => [d, scopeReview.unmountedCatalogEntries.filter(o => o.disposition === d).length])),
  recoveryOperations: report.recoveryOperations.length, baselineSqlCandidateFiles: oldSql.length, legacyInboundEdges: report.inboundLegacyDependencies.length }, null, 2));
