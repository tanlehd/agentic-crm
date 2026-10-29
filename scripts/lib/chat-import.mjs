import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {privateRoot,pool} from './chat-native.mjs';
import {sign,verified} from './chat-export.mjs';
import {canonical,sha,rowHash,chunkHash,tableHash,q,projection,primary} from './chat-exact.mjs';
import {migrate,verifyTable,artifacts} from '../../services/chat/dist/schema.js';
import {migrationTables,typedSort,describePlan,savePlan,readBinding,loadPlan,immutableSigned} from './chat-plan.mjs';
const fail=code=>{throw new Error('NO_GO_'+code);};
function order(tables){
 const done=new Set(),list=[];
 while(list.length<tables.length){const ready=tables.filter(t=>!done.has(t.name)&&t.foreignKeys.every(f=>f.target_table===t.name||done.has(f.target_table)));if(!ready.length)fail('CYCLIC_LOCAL_IMPORT');for(const t of ready){done.add(t.name);list.push(t);}}
 return list;
}
async function read(c,t,row){const keys=primary(t),[found]=await c.query('SELECT '+projection(t)+' FROM '+q(t.name)+' WHERE '+keys.map(k=>q(k)+'=?').join(' AND ')+' FOR SHARE',keys.map(k=>row[k]));return found[0];}
export async function insertExact(c,t,row){
 for(const col of t.columns)if(row[col.name]===undefined)fail('MISSING_COLUMN_'+t.name+'_'+col.name);
 const old=await read(c,t,row);
 if(old){if(rowHash(t,old)!==rowHash(t,row))fail('RETAINED_ROW_CONFLICT_'+t.name);return false;}
 const columns=t.columns.filter(c=>!c.generated);
 await c.execute('INSERT INTO '+q(t.name)+' ('+columns.map(c=>q(c.name)).join(',')+') VALUES ('+columns.map(c=>/^(?:varbinary|binary|blob)/i.test(c.type)?'UNHEX(?)':'?').join(',')+')',columns.map(c=>row[c.name]));
 const saved=await read(c,t,row);if(!saved||rowHash(t,saved)!==rowHash(t,row))fail('READBACK_MISMATCH_'+t.name);return true;
}
async function target(cfg,snapshot,plan,destination,work){
 if(![cfg.destination,cfg.restore].includes(destination))fail('DESTINATION_ALLOWLIST');
 const p=pool(cfg,'migrator',destination);let c,lock=false;
 try{
  c=await p.getConnection();const [[identity]]=await c.query('SELECT @@server_uuid AS instance,DATABASE() AS db');
  const binding=await describePlan(cfg,snapshot,plan,identity);
  const [[l]]=await c.query('SELECT GET_LOCK(?,0) AS ok',['chat:import:'+destination]);if(Number(l.ok)!==1)fail('IMPORT_BUSY');lock=true;
  const [[foreign]]=await c.query('SELECT @@foreign_key_checks AS enabled');if(Number(foreign.enabled)!==1)fail('FOREIGN_KEYS_DISABLED');
  await c.query("SET time_zone='+00:00'");
  const {steps}=await artifacts(),[journal]=await c.query('SELECT version,name,checksum,state FROM schema_migration ORDER BY version');
  if(journal.length<1||journal.length>steps.length||journal.some((r,i)=>Number(r.version)!==steps[i].version||r.name!==steps[i].name||r.checksum!==steps[i].checksum||r.state!=='applied'))fail('IMPORT_JOURNAL');
  for(const t of plan.dictionary.tables)await verifyTable(c,t);
  return await work(c,p,binding);
 }finally{if(c){try{await c.rollback();if(lock)await c.query('SELECT RELEASE_LOCK(?)',['chat:import:'+destination]);}finally{c.release();}}await p.end();}
}
async function runState(c,m,binding,{empty=false,digest=binding.digest}={}){
 const [runs]=await c.query('SELECT * FROM chat_migration_run ORDER BY tenant_id FOR UPDATE');
 if(empty&&!runs.length)return runs;
 if(runs.length!==m.tenants.length)fail('RUN_TENANT_SET');
 for(const r of runs){
  if(!m.tenants.includes(r.tenant_id)||r.run_id!==m.run||r.snapshot_digest!==binding.snapshotDigest||r.source_identity!==binding.sourceIdentity||r.destination_identity!==binding.destinationIdentity||r.source_watermark!==m.watermark||String(r.writer_epoch)!=='1'||!['copying','validated'].includes(r.state))fail('RUN_IDENTITY_OR_STATE');
  if(r.manifest_digest!==digest)fail('PLAN_BINDING_CHANGED_EXPLICIT_ADOPTION_REQUIRED');
 }
 const [gates]=await c.query('SELECT * FROM chat_writer_gate ORDER BY tenant_id FOR UPDATE');
 if(gates.length!==m.tenants.length||gates.some(g=>!m.tenants.includes(g.tenant_id)||g.mode!=='shadow'||String(g.epoch)!=='1'||g.manifest_digest!==binding.snapshotDigest))fail('WRITER_GATE_CHANGED');
 return runs;
}
async function assertBinding(c,m,binding){await runState(c,m,binding);await loadPlan(binding);}
async function checkpoint(c,t,tenant,run,number,chunk){
 const hash=chunkHash(t,chunk),last=canonical(primary(t).map(k=>chunk.at(-1)[k]));
 const [rows]=await c.query('SELECT * FROM chat_migration_chunk WHERE tenant_id=? AND run_id=? AND table_name=? AND chunk_number=? FOR UPDATE',[tenant,run,t.name,number]);
 const old=rows[0];
 if(old&&(old.source_hash!==hash||old.target_hash!==hash||String(old.row_count)!==String(chunk.length)||canonical(JSON.parse(old.last_key))!==last||!['copied','validated'].includes(old.state)))fail('CHECKPOINT_CONFLICT');
 return {old,hash,last};
}
// Requires a transaction and locked shadow gates. Includes rows outside expected
// tenants, empty tables and surplus checkpoints, never just matched primary keys.
export async function validateCandidate(c,snapshot,plan){
 const m=snapshot.manifest,reports=[],wanted=[];
 for(const tenant of [...m.tenants].sort()){
  const tables=[];
  for(const t of plan.dictionary.tables.filter(t=>!migrationTables.has(t.name))){
   const expected=typedSort(t,plan.selected[t.name].filter(r=>r.tenant_id===tenant)),[actual]=await c.query('SELECT '+projection(t)+' FROM '+q(t.name)+' WHERE tenant_id=? ORDER BY '+primary(t).map(k=>q(t.name)+'.'+q(k)).join(',')+' FOR SHARE',[tenant]);
   if(actual.length!==expected.length)fail('RECONCILE_COUNT_'+t.name);
   const chunks=[];
   for(let n=0;n<expected.length;n+=1000){
    const chunk=expected.slice(n,n+1000),{old,hash}=await checkpoint(c,t,tenant,m.run,n/1000,chunk);
    if(!old)fail('RECONCILE_CHECKPOINT');
    if(chunkHash(t,actual.slice(n,n+1000))!==hash)fail('RECONCILE_HASH_'+t.name);
    chunks.push({number:n/1000,count:chunk.length,hash});wanted.push(canonical([tenant,m.run,t.name,String(n/1000)]));
   }
   tables.push({table:t.name,row_count:String(actual.length),table_hash:tableHash(chunks)});
  }
  tables.sort((a,b)=>a.table<b.table?-1:1);reports.push({tenant,tables,tenantHash:sha(canonical(tables))});
 }
 for(const t of plan.dictionary.tables.filter(t=>!migrationTables.has(t.name))){
  const [unexpected]=await c.query('SELECT tenant_id FROM '+q(t.name)+' WHERE tenant_id NOT IN ('+m.tenants.map(()=>'?').join(',')+') LIMIT 1 FOR SHARE',m.tenants);if(unexpected.length)fail('EXTRA_TENANT_'+t.name);
 }
 const [all]=await c.query('SELECT tenant_id,run_id,table_name,CAST(chunk_number AS CHAR) AS n FROM chat_migration_chunk FOR UPDATE');
 if(canonical(all.map(r=>canonical([r.tenant_id,r.run_id,r.table_name,r.n])).sort())!==canonical(wanted.sort()))fail('EXTRA_CHECKPOINT');
 return reports;
}
export async function adoptPlan(cfg,snapshot,plan,{destination=cfg.destination,beforeCommit=async()=>{},afterCommit=async()=>{}}={}){
 snapshot=structuredClone(snapshot);plan=structuredClone(plan);
 return target(cfg,snapshot,plan,destination,async(c,_p,binding)=>{
  const m=snapshot.manifest;await c.beginTransaction();
  const [current]=await c.query('SELECT * FROM chat_migration_run ORDER BY tenant_id FOR UPDATE');
  const previous=current[0]?.manifest_digest;if(!previous||current.some(r=>r.manifest_digest!==previous))fail('ADOPTION_RUN_SET');
  await runState(c,m,binding,{digest:previous});
  const {steps}=await artifacts(),[journal]=await c.query('SELECT version,name,checksum,state FROM schema_migration ORDER BY version FOR SHARE');
  if(journal.length!==steps.length||journal.some((r,i)=>Number(r.version)!==steps[i].version||r.name!==steps[i].name||r.checksum!==steps[i].checksum||r.state!=='applied'))fail('ADOPTION_JOURNAL');
  const reports=await validateCandidate(c,snapshot,plan);
  if(previous===binding.digest){await loadPlan(binding);await c.commit();return {adopted:false,planDigest:binding.digest};}
  let prior;
  if(previous===plan.classificationHash){
   const report=await verified(JSON.parse(await readFile(join(privateRoot,'validations',m.run+'-'+destination+'.json'),'utf8')));
   if(report.run!==m.run||report.destination!==destination||report.snapshotDigest!==binding.snapshotDigest||report.classificationHash!==plan.classificationHash||report.mappingHash!==plan.mappingHash||report.domainWriters!=='shadow'||canonical([...report.reports].sort((a,b)=>a.tenant<b.tenant?-1:1))!==canonical(reports))fail('ADOPTION_PRIOR_REPORT');
   prior={kind:'legacy-classification-only',reportDigest:sha(canonical(report))};
  }else{
   const old=await readBinding(m.run,destination,previous);
   if(old.snapshotDigest!==binding.snapshotDigest||old.sourceIdentity!==binding.sourceIdentity||old.destinationIdentity!==binding.destinationIdentity||canonical(old.contents)!==canonical(binding.contents))fail('ADOPTION_DERIVED_PLAN_CHANGED');
   prior={kind:'bound-plan',digest:old.digest};
  }
  await savePlan(binding,plan);
  const [chunks]=await c.query('SELECT * FROM chat_migration_chunk ORDER BY tenant_id,table_name,chunk_number FOR UPDATE');
  const dir=join(privateRoot,'plans',m.run,destination);await mkdir(dir,{recursive:true});
  const intent={format:1,kind:'shadow-plan-adoption',run:m.run,destination,from:previous,to:binding.digest,prior,oldRuns:current,checkpointsDigest:sha(canonical(chunks)),journalDigest:sha(canonical(journal)),reports};
  await immutableSigned(join(dir,previous+'-to-'+binding.digest+'.json'),intent);
  const [updated]=await c.execute("UPDATE chat_migration_run SET manifest_digest=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE run_id=? AND manifest_digest=? AND state IN ('copying','validated') AND writer_epoch=1",[binding.digest,m.run,previous]);
  if(updated.affectedRows!==m.tenants.length)fail('ADOPTION_UPDATE_COUNT');
  await beforeCommit();await c.commit();await afterCommit();return {adopted:true,planDigest:binding.digest,rows:reports.reduce((n,r)=>n+r.tables.reduce((s,t)=>s+Number(t.row_count),0),0)};
 });
}
export async function importSnapshot(cfg,snapshot,plan,{destination=cfg.destination,beforeChunk=async()=>{},beforeCommit=async()=>{},afterCommit=async()=>{}}={}){
 snapshot=structuredClone(snapshot);plan=structuredClone(plan);
 return target(cfg,snapshot,plan,destination,async(c,_p,binding)=>{
  const m=snapshot.manifest,at=m.source.at,tables=order(plan.dictionary.tables).filter(t=>!migrationTables.has(t.name));
  await c.beginTransaction();const runs=await runState(c,m,binding,{empty:true});
  if(!runs.length){
   const [[count]]=await c.query('SELECT COUNT(*) AS n FROM chat_migration_chunk');if(Number(count.n))fail('UNBOUND_CHECKPOINTS');
   await savePlan(binding,plan);
   for(const tenant of m.tenants){
    await c.execute("INSERT INTO chat_migration_run(tenant_id,run_id,manifest_digest,snapshot_digest,source_identity,destination_identity,source_watermark,state,writer_epoch,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'copying',1,1,?,?)",[tenant,m.run,binding.digest,binding.snapshotDigest,binding.sourceIdentity,binding.destinationIdentity,m.watermark,at,at]);
    await insertExact(c,plan.dictionary.tables.find(t=>t.name==='chat_writer_gate'),plan.selected.chat_writer_gate.find(g=>g.tenant_id===tenant));
   }
  }else await loadPlan(binding);
  await c.commit();let copied=0,replayed=0;
  for(const t of tables)for(const tenant of m.tenants){
   const rows=typedSort(t,plan.selected[t.name].filter(r=>r.tenant_id===tenant));
   for(let start=0;start<rows.length;start+=1000){
    const chunk=rows.slice(start,start+1000),number=start/1000;await c.beginTransaction();
    try{
     await runState(c,m,binding);await beforeChunk({connection:c,table:t.name,tenant,number});
     const {old,hash,last}=await checkpoint(c,t,tenant,m.run,number,chunk),readback=[];
     for(const row of chunk){if(await insertExact(c,t,row))copied++;else replayed++;readback.push(await read(c,t,row));}
     if(chunkHash(t,readback)!==hash)fail('CHUNK_READBACK');
     if(!old)await c.execute("INSERT INTO chat_migration_chunk(tenant_id,run_id,table_name,chunk_number,last_key,row_count,source_hash,target_hash,state,updated_at) VALUES (?,?,?,?,?,?,?,?,'copied',?)",[tenant,m.run,t.name,number,last,chunk.length,hash,hash,at]);
     await beforeCommit({table:t.name,tenant,number});await c.commit();await afterCommit({table:t.name,tenant,number});
    }catch(e){await c.rollback();throw e;}
   }
  }
  return {copied,replayed,planDigest:binding.digest};
 });
}
export async function reconcile(cfg,snapshot,plan,{destination=cfg.destination,installConstraints=true}={}){
 snapshot=structuredClone(snapshot);plan=structuredClone(plan);
 return target(cfg,snapshot,plan,destination,async(c,p,binding)=>{
  const m=snapshot.manifest;await c.beginTransaction();await assertBinding(c,m,binding);const reports=await validateCandidate(c,snapshot,plan);
  await c.execute("UPDATE chat_migration_chunk SET state='validated' WHERE run_id=? AND state='copied'",[m.run]);await c.commit();
  if(installConstraints)await migrate(p,2,{validated:async()=>{if(canonical(reports)!==canonical(binding.contents.reports))fail('RECONCILIATION_REQUIRED');}});
  await c.beginTransaction();await assertBinding(c,m,binding);
  await c.execute("UPDATE chat_migration_run SET state='validated',version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE run_id=? AND state='copying'",[m.run]);await c.commit();
  const body={format:1,scope:'T03-storage-migration',acceptance:'DATA_VALIDATED_NATIVE_ACCEPTANCE_SEPARATE',run:m.run,snapshotDigest:binding.snapshotDigest,classificationHash:plan.classificationHash,mappingHash:plan.mappingHash,planDigest:binding.digest,destination,reports,validatedAt:new Date().toISOString(),domainWriters:'shadow',remoteAPIProofs:'NOT_RUN_T06',remaining:['T04 owner APIs and current authorization','T06 active-work pin/import and remote adapters','T09 composed downstream recovery and main cutover']};
  const dir=join(privateRoot,'validations');await mkdir(dir,{recursive:true});const file=join(dir,m.run+'-'+destination+'.json');
  await immutableSigned(join(dir,m.run+'-'+destination+'-'+Date.now()+'.json'),body);
  await writeFile(file,JSON.stringify({...body,signature:await sign(body)}),{mode:0o600});
  return {file,planDigest:binding.digest,tenants:reports.length,tables:plan.dictionary.tables.length,rows:reports.reduce((n,r)=>n+r.tables.reduce((s,t)=>s+Number(t.row_count),0),0)};
 });
}
