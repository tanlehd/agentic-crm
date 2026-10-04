import { AuthPanel } from './auth-panel';
import type { HealthResponse } from '@agentic-crm/contracts';
export const dynamic = 'force-dynamic';

async function getHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${process.env.API_INTERNAL_URL ?? 'http://localhost:3001'}/api/v1/health/ready`, {
      cache: 'no-store', signal: AbortSignal.timeout(3000),
    });
    if (res.status !== 200 && res.status !== 503) return null;
    const value = await res.json() as HealthResponse;
    return value.stage === 'scaffold' && value.checks ? value : null;
  } catch { return null; }
}

export default async function Page() {
  const health = await getHealth();
  const services = [
    { name: 'Web workspace', state: 'Đang chạy', ok: true, note: 'Next.js · server rendering' },
    { name: 'API foundation', state: health ? 'Đang chạy' : 'Chưa kết nối', ok: !!health, note: 'NestJS · HTTP service' },
    { name: 'MySQL', state: health?.checks.mysql === 'up' ? 'Đã kết nối' : 'Chưa sẵn sàng', ok: health?.checks.mysql === 'up', note: 'Dữ liệu nghiệp vụ' },
    { name: 'Redis', state: health?.checks.redis === 'up' ? 'Đã kết nối' : 'Chưa sẵn sàng', ok: health?.checks.redis === 'up', note: 'Queue và session' },
  ];
  return <div className="shell">
    <aside>
      <a className="brand" href="/" aria-label="Agentic CRM home"><span className="mark">a</span>agentic<span className="crm">crm</span></a>
      <div className="workspace"><span className="workspace-icon">A</span><div>Development workspace<small>Local environment</small></div></div>
      <p className="nav-label">WORKSPACE</p>
      <nav aria-label="Workspace"><a className="active" href="/">◈ <span>CRM nền tảng</span><b>01</b></a>
        {['Chat workspace', 'Sales workspace', 'Automation', 'Reports'].map(name => <span className="nav-future" key={name}>○ <span>{name}</span><small>Planned</small></span>)}
      </nav>
      <div className="sidebar-footer"><span className="dot"/> Documentation-first build<small>M1 · Platform foundation</small></div>
    </aside>
    <main>
      <header><span>Workspace <i>/</i> CRM nền tảng</span><span className="environment">LOCAL DEVELOPMENT</span></header>
      <section className="intro"><div className="eyebrow">YOUR CRM WORKSPACE</div><h1>Liên hệ, nhu cầu.<br/><span>Cùng một không gian.</span></h1><p>Quản lý liên hệ, lưu hoạt động và xác nhận nhu cầu khách hàng trong từng tổ chức.</p></section>
      <AuthPanel />
      <details className="runtime-health"><summary>Trạng thái môi trường local</summary><div className="section-heading"><h2>Kết nối dịch vụ</h2><a href="/">↻ Làm mới</a></div>
      <section className="service-grid" aria-label="Service health">{services.map(s => <article key={s.name} className="service"><div className="service-top"><span className="service-symbol">{s.name === 'MySQL' ? '▤' : s.name === 'Redis' ? '≋' : '◇'}</span><span className={s.ok ? 'pill up' : 'pill wait'}>{s.state}</span></div><h3>{s.name}</h3><p>{s.note}</p></article>)}</section></details>
      <section className="build-panel" hidden><div><div className="eyebrow">TODAY’S BUILD</div><h2>Bộ khung trước.<br/>Nghiệp vụ theo từng bước.</h2><p>Đây là màn hình kiểm tra nền móng, chưa phải CRM hoàn chỉnh. Các workspace nghiệp vụ sẽ mở khi có API, phân quyền và kiểm thử tương ứng.</p><span className="outline-tag">Không có dữ liệu khách hàng thật</span></div><ol>{[
        ['01', 'Khung ứng dụng', 'Web, API, worker và contracts dùng chung.'],
        ['02', 'Môi trường Docker', 'Đóng gói dịch vụ, kiểm tra kết nối và giữ dữ liệu.'],
        ['03', 'Tenant & Identity', 'Đăng nhập OIDC, chọn tổ chức và kiểm tra quyền truy cập.'],
      ].map(([number,title,note]) => <li key={number}><span>{number}</span><div><h3>{title}</h3><p>{note}</p></div></li>)}</ol></section>
      <footer>Agentic CRM <span>M1 · CRM foundation</span></footer>
    </main>
  </div>;
}
