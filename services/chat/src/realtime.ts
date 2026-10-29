import {AsyncLocalStorage} from 'node:async_hooks';
import {Redis} from 'ioredis';
const changes=new AsyncLocalStorage<{changed:boolean}>();
let publish:((tenant:string)=>void)|undefined;
export function markRealtimeChange(){const state=changes.getStore();if(state)state.changed=true;}
export async function realtimeTransaction<T>(tenant:string,work:()=>Promise<T>,notify:((tenant:string)=>void)|undefined=publish):Promise<T>{
 const state={changed:false};
 const result=await changes.run(state,work);
 // work resolves only after COMMIT and release. This hint cannot change its outcome.
 if(state.changed){try{notify?.(tenant);}catch{/* Missed hints reconcile on reconnect/fallback. */}}
 return result;
}
export function startRealtimePublisher(tenants:readonly string[],env:NodeJS.ProcessEnv=process.env){
 if(env.CHAT_REALTIME_ENABLED!=='true')return()=>{};
 const allowed=new Set(tenants),pending=new Map<string,ReturnType<typeof setTimeout>>();
 const redis=new Redis({host:env.CHAT_REALTIME_REDIS_HOST??env.REDIS_HOST??'127.0.0.1',port:Number(env.CHAT_REALTIME_REDIS_PORT??env.REDIS_PORT??6379),password:env.CHAT_REALTIME_REDIS_PASSWORD??env.REDIS_PASSWORD??undefined,db:Number(env.REDIS_DB??0),connectTimeout:2000,commandTimeout:1000,maxRetriesPerRequest:0,enableOfflineQueue:false});
 redis.on('error',()=>{});
 publish=tenant=>{if(!allowed.has(tenant)||pending.has(tenant))return;pending.set(tenant,setTimeout(()=>{pending.delete(tenant);void redis.publish('crm.inbox.changed.v1',JSON.stringify({version:1,tenant_id:tenant})).catch(()=>{});},100));};
 return()=>{publish=undefined;for(const timer of pending.values())clearTimeout(timer);pending.clear();redis.disconnect();};
}
