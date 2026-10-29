// One-time recovery of the failed, unreleased T09 draft in its retained test DB.
// Never accepts a main database, never changes any applied migration entry.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createPool } from './lib/chat-native.mjs';
import { migrations, checksum } from '../services/core-baseline/dist/kernel/database/migrations.js';
const credentials=JSON.parse(await readFile('.local/chat-cutover/migration-test.json','utf8'));
assert.equal(credentials.database,'test_t09_baseline');assert.equal(credentials.user,'t09_migration_test');
const pool=createPool({host:'127.0.0.1',port:13306,...credentials,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,jsonStrings:true});
const manifest=migrations.find(m=>m.version===45),failed={...manifest,statements:manifest.statements.map(s=>s.replace('`lead`','lead'))};
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const snapshot=async()=>{
 const [tables]=await pool.query('SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
 const result={};for(const {name} of tables){assert.match(name,/^[a-z_]+$/);if(name==='schema_migration')continue;const [rows]=await pool.query('SELECT * FROM `'+name+'`');result[name]=digest(rows.map(r=>JSON.stringify(r)).sort());}return result;
};
try{
 const [[journal]]=await pool.query('SELECT * FROM schema_migration WHERE version=45');
 if(journal.state==='applied'){assert.equal(journal.checksum,checksum(manifest));console.log('Already repaired');}
 else{
  assert.equal(journal.state,'failed');assert.equal(journal.checksum,checksum(failed));
  const before=await snapshot(),[oldJournal]=await pool.query('SELECT * FROM schema_migration WHERE version<45 ORDER BY version');
  await mkdir('artifacts/chat-extraction/t09-20261026',{recursive:true});
  const artifact='artifacts/chat-extraction/t09-20261026/migration45-draft-failure.json';
  await writeFile(artifact,JSON.stringify({journal,failed,reason:'Unquoted reserved table name lead; first two statements completed',before},null,2),{flag:'wx'});
  for(const table of ['inbound_delivery','touchpoint']){
   const [[row]]=await pool.query("SELECT COUNT(*) n FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND REFERENCED_TABLE_NAME IN ('conversation','message')",[table]);assert.equal(Number(row.n),0);
  }
  for(const sql of manifest.statements.slice(2))await pool.query(sql);
  assert.deepEqual(await snapshot(),before);assert.deepEqual((await pool.query('SELECT * FROM schema_migration WHERE version<45 ORDER BY version'))[0],oldJournal);
  const [result]=await pool.query("UPDATE schema_migration SET checksum=?,state='applied',applied_at=UTC_TIMESTAMP(6),error_code=NULL WHERE version=45 AND state='failed' AND checksum=?",[checksum(manifest),checksum(failed)]);assert.equal(result.affectedRows,1);
  console.log(JSON.stringify({database:credentials.database,status:'PASS',rowsPreserved:true,appliedHistoryUnchanged:true,failureArtifact:artifact}));
 }
}finally{await pool.end();}
