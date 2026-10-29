import type {PoolConnection,RowDataPacket} from 'mysql2/promise';

/** Owning-source outbox only; never reads another service's notification queue. */
export async function activitySourceState(c:PoolConnection,tenant:string,conversation:string,event:string):Promise<'ready'|'delayed'|'unavailable'>{
 const [[row]]=await c.execute<RowDataPacket[]>("SELECT COUNT(*) pending,MAX(status='failed') failed FROM outbox_event WHERE tenant_id=? AND event_type=? AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.conversation_id'))=? AND status<>'dispatched'",[tenant,event,conversation]);
 return Number(row?.failed)?'unavailable':Number(row?.pending)?'delayed':'ready';
}
