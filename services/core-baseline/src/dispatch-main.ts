// Private owning endpoints, opt-in separate listeners within the baseline deploy group.
import {readFile} from 'node:fs/promises';
import {workloadMaterial,required} from '@agentic-crm/workload-transport';
import {databaseSource} from './kernel/database/data-source.js';
import {validateJournal} from './kernel/database/migration-runner.js';
import {migrations} from './kernel/database/migrations.js';
import {identityDispatchServer} from './dispatch-server.js';

async function main(){
  const role=process.argv[2];if(role!=='identity')throw new Error('INVALID_ROLE');
  const env=process.env,material=await workloadMaterial(role),source=databaseSource();
  const port=Number(required(env,'WORKLOAD_PORT'));if(!Number.isInteger(port)||port<1||port>65535)throw new Error('INVALID_PORT');
  let auxiliary:ReturnType<typeof databaseSource>|undefined;
  try {
    await source.initialize();validateJournal(await source.query('SELECT * FROM schema_migration ORDER BY version'),migrations,true);
    auxiliary=databaseSource(false,{user:required(env,'WORKLOAD_REGISTRY_USER'),password:required(env,'WORKLOAD_REGISTRY_PASSWORD')});await auxiliary.initialize();
    const server=identityDispatchServer(source,auxiliary,material,{key:await readFile(required(env,'WORKLOAD_AUTHORITY_PRIVATE_KEY_FILE')),keyId:required(env,'WORKLOAD_AUTHORITY_KEY_ID'),chat:new URL(required(env,'WORKLOAD_CHAT_URL'))});
    await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(port,env.WORKLOAD_HOST??'127.0.0.1',resolve);});
    let stopping=false;
    const stop=()=>{if(stopping)return;stopping=true;const timeout=setTimeout(()=>process.exit(1),10000);timeout.unref();server.close(()=>{void Promise.all([source.destroy(),auxiliary?.destroy()]).then(()=>clearTimeout(timeout)).catch(()=>process.exit(1));});};
    process.once('SIGTERM',stop);process.once('SIGINT',stop);
  }catch(error){if(source.isInitialized)await source.destroy();if(auxiliary?.isInitialized)await auxiliary.destroy();throw error;}
}
main().catch(()=>{console.error('WORKLOAD_RUNTIME_START_FAILED');process.exitCode=1;});
