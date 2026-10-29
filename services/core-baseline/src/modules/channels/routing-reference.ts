import type {Pool,RowDataPacket} from 'mysql2/promise';
import {ownerFail} from '@agentic-crm/workload-transport';

/** Channels-owned baseline application port. Routing never receives this pool. */
export class RoutingChannelReferences{
 constructor(private readonly pool:Pool){}
 async connection(tenant:string,id:string){
  if(![tenant,id].every(v=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v)))ownerFail('INVALID_REQUEST');
  const [rows]=await this.pool.execute<RowDataPacket[]>("SELECT id FROM channel_connection WHERE tenant_id=? AND id=? AND status='active'",[tenant,id]);
  if(rows.length!==1)ownerFail('REFERENCE_INVALID');
 }
}
