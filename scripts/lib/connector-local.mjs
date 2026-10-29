// Operator-only local lifecycle. No backend implementation imports or runtime cross-DB access.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createMonitor } from '../local-monitor.mjs';

export const directory = 'artifacts/connector-rollout';
export const envFile = '.local/connector-local.env';
export const project = 'agentic-crm-connector-local';
export const apiOrigin = 'http://127.0.0.1:3001';
export const connectorOrigin = 'http://127.0.0.1:3010';
export const uuid = value => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
export function fixtureId(alias) {
  const h = createHash('sha256').update('agentic-crm:identity-fixture:v1:' + alias).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}
export const serializeEnv = env => Object.entries(env).map(([k,v]) => k + '=' + JSON.stringify(v)).join('\n') + '\n';
export async function evidence(name, data) {
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/${name}.json`, JSON.stringify({ at: new Date().toISOString(), ...data }, null, 2) + '\n');
}
export async function until(check, message, timeout = 60000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(message);
}
export async function localContext({ initialize = false } = {}) {
  const base = parseEnv(await readFile('.env', 'utf8'));
  assert.equal(base.APP_ENV, 'development');
  assert.equal(base.APP_ORIGIN, 'http://localhost:18080');
  assert.equal(base.MYSQL_DATABASE, 'agentic_crm');
  assert.ok(/^[a-f0-9]{64}$/.test(base.MOCK_ALPHA_TOKEN ?? ''),'SYNTHETIC_CREDENTIAL_REQUIRED');
  let config;
  try { config = parseEnv(await readFile(envFile, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT' || !initialize) throw error;
    config = {
      CONNECTOR_MIGRATION_PASSWORD: randomBytes(32).toString('hex'),
      CONNECTOR_DB_PASSWORD: randomBytes(32).toString('hex'),
      CONNECTOR_CONNECTION_ID: randomUUID(),
      CONNECTOR_TENANT_ID: fixtureId('clinic_alpha'),
      CONNECTOR_REMOTE_CONNECTION_ID: fixtureId('alpha:mock_connection'),
      CONNECTOR_INGRESS_TOKEN: randomBytes(32).toString('hex'),
      CONNECTOR_REMOTE_TOKEN_LOCAL: base.MOCK_ALPHA_TOKEN,
      CONNECTOR_REMOTE_ORIGIN: 'http://host.docker.internal:3001',
      CONNECTOR_ALLOW_HTTP: 'true', CONNECTOR_API_PORT: '3010',
    };
    config.CONNECTOR_IMAGE = await docker(['image', 'inspect', 'agentic-crm-connector:src107', '--format', '{{.Id}}']);
    await writeFile(envFile, serializeEnv(config), { flag: 'wx', mode: 0o600 });
  }
  assert.equal(config.CONNECTOR_TENANT_ID, fixtureId('clinic_alpha'));
  assert.equal(config.CONNECTOR_REMOTE_CONNECTION_ID, fixtureId('alpha:mock_connection'));
  assert.ok(config.CONNECTOR_REMOTE_TOKEN_LOCAL === base.MOCK_ALPHA_TOKEN,'RETAINED_CREDENTIAL_MISMATCH');
  assert.equal(config.CONNECTOR_REMOTE_ORIGIN, 'http://host.docker.internal:3001');
  assert.equal(config.CONNECTOR_ALLOW_HTTP, 'true'); assert.equal(config.CONNECTOR_API_PORT, '3010');
  assert.ok(uuid(config.CONNECTOR_CONNECTION_ID));
  assert.match(config.CONNECTOR_IMAGE, /^sha256:[a-f0-9]{64}$/);
  for (const key of ['CONNECTOR_MIGRATION_PASSWORD','CONNECTOR_DB_PASSWORD','CONNECTOR_INGRESS_TOKEN']) assert.ok(/^[a-f0-9]{64}$/.test(config[key]),'INVALID_PRIVATE_CONFIG');
  assert.equal(new Set([config.CONNECTOR_MIGRATION_PASSWORD,config.CONNECTOR_DB_PASSWORD,config.CONNECTOR_INGRESS_TOKEN,config.CONNECTOR_REMOTE_TOKEN_LOCAL]).size, 4);
  const env = { ...process.env, ...config };
  // Do not inherit provider settings or Compose overrides from an unrelated shell.
  for (const key of Object.keys(env)) if (key.startsWith('CONNECTOR_META_') || key.startsWith('COMPOSE_')) delete env[key];
  const compose = ['compose', '--env-file', envFile, '-p', project, '-f', 'compose.connector.yaml', '-f', 'compose.connector.local.yaml'];
  const dc = args => docker([...compose, ...args], undefined, env);
  const ownSql = sql => dcSql(sql, env, compose);
  async function remote(path, body, label = 'alpha') {
    const response = await fetch(apiOrigin + '/api/v1/integrations/' + path, {
      method: body === undefined ? 'GET' : 'POST', redirect: 'error', signal: AbortSignal.timeout(8000),
      headers: { authorization: 'Bearer ' + base['MOCK_' + label.toUpperCase() + '_TOKEN'], 'x-connection-id': fixtureId(label + ':mock_connection'), 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  }
  return { base, config, env, compose, dc, ownSql, remote };
}
export function docker(args, input, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { env, windowsHide: true, stdio: ['pipe','pipe','pipe'] });
    let output = ''; child.stdout.on('data', chunk => { output += chunk; }); child.stderr.resume();
    child.stdin.on('error', () => {}); child.stdin.end(input);
    const timer = setTimeout(() => child.kill(), 150000);
    child.once('error', () => { clearTimeout(timer); reject(new Error('DOCKER_UNAVAILABLE')); });
    child.once('exit', code => { clearTimeout(timer); code === 0 ? resolve(output.trim()) : reject(new Error('DOCKER_COMMAND_FAILED')); });
  });
}
async function dcSql(sql, env, compose) {
  return docker([...compose, 'exec', '-T', 'connector-mysql', 'sh', '-c', 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot --batch --raw --skip-column-names connector_local'], sql, env);
}
export function backendSql(sql) {
  assert.ok(/^\s*SELECT\b/i.test(sql) && !/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|OUTFILE|DUMPFILE)\b/i.test(sql), 'Backend observation is read-only');
  return docker(['exec', '-i', 'agentic-crm-mysql-1', 'sh', '-c', 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot --batch --raw --skip-column-names agentic_crm'], sql);
}
export async function preflight(ctx) {
  const { config, dc, remote } = ctx;
  await dc(['config', '--quiet']);
  assert.equal(await docker(['image','inspect',config.CONNECTOR_IMAGE,'--format','{{.Id}}']), config.CONNECTOR_IMAGE);
  const manifest = JSON.parse(await docker(['run','--rm','--network','none',config.CONNECTOR_IMAGE,'node','--input-type=module','-e',"import{migrations}from'./dist/schema.js';console.log(JSON.stringify(migrations.map(({version,name,checksum})=>({version,name,checksum}))))"]));
  assert.deepEqual(manifest.map(m => m.version), [1,2,3,4,5]);
  const binding = await remote('mock-messenger/binding');
  assert.equal(binding.status, 200, 'Existing synthetic native binding required');
  assert.deepEqual(binding.body.data, { tenant_id: config.CONNECTOR_TENANT_ID, connection_id: config.CONNECTOR_REMOTE_CONNECTION_ID, platform: 'mock_messenger' });
  assert.equal((await remote('contact-identities/lookup', { external_subject_id: 'synthetic-src107-local' })).status, 200);
  assert.equal(await backendSql("SELECT COUNT(*) FROM tenant WHERE id='01900000-0000-7000-8000-000000000001' AND tenant_id=id AND kind='system';"), '1');
  for (const port of [3001,3002]) assert.equal((await fetch(`http://127.0.0.1:${port}/api/v1/health/ready`)).status, 200);
  const monitor = await (await fetch('http://127.0.0.1:3020/status')).json();
  for (const id of ['connector-api','connector-worker']) assert.equal(monitor.services.find(s => s.id === id)?.owned, false, 'Do not replace manager-owned processes');
  return { image: config.CONNECTOR_IMAGE, manifest, backendSchema: await backendSql('SELECT MAX(version) FROM schema_migration;'), binding: binding.body.data, monitor };
}
export async function schemaSnapshot(ctx) {
  const rows = await ctx.ownSql('SELECT version,name,checksum,state FROM connector_schema_migration ORDER BY version;');
  return rows.split('\n').map(line => { const [version,name,checksum,state] = line.split('\t'); return {version:Number(version),name,checksum,state}; });
}
export async function connectionStatus(ctx, status) {
  assert.ok(['active','disabled'].includes(status));
  const c = ctx.config;
  // Only this immutable synthetic binding. Does not revoke shared downstream credentials.
  await ctx.ownSql(`UPDATE connector_connection SET status='${status}' WHERE id='${c.CONNECTOR_CONNECTION_ID}' AND tenant_id='${c.CONNECTOR_TENANT_ID}' AND remote_connection_id='${c.CONNECTOR_REMOTE_CONNECTION_ID}';`);
  assert.equal(await ctx.ownSql(`SELECT status FROM connector_connection WHERE id='${c.CONNECTOR_CONNECTION_ID}' AND tenant_id='${c.CONNECTOR_TENANT_ID}';`), status);
}
export async function pending(ctx) {
  return Number(await ctx.ownSql("SELECT COUNT(*) FROM connector_delivery WHERE status IN ('queued','forwarded');"));
}
export async function start(ctx) {
  await ctx.dc(['up','-d','--no-build','--wait','--wait-timeout','90','connector-api','connector-worker']);
  for (const port of [3010,3011]) assert.equal((await fetch(`http://127.0.0.1:${port}/connector/v1/health/ready`)).status, 200);
}
export async function registerMonitor(ctx) {
  for (const [id,port] of [['connector-api','3010'],['connector-worker','3011']]) {
    const file = `.local/services/${id}.env`, old = await readFile(file,'utf8');
    try { await writeFile(file + '.before-src107', old, { flag:'wx', mode:0o600 }); } catch(error) { if(error.code!=='EEXIST') throw error; }
    const config = { APP_ENV:'development', PORT:port, CONNECTOR_DB_HOST:'127.0.0.1', CONNECTOR_DB_PORT:'13307', CONNECTOR_DB_NAME:'connector_local', CONNECTOR_DB_USER:'connector_runtime', CONNECTOR_DB_PASSWORD:ctx.config.CONNECTOR_DB_PASSWORD, CONNECTOR_REMOTE_ORIGIN:apiOrigin, CONNECTOR_ALLOW_HTTP:'true', CONNECTOR_REMOTE_TOKEN_LOCAL:ctx.config.CONNECTOR_REMOTE_TOKEN_LOCAL };
    await writeFile(file,serializeEnv(config),{mode:0o600});
  }
}
export async function observe(ctx) {
  const health = [];
  for (const [id,port] of [['connector-api',3010],['connector-worker',3011]]) {
    const response = await fetch(`http://127.0.0.1:${port}/connector/v1/health/ready`,{signal:AbortSignal.timeout(3000)});
    health.push({id,status:response.status,body:await response.json()});
  }
  const containers = await ctx.dc(['ps','--format','json']);
  const legacy = await (await fetch('http://127.0.0.1:3020/status')).json();
  // A fresh registry snapshot without restarting the long-lived manager's app children.
  const observer=await createMonitor(3021);
  let current;
  try {
    await new Promise((resolve,reject)=>{observer.server.once('error',reject);observer.server.listen(3021,'127.0.0.1',resolve);});
    current=await (await fetch('http://127.0.0.1:3021/status')).json();
  } finally { if(observer.server.listening) await observer.close(); }
  return {health,containers,currentRegistry:current,legacyMonitor:legacy,observerStopped:true};
}
