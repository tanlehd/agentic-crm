import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import {createPool,rootSQL} from './lib/chat-native.mjs';
import {applyRuntimeGrants,applyAuthGrants,chatExclusiveTables} from '../services/core-baseline/dist/kernel/database/runtime-grants.js';
const require=createRequire(new URL('../services/core-baseline/package.json',import.meta.url)),{format}=require('mysql2');
const database='test_t09_baseline',file='.local/chat-cutover/grants-test.json';let secrets;
try{secrets=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;secrets={database,runtime:{user:'t09_baseline_runtime',password:randomBytes(32).toString('hex')},auth:{user:'t09_baseline_auth',password:randomBytes(32).toString('hex')}};await writeFile(file,JSON.stringify(secrets),{flag:'wx',mode:0o600});}
assert.equal(secrets.database,database);
for(const [role,credential]of Object.entries({runtime:secrets.runtime,auth:secrets.auth})){assert.equal(credential.user,'t09_baseline_'+role);assert.match(credential.password,/^[a-f0-9]{64}$/);rootSQL(format('CREATE USER IF NOT EXISTS ?@\'%\' IDENTIFIED BY ?',[credential.user,credential.password]));}
const migration=JSON.parse(await readFile('.local/chat-cutover/migration-test.json','utf8'));assert.equal(migration.database,database);
const operator=createPool({host:'127.0.0.1',port:13306,...migration});
const grantOperator={query:async(sql,args)=>sql.startsWith('SELECT')?operator.query(sql,args):[rootSQL(format(sql,args))]};
const runtime=createPool({host:'127.0.0.1',port:13306,database,...secrets.runtime}),auth=createPool({host:'127.0.0.1',port:13306,database,...secrets.auth});
try{
 await applyRuntimeGrants(grantOperator,database,secrets.runtime.user);
 await applyAuthGrants(grantOperator,database,secrets.auth.user,secrets.auth.password);
 await runtime.query('SELECT id FROM tenant LIMIT 1');await runtime.query('SELECT id FROM channel_connection LIMIT 1');
 for(const table of chatExclusiveTables)await assert.rejects(runtime.query('SELECT 1 FROM `'+table+'` LIMIT 1'),error=>error.code==='ER_TABLEACCESS_DENIED_ERROR');
 for(const pool of [runtime,auth])await assert.rejects(pool.query('SELECT 1 FROM agentic_crm.tenant LIMIT 1'),error=>['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(error.code));
 await auth.query('SELECT state FROM identity_account_gate LIMIT 1');await auth.query('SELECT state FROM identity_owner_admission LIMIT 1');
 await assert.rejects(auth.query('SELECT 1 FROM conversation LIMIT 1'),error=>error.code==='ER_TABLEACCESS_DENIED_ERROR');
 const result={status:'PASS',database,exclusiveChatTablesDenied:chatExclusiveTables.size,nonChatRead:true,authDrainRead:true,foreignSchemaDenied:true};
 await mkdir('artifacts/chat-extraction/t09-20261026',{recursive:true});await writeFile('artifacts/chat-extraction/t09-20261026/grants.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await Promise.all([operator.end(),runtime.end(),auth.end()]);}
