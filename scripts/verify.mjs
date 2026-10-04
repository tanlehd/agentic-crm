import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
process.chdir(fileURLToPath(root));
const manifest = JSON.parse(await readFile('infra/toolchain.json', 'utf8'));
if (process.versions.node !== manifest.node) throw new Error(`Use pinned Node ${manifest.node}; got ${process.versions.node}. Run pnpm verify:container.`);
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const version = spawnSync(pnpm, ['--version'], { encoding: 'utf8' });
if (version.status !== 0 || version.stdout.trim() !== manifest.pnpm) throw new Error(`Use pnpm ${manifest.pnpm}`);
const directory = process.env.VERIFY_ARTIFACT_DIR || 'artifacts/verify';
await mkdir(directory, { recursive: true });
const steps = ['lint', 'docs:check', 'schemas:check', 'contracts:check', 'test:scripts', 'test:unit', 'build', 'typecheck', 'test:smoke-api'];
const results = { node: process.versions.node, pnpm: manifest.pnpm, platform: process.platform, arch: process.arch, startedAt: new Date().toISOString(), steps: [] };
let failed = false;
for (const step of steps) {
  console.log(`\nVERIFY ${step}`);
  const start = Date.now();
  const result = spawnSync(pnpm, ['run', step], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } });
  const output = `${result.stdout || ''}${result.stderr || ''}${result.error?.message || ''}`;
  process.stdout.write(output);
  const log = `${step.replaceAll(':', '-')}.log`;
  await writeFile(`${directory}/${log}`, output);
  results.steps.push({ step, status: result.status === 0 ? 'PASS' : 'FAIL', durationMs: Date.now() - start, log });
  if (result.status !== 0) { failed = true; break; }
}
results.status = failed ? 'FAIL' : 'PASS';
results.finishedAt = new Date().toISOString();
await writeFile(`${directory}/summary.json`, JSON.stringify(results, null, 2) + '\n');
process.exitCode = failed ? 1 : 0;
