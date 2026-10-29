import {rootSQL} from './lib/chat-native.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID,createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const env=parseEnv(await readFile('.local/native-auth-test.env','utf8'));
if(env.MYSQL_MIGRATION_USER!=='native_test_operator'||env.MYSQL_DATABASE!=='native_identity_test')throw Error('LOCAL_TEST_ONLY');
const run=randomUUID(),names=[];
for(const file of ['workflow','crm-core','healthcare']){
 const source=await readFile(`services/core-baseline/tests/${file}-cases.ts`,'utf8');
 for(const [,name] of source.matchAll(/isolated\('([^']+)'\)/g))names.push(name);
}
const databases=names.map(name=>'retire_'+createHash('sha256').update(run+':'+name).digest('hex').slice(0,16));
rootSQL(databases.map(db=>`CREATE DATABASE \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs; GRANT ALL ON \`${db}\`.* TO 'native_test_operator'@'%';`).join('\n'));
await mkdir('artifacts/chatflow-retirement',{recursive:true});await writeFile('artifacts/chatflow-retirement/regression-databases.json',JSON.stringify({run,databases,names},null,2));
const r=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','services/core-baseline/tests/automation-retirement.integration.test.ts','--testTimeout=90000','--hookTimeout=90000'],{env:{...process.env,...env,RETIREMENT_NATIVE_CASES:'1',RETIREMENT_RUN:run},encoding:'utf8',windowsHide:true,timeout:480000,maxBuffer:8*1024*1024});
await writeFile('artifacts/chatflow-retirement/native-regression.log',r.stdout+r.stderr);console.log('Native owner regression exit',r.status);process.exitCode=r.status??1;
