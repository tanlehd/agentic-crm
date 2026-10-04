import { spawnSync } from 'node:child_process';
const action = process.argv[2];
const operations = {
  up: ['-f', 'compose.yaml', '-f', 'compose.dev.yaml', 'up', '--build', '--detach', '--wait', '--wait-timeout', '240'],
  preview: ['-f', 'compose.yaml', 'up', '--build', '--detach', '--wait', '--wait-timeout', '240'],
  migrate: ['-f', 'compose.yaml', 'run', '--rm', 'db-grants'],
  dbstatus: ['-f', 'compose.yaml', 'run', '--rm', '--no-deps', 'migrate', 'node', 'dist/kernel/database/cli.js', 'status'],
  status: ['-f', 'compose.yaml', 'ps'],
  logs: ['-f', 'compose.yaml', 'logs', '--tail', '80'],
  down: ['-f', 'compose.yaml', 'down'],
  test: ['-p', 'agentic-crm-test', '-f', 'compose.yaml', '-f', 'compose.test.yaml', 'run', '--rm', '--build', '--no-deps', 'test'],
};
const args = operations[action];
if (!args) throw new Error(`Unknown operation: ${action}`);
// Never adds --volumes or a destructive reset. Named volumes survive down/up.
const result = spawnSync('docker', ['compose', ...args], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
