import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { UnitOfWork,type TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { activitySupported,type ActivityActor } from '../../kernel/reliability/activity-notification.js';
import { CrmActivityPort } from '../crm/activity-port.js';
export { activitySupported };
export async function activityFeature(s:TransactionScope,key:'snooze_v1'|'activity_v1'){
  if(!await activitySupported(s))return false;const [r]=await s.query('SELECT state FROM chat_workspace_rollout WHERE tenant_id=? AND feature_key=?',[s.context.tenantId,key]);return !r||r.state==='ready';
}
export type ActivityInput={service:string;sourceKind:string;sourceId:string;revision:string;kind:string;payload:Record<string,unknown>;occurred?:Date|string;actor?:ActivityActor|null};
// All Chat writers acquire the Conversation registry fence before this counter.
export async function appendActivity(s:TransactionScope,conversation:string,input:ActivityInput){
  if(!await activitySupported(s))return;
  const tenant=s.context.tenantId;
  await s.query('INSERT IGNORE INTO conversation_activity_counter(tenant_id,conversation_id) VALUES (?,?)',[tenant,conversation]);
  await s.query('SELECT last_seq FROM conversation_activity_counter WHERE tenant_id=? AND conversation_id=? FOR UPDATE',[tenant,conversation]);
  if((await s.query('SELECT id FROM conversation_activity WHERE tenant_id=? AND conversation_id=? AND source_service=? AND source_kind=? AND source_id=? AND source_revision=?',[tenant,conversation,input.service,input.sourceKind,input.sourceId,input.revision]))[0])return;
  await s.query('UPDATE conversation_activity_counter SET last_seq=last_seq+1 WHERE tenant_id=? AND conversation_id=?',[tenant,conversation]);
  await s.query('INSERT INTO conversation_activity(tenant_id,id,conversation_id,activity_seq,source_service,source_kind,source_id,source_revision,kind,actor_kind,actor_id,occurred_at,recorded_at,payload) SELECT tenant_id,?,conversation_id,last_seq,?,?,?,?,?,?,?,COALESCE(?,UTC_TIMESTAMP(6)),UTC_TIMESTAMP(6),? FROM conversation_activity_counter WHERE tenant_id=? AND conversation_id=?',[randomUUID(),input.service,input.sourceKind,input.sourceId,input.revision,input.kind,input.actor?.kind??null,input.actor?.id??null,input.occurred?new Date(input.occurred):null,JSON.stringify(input.payload),tenant,conversation]);
}
export async function messageActivity(s:TransactionScope,id:string,message:string){if(!await activitySupported(s))return;const [m]=await s.query('SELECT occurred_at FROM message WHERE tenant_id=? AND id=?',[s.context.tenantId,message]);await appendActivity(s,id,{service:'chat',sourceKind:'message',sourceId:message,revision:'1',kind:'message',payload:{message_id:message},occurred:m.occurred_at});}
export async function lifecycleActivity(s:TransactionScope,id:string,from:string,to:string,actor?:ActivityActor){
  if(from===to||!await activitySupported(s))return;const [r]=await s.query('SELECT version FROM crm_record WHERE tenant_id=? AND id=?',[s.context.tenantId,id]);
  await appendActivity(s,id,{service:'chat',sourceKind:'lifecycle',sourceId:id,revision:String(r.version),kind:'lifecycle',payload:{from_status:from,to_status:to},actor});
}
export async function prepareActivity(s:TransactionScope,id:string){
  if(!await activitySupported(s))return;
  const tenant=s.context.tenantId,[counter]=await s.query('SELECT backfilled FROM conversation_activity_counter WHERE tenant_id=? AND conversation_id=?',[tenant,id]);if(counter?.backfilled)return;
  const crm=new CrmActivityPort();
  for(const kind of ['message','note','assignment']){let after='',time='';for(;;){
    const rows=kind==='message'?await s.query(`SELECT id,occurred_at,DATE_FORMAT(received_at,'%Y-%m-%d %H:%i:%s.%f') position_time FROM message WHERE tenant_id=? AND conversation_id=? ${after?'AND (received_at>? OR (received_at=? AND id>?))':''} ORDER BY received_at,id LIMIT 200`,[tenant,id,...(after?[time,time,after]:[])]):kind==='note'?await crm.history(s,id,after):await crm.ownership(s,id,after);
    for(const r of rows){await appendActivity(s,id,kind==='message'?{service:'chat',sourceKind:'message',sourceId:r.id,revision:'1',kind,payload:{message_id:r.id},occurred:r.occurred_at}:kind==='note'?{service:'crm',sourceKind:'note',sourceId:r.id,revision:String(r.version),kind,payload:{activity_id:r.id},occurred:r.occurred_at}:{service:'chat',sourceKind:'assignment',sourceId:id,revision:String(r.owner_revision),kind,payload:{from_principal_id:r.from_owner_id,to_principal_id:r.to_owner_id,owner_revision:String(r.owner_revision),reason:r.reason},occurred:r.created_at,actor:{kind:r.actor_kind,id:r.actor_id}});}
    if(rows.length<200)break;after=rows.at(-1).id;time=rows.at(-1).position_time??'';
  }}
  await s.query('INSERT INTO conversation_activity_counter(tenant_id,conversation_id,backfilled) VALUES (?,?,TRUE) ON DUPLICATE KEY UPDATE backfilled=TRUE',[tenant,id]);
}
export async function backfillActivity(source:DataSource){const uow=new UnitOfWork(source);let done=0;for(;;){
  const rows=await source.query('SELECT c.tenant_id,c.record_id FROM conversation c LEFT JOIN conversation_activity_counter a ON a.tenant_id=c.tenant_id AND a.conversation_id=c.record_id WHERE a.backfilled IS NULL OR a.backfilled=FALSE ORDER BY c.tenant_id,c.record_id LIMIT 100');if(!rows.length)return done;
  for(const c of rows)await uow.run({tenantId:c.tenant_id},async s=>{await s.query('SELECT id FROM tenant WHERE id=? FOR SHARE',[c.tenant_id]);await s.query('SELECT id FROM crm_record WHERE tenant_id=? AND id=? FOR UPDATE',[c.tenant_id,c.record_id]);await prepareActivity(s,c.record_id);done++;});
}}
