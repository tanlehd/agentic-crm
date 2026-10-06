import { randomUUID } from 'node:crypto';
import type { Pool,PoolConnection } from 'mysql2/promise';
import { BridgeError,uuid } from './validation.js';
import { providerId,type CapturedEvent } from './messenger.js';
export class MessengerStore {
 constructor(private readonly pool:Pool){}
 private async transaction<T>(fn:(c:PoolConnection)=>Promise<T>):Promise<T>{const c=await this.pool.getConnection();try{await c.beginTransaction();const r=await fn(c);await c.commit();return r;}catch(e){await c.rollback();throw e;}finally{c.release();}}
 async provision(input:{id:string;tenant_id:string;app_id:string;page_id:string}){
  if(!uuid(input.id)||!uuid(input.tenant_id)||!providerId(input.app_id)||!providerId(input.page_id))throw new BridgeError(422,'INVALID_BINDING');
  await this.transaction(async c=>{
   const [rows]=await c.query<any[]>('SELECT * FROM connector_meta_page WHERE id=? OR (app_id=? AND page_id=?) FOR UPDATE',[input.id,input.app_id,input.page_id]);
   if(rows.length){const row=rows[0];if(rows.length!==1||Object.entries(input).some(([k,v])=>row[k]!==v)||row.status!=='active')throw new BridgeError(409,'IMMUTABLE_BINDING');return;}
   await c.execute('INSERT INTO connector_meta_page(id,tenant_id,app_id,page_id) VALUES (?,?,?,?)',[input.id,input.tenant_id,input.app_id,input.page_id]);
  });
 }
 async capture(appId:string,events:CapturedEvent[]):Promise<void>{
  if(!providerId(appId)||!events.length||events.length>100)throw new BridgeError(400,'INVALID_WEBHOOK');
  await this.transaction(async c=>{
   const bindings=new Map<string,{id:string;tenant_id:string}>();
   for(const page of [...new Set(events.map(e=>e.page_id))].sort()){
    const [rows]=await c.query<any[]>("SELECT id,tenant_id,status FROM connector_meta_page WHERE app_id=? AND page_id=? FOR SHARE",[appId,page]);
    if(rows.length!==1||rows[0].status!=='active')throw new BridgeError(403,'WEBHOOK_FORBIDDEN');bindings.set(page,rows[0]);
   }
   // Shared binding locks block disable/rebind; sorted unique inserts serialize
   // replay without granting UPDATE on Page mappings to the runtime.
   for(const event of [...events].sort((a,b)=>a.page_id.localeCompare(b.page_id)||a.event_key.localeCompare(b.event_key))){
    const binding=bindings.get(event.page_id)!,id=randomUUID();
    await c.execute('INSERT INTO connector_meta_event(id,tenant_id,binding_id,event_key,digest,normalized,kind,stream,status) VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id',[id,binding.tenant_id,binding.id,event.event_key,event.digest,JSON.stringify(event.normalized),event.kind,event.stream,event.status]);
    const [rows]=await c.query<any[]>('SELECT id,digest FROM connector_meta_event WHERE tenant_id=? AND binding_id=? AND event_key=? FOR UPDATE',[binding.tenant_id,binding.id,event.event_key]);
    if(rows[0].digest!==event.digest)throw new BridgeError(409,'WEBHOOK_REPLAY_CONFLICT');
    if(rows[0].id!==id)continue;
    await c.execute("INSERT INTO connector_meta_audit(id,tenant_id,binding_id,event_id,action) VALUES (?,?,?,?,'received')",[randomUUID(),binding.tenant_id,binding.id,id]);
   }
  });
 }
}
