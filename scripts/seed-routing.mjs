import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
try{
  const env=parseEnv(await readFile('.env','utf8')),origin=new URL(env.APP_ORIGIN);
  if(env.APP_ENV!=='development'||env.MYSQL_DATABASE!=='agentic_crm'||!['localhost','127.0.0.1'].includes(origin.hostname))throw new Error('Local only');
  const result=spawnSync('docker',['compose','run','--rm','--no-deps','-T','-e','APP_ENV=development','-e',`APP_ORIGIN=${origin.origin}`,'migrate','node','dist/modules/identity/routing-seed-cli.js'],{encoding:'utf8',timeout:60000});
  if(result.status!==0)throw new Error();const summary=JSON.parse(result.stdout);console.log(`Routing fixture v1: ${summary.created} created, ${summary.existing} preserved.`);
}catch{console.error('ROUTING_FIXTURE_FAILED');process.exitCode=1;}
