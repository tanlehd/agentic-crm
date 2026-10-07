import { randomUUID } from 'node:crypto';
import type { TransactionScope } from '../tenancy/unit-of-work.js';
const support=new WeakMap<TransactionScope,boolean>();
export async function activitySupported(s:TransactionScope){
  if(!support.has(s))support.set(s,!!(await s.query("SELECT version FROM schema_migration WHERE version=22 AND state='applied'"))[0]);
  return support.get(s)!;
}
export type ActivityActor={kind:string;id:string};
// Infrastructure outbox only; producers own validation and source state transitions.
export async function activityNotification(s:TransactionScope,type:string,aggregate:string,id:string,revision:string,data:Record<string,unknown>,actor:ActivityActor,correlation=id){
  await s.query("INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,?,1,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')",[randomUUID(),s.context.tenantId,type,aggregate,id,revision,JSON.stringify(data),correlation,actor.kind,actor.id]);
}
export async function notificationFreshness(s:TransactionScope,conversation:string):Promise<{service:string;state:string}[]>{
  const rows=await s.query("SELECT event_type,payload,occurred_at,status FROM outbox_event WHERE tenant_id=? AND event_type IN ('crm.conversation_note.changed','automation.conversation_activity.v1') AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.conversation_id'))=? AND status<>'dispatched'",[s.context.tenantId,conversation]);
  return rows.map((r:any)=>({service:r.event_type==='crm.conversation_note.changed'?'crm':(typeof r.payload==='string'?JSON.parse(r.payload):r.payload).source_service,state:r.status==='failed'?'unavailable':'delayed'}));
}
