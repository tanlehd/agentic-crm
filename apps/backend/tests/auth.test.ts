import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../src/modules/identity/auth/service.js';
import { ABSOLUTE_MS, AuthError, authConfig, hash, IDLE_MS, opaque, returnPath, SessionCrypto } from '../src/modules/identity/auth/security.js';
import type { AuthConfig } from '../src/modules/identity/auth/security.js';
import type { AuthStore } from '../src/modules/identity/auth/store.js';
import type { IdentityProvider } from '../src/modules/identity/auth/oidc.js';
const config: AuthConfig = { origin: 'http://localhost:8080', issuer: 'http://localhost:8080/identity/realms/test', backchannel: 'http://keycloak:8080/identity/realms/test', clientId: 'agentic-crm-web', clientSecret: 'synthetic-test', encryptionKey: '12'.repeat(32), secure: false };
class MemoryStore implements AuthStore {
  values = new Map<string, string>(); locks = new Set<string>();
  async get(key: string) { return this.values.get(key) ?? null; }
  async set(key: string, value: string) { this.values.set(key, value); }
  async consume(key: string, binding: string) { const raw = this.values.get(key); if (!raw) return null; const value = JSON.parse(raw); if (value.binding !== binding) return null; this.values.delete(key); return value.payload as string; }
  async update(key: string, old: string, value: string) { if (this.values.get(key) !== old) return false; this.values.set(key, value); return true; }
  async remove(key: string) { this.values.delete(key); }
  async lock(key: string) { if (this.locks.has(key)) return false; this.locks.add(key); return true; }
  async unlock(key: string) { this.locks.delete(key); }
}
function fixture() {
  let now = 1000000;
  const store = new MemoryStore();
  const tokens = { access_token: 'sensitive-access', refresh_token: 'sensitive-refresh', id_token: 'sensitive-id', expires_at: now + 3600_000 };
  const provider: IdentityProvider = { exchange: vi.fn(async () => ({ tokens, identity: { subject: 'subject-1', displayName: 'Synthetic', email: null } })), refresh: vi.fn(async () => ({ ...tokens, expires_at: now + 3600_000 })), revoke: vi.fn(async () => {}) };
  const accounts = { resolve: vi.fn(async () => ({ account_id: 'id-1', display_name: 'Synthetic' })) };
  const service = new AuthService(config, store, provider, accounts, () => now);
  const login = async (old?: string) => { const flow = await service.login('/'); const state = new URL(flow.location).searchParams.get('state'); return service.callback(state, flow.browser, 'synthetic-code', undefined, old); };
  return { service, store, provider, accounts, login, advance: (ms: number) => { now += ms; } };
}
describe('auth security and session lifecycle', () => {
  it('admin mutation CSRF validates before refresh/touch and returns session account only after validation', async () => {
    const f=fixture(),login=await f.login(),csrf=await f.service.csrf(login.id);
    f.advance(1000);
    for(const [origin,token] of [[undefined,csrf],['http://evil.invalid',csrf],[config.origin,'wrong']])await expect(f.service.requireMutation(login.id,origin,token)).rejects.toMatchObject({status:403});
    expect((await f.service.session(login.id)).last_seen_at).toBe(login.session.last_seen_at);
    expect((await f.service.requireMutation(login.id,config.origin,csrf)).account_id).toBe('id-1');
    expect((await f.service.session(login.id)).last_seen_at).toBeGreaterThan(login.session.last_seen_at);
  });
  it('rejects external, encoded and malformed redirects', () => {
    for (const value of ['https://bad.invalid', '//bad.invalid', '/\\bad', '/%5cbad', '/%2fexample.invalid', '/%0aLocation:evil', '/%252fexample.invalid', '/%zz', ['/', '//bad']]) expect(() => returnPath(value)).toThrow(AuthError);
    expect(returnPath('/crm?tab=mine')).toBe('/crm?tab=mine'); expect(returnPath(undefined)).toBe('/');
  });
  it('requires secure non-local configuration and exact realm paths', () => {
    const env = { APP_ENV: 'production', APP_ORIGIN: config.origin, OIDC_CLIENT_SECRET: 'test', SESSION_ENCRYPTION_KEY: config.encryptionKey };
    expect(() => authConfig(env)).toThrow();
    expect(() => authConfig({ ...env, APP_ENV: 'development' })).not.toThrow();
    expect(() => authConfig({ ...env, APP_ENV: 'development', OIDC_BACKCHANNEL: 'http://keycloak/other' })).toThrow();
  });
  it('encrypts payload with fresh IV and detects tampering/wrong key', () => {
    const crypto = new SessionCrypto(config.encryptionKey), encrypted = crypto.seal({ token: 'sensitive' });
    expect(encrypted).not.toContain('sensitive'); expect(crypto.seal({ token: 'sensitive' })).not.toBe(encrypted);
    expect(crypto.open(encrypted)).toEqual({ token: 'sensitive' });
    expect(() => new SessionCrypto('34'.repeat(32)).open(encrypted)).toThrow();
    const raw = Buffer.from(encrypted, 'base64url'); raw[raw.length - 1]! ^= 1;
    expect(() => crypto.open(raw.toString('base64url'))).toThrow();
  });
  it('binds state to browser, preserves legitimate flow on mismatch, consumes once and rotates session', async () => {
    const f = fixture(), previous = await f.login();
    const flow = await f.service.login('/crm'); const url = new URL(flow.location), state = url.searchParams.get('state');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256'); expect(url.searchParams.get('prompt')).toBe('login');
    await expect(f.service.callback(state, opaque(), 'code', undefined)).rejects.toMatchObject({ status: 400 });
    const next = await f.service.callback(state, flow.browser, 'code', undefined, previous.id);
    expect(next.id).not.toBe(previous.id); expect(next.returnTo).toBe('/crm');
    await expect(f.service.session(previous.id)).rejects.toMatchObject({ status: 401 });
    await expect(f.service.callback(state, flow.browser, 'code', undefined)).rejects.toMatchObject({ status: 400 });
    expect([...f.store.values.keys()].some(key => key.includes(next.id))).toBe(false);
    expect([...f.store.values.values()].join('')).not.toContain('sensitive-access');
  });
  it('rejects expired state and provider error before account creation', async () => {
    const f = fixture(), flow = await f.service.login('/');
    f.advance(600000);
    await expect(f.service.callback(new URL(flow.location).searchParams.get('state'), flow.browser, 'code', undefined)).rejects.toMatchObject({ status: 400 });
    expect(f.accounts.resolve).not.toHaveBeenCalled();
    const second = await f.service.login('/');
    await expect(f.service.callback(new URL(second.location).searchParams.get('state'), second.browser, undefined, 'access_denied')).rejects.toMatchObject({ status: 400 });
  });
  it('does not create a session when token validation/exchange fails', async () => {
    const f = fixture(); vi.mocked(f.provider.exchange).mockRejectedValue(new AuthError(400, 'AUTH_CALLBACK_INVALID'));
    await expect(f.login()).rejects.toMatchObject({ status: 400 }); expect(f.store.values.size).toBe(0); expect(f.accounts.resolve).not.toHaveBeenCalled();
  });
  it('rejects CSRF/origin mismatches without touching idle deadline', async () => {
    const f = fixture(), login = await f.login(), csrf = await f.service.csrf(login.id);
    f.advance(1000);
    for (const [origin, token] of [[undefined, csrf], ['http://evil.invalid', csrf], [config.origin, 'wrong']]) await expect(f.service.logout(login.id, origin, token)).rejects.toMatchObject({ status: 403 });
    expect((await f.service.session(login.id)).last_seen_at).toBe(login.session.last_seen_at);
    expect(await f.service.csrf(login.id)).toBe(csrf); expect(f.provider.revoke).not.toHaveBeenCalled();
  });
  it('expires at idle/absolute deadlines and CSRF retrieval never extends idle', async () => {
    const f = fixture(), first = await f.login();
    f.advance(IDLE_MS - 1); await f.service.csrf(first.id); f.advance(1);
    await expect(f.service.session(first.id, true)).rejects.toMatchObject({ status: 401 });
    const second = await f.login();
    for (let i = 0; i < 3; i++) { f.advance(7 * 3600_000); await f.service.session(second.id, true); }
    f.advance(ABSOLUTE_MS - 21 * 3600_000);
    await expect(f.service.session(second.id, true)).rejects.toMatchObject({ status: 401 });
  });
  it('refreshes once under concurrent access and invalidates on revocation', async () => {
    const f = fixture(), login = await f.login(); f.advance(3600_000);
    const outcomes = await Promise.allSettled([f.service.session(login.id), f.service.session(login.id)]);
    expect(outcomes.filter(x => x.status === 'fulfilled')).toHaveLength(1); expect(f.provider.refresh).toHaveBeenCalledTimes(1);
    f.advance(3600_000); vi.mocked(f.provider.refresh).mockRejectedValue(new AuthError(401, 'AUTH_SESSION_EXPIRED'));
    await expect(f.service.session(login.id)).rejects.toMatchObject({ status: 401 }); expect(f.store.values.has(`auth:session:${hash(login.id)}`)).toBe(false);
  });
  it('keeps transient provider failure retryable without extending idle', async () => {
    const f = fixture(), login = await f.login(); f.advance(3600_000);
    vi.mocked(f.provider.refresh).mockRejectedValue(new AuthError(503, 'AUTH_PROVIDER_UNAVAILABLE'));
    await expect(f.service.session(login.id, true)).rejects.toMatchObject({ status: 503 });
    expect(f.service.crypto.open<{ last_seen_at: number }>((await f.store.get(`auth:session:${hash(login.id)}`))!).last_seen_at).toBe(login.session.last_seen_at);
  });
  it('logs out locally even when IdP fails and prevents in-flight refresh resurrection', async () => {
    const f = fixture(), login = await f.login(), csrf = await f.service.csrf(login.id); f.advance(3600_000);
    let finish!: () => void;
    vi.mocked(f.provider.refresh).mockImplementation(async tokens => { await new Promise<void>(resolve => { finish = resolve; }); return { ...tokens, expires_at: 999999999 }; });
    vi.mocked(f.provider.revoke).mockRejectedValue(new Error('offline'));
    const refresh = f.service.session(login.id, true);
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    await f.service.logout(login.id, config.origin, csrf); finish();
    await expect(refresh).rejects.toMatchObject({ status: 401 }); await expect(f.service.session(login.id)).rejects.toMatchObject({ status: 401 });
  });
  it('fails closed when Redis is unavailable then requires login after state loss', async () => {
    const f = fixture(), login = await f.login();
    const spy = vi.spyOn(f.store, 'get').mockRejectedValue(new AuthError(503, 'AUTH_STORE_UNAVAILABLE'));
    await expect(f.service.session(login.id)).rejects.toMatchObject({ status: 503 }); spy.mockRestore(); f.store.values.clear();
    await expect(f.service.session(login.id)).rejects.toMatchObject({ status: 401 });
  });
});
