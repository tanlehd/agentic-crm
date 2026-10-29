// Materialize private local rollout inputs only. Does not provision/start anything.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {randomBytes,createHmac} from 'node:crypto';
import {resolve} from 'node:path';
import {parseEnv} from 'node:util';
import {loadMainPreflight} from './lib/chat-main-preflight.mjs';
import {seedUuid} from './lib/chat-main-owner-plan.mjs';
import {mainEvidenceDirectory} from './lib/chat-main-evidence.mjs';
const dir='.local/chat-main',snapshot=await loadMainPreflight(),env=parseEnv(await readFile('.local/services/api.env','utf8'));
// This is initial staging, never a live reconfiguration or recovery command.
try{await readFile(dir+'/chat.env');throw Error('MAIN_CONFIG_ALREADY_STAGED_USE_RECOVERY_RUNBOOK');}catch(e){if(e.code!=='ENOENT')throw e;}
if(env.APP_ENV!=='development'||env.MYSQL_DATABASE!=='agentic_crm'||env.MYSQL_HOST!=='127.0.0.1'||env.MYSQL_PORT!=='13306')throw Error('LOCAL_MAIN_CONFIG_REQUIRED');
const backend=process.argv[2],chat=process.argv[3];if(![backend,chat].every(s=>/^sha256:[a-f0-9]{64}$/.test(s??'')))throw Error('IMMUTABLE_IMAGES_REQUIRED');
await mkdir(dir+'/material',{recursive:true});
const roles=['api','worker','auth','identity','crm','connector','routing','sales','workflow','dispatch','registry','marketing'];
let credentials;
try{credentials=JSON.parse(await readFile(dir+'/credentials.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;credentials={environment:'local-main',database:'agentic_crm',users:Object.fromEntries(roles.map(r=>[r,{user:'main_'+r,password:randomBytes(32).toString('hex')}])),chat:Object.fromEntries(['api','worker','import_operator'].map(r=>[r,{user:'chat_main_'+r,password:randomBytes(32).toString('hex')}]))};await writeFile(dir+'/credentials.json',JSON.stringify(credentials),{flag:'wx',mode:0o600});}
if(credentials.environment!=='local-main'||credentials.database!=='agentic_crm')throw Error('MAIN_CREDENTIAL_SCOPE');
for(const [role,c]of Object.entries(credentials.users))if(!roles.includes(role)||c.user!=='main_'+role||!/^[a-f0-9]{64}$/.test(c.password))throw Error('MAIN_CREDENTIAL_FORMAT');
const originalKeys=JSON.parse(await readFile('.local/human-outbound/http-keys.json','utf8'));let keys;
try{keys=JSON.parse(await readFile(dir+'/http-keys.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;keys={...originalKeys,...Object.fromEntries(['bff','crm','routing','sales','workflow'].map(r=>[r,randomBytes(32).toString('hex')]))};await writeFile(dir+'/http-keys.json',JSON.stringify(keys),{flag:'wx',mode:0o600});}
for(const k of ['identity','chat','connector'])if(keys[k]!==originalKeys[k])throw Error('RETAINED_TRANSPORT_KEY_DRIFT');
await copyFile('.local/human-outbound/authority.pub',dir+'/material/authority.pub');await copyFile('.local/human-outbound/authority.key',dir+'/authority.key');
await copyFile(dir+'/http-keys.json',dir+'/material/http-keys.json');
const identityEnv=parseEnv(await readFile('.local/human-outbound/identity.env','utf8'));
const host='http://host.docker.internal:',ports={identity:13111,crm:13112,connector:13113,routing:13114,sales:13115,workflow:13116};
const owners=Object.fromEntries(Object.entries(ports).map(([r,p])=>[r,host+p+'/']));
const ownerConfig={tenants:snapshot.manifest.tenants,chat:host+'13020/',identity:owners.identity,routing:owners.routing,conversationObjects:{},projectionObjects:{},routingActors:{}};
const actorSeeds=[];
for(const t of snapshot.manifest.tenants){
 const objects=Object.fromEntries(snapshot.rows.object_type.filter(o=>o.tenant_id===t&&o.kind==='standard'&&!o.archived_at).map(o=>[o.key,o.id]));
 if(!['conversation','contact','activity','conversation_session','conversation_need','lead','deal'].every(k=>objects[k]))throw Error('MAIN_METADATA_INCOMPLETE');
 ownerConfig.conversationObjects[t]=objects.conversation;ownerConfig.projectionObjects[t]=Object.fromEntries(['contact','activity','conversation_session','conversation_need','lead','deal'].map(k=>[k,objects[k]]));
 const existing=snapshot.rows.service_actor.filter(a=>a.tenant_id===t&&a.key==='human_routing_dispatch');if(existing.length>1||existing[0]&&existing[0].active!=='1')throw Error('ROUTING_ACTOR_INVALID');
 ownerConfig.routingActors[t]=existing[0]?.id??seedUuid(t,'main-routing-actor-v1');
 if(!existing.length)actorSeeds.push({tenant_id:t,id:ownerConfig.routingActors[t],role_id:seedUuid(t,'main-routing-role-v1')});
}
await writeFile(dir+'/material/owners.json',JSON.stringify(ownerConfig),{mode:0o600});await writeFile(dir+'/actor-seeds.json',JSON.stringify(actorSeeds),{mode:0o600});
const cursors=Object.fromEntries(Object.entries({history:'conversation-pagination-v1',catalog:'catalog-pagination-v1',workspace:'workspace-pagination-v1',activity:'activity-pagination-v1',external:'external-api-cursor-v1'}).map(([key,label])=>[key,createHmac('sha256',env.SESSION_ENCRYPTION_KEY).update(label).digest('hex')]));
await writeFile(dir+'/material/cursor-keys.json',JSON.stringify(cursors),{mode:0o600});await writeFile(dir+'/material/endpoints.json',JSON.stringify({owners,dispatch:{identity:host+'3012/',connector:host+'3014/'},receivers:{}}),{mode:0o600});
const workload={APP_ENV:'development',WORKLOAD_TRANSPORT:'http-local',WORKLOAD_HTTP_KEYS_FILE:'/run/chat/http-keys.json',WORKLOAD_AUTHORITY_PUBLIC_KEY_FILE:'/run/chat/authority.pub',WORKLOAD_AUTHORITY_KEY_ID:identityEnv.WORKLOAD_AUTHORITY_KEY_ID,WORKLOAD_REGISTRY_URL:host+'3012/internal/v1/workloads/admit',WORKLOAD_HOST:'0.0.0.0',BASELINE_OWNER_CONFIG_FILE:'/run/chat/owners.json',CHAT_OWNER_URL:host+'13020/',IDENTITY_OWNER_URL:owners.identity,ROUTING_OWNER_URL:owners.routing,CHANNELS_OWNER_URL:owners.connector};
const envText=v=>Object.entries(v).map(([k,val])=>{if(typeof val!=='string'||/[\r\n]/.test(val))throw Error('ENV_INVALID');return k+'='+JSON.stringify(val);}).join('\n')+'\n';
const database={MYSQL_HOST:'host.docker.internal',MYSQL_PORT:'13306',MYSQL_DATABASE:'agentic_crm'};
const credential=r=>({MYSQL_USER:credentials.users[r].user,MYSQL_PASSWORD:credentials.users[r].password});
const credentialPrefix=(r,p)=>({[p+'_USER']:credentials.users[r].user,[p+'_PASSWORD']:credentials.users[r].password});
const files=[];
async function save(name,value){await writeFile(dir+'/'+name+'.env',envText(value),{mode:0o600});files.push(name+'.env');}
for(const role of Object.keys(ports))await save(role,{...workload,...database,...credential(role),WORKLOAD_SERVICE:role,WORKLOAD_PORT:String(ports[role])});
const publicEnv={...env,...workload,...database,...credential('api'),...credentialPrefix('auth','MYSQL_AUTH'),...credentialPrefix('dispatch','IDENTITY_DISPATCH'),...credentialPrefix('identity','IDENTITY_OWNER'),...credentialPrefix('routing','ROUTING_OWNER'),...credentialPrefix('connector','CHANNELS_READ'),...credentialPrefix('marketing','MYSQL_MARKETING'),REDIS_HOST:'host.docker.internal',REPORTING_SERVICE_URL:env.REPORTING_SERVICE_URL?.replace('127.0.0.1','host.docker.internal').replace('localhost','host.docker.internal')};
await save('api',publicEnv);
const workerEnv=parseEnv(await readFile('.local/services/worker.env','utf8'));
await save('worker',{...workerEnv,...workload,...database,...credential('worker'),...credentialPrefix('routing','ROUTING_OWNER'),REDIS_HOST:'host.docker.internal'});
await save('dispatch',{...workload,...database,...credential('dispatch'),...credentialPrefix('registry','WORKLOAD_REGISTRY'),WORKLOAD_SERVICE:'identity',WORKLOAD_PORT:'3012',WORKLOAD_CHAT_URL:host+'13020/',WORKLOAD_AUTHORITY_PRIVATE_KEY_FILE:'/run/authority.key'});
await save('chat',{...workload,CHAT_DB_HOST:'host.docker.internal',CHAT_DB_PORT:'13306',CHAT_DB_NAME:'crm_chat',CHAT_TENANTS:snapshot.manifest.tenants.join(','),CHAT_WRITER_EPOCH:'1',CHAT_ENDPOINTS_FILE:'/run/chat/endpoints.json',CHAT_CURSOR_KEYS_FILE:'/run/chat/cursor-keys.json',CHAT_TICK_MS:'1000'});
const mount=resolve(dir+'/material').replaceAll('\\','/')+':/run/chat:ro';
const common={image:backend,init:true,read_only:true,tmpfs:['/tmp:size=16m,mode=1777'],cap_drop:['ALL'],security_opt:['no-new-privileges:true'],pids_limit:128,mem_limit:'512m',restart:'no',stop_grace_period:'45s',extra_hosts:['host.docker.internal:host-gateway'],volumes:[mount],logging:{driver:'json-file',options:{'max-size':'10m','max-file':'3'}}};
const services={};
// Public API retains its host process for the existing Reporting loopback contract.
for(const role of [...Object.keys(ports),'worker','dispatch']){
 const port=ports[role]??{api:3001,worker:3002,dispatch:3012}[role];
 const command=role==='dispatch'?['node','dist/dispatch-main.js','identity']:['api','worker'].includes(role)?['node','dist/'+(role==='api'?'main':'worker')+'.js']:['node','dist/owner-main.js',role];
 services[role]={...common,command,env_file:[resolve(dir+'/'+role+'.env').replaceAll('\\','/')],ports:[`127.0.0.1:${port}:${port}`]};
 if(role==='dispatch')services[role].volumes=[mount,resolve(dir+'/authority.key').replaceAll('\\','/')+':/run/authority.key:ro'];
}
await writeFile(dir+'/compose.baseline.json',JSON.stringify({name:'agentic-crm-chat-main',services},null,2));
await mkdir('.local/chat',{recursive:true});await writeFile('.local/chat/compose.env',envText({CHAT_IMAGE:chat,CHAT_ENV_FILE:resolve(dir+'/chat.env').replaceAll('\\','/'),CHAT_CONFIG_DIR:resolve(dir+'/material').replaceAll('\\','/'),CHAT_API_DB_USER:credentials.chat.api.user,CHAT_API_DB_PASSWORD:credentials.chat.api.password,CHAT_WORKER_DB_USER:credentials.chat.worker.user,CHAT_WORKER_DB_PASSWORD:credentials.chat.worker.password}),{mode:0o600});
const connector=parseEnv(await readFile('.local/human-outbound/connector.env','utf8'));
await save('connector-dispatch',{...connector,WORKLOAD_CHAT_URL:host+'13020/',WORKLOAD_IDENTITY_URL:host+'3012/',WORKLOAD_REGISTRY_URL:workload.WORKLOAD_REGISTRY_URL});
await writeFile(dir+'/images.json',JSON.stringify({backend,chat}),{mode:0o600});
const report={status:'PREPARED_NOT_ACTIVATED',backend,chat,tenants:ownerConfig.tenants.length,baselineUnits:Object.keys(services),newRoutingActors:actorSeeds.length,cursorKeys:'derived-from-original-api-session-key-and-verified-legacy-labels',receivers:'none-unaccepted-subscribers-retain-backlog',envFiles:files};
await writeFile((await mainEvidenceDirectory())+'/runtime-config.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
