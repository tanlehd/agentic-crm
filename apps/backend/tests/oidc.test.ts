import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { OidcProvider } from '../src/modules/identity/auth/oidc.js';
import type { AuthConfig } from '../src/modules/identity/auth/security.js';
const config: AuthConfig = { origin: 'http://localhost:8080', issuer: 'http://localhost:8080/identity/realms/test', backchannel: 'http://keycloak:8080/identity/realms/test', clientId: 'agentic-crm-web', clientSecret: 'synthetic-secret', encryptionKey: '12'.repeat(32), secure: false };
let pair: Awaited<ReturnType<typeof generateKeyPair>>, jwk: Awaited<ReturnType<typeof exportJWK>>;
beforeAll(async () => { pair = await generateKeyPair('RS256'); jwk = { ...await exportJWK(pair.publicKey), kid: 'test', alg: 'RS256', use: 'sig' }; });
afterEach(() => vi.unstubAllGlobals());
async function token(claims: Record<string, unknown> = {}, wrongKey = false) {
  return new SignJWT({ iss: config.issuer, aud: config.clientId, sub: 'synthetic-user', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300, nonce: 'nonce-test', ...claims }).setProtectedHeader({ alg: 'RS256', kid: 'test' }).sign(wrongKey ? (await generateKeyPair('RS256')).privateKey : pair.privateKey);
}
describe('OIDC signature and claims', () => {
  it('verifies public issuer with allowlisted private JWKS fetch', async () => {
    const fetcher = vi.fn(async () => Response.json({ keys: [jwk] })); vi.stubGlobal('fetch', fetcher);
    const provider = new OidcProvider(config);
    expect((await provider.verify(await token(), 'nonce-test')).sub).toBe('synthetic-user');
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(`${config.backchannel}/protocol/openid-connect/certs`);
  });
  it.each([{ iss: 'http://evil.invalid' }, { aud: 'other' }, { exp: 1 }, { nonce: 'wrong' }, { azp: 'other' }, { sub: '' }, { exp: undefined }, { iat: Math.floor(Date.now() / 1000) + 3600 }])('rejects invalid signed claims %j', async claims => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ keys: [jwk] })));
    await expect(new OidcProvider(config).verify(await token(claims), 'nonce-test')).rejects.toMatchObject({ status: 400, code: 'AUTH_CALLBACK_INVALID' });
  });
  it('rejects bad signature and unsigned JWT', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ keys: [jwk] })));
    const provider = new OidcProvider(config);
    await expect(provider.verify(await token({}, true), 'nonce-test')).rejects.toMatchObject({ status: 400 });
    await expect(provider.verify('eyJhbGciOiJub25lIn0.e30.', 'nonce-test')).rejects.toMatchObject({ status: 400 });
  });
  it('sends code/verifier only through private backchannel with bounded redirect policy', async () => {
    const signed = await token();
    const fetcher = vi.fn(async (url: string | URL, options?: RequestInit) => {
      if (String(url).endsWith('/certs')) return Response.json({ keys: [jwk] });
      const body = options?.body as URLSearchParams;
      expect(body.get('code_verifier')).toBe('verifier'); expect(body.get('client_secret')).toBe(config.clientSecret); expect(options?.redirect).toBe('error');
      return Response.json({ access_token: 'test-access', refresh_token: 'test-refresh', id_token: signed, expires_in: 300, token_type: 'Bearer' });
    });
    vi.stubGlobal('fetch', fetcher);
    await expect(new OidcProvider(config).exchange('code', 'verifier', 'nonce-test')).resolves.toMatchObject({ identity: { subject: 'synthetic-user' } });
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(`${config.backchannel}/protocol/openid-connect/token`);
  });
});
