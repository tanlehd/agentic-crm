import { setTimeout as delay } from 'node:timers/promises';
import { createHash, randomUUID } from 'node:crypto';
import { createPool } from 'mysql2/promise';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { ABSOLUTE_MS, AuthError, equal, hash, IDLE_MS, opaque, returnPath, SessionCrypto, validOpaque } from './security.js';
import type { AuthConfig } from './security.js';
import type { Identity, IdentityProvider, Tokens } from './oidc.js';
import type { AuthStore } from './store.js';
export interface Account { account_id: string; display_name: string }
export interface Accounts { resolve(issuer: string, identity: Identity): Promise<Account> }
export class MysqlAccounts implements Accounts {
  private readonly pool: Pool;
  constructor() {
    this.pool = createPool({ host: process.env.MYSQL_HOST, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE, connectionLimit: 4, connectTimeout: 2000 });
  }
  async resolve(issuer: string, identity: Identity) {
    try {
      await this.pool.execute('INSERT INTO account (id,issuer,subject,display_name,email,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE display_name=?,email=?,updated_at=UTC_TIMESTAMP(6)', [randomUUID(), issuer, identity.subject, identity.displayName, identity.email, identity.displayName, identity.email]);
      const [rows] = await this.pool.execute<RowDataPacket[]>('SELECT id,display_name FROM account WHERE issuer=? AND subject=?', [issuer, identity.subject]);
      if (!rows[0]) throw new Error('Account missing');
      return { account_id: rows[0].id as string, display_name: rows[0].display_name as string };
    } catch { throw new AuthError(503, 'AUTH_ACCOUNT_UNAVAILABLE'); }
  }
  close() { return this.pool.end(); }
}
interface Login { nonce: string; verifier: string; returnTo: string; createdAt: number }
export interface Session extends Account { subject: string; created_at: number; last_seen_at: number; absolute_expires_at: number; csrf_hash: string; tokens: Tokens }
export class AuthService {
  readonly crypto: SessionCrypto;
  constructor(readonly config: AuthConfig, private readonly store: AuthStore, private readonly provider: IdentityProvider, private readonly accounts: Accounts, private readonly now = Date.now) { this.crypto = new SessionCrypto(config.encryptionKey); }
  async login(returnTo: unknown) {
    const path = returnPath(returnTo);
    const state = opaque(), browser = opaque(), nonce = opaque(), verifier = opaque();
    await this.store.set(`auth:login:${hash(state)}`, JSON.stringify({ binding: hash(browser), payload: this.crypto.seal({ nonce, verifier, returnTo: path, createdAt: this.now() } satisfies Login) }), 600_000);
    const url = new URL(`${this.config.issuer}/protocol/openid-connect/auth`);
    url.search = new URLSearchParams({ response_type: 'code', client_id: this.config.clientId, redirect_uri: `${this.config.origin}/auth/callback`, scope: 'openid profile email', state, nonce, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', prompt: 'login' }).toString();
    return { location: url.toString(), browser };
  }
  async callback(state: unknown, browser: unknown, code: unknown, providerError: unknown, oldId?: string) {
    if (!validOpaque(state) || !validOpaque(browser)) throw new AuthError(400, 'AUTH_CALLBACK_INVALID');
    const stored = await this.store.consume(`auth:login:${hash(state)}`, hash(browser));
    if (!stored) throw new AuthError(400, 'AUTH_CALLBACK_INVALID');
    let login: Login;
    try { login = this.crypto.open<Login>(stored); } catch { throw new AuthError(400, 'AUTH_CALLBACK_INVALID'); }
    if (providerError !== undefined || typeof code !== 'string' || !code || code.length > 4096 || login.createdAt + 600_000 <= this.now()) throw new AuthError(400, 'AUTH_CALLBACK_INVALID');
    const { tokens, identity } = await this.provider.exchange(code, login.verifier, login.nonce);
    const account = await this.accounts.resolve(this.config.issuer, identity);
    const id = opaque(), now = this.now();
    const session: Session = { ...account, subject: identity.subject, created_at: now, last_seen_at: now, absolute_expires_at: now + ABSOLUTE_MS, csrf_hash: hash(this.crypto.csrf(id)), tokens };
    if (validOpaque(oldId)) await this.store.remove(this.key(oldId));
    await this.store.set(this.key(id), this.crypto.seal(session), IDLE_MS);
    return { id, returnTo: login.returnTo, session };
  }
  private key(id: string) { return `auth:session:${hash(id)}`; }
  private async read(id: unknown) {
    if (!validOpaque(id)) throw new AuthError(401, 'AUTH_SESSION_REQUIRED');
    const key = this.key(id), raw = await this.store.get(key);
    if (!raw) throw new AuthError(401, 'AUTH_SESSION_REQUIRED');
    let session: Session;
    try { session = this.crypto.open<Session>(raw); } catch { await this.store.remove(key); throw new AuthError(401, 'AUTH_SESSION_EXPIRED'); }
    if (session.absolute_expires_at <= this.now() || session.last_seen_at + IDLE_MS <= this.now()) {
      await this.store.remove(key); throw new AuthError(401, 'AUTH_SESSION_EXPIRED');
    }
    return { id, key, raw, session };
  }
  async session(id: unknown, touch = false): Promise<Session> {
    const read = await this.read(id);
    if (read.session.tokens.expires_at > this.now() + 60_000 && !touch) return read.session;
    const lockKey = `${read.key}:lock`, lock = opaque();
    let acquired=await this.store.lock(lockKey,lock);
    for(let attempt=0;!acquired&&attempt<100;attempt++){await delay(25);acquired=await this.store.lock(lockKey,lock);}
    if(!acquired)throw new AuthError(503,'AUTH_SESSION_BUSY');
    try {
      const current = await this.read(read.id);
      if (current.session.tokens.expires_at <= this.now() + 60_000) {
        try { current.session.tokens = await this.provider.refresh(current.session.tokens, current.session.subject); }
        catch (error) {
          if (error instanceof AuthError && (error.status === 401 || error.status === 400)) { await this.store.remove(current.key); throw new AuthError(401, 'AUTH_SESSION_EXPIRED'); }
          throw error;
        }
      }
      const now = this.now();
      // Recheck deadlines after I/O; refresh never extends an expired session.
      if (current.session.absolute_expires_at <= now || current.session.last_seen_at + IDLE_MS <= now) { await this.store.remove(current.key); throw new AuthError(401, 'AUTH_SESSION_EXPIRED'); }
      if (touch) current.session.last_seen_at = now;
      const ttl = Math.min(current.session.last_seen_at + IDLE_MS, current.session.absolute_expires_at) - now;
      if (!await this.store.update(current.key, current.raw, this.crypto.seal(current.session), ttl)) throw new AuthError(401, 'AUTH_SESSION_EXPIRED');
      return current.session;
    } finally { await this.store.unlock(lockKey, lock); }
  }
  async csrf(id: unknown) { const session = await this.session(id); const token = this.crypto.csrf(id as string); if (!equal(hash(token), session.csrf_hash)) throw new AuthError(401, 'AUTH_SESSION_EXPIRED'); return token; }
  async requireMutation(id: unknown, origin: unknown, csrf: unknown) {
    if (origin !== this.config.origin || typeof csrf !== 'string' || csrf.length > 128) throw new AuthError(403, 'AUTH_CSRF_INVALID');
    const { session } = await this.read(id);
    if (!equal(hash(csrf), session.csrf_hash)) throw new AuthError(403, 'AUTH_CSRF_INVALID');
    return this.session(id, true);
  }
  async logout(id: unknown, origin: unknown, csrf: unknown) {
    // Validate CSRF before refresh/touch. Logout must also work after provider revocation.
    if (origin !== this.config.origin || typeof csrf !== 'string' || csrf.length > 128) throw new AuthError(403, 'AUTH_CSRF_INVALID');
    const { key, session } = await this.read(id);
    if (!equal(hash(csrf), session.csrf_hash)) throw new AuthError(403, 'AUTH_CSRF_INVALID');
    await this.store.remove(key);
    try { await this.provider.revoke(session.tokens); } catch { /* Local logout stays successful when IdP is unavailable. */ }
  }
}
