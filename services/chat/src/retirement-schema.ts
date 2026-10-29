import type {Pool,RowDataPacket} from 'mysql2/promise';
import {SYSTEM_TENANT,session} from './database.js';
import {migrateIngress} from './ingress-schema.js';
import {retirementStep,retirementChecksum} from './retirement-step.js';

export async function migrateRetirement(pool:Pool){
 await migrateIngress(pool);
 const c=await pool.getConnection();let lock='';
 try{
  await session(c);const [[db]]=await c.query<RowDataPacket[]>('SELECT DATABASE() name');
  if(!['crm_chat','test_crm_chat_owner'].includes(db!.name))throw Error('RETIREMENT_TARGET_DENIED');
  lock='chat:migrate:'+db!.name;const [[got]]=await c.query<RowDataPacket[]>('SELECT GET_LOCK(?,0) ok',[lock]);if(Number(got!.ok)!==1)throw Error('MIGRATION_BUSY');
  const [rows]=await c.query<RowDataPacket[]>('SELECT * FROM schema_migration WHERE version=4');
  if(rows.length){const row=rows[0]!;if(row.tenant_id!==SYSTEM_TENANT||row.name!==retirementStep.name||row.checksum!==retirementChecksum||row.state!=='applied')throw Error('RETIREMENT_JOURNAL_REPAIR_REQUIRED');return 0;}
  await c.execute("INSERT INTO schema_migration(tenant_id,version,name,checksum,state,started_at) VALUES (?,4,?,?,'started',UTC_TIMESTAMP(6))",[SYSTEM_TENANT,retirementStep.name,retirementChecksum]);
  try{
   for(const sql of retirementStep.statements)await c.query(sql);
   await c.execute("UPDATE schema_migration SET state='applied',applied_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND version=4",[SYSTEM_TENANT]);return 1;
  }catch(e){await c.execute("UPDATE schema_migration SET state='failed',error_code='OPERATOR_REVIEW' WHERE tenant_id=? AND version=4",[SYSTEM_TENANT]);throw e;}
 }finally{try{if(lock)await c.query('SELECT RELEASE_LOCK(?)',[lock]);}finally{c.release();}}
}
