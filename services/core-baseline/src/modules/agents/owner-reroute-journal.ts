import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerCommandBinding} from '@agentic-crm/contracts';
import {ownerBindingDigest,ownerCanonical,ownerDigest,ownerFail,routingRerouteBinding,validateOwnerValue,type OwnerCommandRequest} from '@agentic-crm/workload-transport';

export const rerouteRoute='POST /api/v1/human-routing/reroute';
export const routingJson=<T>(value:T|string):T=>typeof value==='string'?JSON.parse(value) as T:value;
export type RerouteSaved={child:OwnerCommandRequest;body:{work_id:string;queue_id:string;owner_principal_id:string|null};version:string;correlation:string};
export function rerouteJob(tenant:string,row:RowDataPacket){
 const saved=routingJson<RerouteSaved>(row.request_json),child=routingRerouteBinding(saved.child),parent=validateOwnerValue<OwnerCommandBinding>('OwnerCommandBinding',routingJson(row.binding_json));
 if(row.operation!=='reroute'||saved.child.tenant_id!==tenant||parent.tenant_id!==tenant||parent.owner!=='routing'||parent.operation!=='human-routing-reroute'||parent.command_id!==row.command_id||saved.child.command_id!==row.command_id||parent.payload_digest!==ownerDigest(saved)||ownerBindingDigest(parent)!==row.binding_digest||ownerCanonical(parent.actor)!==ownerCanonical(child.binding.actor)||parent.resource.resource_id!==saved.body.work_id||parent.resource.record_version!==saved.version||child.binding.routing_reroute?.work_id!==saved.body.work_id||child.binding.routing_reroute.work_version!==saved.version||saved.body.owner_principal_id!==child.binding.target?.principal_id||row.legacy_request_hash!==ownerDigest({body:saved.body,version:saved.version}))ownerFail('CONFLICT');
 return {saved,...child};
}
export async function lockedRerouteJob(c:PoolConnection,tenant:string,binding:OwnerCommandBinding){
 const [[row]]=await c.execute<RowDataPacket[]>('SELECT * FROM routing_owner_command WHERE tenant_id=? AND command_id=? FOR UPDATE',[tenant,binding.command_id]);
 // Recovery proofs append dependency receipts; only the immutable binding core is pinned.
 if(!row||rerouteJob(tenant,row).ref.binding_digest!==ownerBindingDigest(binding))ownerFail('FORBIDDEN');
 return row;
}
/** Called inside capacity confirmation, under the same Routing gate and SQL commit. */
export async function completeReroute(c:PoolConnection,tenant:string,binding:OwnerCommandBinding){
 if(!binding.routing_reroute)return;
 const row=await lockedRerouteJob(c,tenant,binding),{saved}=rerouteJob(tenant,row);
 if(row.state==='committed')return;if(row.state!=='prepared')ownerFail('CONFLICT');
 const [[work]]=await c.execute<RowDataPacket[]>('SELECT version FROM routing_work_item WHERE tenant_id=? AND id=? FOR UPDATE',[tenant,saved.body.work_id]);if(!work)ownerFail('NOT_FOUND');
 const result={data:{id:saved.body.work_id,version:String(work.version)},meta:{correlation_id:saved.correlation}};
 await c.execute("UPDATE routing_owner_command SET state='committed',result_json=?,terminal_digest=?,terminal_at=UTC_TIMESTAMP(6),version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND command_id=?",[ownerCanonical(result),ownerDigest(result),tenant,row.command_id]);
}
