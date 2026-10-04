// Executed only by auth-e2e inside the local API container, never exposed as an HTTP route.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const { action, id } = JSON.parse(readFileSync(0, 'utf8'));
assert.equal(process.env.APP_ENV, 'development');
const { RedisAuthStore } = await import('./dist/modules/identity/auth/store.js');
const { SessionCrypto, hash, IDLE_MS, ABSOLUTE_MS, authConfig } = await import('./dist/modules/identity/auth/security.js');
const { MysqlAccounts } = await import('./dist/modules/identity/auth/service.js');
const { OidcProvider } = await import('./dist/modules/identity/auth/oidc.js');
const store = new RedisAuthStore();
await new Promise((resolve, reject) => { if (store.redis.status === 'ready') resolve(); else { store.redis.once('ready', resolve); store.redis.once('error', reject); } });
const crypto = new SessionCrypto(process.env.SESSION_ENCRYPTION_KEY);
try {
  if (action === 'store') {
    const key = `auth:test:${randomUUID()}`;
    try {
      await store.set(key, JSON.stringify({ binding: 'test-binding', payload: 'test-only' }), 3000);
      assert((await store.redis.pttl(key)) > 0);
      assert.equal(await store.consume(key, 'wrong'), null);
      const consumed = await Promise.all([store.consume(key, 'test-binding'), store.consume(key, 'test-binding')]);
      assert.equal(consumed.filter(Boolean).length, 1);
      await store.set(key, 'old', 3000); assert(await store.update(key, 'old', 'new', 2000));
      assert(!await store.update(key, 'old', 'bad', 2000));
      await store.remove(key); assert(!await store.update(key, 'new', 'resurrected', 2000));
      assert(await store.lock(key, 'owner')); assert(!await store.lock(key, 'other'));
      await store.unlock(key, 'other'); assert.equal(await store.get(key), 'owner'); await store.unlock(key, 'owner');
    } finally { await store.remove(key); }
  } else if (action === 'accounts') {
    const accounts = new MysqlAccounts(); const subject = `auth-test-${randomUUID()}`;
    const issuer = authConfig().issuer;
    const identity = { subject, displayName: 'Synthetic isolation', email: 'synthetic@example.invalid' };
    const { createPool } = await import('mysql2/promise');
    const pool = createPool({ host: process.env.MYSQL_HOST, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE });
    try {
      const [a, b] = await Promise.all([accounts.resolve(issuer, identity), accounts.resolve(issuer, identity)]);
      assert.equal(a.account_id, b.account_id);
      const c = await accounts.resolve(issuer + '/synthetic-other', identity); assert.notEqual(a.account_id, c.account_id);
      const d = await accounts.resolve(issuer, { ...identity, subject: subject + '-second' }); assert.notEqual(a.account_id, d.account_id);
    } finally { await pool.execute('DELETE FROM account WHERE subject IN (?,?) AND issuer IN (?,?)', [subject, subject + '-second', issuer, issuer + '/synthetic-other']); await accounts.close(); await pool.end(); }
  } else {
    assert.match(id, /^[A-Za-z0-9_-]{43}$/);
    const key = `auth:session:${hash(id)}`, raw = await store.get(key); assert(raw);
    const session = crypto.open(raw);
    assert(!raw.includes(session.tokens.access_token)); assert.equal(session.display_name, 'Auth Demo');
    if (action === 'expire-idle') session.last_seen_at = Date.now() - IDLE_MS - 1;
    else if (action === 'expire-absolute') { session.created_at = Date.now() - ABSOLUTE_MS - 1; session.absolute_expires_at = Date.now() - 1; }
    else if (action === 'refresh' || action === 'revoke') {
      if (action === 'revoke') await new OidcProvider(authConfig()).revoke(session.tokens);
      session.tokens.expires_at = 0;
    } else if (action === 'lost') { await store.remove(key); }
    else throw new Error('Unknown test action');
    if (action !== 'lost') assert(await store.update(key, raw, crypto.seal(session), 60000));
  }
  console.log(`PASS: runtime ${action}`);
} finally { store.close(); }
