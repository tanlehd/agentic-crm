import { readFile, writeFile, mkdir } from 'node:fs/promises';
import ts from 'typescript';
import { sourceFiles } from './source-files.mjs';
import { inventoryChatBoundary, compareBoundary, boundarySummary, assertNoAliases, assertLegacyRetired } from './lib/chat-boundary.mjs';

const mode = process.argv[2] ?? '--check';
if (!['--check', '--write-baseline'].includes(mode) || process.argv.length > 3) throw new Error('Use --check or explicitly reviewed --write-baseline');
const config = ts.getParsedCommandLineOfConfigFile('services/core-baseline/tsconfig.json', {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => { throw new Error('CHAT_BOUNDARY_CONFIG_ERROR'); } });
if (!config || config.errors.length) throw new Error('CHAT_BOUNDARY_CONFIG_ERROR');
assertNoAliases(config.options);
const files = new Map(await Promise.all((await sourceFiles()).filter(file => /\.(?:[cm]?[jt]sx?|json)$/.test(file)).map(async file => [file.replaceAll('\\', '/'), /\.[cm]?tsx?$/.test(file) ? await readFile(file, 'utf8') : ''])));
const edges = inventoryChatBoundary(files);
// T09 removed the legacy graph. An empty boundary is now required, but an
// incomplete checkout or a reintroduced disconnected module must still fail.
assertLegacyRetired(files,edges);
const baselineFile = 'docs/architecture/chat-dependencies.json';
if (mode === '--write-baseline') {
  throw new Error('CHAT_RETIRED_BASELINE_IS_HISTORICAL');
}
const changes = compareBoundary(edges, JSON.parse(await readFile(baselineFile, 'utf8')));
await mkdir('artifacts/chat-boundary', { recursive: true });
const report = { passed: changes.added.length === 0, edgeCount: edges.length, summary: boundarySummary(edges), ...changes };
await writeFile('artifacts/chat-boundary/summary.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ edgeCount: edges.length, summary: report.summary, added: changes.added.length, removed: changes.removed.length }, null, 2));
if (changes.added.length) throw new Error('CHAT_BOUNDARY_NEW_DEPENDENCIES: review artifacts/chat-boundary/summary.json against extraction contract');
console.log('PASS Chat boundary: legacy source and import graph absent. Main runtime cutover requires separate evidence.');
