import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
const flags=process.argv.slice(2);
if (flags.length>1||flags.some(arg => !['--healthcare','--workspace'].includes(arg))) throw new Error('Usage: integration.mjs [--healthcare|--workspace]');
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const env = { ...process.env, TEST_CASE_FILTER: flags.includes('--healthcare') ? 'SRC-023 healthcare fixture' : flags.includes('--workspace') ? 'workspace read foundation' : '.', MYSQL_ROOT_PASSWORD: randomBytes(32).toString('hex'), MYSQL_PASSWORD: randomBytes(32).toString('hex') };
const args = ['compose','-p',`agentic-crm-kernel-test-${process.pid}`,'-f','compose.integration.yaml'];
let status = 1;
try {
  const run = spawnSync('docker',[...args,'up','--build','--abort-on-container-exit','--exit-code-from','test'],{stdio:'inherit', env});
  if (run.error) throw run.error;
  status=run.status ?? 1;
} finally {
  const cleanup = spawnSync('docker',[...args,'down'],{stdio:'inherit', env});
  if (cleanup.status !== 0) status=1;
}
process.exit(status);
