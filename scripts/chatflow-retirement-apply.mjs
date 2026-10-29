// Explicit local-only maintenance. User authorized Chatflow removal; no volume/reset operations.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {databaseSource} from '../services/core-baseline/dist/kernel/database/data-source.js';
import {migrate} from '../services/core-baseline/dist/kernel/database/migration-runner.js';
import {migrations,checksum} from '../services/core-baseline/dist/kernel/database/migrations.js';
import {createPool,rootSQL} from './lib/chat-native.mjs';
import {migrateRetirement} from '../services/chat/dist/retirement-schema.js';
const main=process.argv.includes('--main');
if(process.argv.length!==3||!['--main','--chat'].includes(process.argv[2]))throw Error('EXPECTED_MAIN_OR_CHAT');
const evidence={target:main?'agentic_crm':'test_crm_chat_owner',status:'STARTED',before:{},after:{},services:[]};
await mkdir('artifacts/chatflow-retirement',{recursive:true});
const hash=rows=>createHash('sha256').update(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort())).digest('hex');
async function snapshot(query,tables){const result={};for(const table of tables){const columns=(await query('SELECT COLUMN_NAME name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION',[table])).map(r=>r.name).filter(c=>!['chatflow_session_id','qualification_session_id'].includes(c));const rows=await query(`SELECT ${columns.map(c=>'`'+c+'`').join(',')} FROM \`${table}\``);result[table]={count:rows.length,sha256:hash(rows)};}return result;}
const docker=(args)=>{const r=spawnSync('docker',args,{encoding:'utf8',windowsHide:true,timeout:60000});if(r.status!==0)throw Error('LOCAL_CONTAINER_CONTROL_FAILED');return r.stdout.trim();};
let ds,pool,token;const restarted=[],stopped=[];const origin='http://127.0.0.1:3020';
const monitor=async(id,action)=>{const r=await fetch(`${origin}/service/${id}/${action}`,{method:'POST',headers:{Origin:origin,'X-Local-Token':token},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('LOCAL_SERVICE_CONTROL_FAILED_'+id);};
try{
 if(main){
  const proof=JSON.parse(await readFile('artifacts/chatflow-retirement/native.json','utf8'));assert.equal(proof.status,'PASS');
  const env=parseEnv(await readFile('.env','utf8'));assert.equal(env.APP_ENV,'development');assert.equal(env.MYSQL_DATABASE,'agentic_crm');assert(['localhost','127.0.0.1'].includes(new URL(env.APP_ORIGIN).hostname));
  const state=await (await fetch(origin+'/status')).json();evidence.services=state.services.map(s=>({id:s.id,health:s.health,owned:s.owned}));
  const html=await (await fetch(origin+'/')).text();token=html.match(/(?:const|let) token\s*=\s*['"]([a-f0-9]+)['"]/)?.[1];if(!token)throw Error('MONITOR_TOKEN_UNAVAILABLE');
  for(const id of ['worker','api']){const s=state.services.find(s=>s.id===id);if(s?.owned){await monitor(id,'stop');restarted.push(id);}else if(s?.health!=='stopped')throw Error('UNMANAGED_WRITER_'+id);}
  const names=docker(['ps','--format','{{.Names}}']).split('\n');
  for(const name of ['agentic-crm-human-outbound-worker-1','agentic-crm-connector-local-connector-worker-1','agentic-crm-connector-local-connector-api-1'])if(names.includes(name)){docker(['stop',name]);stopped.push(name);}
  Object.assign(process.env,env,{MYSQL_HOST:'127.0.0.1',MYSQL_PORT:env.LOCAL_MYSQL_PORT??'13306'});ds=databaseSource(true);await ds.initialize();
  const tables=['tenant','account','membership','contact','lead','deal','conversation','message','crm_record','audit_entry','workflow_version','workflow_action'];evidence.before=await snapshot(ds.query.bind(ds),tables);
  const [journal]=await ds.query('SELECT name,checksum,state,error_code FROM schema_migration WHERE version=43');
  if(journal?.state==='failed'){
   // Exact recovery for the inspected DROP-denied boundary, not a general retry path.
   const step=migrations.at(-1);assert.equal(step.version,43);assert.equal(journal.name,step.name);assert.equal(journal.checksum,checksum(step));assert.equal(journal.error_code,'DDL_FAILED');
   assert.equal(env.MYSQL_MIGRATION_USER,'crm_migrate');
   const retired=['chatflow_turn','chatflow_node_run','chatflow_session','chatflow_version','chatflow_definition'];
   for(const t of retired)assert.equal(Number((await ds.query(`SELECT COUNT(*) n FROM ${t}`))[0].n),0,'Repair only matches the inspected empty main tables');
   const [columns]=await ds.query("SELECT COUNT(*) n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND COLUMN_NAME IN ('qualification_session_id','chatflow_session_id')");assert.equal(Number(columns.n),2);
   rootSQL(retired.map(t=>`GRANT DROP ON agentic_crm.${t} TO 'crm_migrate'@'%';`).join('\n'));
   const runner=ds.createQueryRunner();await runner.connect();
   try{assert.equal(Number((await runner.query("SELECT GET_LOCK('crm:migrate:agentic_crm',0) ok"))[0].ok),1);
    const offset=step.statements.indexOf('DROP TABLE chatflow_turn');assert(offset>0);
    for(const sql of step.statements.slice(offset))await runner.query(sql);
    await runner.query("UPDATE schema_migration SET state='applied',error_code=NULL,applied_at=UTC_TIMESTAMP(6) WHERE version=43 AND checksum=? AND state='failed'",[checksum(step)]);evidence.applied=1;evidence.repair='Inspected missing DROP grant; resumed at first DDL, no prior DML replay';
   }finally{await runner.query("SELECT RELEASE_LOCK('crm:migrate:agentic_crm')");await runner.release();rootSQL(retired.map(t=>`REVOKE DROP ON agentic_crm.${t} FROM 'crm_migrate'@'%';`).join('\n'));}
  }else evidence.applied=await migrate(ds);
  assert.equal(await migrate(ds),0);evidence.after=await snapshot(ds.query.bind(ds),tables);assert.deepEqual(evidence.after,evidence.before);
  assert.equal((await ds.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE 'chatflow%'")).length,0);
 }else{
  const cfg=JSON.parse(await readFile('.local/chat-ownership/credentials.json','utf8'));assert.equal(cfg.database,'test_crm_chat_owner');assert.equal(cfg.host,'127.0.0.1');assert.equal(cfg.port,13306);
  pool=createPool({host:cfg.host,port:cfg.port,database:cfg.database,user:'chat_owner_test_operator',password:cfg.operator,timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,jsonStrings:true});
  const query=async(sql,args=[])=>{const [rows]=await pool.query(sql,args);return rows;};
  const tables=['conversation','message','crm_record','audit_entry','outbound_intent','chat_dispatch_claim','chat_result_request'];evidence.before=await snapshot(query,tables);
  evidence.applied=await migrateRetirement(pool);assert.equal(await migrateRetirement(pool),0);evidence.after=await snapshot(query,tables);assert.deepEqual(evidence.after,evidence.before);
  assert.equal((await query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND COLUMN_NAME='chatflow_session_id'")).length,0);
  assert.equal(Number((await query("SELECT COUNT(*) n FROM chat_event_delivery WHERE consumer_name='chatflow.chat-control.v1'"))[0].n),0);
 }
 evidence.status='PASS';console.log('PASS local retirement',evidence.target,'business row hashes preserved; repeat no-op');
}catch(e){evidence.status='FAILED';evidence.error=e.code??e.message;console.error('RETIREMENT_APPLY_FAILED',evidence.error);process.exitCode=1;}
finally{
 if(ds?.isInitialized)await ds.destroy();if(pool)await pool.end();
 for(const name of stopped)try{docker(['start',name]);}catch{evidence.restartError=name;process.exitCode=1;}
 for(const id of restarted.reverse())try{await monitor(id,'start');}catch{evidence.restartError=id;process.exitCode=1;}
 await writeFile(`artifacts/chatflow-retirement/${main?'main':'chat'}-apply.json`,JSON.stringify(evidence,null,2));
}
