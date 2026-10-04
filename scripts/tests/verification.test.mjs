import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, cp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('../../', import.meta.url);
async function fixture(run) {
  const directory = await mkdtemp(join(tmpdir(), 'crm-verify-'));
  try {
    await mkdir(join(directory, 'docs/tracking'), { recursive: true });
    await writeFile(join(directory, 'docs/tracking/tasks.md'), '| SRC-001 | test | — | DONE | Codex | gate | evidence |\n');
    await run(directory);
  } finally { await rm(directory, { recursive: true, force: true }); }
}
function invoke(script, cwd) {
  return spawnSync(process.execPath, [new URL(`scripts/${script}`, root).pathname], { cwd, encoding: 'utf8' });
}
test('docs gate rejects broken links, malformed JSON, invalid task states and unfinished dependencies', async () => {
  await fixture(async cwd => {
    assert.equal(invoke('check-docs.mjs', cwd).status, 0);
    for (const body of ['[bad](missing.md)', '```json\n{broken}\n```', '```mermaid\nunknownDiagram\n```', '```ts\nunclosed']) {
      await writeFile(join(cwd, 'README.md'), body);
      assert.notEqual(invoke('check-docs.mjs', cwd).status, 0, body);
    }
    await writeFile(join(cwd, 'README.md'), 'valid');
    for (const table of [
      '| SRC-001 | test | — | TYPO | x | x | x |',
      '| SRC-001 | test | SRC-002 | TODO | x | x | x |',
      '| SRC-001 | test | SRC-001 | TODO | x | x | x |',
      '| SRC-001 | test | — | TODO | x | x | x |\n| SRC-002 | test | SRC-001 | READY | x | x | x |',
    ]) {
      await writeFile(join(cwd, 'docs/tracking/tasks.md'), table);
      assert.notEqual(invoke('check-docs.mjs', cwd).status, 0, table);
    }
  });
});
test('strict schema gate rejects unknown keywords and duplicate IDs', async () => {
  await fixture(async cwd => {
    const dir = join(cwd, 'packages/contracts/schemas');
    await mkdir(dir, { recursive: true });
    const valid = { $schema: 'http://json-schema.org/draft-07/schema#', $id: 'urn:test:schema', type: 'object' };
    await writeFile(join(dir, 'one.json'), JSON.stringify(valid));
    assert.equal(invoke('check-schemas.mjs', cwd).status, 0);
    await writeFile(join(dir, 'one.json'), JSON.stringify({ ...valid, propertiesTypo: {} }));
    assert.notEqual(invoke('check-schemas.mjs', cwd).status, 0);
    await writeFile(join(dir, 'one.json'), JSON.stringify(valid));
    await writeFile(join(dir, 'two.json'), JSON.stringify(valid));
    assert.notEqual(invoke('check-schemas.mjs', cwd).status, 0);
  });
});
test('contract drift check fails without rewriting stale generated files', async () => {
  await fixture(async cwd => {
    await cp(new URL('packages/contracts', root), join(cwd, 'packages/contracts'), { recursive: true });
    assert.equal(invoke('generate-contracts.mjs', cwd).status, 0);
    const generated = join(cwd, 'packages/contracts/src/generated/health.ts');
    const stale = '// stale generated contract\n';
    await writeFile(generated, stale);
    const result = spawnSync(process.execPath, [new URL('scripts/generate-contracts.mjs', root).pathname, '--check'], { cwd, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Contract drift/);
    assert.equal(await readFile(generated, 'utf8'), stale);
  });
});
test('lint rejects debugger and var in source, while ignoring generated build output', async () => {
  await fixture(async cwd => {
    await writeFile(join(cwd, 'example.ts'), 'const value: number = 1;');
    await mkdir(join(cwd, 'dist'));
    await writeFile(join(cwd, 'dist/ignored.js'), 'var old = 1; debugger;');
    assert.equal(invoke('lint.mjs', cwd).status, 0);
    await writeFile(join(cwd, 'example.ts'), 'var value = 1; debugger;');
    const result = invoke('lint.mjs', cwd);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /debugger is forbidden/);
    assert.match(result.stderr, /Use const\/let/);
  });
});
