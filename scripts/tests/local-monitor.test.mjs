import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { request } from 'node:http';
import { createMonitor, listening } from '../local-monitor.mjs';
import { port, infraAction, unitEnv } from '../local-runtime.mjs';

test('reject unsafe inputs before spawning a command or reading arbitrary env', async () => {
  for (const value of ['0', '65536', '3000;whoami', '-1', 'NaN']) assert.throws(() => port(value));
  await assert.rejects(infraAction('start', ['api']));
  await assert.rejects(infraAction('down', ['mysql']));
  await assert.rejects(unitEnv('../../.env'));
});
test('TCP occupancy recognizes an external process without owning it', async () => {
  const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const listenPort = server.address().port;
  try { assert.equal(await listening(listenPort), true); } finally { await new Promise(resolve => server.close(resolve)); }
  assert.equal(await listening(listenPort), false);
});
test('monitor denies foreign origins, missing tokens, DNS rebinding and arbitrary commands', async () => {
  const reserve = createServer(); await new Promise(resolve => reserve.listen(0,'127.0.0.1',resolve));
  const listenPort = reserve.address().port; await new Promise(resolve => reserve.close(resolve));
  const monitor = await createMonitor(listenPort); await new Promise(resolve => monitor.server.listen(listenPort,'127.0.0.1',resolve));
  const origin = `http://127.0.0.1:${listenPort}`;
  try {
    const home = await fetch(origin); const html = await home.text();
    assert.equal(home.status,200); assert.ok(home.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
    const token = /const token='([a-f0-9]+)'/.exec(html)[1];
    for (const headers of [{Origin:origin},{Origin:'https://foreign.example','X-Local-Token':token}]) assert.equal((await fetch(origin+'/service/mysql/start',{method:'POST',headers})).status,403);
    const rebound = await new Promise((resolve,reject) => { const req=request(origin,{headers:{Host:'foreign.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end(); });
    assert.equal(rebound,403);
    const headers={Origin:origin,'X-Local-Token':token};
    assert.equal((await fetch(origin+'/service/arbitrary/start',{method:'POST',headers})).status,404);
    const denied=await fetch(origin+'/service/api/stop',{method:'POST',headers});
    assert.equal(denied.status,409);assert.equal((await denied.json()).error,'NOT_MANAGED');
  } finally {await monitor.close();}
});
