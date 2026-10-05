import { createServer, createConnection, type Socket } from 'node:net';

/** Dedicated test-container loopback proxy. Closing it never stops preview Redis. */
export async function redisCut(host: string) {
  const sockets = new Set<Socket>();
  let online = true;
  const server = createServer(client => {
    if (!online) { client.destroy(); return; }
    const upstream = createConnection({ host, port: 6379 });
    for (const socket of [client, upstream]) {
      sockets.add(socket);
      socket.on('error', () => { client.destroy(); upstream.destroy(); });
      socket.on('close', () => { sockets.delete(socket); client.destroy(); upstream.destroy(); });
    }
    client.pipe(upstream); upstream.pipe(client);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject); server.listen(6379, '127.0.0.1', resolve);
  });
  return {
    cut() { online = false; for (const socket of sockets) socket.destroy(); },
    restore() { online = true; },
    async close() {
      online = false; for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    },
  };
}
