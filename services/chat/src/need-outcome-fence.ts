import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {ownerFail} from '@agentic-crm/workload-transport';

/** Caller holds the Conversation lock shared with outcome child acceptance. */
export async function requireNeedOutcomeSettled(c:PoolConnection,tenant:string,conversation:string,need:string){
 const [[pending]]=await c.execute<RowDataPacket[]>(`SELECT p.command_id FROM chat_owner_command p JOIN chat_owner_dependency d ON d.tenant_id=p.tenant_id AND d.command_id=p.command_id
  WHERE p.tenant_id=? AND p.resource_id=? AND p.operation='need-outcome-effect' AND p.state='prepared' AND JSON_UNQUOTE(JSON_EXTRACT(p.binding_json,'$.need.need_id'))=? AND d.slot='sales-outcome' AND d.state IN ('pending','committed') LIMIT 1`,[tenant,conversation,need]);
 if(pending)ownerFail('DEPENDENCY_UNAVAILABLE');
}
