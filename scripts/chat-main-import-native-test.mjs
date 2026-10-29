// Retained isolated T09 rehearsal. Never imports into the main Chat schema.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {rootSQL,createPool} from './lib/chat-native.mjs';
import {loadMainPreflight} from './lib/chat-main-preflight.mjs';
import {selectMainSnapshot} from './lib/chat-main-selection.mjs';
import {importMainSelection,mainImportScope} from './lib/chat-main-import.mjs';
import {canonical,sha} from './lib/chat-exact.mjs';

const folder='.local/chat-cutover/main-import-rehearsal',destination='test_t09_chat_import',user='chat_t09_import_operator';
await mkdir(folder,{recursive:true});
try{await writeFile(folder+'/credential.json',JSON.stringify({password:randomBytes(32).toString('hex')}),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
const {password}=JSON.parse(await readFile(folder+'/credential.json','utf8'));if(!/^[a-f0-9]{64}$/.test(password))throw Error('REHEARSAL_CREDENTIAL_INVALID');
rootSQL(`CREATE DATABASE IF NOT EXISTS ${destination} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs; CREATE USER IF NOT EXISTS '${user}'@'%' IDENTIFIED BY '${password}'; GRANT ALL ON ${destination}.* TO '${user}'@'%';`);
const pool=createPool({host:'127.0.0.1',port:13306,database:destination,user,password,timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,jsonStrings:true,connectionLimit:5,multipleStatements:false});
const report={purpose:'isolated-source43-import-rehearsal',checks:[]};
try{
 const snapshot=await loadMainPreflight(),before=sha(canonical(snapshot)),plan=await selectMainSnapshot(snapshot);
 assert.equal(sha(canonical(snapshot)),before);report.checks.push('source-snapshot-immutable');
 assert.throws(()=>mainImportScope(snapshot,'crm_chat'),/FINAL_FENCED_SNAPSHOT_REQUIRED/);report.checks.push('diagnostic-main-import-denied');
 const wrong=structuredClone(snapshot);wrong.rows.conversation[0].contact_id='01900000-0000-7000-8000-000000000001';await assert.rejects(()=>selectMainSnapshot(wrong),/CONTACT_BINDING/);report.checks.push('wrong-contact-binding-denied');
 const unknown=structuredClone(snapshot);unknown.rows.outbox_event[0].event_type='future.unreviewed';await assert.rejects(()=>selectMainSnapshot(unknown),/EVENT_CLASSIFICATION/);report.checks.push('unknown-retained-event-denied');
 let crashed=false;
 await assert.rejects(()=>importMainSelection(pool,snapshot,plan,{destination,afterChunk:async()=>{if(!crashed){crashed=true;throw Error('REHEARSED_AFTER_COMMIT_CRASH');}}}),/REHEARSED_AFTER_COMMIT_CRASH/);report.checks.push('crash-after-durable-chunk');
 report.first=await importMainSelection(pool,snapshot,plan,{destination});report.checks.push('resume-full-count-hash-and-local-fks');
 report.replay=await importMainSelection(pool,snapshot,plan,{destination});assert.equal(report.replay.copied,0);assert.equal(report.replay.rows,report.first.rows);report.checks.push('idempotent-complete-replay');
 await assert.rejects(()=>pool.query('SELECT * FROM agentic_crm.tenant LIMIT 1'),e=>['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(e.code));report.checks.push('operator-cannot-read-source-database');
 report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.message;process.exitCode=1;}finally{await pool.end();await mkdir('artifacts/chat-extraction/t09-20261026',{recursive:true});await writeFile('artifacts/chat-extraction/t09-20261026/main-import-rehearsal.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
