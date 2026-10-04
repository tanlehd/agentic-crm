import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';

const port = 38081;
const child = spawn(process.execPath, ['apps/backend/dist/main.js'], { env: { ...process.env, PORT: String(port), MYSQL_HOST: '', REDIS_HOST: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
child.stdout.on('data', data => { output += data; });
child.stderr.on('data', data => { output += data; });
try {
  let live;
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error(`API exited ${child.exitCode}: ${output}`);
    try { live = await fetch(`http://127.0.0.1:${port}/api/v1/health/live`); if (live.ok) break; } catch {}
    await sleep(250);
  }
  assert(live?.ok, 'API did not become live');
  assert.deepEqual(await live.json(), { status: 'ok', service: 'api' });
  const ready = await fetch(`http://127.0.0.1:${port}/api/v1/health/ready`);
  assert.equal(ready.status, 503);
  assert.deepEqual(await ready.json(), { status: 'degraded', service: 'api', stage: 'scaffold', checks: { mysql: 'not_configured', redis: 'not_configured' } });
  const absent = await fetch(`http://127.0.0.1:${port}/api/v1/leads`);
  assert.equal(absent.status, 404, 'Business route must not pretend to be implemented');
  console.log('PASS: live, truthful degraded readiness, unimplemented business route 404.');
} finally {
  child.kill('SIGTERM');
  await Promise.race([new Promise(resolve => child.once('exit', resolve)), sleep(3000)]);
  if (child.exitCode === null) child.kill('SIGKILL');
}
