import {randomUUID} from 'node:crypto';
import type {TransactionScope} from '../../kernel/tenancy/unit-of-work.js';
export async function emitNeedAssessment(s:TransactionScope,thread:string,session:string,need:string,version:string,correlation:string,actor:{kind:'human'|'system';id:string}){
 const [row]=await s.query('SELECT contact_id,connection_id FROM conversation WHERE tenant_id=? AND record_id=?',[s.context.tenantId,thread]);
 await s.query("INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,'need.assessed',2,'conversation_need',?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')",[randomUUID(),s.context.tenantId,need,version,JSON.stringify({conversation_id:thread,session_id:session,need_id:need,assessment_version:version,contact_id:row.contact_id,connection_id:row.connection_id}),correlation,actor.kind,actor.id]);
}
