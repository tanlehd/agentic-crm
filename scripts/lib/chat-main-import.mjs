// Explicit T09 operator path. T03 retained-test allowlists are not widened.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes,createCipheriv,createDecipheriv,createHmac} from 'node:crypto';
import {canonical,sha,primary,q,chunkHash} from './chat-exact.mjs';
import {planContents,typedSort,migrationTables} from './chat-plan.mjs';
import {insertExact,validateCandidate} from './chat-import.mjs';
import {migrate,verifyTable,artifacts} from '../../services/chat/dist/schema.js';

const root='.local/chat-cutover';
const fail=code=>{throw Error('NO_GO_'+code);};
export function mainImportScope(snapshot,destination){
 const m=snapshot.manifest;
 if(m.source.db!=='agentic_crm'||m.sourceJournal?.length!==43||!Array.isArray(m.tenants)||!m.tenants.length||new Set(m.tenants).size!==m.tenants.length)fail('MAIN_SOURCE43_REQUIRED');
 if(destination==='crm_chat'){
  if(m.purpose!=='fenced-main-cutover'||m.writersFenced!==true||!m.fenceDigest||!m.fence?.accounts?.length||m.fence.accounts.some(a=>!a.locked)||m.fence.activeSourceWriters!==0)fail('FINAL_FENCED_SNAPSHOT_REQUIRED');
  if(sha(canonical(m.fence))!==m.fenceDigest)fail('FENCE_DIGEST');
 }else if(destination!=='test_t09_chat_import'||m.purpose!=='diagnostic-only-not-importable'||m.writersFenced!==false)fail('MAIN_DESTINATION_DENIED');
 return destination==='crm_chat'?'main-local':'isolated-rehearsal';
}
function order(tables){
 const done=new Set(),result=[];
 while(result.length<tables.length){const ready=tables.filter(t=>!done.has(t.name)&&t.foreignKeys.every(f=>f.target_table===t.name||done.has(f.target_table)));if(!ready.length)fail('CYCLIC_IMPORT');for(const t of ready){done.add(t.name);result.push(t);}}
 return result.filter(t=>!migrationTables.has(t.name));
}
async function key(){
 await mkdir(root,{recursive:true});
 try{await writeFile(root+'/main-import.key',randomBytes(32),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
 const key=await readFile(root+'/main-import.key');if(key.length!==32)fail('IMPORT_KEY');return key;
}
export async function bindMainPlan(snapshot,plan,destination,instance){
 const scope=mainImportScope(snapshot,destination),m=snapshot.manifest;
 const sourceFiles=['scripts/lib/chat-main-selection.mjs','scripts/lib/chat-main-import.mjs','scripts/lib/chat-main-audits.mjs','scripts/lib/chat-references.mjs','scripts/lib/chat-events.mjs','scripts/lib/chat-data-partition.mjs','scripts/lib/chat-exact.mjs','scripts/lib/chat-import.mjs','scripts/lib/chat-plan.mjs'];
 const sourceHashes=await Promise.all(sourceFiles.map(async file=>({file,hash:sha((await readFile(file,'utf8')).replaceAll('\r\n','\n'))})));
 const body={format:1,scope,run:m.run,destination,instance,sourceIdentity:`${m.source.instance}/agentic_crm/43`,snapshotDigest:sha(canonical(m)),contents:planContents(plan,m.tenants),sourceHashes};
 return {...body,digest:sha(canonical(body))};
}
// Durable immutable plan survives interrupted copy; only ciphertext is stored.
async function sealedPlan(binding,plan){
 const folder=`${root}/main-plans/${binding.destination}/${binding.digest}`;
 await mkdir(folder,{recursive:true});const secret=await key(),payload={binding,plan},aad=Buffer.from(binding.digest);
 let bytes;
 try{bytes=await readFile(folder+'/plan.enc');}catch(e){
  if(e.code!=='ENOENT')throw e;
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',secret,iv);cipher.setAAD(aad);
  bytes=Buffer.concat([iv,cipher.update(Buffer.from(JSON.stringify(payload))),cipher.final(),cipher.getAuthTag()]);
  await writeFile(folder+'/plan.enc',bytes,{flag:'wx',mode:0o600});
 }
 const decipher=createDecipheriv('aes-256-gcm',secret,bytes.subarray(0,12));decipher.setAAD(aad);decipher.setAuthTag(bytes.subarray(-16));
 const saved=JSON.parse(Buffer.concat([decipher.update(bytes.subarray(12,-16)),decipher.final()]).toString());
 if(canonical(saved.binding)!==canonical(binding)||canonical(planContents(saved.plan,binding.contents.reports.map(r=>r.tenant)))!==canonical(binding.contents))fail('BOUND_PLAN_CHANGED');
 return folder;
}
async function runState(c,snapshot,binding,allowEmpty=false){
 const m=snapshot.manifest,[runs]=await c.query('SELECT * FROM chat_migration_run ORDER BY tenant_id FOR UPDATE');
 if(allowEmpty&&!runs.length)return [];
 if(runs.length!==m.tenants.length)fail('MAIN_RUN_TENANTS');
 for(const r of runs)if(!m.tenants.includes(r.tenant_id)||r.run_id!==m.run||r.manifest_digest!==binding.digest||r.snapshot_digest!==binding.snapshotDigest||r.source_identity!==binding.sourceIdentity||r.destination_identity!==`${binding.instance}/${binding.destination}/chat-owner-v1`||String(r.writer_epoch)!=='1'||!['copying','validated'].includes(r.state))fail('MAIN_RUN_BINDING');
 const [gates]=await c.query('SELECT * FROM chat_writer_gate ORDER BY tenant_id FOR UPDATE');
 if(gates.length!==m.tenants.length||gates.some(g=>!m.tenants.includes(g.tenant_id)||g.mode!=='shadow'||String(g.epoch)!=='1'||g.manifest_digest!==binding.snapshotDigest))fail('MAIN_WRITER_NOT_SHADOW');
 return runs;
}
export async function importMainSelection(pool,snapshot,plan,{destination,beforeChunk=async()=>{},afterChunk=async()=>{}}){
 snapshot=structuredClone(snapshot);plan=structuredClone(plan);mainImportScope(snapshot,destination);
 const c=await pool.getConnection();let locked=false;
 try{
  const [[identity]]=await c.query('SELECT DATABASE() db,@@server_uuid instance,@@foreign_key_checks enabled');
  if(identity.db!==destination||Number(identity.enabled)!==1)fail('DESTINATION_IDENTITY');
  const [[lock]]=await c.query('SELECT GET_LOCK(?,0) ok',['chat:main-import:'+destination]);if(Number(lock.ok)!==1)fail('MAIN_IMPORT_BUSY');locked=true;
  const binding=await bindMainPlan(snapshot,plan,destination,identity.instance),folder=await sealedPlan(binding,plan);
  await migrate(pool,1);
  const {steps}=await artifacts(),[journal]=await c.query('SELECT version,name,checksum,state FROM schema_migration ORDER BY version');
  if(journal.length<1||journal.length>2||journal.some((r,i)=>Number(r.version)!==i+1||r.name!==steps[i].name||r.checksum!==steps[i].checksum||r.state!=='applied'))fail('MAIN_IMPORT_JOURNAL');
  for(const table of plan.dictionary.tables)await verifyTable(c,table);
  await c.query("SET time_zone='+00:00'");await c.beginTransaction();
  const m=snapshot.manifest,at=m.source.at,runs=await runState(c,snapshot,binding,true);
  if(!runs.length){
   // New run cannot adopt preexisting business rows or an unrelated checkpoint.
   for(const table of plan.dictionary.tables.filter(t=>t.name!=='schema_migration')){const [[count]]=await c.query('SELECT COUNT(*) n FROM '+q(table.name));if(Number(count.n))fail('UNBOUND_DESTINATION_ROWS_'+table.name);}
   for(const tenant of m.tenants){
    await c.execute("INSERT INTO chat_migration_run(tenant_id,run_id,manifest_digest,snapshot_digest,source_identity,destination_identity,source_watermark,state,writer_epoch,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'copying',1,1,?,?)",[tenant,m.run,binding.digest,binding.snapshotDigest,binding.sourceIdentity,`${identity.instance}/${destination}/chat-owner-v1`,sha(canonical(m.tables)),at,at]);
    await insertExact(c,plan.dictionary.tables.find(t=>t.name==='chat_writer_gate'),plan.selected.chat_writer_gate.find(r=>r.tenant_id===tenant));
   }
  }
  await c.commit();let copied=0,replayed=0;
  for(const table of order(plan.dictionary.tables))for(const tenant of m.tenants){
   const rows=typedSort(table,plan.selected[table.name].filter(r=>r.tenant_id===tenant));
   for(let offset=0;offset<rows.length;offset+=1000){
    const chunk=rows.slice(offset,offset+1000),number=offset/1000,hash=chunkHash(table,chunk),last=canonical(primary(table).map(k=>chunk.at(-1)[k]));
    await c.beginTransaction();
    try{
     await runState(c,snapshot,binding);await beforeChunk({connection:c,table:table.name,number,tenant});
     const [prior]=await c.query('SELECT * FROM chat_migration_chunk WHERE tenant_id=? AND run_id=? AND table_name=? AND chunk_number=? FOR UPDATE',[tenant,m.run,table.name,number]);
     if(prior.length&&(prior[0].source_hash!==hash||prior[0].target_hash!==hash||String(prior[0].row_count)!==String(chunk.length)||canonical(JSON.parse(prior[0].last_key))!==last))fail('MAIN_CHUNK_CONFLICT');
     for(const row of chunk)if(await insertExact(c,table,row))copied++;else replayed++;
     if(!prior.length)await c.execute("INSERT INTO chat_migration_chunk(tenant_id,run_id,table_name,chunk_number,last_key,row_count,source_hash,target_hash,state,updated_at) VALUES (?,?,?,?,?,?,?,?,'copied',?)",[tenant,m.run,table.name,number,last,chunk.length,hash,hash,at]);
     await c.commit();await afterChunk({table:table.name,number,tenant});
    }catch(e){await c.rollback();throw e;}
   }
  }
  await c.beginTransaction();await runState(c,snapshot,binding);
  const reports=await validateCandidate(c,snapshot,plan);
  if(canonical(reports)!==canonical(binding.contents.reports))fail('MAIN_RECONCILIATION');
  await c.execute("UPDATE chat_migration_chunk SET state='validated' WHERE run_id=?",[m.run]);await c.commit();
  await migrate(pool,2,{validated:async()=>{}});
  await c.beginTransaction();await runState(c,snapshot,binding);
  // A second complete read after constraint installation closes the final gate.
  if(canonical(await validateCandidate(c,snapshot,plan))!==canonical(reports))fail('MAIN_POST_CONSTRAINT_DRIFT');
  await c.execute("UPDATE chat_migration_run SET state='validated',version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE run_id=? AND state='copying'",[m.run]);await c.commit();
  const result={scope:binding.scope,status:'VALIDATED_SHADOW',destination,planDigest:binding.digest,snapshotDigest:binding.snapshotDigest,copied,replayed,rows:reports.reduce((n,r)=>n+r.tables.reduce((s,t)=>s+Number(t.row_count),0),0),tables:plan.dictionary.tables.length,tenants:reports.length};
  const body={binding,reports,result},signature=createHmac('sha256',await key()).update(canonical(body)).digest('hex');
  await writeFile(folder+'/reconciliation.json',JSON.stringify({...body,signature}),{mode:0o600});
  return result;
 }finally{try{await c.rollback();if(locked)await c.query('SELECT RELEASE_LOCK(?)',['chat:main-import:'+destination]);}finally{c.release();}}
}
