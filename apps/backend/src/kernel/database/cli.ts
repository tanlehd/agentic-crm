import { databaseSource } from './data-source.js';
import { migrate, validateJournal } from './migration-runner.js';
import { migrations } from './migrations.js';
import { backfillWorkspace } from '../../modules/conversation/workspace-storage.js';
import { backfillActivity } from '../../modules/conversation/activity-storage.js';
const source = databaseSource(true);
try {
  await source.initialize();
  if (process.argv[2] === 'status') {
    const rows = await source.query('SELECT version,name,checksum,state FROM schema_migration ORDER BY version');
    validateJournal(rows, migrations, true);
    console.log('Schema ready:', migrations.length);
  } else if (!process.argv[2] || process.argv[2] === 'migrate') {
    console.log('Migrations applied:', await migrate(source));
    console.log('Workspace conversations backfilled:', await backfillWorkspace(source));
    console.log('Activity conversations backfilled:', await backfillActivity(source));
  } else throw new Error('Unknown migration command');
} catch { console.error('Migration/status failed. Inspect schema journal; no automatic DDL recovery.'); process.exitCode = 1; }
finally { if (source.isInitialized) await source.destroy(); }
