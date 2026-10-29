// Retained local native acceptance. No resets; fixture/business rows remain reusable.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID,createHash} from 'node:crypto';
import {databaseSource} from '../services/core-baseline/dist/kernel/database/data-source.js';
import {migrate,validateJournal} from '../services/core-baseline/dist/kernel/database/migration-runner.js';
import {migrations} from '../services/core-baseline/dist/kernel/database/migrations.js';
import {validateGraph} from '../services/core-baseline/dist/modules/workflow/graph.js';
import {WorkflowEngine} from '../services/core-baseline/dist/modules/workflow/engine.js';
const env=parseEnv(await readFile('.local/native-auth-test.env','utf8'));
assert.equal(env.MYSQL_DATABASE,'native_identity_test');assert.equal(env.MYSQL_HOST,'127.0.0.1');assert.equal(env.MYSQL_PORT,'13306');
Object.assign(process.env,env);
const ds=databaseSource(true);await ds.initialize();const checks=[],fixtures=[];
const record=(name)=>{checks.push(name);console.log('PASS '+name);};
const digest=rows=>createHash('sha256').update(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort())).digest('hex');
try{
 const journal=await ds.query('SELECT version,name,checksum,state FROM schema_migration ORDER BY version');validateJournal(journal,migrations);
 if(journal.at(-1).version===43){
  validateJournal(journal,migrations,true);assert.equal(await migrate(ds),0);
  const proof=JSON.parse(await readFile('artifacts/chatflow-retirement/native.json','utf8'));assert.equal(proof.status,'PASS');
  const engine=new WorkflowEngine(ds);for(const f of proof.fixtures)assert.equal(await engine.uow.run({tenantId:f.tenant},s=>engine.cancel(s,f.run)),'cancelled');
  assert.equal((await ds.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE 'chatflow%'")).length,0);
  record('retained repeat: schema no-op and terminal legacy run cancellation remains idempotent');
  await writeFile('artifacts/chatflow-retirement/native-repeat.json',JSON.stringify({status:'PASS',checks},null,2));
 }else{
 assert.equal(journal.at(-1).version,42,'First rehearsal must start at retained schema42');
 await ds.query("UPDATE chatflow_session s JOIN workflow_run r ON r.tenant_id=s.tenant_id AND r.id=s.parent_run_id JOIN workflow_definition d ON d.tenant_id=r.tenant_id AND d.id=r.definition_id SET s.status='cancelled' WHERE d.name='Synthetic retirement acceptance' AND s.status IN ('running','waiting_message','paused_human')");
 const candidates=await ds.query('SELECT tenant_id,record_id conversation,contact_id FROM conversation ORDER BY tenant_id,record_id');
 const selected=[...new Map(candidates.map(c=>[c.tenant_id,c])).values()].slice(0,2);assert(selected.length>0);
 if(selected.length===1){const tenant_id=randomUUID();await ds.query("INSERT INTO tenant(id,tenant_id,name,status,created_at,updated_at) VALUES (?,?,'Synthetic retirement isolation','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[tenant_id,tenant_id]);selected.push({tenant_id});}
 for(const c of selected){
  c.role_id=randomUUID();c.actor=randomUUID();
  await ds.query("INSERT INTO role(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,?,'Synthetic retirement',JSON_ARRAY(),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[c.role_id,c.tenant_id,'retire_'+c.role_id.replaceAll('-','')]);
  await ds.query('INSERT INTO service_actor(id,tenant_id,`key`,role_id,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[c.actor,c.tenant_id,'retire_'+c.actor.replaceAll('-',''),c.role_id]);
  const t=c.tenant_id,w=randomUUID(),v=randomUUID(),run=randomUUID(),keep=randomUUID(),kv=randomUUID(),kr=randomUUID(),cf=randomUUID(),cv=randomUUID(),session=randomUUID(),lead=randomUUID();
  const retired={trigger:{event_type:'conversation.created',connection_id:randomUUID()},entry_node:'start',nodes:[{key:'start',type:'start_chatflow',config:{conversation_id:{ref:'trigger.aggregate_id'},chatflow_version_id:cv},next:'end'},{key:'end',type:'end',config:{outcome:'done'}}]};
  const supported={...retired,entry_node:'end',nodes:[{key:'end',type:'end',config:{outcome:'done'}}]};
  for(const [d,version,r,g] of [[w,v,run,retired],[keep,kv,kr,supported]]){
   await ds.query('INSERT INTO workflow_definition(id,tenant_id,`key`,name,service_actor_id) VALUES (?,?,?,?,?)',[d,t,'retire_'+d.replaceAll('-',''),'Synthetic retirement acceptance',c.actor]);
   await ds.query("INSERT INTO workflow_version(id,tenant_id,definition_id,number,graph,execution_role_id,state) VALUES (?,?,?,1,?,?,'published')",[version,t,d,JSON.stringify(g),c.role_id]);
   await ds.query('UPDATE workflow_definition SET active_version_id=?,enabled=1 WHERE tenant_id=? AND id=?',[version,t,d]);
   await ds.query("INSERT INTO workflow_run(id,tenant_id,definition_id,version_id,trigger_event_id,service_actor_id,current_node,context,status,correlation_id) VALUES (?,?,?,?,?,?,?,?,'waiting','synthetic-retirement')",[r,t,d,version,randomUUID(),c.actor,g.entry_node,JSON.stringify({trigger:{aggregate_id:c.conversation},outputs:{}})]);
   await ds.query("INSERT INTO workflow_step_run(tenant_id,run_id,node_key,status,input,action_key) VALUES (?,?,?,'running',JSON_OBJECT(),?)",[t,r,g.entry_node,r]);
   await ds.query("INSERT INTO workflow_wait(tenant_id,run_id,node_key,kind,event_type,match_key,resume_at,status) VALUES (?,?,?,'event',?,?,TIMESTAMPADD(DAY,1,UTC_TIMESTAMP(6)),'waiting')",[t,r,g.entry_node,d===w?'chatflow.completed':'lead.accepted',session]);
  }
  if(!c.conversation){fixtures.push({tenant:t,definition:w,version:v,run,keep,kv,kr,lead:null});continue;}
  await ds.query('INSERT INTO chatflow_definition(id,tenant_id,`key`,name) VALUES (?,?,?,?)',[cf,t,'retire_'+cf.replaceAll('-',''),'Synthetic retirement']);
  await ds.query("INSERT INTO chatflow_version(id,tenant_id,definition_id,number,graph,state) VALUES (?,?,?,1,JSON_OBJECT(),'published')",[cv,t,cf]);
  await ds.query('UPDATE chatflow_definition SET active_version_id=? WHERE tenant_id=? AND id=?',[cv,t,cf]);
  await ds.query("INSERT INTO chatflow_session(id,tenant_id,version_id,parent_run_id,start_action_key,conversation_id,service_actor_id,execution_role_id,node_key,status,owner_revision) VALUES (?,?,?,?,?,?,?,?,'start','waiting_message',1)",[session,t,cv,run,session,c.conversation,c.actor,c.role_id]);
  await ds.query("INSERT INTO chatflow_node_run(tenant_id,session_id,node_key,status) VALUES (?,?,'start','waiting')",[t,session]);
  const [message]=await ds.query('SELECT id FROM message WHERE tenant_id=? AND conversation_id=? LIMIT 1',[t,c.conversation]);
  if(message)await ds.query("INSERT INTO chatflow_turn(tenant_id,session_id,message_id,node_key,status) VALUES (?,?,?,'start','validated')",[t,session,message.id]);
  let [type]=await ds.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='lead'",[t]);
  if(!type){type={id:randomUUID()};await ds.query("INSERT INTO object_type(id,tenant_id,`key`,label,kind,created_at,updated_at) VALUES (?,?,'lead','Lead','standard',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[type.id,t]);}
  await ds.query('INSERT INTO crm_record(id,tenant_id,object_type_id,created_at,updated_at) VALUES (?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[lead,t,type.id]);
  await ds.query("INSERT INTO `lead`(tenant_id,record_id,contact_id,conversation_id,qualification_session_id,status,qualification) VALUES (?,?,?,?,?,'qualified',JSON_OBJECT('need_summary','Synthetic retained need'))",[t,lead,c.contact_id,c.conversation,session]);
  await ds.query('UPDATE chatflow_session SET lead_id=? WHERE tenant_id=? AND id=?',[lead,t,session]);
  fixtures.push({tenant:t,definition:w,version:v,run,keep,kv,kr,lead});
 }
 record('populated Chatflow/Lead fixture and Workflow isolation in two retained tenants');
 const preserved=['contact','lead','deal','conversation','message','crm_record','account','membership','tenant','audit_entry','workflow_version','workflow_action'];
 const snapshots={};
 for(const table of preserved){const columns=(await ds.query('SELECT COLUMN_NAME name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION',[table])).map(c=>c.name).filter(c=>c!=='qualification_session_id');snapshots[table]={columns,rows:await ds.query(`SELECT ${columns.map(c=>'`'+c+'`').join(',')} FROM \`${table}\``)};}
 assert.equal(await migrate(ds),1);record('forward43 applied to populated schema42 with FK checks enabled');
 for(const [table,{columns,rows}] of Object.entries(snapshots))assert.equal(digest(await ds.query(`SELECT ${columns.map(c=>'`'+c+'`').join(',')} FROM \`${table}\``)),digest(rows),table);
 record('business rows, Lead qualification, audit, immutable Workflow graphs/actions preserved');
 for(const f of fixtures){
  const [d]=await ds.query('SELECT enabled,active_version_id FROM workflow_definition WHERE tenant_id=? AND id=?',[f.tenant,f.definition]);assert.equal(Number(d.enabled),0);assert.equal(d.active_version_id,null);
  const [r]=await ds.query('SELECT status,error_code,cancel_pending FROM workflow_run WHERE tenant_id=? AND id=?',[f.tenant,f.run]);assert.equal(r.status,'cancelled');assert.equal(r.error_code,'CHATFLOW_RETIRED');assert.equal(Number(r.cancel_pending),0);
  assert.equal((await ds.query('SELECT status FROM workflow_wait WHERE tenant_id=? AND run_id=?',[f.tenant,f.run]))[0].status,'cancelled');
  assert.equal((await ds.query('SELECT status FROM workflow_run WHERE tenant_id=? AND id=?',[f.tenant,f.kr]))[0].status,'waiting');
  // Retained synthetic supported run is terminalized by fixture cleanup, not by retirement.
  await ds.query("UPDATE workflow_run SET status='cancelled' WHERE tenant_id=? AND id=?",[f.tenant,f.kr]);await ds.query('UPDATE workflow_definition SET enabled=0 WHERE tenant_id=? AND id=?',[f.tenant,f.keep]);
 }
 record('only retired active workflows cancelled; supported workflow unchanged in both tenants');
 assert.equal((await ds.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE 'chatflow%' ")).length,0);
 assert.equal((await ds.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND COLUMN_NAME IN ('qualification_session_id','chatflow_session_id')")).length,0);
 assert.equal((await ds.query("SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lead' AND NON_UNIQUE=0 GROUP BY INDEX_NAME HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX)='tenant_id'")).length,0);record('tables, references and dangerous tenant-only unique index absent');
 assert.equal(await migrate(ds),0);validateJournal(await ds.query('SELECT version,name,checksum,state FROM schema_migration ORDER BY version'),migrations,true);record('repeat migration no-op; historical checksums preserved');
 assert.throws(()=>validateGraph({trigger:{event_type:'conversation.created',connection_id:randomUUID()},entry_node:'start',nodes:[{key:'start',type:'start_chatflow',config:{}}]}),/INVALID_WORKFLOW_GRAPH/);record('retired primitive rejected by current Workflow validator');
 await mkdir('artifacts/chatflow-retirement',{recursive:true});await writeFile('artifacts/chatflow-retirement/native.json',JSON.stringify({status:'PASS',database:env.MYSQL_DATABASE,checks,fixtures,preservation:Object.fromEntries(Object.entries(snapshots).map(([t,s])=>[t,{count:s.rows.length,digest:digest(s.rows)}]))},null,2));
 }
}catch(e){console.error('RETIREMENT_TEST_FAILED',e.code??e.message,e.code==='ERR_ASSERTION'?e.message:e.query?.slice(0,110)??'');process.exitCode=1;}finally{await ds.destroy();}
