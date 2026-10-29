// Recovery decisions are operator evidence, never a traffic switch or unlock.
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {pool,privateRoot} from './chat-native.mjs';
import {assertFence} from './chat-export.mjs';
import {canonical,sha,projection,q,primary,keyset,chunkHash,tableHash} from './chat-exact.mjs';
import {describePlan,loadPlan,immutableSigned} from './chat-plan.mjs';
import {validateCandidate} from './chat-import.mjs';
import {artifacts} from '../../services/chat/dist/schema.js';
const fail=code=>{throw new Error('NO_GO_'+code);};
export async function verifyFrozenSource(cfg,snapshot){
 await assertFence(cfg);const p=pool(cfg,'export',cfg.source),c=await p.getConnection();
 try{
  await c.query('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');await c.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
  const [[identity]]=await c.query('SELECT @@server_uuid AS instance,DATABASE() AS db');
  if(identity.instance!==snapshot.manifest.source.instance||identity.db!==snapshot.manifest.source.db)fail('RECOVERY_SOURCE_IDENTITY');
  const [journal]=await c.query('SELECT version,name,checksum,state FROM schema_migration ORDER BY version');if(canonical(journal)!==canonical(snapshot.manifest.sourceJournal))fail('RECOVERY_SOURCE_JOURNAL');
  const [names]=await c.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
  if(canonical(names.map(r=>r.TABLE_NAME))!==canonical(snapshot.manifest.tables.map(t=>t.name).sort()))fail('RECOVERY_SOURCE_TABLE_SET');
  for(const t of snapshot.manifest.tables){
   const [columns]=await c.query('SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,GENERATION_EXPRESSION,EXTRA,COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION',[t.name]);
   const meta=columns.map(r=>({name:r.COLUMN_NAME,type:r.COLUMN_TYPE+(r.COLLATION_NAME?` CHARACTER SET ${r.COLLATION_NAME.split('_')[0]} COLLATE ${r.COLLATION_NAME}`:''),nullable:r.IS_NULLABLE==='YES',generated:r.GENERATION_EXPRESSION,extra:r.EXTRA}));
   if(canonical(meta)!==canonical(t.columns))fail('RECOVERY_SOURCE_METADATA');
   const [pk]=await c.query("SELECT COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME='PRIMARY' ORDER BY SEQ_IN_INDEX",[t.name]);
   if(canonical(pk.map(r=>r.COLUMN_NAME))!==canonical(primary(t)))fail('RECOVERY_SOURCE_PRIMARY_KEY');
   const chunks=[],keys=primary(t);let last;
   while(true){const where=keyset(keys,last),[rows]=await c.query(`SELECT ${projection(t)} FROM ${q(t.name)}${where.sql} ORDER BY ${keys.map(k=>q(t.name)+'.'+q(k)).join(',')} LIMIT 1000`,where.args);if(!rows.length)break;chunks.push({number:chunks.length,count:rows.length,hash:chunkHash(t,rows)});last=keys.map(k=>rows.at(-1)[k]);}
   if(tableHash(chunks)!==t.tableHash||chunks.reduce((n,c)=>n+c.count,0)!==t.rowCount)fail('RECOVERY_SOURCE_CHANGED');
  }
  await c.commit();await assertFence(cfg);return {sourceIdentity:identity.instance+'/'+identity.db,snapshotDigest:sha(canonical(snapshot.manifest)),frozen:true};
 }catch(e){await c.rollback();throw e;}finally{c.release();await p.end();}
}
const owners=['chat','crm','sales','routing','identity','workflow','ai-runtime','connector','provider'];
export function recoveryDecision({pristine,sourceVerified,effects,proofs}){
 // Any positive or unknown external effect excludes old-source return. This
 // deliberately cannot be authorized by a timeout or a zero-row local query.
 if(effects!==false||!pristine||!sourceVerified)return {decision:'FREEZE_FORWARD_RECOVERY',sourceReturn:false,requiredOwners:owners};
 if(!Array.isArray(proofs)||proofs.length!==owners.length||owners.some(owner=>proofs.filter(p=>p.owner===owner&&p.effects==='none'&&p.fenced===true&&p.complete===true).length!==1))return {decision:'NO_GO_INCOMPLETE_EFFECT_PROOFS',sourceReturn:false,requiredOwners:owners};
 return {decision:'PRE_EFFECT_SOURCE_RETURN_ELIGIBLE',sourceReturn:true,requires:'operator revalidation under fence; fresh snapshot for any later cutover'};
}
export async function recoveryEvidence(cfg,snapshot,plan,{destination=cfg.destination}={}){
 const source=await verifyFrozenSource(cfg,snapshot),p=pool(cfg,'migrator',destination),c=await p.getConnection();
 try{
  await c.beginTransaction();const [[identity]]=await c.query('SELECT @@server_uuid AS instance,DATABASE() AS db'),binding=await describePlan(cfg,snapshot,plan,identity);await loadPlan(binding);
  const {steps}=await artifacts(),[journal]=await c.query('SELECT version,name,checksum,state FROM schema_migration ORDER BY version');
  if(journal.length!==steps.length||journal.some((r,i)=>Number(r.version)!==steps[i].version||r.name!==steps[i].name||r.checksum!==steps[i].checksum||r.state!=='applied'))fail('RECOVERY_TARGET_JOURNAL');
  const [runs]=await c.query('SELECT * FROM chat_migration_run FOR UPDATE'),[gates]=await c.query('SELECT * FROM chat_writer_gate FOR UPDATE');
  if(runs.length!==snapshot.manifest.tenants.length||runs.some(r=>r.run_id!==snapshot.manifest.run||r.manifest_digest!==binding.digest||String(r.writer_epoch)!=='1'||!['copying','validated'].includes(r.state))||gates.length!==snapshot.manifest.tenants.length||gates.some(g=>g.mode!=='shadow'||String(g.epoch)!=='1'))fail('RECOVERY_ACTIVATION_HISTORY');
  const reports=await validateCandidate(c,snapshot,plan);if(canonical(reports)!==canonical(binding.contents.reports))fail('RECOVERY_CANDIDATE_CHANGED');
  // Local equality cannot prove absence of provider/remote effects. Report the
  // verified storage prerequisite and leave composed return gated by T09 proofs.
  const result={format:1,kind:'chat-recovery-evidence',run:snapshot.manifest.run,destination,planDigest:binding.digest,source,pristineShadow:true,...recoveryDecision({pristine:true,sourceVerified:true,effects:false,proofs:[]}),routingChanged:false,remoteRuntimeProofs:'NOT_RUN_T09'};
  const dir=join(privateRoot,'recovery');await mkdir(dir,{recursive:true});await immutableSigned(join(dir,snapshot.manifest.run+'-'+destination+'-'+binding.digest+'.json'),result);await c.commit();return result;
 }catch(e){await c.rollback();throw e;}finally{c.release();await p.end();}
}
