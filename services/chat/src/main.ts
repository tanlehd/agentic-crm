import {createServer,type Server} from 'node:http';
import {setTimeout as delay} from 'node:timers/promises';
import {createWorkloadServer,workloadMaterial,registryConfig,workloadReadiness} from '@agentic-crm/workload-transport';
import {chatPool} from './database.js';
import {runtimeConfig} from './runtime-config.js';
import {composeChat,mergeChatRoutes,scopeChatRoutes} from './composition.js';
import {checkChatStorage,checkChatGrants,checkChatPeers,chatBacklog} from './runtime-checks.js';
import {ChatWorker} from './worker.js';
import {startRealtimePublisher} from './realtime.js';

async function listen(server:Server,port:number,host:string){await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(port,host,()=>{server.off('error',reject);resolve();});});}
async function close(server:Server){server.closeIdleConnections();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
async function main(){
 const mode=process.argv[2];if(mode!=='api'&&mode!=='worker')throw new Error('CHAT_MODE_REQUIRED');
 const config=await runtimeConfig(),material=await workloadMaterial('chat'),registry=await registryConfig(),pool=chatPool(config.database);
 const stopRealtime=startRealtimePublisher(config.tenants);
 let api:Server|undefined,health:Server|undefined,stopping=false,worker:ChatWorker|undefined,ticking:Promise<void>|undefined;
 try{
  await checkChatGrants(pool,config.database.database);await checkChatStorage(pool,config);
  const runtime=composeChat(pool,material,registry,config);
  const ready=async()=>{if(stopping)throw new Error('CHAT_DRAINING');await checkChatStorage(pool,config);if(mode==='api')await checkChatPeers(material,runtime.authority,config);else if(!worker?.metrics.lastSuccess||Date.now()-worker.metrics.lastSuccess>120000)throw new Error('CHAT_WORKER_STALE');};
  if(mode==='api'){
   const routes=mergeChatRoutes(runtime.routes,scopeChatRoutes({'/internal/v1/workloads/ready':workloadReadiness('chat',()=>checkChatStorage(pool,config))},config.tenants));
   // Local readiness checks dependencies; private readiness checks self to avoid cycles.
   api=createWorkloadServer(material,runtime.authority,routes);await listen(api,config.port,config.host);
  }else worker=new ChatWorker(runtime,config);
  health=createServer((req,res)=>{void(async()=>{
   res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
   if(req.method!=='GET'||!['/health/live','/health/ready','/metrics'].includes(req.url??'')){res.statusCode=404;res.end('{}');return;}
   try{if(req.url==='/health/ready')await ready();res.end(JSON.stringify(req.url==='/metrics'?{mode,draining:stopping,jobs:worker?.jobs,...worker?.metrics,backlog:await chatBacklog(pool,config.tenants)}:{status:stopping?'draining':'ok',mode}));}
   catch{res.statusCode=503;res.end(JSON.stringify({status:'unavailable',mode}));}
  })().catch(()=>{res.statusCode=503;res.end('{}');});});await listen(health,config.healthPort,config.healthHost);
  let finish:()=>void=()=>{};const stopped=new Promise<void>(r=>{finish=r;});
  const stop=()=>{if(stopping)return;stopping=true;worker?.stop();finish();};process.once('SIGTERM',stop);process.once('SIGINT',stop);
  console.log(JSON.stringify({service:'chat',mode,status:'started'}));
  if(worker)ticking=(async()=>{while(!stopping){try{await checkChatStorage(pool,config);await worker!.tick();}catch{worker!.metrics.failures++;}if(!stopping)await Promise.race([delay(config.intervalMs),stopped]);}})();
  await stopped;
  const deadline=setTimeout(()=>process.exit(1),40000);deadline.unref();
  try{if(api)await close(api);await ticking;if(health)await close(health);stopRealtime();await pool.end();}finally{clearTimeout(deadline);}
 }catch(error){stopRealtime();worker?.stop();stopping=true;if(api)await close(api).catch(()=>{});if(health)await close(health).catch(()=>{});await pool.end();throw error;}
}
main().catch(()=>{console.error('CHAT_START_FAILED');process.exitCode=1;});
