// Local operator one-shot only: root credential never enters API/worker/migrate.
import { createConnection } from 'mysql2/promise';
if (!['development','test'].includes(process.env.APP_ENV ?? '')) throw new Error('Local provisioning only');
const required = (key: string) => { const value = process.env[key]; if (!value) throw new Error(`Missing ${key}`); return value; };
const db = required('MYSQL_DATABASE');
const app = required('MYSQL_USER');
const migration = required('MYSQL_MIGRATION_USER');
if (![db,app,migration].every(x => /^[a-z][a-z0-9_]{0,40}$/.test(x)) || app === migration || [app,migration].includes('root')) throw new Error('Invalid database/user names');
const connection = await createConnection({host: required('MYSQL_HOST'),user:'root',password:required('MYSQL_ROOT_PASSWORD')});
try {
  for (const [user,password] of [[app,required('MYSQL_PASSWORD')],[migration,required('MYSQL_MIGRATION_PASSWORD')]]) {
    await connection.query('CREATE USER IF NOT EXISTS ?@\'%\' IDENTIFIED BY ?', [user,password]);
    await connection.query('ALTER USER ?@\'%\' IDENTIFIED BY ?', [user,password]);
    await connection.query('REVOKE ALL PRIVILEGES, GRANT OPTION FROM ?@\'%\'', [user]);
  }
  await connection.query(`GRANT SELECT,INSERT,UPDATE,DELETE,CREATE,ALTER,INDEX,REFERENCES ON \`${db}\`.* TO ?@'%'`, [migration]);
  console.log('Local database roles provisioned.');
} catch { console.error('Database role provisioning failed'); process.exitCode=1; }
finally { await connection.end(); }
