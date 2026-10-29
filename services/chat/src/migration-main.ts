// Explicit operator process. Never imported by the API or worker.
import {chatPool} from './database.js';
import {migrateRetirement} from './retirement-schema.js';
import {verifyRuntimeLineage} from './runtime-lineage.js';
async function main(){
 const mode=process.argv[2];if(!['status','upgrade'].includes(mode??''))throw new Error('CHAT_MIGRATION_MODE_REQUIRED');
 const required=(k:string)=>{const v=process.env[k];if(!v)throw new Error('CHAT_MIGRATION_CONFIG_REQUIRED');return v;};
 const port=Number(required('CHAT_DB_PORT'));if(!Number.isInteger(port)||port<1||port>65535)throw new Error('CHAT_MIGRATION_CONFIG_REQUIRED');
 const pool=chatPool({host:required('CHAT_DB_HOST'),port,database:required('CHAT_DB_NAME'),user:required('CHAT_MIGRATION_USER'),password:required('CHAT_MIGRATION_PASSWORD')});
 try{
  // Versions1/2 require the separate export/import/reconciliation operator flow.
  // This upgrade refuses a missing/unreconciled baseline via migrateIngress.
  if(mode==='upgrade')await migrateRetirement(pool);
  const c=await pool.getConnection();try{console.log(JSON.stringify(await verifyRuntimeLineage(c)));}finally{c.release();}
 }finally{await pool.end();}
}
main().catch(()=>{console.error('CHAT_MIGRATION_FAILED');process.exitCode=1;});
