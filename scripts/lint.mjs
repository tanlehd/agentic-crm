import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { sourceFiles } from './source-files.mjs';

// Dependency-free foundation rules using the pinned TypeScript parser.
// Semantic type validation remains a separate gate.
const files = (await sourceFiles()).filter(p => /\.(?:[cm]?js|tsx?)$/.test(p) && !p.includes('/generated/') && !p.endsWith('.d.ts'));
const errors = [];
for (const file of files) {
  const text = await readFile(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const report = (node, message) => {
    const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
    errors.push(`${file}:${line + 1}: ${message}`);
  };
  for (const error of source.parseDiagnostics) errors.push(`${file}: ${ts.flattenDiagnosticMessageText(error.messageText, '\n')}`);
  function visit(node) {
    if (ts.isDebuggerStatement(node)) report(node, 'debugger is forbidden');
    if (ts.isVariableDeclarationList(node) && !(node.flags & ts.NodeFlags.BlockScoped)) report(node, 'Use const/let instead of var');
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'eval') report(node, 'eval is forbidden');
    if (file.includes('/domain/') && ts.isImportDeclaration(node) && /(?:@nestjs|apps\/web|\/http\/)/.test(node.moduleSpecifier.text)) report(node, 'Domain must not import transport/framework code');
    if (file.startsWith('services/') && ts.isImportDeclaration(node) && /(?:apps\/|@agentic-crm\/(?!contracts(?:$|\/)))/.test(node.moduleSpecifier.text)) report(node, 'Service must not import another application/domain implementation');
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (/^\s*\/\/\s*@ts-(?:ignore|nocheck)\b/m.test(text)) errors.push(`${file}: unchecked TypeScript suppression`);
}
if (errors.length) throw new Error(errors.join('\n'));
console.log(`PASS: foundation AST lint, ${files.length} JS/TS files.`);
