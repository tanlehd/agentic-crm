import {readFile} from 'node:fs/promises';
import {ownerCounter,type ServiceName} from '@agentic-crm/workload-transport';
import {businessTenant,type ChatDatabaseConfig} from './database.js';
import type {ChatCompositionConfig,CursorKeys} from './composition.js';
import {chatWorkerJobs} from './composition.js';

export type ChatRuntimeConfig=ChatCompositionConfig&{database:ChatDatabaseConfig;host:string;port:number;healthHost:string;healthPort:number;intervalMs:number};
const required=(env:NodeJS.ProcessEnv,k:string)=>{const v=env[k];if(!v)throw new Error('CHAT_CONFIG_REQUIRED:'+k);return v;};
function integer(value:string,min:number,max:number){if(!/^\d+$/.test(value))throw new Error('CHAT_CONFIG_INTEGER');const n=Number(value);if(!Number.isSafeInteger(n)||n<min||n>max)throw new Error('CHAT_CONFIG_INTEGER');return n;}
const owners=['identity','crm','connector','routing','sales','workflow','reporting','ai-runtime'] as const;
export function runtimeUrls(raw:unknown,protocol:string):Partial<Record<ServiceName,URL>>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('CHAT_OWNER_URLS_REQUIRED');
 const result:Partial<Record<ServiceName,URL>>={};
 for(const [key,value]of Object.entries(raw)){
  if(!(owners as readonly string[]).includes(key)||typeof value!=='string')throw new Error('CHAT_OWNER_URL_INVALID');
  const u=new URL(value);if(u.protocol!==protocol||u.pathname!=='/'||u.username||u.password||u.search||u.hash)throw new Error('CHAT_OWNER_URL_INVALID');result[key as ServiceName]=u;
 }return result;
}
export function retainedCursorKeys(raw:unknown):CursorKeys{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('CHAT_CURSOR_KEYS_REQUIRED');
 const result={} as CursorKeys;
 for(const key of ['history','catalog','workspace','activity','external'] as const){const v=(raw as Record<string,unknown>)[key];if(typeof v!=='string'||!/^(?:[a-f0-9]{2}){32,256}$/.test(v))throw new Error('CHAT_RETAINED_CURSOR_KEY_REQUIRED');result[key]=Buffer.from(v,'hex');}
 if(Object.keys(raw).length!==5)throw new Error('CHAT_CURSOR_KEYS_INVALID');return result;
}
export async function runtimeConfig(env:NodeJS.ProcessEnv=process.env):Promise<ChatRuntimeConfig>{
 const protocol=env.WORKLOAD_TRANSPORT==='http-local'?'http:':'https:';
 const raw=JSON.parse(await readFile(required(env,'CHAT_ENDPOINTS_FILE'),'utf8')) as Record<string,unknown>;
 if(Object.keys(raw).sort().join(',')!=='dispatch,owners,receivers')throw new Error('CHAT_ENDPOINTS_INVALID');
 const urls=runtimeUrls(raw.owners,protocol),dispatch=runtimeUrls(raw.dispatch,protocol),receivers=runtimeUrls(raw.receivers,protocol);
 if(!urls.identity||!urls.crm||!urls.connector||!urls.routing||!dispatch.identity||!dispatch.connector||Object.keys(dispatch).length!==2)throw new Error('CHAT_REQUIRED_OWNER_MISSING');
 const tenants=required(env,'CHAT_TENANTS').split(',').map(businessTenant);if(new Set(tenants).size!==tenants.length||tenants.length>100)throw new Error('CHAT_TENANTS_INVALID');
 const jobs=env.CHAT_WORKER_JOBS?.split(',')??[...chatWorkerJobs];if(!jobs.length||new Set(jobs).size!==jobs.length||jobs.some(job=>!(chatWorkerJobs as readonly string[]).includes(job)))throw new Error('CHAT_WORKER_JOBS_INVALID');
 return {epoch:ownerCounter(required(env,'CHAT_WRITER_EPOCH'),true),tenants,owners:urls,dispatch:{identity:dispatch.identity,connector:dispatch.connector},receivers,workerJobs:jobs as typeof chatWorkerJobs[number][],
  cursors:retainedCursorKeys(JSON.parse(await readFile(required(env,'CHAT_CURSOR_KEYS_FILE'),'utf8'))),
  database:{host:required(env,'CHAT_DB_HOST'),port:integer(required(env,'CHAT_DB_PORT'),1,65535),database:required(env,'CHAT_DB_NAME'),user:required(env,'CHAT_DB_USER'),password:required(env,'CHAT_DB_PASSWORD')},
  host:env.CHAT_HOST??'127.0.0.1',port:integer(required(env,'CHAT_PORT'),1,65535),healthHost:env.CHAT_HEALTH_HOST??'127.0.0.1',healthPort:integer(required(env,'CHAT_HEALTH_PORT'),1,65535),intervalMs:integer(env.CHAT_TICK_MS??'1000',100,30000)};
}
