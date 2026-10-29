import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import {resolve} from 'node:path';
export async function availableChatPort(){const server=createServer();server.listen(0,'127.0.0.1');await once(server,'listening');const port=server.address().port;await new Promise(r=>server.close(r));return port;}
async function docker(args){const child=spawn('docker',args,{windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',d=>{output+=d;});child.stderr.on('data',()=>{});const [code]=await once(child,'exit');if(code!==0)throw new Error('CHAT_CONTAINER_COMMAND_FAILED');return output.trim();}
export async function nativeChatProcess({name,tenant,material,registry,owners,dispatch,receivers={},port,cursorKey,mode='api',workerJobs}){
 assert(['outbound','ingress','worker','parity'].includes(name));assert(material.localHttp);
 const image=process.env.CHAT_TEST_IMAGE,folder=resolve('.local/chat-runtime-native/'+name),healthPort=await availableChatPort();await mkdir(folder,{recursive:true});
 const cfg=JSON.parse(await readFile('.local/chat-ownership/credentials.json','utf8'));assert.equal(cfg.database,'test_crm_chat_owner');
 const map=url=>{const u=new URL(url);if(image)u.hostname='host.docker.internal';return u.href;};
 const endpoints={owners:Object.fromEntries(Object.entries(owners).map(([k,v])=>[k,map(v)])),dispatch:Object.fromEntries(Object.entries(dispatch).map(([k,v])=>[k,map(v)])),receivers:Object.fromEntries(Object.entries(receivers).map(([k,v])=>[k,map(v)]))};
 await writeFile(folder+'/endpoints.json',JSON.stringify(endpoints),{mode:0o600});await writeFile(folder+'/keys.json',JSON.stringify(material.localHttp),{mode:0o600});await writeFile(folder+'/authority.pem',registry.publicKey,{mode:0o600});
 await writeFile(folder+'/cursors.json',JSON.stringify(Object.fromEntries(['history','catalog','workspace','activity','external'].map(k=>[k,Buffer.from(cursorKey).toString('hex')]))),{mode:0o600});
 const path=f=>image?'/run/chat/'+f:resolve(folder,f);
 const settings={APP_ENV:'test',WORKLOAD_TRANSPORT:'http-local',WORKLOAD_HTTP_KEYS_FILE:path('keys.json'),WORKLOAD_REGISTRY_URL:map(registry.url),WORKLOAD_AUTHORITY_KEY_ID:registry.keyId,WORKLOAD_AUTHORITY_PUBLIC_KEY_FILE:path('authority.pem'),CHAT_ENDPOINTS_FILE:path('endpoints.json'),CHAT_CURSOR_KEYS_FILE:path('cursors.json'),CHAT_DB_HOST:image?'host.docker.internal':cfg.host,CHAT_DB_PORT:String(cfg.port),CHAT_DB_NAME:cfg.database,CHAT_DB_USER:'chat_owner_test_runtime',CHAT_DB_PASSWORD:cfg.runtime,CHAT_TENANTS:tenant,CHAT_WRITER_EPOCH:'1',CHAT_HOST:image?'0.0.0.0':'127.0.0.1',CHAT_PORT:String(image?3020:port),CHAT_HEALTH_HOST:image?'0.0.0.0':'127.0.0.1',CHAT_HEALTH_PORT:String(image?3021:healthPort)};
 if(workerJobs)settings.CHAT_WORKER_JOBS=workerJobs.join(',');
 let child,container;const containerName='chat-native-'+name+'-'+process.pid;
 const crash=async()=>{if(container){await docker(['kill','--signal','KILL',containerName]);const code=await docker(['inspect','--format','{{.State.ExitCode}}',containerName]);await docker(['rm',containerName]);container=false;assert.equal(code,'137','Chat container killed at process boundary');}if(child&&child.exitCode===null){const done=once(child,'exit');child.kill('SIGKILL');await done;}};
 const stop=async()=>{if(container){await docker(['stop','--time','40',containerName]);const code=await docker(['inspect','--format','{{.State.ExitCode}}',containerName]);await docker(['rm',containerName]);container=false;assert.equal(code,'0','Chat container graceful exit');}if(child&&child.exitCode===null){const done=once(child,'exit');child.kill('SIGTERM');await done;}};
 const start=async()=>{
  if(image){await writeFile(folder+'/container.env',Object.entries(settings).map(([k,v])=>k+'='+v).join('\n')+'\n',{mode:0o600});await docker(['run','-d','--name',containerName,'--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--env-file',folder+'/container.env','--mount','type=bind,source='+folder+',target=/run/chat,readonly','-p','127.0.0.1:'+port+':3020','-p','127.0.0.1:'+healthPort+':3021',image,'node','dist/main.js',mode]);container=true;}
  else{child=spawn(process.execPath,['services/chat/dist/main.js',mode],{env:{...process.env,...settings},windowsHide:true,stdio:'ignore'});}
  const until=Date.now()+45000;while(Date.now()<until){if(child&&child.exitCode!==null)throw new Error('CHAT_PROCESS_START_FAILED');try{const r=await fetch('http://127.0.0.1:'+healthPort+'/health/live',{signal:AbortSignal.timeout(500)});if(r.ok)return;}catch{}await delay(100);}
  throw new Error('CHAT_PROCESS_START_TIMEOUT');
 };
 try{await start();}catch(e){await stop().catch(()=>{});throw e;}
 return {url:new URL('http://127.0.0.1:'+port+'/'),health:new URL('http://127.0.0.1:'+healthPort+'/'),start,stop,crash,image:!!image};
}
