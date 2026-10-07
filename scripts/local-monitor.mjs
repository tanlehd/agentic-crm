import { createServer } from 'node:http';
import { createConnection } from 'node:net';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { units, infra, unitEnv, envPath, port, launch, infraAction, execute } from './local-runtime.mjs';

export function listening(listenPort) {
  return new Promise(resolve => {
    const socket = createConnection({ host: '127.0.0.1', port: listenPort });
    const done = result => { socket.destroy(); resolve(result); };
    socket.setTimeout(700, () => done(false));
    socket.once('connect', () => done(true)); socket.once('error', () => done(false));
  });
}
export async function createMonitor(listenPort = 3020) {
  const token = randomBytes(32).toString('hex');
  const children = new Map(); const failures = new Map(); const stopping = new Set(); let busy = false;
  const origin = `http://127.0.0.1:${port(listenPort)}`;
  async function status(id) {
    try {
      const env = await unitEnv(id);
      const occupied = await listening(port(env.PORT));
      let health = occupied ? 'unhealthy' : children.has(id) ? 'starting' : 'stopped';
      if (units[id].health && occupied) {
        try { const response = await fetch(`http://127.0.0.1:${port(env.PORT)}${units[id].health}`, { signal: AbortSignal.timeout(2000), redirect: 'error' }); health = response.ok ? 'ready' : 'unhealthy'; await response.body?.cancel(); } catch { health = 'unreachable'; }
      } else if (!units[id].health) health = children.has(id) ? 'running (no readiness probe)' : 'unknown (no readiness probe)';
      return { id, kind: 'application', env: envPath(id), port: port(env.PORT), owned: children.has(id), health, error: failures.get(id) ?? null };
    } catch { return { id, kind: 'application', env: envPath(id), owned: children.has(id), health: 'configuration required' }; }
  }
  async function stop(id) {
    const child = children.get(id);
    if (!child) throw new Error('NOT_MANAGED');
    stopping.add(id);
    const exited = new Promise(resolve => child.once('exit', resolve));
    if (process.platform === 'win32') await execute('taskkill', ['/PID', String(child.pid), '/T', '/F']);
    else process.kill(-child.pid, 'SIGTERM');
    await Promise.race([exited, new Promise(resolve => { const timer = setTimeout(() => { if (children.has(id)) { if (process.platform === 'win32') child.kill('SIGKILL'); else process.kill(-child.pid, 'SIGKILL'); } resolve(); }, 5000); timer.unref(); })]);
  }
  const html = (await readFile(new URL('./local-monitor.html', import.meta.url), 'utf8')).replace('__TOKEN__', token);
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'");
    const json = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (req.headers.host !== `127.0.0.1:${listenPort}`) return json(403, { error: 'HOST_DENIED' });
    if (req.method === 'GET' && req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(html); }
    if (req.method === 'GET' && req.url === '/status') {
      const apps = await Promise.all(Object.keys(units).map(status));
      let infrastructure;
      try {
        const raw = await infraAction('status');
        const rows = raw.trim().startsWith('[') ? JSON.parse(raw) : raw.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
        infrastructure = infra.map(id => { const row = rows.find(row => row.Service === id); return { id, kind: 'infrastructure', health: row ? `${row.State}${row.Health ? ` / ${row.Health}` : ''}` : 'stopped' }; });
      } catch { infrastructure = infra.map(id => ({ id, kind: 'infrastructure', health: 'Docker unavailable' })); }
      return json(200, { services: [...infrastructure, ...apps], busy });
    }
    const match = /^\/service\/([a-z-]+)\/(start|stop)$/.exec(req.url ?? '');
    if (req.method !== 'POST' || !match) return json(404, { error: 'NOT_FOUND' });
    if (req.headers.origin !== origin || req.headers['x-local-token'] !== token) return json(403, { error: 'ORIGIN_OR_TOKEN_DENIED' });
    const [, id, action] = match;
    if (!infra.includes(id) && !Object.hasOwn(units, id)) return json(404, { error: 'UNKNOWN_SERVICE' });
    if (busy) return json(409, { error: 'ACTION_IN_PROGRESS' });
    busy = true;
    try {
      if (infra.includes(id)) await infraAction(action, [id]);
      else if (action === 'stop') await stop(id);
      else {
        const env = await unitEnv(id);
        if (children.has(id) || await listening(port(env.PORT))) throw new Error('ALREADY_RUNNING_OR_PORT_BUSY');
        failures.delete(id);
        const child = launch(id, env);
        children.set(id, child);
        child.once('error', () => { children.delete(id); failures.set(id, 'START_FAILED'); });
        child.once('exit', code => { children.delete(id); if (code && !stopping.has(id)) failures.set(id, 'PROCESS_EXITED'); stopping.delete(id); });
      }
      json(200, { accepted: true });
    } catch (error) {
      const safe = ['NOT_MANAGED', 'ALREADY_RUNNING_OR_PORT_BUSY', 'COMMAND_TIMEOUT', 'COMMAND_UNAVAILABLE', 'COMMAND_FAILED'];
      json(409, { error: safe.includes(error.message) ? error.message : 'CONFIG_OR_START_FAILED' });
    } finally { busy = false; }
  });
  server.requestTimeout = 5000;
  return { server, close: async () => { await Promise.allSettled([...children.keys()].map(stop)); await new Promise(resolve => server.close(resolve)); } };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const listenPort = port(process.env.LOCAL_MONITOR_PORT ?? 3020);
  const monitor = await createMonitor(listenPort);
  monitor.server.listen(listenPort, '127.0.0.1', () => console.log(`Local monitor: http://127.0.0.1:${listenPort}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await monitor.close(); process.exit(0); });
}
