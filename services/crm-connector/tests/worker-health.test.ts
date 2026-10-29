import { describe, it, expect } from 'vitest';
import { WorkerHealth, startWorkerHealth, closeWorkerHealth } from '../src/worker-health.js';

describe('Connector worker operational health', () => {
  it('fails closed until a completed cycle, on local failure/staleness and while draining', () => {
    let now = 0; const health = new WorkerHealth(() => now);
    expect(health.status()).toBe('starting');
    health.succeeded(); expect(health.status()).toBe('ready');
    now = 45000; expect(health.status()).toBe('ready');
    now++; expect(health.status()).toBe('unavailable');
    health.succeeded(); expect(health.status()).toBe('ready');
    health.unavailable(); expect(health.status()).toBe('unavailable');
    health.succeeded(); expect(health.status()).toBe('ready');
    health.drain(); health.succeeded(); expect(health.status()).toBe('draining');
  });
  it('serves immediate sanitized GET probes independently of the queue and rejects other requests', async () => {
    const health = new WorkerHealth(), server = await startWorkerHealth(health, 0, '127.0.0.1');
    try {
      const address = server.address(); if (!address || typeof address === 'string') throw new Error('NO_PORT');
      const base = `http://127.0.0.1:${address.port}/connector/v1/health`;
      const live = await fetch(base + '/live'); expect(live.status).toBe(200);
      expect(await live.json()).toEqual({ status: 'alive', role: 'connector-worker' });
      const boot = await fetch(base + '/ready'); expect(boot.status).toBe(503);
      expect(boot.headers.get('cache-control')).toBe('no-store');
      expect(await boot.json()).toEqual({ status: 'starting', role: 'connector-worker' });
      health.succeeded(); expect((await fetch(base + '/ready')).status).toBe(200);
      health.unavailable(); expect((await fetch(base + '/ready')).status).toBe(503);
      health.drain(); expect((await fetch(base + '/live')).status).toBe(200);
      expect((await fetch(base + '/ready')).status).toBe(503);
      expect((await fetch(base + '/ready?tenant_id=spoof')).status).toBe(404);
      expect((await fetch(base + '/ready', { method: 'POST' })).status).toBe(405);
    } finally { await closeWorkerHealth(server); }
  });
});
