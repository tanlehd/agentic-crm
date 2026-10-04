import { readFile, access } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';

import { sourceFiles } from './source-files.mjs';
let links = 0;
const paths = (await sourceFiles()).filter(path => path.endsWith('.md'));
let jsonBlocks = 0; let diagrams = 0;
for (const path of paths) {
  const source = await readFile(path, 'utf8');
  if ((source.match(/^```/gm) ?? []).length % 2) throw new Error(`Unclosed fence: ${path}`);
  for (const [, language, body] of source.matchAll(/^```(\w*)[^\n]*\n([\s\S]*?)^```\s*$/gm)) {
    if (language === 'json') { JSON.parse(body); jsonBlocks++; }
    if (language === 'mermaid') {
      if (!/^(?:flowchart|graph|sequenceDiagram|erDiagram|stateDiagram-v2|classDiagram)\b/m.test(body)) throw new Error(`Unknown Mermaid diagram: ${path}`);
      diagrams++;
    }
  }
  for (const [, target] of source.matchAll(/\]\(([^)]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const file = target.split('#')[0];
    await access(resolve(dirname(path), file)).catch(() => { throw new Error(`Broken link ${path}: ${target}`); });
    links++;
  }
}
const text = await readFile('docs/tracking/tasks.md', 'utf8');
const tasks = new Map();
for (const line of text.split('\n').filter(line => /^\| SRC-\d{3} \|/.test(line))) {
  const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
  if (tasks.has(cells[0])) throw new Error(`Duplicate task ${cells[0]}`);
  tasks.set(cells[0], { deps: cells[2].match(/SRC-\d{3}/g) ?? [], status: cells[3] });
}
if (!tasks.size) throw new Error('No source tasks found');
const states = new Set(['TODO', 'READY', 'IN_PROGRESS', 'VERIFYING', 'DONE', 'BLOCKED', 'WAITING_DECISION', 'CANCELLED']);
for (const [id, task] of tasks) if (!states.has(task.status)) throw new Error(`Invalid task status: ${id}`);
if ([...tasks.values()].filter(t => ['IN_PROGRESS', 'VERIFYING'].includes(t.status)).length > 1) throw new Error('Multiple active source tasks');
const visiting = new Set(); const visited = new Set();
function visit(id) {
  if (visiting.has(id)) throw new Error(`Task cycle: ${id}`);
  if (visited.has(id)) return;
  const task = tasks.get(id);
  if (!task) throw new Error(`Unknown task ${id}`);
  visiting.add(id);
  for (const dep of task.deps) {
    visit(dep);
    if (['READY', 'IN_PROGRESS', 'VERIFYING', 'DONE'].includes(task.status) && tasks.get(dep).status !== 'DONE') throw new Error(`Unfinished dependency for ${id}: ${dep}`);
  }
  visiting.delete(id); visited.add(id);
}
for (const id of tasks.keys()) visit(id);
console.log(`PASS: ${paths.length} Markdown files, ${links} local links, ${jsonBlocks} JSON examples, ${diagrams} Mermaid headers (not rendered), ${tasks.size} acyclic source tasks (${relative(process.cwd(), resolve('.')) || '.'}).`);
