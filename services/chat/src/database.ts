import {createPool, type Pool, type PoolConnection, type RowDataPacket} from 'mysql2/promise';

export const SYSTEM_TENANT='01900000-0000-7000-8000-000000000001';
export function identifier(value:string):string {
  if(!/^[a-z][a-z0-9_]{0,63}$/.test(value))throw new Error('SQL_IDENTIFIER_DENIED');
  return '`'+value+'`';
}
export function businessTenant(value:string):string {
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)||value===SYSTEM_TENANT||value==='00000000-0000-0000-0000-000000000000')throw new Error('BUSINESS_TENANT_REQUIRED');
  return value;
}
export type ChatDatabaseConfig={host:string;port:number;database:string;user:string;password:string};
export function chatPool(config:ChatDatabaseConfig):Pool {
  if(!['crm_chat','test_crm_chat','test_crm_chat_restore','test_crm_chat_final','test_crm_chat_final_restore','test_crm_chat_owner'].includes(config.database))throw new Error('CHAT_OWN_DATABASE_REQUIRED');
  return createPool({...config,timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,jsonStrings:true,connectionLimit:5,multipleStatements:false});
}
export async function session(connection:PoolConnection):Promise<void> {
  await connection.query("SET time_zone='+00:00'");
  await connection.query("SET SESSION sql_mode='STRICT_ALL_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
  const [rows]=await connection.query<RowDataPacket[]>('SELECT @@foreign_key_checks AS enabled');
  if(Number(rows[0]?.enabled)!==1)throw new Error('FOREIGN_KEYS_MUST_STAY_ENABLED');
}
