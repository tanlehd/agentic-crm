import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';

// Auth-only local fixture; no tenant memberships. Never print provider bodies or credentials.
async function provision() {
  const env = parseEnv(await readFile('.env', 'utf8'));
  const origin = new URL(env.APP_ORIGIN);
  if (!['development', 'test'].includes(env.APP_ENV) || !['localhost', '127.0.0.1'].includes(origin.hostname) || origin.protocol !== 'http:') throw new Error('Local environment required');
  if (!env.OIDC_CLIENT_SECRET || !env.AUTH_DEMO_PASSWORD) throw new Error('Run env:init first');
  const base = `${origin.origin}/identity`;
  const response = await fetch(`${base}/realms/master/protocol/openid-connect/token`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000), body: new URLSearchParams({ grant_type: 'password', client_id: 'admin-cli', username: 'local_admin', password: env.KEYCLOAK_ADMIN_PASSWORD }) });
  if (!response.ok) throw new Error('Local IdP admin authentication failed');
  const { access_token: token } = await response.json();
  const api = async (path, method = 'GET', body) => {
    const result = await fetch(`${base}/admin/realms/agentic-crm-dev/${path}`, { method, redirect: 'error', signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!result.ok) throw new Error(`Local IdP provision HTTP ${result.status}`);
    return result.status === 204 || result.status === 201 ? null : result.json();
  };
  const client = { clientId: 'agentic-crm-web', enabled: true, protocol: 'openid-connect', publicClient: false, clientAuthenticatorType: 'client-secret', secret: env.OIDC_CLIENT_SECRET, standardFlowEnabled: true, directAccessGrantsEnabled: false, serviceAccountsEnabled: false, implicitFlowEnabled: false, redirectUris: [`${origin.origin}/auth/callback`], webOrigins: [origin.origin], attributes: { 'pkce.code.challenge.method': 'S256', 'id.token.signed.response.alg': 'RS256' } };
  const clients = await api('clients?clientId=agentic-crm-web');
  await api(clients.length ? `clients/${clients[0].id}` : 'clients', clients.length ? 'PUT' : 'POST', client);
  const users = await api('users?username=auth_demo&exact=true');
  const user = { username: 'auth_demo', enabled: true, firstName: 'Auth', lastName: 'Demo', email: 'auth-demo@example.invalid', emailVerified: true, requiredActions: [] };
  await api(users.length ? `users/${users[0].id}` : 'users', users.length ? 'PUT' : 'POST', user);
  const [created] = await api('users?username=auth_demo&exact=true');
  await api(`users/${created.id}/reset-password`, 'PUT', { type: 'password', temporary: false, value: env.AUTH_DEMO_PASSWORD });
  console.log('PASS: local OIDC confidential client + auth_demo provisioned; no tenant membership. Credentials stay in .env.');
}
provision().catch(() => { console.error('Local auth provisioning failed. Check Keycloak readiness, local .env and admin credential; no provider response logged.'); process.exitCode = 1; });
