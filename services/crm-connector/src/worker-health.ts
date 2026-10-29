import { createServer, type Server } from 'node:http';

export class WorkerHealth {
  private lastSuccess: number | null = null;
  private failed = false;
  private draining = false;
  constructor(private readonly clock: () => number = () => performance.now()) {}
  succeeded() { this.lastSuccess = this.clock(); this.failed = false; }
  unavailable() { this.failed = true; }
  drain() { this.draining = true; }
  status(): 'starting' | 'ready' | 'unavailable' | 'draining' {
    if (this.draining) return 'draining';
    if (this.failed) return 'unavailable';
    if (this.lastSuccess === null) return 'starting';
    const age = this.clock() - this.lastSuccess;
    return age >= 0 && age <= 45000 ? 'ready' : 'unavailable';
  }
}

export async function startWorkerHealth(health: WorkerHealth, port: number, host: string): Promise<Server> {
  if (!Number.isInteger(port) || port < 0 || port > 65535 || !host) throw new Error('INVALID_WORKER_HEALTH_CONFIG');
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const path = req.url;
    let status: string;
    if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('Allow', 'GET'); status = 'method_not_allowed'; }
    else if (path === '/connector/v1/health/live') { res.statusCode = 200; status = 'alive'; }
    else if (path === '/connector/v1/health/ready') { status = health.status(); res.statusCode = status === 'ready' ? 200 : 503; }
    else { res.statusCode = 404; status = 'not_found'; }
    res.end(JSON.stringify({ status, role: 'connector-worker' }));
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  await new Promise<void>((resolve, reject) => {
    const fail = (error: Error) => reject(error);
    server.once('error', fail);
    server.listen(port, host, () => { server.off('error', fail); resolve(); });
  });
  return server;
}

export async function closeWorkerHealth(server: Server) {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
