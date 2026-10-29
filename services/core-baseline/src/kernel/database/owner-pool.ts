import { createPool, type Pool } from 'mysql2/promise';
import { required } from '@agentic-crm/workload-transport';

/** Explicit owner credentials; never fall back to a broad baseline login. */
export function baselineOwnerPool(prefix: string): Pool {
  return createPool({ host: required(process.env, 'MYSQL_HOST'), port: Number(process.env.MYSQL_PORT ?? 3306),
    database: required(process.env, 'MYSQL_DATABASE'), user: required(process.env, prefix + '_USER'), password: required(process.env, prefix + '_PASSWORD'),
    timezone: 'Z', dateStrings: true, supportBigNumbers: true, bigNumberStrings: true, connectionLimit: 5, connectTimeout: 5000 });
}
