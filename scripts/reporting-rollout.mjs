import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { fixtureId } from '../services/core-baseline/dist/modules/identity/seed.js';
import { inboxDemoDashboards } from '../services/reporting/dist/inbox-demo.js';

const mode = process.argv[2]; assert.ok(['--check', '--apply', '--rollback'].includes(mode), 'Choose --check, --apply or --rollback');
assert.equal(process.argv.length, 3);
const local = parseEnv(await readFile('.env', 'utf8'));
const runtime = parseEnv(await readFile('.local/services/reporting.env', 'utf8'));
const api = parseEnv(await readFile('.local/services/api.env', 'utf8'));
assert.equal(local.APP_ENV, 'development'); assert.equal(local.APP_ORIGIN, 'http://localhost:18080');
assert.equal(runtime.REPORTING_DB_NAME, 'crm_reporting'); assert.equal(runtime.REPORTING_DB_HOST, '127.0.0.1'); assert.equal(runtime.REPORTING_DB_PORT, '13306');
assert.equal(runtime.PORT, '3004'); assert.equal(api.REPORTING_SERVICE_URL, 'http://127.0.0.1:3004');
assert.ok(api.REPORTING_ADMISSION_KEY && api.REPORTING_ADMISSION_KEY === runtime.REPORTING_ADMISSION_KEY, 'BFF key mismatch');
const config = Object.fromEntries(['REPORTING_DB_NAME', 'REPORTING_DB_PORT', 'REPORTING_RUNTIME_USER', 'REPORTING_RUNTIME_PASSWORD', 'REPORTING_ADMISSION_KEY'].map(key => [key, runtime[key]]));
Object.assign(config, { REPORTING_CONTAINER_DB_HOST: 'host.docker.internal', REPORTING_CONTAINER_PORT: '3004' });
const envPath = '.local/reporting-container.env';
await writeFile(envPath, Object.entries(config).map(([key, value]) => key + '=' + JSON.stringify(value)).join('\n') + '\n', { mode: 0o600 });
const childEnv = { ...process.env, ...config };
const compose = ['compose', '--env-file', envPath, '-p', 'agentic-crm-reporting', '-f', 'compose.reporting.yaml'];
function docker(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { env: childEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; child.stdout.on('data', chunk => { out += chunk; }); child.stderr.resume();
    const timer = setTimeout(() => child.kill(), 120000);
    child.once('error', () => { clearTimeout(timer); reject(new Error('DOCKER_UNAVAILABLE')); });
    child.once('exit', code => { clearTimeout(timer); code === 0 ? resolve(out.trim()) : reject(new Error('DOCKER_COMMAND_FAILED')); });
  });
}
const monitor = 'http://127.0.0.1:3020';
const status = async () => (await (await fetch(monitor + '/status')).json()).services.find(service => service.id === 'reporting');
const token = /const token='([a-f0-9]+)'/.exec(await (await fetch(monitor)).text())?.[1]; assert.ok(token, 'Monitor required');
async function host(action) {
  const response = await fetch(monitor + '/service/reporting/' + action, { method: 'POST', headers: { Origin: monitor, 'X-Local-Token': token } });
  assert.equal(response.status, 200, 'Reporting host lifecycle failed');
}
async function ready() {
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch('http://127.0.0.1:3004/internal/v1/reporting/health/ready', { signal: AbortSignal.timeout(1500) })).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('REPORTING_NOT_READY');
}
const dir = 'artifacts/reporting-rollout'; await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage(); page.setDefaultTimeout(30000);
const origin = local.APP_ORIGIN; let csrf, switched = false, restored = false, before, after, image;
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
try {
  await docker([...compose, 'config', '--quiet']);
  image = await docker(['image', 'inspect', 'agentic-crm-reporting:local', '--format', '{{.Id}}']);
  await page.goto(origin + '/auth/login'); await page.getByLabel('Tên đăng nhập').fill('alpha_admin');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(local.SEED_ALPHA_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await page.waitForURL(origin + '/');
  csrf = (await (await page.request.get(origin + '/auth/csrf')).json()).data.csrf_token;
  const headers = { 'X-Tenant-Id': fixtureId('clinic_alpha'), Origin: origin, 'X-CSRF-Token': csrf };
  async function call(path, data) {
    const response = await page.request.fetch(origin + '/api/v1/' + path, { method: data === undefined ? 'GET' : 'POST', headers, ...(data === undefined ? {} : { data }) });
    assert.equal(response.status(), 200, 'Native Reporting request failed: ' + path);
    return (await response.json()).data;
  }
  const discovery = await call('reporting/authoring');
  const source = discovery.sources.find(row => row.environment === 'mock' && row.catalog.models.some(model => model.id === 'inbox_operations'));
  assert.ok(source, 'Retained synthetic inbox snapshot required; no automatic seed/grant');
  const query = inboxDemoDashboards(source.id, source.generation)[0].definition.widgets[0];
  async function snapshot() {
    const definitions = []; let cursor;
    do {
      const data = await call('reporting/definitions?limit=100' + (cursor ? '&after=' + cursor : ''));
      definitions.push(...data.items); cursor = data.next_after;
      assert.ok(definitions.length <= 10000, 'Snapshot bound exceeded');
    } while (cursor);
    const dashboards = await call('reporting/dashboards?limit=50');
    const result = await call('reporting/query', { definition: query.definition, generation: query.generation });
    return { definitionCount: definitions.length, definitionsHash: digest(definitions), dashboardHash: digest(dashboards), queryHash: digest(result) };
  }
  before = await snapshot(); console.log('PASS native baseline: existing definitions, dashboards and synthetic snapshot query');
  if (mode === '--apply') {
    const current = await status(); assert.ok(current?.owned && current.health === 'ready', 'Only manager-owned host Reporting may be switched');
    switched = true; await host('stop');
    await docker([...compose, 'up', '-d', '--no-build', '--wait', '--wait-timeout', '90']);
    await ready(); after = await snapshot(); assert.deepEqual(after, before, 'Native results changed after rollout');
    assert.equal((await status()).owned, false); console.log('PASS Reporting container active on3004; native data/query fingerprints unchanged');
  } else if (mode === '--rollback') {
    const id = await docker([...compose, 'ps', '-q', 'reporting']); assert.ok(id, 'Managed Reporting container required');
    assert.equal((await status()).owned, false, 'Host already owns Reporting');
    await docker([...compose, 'stop', 'reporting']); await host('start'); await ready();
    after = await snapshot(); assert.deepEqual(after, before); restored = true; console.log('PASS prior host Reporting restored');
  }
  await writeFile(dir + '/' + mode.slice(2) + '.json', JSON.stringify({ at: new Date().toISOString(), passed: true, mode, image, before, after, switched, restored }, null, 2) + '\n');
} catch (error) {
  if (mode === '--apply' && switched) {
    await docker([...compose, 'stop', 'reporting']);
    if (!(await status())?.owned) await host('start');
    await ready(); restored = true;
  }
  await writeFile(dir + '/' + mode.slice(2) + '.json', JSON.stringify({ at: new Date().toISOString(), passed: false, mode, switched, restored, error: 'ROLLOUT_CHECK_FAILED' }, null, 2) + '\n');
  throw error;
} finally {
  if (csrf) await page.request.post(origin + '/auth/logout', { headers: { Origin: origin, 'X-CSRF-Token': csrf } }).catch(() => {});
  await browser.close();
}
