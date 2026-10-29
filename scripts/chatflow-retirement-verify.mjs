import {readFile,writeFile,readdir,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {rootSQL} from './lib/chat-native.mjs';
// Clean only emitted outputs whose exact source module has been removed.
const removed=[];
for(const dir of ['services/core-baseline/dist/modules/chatflow']){
 let files=[];try{files=await readdir(dir);}catch(e){if(e.code!=='ENOENT')throw e;}
 for(const file of files){if(!/\.(js|d\.ts|js\.map|d\.ts\.map)$/.test(file))throw Error('UNEXPECTED_COMPILED_ARTIFACT');await unlink(dir+'/'+file);removed.push(dir+'/'+file);}
}
for(const [dir,prefixes] of [['services/core-baseline/dist/modules/sales',['chatflow-port']],['services/core-baseline/dist/modules/conversation',['chatflow-port']],['services/core-baseline/dist/modules/agents',['chatflow-port']],['services/core-baseline/dist/modules/workflow',['parent-port']],['services/core-baseline/dist/modules/crm',['session-lead-port']],['packages/contracts/dist/generated',['chatflow-']]]){
 for(const file of await readdir(dir))if(prefixes.some(p=>file.startsWith(p))){await unlink(dir+'/'+file);removed.push(dir+'/'+file);}
}
const endpoints={};for(const path of ['http://127.0.0.1:3001/api/v1/health/ready','http://127.0.0.1:3002/api/v1/health/ready','http://127.0.0.1:3020/status','http://127.0.0.1:3001/api/v1/chatflows'])try{const r=await fetch(path,{signal:AbortSignal.timeout(10000)});endpoints[path]=r.status;await r.body?.cancel();}catch{endpoints[path]='unavailable';}
const sql="SELECT 'main',MAX(version) FROM agentic_crm.schema_migration UNION ALL SELECT 'native',MAX(version) FROM native_identity_test.schema_migration UNION ALL SELECT 'chat',MAX(version) FROM test_crm_chat_owner.schema_migration";
const result={endpoints,schemas:rootSQL(sql),removedCompiledArtifacts:removed,remainingHistoricalTables:rootSQL("SELECT TABLE_SCHEMA,COUNT(*) FROM information_schema.TABLES WHERE TABLE_NAME LIKE 'chatflow%' GROUP BY TABLE_SCHEMA")};
await writeFile('artifacts/chatflow-retirement/final-runtime.json',JSON.stringify(result,null,2));console.log(JSON.stringify({endpoints,schemas:result.schemas,removedCompiledArtifacts:removed.length},null,2));
