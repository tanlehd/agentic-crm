import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const infra = ['mysql', 'redis'];
export const units = {
  api: { cwd: 'apps/backend', args: ['--import', 'tsx', 'src/main.ts'], health: '/api/v1/health/ready' },
  worker: { cwd: 'apps/backend', args: ['--import', 'tsx', 'src/worker.ts'], health: '/api/v1/health/ready' },
  web: { cwd: 'apps/web', args: ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1'], health: '/' },
  'connector-api': { cwd: 'services/crm-connector', args: ['dist/main.js', 'api'], health: '/connector/v1/health/ready' },
  'connector-worker': { cwd: 'services/crm-connector', args: ['dist/main.js', 'worker'] },
};
export const envPath = id => `.local/services/${id}.env`;
export async function readEnv(path) { return parseEnv(await readFile(resolve(root, path), 'utf8')); }
export function port(value) {
  if (!/^\d+$/.test(String(value)) || Number(value) < 1 || Number(value) > 65535) throw new Error('INVALID_PORT');
  return Number(value);
}
export async function unitEnv(id) {
  if (!Object.hasOwn(units, id)) throw new Error('UNKNOWN_SERVICE');
  const env = await readEnv(envPath(id));
  if (!['development', 'test'].includes(env.APP_ENV)) throw new Error('LOCAL_ENV_REQUIRED');
  port(env.PORT);
  if (id.startsWith('connector-') && ['CONNECTOR_DB_HOST', 'CONNECTOR_DB_NAME', 'CONNECTOR_DB_USER', 'CONNECTOR_DB_PASSWORD'].some(key => !env[key])) throw new Error('CONNECTOR_CONFIGURATION_REQUIRED');
  return env;
}
export function launch(id, env, stdio = 'ignore') {
  const unit = units[id];
  if (!unit) throw new Error('UNKNOWN_SERVICE');
  return spawn(process.execPath, unit.args, { cwd: resolve(root, unit.cwd), env: { ...process.env, ...env }, stdio, windowsHide: true, detached: process.platform !== 'win32' });
}
export function execute(command, args, options = {}) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(command, args, { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'], ...options });
    let output = '';
    child.stdout?.on('data', chunk => { if (output.length < 100000) output += chunk; });
    const timer = setTimeout(() => { child.kill(); reject(new Error('COMMAND_TIMEOUT')); }, 30000);
    child.once('error', () => { clearTimeout(timer); reject(new Error('COMMAND_UNAVAILABLE')); });
    child.once('exit', code => { clearTimeout(timer); code === 0 ? resolveResult(output) : reject(new Error('COMMAND_FAILED')); });
  });
}
export async function infraAction(action, ids = infra) {
  if (!ids.length || ids.some(id => !infra.includes(id))) throw new Error('UNKNOWN_INFRA');
  const args = { start: ['up', '-d', '--no-deps'], stop: ['stop'], status: ['ps', '--all', '--format', 'json'] }[action];
  if (!args) throw new Error('UNKNOWN_ACTION');
  return execute('docker', ['compose', '-p', 'agentic-crm', '-f', 'compose.yaml', '-f', 'compose.host.yaml', ...args, ...ids]);
}
export async function init() {
  const base = await readEnv('.env');
  if (!['development', 'test'].includes(base.APP_ENV)) throw new Error('LOCAL_ENV_REQUIRED');
  await mkdir(resolve(root, '.local/services'), { recursive: true });
  const db = Object.fromEntries(['MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD'].map(key => [key, base[key] ?? '']));
  const common = { APP_ENV: 'development', ...db, MYSQL_HOST: '127.0.0.1', MYSQL_PORT: base.LOCAL_MYSQL_PORT || '13306', REDIS_HOST: '127.0.0.1', REDIS_PORT: base.LOCAL_REDIS_PORT || '16379', KAFKA_BROKERS: '' };
  const files = {
    api: { ...common, PORT: '3001', APP_ORIGIN: base.APP_ORIGIN || 'http://localhost:3000', MYSQL_AUTH_USER:base.MYSQL_AUTH_USER, MYSQL_AUTH_PASSWORD:base.MYSQL_AUTH_PASSWORD, SESSION_ENCRYPTION_KEY: base.SESSION_ENCRYPTION_KEY },
    worker: { ...common, PORT: '3002' },
    web: { APP_ENV: 'development', PORT: new URL(base.APP_ORIGIN || 'http://localhost:3000').port || '80', API_INTERNAL_URL: 'http://127.0.0.1:3001', KAFKA_BROKERS: '' },
  };
  for (const [id, listen] of [['connector-api', '3010'], ['connector-worker', '3011']]) files[id] = { APP_ENV: 'development', PORT: listen, CONNECTOR_DB_HOST: '127.0.0.1', CONNECTOR_DB_PORT: '13307', CONNECTOR_DB_NAME: 'crm_connector', CONNECTOR_DB_USER: 'connector_app', CONNECTOR_DB_PASSWORD: '', CONNECTOR_REMOTE_ORIGIN: 'http://127.0.0.1:3001', CONNECTOR_ALLOW_HTTP: 'true', REDIS_HOST: '127.0.0.1', REDIS_PORT: '16379', KAFKA_BROKERS: '' };
  for (const [id, env] of Object.entries(files)) {
    const content = '# Private local configuration. Never commit.\n' + Object.entries(env).map(([key, value]) => `${key}=${JSON.stringify(value ?? '')}`).join('\n') + '\n';
    try { await writeFile(resolve(root, envPath(id)), content, { flag: 'wx', mode: 0o600 }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
}
