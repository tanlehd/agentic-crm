import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomBytes,createHash} from 'node:crypto';
import {resolve} from 'node:path';
const dir='.local/chat-main',base=parseEnv(await readFile('.env','utf8')),local=parseEnv(await readFile('.local/connector-local.env','utf8')),env=parseEnv(await readFile('.local/human-outbound/connector.env','utf8')),pins=parseEnv(await readFile('.local/human-outbound/images.env','utf8'));
if(base.APP_ENV!=='development'||base.MYSQL_DATABASE!=='agentic_crm'||env.CONNECTOR_DB_NAME!=='connector_local')throw Error('LOCAL_MAIN_REQUIRED');
const f=a=>{const h=createHash('sha256').update('agentic-crm:identity-fixture:v1:'+a).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const serialize=e=>Object.entries(e).map(([k,v])=>k+'='+JSON.stringify(v)).join('\n')+'\n';
let token;try{token=await readFile(dir+'/beta-connector-token','utf8');}catch(e){if(e.code!=='ENOENT')throw e;token=randomBytes(32).toString('hex');await writeFile(dir+'/beta-connector-token',token,{flag:'wx',mode:0o600});}
const provision={...env,CONNECTOR_MIGRATION_USER:'root',CONNECTOR_MIGRATION_PASSWORD:local.CONNECTOR_MIGRATION_PASSWORD,CONNECTOR_CONNECTION_ID:f('beta:mock_connection'),CONNECTOR_TENANT_ID:f('clinic_beta'),CONNECTOR_INGRESS_TOKEN:token,CONNECTOR_REMOTE_CONNECTION_ID:f('beta:mock_connection'),CONNECTOR_REMOTE_TOKEN_ENV:'CONNECTOR_REMOTE_TOKEN_BETA_MAIN'};
await writeFile(dir+'/connector-provision.env',serialize(provision),{mode:0o600});
await writeFile(dir+'/compose.connector-provision.json',JSON.stringify({name:'agentic-crm-chat-main-operator',services:{provision:{image:pins.OUTBOUND_CONNECTOR_IMAGE,command:['node','dist/main.js','provision'],env_file:[resolve(dir+'/connector-provision.env').replaceAll('\\','/')],networks:['database']}},networks:{database:{external:true,name:'agentic-crm-connector-local_database'}}},null,2));
env.WORKLOAD_CHAT_URL='http://chat-api:3020/';env.WORKLOAD_IDENTITY_URL='http://dispatch:3012/';env.WORKLOAD_REGISTRY_URL='http://dispatch:3012/internal/v1/workloads/admit';
await writeFile('.local/human-outbound/connector.env',serialize(env),{mode:0o600});
await writeFile(dir+'/compose.connector-network.json',JSON.stringify({services:{connector:{networks:{default:{},'connector-database':{},main:{aliases:['transport-connector']}}}},networks:{main:{external:true,name:'agentic-crm-chat-main_default'}}},null,2));
const endpoints=JSON.parse(await readFile(dir+'/material/endpoints.json','utf8'));endpoints.dispatch.connector='http://transport-connector:3014/';await writeFile(dir+'/material/endpoints.json',JSON.stringify(endpoints),{mode:0o600});console.log('Prepared existing synthetic Beta outbound binding and direct Connector network');
