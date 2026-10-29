import { createPool } from 'mysql2/promise';
import { createWorkloadServer, workloadMaterial, registryConfig, required, workloadServices } from '@agentic-crm/workload-transport';
import { databaseSource } from './kernel/database/data-source.js';
import { migrations } from './kernel/database/migrations.js';
import { validateJournal } from './kernel/database/migration-runner.js';
import { composeBaselineOwner } from './owner-composition.js';
import { baselineOwnerConfig } from './owner-config.js';

async function main() {
  const role = process.argv[2];
  if (!workloadServices.includes(role as never) || !['identity', 'crm', 'connector', 'routing', 'sales', 'workflow'].includes(role!)) throw new Error('INVALID_OWNER');
  const material = await workloadMaterial(role as 'identity');
  const config = await baselineOwnerConfig();
  for (const url of [config.chat, config.identity, config.routing]) {
    if (url.protocol !== (material.localHttp ? 'http:' : 'https:') || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('INVALID_OWNER_ENDPOINT');
  }
  const source = databaseSource();
  const pool = createPool({ host: required(process.env, 'MYSQL_HOST'), port: Number(process.env.MYSQL_PORT ?? 3306),
    database: required(process.env, 'MYSQL_DATABASE'), user: required(process.env, 'MYSQL_USER'), password: required(process.env, 'MYSQL_PASSWORD'),
    timezone: 'Z', dateStrings: true, supportBigNumbers: true, bigNumberStrings: true, connectionLimit: 5, connectTimeout: 5000 });
  try {
    await source.initialize();
    const journal = await source.query('SELECT version,name,checksum,state FROM schema_migration ORDER BY version');
    validateJournal(journal, migrations, true);
    const composed = composeBaselineOwner(pool, source, material, await registryConfig(), config);
    const server = createWorkloadServer(material, composed.authority, composed.routes);
    const port = Number(required(process.env, 'WORKLOAD_PORT'));
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('INVALID_PORT');
    await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(port, process.env.WORKLOAD_HOST ?? '127.0.0.1', resolve); });
    let stopping = false;
    const stop = () => {
      if (stopping) return; stopping = true;
      const deadline = setTimeout(() => process.exit(1), 15000); deadline.unref();
      server.closeIdleConnections();
      server.close(() => { void Promise.all([source.destroy(), pool.end()]).then(() => clearTimeout(deadline)); });
    };
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
    console.log(JSON.stringify({ service: 'core-baseline', component: role + '-owner', status: 'started' }));
  } catch (error) { if (source.isInitialized) await source.destroy(); await pool.end(); throw error; }
}

main().catch(() => { console.error('BASELINE_OWNER_START_FAILED'); process.exitCode = 1; });
