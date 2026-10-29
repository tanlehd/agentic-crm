// Read-only local preflight. Never emits credentials, transcript or business IDs.
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createPool} from './lib/chat-native.mjs';
import {spawnSync} from 'node:child_process';

const env=parseEnv(await readFile('.local/services/api.env','utf8'));
if(env.APP_ENV!=='development'||env.MYSQL_HOST!=='127.0.0.1'||env.MYSQL_DATABASE!=='agentic_crm')throw new Error('LOCAL_MAIN_REQUIRED');
const pool=createPool({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),database:env.MYSQL_DATABASE,user:env.MYSQL_USER,password:env.MYSQL_PASSWORD,supportBigNumbers:true,bigNumberStrings:true});
const report={environment:'local',database:env.MYSQL_DATABASE,at:new Date().toISOString(),tables:{},states:{},runtime:[]};
try{
 report.journal=(await pool.query('SELECT version,name,checksum FROM schema_migration ORDER BY version'))[0];
 const tables=(await pool.query('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()'))[0];
 for(const {name}of tables){if(!/^[a-z_]+$/.test(name))throw new Error('INVALID_TABLE');report.tables[name]=(await pool.query('SELECT COUNT(*) AS n FROM `'+name+'`'))[0][0].n;}
 for(const [table,column]of [['outbound_intent','status'],['chat_outbound_job','state'],['inbound_delivery','status'],['agent_execution','status'],['workflow_run','status'],['conversation','status'],['consumer_inbox','status'],['outbox_event','status']]){
  if(!Object.hasOwn(report.tables,table))continue;
  const columns=(await pool.query('SHOW COLUMNS FROM `'+table+'`'))[0];if(!columns.some(c=>c.Field===column)){report.states[table]={columns:columns.map(c=>c.Field)};continue;}
  report.states[table]=(await pool.query('SELECT `'+column+'` AS state,COUNT(*) AS n FROM `'+table+'` GROUP BY `'+column+'`'))[0];
 }
 report.tenants=(await pool.query('SELECT kind,status,COUNT(*) AS n FROM tenant GROUP BY kind,status'))[0];
 report.eventFamilies=(await pool.query('SELECT event_type,schema_version,aggregate_type,status,COUNT(*) AS n FROM outbox_event GROUP BY event_type,schema_version,aggregate_type,status ORDER BY event_type,status'))[0];
 report.receiptFamilies=(await pool.query("SELECT REGEXP_REPLACE(route_key,'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}','{id}') AS route,status,COUNT(*) AS n FROM idempotency_record GROUP BY route,status ORDER BY route"))[0];
 report.auditFamilies=(await pool.query('SELECT resource_type,action,outcome,COUNT(*) AS n FROM audit_entry GROUP BY resource_type,action,outcome ORDER BY resource_type,action'))[0];
 for(const [name,url]of [['api','http://127.0.0.1:3001/api/v1/health/ready'],['worker','http://127.0.0.1:3002/api/v1/health/ready'],['web','http://localhost:18080'],['monitor','http://127.0.0.1:3020/status']]){
  try{const r=await fetch(url,{signal:AbortSignal.timeout(5000)});report.runtime.push({name,status:r.status,...(name==='monitor'?{services:(await r.json()).services}:{})});await r.body?.cancel();}catch{report.runtime.push({name,status:'unreachable'});}
 }
 const git=spawnSync('git',['status','--short'],{encoding:'utf8',windowsHide:true});report.workingTreeFiles=git.stdout.trim().split('\n').length;
 await mkdir('artifacts/chat-extraction/t09-20261026',{recursive:true});await writeFile('artifacts/chat-extraction/t09-20261026/preflight.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({schema:report.journal.at(-1)?.version,tableCount:tables.length,states:report.states,tenants:report.tenants,runtime:report.runtime,workingTreeFiles:report.workingTreeFiles},null,2));
}finally{await pool.end();}
