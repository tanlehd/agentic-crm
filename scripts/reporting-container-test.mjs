import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

// Explicit, retained synthetic database only. Never provision/reset or use the live BFF.
const env = parseEnv(await readFile('.local/reporting-test.env', 'utf8'));
assert.equal(env.REPORTING_DB_NAME, 'test_crm_reporting');
assert.equal(env.REPORTING_DB_HOST, '127.0.0.1');
assert.equal(env.REPORTING_DB_PORT, '13306');
assert.equal(env.REPORTING_RUNTIME_USER, 'rpt_test_runtime');
assert.match(env.REPORTING_ADMISSION_KEY, /^[a-f0-9]{64}$/);
const compose = ['compose', '--env-file', '.local/reporting-test.env', '-p', 'agentic-crm-reporting-test', '-f', 'compose.reporting.yaml'];
// Prevent inherited shell overrides from redirecting this test to another DB/port/image.
const childEnv = { ...process.env, ...env, REPORTING_CONTAINER_DB_HOST: 'host.docker.internal', REPORTING_CONTAINER_PORT: '13004' };
function docker(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { env: childEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    // Never echo Docker stderr: an engine error may include runtime configuration.
    child.stderr.resume();
    const timer = setTimeout(() => child.kill(), 120000);
    child.once('error', () => { clearTimeout(timer); reject(new Error('DOCKER_UNAVAILABLE')); });
    child.once('exit', code => { clearTimeout(timer); code === 0 ? resolve(output.trim()) : reject(new Error('DOCKER_COMMAND_FAILED')); });
  });
}
const groups = [];
async function test(name, fn) { await fn(); groups.push(name); console.log('PASS ' + name); }
const fixturePath = '.local/reporting-container-fixture.json';
let fixture;
try { fixture = JSON.parse(await readFile(fixturePath, 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  fixture = { tenant: randomUUID(), foreignTenant: randomUUID(), principal: randomUUID(), command: randomUUID() };
  await writeFile(fixturePath, JSON.stringify(fixture), { flag: 'wx', mode: 0o600 });
}
const base = 'http://127.0.0.1:13004/internal/v1/reporting';
async function request(operation, options = {}) {
  const body = JSON.stringify(operation), now = Date.now();
  const payload = Buffer.from(JSON.stringify({ audience: 'reporting-definition-v1', tenantId: options.tenant ?? fixture.tenant, principalId: fixture.principal,
    authRevision: '1', readScope: 'own', designScope: 'own', bodyHash: createHash('sha256').update(options.boundBody ?? body).digest('hex'),
    issuedAt: now - (options.expired ? 6000 : 0), expiresAt: now + (options.expired ? -1000 : 5000) })).toString('base64url');
  const signature = createHmac('sha256', Buffer.from(env.REPORTING_ADMISSION_KEY, 'hex')).update(payload).digest('hex');
  const response = await fetch(base + '/definitions', { method: 'POST', signal: AbortSignal.timeout(6000), headers: {
    'content-type': 'application/json', ...(options.unsigned ? {} : { 'x-reporting-admission': payload + '.' + signature }), ...options.headers,
  }, body });
  return { status: response.status, body: await response.json() };
}
const create = { kind: 'create', key: fixture.command, body: { name: 'Synthetic container acceptance', definition: { packaging: 'SP-03' } } };
let container, report, stopped = false, image, started = false;
try {
  await test('SP-02 image contains only Reporting production package', async () => {
    image = await docker(['image', 'inspect', 'agentic-crm-reporting:local', '--format', '{{.Id}}']);
    const check = `const a=require('node:assert/strict'),f=require('node:fs');a.equal(process.getuid(),1000);for(const p of ['src','apps','database','node_modules/typescript','node_modules/next','node_modules/@agentic-crm/backend'])a.equal(f.existsSync(p),false,p);a.ok(f.existsSync('dist/main.js'));a.equal(require('./package.json').name,'@agentic-crm/reporting');console.log('package-ok')`;
    assert.equal(await docker(['run', '--rm', '--network', 'none', '--read-only', '--cap-drop=ALL', 'agentic-crm-reporting:local', 'node', '-e', check]), 'package-ok');
  });
  await test('SP-03 Compose ready with runtime credentials only', async () => {
    await docker([...compose, 'config', '--quiet']);
    started = true;
    await docker([...compose, 'up', '-d', '--no-build', '--wait', '--wait-timeout', '90']);
    container = await docker([...compose, 'ps', '-q', 'reporting']);
    const config = JSON.parse(await docker(['inspect', container, '--format', '{{json .Config}}']));
    assert.equal(config.User, 'node');
    assert.ok(!config.Env.some(value => /^(REPORTING_OPERATOR_|MYSQL_|CONNECTOR_)/.test(value)));
    assert.equal((await fetch(base + '/health/ready')).status, 200);
    const response = await request(create); assert.equal(response.status, 200); report = response.body.data;
    assert.equal(report.owner_principal_id, fixture.principal); assert.equal((await request(create)).body.data.id, report.id);
  });
  await test('SP-04 private auth, body binding, tenant isolation and receipt conflict', async () => {
    const get = { kind: 'get', id: report.id };
    assert.equal((await request(get, { unsigned: true })).status, 401);
    assert.equal((await request(get, { expired: true })).status, 401);
    assert.equal((await request(get, { boundBody: '{}' })).status, 401);
    assert.equal((await request(get, { headers: { 'x-tenant-id': fixture.foreignTenant } })).status, 403);
    assert.equal((await request(get, { tenant: fixture.foreignTenant })).status, 404);
    assert.equal((await request({ ...create, body: { ...create.body, name: 'Conflicting payload' } })).status, 409);
  });
  await test('SP-04 runtime denies foreign database and migration journal', async () => {
    const check = `const a=require('node:assert/strict'),m=require('mysql2/promise'),e=process.env; (async()=>{const c=await m.createConnection({host:e.REPORTING_DB_HOST,port:Number(e.REPORTING_DB_PORT),user:e.REPORTING_RUNTIME_USER,password:e.REPORTING_RUNTIME_PASSWORD,database:e.REPORTING_DB_NAME});try{for(const sql of ['SELECT tenant_id FROM agentic_crm.tenant LIMIT 1','SELECT tenant_id FROM schema_migration LIMIT 1']){let denied=false;try{await c.query(sql)}catch(x){denied=['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(x.code)}a.ok(denied)}}finally{await c.end()}console.log('grants-ok')})().catch(()=>process.exit(1));`;
    assert.equal(await docker(['exec', container, 'node', '-e', check]), 'grants-ok');
  });
  await test('SP-05 clean stop and restart preserve synthetic draft and receipt', async () => {
    const stoppingAt = Date.now();
    await docker([...compose, 'stop', 'reporting']);
    const state = JSON.parse(await docker(['inspect', container, '--format', '{{json .State}}']));
    // Nest closes resources then re-emits SIGTERM: Linux reports 128 + 15.
    assert.ok([0, 143].includes(state.ExitCode)); assert.equal(state.OOMKilled, false);
    assert.ok(Date.now() - stoppingAt < 20000, 'shutdown exceeded grace period');
    await docker([...compose, 'up', '-d', '--no-build', '--wait', '--wait-timeout', '90']);
    const response = await request({ kind: 'get', id: report.id });
    assert.equal(response.status, 200); assert.equal(response.body.data.id, report.id);
    assert.deepEqual((await request(create)).body.data, report);
  });
} finally {
  // Preserve container and all DB fixtures for inspection/reuse; never down -v/reset.
  if (started) { await docker([...compose, 'stop', 'reporting']); stopped = true; }
  await mkdir('artifacts/service-packaging', { recursive: true });
  await writeFile('artifacts/service-packaging/reporting-container.json', JSON.stringify({ at: new Date().toISOString(), image, passed: groups.length === 5 && stopped, groups, stopped, database: env.REPORTING_DB_NAME }, null, 2) + '\n');
}
