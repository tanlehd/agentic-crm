import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { DataSource } from 'typeorm';

/** Handshake proves the transaction committed before the parent sends SIGKILL. */
export async function faultProcess(source: DataSource, input: Record<string, unknown>, crash: boolean) {
  const child = fork(fileURLToPath(new URL('./fault-child.mjs', import.meta.url)), [], {
    execArgv: [],
    env: { ...process.env, MYSQL_DATABASE: String(source.options.database) },
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });
  let boundary = false;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('FAULT_CHILD_TIMEOUT')); }, 15000);
    child.on('error', () => { clearTimeout(timer); reject(new Error('FAULT_CHILD_START_FAILED')); });
    child.on('message', (message: any) => {
      if (message.boundary === (crash ? 'committed' : 'finished')) {
        boundary = true;
        if (crash) child.kill('SIGKILL');
      }
    });
    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      if (boundary && (crash ? signal === 'SIGKILL' : code === 0)) resolve();
      else reject(new Error('FAULT_CHILD_BOUNDARY_FAILED'));
    });
    child.send(input);
  });
}
