import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { parseEnv } from 'node:util';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';

const project = 'agentic-crm-connector-retained';
const dir = 'artifacts/connector-operations';
await mkdir(dir, { recursive: true });
await mkdir('.local', { recursive: true });
const file = '.local/connector-operations-test.env';
const secret = () => randomBytes(32).toString('hex');
try {
  const values = { CONNECTOR_MIGRATION_PASSWORD: secret(), CONNECTOR_DB_PASSWORD: secret(), CONNECTOR_CONNECTION_ID: randomUUID(),
    CONNECTOR_TENANT_ID: randomUUID(), CONNECTOR_REMOTE_CONNECTION_ID: randomUUID(), CONNECTOR_INGRESS_TOKEN: secret(),
    CONNECTOR_REMOTE_TOKEN_LOCAL: secret(), CONNECTOR_REMOTE_ORIGIN: 'http://host.docker.internal:13112', CONNECTOR_ALLOW_HTTP: 'true', CONNECTOR_API_PORT: '13110' };
  await writeFile(file, Object.entries(values).map(([key, value]) => key + '=' + value).join('\n') + '\n', { flag: 'wx', mode: 0o600 });
} catch (error) { if (error.code !== 'EEXIST') throw error; }
const config = parseEnv(await readFile(file, 'utf8'));
assert.equal(config.CONNECTOR_REMOTE_ORIGIN, 'http://host.docker.internal:13112');
assert.equal(config.CONNECTOR_ALLOW_HTTP, 'true'); assert.equal(config.CONNECTOR_API_PORT, '13110');
const env = { ...process.env, ...config };
// Optional real Meta settings from a developer shell must never activate in this test.
for (const key of Object.keys(env)) if (key.startsWith('CONNECTOR_META_')) delete env[key];
const override = '.local/connector-operations.compose.yaml';
await writeFile(override, "services:\n  connector-worker:\n    ports: ['127.0.0.1:13111:3011']\n");
const compose = ['compose', '--env-file', file, '-p', project, '-f', 'compose.connector.yaml', '-f', override];
function docker(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = ''; child.stdout.on('data', chunk => { output += chunk; }); child.stderr.resume();
    child.stdin.end(input); child.stdin.on('error', () => {});
    const timer = setTimeout(() => child.kill(), 150000);
    child.once('error', () => { clearTimeout(timer); reject(new Error('DOCKER_UNAVAILABLE')); });
    child.once('exit', code => { clearTimeout(timer); code === 0 ? resolve(output.trim()) : reject(new Error('DOCKER_COMMAND_FAILED')); });
  });
}
const fixtureFile = '.local/connector-operations-fixture.json';
let fixture;
try { fixture = JSON.parse(await readFile(fixtureFile, 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  fixture = { contact: randomUUID(), identity: randomUUID(), receipts: {} };
  await writeFile(fixtureFile, JSON.stringify(fixture), { flag: 'wx', mode: 0o600 });
}
let upstream, revoked = false;
async function startReceiver() {
  upstream = createServer((req, res) => {
    void (async () => {
      res.setHeader('content-type', 'application/json');
      if (revoked || req.headers.authorization !== 'Bearer ' + config.CONNECTOR_REMOTE_TOKEN_LOCAL || req.headers['x-connection-id'] !== config.CONNECTOR_REMOTE_CONNECTION_ID) {
        res.statusCode = 401; res.end('{}'); return;
      }
      let body = ''; for await (const part of req) { body += part; if (body.length > 65536) { res.statusCode = 413; res.end('{}'); return; } }
      const input = body ? JSON.parse(body) : {};
      const scope = { tenant_id: config.CONNECTOR_TENANT_ID, connection_id: config.CONNECTOR_REMOTE_CONNECTION_ID };
      let data;
      if (req.url === '/api/v1/integrations/mock-messenger/binding') data = { ...scope, platform: 'mock_messenger' };
      else if (req.url === '/api/v1/integrations/contact-identities/lookup' || req.url === '/api/v1/integrations/contact-identities/resolve') {
        data = { mapping: { ...scope, external_subject_id: input.external_subject_id, crm_contact_id: fixture.contact, crm_identity_id: fixture.identity, mapping_revision: '1' } };
      } else if (req.url === '/api/v1/integrations/mock-messenger/deliveries-v2') {
        assert.equal(input.crm_contact_id, fixture.contact); assert.equal(input.crm_identity_id, fixture.identity);
        const key = input.intake.provider_event_id;
        const digest = createHash('sha256').update(body).digest('hex');
        const old = fixture.receipts[key];
        if (old && old.digest !== digest) { res.statusCode = 409; res.end('{}'); return; }
        fixture.receipts[key] ??= { id: randomUUID(), digest };
        await writeFile(fixtureFile, JSON.stringify(fixture), { mode: 0o600 });
        data = { delivery_id: fixture.receipts[key].id, status: 'received' };
      } else if (req.url?.startsWith('/api/v1/integrations/deliveries/')) {
        const id = req.url.split('/').at(-1);
        if (!Object.values(fixture.receipts).some(row => row.id === id)) { res.statusCode = 404; res.end('{}'); return; }
        data = { id, connection_id: scope.connection_id, status: 'processed' };
      } else { res.statusCode = 404; res.end('{}'); return; }
      res.end(JSON.stringify({ data }));
    })().catch(() => { res.statusCode = 503; res.end('{}'); });
  });
  await new Promise((resolve, reject) => { upstream.once('error', reject); upstream.listen(13112, '0.0.0.0', resolve); });
}
async function stopReceiver() {
  if (!upstream) return;
  const current = upstream; upstream = null;
  current.closeAllConnections(); await new Promise((resolve, reject) => current.close(error => error ? reject(error) : resolve()));
}
async function until(check, limit = 60000) {
  const end = Date.now() + limit;
  while (Date.now() < end) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 500)); }
  throw new Error('ACCEPTANCE_TIMEOUT');
}
const base = 'http://127.0.0.1:13110/connector/v1';
const workerHealth = 'http://127.0.0.1:13111/connector/v1/health/ready';
const headers = { 'content-type': 'application/json', 'x-connection-id': config.CONNECTOR_CONNECTION_ID, authorization: 'Bearer ' + config.CONNECTOR_INGRESS_TOKEN };
const post = input => fetch(base + '/deliveries', { method: 'POST', headers, body: JSON.stringify(input), signal: AbortSignal.timeout(6000) });
async function status(id) { const response = await fetch(base + '/deliveries/' + id, { headers, signal: AbortSignal.timeout(6000) }); assert.equal(response.status, 200); return (await response.json()).data; }
const input = key => ({ provider_event_id: key, provider_message_id: key, external_subject_id: 'synthetic-operations', occurred_at: '2026-10-18T00:00:00Z', message: { type: 'text', text: 'Synthetic retained Connector operations acceptance' } });
const groups = []; let started = false;
async function test(name, fn) { await fn(); groups.push(name); console.log('PASS ' + name); }
let image, mysqlId, workerId, apiId;
try {
  await test('RO-03 registered system tenant and retained explicit provisioning', async () => {
    const registered = await docker(['exec', '-i', 'agentic-crm-mysql-1', 'sh', '-c', 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot --batch --skip-column-names'], "SELECT COUNT(*) FROM agentic_crm.tenant WHERE id='01900000-0000-7000-8000-000000000001' AND tenant_id=id AND kind='system';");
    assert.equal(registered, '1');
    await docker([...compose, 'config', '--quiet']); started = true;
    await docker([...compose, 'up', '-d', '--no-build', '--wait', '--wait-timeout', '120', 'connector-mysql']);
    for (const mode of ['migrate', 'grant', 'provision']) await docker([...compose, 'run', '--rm', '--no-deps', 'connector-admin', 'node', 'dist/main.js', mode]);
    const noop = "import{createPool}from'mysql2/promise';import{migrate}from'./dist/schema.js';const e=process.env,p=createPool({host:e.CONNECTOR_DB_HOST,user:e.CONNECTOR_MIGRATION_USER,password:e.CONNECTOR_MIGRATION_PASSWORD,database:e.CONNECTOR_DB_NAME});try{if(await migrate(p)!==0)process.exitCode=1;else console.log('migration-noop')}finally{await p.end()}";
    assert.equal(await docker([...compose, 'run', '--rm', '--no-deps', 'connector-admin', 'node', '--input-type=module', '-e', noop]), 'migration-noop');
  });
  await test('RO-02 real image API/worker ready with constrained runtime', async () => {
    await docker([...compose, 'up', '-d', '--no-build', '--wait', '--wait-timeout', '90', 'connector-api', 'connector-worker']);
    apiId = await docker([...compose, 'ps', '-q', 'connector-api']); workerId = await docker([...compose, 'ps', '-q', 'connector-worker']); mysqlId = await docker([...compose, 'ps', '-q', 'connector-mysql']);
    image = await docker(['inspect', workerId, '--format', '{{.Image}}']);
    for (const id of [apiId, workerId]) {
      const detail = JSON.parse(await docker(['inspect', id, '--format', '{{json .}}']));
      assert.equal(detail.Config.User, 'node'); assert.equal(detail.HostConfig.ReadonlyRootfs, true);
      assert.ok(!detail.Config.Env.some(value => value.startsWith('CONNECTOR_MIGRATION_PASSWORD=')));
    }
    assert.equal((await fetch(workerHealth)).status, 200);
  });
  await test('RO-04 downstream outage queues durably then recovers through versioned HTTP', async () => {
    const event = input('outage-' + randomUUID()), response = await post(event); assert.equal(response.status, 202);
    const id = (await response.json()).data.delivery_id;
    await until(async () => (await status(id)).error_code === 'REMOTE_UNAVAILABLE', 25000);
    assert.equal((await status(id)).status, 'queued'); assert.equal((await fetch(workerHealth)).status, 200);
    await startReceiver(); await until(async () => (await status(id)).status === 'completed');
    const replay = await post(event); assert.equal((await replay.json()).data.delivery_id, id);
    assert.equal((await post({ ...event, external_subject_id: 'conflicting' })).status, 409);
  });
  await test('RO-04 restart preserves stable delivery and receipt; graceful worker exit', async () => {
    const event = input('stable-retained-operations'), response = await post(event); assert.equal(response.status, 202);
    const id = (await response.json()).data.delivery_id; await until(async () => (await status(id)).status === 'completed');
    const before = await status(id);
    await docker([...compose, 'stop', 'connector-api', 'connector-worker']);
    for (const container of [apiId, workerId]) { const state = JSON.parse(await docker(['inspect', container, '--format', '{{json .State}}'])); assert.equal(state.ExitCode, 0); assert.equal(state.OOMKilled, false); }
    await docker([...compose, 'up', '-d', '--no-build', '--wait', '--wait-timeout', '90', 'connector-api', 'connector-worker']);
    assert.equal((await (await post(event)).json()).data.delivery_id, id); assert.equal((await status(id)).remote_delivery_id, before.remote_delivery_id);
  });
  await test('RO-02 own DB outage fails readiness and recovers without resetting data', async () => {
    await docker([...compose, 'stop', 'connector-mysql']);
    await until(async () => (await fetch(workerHealth)).status === 503, 60000);
    assert.equal((await fetch(workerHealth.replace('/ready', '/live'))).status, 200);
    await docker([...compose, 'up', '-d', '--no-build', '--wait', '--wait-timeout', '120', 'connector-mysql']);
    await until(async () => (await fetch(workerHealth)).status === 200);
  });
  await test('RO-04 revoked binding blocks delivery and runtime lacks foreign DB privileges', async () => {
    revoked = true;
    const response = await post(input('revoked-' + randomUUID())); assert.equal(response.status, 202);
    const id = (await response.json()).data.delivery_id; await until(async () => (await status(id)).status === 'blocked');
    assert.equal((await status(id)).error_code, 'REMOTE_REJECTED'); assert.equal((await fetch(workerHealth)).status, 200);
    const script = "const a=require('node:assert/strict'),m=require('mysql2/promise'),e=process.env;(async()=>{const c=await m.createConnection({host:e.CONNECTOR_DB_HOST,user:e.CONNECTOR_DB_USER,password:e.CONNECTOR_DB_PASSWORD,database:e.CONNECTOR_DB_NAME});try{for(const sql of ['SELECT * FROM mysql.user LIMIT 1']){let denied=false;try{await c.query(sql)}catch(x){denied=['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(x.code)}a.ok(denied)}const[g]=await c.query('SHOW GRANTS');a.ok(g.length>0);for(const row of g)a.doesNotMatch(Object.values(row).join(' '),/GRANT .*\\b(CREATE|ALTER|DROP|ALL PRIVILEGES|GRANT OPTION)\\b/i)}finally{await c.end()}console.log('grants-denied')})().catch(()=>process.exit(1));";
    assert.equal(await docker(['exec', workerId, 'node', '-e', script]), 'grants-denied');
  });
} finally {
  await stopReceiver();
  if (started) await docker([...compose, 'stop']);
  await writeFile(dir + '/summary.json', JSON.stringify({ at: new Date().toISOString(), passed: groups.length === 6, groups, image, project, retained: true, stopped: true, downstream: 'synthetic HTTP contract receiver, not native Chat or Meta' }, null, 2) + '\n');
}
