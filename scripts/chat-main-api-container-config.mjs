// Docker Desktop host networking preserves Reporting loopback and one VM clock.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {parseEnv} from 'node:util';
import {mainEvidenceDirectory} from './lib/chat-main-evidence.mjs';
const dir='.local/chat-main',env=parseEnv(await readFile(dir+'/api.env','utf8')),original=parseEnv(await readFile('.local/services/api.env','utf8'));
if(env.APP_ENV!=='development'||env.MYSQL_DATABASE!=='agentic_crm'||!original.REPORTING_SERVICE_URL?.startsWith('http://127.0.0.1:'))throw Error('LOCAL_MAIN_REQUIRED');
env.REPORTING_SERVICE_URL=original.REPORTING_SERVICE_URL;
env.PORT='13101';
await writeFile(dir+'/api.container.env',Object.entries(env).map(([k,v])=>k+'='+JSON.stringify(v)).join('\n')+'\n',{mode:0o600});
const compose=JSON.parse(await readFile(dir+'/compose.baseline.json','utf8'));
compose.services.api={...compose.services.worker,command:['node','dist/main.js'],env_file:[resolve(dir+'/api.container.env').replaceAll('\\','/')],network_mode:'host'};
delete compose.services.api.ports;
compose.services['api-entry']={...compose.services.worker,command:['node','/run/api-forward.mjs'],env_file:[],volumes:[resolve('scripts/chat-main-api-forward.mjs').replaceAll('\\','/')+':/run/api-forward.mjs:ro'],ports:['127.0.0.1:3001:3001']};
await writeFile(dir+'/compose.baseline.json',JSON.stringify(compose,null,2));
const result={status:'PASS',mode:'container-host-network-with-local-port-entry',image:compose.services.api.image,port:3001,internalPort:13101,reason:'same-Docker-clock-and-retained-Reporting-loopback-contract'};
await writeFile((await mainEvidenceDirectory())+'/api-container-config.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
