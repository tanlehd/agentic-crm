import {randomUUID} from 'node:crypto';
import type {TransactionScope} from '../../kernel/tenancy/unit-of-work.js';
// Caller holds the existing CRM record lock; ledger and domain write share its transaction.
export async function recordStage(s:TransactionScope,kind:'lead'|'deal',subject:string,from:string|null,to:string,actor:string,correlation:string,actorKind:'human'|'service'='human'){
 if(from===to)return;
 const tenant=s.context.tenantId,[last]=await s.query('SELECT sequence,occurred_at FROM sales_stage_event WHERE tenant_id=? AND object_kind=? AND subject_id=? ORDER BY sequence DESC LIMIT 1',[tenant,kind,subject]);
 const sequence=String(BigInt(last?.sequence??0)+1n),id=randomUUID();
 await s.query('INSERT INTO sales_stage_event(tenant_id,id,object_kind,subject_id,sequence,from_stage,to_stage,actor_kind,actor_id,correlation_id,occurred_at,recorded_at) VALUES (?,?,?,?,?,?,?,?,?,?,GREATEST(UTC_TIMESTAMP(3),COALESCE(?,UTC_TIMESTAMP(3))),UTC_TIMESTAMP(3))',[tenant,id,kind,subject,sequence,from,to,actorKind,actor,correlation,last?.occurred_at??null]);
 await s.query("INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) SELECT id,tenant_id,'sales.stage_changed',1,'sales_stage',subject_id,sequence,JSON_OBJECT('object_kind',object_kind,'subject_id',subject_id,'sequence',CAST(sequence AS CHAR),'from_stage',from_stage,'to_stage',to_stage),correlation_id,actor_kind,actor_id,occurred_at,recorded_at,'pending' FROM sales_stage_event WHERE tenant_id=? AND id=?",[tenant,id]);
}
export async function salesStageFacts(s:TransactionScope){
 const t=s.context.tenantId;
 return {leads:await s.query('SELECT record_id,status FROM `lead` WHERE tenant_id=? LIMIT 10001',[t]),deals:await s.query('SELECT record_id,stage FROM deal WHERE tenant_id=? LIMIT 10001',[t]),events:await s.query('SELECT id,object_kind,subject_id,sequence,from_stage,to_stage,occurred_at,recorded_at FROM sales_stage_event WHERE tenant_id=? LIMIT 10001',[t])};
}
