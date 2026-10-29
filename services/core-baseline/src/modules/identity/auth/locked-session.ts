import type { TransactionScope } from '../../../kernel/tenancy/unit-of-work.js';
import { PLATFORM_TENANT_ID } from '../../../kernel/database/system-scope.js';
import { AuthError, IDLE_MS } from './security.js';

// Internal verifier reference only. Never expose it as a dispatch wire field.
// Caller holds the business tenant lock before acquiring account -> session.
export async function lockedNativeSession(scope: TransactionScope, verifier: string) {
  if (!/^[a-f0-9]{64}$/.test(verifier)) throw new AuthError(401, 'AUTH_SESSION_REQUIRED');
  const [lookup] = await scope.query('SELECT account_id FROM auth_session WHERE tenant_id=? AND token_hash=?', [PLATFORM_TENANT_ID, verifier]);
  if (!lookup) throw new AuthError(401, 'AUTH_SESSION_REQUIRED');
  const [account] = await scope.query('SELECT id,native_status,security_revision FROM account WHERE tenant_id=? AND id=? FOR SHARE', [PLATFORM_TENANT_ID, lookup.account_id]);
  const [session] = await scope.query('SELECT account_id,security_revision,revoked_at,last_seen_at,absolute_expires_at FROM auth_session WHERE tenant_id=? AND token_hash=? FOR SHARE', [PLATFORM_TENANT_ID, verifier]);
  // A lock wait may outlive the session; obtain time only after both locks.
  const [clock] = await scope.query('SELECT FLOOR(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000) AS now_ms');
  const now = Number(clock.now_ms);
  if (!account || !session || session.account_id !== account.id || account.native_status !== 'active' ||
      String(account.security_revision) !== String(session.security_revision) || session.revoked_at !== null ||
      Number(session.absolute_expires_at) <= now || Number(session.last_seen_at) <= now - IDLE_MS) {
    throw new AuthError(401, 'AUTH_SESSION_REQUIRED');
  }
  return { accountId: String(account.id), securityRevision: String(account.security_revision), now };
}
