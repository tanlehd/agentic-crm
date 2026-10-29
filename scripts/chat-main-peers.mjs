import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {parseEnv} from 'node:util';
import {workloadMaterial,remoteRegistryAuthority,workloadRequest} from '../packages/workload-transport/dist/index.js';
import {mainEvidenceDirectory} from './lib/chat-main-evidence.mjs';
const dir='.local/chat-main',config=JSON.parse(await readFile(dir+'/material/owners.json','utf8')),env=parseEnv(await readFile(dir+'/identity.env','utf8'));
const material=await workloadMaterial('chat',{APP_ENV:'development',WORKLOAD_TRANSPORT:'http-local',WORKLOAD_HTTP_KEYS_FILE:dir+'/material/http-keys.json'});
const authority=remoteRegistryAuthority(material,{url:new URL('http://127.0.0.1:3012/internal/v1/workloads/admit'),keyId:env.WORKLOAD_AUTHORITY_KEY_ID,publicKey:await readFile(dir+'/material/authority.pub')});
const ports={identity:13111,crm:13112,connector:13113,routing:13114,sales:13115,workflow:13116};
const checks=[];
for(const tenant of config.tenants)for(const [service,port]of Object.entries(ports)){
 const request_id=randomUUID();let status='FAIL',code;
 try{const r=await workloadRequest(material,authority,{url:new URL('http://127.0.0.1:'+port+'/internal/v1/workloads/ready'),expectedService:service,tenant,data:{schema_version:1,request_id,tenant_id:tenant}});if(r.status!=='ready'||r.request_id!==request_id||r.service!==service)throw Error('PEER_READINESS_BINDING');status='PASS';}catch(e){code=e.code??e.message;process.exitCode=1;}
 checks.push({service,tenantIndex:config.tenants.indexOf(tenant),status,...(code?{code}:{})});
}
await writeFile((await mainEvidenceDirectory())+'/main-peers.json',JSON.stringify({status:checks.every(c=>c.status==='PASS')?'PASS':'FAIL',checks},null,2));console.log(JSON.stringify(checks));
