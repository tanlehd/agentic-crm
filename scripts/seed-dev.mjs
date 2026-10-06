import { provisionSeedUsers,seedUserNames } from './seed-provider.mjs';
import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';

let stage='configuration';
async function main(){
  const env=parseEnv(await readFile('.env','utf8'));
  const origin=new URL(env.APP_ORIGIN);
  if(env.APP_ENV!=='development'||env.MYSQL_DATABASE!=='agentic_crm'||origin.protocol!=='http:'||!['localhost','127.0.0.1'].includes(origin.hostname)||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('Local development only');
  const users=seedUserNames;
  for(const user of users)if(!env[`SEED_${user.toUpperCase()}_PASSWORD`])throw new Error('Run env:init');
  const composeEnv={...process.env,...env};
  stage='schema preflight';
  const preflight=spawnSync('docker',['compose','run','--rm','--no-deps','-T','migrate','node','dist/kernel/database/cli.js','status'],{env:composeEnv,encoding:'utf8',timeout:120000});
  if(preflight.status!==0)throw new Error('Schema not ready');
  const base=`${origin.origin}/identity`;
  stage='IdP authentication';
  const response=await fetch(`${base}/realms/master/protocol/openid-connect/token`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),body:new URLSearchParams({grant_type:'password',client_id:'admin-cli',username:'local_admin',password:env.KEYCLOAK_ADMIN_PASSWORD})});
  if(!response.ok)throw new Error('Local IdP authentication failed');
  const {access_token:token}=await response.json();
  const api=async(path,method='GET',body)=>{
    const result=await fetch(`${base}/admin/realms/agentic-crm-dev/${path}`,{method,redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
    if(!result.ok)throw new Error('Local IdP provision failed');
    return result.status===201||result.status===204?undefined:result.json();
  };
  stage='IdP fixture provisioning';
  const subjects=await provisionSeedUsers(api,Object.fromEntries(users.map(user=>[user,env[`SEED_${user.toUpperCase()}_PASSWORD`]])));
  stage='database seed';
  const result=spawnSync('docker',['compose','run','--rm','--no-deps','-T','-e',`APP_ENV=${env.APP_ENV}`,'-e',`APP_ORIGIN=${origin.origin}`,'migrate','node','dist/modules/identity/seed-cli.js'],{env:composeEnv,input:JSON.stringify({issuer:`${base}/realms/agentic-crm-dev`,subjects}),encoding:'utf8',timeout:60000});
  if(result.status!==0)throw new Error('Database fixture rejected');
  const summary=JSON.parse(result.stdout);
  console.log(`PASS: Identity seed ${summary.created} tenants created, ${summary.existing} preserved. Credentials remain in private .env.`);
}
main().catch(()=>{console.error(`Local seed failed at ${stage}. Check preview/schema, env:init, IdP fixture marker and account mapping; no secrets or provider details logged.`);process.exitCode=1;});
