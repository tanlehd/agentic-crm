// Local, read-only diagnostics. Output normalized query digests and aggregate timings only.
import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {createPool} from './lib/chat-native.mjs';
const env=parseEnv(await readFile('.env','utf8'));if(env.APP_ENV!=='development'||env.MYSQL_DATABASE!=='agentic_crm')throw Error('LOCAL_MAIN_REQUIRED');
const pool=createPool({host:'127.0.0.1',port:13306,user:'root',password:env.MYSQL_ROOT_PASSWORD,connectionLimit:1});
try{
 const queries={
  statements:`SELECT SCHEMA_NAME,DIGEST_TEXT,COUNT_STAR,ROUND(SUM_TIMER_WAIT/1e12,2) total_seconds,ROUND(AVG_TIMER_WAIT/1e9,2) avg_ms,ROUND(MAX_TIMER_WAIT/1e9,2) max_ms,SUM_ROWS_EXAMINED,SUM_NO_INDEX_USED,SUM_ERRORS FROM performance_schema.events_statements_summary_by_digest WHERE SCHEMA_NAME IN ('crm_chat','agentic_crm') ORDER BY SUM_TIMER_WAIT DESC LIMIT 20`,
  waits:`SELECT OBJECT_SCHEMA,OBJECT_NAME,INDEX_NAME,LOCK_TYPE,LOCK_MODE,LOCK_STATUS FROM performance_schema.data_locks WHERE LOCK_STATUS='WAITING'`,
  indexes:`SELECT TABLE_NAME,INDEX_NAME,GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) columns_in_order FROM information_schema.statistics WHERE TABLE_SCHEMA='crm_chat' AND TABLE_NAME IN ('message','message_content','conversation','conversation_workspace','chat_owner_command') GROUP BY TABLE_NAME,INDEX_NAME`,
  load:`SHOW GLOBAL STATUS WHERE Variable_name IN ('Threads_running','Threads_connected','Innodb_row_lock_current_waits','Innodb_row_lock_time','Innodb_row_lock_waits')`,
 };
 for(const [name,sql]of Object.entries(queries))console.log(JSON.stringify({name,data:(await pool.query(sql))[0]}));
 const h=createHash('sha256').update('agentic-crm:identity-fixture:v1:clinic_beta').digest('hex'),tenant=`${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
 const s=JSON.parse(await readFile('.local/chat-main/smoke-beta-stable.private.json','utf8'));
 for(const [name,sql,args]of [
  ['timeline','SELECT id,status,received_at FROM crm_chat.message WHERE tenant_id=? AND conversation_id=? ORDER BY received_at,id LIMIT 51',[tenant,s.conversation]],
  ['latest','SELECT id,status,received_at FROM crm_chat.message WHERE tenant_id=? AND conversation_id=? ORDER BY received_at DESC,id DESC LIMIT 1',[tenant,s.conversation]]
 ]){const start=performance.now();await pool.execute(sql,args);const ms=performance.now()-start;console.log(JSON.stringify({name,ms:Math.round(ms*100)/100,plan:(await pool.execute('EXPLAIN '+sql,args))[0]}));}
}finally{await pool.end();}
