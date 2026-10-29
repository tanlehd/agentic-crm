// Explicit retained test-only forward42 application; ordinary HTTP tests never migrate.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {databaseSource} from '../services/core-baseline/dist/kernel/database/data-source.js';
import {migrate} from '../services/core-baseline/dist/kernel/database/migration-runner.js';
import {migrations} from '../services/core-baseline/dist/kernel/database/migrations.js';
const env=parseEnv(await readFile('.local/native-auth-test.env','utf8'));
assert.equal(env.APP_ENV,'test');assert.equal(env.MYSQL_HOST,'127.0.0.1');assert.equal(env.MYSQL_PORT,'13306');assert.equal(env.MYSQL_DATABASE,'native_identity_test');Object.assign(process.env,env);
const source=databaseSource(true);await source.initialize();
const digest=rows=>createHash('sha256').update(JSON.stringify(rows)).digest('hex');
try{
 const journal=await source.query('SELECT * FROM schema_migration ORDER BY version');assert.ok([41,42].includes(journal.length));
 const before=await source.query('SELECT * FROM outbound_intent ORDER BY tenant_id,id');
 assert.equal(await migrate(source,migrations),42-journal.length);
 assert.deepEqual(await source.query('SELECT * FROM outbound_intent ORDER BY tenant_id,id'),before);
 assert.deepEqual((await source.query('SELECT * FROM schema_migration ORDER BY version')).slice(0,journal.length),journal);
 const explain=await source.query("EXPLAIN SELECT tenant_id,intent_id FROM chat_outbound_job WHERE status='pending' AND next_attempt_at<=UTC_TIMESTAMP(6) ORDER BY next_attempt_at,tenant_id,intent_id LIMIT 25");
 assert.ok(explain.some(r=>String(r.possible_keys).includes('ix_chat_outbound_due')));
 const evidence={passed:true,from:journal.length,to:42,rowsPreserved:before.length,digest:digest(before),journalPreserved:journal.length,explain};
 await mkdir('artifacts/human-outbound',{recursive:true});await writeFile('artifacts/human-outbound/schema'+(journal.length===41?'-upgrade':'')+'.json',JSON.stringify(evidence,null,2));
 console.log('PASS forward42 preserves every existing outbound value and journal; bounded queue index available');
}finally{await source.destroy();}
