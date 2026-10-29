import { createPool } from 'mysql2/promise';
import { grantRuntime } from './grants.js';
import { MessengerStore } from './messenger-store.js';
import { Store } from './store.js';
import { migrate,ready } from './schema.js';
import { createApi } from './http.js';
import { Worker } from './worker.js';
import { WorkerHealth,startWorkerHealth,closeWorkerHealth } from './worker-health.js';
import {workloadMaterial,registryConfig} from '@agentic-crm/workload-transport';
import {connectorDispatchServer} from './dispatch-http.js';
const mode=process.argv[2];
function required(key:string){const value=process.env[key];if(!value)throw new Error('CONFIG_REQUIRED');return value;}
async function main(){
 if(!['api','worker','dispatch','migrate','provision','grant','provision-meta'].includes(mode??''))throw new Error('INVALID_MODE');
 const privileged=mode==='migrate'||mode==='provision'||mode==='grant'||mode==='provision-meta';
 const pool=createPool({host:required('CONNECTOR_DB_HOST'),port:Number(process.env.CONNECTOR_DB_PORT??3306),database:required('CONNECTOR_DB_NAME'),user:required(privileged?'CONNECTOR_MIGRATION_USER':'CONNECTOR_DB_USER'),password:required(privileged?'CONNECTOR_MIGRATION_PASSWORD':'CONNECTOR_DB_PASSWORD'),connectionLimit:5,timezone:'Z',supportBigNumbers:true,bigNumberStrings:true,connectTimeout:5000});
 const store=new Store(pool);
 try{
  if(mode==='migrate'){await migrate(pool);await pool.end();return;}
  await ready(pool);
  if(mode==='dispatch'){
   const material=await workloadMaterial('connector'),registry=await registryConfig();
   const synthetic=['development','test'].includes(process.env.APP_ENV??'')&&process.env.CONNECTOR_DISPATCH_ADAPTER==='synthetic';
   const server=connectorDispatchServer(pool,material,registry,{identity:new URL(required('WORKLOAD_IDENTITY_URL')),chat:new URL(required('WORKLOAD_CHAT_URL'))},synthetic);
   const port=Number(required('WORKLOAD_PORT'));if(!Number.isInteger(port)||port<1||port>65535)throw new Error('INVALID_PORT');
   await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(port,process.env.WORKLOAD_HOST??'127.0.0.1',resolve);});
   let stopping=false;const stop=()=>{if(stopping)return;stopping=true;const timer=setTimeout(()=>process.exit(1),10000);timer.unref();server.close(()=>{void pool.end().then(()=>clearTimeout(timer)).catch(()=>process.exit(1));});};
   process.once('SIGTERM',stop);process.once('SIGINT',stop);return;
  }
  if(mode==='grant'){await grantRuntime(pool,required('CONNECTOR_DB_NAME'),required('CONNECTOR_DB_USER'),required('CONNECTOR_DB_PASSWORD'));await pool.end();return;}
  if(mode==='provision-meta'){await new MessengerStore(pool).provision({id:required('CONNECTOR_META_BINDING_ID'),tenant_id:required('CONNECTOR_TENANT_ID'),app_id:required('CONNECTOR_META_APP_ID'),page_id:required('CONNECTOR_META_PAGE_ID')});await pool.end();return;}
  if(mode==='provision'){await store.provision({id:required('CONNECTOR_CONNECTION_ID'),tenant_id:required('CONNECTOR_TENANT_ID'),token:required('CONNECTOR_INGRESS_TOKEN'),remote_connection_id:required('CONNECTOR_REMOTE_CONNECTION_ID'),remote_token_env:required('CONNECTOR_REMOTE_TOKEN_ENV')});await pool.end();return;}
  if(mode==='api'){
   const app=await createApi(store);await app.listen(Number(process.env.PORT??3010),'0.0.0.0');let stopping=false;
   const stop=()=>{if(stopping)return;stopping=true;const timer=setTimeout(()=>process.exit(1),15000);void app.close().then(()=>pool.end()).then(()=>clearTimeout(timer)).catch(()=>process.exit(1));};
   process.once('SIGTERM',stop);process.once('SIGINT',stop);
  }else{
   const worker=new Worker(store,required('CONNECTOR_REMOTE_ORIGIN'),process.env,fetch,process.env.CONNECTOR_ALLOW_HTTP==='true');let stop=false;
   const health=new WorkerHealth(),healthServer=await startWorkerHealth(health,Number(process.env.CONNECTOR_WORKER_PORT??process.env.PORT??3011),process.env.CONNECTOR_WORKER_HOST??'127.0.0.1');
   const shutdown=()=>{if(stop)return;stop=true;health.drain();setTimeout(()=>process.exit(1),40000).unref();};process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
   while(!stop){try{await ready(pool);await worker.tick();health.succeeded();}catch{health.unavailable();console.error('CONNECTOR_TICK_UNAVAILABLE');}if(!stop)await new Promise(resolve=>setTimeout(resolve,500));}
   await closeWorkerHealth(healthServer);
   await pool.end();
  }
 }catch(e){await pool.end();throw e;}
}
main().catch(()=>{console.error('CONNECTOR_START_FAILED');process.exitCode=1;});
