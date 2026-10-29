import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inventoryChatBoundary, compareBoundary, boundarySummary, chatRoot, assertNoAliases, assertLegacyRetired } from '../lib/chat-boundary.mjs';

const chat = chatRoot + 'domain.ts';
const crm = 'services/core-baseline/src/modules/crm/registry.ts';
const workflow = 'services/core-baseline/src/modules/workflow/run.ts';
const fixture = entries => new Map([[crm, 'export class RecordRegistry {}'], [workflow, 'export const run = 1;'], ...entries]);
const baseline = edges => ({ version: 1, scope: chatRoot, edges });

test('retirement rejects empty checkout, disconnected legacy source and legacy edges',()=>{
 const files=new Map(['services/core-baseline/src/bootstrap.ts','services/core-baseline/src/owner-composition.ts','services/chat/src/composition.ts'].map(p=>[p,'export const present=true;']));
 assert.doesNotThrow(()=>assertLegacyRetired(files,[]));
 assert.throws(()=>assertLegacyRetired(new Map(),[]),/INCOMPLETE_SOURCE/);
 assert.throws(()=>assertLegacyRetired(new Map([...files,[chat,'export {};']]),[]),/SOURCE_REINTRODUCED/);
 assert.throws(()=>assertLegacyRetired(files,[{}]),/DEPENDENCIES_REINTRODUCED/);
});

test('finds both inbound and outbound coupling; comments, local Chat and test files do not create edges', () => {
  const files = fixture([
    [chat, "import { RecordRegistry } from '../crm/registry.js'; import './local.js'; // import '../sales/secret.js';"],
    [chatRoot + 'local.ts', 'export const helper=1;'],
    [workflow, "import type { Conversation } from '../conversation/domain.js';"],
    [chatRoot + 'domain.test.ts', "import '../missing.js';"]
  ]);
  const edges = inventoryChatBoundary(files);
  assert.equal(edges.length, 2);
  assert.deepEqual(boundarySummary(edges), { 'inbound modules/workflow': 1, 'outbound modules/crm': 1 });
  assert.deepEqual(edges.find(edge => edge.from === workflow).bindings, ['type:Conversation']);
});

test('new module or symbol fails while removing a dependency or symbol remains allowed', () => {
  const old = inventoryChatBoundary(fixture([[chat, "import { RecordRegistry, Lookup } from '../crm/registry.js';"]]));
  const shrunk = inventoryChatBoundary(fixture([[chat, "import { RecordRegistry } from '../crm/registry.js';"]]));
  assert.equal(compareBoundary(shrunk, baseline(old)).added.length, 0);
  assert.equal(compareBoundary([], baseline(old)).removed.length, 1);
  const grown = inventoryChatBoundary(fixture([[chat, "import { RecordRegistry, Lookup, Mutate } from '../crm/registry.js';"]]));
  assert.equal(compareBoundary(grown, baseline(old)).added.length, 1);
  const changed = inventoryChatBoundary(fixture([[chat, "import { run } from '../workflow/run.js';"]]));
  assert.equal(compareBoundary(changed, baseline(old)).added.length, 1);
});

test('aliases and import ordering do not conceal or invent a new symbol dependency', () => {
  const before = inventoryChatBoundary(fixture([[chat, "import {B as localB,A} from '../crm/registry.js';"]]));
  const after = inventoryChatBoundary(fixture([[chat, "import { A as localA } from '../crm/registry.js'; import { B } from '../crm/registry.js';"]]));
  assert.equal(compareBoundary(after, baseline(before)).added.length, 0);
  assert.equal(compareBoundary(before, baseline(after)).added.length, 0);
});

test('captures re-exports, namespace, side-effect and default imports plus mixed type imports', () => {
  const edges = inventoryChatBoundary(fixture([[chat, `
    export { RecordRegistry as Registry } from '../crm/registry.js';
    export type { Shape } from '../crm/registry.js';
    export * as CRM from '../crm/registry.js';
    import * as Registry from '../crm/registry.js';
    import '../crm/registry.js';
    import Default, { type Shape, RecordRegistry } from '../crm/registry.js';
  `]]));
  const symbols = new Set(edges.flatMap(edge => edge.bindings));
  for (const symbol of ['value:RecordRegistry', 'type:Shape', 'value:*', 'side-effect', 'value:default']) assert.ok(symbols.has(symbol));
  assert.equal(edges.filter(edge => edge.syntax === 'export').length, 3);
});

test('detects literal dynamic imports, require and import-type syntax', () => {
  const edges = inventoryChatBoundary(fixture([[chat, `
    const a=import('../crm/registry.js'); const b=require('../crm/registry.js');
    type R=import('../crm/registry.js').RecordRegistry;
    import c = require('../crm/registry.js');
  `]]));
  assert.deepEqual(edges.map(edge => edge.syntax).sort(), ['dynamic-import', 'import-equals', 'import-type', 'require']);
});

test('rejects computed loader paths even outside Chat rather than silently missing an incoming dependency', () => {
  for (const code of ['import(target)', 'require(base + suffix)', 'import(`../${target}.js`)']) {
    assert.throws(() => inventoryChatBoundary(fixture([[workflow, code]])), /DYNAMIC_PATH/);
  }
});

test('normalizes Windows paths, source .js mapping and directory index deterministically', () => {
  const posix = fixture([[chat, "import { RecordRegistry } from '../crm/registry.js'; import '../crm/helpers';"], ['services/core-baseline/src/modules/crm/helpers/index.ts', 'export const x=1;']]);
  const windows = new Map([...posix].reverse().map(([file, code]) => [file.replaceAll('/', '\\'), code]));
  assert.deepEqual(inventoryChatBoundary(windows), inventoryChatBoundary(posix));
  assert.throws(() => inventoryChatBoundary(new Map([[chat, ''], [chat.replaceAll('/', '\\'), '']])), /DUPLICATE_PATH/);
});

test('missing relative source, malformed syntax and alias config fail closed', () => {
  assert.throws(() => inventoryChatBoundary(fixture([[chat, "import '../crm/missing.js';"]])), /UNRESOLVED/);
  assert.throws(() => inventoryChatBoundary(fixture([[chat, 'import {']])), /PARSE_ERROR/);
  for (const options of [{ baseUrl: '.' }, { paths: { '@app/*': ['src/*'] } }, { rootDirs: ['src', 'generated'] }]) assert.throws(() => assertNoAliases(options), /ALIAS_CONFIG/);
  assertNoAliases({ paths: {} });
});

test('outbound package dependencies are explicit; adding a package fails the same guard', () => {
  const before = inventoryChatBoundary(fixture([[chat, "import { randomUUID } from 'node:crypto';"]]));
  const after = inventoryChatBoundary(fixture([[chat, "import { randomUUID } from 'node:crypto'; import remote from '@company/domain';"]]));
  assert.equal(compareBoundary(after, baseline(before)).added[0].to, 'package:@company/domain');
});

test('baseline schema and duplicate edges cannot silently broaden or disable the guard', () => {
  const edges = inventoryChatBoundary(fixture([[chat, "import '../crm/registry.js';"]]));
  for (const value of [{}, { ...baseline(edges), version: 2 }, { ...baseline(edges), scope: 'apps/' }, baseline([{ ...edges[0], bindings: [] }]), baseline([{ ...edges[0], extra: 'wildcard' }])]) assert.throws(() => compareBoundary(edges, value), /INVALID_BASELINE/);
  assert.throws(() => compareBoundary(edges, baseline([...edges, ...edges])), /DUPLICATE_EDGE/);
  assert.equal(compareBoundary(edges, baseline(edges)).added.length, 0);
});
