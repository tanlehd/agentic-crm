import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {randomBytes, randomUUID, createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {rootSQL} from './lib/chat-native.mjs';
import {migrate} from '../services/core-baseline/dist/kernel/database/migration-runner.js';
import {migrations} from '../services/core-baseline/dist/kernel/database/migrations.js';
import {ownerWorkloadServices} from '../services/core-baseline/dist/kernel/database/owner-workload-expansion.js';
import {validateClause} from './lib/owner-workload-fixture.mjs';
const require=createRequire(new URL('../services/core-baseline/package.json',import.meta.url));
const {DataSource}=require('typeorm');
const database='test_t09_baseline',user='t09_migration_test',dir='.local/chat-cutover';
await mkdir(dir,{recursive:true});
let secret;
try{secret=JSON.parse(await readFile(dir+'/migration-test.json','utf8'));}
catch(e){if(e.code!=='ENOENT')throw e;secret={database,user,password:randomBytes(32).toString('hex')};await writeFile(dir+'/migration-test.json',JSON.stringify(secret),{flag:'wx',mode:0o600});}
assert.equal(secret.database,database);assert.equal(secret.user,user);assert.match(secret.password,/^[a-f0-9]{64}$/);
rootSQL(`CREATE DATABASE IF NOT EXISTS ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs; CREATE USER IF NOT EXISTS '${user}'@'%' IDENTIFIED BY '${secret.password}'; GRANT ALL ON ${database}.* TO '${user}'@'%';`);
const source=new DataSource({type:'mysql',host:'127.0.0.1',port:13306,database,username:user,password:secret.password,synchronize:false,migrationsRun:false,timezone:'Z',supportBigNumbers:true,bigNumberStrings:true});
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const snapshot=async()=>{
 const tables=await source.query('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME');
 const hashes={};for(const {name}of tables){assert.match(name,/^[a-z_]+$/);if(name==='schema_migration')continue;const rows=await source.query('SELECT * FROM `'+name+'`');hashes[name]=digest(rows.map(row=>JSON.stringify(row)).sort());}
 return hashes;
};
try{
 await source.initialize();
 const [existing]=await source.query("SELECT COUNT(*) n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='schema_migration'");
 const version=Number(existing.n)?Number((await source.query('SELECT MAX(version) v FROM schema_migration'))[0].v):0;
 if(version<43)await migrate(source,migrations.filter(m=>m.version<=43));
 const tenants=['01900000-0000-7000-8000-000000009401','01900000-0000-7000-8000-000000009402'];
 for(const tenant of tenants)await source.query("INSERT INTO tenant(id,tenant_id,name,status,kind,created_at,updated_at) VALUES (?,?,'Synthetic T09 retained migration','active','business',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[tenant,tenant]);
 const before=await snapshot(),journal=await source.query('SELECT * FROM schema_migration ORDER BY version');
 const applied=await migrate(source);
 const after=await snapshot();for(const [table,hash]of Object.entries(before))assert.equal(after[table],hash,'preserve '+table);
 assert.deepEqual(await source.query('SELECT * FROM schema_migration WHERE version<=? ORDER BY version',[journal.at(-1).version]),journal);
 assert.equal(await migrate(source),0);
 const [foreign]=await source.query("SELECT COUNT(*) n FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='activity' AND CONSTRAINT_NAME='activity_ibfk_1'");assert.equal(Number(foreign.n),0);
 for(const tenant of tenants){
  await source.query("INSERT INTO identity_owner_gate(tenant_id,barrier_id,state,request_digest,version,created_at,updated_at) VALUES (?,?,'open',?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE tenant_id=tenant_id",[tenant,randomUUID(),digest({seed:'T09',tenant})]);
 }
 await assert.rejects(source.query("INSERT INTO identity_owner_gate(tenant_id,barrier_id,state,request_digest,version,created_at,updated_at) VALUES (NULL,?,'open',?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),'0'.repeat(64)]));
 await assert.rejects(source.query("INSERT INTO identity_owner_gate(tenant_id,barrier_id,state,request_digest,version,created_at,updated_at) VALUES ('01900000-0000-7000-8000-000000000001',?,'open',?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),'0'.repeat(64)]));
 const detached={activity:['activity_ibfk_1'],inbound_delivery:['inbound_delivery_ibfk_2','inbound_delivery_ibfk_3'],touchpoint:['touchpoint_ibfk_4'],lead:['lead_ibfk_3'],agent_execution:['agent_execution_ibfk_1'],association:['association_ibfk_2','association_ibfk_3'],routing_attention:['routing_attention_ibfk_1']};
 for(const [table,names] of Object.entries(detached))for(const name of names){
  const [row]=await source.query('SELECT COUNT(*) n FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=?',[table,name]);
  assert.equal(Number(row.n),0,'remote reference detached: '+table+'.'+name);
 }
 const expected=migrations.filter(m=>m.version>43).flatMap(m=>m.statements).filter(s=>s.startsWith('CREATE TABLE')).length;
 for(const part of ['service','certificate','admission','event']){
  const rows=await source.query('SELECT CHECK_CLAUSE FROM information_schema.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME=?',['ck_identity_workload_'+part+'_owner_v1_services']);
  assert.equal(rows.length,1);validateClause(rows[0].CHECK_CLAUSE,ownerWorkloadServices);
 }
 const runner=source.createQueryRunner();await runner.connect();await runner.startTransaction();
 try{
  await runner.query("INSERT INTO identity_workload_service(tenant_id,service,enabled,version,created_at,updated_at) VALUES ('01900000-0000-7000-8000-000000000001','crm',0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE service=service");
  await assert.rejects(runner.query("INSERT INTO identity_workload_service(tenant_id,service,enabled,version,created_at,updated_at) VALUES ('01900000-0000-7000-8000-000000000001','unreviewed',0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))"),error=>error.driverError?.code==='ER_CHECK_CONSTRAINT_VIOLATED');
 }finally{await runner.rollbackTransaction();await runner.release();}
 const result={status:'PASS',database,from:version||43,to:migrations.at(-1).version,applied,oldTablesPreserved:Object.keys(before).length,reviewedTables:expected,remoteReferencesDetached:9,journalPreserved:true,noOp:true,ownerVocabularyChecks:4,unknownServiceDenied:true};
 await mkdir('artifacts/chat-extraction/t09-20261026',{recursive:true});await writeFile('artifacts/chat-extraction/t09-20261026/migration-46.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{if(source.isInitialized)await source.destroy();}
