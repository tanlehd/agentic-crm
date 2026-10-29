import {randomUUID} from 'node:crypto';
import type {Pool,PoolConnection,RowDataPacket} from 'mysql2/promise';
import {ownerFail,validateOwnerValue} from '@agentic-crm/workload-transport';
import type {ReferenceProofReader} from '../../kernel/reliability/owner-reference.js';
import {NativeChannelReferences} from './owner-reference.js';

/** Trusted Channels operator port; no public authorization bypass or foreign SQL. */
export class NativeChannelStatus{
 private readonly references:NativeChannelReferences;
 constructor(pool:Pool,proof:ReferenceProofReader,private readonly transport?:{disable(tenant:string,id:string,barrier:string):Promise<unknown>;enable(tenant:string,id:string,barrier:string):Promise<unknown>}){this.references=new NativeChannelReferences(pool,proof);}
 private validate(id:string,barrier:string){validateOwnerValue('OwnerCommandRef',{command_id:id,binding_digest:'0'.repeat(64)});validateOwnerValue('OwnerCommandRef',{command_id:barrier,binding_digest:'0'.repeat(64)});}
 private async rows(c:PoolConnection,tenant:string,id:string,barrier:string){
  const [[gate]]=await c.execute<RowDataPacket[]>("SELECT state,barrier_command_id FROM connector_reference_gate WHERE tenant_id=? AND resource_kind='connection' AND resource_id=? FOR UPDATE",[tenant,id]);
  if(!gate||gate.barrier_command_id!==barrier)ownerFail('CONFLICT');
  const [[connection]]=await c.execute<RowDataPacket[]>('SELECT status FROM channel_connection WHERE tenant_id=? AND id=? FOR UPDATE',[tenant,id]);
  if(!connection)ownerFail('NOT_FOUND');return {gate,connection};
 }
 private audit(c:PoolConnection,tenant:string,id:string,barrier:string,action:string){
  return c.execute("INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,correlation_id,occurred_at,created_at) VALUES (?,?,'system',?,?,'channel_connection',?,'accepted',JSON_ARRAY('status'),?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),tenant,tenant,action,id,barrier]);
 }
 async disable(tenant:string,id:string,barrier:string){
  this.validate(id,barrier);
  // Validate the tenant-owned immutable ID before creating a barrier.
  await this.references.catalog(tenant,id);
  const drained=await this.references.ledger.close(tenant,'connection',id,'1',barrier,async c=>{
   const [[enabled]]=await c.execute<RowDataPacket[]>("SELECT id FROM audit_entry WHERE tenant_id=? AND resource_type='channel_connection' AND resource_id=? AND action='connection.enable' AND correlation_id=? LIMIT 1",[tenant,id,barrier]);
   if(enabled)ownerFail('INVALID_TRANSITION');
  });
  if(drained.state!=='drained')return {state:'closing' as const,barrier_id:barrier};
  if(this.transport){const receipt=validateOwnerValue<{result:{connection_id:string;barrier_id:string;state:string}}>('Reply_connector-transport-disable',{schema_version:1,request_id:randomUUID(),tenant_id:tenant,result:await this.transport.disable(tenant,id,barrier)}).result;if(receipt.connection_id!==id||receipt.barrier_id!==barrier||receipt.state!=='disabled')ownerFail('FORBIDDEN');}
  return this.references.ledger.transaction(tenant,async c=>{
   const {gate,connection}=await this.rows(c,tenant,id,barrier);if(gate.state!=='closing')ownerFail('CONFLICT');
   const [held]=await c.execute<RowDataPacket[]>("SELECT id FROM connector_reference_reservation WHERE tenant_id=? AND resource_kind='connection' AND resource_id=? AND state='held' LIMIT 1",[tenant,id]);
   if(held.length)ownerFail('DEPENDENCY_UNAVAILABLE');
   if(connection.status!=='disabled'){
    if(connection.status!=='active')ownerFail('INVALID_TRANSITION');
    await c.execute("UPDATE channel_connection SET status='disabled' WHERE tenant_id=? AND id=?",[tenant,id]);
    await this.audit(c,tenant,id,barrier,'connection.disable');
   }
   return {state:'disabled' as const,barrier_id:barrier};
  });
 }
 async enable(tenant:string,id:string,barrier:string){
  this.validate(id,barrier);
  if(this.transport){
   await this.references.ledger.transaction(tenant,async c=>{const {gate,connection}=await this.rows(c,tenant,id,barrier);if(!(gate.state==='closing'&&connection.status==='disabled'||gate.state==='open'&&connection.status==='active'))ownerFail('INVALID_TRANSITION');});
   const receipt=validateOwnerValue<{result:{connection_id:string;barrier_id:string;state:string}}>('Reply_connector-transport-enable',{schema_version:1,request_id:randomUUID(),tenant_id:tenant,result:await this.transport.enable(tenant,id,barrier)}).result;if(receipt.connection_id!==id||receipt.barrier_id!==barrier||receipt.state!=='enabled')ownerFail('FORBIDDEN');
  }
  return this.references.ledger.transaction(tenant,async c=>{
   const {gate,connection}=await this.rows(c,tenant,id,barrier);
   if(gate.state==='open'&&connection.status==='active')return {state:'active' as const,barrier_id:barrier};
   if(gate.state!=='closing'||connection.status!=='disabled')ownerFail('INVALID_TRANSITION');
   const [held]=await c.execute<RowDataPacket[]>("SELECT id FROM connector_reference_reservation WHERE tenant_id=? AND resource_kind='connection' AND resource_id=? AND state='held' LIMIT 1",[tenant,id]);if(held.length)ownerFail('DEPENDENCY_UNAVAILABLE');
   await c.execute("UPDATE channel_connection SET status='active' WHERE tenant_id=? AND id=?",[tenant,id]);
   await c.execute("UPDATE connector_reference_gate SET state='open',version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND resource_kind='connection' AND resource_id=?",[tenant,id]);
   await this.audit(c,tenant,id,barrier,'connection.enable');return {state:'active' as const,barrier_id:barrier};
  });
 }
}
