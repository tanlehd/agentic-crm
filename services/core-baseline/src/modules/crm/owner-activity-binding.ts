import type {Pool,RowDataPacket} from 'mysql2/promise';
import {ownerFail,ownerRoute,type WorkloadRoute} from '@agentic-crm/workload-transport';

export function crmActivityBindingRoutes(pool:Pool):Record<string,WorkloadRoute>{
 return {'/internal/v1/owners/crm/activity-notification-binding':ownerRoute('crm','activity-notification-binding',['chat'],async r=>{
  const {source_id,conversation_id,minimum_revision}=r.payload as {source_id:string;conversation_id:string;minimum_revision:string};
  const [[row]]=await pool.execute<RowDataPacket[]>("SELECT a.related_record_id conversation_id,r.version FROM activity a JOIN crm_record r ON r.tenant_id=a.tenant_id AND r.id=a.record_id JOIN object_type o ON o.tenant_id=r.tenant_id AND o.id=r.object_type_id AND o.`key`='activity' WHERE a.tenant_id=? AND a.record_id=? AND a.kind='note'",[r.tenant_id,source_id]);
  if(!row||row.conversation_id!==conversation_id||BigInt(row.version)<BigInt(minimum_revision as string))ownerFail('REFERENCE_INVALID');
  return {conversation_id,source_id,revision:String(row.version),definition_version_id:null,projection:null};
 })};
}
