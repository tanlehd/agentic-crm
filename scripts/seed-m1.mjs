import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
try{
  const env=parseEnv(await readFile('.env','utf8'));
  const origin=new URL(env.APP_ORIGIN);
  if(env.APP_ENV!=='development'||env.MYSQL_DATABASE!=='agentic_crm'||origin.protocol!=='http:'||!['localhost','127.0.0.1'].includes(origin.hostname))throw new Error('Local only');
  const result=spawnSync('docker',['compose','run','--rm','--no-deps','-T','-e',`APP_ENV=${env.APP_ENV}`,'-e',`APP_ORIGIN=${origin.origin}`,'migrate','node','dist/modules/crm/m1-seed-cli.js'],{env:{...process.env,...env},encoding:'utf8',timeout:60000});
  if(result.status!==0)throw new Error('M1 seed rejected');
  const summary=JSON.parse(result.stdout);console.log(`M1 fixture v3: ${summary.created} created, ${summary.existing} preserved.`);
}catch{console.error('M1 fixture failed; check local schema/Identity fixture.');process.exitCode=1;}
