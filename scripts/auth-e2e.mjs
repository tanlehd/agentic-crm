import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
const env = parseEnv(await readFile('.env', 'utf8'));
const origin = env.APP_ORIGIN;
const ajv = addFormats(new Ajv());
const sessionSchema = ajv.compile(JSON.parse(await readFile('packages/contracts/schemas/auth-session.json', 'utf8')));
const csrfSchema = ajv.compile(JSON.parse(await readFile('packages/contracts/schemas/auth-csrf.json', 'utf8')));
const errorSchema = ajv.compile(JSON.parse(await readFile('packages/contracts/schemas/auth-error.json', 'utf8')));
assert.equal(env.APP_ENV, 'development');
assert(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const runtimeSource = await readFile('scripts/auth-runtime-check.mjs', 'utf8');
function runtime(action, id) {
  const child = spawnSync('docker', ['compose', 'exec', '-T', 'api', 'node', '--input-type=module', '-e', runtimeSource], { input: JSON.stringify({ action, id }), encoding: 'utf8', timeout: 20000 });
  // Never forward subprocess errors: they may contain source context or provider details.
  assert.equal(child.status, 0, `runtime ${action} failed`);
  console.log(`PASS: real Redis/MySQL ${action}`);
}
await mkdir('artifacts/SRC-006', { recursive: true });
const browser = await chromium.launch({ channel: process.env.E2E_BROWSER_CHANNEL ?? 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1360, height: 1000 } });
const page = await context.newPage();
const request = context.request;
let callbackUrl;
page.on('request', req => { if (req.url().startsWith(`${origin}/auth/callback?`)) callbackUrl = req.url(); });
const status = async (path, expected, options) => { const res = await request.get(`${origin}${path}`, options); assert.equal(res.status(), expected, `${path.split('?')[0]} status`); if (expected >= 400) assert(errorSchema(await res.json()), 'auth error contract'); return res; };
async function login() {
  await page.goto(origin);
  await page.getByRole('link', { name: 'Đăng nhập', exact: true }).click();
  await page.locator('#password').waitFor();
  if (await page.locator('#username').isVisible()) await page.locator('#username').fill('auth_demo');
  await page.locator('#password').fill(env.AUTH_DEMO_PASSWORD);
  await page.locator('#kc-login').click();
  await page.waitForURL(origin + '/', { timeout: 20000 });
  await page.getByText('Đã đăng nhập: Auth Demo', { exact: true }).waitFor();
  const cookies = await context.cookies(origin);
  const session = cookies.find(c => c.name === 'crm_session');
  assert(session?.httpOnly); assert.equal(session.sameSite, 'Lax'); assert.equal(session.secure, false);
  assert(!cookies.some(c => c.name === 'crm_login'));
  const res = await status('/auth/session', 200); assert.equal(res.headers()['cache-control'], 'no-store');
  const body = await res.json(); assert(sessionSchema(body), 'session contract'); assert.deepEqual(Object.keys(body.data).sort(), ['account_id', 'display_name', 'expires_at']);
  return session.value;
}
try {
  runtime('store'); runtime('accounts');
  await status('/auth/session', 401); await status('/auth/csrf', 401);
  await status('/auth/login?return_to=%2F%2Fevil.invalid', 400, { maxRedirects: 0 });
  await status('/auth/callback?state=wrong&code=wrong', 400);
  let id = await login(); console.log('PASS: browser Keycloak login + cookie flags + token-free session');
  assert(callbackUrl); const replay = await request.get(callbackUrl, { maxRedirects: 0 }); assert.equal(replay.status(), 400); console.log('PASS: callback replay rejected');
  const csrfResponse = await status('/auth/csrf', 200); const csrfBody = await csrfResponse.json(); assert(csrfSchema(csrfBody), 'csrf contract'); const csrf = csrfBody.data.csrf_token;
  const before = (await (await status('/auth/session', 200)).json()).data.account_id;
  for (const headers of [{ Origin: origin }, { Origin: 'http://evil.invalid', 'X-CSRF-Token': csrf }, { 'X-CSRF-Token': csrf }]) {
    const bad = await request.post(`${origin}/auth/logout`, { headers }); assert.equal(bad.status(), 403);
  }
  await status('/auth/session', 200); console.log('PASS: missing CSRF, wrong Origin, missing Origin denied');
  runtime('refresh', id); await status('/auth/session', 200); console.log('PASS: real Keycloak refresh via private hostname');
  try {
    assert.equal(spawnSync('docker', ['compose', 'pause', 'redis'], { stdio: 'ignore', timeout: 10000 }).status, 0);
    await status('/auth/session', 503); console.log('PASS: real Redis outage fails closed');
  } finally { assert.equal(spawnSync('docker', ['compose', 'unpause', 'redis'], { stdio: 'ignore', timeout: 10000 }).status, 0); }
  await status('/auth/session', 200); console.log('PASS: Redis recovery retains valid session');
  await page.screenshot({ path: 'artifacts/SRC-006/login.png', fullPage: true });
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await page.getByRole('link', { name: 'Đăng nhập', exact: true }).waitFor();
  await status('/auth/session', 401);
  const old = await fetch(`${origin}/auth/session`, { headers: { Cookie: `crm_session=${id}` } }); assert.equal(old.status, 401);
  console.log('PASS: browser logout + old session revoked');
  id = await login(); assert.equal((await (await status('/auth/session', 200)).json()).data.account_id, before);
  runtime('expire-idle', id); await status('/auth/session', 401); console.log('PASS: idle expiry');
  id = await login(); runtime('expire-absolute', id); await status('/auth/session', 401); console.log('PASS: absolute expiry');
  id = await login(); runtime('revoke', id); await status('/auth/session', 401); console.log('PASS: provider revocation invalidates session');
  id = await login(); runtime('lost', id); await status('/auth/session', 401); console.log('PASS: missing Redis session requires login');
  await page.reload(); await page.getByRole('link', { name: 'Đăng nhập', exact: true }).waitFor();
  await page.screenshot({ path: 'artifacts/SRC-006/logout.png', fullPage: true });
  console.log(`PASS: SRC-006 browser/runtime E2E; browser ${browser.version()}; host ${process.version}`);
} catch (error) {
  await page.screenshot({ path: 'artifacts/SRC-006/failure.png', fullPage: true }).catch(() => {});
  console.error(`Auth check failed: ${error.name}; page ${new URL(page.url()).pathname}`);
  console.error('FAIL: auth E2E. Sensitive assertion values, URLs and browser traces suppressed.'); process.exitCode = 1;
} finally { await context.close(); await browser.close(); }
