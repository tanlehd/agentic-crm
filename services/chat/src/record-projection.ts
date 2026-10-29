import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {ownerFail} from '@agentic-crm/workload-transport';
import {recordSnapshot} from './record-action.js';

export const recordStandardFields=['closed_at','contact_id','opened_at','status'] as const;
const stamp=(value:unknown)=>value===null?null:value instanceof Date?value.toISOString():new Date(String(value).replace(' ','T').replace(/Z?$/,'Z')).toISOString();
export async function recordProjection(c:PoolConnection,tenant:string,id:string){
 const snapshot=await recordSnapshot(c,tenant,id);
 const [[row]]=await c.execute<RowDataPacket[]>('SELECT r.custom_values,v.contact_id,v.status,v.opened_at,v.closed_at FROM crm_record r JOIN conversation v ON v.tenant_id=r.tenant_id AND v.record_id=r.id WHERE r.tenant_id=? AND r.id=?',[tenant,id]);
 if(!row)ownerFail('NOT_FOUND');
 const values=typeof row.custom_values==='string'?JSON.parse(row.custom_values) as Record<string,unknown>:row.custom_values as Record<string,unknown>;
 return {...snapshot,fields:{contact_id:row.contact_id as string,status:row.status as string,opened_at:stamp(row.opened_at),closed_at:stamp(row.closed_at)},values};
}
export const readableValues=(values:Record<string,unknown>,allowed:readonly string[])=>Object.fromEntries(Object.entries(values).filter(([key])=>allowed.includes(key)));
