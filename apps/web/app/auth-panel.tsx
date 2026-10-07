'use client';
import { TenantPanel } from './tenant-panel';
import { useEffect, useState } from 'react';
interface Session { account_id: string; display_name: string; expires_at: string }
export function AuthPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  async function load() {
    setState('loading');
    try {
      const response = await fetch('/auth/session', { cache: 'no-store' });
      if (response.status === 401) setSession(null);
      else if (response.ok) setSession((await response.json()).data);
      else throw new Error('unavailable');
      setState('ready');
    } catch { setState('error'); }
  }
  useEffect(() => { void load(); }, []);
  async function logout() {
    setBusy(true);
    try {
      const csrf = await fetch('/auth/csrf', { cache: 'no-store' });
      if (csrf.status === 401) { setSession(null); setState('ready'); return; }
      if (!csrf.ok) throw new Error('unavailable');
      const response = await fetch('/auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': (await csrf.json()).data.csrf_token } });
      if (!response.ok && response.status !== 401) throw new Error('unavailable');
      setSession(null); setState('ready');
    } catch { setState('error'); } finally { setBusy(false); }
  }
  if(session&&state==='ready')return <TenantPanel key={session.account_id} userName={session.display_name} onLogout={()=>void logout()} logoutBusy={busy}/>;
  return <div className="ui-entry"><a className="brand" href="/"><span className="mark">a</span>agentic crm</a><section className="auth-panel" aria-label="Tài khoản">
    <div><h2>Tài khoản</h2><p role="status">{state === 'loading' ? 'Đang kiểm tra phiên đăng nhập…' : state === 'error' ? 'Chưa thể kết nối dịch vụ đăng nhập. Vui lòng thử lại.' : session ? `Đã đăng nhập: ${session.display_name}` : 'Đăng nhập để bắt đầu.'}</p>{session && <small>Quyền truy cập workspace sẽ được cấp theo tổ chức.</small>}</div>
    <div>{state === 'error' ? <button onClick={() => void load()} disabled={busy}>Thử lại</button> : state === 'ready' && !session ? <a href="/auth/login">Đăng nhập</a> : null}{session && <button onClick={() => void logout()} disabled={busy}>{busy ? 'Đang đăng xuất…' : 'Đăng xuất'}</button>}</div>
  </section></div>;
}
