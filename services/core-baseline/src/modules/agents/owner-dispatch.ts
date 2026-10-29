import {randomUUID} from 'node:crypto';
import type {Pool,PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerAssignmentDirectory,OwnerCommandBinding,OwnerCommandRef,OwnerRecoveryProof} from '@agentic-crm/contracts';
import {ownerBindingDigest,ownerCanonical,ownerDigest,ownerFail,routingDispatchBinding,validateOwnerValue,type OwnerCommandRequest} from '@agentic-crm/workload-transport';
import type {NativeOwnerCapacity} from './owner-capacity.js';
import type {NativeRoutingReconciliation} from './owner-reconciliation.js';
type Peers={proposal(input:OwnerCommandRequest):Promise<OwnerAssignmentDirectory>;dispatch(input:OwnerCommandRequest):Promise<{command:OwnerCommandRef;state:'committed';reconciliation:'pending'|'complete'}>;recover(tenant:string,ref:OwnerCommandRef,abort:boolean):Promise<OwnerRecoveryProof>};
const json=<T>(v:string|T):T=>typeof v==='string'?JSON.parse(v) as T:v;
const permanent=new Set(['FORBIDDEN','REVOKED','NOT_FOUND','STALE_VERSION','CAPACITY','INVALID_TRANSITION','REFERENCE_INVALID']);
/** Routing-local immutable jobs. No network operation runs while holding the capacity gate. */
export class NativeHumanDispatcher{
 constructor(private readonly pool:Pool,private readonly actor:(tenant:string)=>string,private readonly peers:Peers,private readonly capacity:NativeOwnerCapacity,private readonly sync:NativeRoutingReconciliation){}
 private async transaction<T>(tenant:string,work:(c:PoolConnection,open:boolean)=>Promise<T>){
  if(!/^[0-9a-f-]{36}$/.test(tenant)||['01900000-0000-7000-8000-000000000001','00000000-0000-0000-0000-000000000000'].includes(tenant))ownerFail('FORBIDDEN');
  const c=await this.pool.getConnection();try{await c.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');await c.beginTransaction();const [[gate]]=await c.execute<RowDataPacket[]>('SELECT state FROM routing_capacity_gate WHERE tenant_id=? FOR UPDATE',[tenant]);if(!gate)ownerFail('DEPENDENCY_UNAVAILABLE');const result=await work(c,gate.state==='open');await c.commit();return result;}catch(e){await c.rollback();throw e;}finally{c.release();}
 }
 private async terminal(tenant:string,job:RowDataPacket,state:'committed'|'aborted',result:unknown){
  await this.transaction(tenant,async c=>{
   const [[row]]=await c.execute<RowDataPacket[]>('SELECT state,binding_digest FROM routing_owner_command WHERE tenant_id=? AND command_id=? FOR UPDATE',[tenant,job.command_id]);if(!row||row.binding_digest!==job.binding_digest)ownerFail('CONFLICT');
   if(row.state!=='prepared'){if(row.state!==state)ownerFail('CONFLICT');return;}
   await c.execute('UPDATE routing_owner_command SET state=?,result_json=?,terminal_digest=?,terminal_at=UTC_TIMESTAMP(6),version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND command_id=?',[state,ownerCanonical(result),ownerDigest(result),tenant,job.command_id]);
  });
 }
 private async resume(tenant:string,job:RowDataPacket){
  const request=json<OwnerCommandRequest>(job.request_json),parent=validateOwnerValue<OwnerCommandBinding>('OwnerCommandBinding',json(job.binding_json)),{ref}=routingDispatchBinding(request);
  if(request.tenant_id!==tenant||job.operation!=='dispatch'||parent.owner!=='routing'||parent.operation!=='human-routing-dispatch'||parent.payload_digest!==ownerDigest(request)||ownerBindingDigest(parent)!==job.binding_digest)ownerFail('CONFLICT');
  try{
   const reply=await this.peers.dispatch(request);
   if(ownerCanonical(reply.command)!==ownerCanonical(ref)||reply.state!=='committed')ownerFail('FORBIDDEN');
   if(reply.reconciliation!=='complete')return false;
   await this.terminal(tenant,job,'committed',reply);return true;
  }catch(error){
   if(!permanent.has(String((error as {code?:string}).code)))return false;
   try{
    const proof=validateOwnerValue<OwnerRecoveryProof>('OwnerRecoveryProof',await this.peers.recover(tenant,ref,true));
    if(proof.binding_digest!==ref.binding_digest||('binding' in proof?proof.binding.command_id:proof.command_id)!==ref.command_id)ownerFail('FORBIDDEN');
    if(proof.state!=='aborted')return false; // A committed winner is retried/reconciled, never reversed.
    try{await this.capacity.settle(tenant,ref,request.payload.session_id as string,null,true);}catch(e){if((e as {code?:string}).code!=='NOT_FOUND')throw e;}
    await this.terminal(tenant,job,'aborted',{command:ref,state:'aborted'});return true;
   }catch{return false;}
  }
 }
 private async entries(tenant:string){return this.transaction(tenant,async(c,open)=>{
  if(!open)ownerFail('REVOKED');return (await c.execute<RowDataPacket[]>(`SELECT e.id entry_id,e.queue_version_id,e.work_id,v.team_id,v.skill_ids,w.conversation_id,w.session_id,w.version work_version
   FROM routing_queue_entry e JOIN routing_work_item w ON w.tenant_id=e.tenant_id AND w.id=e.work_id JOIN routing_queue_version v ON v.tenant_id=e.tenant_id AND v.id=e.queue_version_id JOIN routing_queue q ON q.tenant_id=v.tenant_id AND q.id=v.queue_id
   WHERE e.tenant_id=? AND e.state='waiting' AND w.state='waiting' AND q.enabled=1 ORDER BY v.priority,e.wait_started_at,e.id LIMIT 100`,[tenant]))[0];
 });}
 private async choose(tenant:string,entry:RowDataPacket,directory:OwnerAssignmentDirectory,actor:string){
  return this.transaction(tenant,async(c,open)=>{
   if(!open)ownerFail('REVOKED');
   const [[live]]=await c.execute<RowDataPacket[]>(`SELECT e.id FROM routing_queue_entry e JOIN routing_work_item w ON w.tenant_id=e.tenant_id AND w.id=e.work_id JOIN routing_queue_version v ON v.tenant_id=e.tenant_id AND v.id=e.queue_version_id JOIN routing_queue q ON q.tenant_id=v.tenant_id AND q.id=v.queue_id WHERE e.tenant_id=? AND e.id=? AND e.work_id=? AND e.queue_version_id=? AND e.state='waiting' AND w.state='waiting' AND w.version=? AND q.enabled=1`,[tenant,entry.entry_id,entry.work_id,entry.queue_version_id,entry.work_version]);if(!live)return null;
   const [[pending]]=await c.execute<RowDataPacket[]>("SELECT * FROM routing_owner_command WHERE tenant_id=? AND operation='dispatch' AND resource_id=? AND state='prepared' ORDER BY created_at,command_id LIMIT 1",[tenant,entry.work_id]);if(pending)return pending;
   if(directory.principal_id!==actor||directory.resource.resource_id!==entry.conversation_id||directory.resource.owner_principal_id!==null||directory.team_id!==entry.team_id)ownerFail('STALE_VERSION');
   const [[skills]]=await c.execute<RowDataPacket[]>('SELECT skill_ids FROM routing_team_skill WHERE tenant_id=? AND team_id=?',[tenant,entry.team_id]);
   let reason='no_available_agent',selected:string|null=null;
   if(!json<string[]>(entry.skill_ids).every(id=>json<string[]>(skills?.skill_ids??[]).includes(id)))reason='no_matching_skill';
   else{
    const [profiles]=await c.execute<RowDataPacket[]>('SELECT principal_id,capacity FROM routing_human_profile WHERE tenant_id=? AND enabled=1 ORDER BY principal_id LIMIT 501',[tenant]);if(profiles.length>500)ownerFail('LIMIT_EXCEEDED');
    const [loads]=await c.execute<RowDataPacket[]>(`SELECT principal_id,COUNT(*) n FROM (
      SELECT a.principal_id,w.session_id FROM routing_human_allocation a JOIN routing_work_item w ON w.tenant_id=a.tenant_id AND w.id=a.work_id WHERE a.tenant_id=? AND a.released_at IS NULL
      UNION SELECT principal_id,session_id FROM routing_capacity_reservation WHERE tenant_id=? AND mode='managed' AND state='reserved'
    ) occupied GROUP BY principal_id`,[tenant,tenant]);
    const candidates=[];
    for(const person of directory.candidates){
     const profile=profiles.find(p=>p.principal_id===person.id);if(person.kind!=='human'||!profile)continue;
     if(!person.eligible){if(!['unavailable','team'].includes(person.reason??''))reason='permission_denied';continue;}
     const load=Number(loads.find(l=>l.principal_id===person.id)?.n??0);if(load>=Number(profile.capacity)){reason='all_at_capacity';continue;}candidates.push({id:person.id,load});
    }
    candidates.sort((a,b)=>a.load-b.load||a.id.localeCompare(b.id));selected=candidates[0]?.id??null;
   }
   if(!selected){await c.execute('UPDATE routing_queue_entry SET blocked_reason=? WHERE tenant_id=? AND id=?',[reason,tenant,entry.entry_id]);return null;}
   const command=randomUUID(),request:OwnerCommandRequest={schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,operation:'routing-dispatch',command_id:command,actor:{kind:'service',principal_id:actor,delegation_id:actor},payload:{resource:directory.resource,session_id:entry.session_id,target:{principal_id:selected,kind:'human',team_id:entry.team_id},pin:{work_id:entry.work_id,entry_id:entry.entry_id,queue_version_id:entry.queue_version_id}}};routingDispatchBinding(request);
   const binding:OwnerCommandBinding={tenant_id:tenant,command_id:command,owner:'routing',operation:'human-routing-dispatch',actor:request.actor,resource:{resource_id:entry.work_id,object_key:'routing_work',record_version:String(entry.work_version),owner_revision:'0',control_revision:'0',owner_principal_id:null,team_id:entry.team_id,shared_team_ids:[],archived:false},target:request.payload.target as OwnerCommandBinding['target'],session_id:entry.session_id,fields:[],payload_digest:ownerDigest(request),legacy_receipt_key:command,graph:null,dependencies:[]};
   const digest=ownerBindingDigest(binding);
   await c.execute(`INSERT INTO routing_owner_command(tenant_id,command_id,operation,binding_digest,actor_kind,actor_id,resource_kind,resource_id,record_version,owner_revision,control_revision,binding_json,request_json,state,version,created_at,updated_at)
    VALUES (?,?,'dispatch',?,'service',?,'routing_work',?,?,0,0,?,?,'prepared',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,[tenant,command,digest,actor,entry.work_id,entry.work_version,ownerCanonical(binding),ownerCanonical(request)]);
   return {command_id:command,operation:'dispatch',binding_digest:digest,binding_json:binding,request_json:request} as RowDataPacket;
  });
 }
 async tick(tenant:string){
  const pending=await this.transaction(tenant,async c=>(await c.execute<RowDataPacket[]>("SELECT * FROM routing_owner_command WHERE tenant_id=? AND operation='dispatch' AND state='prepared' ORDER BY created_at,command_id LIMIT 100",[tenant]))[0]);
  let recovered=0,dispatched=0;
  for(const job of pending)if(await this.resume(tenant,job))recovered++;
  await this.sync.reconcile(tenant);const actor=this.actor(tenant);
  for(const entry of await this.entries(tenant)){
   let directory:OwnerAssignmentDirectory;
   try{directory=validateOwnerValue<OwnerAssignmentDirectory>('OwnerAssignmentDirectory',await this.peers.proposal({schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,operation:'routing-proposal',command_id:randomUUID(),actor:{kind:'service',principal_id:actor,delegation_id:actor},payload:{id:entry.conversation_id,team_id:entry.team_id}}));}
   catch(error){if(!permanent.has(String((error as {code?:string}).code)))throw error;await this.transaction(tenant,async c=>{await c.execute("UPDATE routing_queue_entry SET blocked_reason='routing_actor_unavailable' WHERE tenant_id=? AND id=? AND state='waiting'",[tenant,entry.entry_id]);});continue;}
   const job=await this.choose(tenant,entry,directory,actor);if(job&&await this.resume(tenant,job))dispatched++;
  }
  return {recovered,dispatched};
 }
}
