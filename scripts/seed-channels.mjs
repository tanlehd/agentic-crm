import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
try{
  const env=parseEnv(await readFile('.env','utf8')),origin=new URL(env.APP_ORIGIN);
  if(env.APP_ENV!=='development'||env.MYSQL_DATABASE!=='agentic_crm'||origin.protocol!=='http:'||!['localhost','127.0.0.1'].includes(origin.hostname))throw new Error('Local only');
  const result=spawnSync('docker',['compose','run','--rm','--no-deps','-T','-e',`APP_ENV=${env.APP_ENV}`,'-e',`APP_ORIGIN=${origin.origin}`,'migrate','node','dist/modules/channels/seed-cli.js'],{env:Object.fromEntries(Object.entries({...process.env,...env}).filter(([name])=>!['MOCK_ALPHA_TOKEN','MOCK_BETA_TOKEN'].includes(name))),input:JSON.stringify({alpha:env.MOCK_ALPHA_TOKEN,beta:env.MOCK_BETA_TOKEN}),encoding:'utf8',timeout:60000});
  if(result.status!==0)throw new Error('Channel seed rejected');const summary=JSON.parse(result.stdout);console.log(`Channels fixture v1: ${summary.created} created, ${summary.existing} preserved.`);
}catch{console.error('Channels fixture failed; check local schema/Identity fixture and private token settings.');process.exitCode=1;}
