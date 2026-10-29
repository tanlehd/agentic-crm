import { writeChatOutbox } from './event-store.js';
import {randomUUID} from 'node:crypto';
import type {Pool} from 'mysql2/promise';
import {ownerCanonical} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';

export const canonical=ownerCanonical;
export class CommandError extends Error {
 constructor(readonly status:number,readonly code:string){super(code);}
}
export interface DispatchScope {
 context:{tenantId:string};
 query(sql:string,args?:unknown[]):Promise<any>;
}
/** Only Chat-owned SQL. Every mutation is serialized with the owning writer epoch. */
export class ChatDispatchStore {
 readonly commands:ChatOwnerCommands;
 constructor(private readonly pool:Pool,epoch:string){this.commands=new ChatOwnerCommands(pool,epoch);}
 async query(sql:string,args:unknown[]=[]):Promise<any>{return (await this.pool.query(sql,args))[0];}
 run<T>(context:{tenantId:string},work:(scope:DispatchScope)=>Promise<T>):Promise<T>{
  return this.commands.transaction(context.tenantId,c=>work({context,query:async(sql,args=[])=> (await c.query(sql,args))[0]}));
 }
}
export class DispatchEffects {
 async systemAudit(s:DispatchScope,correlation:string,resource:string,id:string,action:string,fields:string[]){
  await s.query(`INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,correlation_id,occurred_at,created_at)
   VALUES (?,?,'system',?,? ,?,?,'accepted',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,
  [randomUUID(),s.context.tenantId,s.context.tenantId,action,resource,id,canonical(fields),correlation]);
 }
 async conversationEvent(s:DispatchScope,correlation:string,type:string,id:string,version:string,payload:Record<string,unknown>){
  await writeChatOutbox({execute:async(sql,args)=>[await s.query(sql,args)]}, `INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status)
   VALUES (?,?,?,1,'conversation',?,?,?,?,'system',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')`,
  [randomUUID(),s.context.tenantId,type,id,version,canonical(payload),correlation,s.context.tenantId]);
 }
}
/** Own schema coverage, without baseline migration-number feature detection. */
export async function workspaceSentPrepared(s:DispatchScope,id:string,message:string){
 const tenant=s.context.tenantId;
 const [workspace]=await s.query('SELECT conversation_id FROM conversation_workspace WHERE tenant_id=? AND conversation_id=?',[tenant,id]);
 const [m]=await s.query('SELECT reply_through_inbound_seq FROM message_workspace WHERE tenant_id=? AND message_id=? AND conversation_id=?',[tenant,message,id]);
 if(!workspace||!m)throw new CommandError(503,'DEPENDENCY_UNAVAILABLE');
 if(m.reply_through_inbound_seq===null)return;
 await s.query("UPDATE conversation_workspace SET answered_inbound_seq=GREATEST(answered_inbound_seq,CAST(? AS UNSIGNED)),waiting_metric_state='ready' WHERE tenant_id=? AND conversation_id=?",[m.reply_through_inbound_seq,tenant,id]);
 const [next]=await s.query('SELECT m.received_at FROM message_workspace mw JOIN message m ON m.tenant_id=mw.tenant_id AND m.id=mw.message_id JOIN conversation_workspace w ON w.tenant_id=mw.tenant_id AND w.conversation_id=mw.conversation_id WHERE mw.tenant_id=? AND mw.conversation_id=? AND mw.inbound_seq>w.answered_inbound_seq ORDER BY mw.inbound_seq LIMIT 1',[tenant,id]);
 await s.query("UPDATE conversation_workspace w JOIN conversation c ON c.tenant_id=w.tenant_id AND c.record_id=w.conversation_id SET w.waiting_since=IF(c.status='closed',NULL,?) WHERE w.tenant_id=? AND w.conversation_id=?",[next?.received_at??null,tenant,id]);
}
