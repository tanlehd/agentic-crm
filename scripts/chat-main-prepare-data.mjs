// Explicit local operator: fenced source -> reconciled Chat -> owner bootstrap.
// Does not enable a Chat writer or start services.
import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createRequire} from 'node:module';
import {createPool} from './lib/chat-native.mjs';
import {loadMainFinalSnapshot} from './lib/chat-main-preflight.mjs';
import {selectMainSnapshot} from './lib/chat-main-selection.mjs';
import {importMainSelection} from './lib/chat-main-import.mjs';
import {mainOwnerPlan} from './lib/chat-main-owner-plan.mjs';
import {importOwnerPlan} from './lib/chat-main-owner-import.mjs';
import {assertMainFence} from './lib/chat-main-fence.mjs';
import {mainEvidenceDirectory} from './lib/chat-main-evidence.mjs';
import {canonical,sha,projection,primary,chunkHash} from './lib/chat-exact.mjs';
import {migrate} from '../services/core-baseline/dist/kernel/database/migration-runner.js';
import {migrateRetirement} from '../services/chat/dist/retirement-schema.js';
const require=createRequire(new URL('../services/core-baseline/package.json',import.meta.url)),{DataSource}=require('typeorm');
if(process.argv.length!==3||process.argv[2]!=='--fenced-local-main')throw Error('EXPLICIT_FENCED_LOCAL_MAIN_REQUIRED');
const env=parseEnv(await readFile('.env','utf8'));if(env.APP_ENV!=='development'||env.MYSQL_DATABASE!=='agentic_crm'||env.MYSQL_MIGRATION_USER!=='crm_migrate')throw Error('LOCAL_MAIN_REQUIRED');
const snapshot=await loadMainFinalSnapshot(),fence=assertMainFence(env.MYSQL_MIGRATION_USER);
if(canonical(fence.fence)!==canonical(snapshot.manifest.fence))throw Error('FINAL_FENCE_CHANGED');
const credentials=JSON.parse(await readFile('.local/chat-main/credentials.json','utf8')),operator=credentials.chat.import_operator;
if(operator.user!=='chat_main_import_operator'||!/^[a-f0-9]{64}$/.test(operator.password))throw Error('CHAT_OPERATOR');
const common={host:'127.0.0.1',port:13306,timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,jsonStrings:true};
const root=createPool({...common,user:'root',password:env.MYSQL_ROOT_PASSWORD,connectionLimit:1});
const source=new DataSource({type:'mysql',...common,database:'agentic_crm',username:env.MYSQL_MIGRATION_USER,password:env.MYSQL_MIGRATION_PASSWORD,synchronize:false});
const baseline=createPool({...common,database:'agentic_crm',user:env.MYSQL_MIGRATION_USER,password:env.MYSQL_MIGRATION_PASSWORD,connectionLimit:2});let destination;
const out=await mainEvidenceDirectory(),report={status:'IN_PROGRESS',phase:'source-compare',snapshotDigest:sha(canonical(snapshot.manifest))};
async function preserveSource(){
 for(const t of snapshot.manifest.tables.filter(t=>t.name!=='schema_migration')){
  const [rows]=await baseline.query('SELECT '+projection(t)+' FROM `'+t.name+'` ORDER BY '+primary(t).map(k=>'`'+k+'`').join(','));
  if(rows.length!==t.rowCount||t.chunks.some(ch=>chunkHash(t,rows.slice(ch.number*1000,ch.number*1000+ch.count))!==ch.hash))throw Error('SOURCE_ROWS_CHANGED_'+t.name);
 }
}
try{
 await preserveSource();report.sourceRowsVerified=true;report.phase='chat-copy';
 await root.query('CREATE DATABASE IF NOT EXISTS crm_chat CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs');
 await root.query("CREATE USER IF NOT EXISTS ?@'%' IDENTIFIED BY ?",[operator.user,operator.password]);
 await root.query("GRANT ALL ON crm_chat.* TO ?@'%'",[operator.user]);
 await writeFile('.local/chat-cutover/main-import-operator.json',JSON.stringify({...common,host:'127.0.0.1',port:13306,database:'crm_chat',user:operator.user,password:operator.password}),{mode:0o600});
 destination=createPool({...common,database:'crm_chat',user:operator.user,password:operator.password,connectionLimit:3});
 const plan=await selectMainSnapshot(snapshot);
 const [[exists]]=await destination.query("SELECT COUNT(*) n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='schema_migration'");
 const [journal]=Number(exists.n)?await destination.query('SELECT version,state FROM schema_migration ORDER BY version'):[[]];
 if(journal.length<=2)report.chat=await importMainSelection(destination,snapshot,plan,{destination:'crm_chat'});
 else{
  const [runs]=await destination.query('SELECT tenant_id,snapshot_digest,state FROM chat_migration_run'),[gates]=await destination.query('SELECT mode FROM chat_writer_gate');
  if(runs.length!==snapshot.manifest.tenants.length||runs.some(r=>r.snapshot_digest!==report.snapshotDigest||r.state!=='validated')||gates.some(g=>g.mode!=='shadow'))throw Error('CHAT_RESUME_BINDING');
  report.chat={status:'PRIOR_VALIDATED_SHADOW',snapshotDigest:report.snapshotDigest};
 }
 await writeFile(out+'/main-import.json',JSON.stringify(report.chat,null,2));
 report.phase='chat-forward';await migrateRetirement(destination);report.chatVersion=4;
 report.phase='baseline-forward';await source.initialize();report.baselineMigrationsApplied=await migrate(source);report.baselineVersion=46;
 await preserveSource();report.sourceRowsPreservedAfterMigration=true;
 report.phase='owner-bootstrap';report.owners=await importOwnerPlan(baseline,snapshot,mainOwnerPlan(snapshot,plan),'agentic_crm');
 if(canonical(assertMainFence(env.MYSQL_MIGRATION_USER))!==canonical(fence))throw Error('MAIN_FENCE_CHANGED');
 report.status='READY_FOR_RUNTIME_PROVISIONING';report.phase='complete';
}catch(e){report.status='FAIL';report.error=e.code??e.message;process.exitCode=1;}finally{if(source.isInitialized)await source.destroy();await Promise.all([root.end(),baseline.end(),destination?.end()]);await writeFile(out+'/main-data.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
