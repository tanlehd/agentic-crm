// Preserve the existing Reporting loopback contract for the baseline public API.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {parseEnv} from 'node:util';
import {mainEvidenceDirectory} from './lib/chat-main-evidence.mjs';
const out=await mainEvidenceDirectory(),pin=JSON.parse(await readFile(out+'/backend-image-javascript.json','utf8')),seen=[];
async function walk(path){for(const entry of await readdir('services/core-baseline/'+path,{withFileTypes:true})){const p=path+'/'+entry.name;if(entry.isDirectory())await walk(p);else if(p.endsWith('.js')){seen.push(p);if(createHash('sha256').update(await readFile('services/core-baseline/'+p)).digest('hex')!==pin[p])throw Error('BASELINE_IMAGE_SOURCE_DRIFT');}}}
await walk('dist');if(seen.length!==Object.keys(pin).length)throw Error('BASELINE_EXTRA_IMAGE_SOURCE');
const root='.local/chat-main',env=parseEnv(await readFile(root+'/api.env','utf8')),original=parseEnv(await readFile('.local/services/api.env','utf8'));
for(const key of ['MYSQL_HOST','REDIS_HOST'])env[key]='127.0.0.1';
for(const key of ['CHAT_OWNER_URL','IDENTITY_OWNER_URL','ROUTING_OWNER_URL','CHANNELS_OWNER_URL','WORKLOAD_REGISTRY_URL'])env[key]=env[key].replace('host.docker.internal','127.0.0.1');
env.REPORTING_SERVICE_URL=original.REPORTING_SERVICE_URL;
env.WORKLOAD_HTTP_KEYS_FILE=resolve(root+'/material/http-keys.json').replaceAll('\\','/');env.WORKLOAD_AUTHORITY_PUBLIC_KEY_FILE=resolve(root+'/material/authority.pub').replaceAll('\\','/');
const owners=JSON.parse(await readFile(root+'/material/owners.json','utf8'));for(const key of ['chat','identity','routing'])owners[key]=owners[key].replace('host.docker.internal','127.0.0.1');
await writeFile(root+'/owners.host.json',JSON.stringify(owners),{mode:0o600});env.BASELINE_OWNER_CONFIG_FILE=resolve(root+'/owners.host.json').replaceAll('\\','/');
await writeFile(root+'/api.host.env',Object.entries(env).map(([k,v])=>k+'='+JSON.stringify(v)).join('\n')+'\n',{mode:0o600});
const compose=JSON.parse(await readFile(root+'/compose.baseline.json','utf8'));delete compose.services.api;await writeFile(root+'/compose.baseline.json',JSON.stringify(compose,null,2));
const report={status:'PASS',matchingJavascriptFiles:seen.length,apiMode:'host-process',reason:'retained-reporting-loopback-contract',port:3001};await writeFile(out+'/api-host-build.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
