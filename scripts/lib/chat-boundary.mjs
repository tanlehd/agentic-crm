import path from 'node:path';
import ts from 'typescript';

export const backendRoot = 'services/core-baseline/src/';
export const chatRoot = backendRoot + 'modules/conversation/';
const normalize = value => path.posix.normalize(value.replaceAll('\\', '/'));
const isChat = value => value.startsWith(chatRoot);
const isTest = value => /(?:^|\/)(?:tests|__tests__)\//.test(value) || /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(value);
const key = edge => JSON.stringify([edge.from, edge.to, edge.syntax, edge.bindings]);
const symbolKeys = edge => edge.bindings.map(binding => JSON.stringify([edge.from, edge.to, edge.syntax, binding]));
const order = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export function assertNoAliases(options) {
  if (options.baseUrl || Object.keys(options.paths ?? {}).length || options.rootDirs?.length) throw new Error('CHAT_BOUNDARY_ALIAS_CONFIG_UNSUPPORTED');
}

// Direct source dependencies, not a SQL/DI/transaction or permission analyzer.
export function inventoryChatBoundary(input) {
  const files = new Map();
  for (const [file, content] of input) {
    const normalized = normalize(file);
    if (files.has(normalized)) throw new Error('CHAT_BOUNDARY_DUPLICATE_PATH');
    files.set(normalized, content);
  }
  const edges = new Map();
  const resolve = (from, specifier) => {
    if (!specifier.startsWith('.')) return 'package:' + specifier;
    const target = normalize(path.posix.join(path.posix.dirname(from), specifier));
    const sourceTarget = target.replace(/\.js$/, '.ts').replace(/\.mjs$/, '.mts').replace(/\.cjs$/, '.cts').replace(/\.jsx$/, '.tsx');
    const candidates = [sourceTarget, target, ...['.ts', '.tsx', '.mts', '.cts', '/index.ts', '/index.tsx'].map(extension => target + extension)];
    const found = candidates.find(candidate => files.has(candidate));
    if (!found) throw new Error(`CHAT_BOUNDARY_UNRESOLVED: ${from} -> ${specifier}`);
    return found;
  };
  for (const [file, content] of [...files].sort(([a], [b]) => order(a, b))) {
    if (!file.startsWith(backendRoot) || !/\.[cm]?tsx?$/.test(file) || file.endsWith('.d.ts') || isTest(file)) continue;
    const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
    if (source.parseDiagnostics.length) throw new Error(`CHAT_BOUNDARY_PARSE_ERROR: ${file}`);
    const add = (specifier, syntax, bindings) => {
      if (!specifier || !ts.isStringLiteralLike(specifier)) throw new Error(`CHAT_BOUNDARY_DYNAMIC_PATH: ${file}`);
      const to = resolve(file, specifier.text);
      if (!isChat(file) && !isChat(to) || isChat(file) && isChat(to)) return;
      const edge = { from: file, to, syntax, bindings: [...new Set(bindings)].sort(order) };
      edges.set(key(edge), edge);
    };
    function visit(node) {
      if (ts.isImportDeclaration(node)) {
        const clause = node.importClause, bindings = [];
        if (!clause) bindings.push('side-effect');
        else {
          if (clause.name) bindings.push((clause.isTypeOnly ? 'type:' : 'value:') + 'default');
          if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) bindings.push((clause.isTypeOnly ? 'type:' : 'value:') + '*');
          else for (const element of clause.namedBindings?.elements ?? []) bindings.push((clause.isTypeOnly || element.isTypeOnly ? 'type:' : 'value:') + (element.propertyName ?? element.name).text);
        }
        add(node.moduleSpecifier, 'import', bindings);
      } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
        const prefix = node.isTypeOnly ? 'type:' : 'value:';
        const bindings = !node.exportClause || ts.isNamespaceExport(node.exportClause) ? [prefix + '*'] : node.exportClause.elements.map(element => (node.isTypeOnly || element.isTypeOnly ? 'type:' : 'value:') + (element.propertyName ?? element.name).text);
        add(node.moduleSpecifier, 'export', bindings);
      } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
        add(node.moduleReference.expression, 'import-equals', ['value:*']);
      } else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(node.expression) && node.expression.text === 'require')) {
        add(node.arguments[0], node.expression.kind === ts.SyntaxKind.ImportKeyword ? 'dynamic-import' : 'require', ['value:*']);
      } else if (ts.isImportTypeNode(node)) {
        add(ts.isLiteralTypeNode(node.argument) ? node.argument.literal : undefined, 'import-type', ['type:' + (node.qualifier?.getText(source) ?? '*')]);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return [...edges.values()].sort((a, b) => order(key(a), key(b)));
}

export function compareBoundary(actual, baseline) {
  if (baseline?.version !== 1 || baseline?.scope !== chatRoot || !Array.isArray(baseline.edges)) throw new Error('CHAT_BOUNDARY_INVALID_BASELINE');
  const accepted = new Set(), acceptedSymbols = new Set();
  for (const edge of baseline.edges) {
    if (!edge || Object.keys(edge).sort().join(',') !== 'bindings,from,syntax,to' || typeof edge.from !== 'string' || typeof edge.to !== 'string' || !['import', 'export', 'import-equals', 'dynamic-import', 'require', 'import-type'].includes(edge.syntax) || !Array.isArray(edge.bindings) || !edge.bindings.length || edge.bindings.some(binding => typeof binding !== 'string' || !binding)) throw new Error('CHAT_BOUNDARY_INVALID_BASELINE');
    if (normalize(edge.from) !== edge.from || normalize(edge.to) !== edge.to || !edge.from.startsWith(backendRoot) || isChat(edge.from) === isChat(edge.to) || edge.bindings.join('\n') !== [...new Set(edge.bindings)].sort(order).join('\n')) throw new Error('CHAT_BOUNDARY_INVALID_BASELINE');
    if (accepted.has(key(edge))) throw new Error('CHAT_BOUNDARY_DUPLICATE_EDGE');
    accepted.add(key(edge));
    for (const symbol of symbolKeys(edge)) acceptedSymbols.add(symbol);
  }
  const current = new Set(actual.flatMap(symbolKeys));
  return { added: actual.filter(edge => symbolKeys(edge).some(symbol => !acceptedSymbols.has(symbol))), removed: baseline.edges.filter(edge => symbolKeys(edge).some(symbol => !current.has(symbol))) };
}

export function boundarySummary(edges) {
  const groups = new Map();
  for (const edge of edges) {
    const direction = isChat(edge.from) ? 'outbound' : 'inbound';
    const peer = direction === 'outbound' ? edge.to : edge.from;
    const area = peer.startsWith('package:') ? peer : peer.replace(backendRoot, '').split('/').slice(0, 2).join('/');
    const name = direction + ' ' + area;
    groups.set(name, (groups.get(name) ?? 0) + 1);
  }
  return Object.fromEntries([...groups].sort(([a], [b]) => order(a, b)));
}

export function assertLegacyRetired(files,edges){
  for(const path of ['services/core-baseline/src/bootstrap.ts','services/core-baseline/src/owner-composition.ts','services/chat/src/composition.ts']){
    if(!files.get(path)?.trim())throw new Error('CHAT_BOUNDARY_INCOMPLETE_SOURCE');
  }
  if([...files.keys()].some(file=>file.startsWith(chatRoot)))throw new Error('CHAT_LEGACY_SOURCE_REINTRODUCED');
  if(edges.length)throw new Error('CHAT_LEGACY_DEPENDENCIES_REINTRODUCED');
}
