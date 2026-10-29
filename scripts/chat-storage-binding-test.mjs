import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {config,pool,privateRoot,rootSQL} from './lib/chat-native.mjs';
import {loadSnapshot,verified,key,decodeChunk} from './lib/chat-export.mjs';
import {selectSnapshot} from './lib/chat-selection.mjs';
import {describePlan,loadPlan} from './lib/chat-plan.mjs';
import {importSnapshot,reconcile,adoptPlan,validateCandidate} from './lib/chat-import.mjs';
import {canonical,sha} from './lib/chat-exact.mjs';
import {ChatTenantStore} from '../services/chat/dist/tenant-store.js';
const cfg=await config(),latest=JSON.parse(await readFile(`${privateRoot}/latest.json`,'utf8'));
const snapshot=await loadSnapshot(latest.file,cfg),plan=await selectSnapshot(snapshot),results=[],dir='artifacts/chat-extraction/t03/binding';await mkdir(dir,{recursive:true});
const p=pool(cfg,'migrator',cfg.destination),restore=pool(cfg,'migrator',cfg.restore);
const mainBefore=sha(rootSQL('SELECT version,name,checksum,state FROM agentic_crm.schema_migration ORDER BY version;'));
async function check(name,fn){const at=performance.now(),detail=await fn();results.push({name,status:'PASS',milliseconds:Math.round(performance.now()-at),...(detail??{})});console.log('PASS '+name);}
const checkpoints=async db=>{const [r]=await db.query('SELECT * FROM chat_migration_chunk ORDER BY tenant_id,table_name,chunk_number');return sha(canonical(r));};
const journals=async db=>{const [r]=await db.query('SELECT * FROM schema_migration ORDER BY version');return sha(canonical(r));};
async function rollback(work){const c=await p.getConnection();try{await c.beginTransaction();return await work(c);}finally{await c.rollback();c.release();}}
try{
 const before={destination:{checkpoints:await checkpoints(p),journal:await journals(p)},restore:{checkpoints:await checkpoints(restore),journal:await journals(restore)}};
 await check('explicit adoption authenticates populated candidates and survives commit boundaries',async()=>{
  const injected=[];
  for(const [db,destination,phase] of [[p,cfg.destination,'before'],[restore,cfg.restore,'after']]){
   const [[identity]]=await db.query('SELECT @@server_uuid AS instance,DATABASE() AS db'),binding=await describePlan(cfg,snapshot,plan,identity);
   const [old]=await db.query('SELECT manifest_digest,version FROM chat_migration_run ORDER BY tenant_id');
   if(old[0].manifest_digest!==binding.digest){
    await assert.rejects(importSnapshot(cfg,snapshot,plan,{destination}),/PLAN_BINDING_CHANGED/);
    const options=phase==='before'?{beforeCommit:async()=>{throw new Error('INJECT_ADOPTION_BEFORE_COMMIT');}}:{afterCommit:async()=>{throw new Error('INJECT_ADOPTION_LOST_ACK');}};
    await assert.rejects(adoptPlan(cfg,snapshot,plan,{destination,...options}),phase==='before'?/INJECT_ADOPTION_BEFORE_COMMIT/:/INJECT_ADOPTION_LOST_ACK/);
    const [now]=await db.query('SELECT manifest_digest,version FROM chat_migration_run ORDER BY tenant_id');
    if(phase==='before')assert.deepEqual(now,old);else assert(now.every(r=>r.manifest_digest===binding.digest));injected.push(phase);
   }
   await adoptPlan(cfg,snapshot,plan,{destination});const noOp=await adoptPlan(cfg,snapshot,plan,{destination});assert.equal(noOp.adopted,false);
  }
  return {faultsInjectedThisRun:injected,retainedReuse:injected.length===0};
 });
 await check('encrypted full plan retains exact Core note child mapping without execution',async()=>{
  const [[identity]]=await p.query('SELECT @@server_uuid AS instance,DATABASE() AS db'),binding=await describePlan(cfg,snapshot,plan,identity),saved=await loadPlan(binding);
  assert.deepEqual(saved.mappings,plan.mappings);assert.equal(saved.mappings.length,2);assert.equal(binding.contents.reports.length,2);
  assert(saved.mappings.every(r=>r.effect==='existing-core-note-no-reexecution'));
  const code=structuredClone(binding);code.code.files[0].sha256='0'.repeat(64);delete code.digest;assert.notEqual(sha(canonical(code)),binding.digest);
  return {planDigest:binding.digest,mappingCount:saved.mappings.length,codeFiles:binding.code.files.length};
 });
 await check('changed derived rows,mappings,classification and config cannot resume or reconcile',async()=>{
  const mutations=[x=>{x.selected.chat_dataset_head[0].revision='2';},x=>{x.selected.chat_contact_guard.push({...x.selected.chat_contact_guard[0],contact_id:'01900000-0000-7000-8000-000000009998'});},x=>{x.mappings[0].child_key+='-changed';x.mappingHash=sha(canonical(x.mappings));},x=>{x.dispositions[0].owner='changed';x.classificationHash=sha(canonical(x.dispositions));}];
  for(const change of mutations){const changed=structuredClone(plan);change(changed);await assert.rejects(importSnapshot(cfg,snapshot,changed),/PLAN_BINDING_CHANGED/);await assert.rejects(reconcile(cfg,snapshot,changed),/PLAN_BINDING_CHANGED/);}
  await assert.rejects(importSnapshot({...cfg,environment:'different-profile'},snapshot,plan),/PLAN_BINDING_CHANGED/);
  const changed=structuredClone(plan);changed.mappings[0].child_key+='-changed';changed.mappingHash=sha(canonical(changed.mappings));await assert.rejects(adoptPlan(cfg,snapshot,changed),/ADOPTION_DERIVED_PLAN_CHANGED/);
 });
 await check('native populated row conflict aborts chunk without overwrite',async()=>{
  let injected=false;
  await assert.rejects(importSnapshot(cfg,snapshot,plan,{beforeChunk:async({connection,table,tenant})=>{if(table==='conversation_tag'&&!injected){injected=true;await connection.execute('UPDATE conversation_tag SET name=? WHERE tenant_id=?',['Conflict rollback probe',tenant]);}}}),/RETAINED_ROW_CONFLICT_conversation_tag/);
  assert(injected);await rollback(c=>validateCandidate(c,snapshot,plan));
 });
 await check('native checkpoint conflict aborts atomically and preserves original checkpoint',async()=>{
  let injected=false;
  await assert.rejects(importSnapshot(cfg,snapshot,plan,{beforeChunk:async({connection,table,tenant,number})=>{if(table==='message'&&!injected){injected=true;await connection.execute('UPDATE chat_migration_chunk SET target_hash=? WHERE tenant_id=? AND run_id=? AND table_name=? AND chunk_number=?',['0'.repeat(64),tenant,snapshot.manifest.run,table,number]);}}}),/CHECKPOINT_CONFLICT/);
  assert(injected);assert.equal(await checkpoints(p),before.destination.checkpoints);
 });
 await check('extra empty-table rows,foreign tenants and surplus checkpoints fail complete reconciliation',async()=>{
  await rollback(async c=>{
   const r=plan.selected.chat_writer_gate[0];await c.execute('INSERT INTO chat_writer_gate(tenant_id,epoch,mode,manifest_digest,updated_at) VALUES (?,1,\'shadow\',?,?)',['01900000-0000-7000-8000-000000009999',r.manifest_digest,r.updated_at]);
   await assert.rejects(validateCandidate(c,snapshot,plan),/EXTRA_TENANT_chat_writer_gate/);
  });
  await rollback(async c=>{
   await c.execute('INSERT INTO chat_migration_chunk(tenant_id,run_id,table_name,chunk_number,last_key,row_count,source_hash,target_hash,state,updated_at) SELECT tenant_id,run_id,table_name,999,last_key,row_count,source_hash,target_hash,state,updated_at FROM chat_migration_chunk LIMIT 1');
   await assert.rejects(validateCandidate(c,snapshot,plan),/EXTRA_CHECKPOINT/);
  });
  await rollback(async c=>{
   const r=plan.selected.chat_writer_gate[0];await c.execute("INSERT INTO chat_event_stream(tenant_id,consumer_name,aggregate_type,aggregate_id,next_sequence,acked_through,retained_from,registration_digest,version,created_at,updated_at) VALUES (?,'probe','conversation',?,1,0,1,?,1,?,?)",[r.tenant_id,'01900000-0000-7000-8000-000000009999','0'.repeat(64),r.updated_at,r.updated_at]);
   await assert.rejects(validateCandidate(c,snapshot,plan),/RECONCILE_COUNT_chat_event_stream/);
  });
 });
 await check('retained encrypted snapshot rejects index,ciphertext,tag and AAD tampering',async()=>{
  const signed=JSON.parse(await readFile(latest.file,'utf8'));signed.watermark+='-tampered';await assert.rejects(verified(signed),/MANIFEST_SIGNATURE_INVALID/);
  const t=snapshot.manifest.tables.find(t=>t.name==='message'),chunk=t.chunks[0],cipher=await readFile(`${privateRoot}/exports/${snapshot.manifest.run}/${chunk.file}`),k=await key();
  assert.equal(decodeChunk(cipher,k,snapshot.manifest.run,t,chunk).length,chunk.count);
  const tampered=Buffer.from(cipher);tampered[20]^=1;assert.throws(()=>decodeChunk(tampered,k,snapshot.manifest.run,t,chunk),/CIPHER_MISMATCH/);
  assert.throws(()=>decodeChunk(tampered,k,snapshot.manifest.run,t,{...chunk,cipherHash:sha(tampered)}),/AUTHENTICATION_FAILED/);
  assert.throws(()=>decodeChunk(cipher,k,'01900000-0000-7000-8000-000000009999',t,chunk),/AUTHENTICATION_FAILED/);
 });
 await check('native read-state and stream keyset EXPLAIN use tenant-prefixed access paths',async()=>{
  const g=plan.selected.chat_writer_gate[0],conversation=plan.selected.conversation.find(r=>r.tenant_id===g.tenant_id),principal={id:'01900000-0000-7000-8000-000000009994'};
  const reports=[];
  await rollback(async c=>{
   await c.execute('INSERT INTO conversation_read_state(tenant_id,conversation_id,principal_id,id,last_read_inbound_seq,revision,updated_at) VALUES (?,?,?,?,0,1,?)',[g.tenant_id,conversation.record_id,principal.id,'01900000-0000-7000-8000-000000009999',g.updated_at]);
   await c.execute("INSERT INTO chat_event_stream(tenant_id,consumer_name,aggregate_type,aggregate_id,next_sequence,acked_through,retained_from,registration_digest,version,created_at,updated_at) VALUES (?,'probe','conversation',?,1,0,1,?,1,?,?)",[g.tenant_id,conversation.record_id,'0'.repeat(64),g.updated_at,g.updated_at]);
   const cases=[['read-state','EXPLAIN SELECT last_read_inbound_seq FROM conversation_read_state WHERE tenant_id=? AND principal_id=? AND conversation_id>=? ORDER BY conversation_id LIMIT 100',[g.tenant_id,principal.id,conversation.record_id]],['stream','EXPLAIN SELECT next_sequence,acked_through FROM chat_event_stream WHERE tenant_id=? AND consumer_name=? AND aggregate_type=? AND aggregate_id>=? ORDER BY aggregate_id LIMIT 100',[g.tenant_id,'probe','conversation',conversation.record_id]]];
   for(const [name,sql,args] of cases){const [rows]=await c.query(sql,args);assert(rows.some(r=>r.key||r.possible_keys));reports.push({name,rows,cardinality:'one-transactional-probe-rolled-back'});}
  });await writeFile(dir+'/explain.json',JSON.stringify(reports,null,2));
 });
 await check('native tenant-scoped tag write has opposite-tenant negative and own-tenant positive controls',async()=>{
  const a=plan.selected.conversation_tag[0],b=plan.selected.conversation_tag.find(r=>r.tenant_id!==a.tenant_id);
  await rollback(async c=>{
   const id='01900000-0000-7000-8000-000000009993';
   await c.execute("INSERT INTO conversation_tag(tenant_id,id,name,normalized_name,color,created_at,updated_at) VALUES (?,?,'Scoped storage probe','scoped storage probe','blue',?,?)",[a.tenant_id,id,a.created_at,a.updated_at]);
   await c.execute("UPDATE chat_writer_gate SET mode='active' WHERE tenant_id IN (?,?)",[a.tenant_id,b.tenant_id]);
   const alpha=new ChatTenantStore(p,a.tenant_id),beta=new ChatTenantStore(p,b.tenant_id);
   assert.equal(await beta.renameTag(c,id,'1','Wrong tenant probe','1'),false);
   assert.equal(await alpha.renameTag(c,id,'1','Own tenant probe','1'),true);
   const [[r]]=await c.query('SELECT name FROM conversation_tag WHERE tenant_id=? AND id=?',[a.tenant_id,id]);assert.equal(r.name,'Own tenant probe');
  });
  const [gates]=await p.query('SELECT mode FROM chat_writer_gate');assert(gates.every(g=>g.mode==='shadow'));
  return {scope:'storage-predicate-and-fence',gateActivation:'uncommitted-migrator-transaction-rolled-back',authorization:'NOT_RUN_T04'};
 });
 await check('native worker job reads and DML isolate tenants with a rollback-only positive control',async()=>{
  const worker=pool(cfg,'worker',cfg.destination),c=await worker.getConnection();
  try{
   await c.beginTransaction();const a=plan.selected.conversation[0],b=plan.selected.conversation.find(r=>r.tenant_id!==a.tenant_id),principal={id:'01900000-0000-7000-8000-000000009994'},id='01900000-0000-7000-8000-000000009997',at=snapshot.manifest.source.at;
   await c.execute("INSERT INTO outbound_intent(id,tenant_id,conversation_id,actor_kind,actor_id,owner_revision,text,status,idempotency_key,created_at) VALUES (?,?,?,'human',?,1,'Synthetic storage rollback probe','remote_queued','t03-job-rollback',?)",[id,a.tenant_id,a.record_id,principal.id,at]);
   await c.execute("INSERT INTO chat_outbound_job(tenant_id,intent_id,conversation_id,attempt_id,delegation_id,principal_id,binding_json,resource_json,phase,status,next_attempt_at,failures,version,created_at,updated_at) VALUES (?,?,?,?,?,?,'{}','{}','issue','pending',?,0,1,?,?)",[a.tenant_id,id,a.record_id,'01900000-0000-7000-8000-000000009996','01900000-0000-7000-8000-000000009995',principal.id,at,at,at]);
   // Connection has the same execute API as Pool, so reads see this uncommitted probe.
   assert.equal((await new ChatTenantStore(c,a.tenant_id).job(id)).status,'pending');assert.equal(await new ChatTenantStore(c,b.tenant_id).job(id),null);
   const [wrong]=await c.execute('UPDATE chat_outbound_job SET failures=failures+1 WHERE tenant_id=? AND intent_id=?',[b.tenant_id,id]);assert.equal(wrong.affectedRows,0);
   const [own]=await c.execute('UPDATE chat_outbound_job SET failures=failures+1 WHERE tenant_id=? AND intent_id=?',[a.tenant_id,id]);assert.equal(own.affectedRows,1);
   await c.rollback();const [[count]]=await c.query('SELECT COUNT(*) AS n FROM chat_outbound_job WHERE intent_id=?',[id]);assert.equal(Number(count.n),0);
  }finally{await c.rollback();c.release();await worker.end();}
  return {scope:'native-storage-predicate-and-worker-grants',dispatchAndD2Proofs:'NOT_RUN'};
 });
 await check('same bound plan resumes both retained schemas with no inserted rows',async()=>{
  for(const destination of [cfg.destination,cfg.restore]){const result=await importSnapshot(cfg,snapshot,plan,{destination});assert.equal(result.copied,0);assert.equal(result.replayed,2066);assert.equal((await reconcile(cfg,snapshot,plan,{destination})).rows,2066);}
 });
 assert.equal(await checkpoints(p),before.destination.checkpoints);assert.equal(await checkpoints(restore),before.restore.checkpoints);assert.equal(await journals(p),before.destination.journal);assert.equal(await journals(restore),before.restore.journal);
 assert.equal(sha(rootSQL('SELECT version,name,checksum,state FROM agentic_crm.schema_migration ORDER BY version;')),mainBefore);
 await writeFile(dir+'/native.json',JSON.stringify({passed:true,scope:'T03-plan-binding-storage-primitives',t03Complete:false,mainJournalUnchanged:true,oldCheckpointsAndJournalsUnchanged:true,results},null,2));
}catch(e){await writeFile(dir+'/failure-'+Date.now()+'.json',JSON.stringify({passed:false,code:e.code??e.message,completed:results},null,2));console.error('FAIL',e.code??e.message);process.exitCode=1;}
finally{await p.end();await restore.end();}
