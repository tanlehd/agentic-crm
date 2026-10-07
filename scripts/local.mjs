import { init, unitEnv, launch, infraAction } from './local-runtime.mjs';
try {
  const [action, id, ...rest] = process.argv.slice(2);
  if (action === 'init') { await init(); console.log('Local env files ready; existing values preserved.'); }
  else if (action === 'run') {
    const child = launch(id, await unitEnv(id), 'inherit');
    child.once('error', () => { console.error('SERVICE_START_FAILED'); process.exitCode = 1; });
    child.once('exit', code => { process.exitCode = code ?? 1; });
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => process.platform === 'win32' ? child.kill(signal) : process.kill(-child.pid, signal));
  } else if (['start', 'stop', 'status'].includes(action)) console.log(await infraAction(action, id ? [id, ...rest] : undefined));
  else throw new Error('Usage: local.mjs init|run <unit>|start|stop|status [infra service]');
} catch (error) { console.error(error.code === 'ENOENT' ? 'CONFIG_MISSING: run env:init and local:init' : error.message); process.exitCode = 1; }
