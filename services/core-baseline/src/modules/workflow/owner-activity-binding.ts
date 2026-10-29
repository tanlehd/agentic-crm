import type {Pool,RowDataPacket} from 'mysql2/promise';
import {ownerFail,ownerRoute,type WorkloadRoute} from '@agentic-crm/workload-transport';

export function workflowActivityBindingRoutes(pool:Pool):Record<string,WorkloadRoute>{
 return {'/internal/v1/owners/workflow/activity-notification-binding':ownerRoute('workflow','activity-notification-binding',['chat'],async r=>{
  const {source_id,conversation_id,minimum_revision}=r.payload as {source_id:string;conversation_id:string;minimum_revision:string};
  const [[row]]=await pool.execute<RowDataPacket[]>('SELECT version_id,context,activity_revision FROM workflow_run WHERE tenant_id=? AND id=?',[r.tenant_id,source_id]);
  const context=row?(typeof row.context==='string'?JSON.parse(row.context):row.context):null,t=context?.trigger;
  if(!row||t?.aggregate_id!==conversation_id||BigInt(row.activity_revision)<BigInt(minimum_revision as string))ownerFail('REFERENCE_INVALID');
  return {conversation_id,source_id,revision:String(row.activity_revision),definition_version_id:row.version_id,projection:{contact_id:t.contact_id,connection_id:t.connection_id}};
 })};
}
