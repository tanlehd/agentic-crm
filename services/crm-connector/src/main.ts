import { createPool } from 'mysql2/promise';
import { grantRuntime } from './grants.js';
import { MessengerStore } from './messenger-store.js';
import { Store } from './store.js';
import { migrate,ready } from './schema.js';
import { createApi } from './http.js';
import { Worker } from './worker.js';
const mode=process.argv[2];
function required(key:string){const value=process.env[key];if(!value)throw new Error('CONFIG_REQUIRED');return value;}
async function main(){
 if(!['api','worker','migrate','provision','grant','provision-meta'].includes(mode??''))throw new Error('INVALID_MODE');
 const privileged=mode==='migrate'||mode==='provision'||mode==='grant'||mode==='provision-meta';
 const pool=createPool({host:required('CONNECTOR_DB_HOST'),port:Number(process.env.CONNECTOR_DB_PORT??3306),database:required('CONNECTOR_DB_NAME'),user:required(privileged?'CONNECTOR_MIGRATION_USER':'CONNECTOR_DB_USER'),password:required(privileged?'CONNECTOR_MIGRATION_PASSWORD':'CONNECTOR_DB_PASSWORD'),connectionLimit:5,timezone:'Z',supportBigNumbers:true,bigNumberStrings:true,connectTimeout:5000});
 const store=new Store(pool);
 try{
  if(mode==='migrate'){await migrate(pool);await pool.end();return;}
  await ready(pool);
  if(mode==='grant'){await grantRuntime(pool,required('CONNECTOR_DB_NAME'),required('CONNECTOR_DB_USER'),required('CONNECTOR_DB_PASSWORD'));await pool.end();return;}
  if(mode==='provision-meta'){await new MessengerStore(pool).provision({id:required('CONNECTOR_META_BINDING_ID'),tenant_id:required('CONNECTOR_TENANT_ID'),app_id:required('CONNECTOR_META_APP_ID'),page_id:required('CONNECTOR_META_PAGE_ID')});await pool.end();return;}
  if(mode==='provision'){await store.provision({id:required('CONNECTOR_CONNECTION_ID'),tenant_id:required('CONNECTOR_TENANT_ID'),token:required('CONNECTOR_INGRESS_TOKEN'),remote_connection_id:required('CONNECTOR_REMOTE_CONNECTION_ID'),remote_token_env:required('CONNECTOR_REMOTE_TOKEN_ENV')});await pool.end();return;}
  if(mode==='api'){
   const app=await createApi(store);await app.listen(Number(process.env.PORT??3010),'0.0.0.0');let stopping=false;
   const stop=()=>{if(stopping)return;stopping=true;const timer=setTimeout(()=>process.exit(1),15000);void app.close().then(()=>pool.end()).then(()=>clearTimeout(timer)).catch(()=>process.exit(1));};
   process.once('SIGTERM',stop);process.once('SIGINT',stop);
  }else{
   const worker=new Worker(store,required('CONNECTOR_REMOTE_ORIGIN'),process.env,fetch,process.env.CONNECTOR_ALLOW_HTTP==='true');let stop=false;
   const shutdown=()=>{stop=true;setTimeout(()=>process.exit(1),15000).unref();};process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
   while(!stop){try{await worker.tick();}catch{console.error('CONNECTOR_TICK_UNAVAILABLE');}if(!stop)await new Promise(resolve=>setTimeout(resolve,500));}
   await pool.end();
  }
 }catch(e){await pool.end();throw e;}
}
main().catch(()=>{console.error('CONNECTOR_START_FAILED');process.exitCode=1;});
