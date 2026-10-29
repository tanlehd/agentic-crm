import { createRemoteJWKSet, customFetch, jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';
import { AuthError, equal } from './security.js';
import type { AuthConfig } from './security.js';
export interface Tokens { access_token: string; refresh_token: string; id_token: string; expires_at: number }
export interface Identity { subject: string; displayName: string; email: string | null }
export interface IdentityProvider {
  exchange(code: string, verifier: string, nonce: string): Promise<{ tokens: Tokens; identity: Identity }>;
  refresh(tokens: Tokens, subject: string): Promise<Tokens>;
  revoke(tokens: Tokens): Promise<void>;
}
export class OidcProvider implements IdentityProvider {
  private readonly jwks;
  constructor(private readonly config: AuthConfig) {
    this.jwks = createRemoteJWKSet(new URL(`${config.backchannel}/protocol/openid-connect/certs`), {
      timeoutDuration: 3000,
      [customFetch]: (url, options) => fetch(url, { ...options, redirect: 'error' }),
    });
  }
  private async post(path: string, parameters: Record<string, string>): Promise<Response> {
    try {
      return await fetch(`${this.config.backchannel}/protocol/openid-connect/${path}`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ ...parameters, client_id: this.config.clientId, client_secret: this.config.clientSecret }),
      });
    } catch { throw new AuthError(503, 'AUTH_PROVIDER_UNAVAILABLE'); }
  }
  private async token(parameters: Record<string, string>, refresh = false): Promise<Tokens> {
    const res = await this.post('token', parameters);
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    if (!res.ok) {
      if (refresh && body.error === 'invalid_grant') throw new AuthError(401, 'AUTH_SESSION_EXPIRED');
      throw new AuthError(res.status >= 500 ? 503 : 400, res.status >= 500 ? 'AUTH_PROVIDER_UNAVAILABLE' : 'AUTH_CALLBACK_INVALID');
    }
    if (typeof body.access_token !== 'string' || typeof body.refresh_token !== 'string' || typeof body.id_token !== 'string' || typeof body.expires_in !== 'number' || body.expires_in <= 0 || body.token_type !== 'Bearer') throw new AuthError(503, 'AUTH_PROVIDER_UNAVAILABLE');
    return { access_token: body.access_token, refresh_token: body.refresh_token, id_token: body.id_token, expires_at: Date.now() + body.expires_in * 1000 };
  }
  async verify(idToken: string, nonce?: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(idToken, this.jwks, { issuer: this.config.issuer, audience: this.config.clientId, algorithms: ['RS256'], requiredClaims: ['exp', 'iat', 'sub'], maxTokenAge: '10m' });
      if (typeof payload.sub !== 'string' || !/^[\x21-\x7e]{1,255}$/.test(payload.sub) || (payload.azp !== undefined && payload.azp !== this.config.clientId) || (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== this.config.clientId) || (nonce !== undefined && (typeof payload.nonce !== 'string' || !equal(payload.nonce, nonce)))) throw new Error('claims');
      return payload;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (error instanceof TypeError || code === 'ERR_JWKS_TIMEOUT' || code === 'ERR_JOSE_GENERIC') throw new AuthError(503, 'AUTH_PROVIDER_UNAVAILABLE');
      throw new AuthError(400, 'AUTH_CALLBACK_INVALID');
    }
  }
  async exchange(code: string, verifier: string, nonce: string) {
    const tokens = await this.token({ grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: `${this.config.origin}/auth/callback` });
    const claims = await this.verify(tokens.id_token, nonce);
    return { tokens, identity: { subject: claims.sub!, displayName: typeof claims.name === 'string' ? claims.name.slice(0, 255) : 'CRM Account', email: typeof claims.email === 'string' && claims.email.length <= 254 ? claims.email : null } };
  }
  async refresh(tokens: Tokens, subject: string) {
    const next = await this.token({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token }, true);
    const claims = await this.verify(next.id_token);
    if (claims.sub !== subject) throw new AuthError(401, 'AUTH_SESSION_EXPIRED');
    return next;
  }
  async revoke(tokens: Tokens) { await this.post('revoke', { token: tokens.refresh_token, token_type_hint: 'refresh_token' }); }
}
