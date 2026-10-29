import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {config,pool,privateRoot,profileName,rootSQL} from './lib/chat-native.mjs';
import {loadSnapshot,decodeChunk,key} from './lib/chat-export.mjs';
import {selectSnapshot} from './lib/chat-selection.mjs';
import {validateReferences} from './lib/chat-references.mjs';
import {loadExceptions,readAuditArchive} from './lib/chat-exceptions.mjs';
import {verifyFrozenSource,recoveryEvidence,recoveryDecision} from './lib/chat-recovery.mjs';
import {importSnapshot,reconcile,validateCandidate} from './lib/chat-import.mjs';
import {canonical,sha} from './lib/chat-exact.mjs';
import {ChatTenantStore} from '../services/chat/dist/tenant-store.js';
if(profileName!=='final')throw new Error('FINAL_PROFILE_REQUIRED');
const cfg=await config(),latest=JSON.parse(await readFile(privateRoot+'/latest.json','utf8')),snapshot=await loadSnapshot(latest.file,cfg),plan=await selectSnapshot(snapshot),p=pool(cfg,'migrator',cfg.destination),dir='artifacts/chat-extraction/t03/final';
await mkdir(dir,{recursive:true});const results=[],expectedRows=Object.values(plan.selected).reduce((n,r)=>n+r.length,0),mainBefore=sha(rootSQL('SELECT version,name,checksum,state FROM agentic_crm.schema_migration ORDER BY version;'));
async function check(name,fn){const start=performance.now(),detail=await fn();results.push({name,status:'PASS',milliseconds:Math.round(performance.now()-start),...detail});console.log('PASS '+name);}
async function negative(change,pattern=/NO_GO_/){const s=structuredClone(snapshot);change(s.rows);await assert.rejects(selectSnapshot(s),pattern);}
async function transaction(work){const c=await p.getConnection();try{await c.beginTransaction();await work(c);}finally{await c.rollback();c.release();}}
try{
 await check('native remote note/automation backlogs preserve completed receipts and absent inboxes',async()=>{
  const [rows]=await p.query('SELECT tenant_id,producer,consumer_name,aggregate_id,CAST(sequence AS CHAR) AS sequence,state,envelope_json FROM chat_event_inbox ORDER BY tenant_id,producer,consumer_name,aggregate_id,sequence');
  assert.equal(rows.length,10);
  for(const tenant of snapshot.manifest.tenants){
   const notes=rows.filter(r=>r.tenant_id===tenant&&r.consumer_name==='chat.activity.note.v1');assert.deepEqual(notes.map(r=>[r.sequence,r.state]),[['1','applied'],['2','pending'],['3','applied']]);
   const stream=plan.mappings.find(m=>m.kind==='owner-event-import'&&m.owner==='crm'&&m.stream.tenant_id===tenant);assert.equal(stream.stream.acked_through,'1');assert.equal(stream.stream.next_sequence,'4');
   assert.equal(rows.find(r=>r.tenant_id===tenant&&r.producer==='workflow').state,'applied');
  }
  const [[remote]]=await p.query("SELECT COUNT(*) AS n FROM outbox_event WHERE event_type IN ('crm.conversation_note.changed','automation.conversation_activity.v1','synthetic.legacy.note')");assert.equal(Number(remote.n),0);
  const [legacy]=await p.query('SELECT tenant_id,event_id,processed_at FROM consumer_inbox');assert.equal(legacy.length,6);
  for(const r of legacy){const original=snapshot.rows.consumer_inbox.find(x=>x.tenant_id===r.tenant_id&&x.event_id===r.event_id);assert.equal(r.processed_at,original.processed_at);}
 });
 await check('native Chat producer streams and minimized registry seeds initialize each subscriber',async()=>{
  const [streams]=await p.query('SELECT * FROM chat_event_stream'),[deliveries]=await p.query('SELECT * FROM chat_event_delivery');assert.equal(streams.length,14);assert.equal(deliveries.length,14);
  assert(streams.every(r=>String(r.acked_through)==='0'&&String(r.next_sequence)==='2'));assert(deliveries.every(r=>r.state==='pending'));
  const [events]=await p.query("SELECT payload FROM outbox_event WHERE event_type='chat.registry.changed.v1'");assert.equal(events.length,4);
  for(const {payload} of events){const e=JSON.parse(payload);assert.equal(e.snapshot.owner_revision,'9007199254740995');assert.equal(e.snapshot.record_version,'9007199254740993');assert.equal(e.snapshot.control_revision,'1');assert(!('text' in e.snapshot));}
  assert.equal(plan.mappings.filter(m=>m.kind==='workflow-selection-import'&&m.version_id).length,2);
 });
 await check('strict baseline payload and native reference negatives reject corruption before destination writes',async()=>{
  await negative(r=>{r.outbox_event.find(e=>e.event_type==='message.received').payload='{}';},/EVENT_SCHEMA/);
  await negative(r=>{const e=r.outbox_event.find(e=>e.event_type==='automation.conversation_activity.v1'),d=JSON.parse(e.payload);d.definition_version_id=snapshot.rows.workflow_version.find(v=>v.tenant_id!==e.tenant_id).id;e.payload=JSON.stringify(d);},/LOGICAL_|AUTOMATION/);
  await negative(r=>{const x=r.session_milestone_event[0];x.message_id=r.message.find(m=>m.tenant_id!==x.tenant_id).id;},/LOGICAL_message/);
  await negative(r=>{r.session_contribution[0].source_revision='999';},/CONTRIBUTION/);
  await negative(r=>{const x=r.message_acquisition_membership[0];x.session_id=r.conversation_acquisition_session.find(s=>s.tenant_id!==x.tenant_id).id;});
  await negative(r=>{r.principal[0].membership_id='01900000-0000-7000-8000-000000009999';},/LOGICAL_membership/);
  await negative(r=>{r.chat_outbound_job[0].attempt_id='01900000-0000-7000-8000-000000009999';},/DISPATCH_COLUMNS/);
  await negative(r=>{r.chat_dispatch_claim[0].grant_id='01900000-0000-7000-8000-000000009999';},/LOGICAL_identity_dispatch_grant/);
  await negative(r=>{const x=r.chat_dispatch_claim[0];r.chat_outbound_job=r.chat_outbound_job.filter(j=>j.intent_id!==x.intent_id);},/UNROUTABLE_UNKNOWN/);
  await negative(r=>{r.workflow_run[0].status='running';},/ACTIVE_WORK/);
  // Actual table name is critical: an otherwise empty AI table must not bypass drain.
  const ai=structuredClone(snapshot);ai.rows.agent_execution.push({tenant_id:snapshot.manifest.tenants[0],status:'running'});await assert.rejects(validateReferences(ai,plan.selected,[]),/ACTIVE_WORK/);
  return {negativeCases:12,scope:'native-export logical validator; no domain effect replay'};
 });
 await check('native queued/unknown jobs keep original binding and reconciliation-only routes',async()=>{
  const [jobs]=await p.query('SELECT * FROM chat_outbound_job');assert.equal(jobs.length,4);
  for(const j of jobs){const original=snapshot.rows.chat_outbound_job.find(x=>x.tenant_id===j.tenant_id&&x.intent_id===j.intent_id);for(const col of ['attempt_id','delegation_id','grant_id','claim_id','phase','status'])assert.equal(j[col],original[col]);assert.equal(canonical(JSON.parse(j.binding_json)),canonical(JSON.parse(original.binding_json)));}
  const routes=plan.mappings.filter(m=>m.kind==='dispatch-recovery');assert.equal(routes.length,2);assert(routes.every(m=>m.resend===false&&m.route==='connector-receipt-status-only'));
  const [claims]=await p.query('SELECT attempt_id,claim_id FROM chat_dispatch_claim');assert.equal(claims.length,2);assert(claims.every(c=>routes.some(r=>r.attempt_id===c.attempt_id&&r.claim_id===c.claim_id)));
  return {providerCalls:0,lateResultRuntime:'NOT_RUN_T07_T09'};
 });
 await check('reviewer signatures bind exact synthetic exceptions and encrypted archive pages enforce current scope',async()=>{
  const exceptions=await loadExceptions(snapshot);assert.equal(exceptions.entries.length,6);
  const [a,b]=snapshot.manifest.tenants,principal=snapshot.rows.principal.find(p=>p.tenant_id===a).id;
  const allow=async x=>({...x,allowed:true,validUntil:Date.now()+1000});
  const page=await readAuditArchive(snapshot,exceptions,{tenant:a,principal,authorize:allow});assert.equal(page.data.length,1);assert.equal(page.data[0].id,snapshot.rows.audit_entry.find(r=>r.tenant_id===a&&r.action==='synthetic.legacy.note').id);assert.deepEqual(Object.keys(page.data[0]).sort(),['id','action','resource_type','outcome','occurred_at'].sort());
  await assert.rejects(readAuditArchive(snapshot,exceptions,{tenant:a,principal,authorize:async x=>({...await allow(x),tenant:b})}),/ARCHIVE_FORBIDDEN/);
  await assert.rejects(readAuditArchive(snapshot,exceptions,{tenant:a,principal,authorize:async x=>({...await allow(x),allowed:false})}),/ARCHIVE_FORBIDDEN/);
  await assert.rejects(readAuditArchive(snapshot,exceptions,{tenant:a,principal,authorize:async x=>({...await allow(x),validUntil:0})}),/ARCHIVE_FORBIDDEN/);
  await assert.rejects(readAuditArchive(snapshot,exceptions,{tenant:a,principal,limit:101,authorize:allow}),/ARCHIVE_SCOPE/);
  const file=privateRoot+'/approvals.json',bytes=await readFile(file);
  try{const bad=JSON.parse(bytes);bad.entries[0].reason+=' changed after signature';await writeFile(file,JSON.stringify(bad));await assert.rejects(loadExceptions(snapshot),/EXCEPTION_SIGNATURE/);}finally{await writeFile(file,bytes);}
  await negative(r=>{r.idempotency_record.find(r=>r.route_key==="POST /synthetic/legacy/core-note").request_hash='0'.repeat(64);},/EXCEPTION_ROW_BINDING/);
  return {reviewer:'synthetic-test-only',authorization:'current adapter contract exercised; runtime Identity integration T04'};
 });
 await check('native tenant write/job positive controls rollback and stream/read-state EXPLAIN use indexes',async()=>{
  const a=plan.selected.chat_outbound_job[0],b=plan.selected.chat_outbound_job.find(j=>j.tenant_id!==a.tenant_id),worker=pool(cfg,'worker',cfg.destination),c=await worker.getConnection();
  try{await c.beginTransaction();assert(await new ChatTenantStore(c,a.tenant_id).job(a.intent_id));assert.equal(await new ChatTenantStore(c,b.tenant_id).job(a.intent_id),null);const [wrong]=await c.execute('UPDATE chat_outbound_job SET failures=failures+1 WHERE tenant_id=? AND intent_id=?',[b.tenant_id,a.intent_id]);assert.equal(wrong.affectedRows,0);const [own]=await c.execute('UPDATE chat_outbound_job SET failures=failures+1 WHERE tenant_id=? AND intent_id=?',[a.tenant_id,a.intent_id]);assert.equal(own.affectedRows,1);}finally{await c.rollback();c.release();await worker.end();}
  await transaction(async c=>{const tag=plan.selected.conversation_tag[0];await c.execute("UPDATE chat_writer_gate SET mode='active' WHERE tenant_id IN (?,?)",[a.tenant_id,b.tenant_id]);const other=tag.tenant_id===a.tenant_id?b.tenant_id:a.tenant_id;
   const id='01900000-0000-7000-8000-000000009991';
   await c.execute("INSERT INTO conversation_tag(tenant_id,id,name,normalized_name,color,created_at,updated_at) VALUES (?,?,'Scoped final probe','scoped final probe','blue',?,?)",[tag.tenant_id,id,tag.created_at,tag.updated_at]);
   assert.equal(await new ChatTenantStore(p,other).renameTag(c,id,'1','Denied','1'),false);assert.equal(await new ChatTenantStore(p,tag.tenant_id).renameTag(c,id,'1','Rollback only','1'),true);
  });
  const probes=[['read-state','EXPLAIN SELECT id FROM conversation_read_state WHERE tenant_id=? AND conversation_id=? AND principal_id=?',[a.tenant_id,a.conversation_id,a.principal_id]],['stream','EXPLAIN SELECT sequence FROM chat_event_delivery WHERE tenant_id=? AND consumer_name=? AND aggregate_type=? AND aggregate_id=? AND sequence>? ORDER BY sequence LIMIT 100',[a.tenant_id,'crm.chat-registry.v1','conversation',a.conversation_id,'0']]];
  const reports=[];for(const [name,sql,args] of probes){const [r]=await p.query(sql,args);assert(r.some(r=>r.key||r.possible_keys));reports.push({name,rows:r});}await writeFile(dir+'/explain-final.json',JSON.stringify(reports,null,2));
 });
 await check('immutable encrypted export rejects corruption and complete plan refuses changed derived rows',async()=>{
  const table=snapshot.manifest.tables.find(t=>t.name==='message'),chunk=table.chunks[0],bytes=await readFile(privateRoot+'/exports/'+snapshot.manifest.run+'/'+chunk.file),bad=Buffer.from(bytes);bad[20]^=1;
  const encryptionKey=await key();assert.throws(()=>decodeChunk(bad,encryptionKey,snapshot.manifest.run,table,chunk),/SNAPSHOT_CIPHER/);
  const changed=structuredClone(plan);changed.selected.chat_event_inbox[0].state=changed.selected.chat_event_inbox[0].state==='pending'?'applied':'pending';await assert.rejects(importSnapshot(cfg,snapshot,changed),/PLAN_BINDING_CHANGED/);
  await transaction(async c=>{const t=plan.selected.conversation_tag[0];await c.execute('UPDATE conversation_tag SET name=? WHERE tenant_id=? AND id=?',['Corrupt rollback probe',t.tenant_id,t.id]);await assert.rejects(validateCandidate(c,snapshot,plan),/RECONCILE_HASH/);});
 });
 await check('native frozen source fingerprint and pristine candidate qualify storage recovery only',async()=>{
  const source=await verifyFrozenSource(cfg,snapshot);assert.equal(source.frozen,true);
  const changed=structuredClone(snapshot);changed.manifest.tables.find(t=>t.name==='message').tableHash='0'.repeat(64);await assert.rejects(verifyFrozenSource(cfg,changed),/RECOVERY_SOURCE_CHANGED/);
  for(const destination of [cfg.destination,cfg.restore]){const evidence=await recoveryEvidence(cfg,snapshot,plan,{destination});assert.equal(evidence.pristineShadow,true);assert.equal(evidence.sourceReturn,false);assert.equal(evidence.decision,'NO_GO_INCOMPLETE_EFFECT_PROOFS');}
  const owners=['chat','crm','sales','routing','identity','workflow','ai-runtime','connector','provider'],proofs=owners.map(owner=>({owner,effects:'none',complete:true,fenced:true}));
  assert.equal(recoveryDecision({pristine:true,sourceVerified:true,effects:false,proofs}).decision,'PRE_EFFECT_SOURCE_RETURN_ELIGIBLE');
  for(const effects of [true,undefined,'unknown'])assert.equal(recoveryDecision({pristine:true,sourceVerified:true,effects,proofs}).decision,'FREEZE_FORWARD_RECOVERY');
  assert.equal(recoveryDecision({pristine:true,sourceVerified:true,effects:false,proofs:proofs.slice(1)}).sourceReturn,false);
  assert.equal(recoveryDecision({pristine:false,sourceVerified:true,effects:false,proofs}).sourceReturn,false);
  return {nativeSourceRows:snapshot.manifest.tables.reduce((n,t)=>n+t.rowCount,0),remoteEffects:'synthetic decision inputs only; composed T09 NOT_RUN',sourceUnlocked:false};
 });
 await check('final preservation replay validates both candidates with zero inserted rows and no main changes',async()=>{
  for(const destination of [cfg.destination,cfg.restore]){const replay=await importSnapshot(cfg,snapshot,plan,{destination});assert.equal(replay.copied,0);assert.equal(replay.replayed,expectedRows);const report=await reconcile(cfg,snapshot,plan,{destination});assert.equal(report.rows,expectedRows);}
  const [gates]=await p.query('SELECT mode,epoch FROM chat_writer_gate');assert(gates.every(g=>g.mode==='shadow'&&String(g.epoch)==='1'));const [runs]=await p.query('SELECT state FROM chat_migration_run');assert(runs.every(r=>r.state==='validated'));
  assert.equal(sha(rootSQL('SELECT version,name,checksum,state FROM agentic_crm.schema_migration ORDER BY version;')),mainBefore);
 });
 const base=JSON.parse(await readFile(dir+'/native.json','utf8'));assert.equal(base.passed,true);
 await writeFile(dir+'/acceptance.json',JSON.stringify({passed:true,scope:'T03-native-storage-migration',run:snapshot.manifest.run,source:cfg.source,destination:cfg.destination,restore:cfg.restore,selectedRows:expectedRows,baselineGroups:base.results.length,results,mainJournalUnchanged:true,t04Started:false,limitations:['Active work is fail-closed until source owner proves current generation or drains; none guessed','Synthetic reviewer signatures only; main requires real reviewed per-row decisions','Runtime authorization/owner adapters T04/T06','Provider effects and composed return/forward recovery T09']},null,2));
}catch(e){await writeFile(dir+'/final-failure-'+Date.now()+'.json',JSON.stringify({passed:false,code:e.code??e.message,completed:results},null,2));console.error('FAIL',e.code??e.message,e.actual instanceof Error?e.actual.message:'',e.stack?.split('\n').filter(line=>line.trim().startsWith('at ')).slice(0,4).join('\n'));process.exitCode=1;}finally{await p.end();}
