// Minimized read-only operational status; never emit rows, requests or credentials.
import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createPool} from './lib/chat-native.mjs';
const env=parseEnv(await readFile('.env','utf8'));if(env.APP_ENV!=='development'||env.MYSQL_DATABASE!=='agentic_crm')throw Error('LOCAL_MAIN_REQUIRED');
const pool=createPool({host:'127.0.0.1',port:13306,user:'root',password:env.MYSQL_ROOT_PASSWORD,connectionLimit:1});
try{
 const result={};
 for(const [name,sql]of Object.entries({baselineJournal:'SELECT version,state FROM agentic_crm.schema_migration ORDER BY version DESC LIMIT 3',chatJournal:'SELECT version,state FROM crm_chat.schema_migration ORDER BY version',chatCopy:'SELECT state,COUNT(*) chunks,SUM(row_count) rows_copied FROM crm_chat.chat_migration_chunk GROUP BY state',chatRuns:'SELECT state,COUNT(*) tenants FROM crm_chat.chat_migration_run GROUP BY state',chatGates:'SELECT mode,epoch,COUNT(*) tenants FROM crm_chat.chat_writer_gate GROUP BY mode,epoch'})){
  try{result[name]=(await pool.query(sql))[0];}catch(e){result[name]={unavailable:e.code};}
 }
 console.log(JSON.stringify(result));
}finally{await pool.end();}
