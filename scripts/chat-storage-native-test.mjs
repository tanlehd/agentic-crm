import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {config,pool,privateRoot,provisionRuntime,rootSQL} from './lib/chat-native.mjs';
import {loadSnapshot,exportSnapshot,assertFence} from './lib/chat-export.mjs';
import {selectSnapshot} from './lib/chat-selection.mjs';
import {importSnapshot,reconcile} from './lib/chat-import.mjs';
import {sha,canonical} from './lib/chat-exact.mjs';
import {migrate,artifacts,verifyTable} from '../services/chat/dist/schema.js';
import {ChatTenantStore} from '../services/chat/dist/tenant-store.js';
const cfg=await config(),latest=JSON.parse(await readFile(`${privateRoot}/latest.json`,'utf8')),fixture=JSON.parse(await readFile(`${privateRoot}/fixture.json`,'utf8'));
const snapshot=await loadSnapshot(latest.file,cfg),plan=await selectSnapshot(snapshot),results=[],dir=process.env.CHAT_STORAGE_EVIDENCE_DIR??'artifacts/chat-extraction/t03';await mkdir(dir,{recursive:true});
const expectedRows=Object.values(plan.selected).reduce((n,rows)=>n+rows.length,0);
const faultsInjectedThisRun={ddl:false,beforeChunkCommit:false,afterChunkCommit:false,snapshotLoss:false};
const p=pool(cfg,'migrator',cfg.destination),restore=pool(cfg,'migrator',cfg.restore);
const mainBefore=sha(rootSQL('SELECT version,name,checksum,state FROM agentic_crm.schema_migration ORDER BY version;'));
async function check(name,fn){const at=performance.now();await fn();results.push({name,status:'PASS',milliseconds:Math.round(performance.now()-at)});console.log('PASS '+name);}
const denied=fn=>assert.rejects(fn,e=>['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR','ER_SPECIFIC_ACCESS_DENIED_ERROR','ER_ACCESS_DENIED_ERROR','ER_ACCOUNT_HAS_BEEN_LOCKED'].includes(e.code));
try{
 await check('own59tables,43localFKs and unchanged migration no-op',async()=>{
  const [before]=await p.query('SELECT * FROM schema_migration ORDER BY version');assert.equal(before.length,2);assert(before.every(r=>r.state==='applied'));
  assert.equal(await migrate(p,2),0);const [after]=await p.query('SELECT * FROM schema_migration ORDER BY version');assert.deepEqual(after,before);
  const [foreign]=await p.query('SELECT COUNT(*) AS n FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()');assert.equal(Number(foreign[0].n),43);
  const [cross]=await p.query('SELECT COUNT(*) AS n FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_SCHEMA<>DATABASE()');assert.equal(Number(cross[0].n),0);
 });
 await check('retained populated replay and signed per-tenant count/hash validation',async()=>{
  const r=await importSnapshot(cfg,snapshot,plan);assert.equal(r.copied,0);assert.equal(r.replayed,expectedRows);
  const result=await reconcile(cfg,snapshot,plan);assert.equal(result.rows,expectedRows);assert.equal(result.tenants,2);
 });
 await check('native uint64,decimal,JSON,Unicode,microsecond and archived registry values',async()=>{
  const alpha=fixture.labels.alpha;
  const [[record]]=await p.query('SELECT CAST(version AS CHAR) AS version,CAST(owner_revision AS CHAR) AS owner_revision,CAST(created_at AS CHAR) AS at FROM crm_record WHERE tenant_id=? AND id=?',[alpha.tenant,alpha.conversation]);
  assert.deepEqual({...record},{version:'9007199254740993',owner_revision:'9007199254740995',at:fixture.now});
  const [[decimal]]=await p.query("SELECT CAST(decimal_value AS CHAR) AS value FROM property_index_value WHERE tenant_id=? AND value_kind='decimal'",[alpha.tenant]);assert.equal(decimal.value,'12345678901234.123456');
  const [[json]]=await p.query("SELECT CAST(JSON_EXTRACT(content,'$.exact') AS CHAR) AS value FROM message_content WHERE tenant_id=? LIMIT 1",[alpha.tenant]);assert.equal(json.value,'9007199254740993');
  const [[archived]]=await p.query('SELECT active_identity_key FROM conversation WHERE tenant_id=? AND record_id=?',[alpha.tenant,alpha.archived]);assert.equal(archived.active_identity_key,null);
  const notes=plan.mappings.filter(m=>m.child_command_id);assert.equal(notes.length,2);assert.equal(new Set(notes.map(m=>m.child_command_id)).size,2);
  const [[receipts]]=await p.query('SELECT COUNT(*) AS n FROM idempotency_record');assert.equal(Number(receipts.n),4);
 });
 await check('DDL autocommit interruption resumes from verified native metadata',async()=>{
  const [journal]=await restore.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='schema_migration'");
  if(!journal.length){faultsInjectedThisRun.ddl=true;await assert.rejects(migrate(restore,1,{afterStatement:async(v,i)=>{if(v===1&&i===4)throw new Error('INJECT_DDL');}}),/INJECT_DDL/);const [[r]]=await restore.query('SELECT state FROM schema_migration WHERE version=1');assert.equal(r.state,'failed');}
  await migrate(restore,1);
  const c=await restore.getConnection();try{for(const t of plan.dictionary.tables)await verifyTable(c,t);}finally{c.release();}
 });
 await check('chunk rollback before commit and lost ACK after commit resume without duplicates',async()=>{
  const [[count]]=await restore.query('SELECT COUNT(*) AS n FROM message');
  if(Number(count.n)===0){
   faultsInjectedThisRun.beforeChunkCommit=true;faultsInjectedThisRun.afterChunkCommit=true;
   await assert.rejects(importSnapshot(cfg,snapshot,plan,{destination:cfg.restore,beforeCommit:async info=>{if(info.table==='message')throw new Error('INJECT_BEFORE_COMMIT');}}),/INJECT_BEFORE_COMMIT/);
   const [[empty]]=await restore.query('SELECT COUNT(*) AS n FROM message');assert.equal(Number(empty.n),0);
   const [[checkpoints]]=await restore.query("SELECT COUNT(*) AS n FROM chat_migration_chunk WHERE table_name='message'");assert.equal(Number(checkpoints.n),0);
   await assert.rejects(importSnapshot(cfg,snapshot,plan,{destination:cfg.restore,afterCommit:async info=>{if(info.table==='message')throw new Error('INJECT_AFTER_COMMIT');}}),/INJECT_AFTER_COMMIT/);
   const [[committed]]=await restore.query('SELECT COUNT(*) AS n FROM message');assert.equal(Number(committed.n),1000);
   const [[saved]]=await restore.query("SELECT COUNT(*) AS n FROM chat_migration_chunk WHERE table_name='message'");assert.equal(Number(saved.n),1);
  }
  await importSnapshot(cfg,snapshot,plan,{destination:cfg.restore});const report=await reconcile(cfg,snapshot,plan,{destination:cfg.restore});assert.equal(report.rows,expectedRows);
 });
 await check('separate encrypted export restores to retained own-schema with matching counts',async()=>{
  const a=JSON.parse(await readFile(`${privateRoot}/validations/${snapshot.manifest.run}-${cfg.destination}.json`,'utf8')),b=JSON.parse(await readFile(`${privateRoot}/validations/${snapshot.manifest.run}-${cfg.restore}.json`,'utf8'));
  assert.deepEqual(a.reports,b.reports);
 });
 await provisionRuntime();
 await check('native runtime/source roles deny remote SQL,DDL,journal and immutable updates',async()=>{
  for(const role of ['api','worker']){
   const api=pool(cfg,role,cfg.destination);
   try{
    await api.query('SELECT COUNT(*) FROM conversation');
    for(const sql of ['SELECT * FROM '+cfg.source+'.crm_record LIMIT 1','SELECT * FROM agentic_crm.crm_record LIMIT 1','SELECT * FROM '+cfg.restore+'.crm_record LIMIT 1','CREATE TABLE denied_probe(tenant_id CHAR(36) NOT NULL)','UPDATE schema_migration SET state=state','UPDATE audit_entry SET action=action','UPDATE chat_writer_gate SET mode=mode'])await denied(()=>api.query(sql));
   }finally{await api.end();}
  }
  const exporter=pool(cfg,'export',cfg.source);try{await exporter.query('SELECT COUNT(*) FROM conversation');await denied(()=>exporter.query('UPDATE conversation SET status=status'));await denied(()=>exporter.query('SELECT * FROM '+cfg.destination+'.conversation LIMIT 1'));}finally{await exporter.end();}
  const writer=pool(cfg,'fixture',cfg.source);try{await denied(()=>writer.query('SELECT 1'));}finally{await writer.end();}
 });
 await check('tenant-bound native reads and writer shadow fence',async()=>{
  const api=pool(cfg,'api',cfg.destination),a=fixture.labels.alpha,b=fixture.labels.beta;
  try{
   const alpha=new ChatTenantStore(api,a.tenant),beta=new ChatTenantStore(api,b.tenant);
   assert.equal((await alpha.tag(a.tag)).name,'alpha');assert.equal((await beta.tag(b.tag)).name,'beta');
   const [[message]]=await p.query('SELECT id FROM message WHERE tenant_id=? LIMIT 1',[a.tenant]);assert(await alpha.message(message.id));assert.equal(await beta.message(message.id),null);
   assert.throws(()=>new ChatTenantStore(api,'01900000-0000-7000-8000-000000000001'),/BUSINESS_TENANT/);
   await assert.rejects(alpha.transaction(c=>alpha.renameTag(c,a.tag,'1','Denied','1')),/WRITER_FENCED/);
   // Actual permitted DML rolls back; the probe cannot become a domain effect.
   const c=await api.getConnection();try{await c.beginTransaction();const [r]=await c.execute('UPDATE conversation_tag SET name=? WHERE tenant_id=? AND id=?',['Rollback probe',a.tenant,a.tag]);assert.equal(r.affectedRows,1);await c.rollback();}finally{c.release();}
   assert.equal((await alpha.tag(a.tag)).name,'alpha');assert.equal((await beta.tag(b.tag)).name,'beta');
  }finally{await api.end();}
 });
 await check('unknown executable,subtype,pending receipt,foreign child and bad note refuse before import',async()=>{
  const mutate=async fn=>{const copy=structuredClone(snapshot);fn(copy.rows);await assert.rejects(selectSnapshot(copy),/NO_GO_/);};
  await mutate(r=>{r.idempotency_record[0].route_key='unregistered';});
  await mutate(r=>{r.idempotency_record[0].status='pending';});
  await mutate(r=>{r.conversation[0].tenant_id=r.conversation[0].tenant_id===fixture.labels.beta.tenant?fixture.labels.alpha.tenant:fixture.labels.beta.tenant;});
  await mutate(r=>{const c=r.conversation[0];r.contact.push({tenant_id:c.tenant_id,record_id:c.record_id});});
  await mutate(r=>{r.activity[0].related_record_id=r.activity[0].tenant_id===fixture.labels.beta.tenant?fixture.labels.alpha.conversation:fixture.labels.beta.conversation;});
  await mutate(r=>{r.outbox_event[0].payload='{"unregistered":true}';});
  await mutate(r=>{r.property_index_value[0].integer_value='17';r.property_index_value[0].decimal_value='17';});
 });
 await check('snapshot loss never resumes partial export; completed snapshot remains immutable',async()=>{
  await assertFence(cfg);let run;
  faultsInjectedThisRun.snapshotLoss=true;
  await assert.rejects(exportSnapshot(cfg,{expectedTenants:fixture.tenants,afterChunk:async x=>{run=x.run;throw new Error('INJECT_SNAPSHOT_LOSS');}}),/INJECT_SNAPSHOT_LOSS/);
  await assert.rejects(loadSnapshot(`${privateRoot}/exports/${run}/incomplete.json`,cfg),/MANIFEST_SIGNATURE/);
  assert.equal((await loadSnapshot(latest.file,cfg)).manifest.run,snapshot.manifest.run);
 });
 await check('native keyset/queue indexes available without OFFSET',async()=>{
  const a=fixture.labels.alpha;
  const cases=[['timeline','EXPLAIN SELECT id FROM message WHERE tenant_id=? AND conversation_id=? ORDER BY occurred_at,id LIMIT 100',[a.tenant,a.conversation]],['queue',"EXPLAIN SELECT tenant_id,intent_id FROM chat_outbound_job WHERE status='pending' AND next_attempt_at<=UTC_TIMESTAMP(6) ORDER BY next_attempt_at,tenant_id,intent_id LIMIT 25",[]],['receipt','EXPLAIN SELECT id FROM idempotency_record WHERE tenant_id=? AND id=?',[a.tenant,plan.selected.idempotency_record[0].id]],['command','EXPLAIN SELECT command_id FROM chat_owner_command WHERE tenant_id=? AND command_id=?',[a.tenant,plan.selected.chat_owner_command[0].command_id]]];
  const reports=[];for(const [name,sql,args] of cases){const [rows]=await p.query(sql,args);assert(rows.some(r=>r.possible_keys||r.key||r.Extra==='no matching row in const table'));reports.push({name,rows});}
  await writeFile(dir+'/explain.json',JSON.stringify(reports,null,2));
 });
 assert.equal(sha(rootSQL('SELECT version,name,checksum,state FROM agentic_crm.schema_migration ORDER BY version;')),mainBefore);
 await writeFile(dir+'/native.json',JSON.stringify({passed:true,scope:'storage-primitives-only',t03Complete:false,environment:'retained-test',source:cfg.source,destination:cfg.destination,restore:cfg.restore,mainJournalUnchanged:true,sourceJournal42:true,faultsInjectedThisRun,results,limitations:['T04 authorization/API not wired','T06 active-work pins and runtime remote proofs not exercised','T09 main cutover not run']},null,2));
}catch(e){await writeFile(dir+'/native-failure-'+Date.now()+'.json',JSON.stringify({passed:false,code:e.code??e.message,completed:results},null,2));console.error('FAIL',e.code??e.message);process.exitCode=1;}
finally{await p.end();await restore.end();}
