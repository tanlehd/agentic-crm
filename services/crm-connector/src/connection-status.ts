import type {Pool,PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {DispatchBinding} from '@agentic-crm/contracts';
import {ownerFail,ownerRoute,validateOwnerValue,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {businessTenant} from './dispatch-guard.js';

type State='disabled'|'enabled'|'absent';
type Receipt={connection_id:string;barrier_id:string;state:State};
/** Same connection row serializes disable with native local transport start. */
export async function lockActiveConnection(c:PoolConnection,b:DispatchBinding){
 const [[row]]=await c.execute<RowDataPacket[]>('SELECT status,remote_connection_id FROM connector_connection WHERE tenant_id=? AND id=? FOR SHARE',[b.tenant_id,b.connection_id]);
 return !!row&&row.status==='active'&&row.remote_connection_id===b.connection_id;
}
export class ConnectorConnectionStatus {
 constructor(private readonly pool:Pool){}
 private async transaction<T>(work:(c:PoolConnection)=>Promise<T>){const c=await this.pool.getConnection();try{await c.beginTransaction();const result=await work(c);await c.commit();return result;}catch(error){await c.rollback();throw error;}finally{c.release();}}
 private async rows(c:PoolConnection,tenant:string,id:string,barrier:string){
  businessTenant(tenant,{tenant_id:tenant} as DispatchBinding);
  validateOwnerValue('OwnerCommandRef',{command_id:id,binding_digest:'0'.repeat(64)});validateOwnerValue('OwnerCommandRef',{command_id:barrier,binding_digest:'0'.repeat(64)});
  const [[connection]]=await c.execute<RowDataPacket[]>('SELECT status,remote_connection_id FROM connector_connection WHERE tenant_id=? AND id=? FOR UPDATE',[tenant,id]);
  if(!connection)ownerFail('NOT_FOUND');if(connection.remote_connection_id!==id)ownerFail('REFERENCE_INVALID');
  const [[receipt]]=await c.execute<RowDataPacket[]>('SELECT connection_id,state FROM connector_connection_barrier WHERE tenant_id=? AND barrier_id=? FOR UPDATE',[tenant,barrier]);
  if(receipt&&receipt.connection_id!==id)ownerFail('CONFLICT');
  const [[active]]=await c.execute<RowDataPacket[]>("SELECT barrier_id FROM connector_connection_barrier WHERE tenant_id=? AND connection_id=? AND state='disabled' LIMIT 1 FOR UPDATE",[tenant,id]);
  return {connection,receipt,active};
 }
 async status(tenant:string,id:string,barrier:string):Promise<Receipt>{return this.transaction(async c=>{const {receipt}=await this.rows(c,tenant,id,barrier);return {connection_id:id,barrier_id:barrier,state:receipt?.state as State??'absent'};});}
 async disable(tenant:string,id:string,barrier:string):Promise<Receipt>{return this.transaction(async c=>{
  const {connection,receipt,active}=await this.rows(c,tenant,id,barrier);
  if(receipt?.state==='enabled')ownerFail('INVALID_TRANSITION');
  if(active&&active.barrier_id!==barrier)ownerFail('CONFLICT');
  if(receipt){if(connection.status!=='disabled')ownerFail('CONFLICT');return {connection_id:id,barrier_id:barrier,state:'disabled'};}
  if(connection.status!=='active')ownerFail('INVALID_TRANSITION');
  await c.execute("INSERT INTO connector_connection_barrier(tenant_id,barrier_id,connection_id,state,version,disabled_at,enabled_at,updated_at) VALUES (?,?,?,'disabled',1,UTC_TIMESTAMP(6),NULL,UTC_TIMESTAMP(6))",[tenant,barrier,id]);
  await c.execute("UPDATE connector_connection SET status='disabled' WHERE tenant_id=? AND id=?",[tenant,id]);
  return {connection_id:id,barrier_id:barrier,state:'disabled'};
 });}
 async enable(tenant:string,id:string,barrier:string):Promise<Receipt>{return this.transaction(async c=>{
  const {connection,receipt,active}=await this.rows(c,tenant,id,barrier);
  if(!receipt)ownerFail('NOT_FOUND');
  if(active&&active.barrier_id!==barrier)ownerFail('CONFLICT');
  if(receipt.state==='enabled'){if(connection.status!=='active')ownerFail('CONFLICT');return {connection_id:id,barrier_id:barrier,state:'enabled'};}
  if(connection.status!=='disabled'||active?.barrier_id!==barrier)ownerFail('CONFLICT');
  await c.execute("UPDATE connector_connection_barrier SET state='enabled',version=version+1,enabled_at=UTC_TIMESTAMP(6),updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND barrier_id=? AND state='disabled'",[tenant,barrier]);
  await c.execute("UPDATE connector_connection SET status='active' WHERE tenant_id=? AND id=?",[tenant,id]);
  return {connection_id:id,barrier_id:barrier,state:'enabled'};
 });}
}
export function connectorConnectionStatusRoutes(status:ConnectorConnectionStatus):Record<string,WorkloadRoute>{
 return Object.fromEntries((['disable','enable','status'] as const).map(action=>['/internal/v1/owners/connector/transport-'+action,ownerRoute('connector','transport-'+action,['connector'],request=>{const p=request.payload as {connection_id:string;barrier_id:string};return status[action](request.tenant_id as string,p.connection_id,p.barrier_id);})]));
}
