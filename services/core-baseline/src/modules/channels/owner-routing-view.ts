import type {Pool,RowDataPacket} from 'mysql2/promise';
import type {OwnerCommandRef,OwnerRoutingViewPolicy} from '@agentic-crm/contracts';
import {ownerDigest,ownerFail,ownerRoute,validateOwnerValue,type WorkloadRoute} from '@agentic-crm/workload-transport';

export class NativeRoutingConnections{
 constructor(private readonly pool:Pool,private readonly policy:(tenant:string,command:OwnerCommandRef,admission:string)=>Promise<OwnerRoutingViewPolicy>){}
 async read(tenant:string,command:OwnerCommandRef,admission:string){
  const p=validateOwnerValue<OwnerRoutingViewPolicy>('OwnerRoutingViewPolicy',await this.policy(tenant,command,admission));if(p.selection.mine)ownerFail('FORBIDDEN');
  const [data]=await this.pool.execute<RowDataPacket[]>("SELECT c.id,COALESCE(p.name,c.external_account_id) name,c.provider FROM channel_connection c LEFT JOIN facebook_page p ON p.tenant_id=c.tenant_id AND p.connection_id=c.id WHERE c.tenant_id=? AND c.status='active' AND c.provider='mock_messenger' ORDER BY c.id LIMIT 201",[tenant]);
  if(ownerDigest(await this.policy(tenant,command,admission))!==ownerDigest(p))ownerFail('REVOKED');return {policy_digest:ownerDigest(p),data};
 }
}
export function routingConnectionRoutes(view:NativeRoutingConnections):Record<string,WorkloadRoute>{return {'/internal/v1/owners/connector/routing-view-connections':ownerRoute('connector','routing-view-connections',['routing'],r=>view.read(r.tenant_id,r.payload.command as OwnerCommandRef,r.payload.admission_id as string))};}
