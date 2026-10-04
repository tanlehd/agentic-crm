import { createConnection } from 'mysql2/promise';
import { applyRuntimeGrants } from './runtime-grants.js';
if (!['development','test'].includes(process.env.APP_ENV ?? '')) throw new Error('Local grants only');
const required = (key: string) => { const value=process.env[key]; if(!value) throw new Error(`Missing ${key}`); return value; };
const connection=await createConnection({host:required('MYSQL_HOST'),user:'root',password:required('MYSQL_ROOT_PASSWORD')});
try {
  await applyRuntimeGrants(connection,required('MYSQL_DATABASE'),required('MYSQL_USER'));
  console.log('Runtime table grants applied; audit append-only.');
} catch { console.error('Runtime grants failed'); process.exitCode=1; }
finally { await connection.end(); }
