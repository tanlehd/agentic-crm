import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const skip = new Set(['node_modules', '.git', '.next', 'dist', '.cache', '.local', 'artifacts', 'coverage', '.pnpm-store']);
export async function sourceFiles(dir = '.') {
  const paths = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    if (skip.has(item.name) || item.isSymbolicLink()) continue;
    const path = join(dir, item.name);
    if (item.isDirectory()) paths.push(...await sourceFiles(path));
    else paths.push(path);
  }
  return paths.sort();
}
