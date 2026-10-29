import {createHash,randomUUID} from 'node:crypto';
import type {Pool,PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerActor,OwnerCommandBinding,OwnerCommandRef,OwnerRecoveryProof,OwnerResource} from '@agentic-crm/contracts';
import {ownerBindingDigest,ownerCanonical,ownerCounter,ownerDigest,ownerFail,OwnerError,routingRerouteBinding,validateOwnerValue,type OwnerCommandRequest} from '@agentic-crm/workload-transport';
import {CommandError} from '../../kernel/reliability/commands.js';
import type {NativeOwnerCapacity} from './owner-capacity.js';
import type {NativeRoutingReconciliation} from './owner-reconciliation.js';
import {rerouteJob,rerouteRoute,routingJson,type RerouteSaved} from './owner-reroute-journal.js';

type Response={data:{id:string;version:string};meta:{correlation_id:string}};
type Peers={source(input:OwnerCommandRequest):Promise<{resource:OwnerResource;session_id:string}>;effect(input:OwnerCommandRequest):Promise<{command:OwnerCommandRef;state:'committed';reconciliation:'pending'|'complete'}>;recover(tenant:string,ref:OwnerCommandRef,abort:boolean):Promise<OwnerRecoveryProof>};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const domain=new Set(['HUMAN_PROFILE_REQUIRED','HUMAN_CAPACITY_FULL','NO_MATCHING_SKILL']);
const permanent=new Set(['FORBIDDEN','REVOKED','NOT_FOUND','STALE_VERSION','CAPACITY','INVALID_TRANSITION','REFERENCE_INVALID',...domain]);
export function rerouteCommand(tenant:string,principal:string,key:string){const h=createHash('sha256').update(ownerCanonical({tenant,principal,route:rerouteRoute,key})).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;}
/** Application port. Public composition must preflight current administrative authority, including replay. */
export class NativeRoutingReroute{
 constructor(private readonly pool:Pool,private readonly peers:Peers,private readonly capacity:NativeOwnerCapacity,private readonly sync:NativeRoutingReconciliation){}
 private async transaction<T>(tenant:string,work:(c:PoolConnection,open:boolean)=>Promise<T>){
  if(!uuid(tenant)||['01900000-0000-7000-8000-000000000001','00000000-0000-0000-0000-000000000000'].includes(tenant))ownerFail('FORBIDDEN');
  const c=await this.pool.getConnection();try{await c.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');await c.beginTransaction();const [[gate]]=await c.execute<RowDataPacket[]>('SELECT state FROM routing_capacity_gate WHERE tenant_id=? FOR UPDATE',[tenant]);if(!gate)ownerFail('DEPENDENCY_UNAVAILABLE');const result=await work(c,gate.state==='open');await c.commit();return result;}catch(error){await c.rollback();throw error;}finally{c.release();}
 }
 private async existing(c:PoolConnection,tenant:string,command:string,principal:string,key:string,digest:string){
  const [[row]]=await c.execute<RowDataPacket[]>('SELECT * FROM routing_owner_command WHERE tenant_id=? AND command_id=? FOR UPDATE',[tenant,command]);
  if(row&&(row.actor_id!==principal||row.legacy_route!==rerouteRoute||row.legacy_key!==key||row.legacy_request_hash!==digest||!['reroute','legacy-reroute'].includes(row.operation)))throw new CommandError(409,'IDEMPOTENCY_CONFLICT');return row;
 }
 private result(row:RowDataPacket):Response{
  if(row.state==='prepared')ownerFail('DEPENDENCY_UNAVAILABLE');
  if(row.state==='aborted'){const {error}=routingJson<{error:string}>(row.result_json);if(domain.has(error))throw new CommandError(409,error);throw new OwnerError(error as ConstructorParameters<typeof OwnerError>[0]);}
  return routingJson<Response>(row.result_json);
 }
 private async selection(c:PoolConnection,tenant:string,body:RerouteSaved['body'],version:string){
  const [[work]]=await c.execute<RowDataPacket[]>('SELECT * FROM routing_work_item WHERE tenant_id=? AND id=? FOR UPDATE',[tenant,body.work_id]);if(!work)ownerFail('NOT_FOUND');
  if(String(work.version)!==version)throw new CommandError(409,'VERSION_CONFLICT');if(work.state==='completed')throw new CommandError(409,'SESSION_CLOSED');
  const [[queue]]=await c.execute<RowDataPacket[]>('SELECT v.id,v.team_id FROM routing_queue q JOIN routing_queue_version v ON v.tenant_id=q.tenant_id AND v.queue_id=q.id AND v.version=q.version WHERE q.tenant_id=? AND q.id=? AND q.enabled=1',[tenant,body.queue_id]);if(!queue)throw new CommandError(422,'INVALID_QUEUE');
  const [[pending]]=await c.execute<RowDataPacket[]>("SELECT id FROM routing_capacity_reservation WHERE tenant_id=? AND session_id=? AND state='reserved' LIMIT 1",[tenant,work.session_id]);if(pending)ownerFail('CONFLICT');return {work,queue};
 }
 async mutate(tenant:string,actor:OwnerActor,raw:Record<string,unknown>,version:string|undefined,key:unknown,correlation:string){
  if(actor.kind!=='human'||!uuid(actor.principal_id)||!uuid(actor.delegation_id)||typeof key!=='string'||! /^[\x21-\x7e]{1,128}$/.test(key)||Object.keys(raw).length!==3||Object.keys(raw).some(k=>!['work_id','queue_id','owner_principal_id'].includes(k))||!uuid(raw.work_id)||!uuid(raw.queue_id)||raw.owner_principal_id!==null&&!uuid(raw.owner_principal_id))ownerFail('INVALID_REQUEST');
  if(version===undefined)ownerFail('PRECONDITION_REQUIRED');ownerCounter(version);
  const body=structuredClone(raw) as RerouteSaved['body'],command=rerouteCommand(tenant,actor.principal_id,key),digest=ownerDigest({body,version});
  let job=await this.transaction(tenant,c=>this.existing(c,tenant,command,actor.principal_id,key,digest));
  if(!job){
   try{
   await this.sync.reconcile(tenant);
   const selected=await this.transaction(tenant,async(c,open)=>{if(!open)ownerFail('REVOKED');return this.selection(c,tenant,body,version);});
   const source=await this.peers.source({schema_version:1,request_id:randomUUID(),correlation_id:correlation,tenant_id:tenant,operation:'routing-reroute-source',command_id:randomUUID(),actor,payload:{id:selected.work.conversation_id}});
   if(source.resource.resource_id!==selected.work.conversation_id||source.session_id!==selected.work.session_id)ownerFail('STALE_VERSION');
   job=await this.transaction(tenant,async(c,open)=>{
    const prior=await this.existing(c,tenant,command,actor.principal_id,key,digest);if(prior)return prior;if(!open)ownerFail('REVOKED');
    const live=await this.selection(c,tenant,body,version);if(live.queue.id!==selected.queue.id||live.work.session_id!==source.session_id)ownerFail('STALE_VERSION');
    const child:OwnerCommandRequest={schema_version:1,request_id:randomUUID(),correlation_id:correlation,tenant_id:tenant,operation:'routing-reroute',command_id:command,actor,payload:{...source,target:{principal_id:body.owner_principal_id,kind:body.owner_principal_id?'human':null,team_id:live.queue.team_id},pin:{work_id:body.work_id,work_version:version,queue_version_id:live.queue.id}}};routingRerouteBinding(child);
    const saved:RerouteSaved={child,body,version,correlation},binding:OwnerCommandBinding={tenant_id:tenant,command_id:command,owner:'routing',operation:'human-routing-reroute',actor,resource:{resource_id:body.work_id,object_key:'routing_work',record_version:version,owner_revision:'0',control_revision:'0',owner_principal_id:null,team_id:live.queue.team_id,shared_team_ids:[],archived:false},target:child.payload.target as OwnerCommandBinding['target'],session_id:source.session_id,fields:[],payload_digest:ownerDigest(saved),legacy_receipt_key:key,graph:null,dependencies:[]};
    await c.execute(`INSERT INTO routing_owner_command(tenant_id,command_id,operation,binding_digest,actor_kind,actor_id,delegation_id,resource_kind,resource_id,record_version,owner_revision,control_revision,legacy_route,legacy_key,legacy_request_hash,binding_json,request_json,state,version,created_at,updated_at)
     VALUES (?,?,'reroute',?,'human',?,?,'routing_work',?,?,0,0,?,?,?,?,?,'prepared',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,[tenant,command,ownerBindingDigest(binding),actor.principal_id,actor.delegation_id,body.work_id,version,rerouteRoute,key,digest,ownerCanonical(binding),ownerCanonical(saved)]);
    return (await this.existing(c,tenant,command,actor.principal_id,key,digest))!;
   });
   }catch(error){
    // A concurrent identical request may have committed while this caller read sources.
    job=await this.transaction(tenant,c=>this.existing(c,tenant,command,actor.principal_id,key,digest));if(!job)throw error;
   }
  }
  if(job.state==='prepared')await this.resume(tenant,job);
  return this.result((await this.transaction(tenant,c=>this.existing(c,tenant,command,actor.principal_id,key,digest)))!);
 }
 private async resume(tenant:string,job:RowDataPacket){
  const {saved,ref}=rerouteJob(tenant,job);
  try{
   const reply=await this.peers.effect(saved.child);if(reply.state!=='committed'||ownerCanonical(reply.command)!==ownerCanonical(ref))ownerFail('FORBIDDEN');
   // Capacity confirmation writes the public receipt atomically. No speculative version here.
  }catch(error){
   if(!permanent.has(String((error as {code?:string}).code)))throw error;
   const proof=validateOwnerValue<OwnerRecoveryProof>('OwnerRecoveryProof',await this.peers.recover(tenant,ref,true));
   if(proof.binding_digest!==ref.binding_digest||('binding' in proof?proof.binding.command_id:proof.command_id)!==ref.command_id)ownerFail('FORBIDDEN');
   if(proof.state==='prepared')ownerFail('DEPENDENCY_UNAVAILABLE');
   if(proof.state==='committed'){await this.capacity.settle(tenant,ref,saved.child.payload.session_id as string,null,false);return;}
   try{await this.capacity.settle(tenant,ref,saved.child.payload.session_id as string,null,true);}catch(e){if((e as {code?:string}).code!=='NOT_FOUND')throw e;}
   await this.transaction(tenant,async c=>{
    const [[row]]=await c.execute<RowDataPacket[]>('SELECT * FROM routing_owner_command WHERE tenant_id=? AND command_id=? FOR UPDATE',[tenant,job.command_id]);if(!row||row.binding_digest!==job.binding_digest)ownerFail('CONFLICT');if(row.state!=='prepared')return;
    const result={error:String((error as {code:string}).code)};await c.execute("UPDATE routing_owner_command SET state='aborted',result_json=?,terminal_digest=?,terminal_at=UTC_TIMESTAMP(6),version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND command_id=?",[ownerCanonical(result),ownerDigest(result),tenant,job.command_id]);
   });
  }
 }
 async recover(tenant:string){
  const rows=await this.transaction(tenant,async c=>(await c.execute<RowDataPacket[]>("SELECT * FROM routing_owner_command WHERE tenant_id=? AND operation='reroute' AND state='prepared' ORDER BY created_at,command_id LIMIT 100",[tenant]))[0]);
  for(const row of rows)await this.resume(tenant,row);return rows.length;
 }
}
