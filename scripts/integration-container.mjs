import { spawnSync } from 'node:child_process';
// Compile the production services used by crash/restart children before testing.
for (const args of [
  ['--filter', '@agentic-crm/contracts', 'build'],
  ['--filter', '@agentic-crm/backend', 'build'],
  ['exec', 'vitest', 'run', 'apps/backend/tests/database.integration.test.ts', '--testNamePattern', process.env.TEST_CASE_FILTER || '.'],
]) {
  const result = spawnSync('pnpm', args, { stdio: 'inherit' });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
