import {rootSQL} from './lib/chat-native.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID,createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const env=parseEnv(await readFile('.local/native-auth-test.env','utf8'));
if(env.MYSQL_MIGRATION_USER!=='native_test_operator'||env.MYSQL_DATABASE!=='native_identity_test')throw Error('LOCAL_TEST_ONLY');
// Each invocation retains its complete fault-injection dataset. Never reset a previous run.
const scope=process.argv[2];if(process.argv.length>3||scope&&!['workflow','routing','intake','healthcare'].includes(scope))throw Error('Usage: chat-retirement-regression.mjs [workflow|routing|intake|healthcare]');
const run=randomUUID(),names=(scope?[scope]:['workflow','routing','intake','healthcare']).map(name=>name+'_test');
const databases=names.map(name=>'retire_'+createHash('sha256').update(run+':'+name).digest('hex').slice(0,16));
rootSQL(databases.map(db=>`CREATE DATABASE \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs; GRANT ALL ON \`${db}\`.* TO 'native_test_operator'@'%';`).join('\n'));
const folder='artifacts/chat-extraction/t09-20261027-02/'+run;await mkdir(folder,{recursive:true});await writeFile(folder+'/databases.json',JSON.stringify({run,databases,names},null,2));
const r=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','services/core-baseline/tests/chat-retirement.integration.test.ts','--testTimeout=90000','--hookTimeout=90000'],{env:{...process.env,...env,CHAT_RETIREMENT_NATIVE:'1',CHAT_RETIREMENT_SCOPE:scope??'',RETIREMENT_NATIVE_CASES:'1',RETIREMENT_RUN:run},encoding:'utf8',windowsHide:true,timeout:480000,maxBuffer:8*1024*1024});
await writeFile(folder+'/native-regression.log',r.stdout+r.stderr);console.log(JSON.stringify({folder,exit:r.status}));process.exitCode=r.status??1;
