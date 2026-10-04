import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export class AuthError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}
export const opaque = () => randomBytes(32).toString('base64url');
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const equal = (a: string, b: string) => timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
export const validOpaque = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
export const IDLE_MS = 8 * 3600_000;
export const ABSOLUTE_MS = 24 * 3600_000;
export function returnPath(value: unknown): string {
  if (value === undefined) return '/';
  if (typeof value !== 'string' || value.length > 2048) throw new AuthError(400, 'AUTH_RETURN_TO_INVALID');
  let decoded = value;
  for (let i = 0; i < 4; i++) {
    if (!decoded.startsWith('/') || decoded.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(decoded)) throw new AuthError(400, 'AUTH_RETURN_TO_INVALID');
    let next: string;
    try { next = decodeURIComponent(decoded); } catch { throw new AuthError(400, 'AUTH_RETURN_TO_INVALID'); }
    if (next === decoded) return value;
    decoded = next;
  }
  throw new AuthError(400, 'AUTH_RETURN_TO_INVALID');
}
export interface AuthConfig { origin: string; issuer: string; backchannel: string; clientId: string; clientSecret: string; encryptionKey: string; secure: boolean }
export function authConfig(env = process.env): AuthConfig {
  const origin = env.APP_ORIGIN ?? 'http://localhost:8080';
  const url = new URL(origin);
  const local = ['development', 'test'].includes(env.APP_ENV ?? '') && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.origin !== origin || url.username || url.password || (!local && url.protocol !== 'https:')) throw new Error('Invalid auth origin');
  const issuer = env.OIDC_ISSUER ?? `${origin}/identity/realms/agentic-crm-dev`;
  const backchannel = env.OIDC_BACKCHANNEL ?? 'http://keycloak:8080/identity/realms/agentic-crm-dev';
  for (const endpoint of [issuer, backchannel]) {
    const parsed = new URL(endpoint);
    if (parsed.username || parsed.password || parsed.search || parsed.hash || endpoint.endsWith('/') || (!local && parsed.protocol !== 'https:') || !['https:', 'http:'].includes(parsed.protocol)) throw new Error('Invalid OIDC endpoint');
  }
  if (new URL(issuer).pathname !== new URL(backchannel).pathname) throw new Error('OIDC realm mismatch');
  if (!env.OIDC_CLIENT_SECRET || !/^[a-f0-9]{64}$/.test(env.SESSION_ENCRYPTION_KEY ?? '')) throw new Error('Missing auth secrets; run env:init');
  return { origin, issuer, backchannel, clientId: 'agentic-crm-web', clientSecret: env.OIDC_CLIENT_SECRET, encryptionKey: env.SESSION_ENCRYPTION_KEY!, secure: url.protocol === 'https:' };
}
export class SessionCrypto {
  private readonly key: Buffer;
  private readonly csrfKey: Buffer;
  constructor(hex: string) {
    if (!/^[a-f0-9]{64}$/.test(hex)) throw new Error('Invalid session key');
    this.key = Buffer.from(hex, 'hex');
    this.csrfKey = createHmac('sha256', this.key).update('crm-csrf-v1').digest();
  }
  csrf(id: string) { return createHmac('sha256', this.csrfKey).update(id).digest('base64url'); }
  seal(value: unknown): string {
    const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
  }
  open<T>(value: string): T {
    const raw = Buffer.from(value, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', this.key, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8')) as T;
  }
}
