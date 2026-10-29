import {randomUUID} from 'node:crypto';
import type {Pool,PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerActor,OwnerAdmission,OwnerCommandBinding,OwnerCommandRef,OwnerRecoveryProof} from '@agentic-crm/contracts';
import {ownerBindingDigest,ownerCanonical,ownerDigest,ownerFail,OwnerDomainError,validateOwnerValue} from '@agentic-crm/workload-transport';
const parse=<T>(v:T|string):T=>typeof v==='string'?JSON.parse(v) as T:v;
const date=(column:string)=>`DATE_FORMAT(${column},'%Y-%m-%dT%H:%i:%s.%fZ')`;

/** Routing-only read journal/snapshot. Network calls never enter its transactions. */
export class NativeRoutingViewStorage{
 constructor(private readonly pool:Pool){}
 private async transaction<T>(tenant:string,fn:(c:PoolConnection)=>Promise<T>){
  if(!/^[0-9a-f-]{36}$/.test(tenant)||['01900000-0000-7000-8000-000000000001','00000000-0000-0000-0000-000000000000'].includes(tenant))ownerFail('FORBIDDEN');
  const c=await this.pool.getConnection();try{
   await c.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');await c.beginTransaction();
   const [[gate]]=await c.execute<RowDataPacket[]>('SELECT state FROM routing_capacity_gate WHERE tenant_id=? FOR UPDATE',[tenant]);if(!gate)ownerFail('DEPENDENCY_UNAVAILABLE');
   const result=await fn(c);await c.commit();return result;
  }catch(e){await c.rollback();throw e;}finally{c.release();}
 }
 private async snapshot(c:PoolConnection,tenant:string,principal:string,mine:boolean,from:string){
  const [profiles]=await c.execute<RowDataPacket[]>(`SELECT p.principal_id,p.version,p.enabled,p.capacity,(SELECT COUNT(*) FROM routing_human_allocation l WHERE l.tenant_id=p.tenant_id AND l.principal_id=p.principal_id AND l.released_at IS NULL) workload FROM routing_human_profile p WHERE p.tenant_id=? ${mine?'AND p.principal_id=?':''} ORDER BY p.principal_id LIMIT 501`,[tenant,...(mine?[principal]:[])]);
  if(profiles.length>500)ownerFail('LIMIT_EXCEEDED');
  const [work]=await c.execute<RowDataPacket[]>(`SELECT w.id,w.conversation_id,w.session_id,w.state,w.version,l.id allocation_id,l.principal_id,l.team_id,${date('l.assigned_at')} assigned_at,v.queue_id,q.name queue_name,e.blocked_reason,${date('e.wait_started_at')} wait_started_at FROM routing_work_item w LEFT JOIN routing_human_allocation l ON l.tenant_id=w.tenant_id AND l.active_work_id=w.id LEFT JOIN routing_queue_entry e ON e.tenant_id=w.tenant_id AND e.active_work_id=w.id LEFT JOIN routing_queue_version v ON v.tenant_id=e.tenant_id AND v.id=e.queue_version_id LEFT JOIN routing_queue q ON q.tenant_id=v.tenant_id AND q.id=v.queue_id WHERE w.tenant_id=? AND w.state<>'completed' ${mine?'AND l.principal_id=?':''} ORDER BY w.created_at,w.id LIMIT 501`,[tenant,...(mine?[principal]:[])]);
  if(work.length>500)throw new OwnerDomainError('ROUTING_SESSION_LIMIT',tenant);
  const base={profiles:profiles.map(p=>({principal_id:String(p.principal_id),version:String(p.version),enabled:!!p.enabled,capacity:Number(p.capacity),workload:Number(p.workload),available:false})),work:work.map(w=>({id:String(w.id),conversation_id:String(w.conversation_id),session_id:String(w.session_id),state:String(w.state),version:String(w.version),allocation_id:w.allocation_id,principal_id:w.principal_id,team_id:w.team_id,assigned_at:w.assigned_at,queue_id:w.queue_id,queue_name:w.queue_name,blocked_reason:w.blocked_reason,wait_started_at:w.wait_started_at}))};
  if(mine)return {data:base,reportSessions:[] as string[]};
  const params:[string,string]=[tenant,from.slice(0,-1).replace('T',' ')];
  const [sessions]=await c.execute<RowDataPacket[]>('SELECT session_id FROM routing_work_item WHERE tenant_id=? AND (completed_at IS NULL OR completed_at>=?) ORDER BY session_id LIMIT 5001',params);
  if(sessions.length>5000)throw new OwnerDomainError('ROUTING_REPORT_LIMIT',tenant);
  const [skills]=await c.execute<RowDataPacket[]>('SELECT id,skill_key,name FROM routing_skill WHERE tenant_id=? ORDER BY name,id LIMIT 201',[tenant]);
  const [teamSkills]=await c.execute<RowDataPacket[]>('SELECT team_id,skill_ids,version FROM routing_team_skill WHERE tenant_id=? ORDER BY team_id LIMIT 201',[tenant]);
  const [queues]=await c.execute<RowDataPacket[]>('SELECT q.id,q.name,v.team_id,v.connection_id,v.skill_ids,v.priority,q.enabled,q.version FROM routing_queue q JOIN routing_queue_version v ON v.tenant_id=q.tenant_id AND v.queue_id=q.id AND v.version=q.version WHERE q.tenant_id=? ORDER BY v.priority,q.id LIMIT 51',[tenant]);
  const [performance]=await c.execute<RowDataPacket[]>("SELECT principal_id,COUNT(CASE WHEN assigned_at>=? THEN 1 END) assignments,COUNT(CASE WHEN release_reason='completed' AND released_at>=? THEN 1 END) completed,COUNT(CASE WHEN release_reason='transferred' AND released_at>=? THEN 1 END) transferred,AVG(CASE WHEN release_reason='completed' AND released_at>=? THEN GREATEST(0,TIMESTAMPDIFF(MICROSECOND,assigned_at,released_at)/1000000) END) handling_seconds FROM routing_human_allocation WHERE tenant_id=? AND (released_at IS NULL OR released_at>=?) GROUP BY principal_id ORDER BY principal_id LIMIT 501",[params[1],params[1],params[1],params[1],tenant,params[1]]);
  const [[wait]]=await c.execute<RowDataPacket[]>("SELECT AVG(TIMESTAMPDIFF(MICROSECOND,wait_started_at,ended_at)/1000000) seconds FROM routing_queue_entry WHERE tenant_id=? AND state='assigned' AND ended_at>=?",params);
  if(skills.length>200||teamSkills.length>200||queues.length>50||performance.length>500)ownerFail('LIMIT_EXCEEDED');
  return {data:{...base,skills,team_skills:teamSkills.map(r=>({...r,version:String(r.version),skill_ids:parse<string[]>(r.skill_ids)})),queues:queues.map(q=>({...q,version:String(q.version),skill_ids:parse<string[]>(q.skill_ids),priority:Number(q.priority),enabled:!!q.enabled})),performance:performance.map(p=>({...p,assignments:Number(p.assignments),completed:Number(p.completed),transferred:Number(p.transferred),handling_seconds:p.handling_seconds===null?null:Number(p.handling_seconds)})),average_wait_seconds:wait!.seconds===null?null:Number(wait!.seconds),period_days:30},reportSessions:sessions.map(s=>String(s.session_id))};
 }
 async prepare(tenant:string,actor:OwnerActor,mine:boolean){
  if(actor.kind!=='human'||typeof mine!=='boolean')ownerFail('FORBIDDEN');
  return this.transaction(tenant,async c=>{
   const from=new Date(Date.now()-30*86400000).toISOString(),snapshot=await this.snapshot(c,tenant,actor.principal_id,mine,from),command=randomUUID();
   const selection={mine,from,profile_ids:snapshot.data.profiles.map(p=>p.principal_id),conversation_ids:[...new Set(snapshot.data.work.map(w=>String(w.conversation_id)))],session_ids:snapshot.reportSessions};
   const request={mine,from,snapshot_digest:ownerDigest(snapshot)},binding=validateOwnerValue<OwnerCommandBinding>('OwnerCommandBinding',{tenant_id:tenant,command_id:command,owner:'routing',operation:'routing-view',actor,resource:{resource_id:tenant,object_key:'routing_view',record_version:'0',owner_revision:'0',control_revision:'0',owner_principal_id:null,team_id:null,shared_team_ids:[],archived:false},target:null,session_id:null,fields:[],routing_view:selection,payload_digest:ownerDigest(request),legacy_receipt_key:'routing-view:'+command,graph:null,dependencies:[]}),ref={command_id:command,binding_digest:ownerBindingDigest(binding)};
   await c.execute("INSERT INTO routing_owner_command(tenant_id,command_id,operation,binding_digest,actor_kind,actor_id,resource_kind,resource_id,record_version,owner_revision,control_revision,binding_json,request_json,state,version,created_at,updated_at) VALUES (?,?,'view',?,'human',?,'routing_view',?,0,0,0,?,?,'prepared',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[tenant,command,ref.binding_digest,actor.principal_id,tenant,ownerCanonical(binding),ownerCanonical(request)]);
   return {ref,binding,snapshot};
  });
 }
 private async row(c:PoolConnection,tenant:string,ref:OwnerCommandRef){
  const [[row]]=await c.execute<RowDataPacket[]>('SELECT * FROM routing_owner_command WHERE tenant_id=? AND command_id=? FOR UPDATE',[tenant,ref.command_id]);
  if(!row)ownerFail('NOT_FOUND');if(row.binding_digest!==ref.binding_digest)ownerFail('CONFLICT');if(row.operation!=='view')ownerFail('FORBIDDEN');
  const binding=validateOwnerValue<OwnerCommandBinding>('OwnerCommandBinding',parse(row.binding_json));if(binding.owner!=='routing'||binding.operation!=='routing-view'||binding.tenant_id!==tenant||binding.command_id!==ref.command_id||ownerBindingDigest(binding)!==ref.binding_digest)ownerFail('FORBIDDEN');return {row,binding};
 }
 async admit(tenant:string,ref:OwnerCommandRef,raw:OwnerAdmission){
  const admission=validateOwnerValue<OwnerAdmission>('OwnerAdmission',raw);if(admission.command_id!==ref.command_id||admission.binding_digest!==ref.binding_digest||admission.state!=='admitted'||admission.allowed_fields.length)ownerFail('FORBIDDEN');
  await this.transaction(tenant,async c=>{const {row}=await this.row(c,tenant,ref);if(row.state!=='prepared')ownerFail('INVALID_TRANSITION');if(row.admission_id&&row.admission_id!==admission.admission_id)ownerFail('CONFLICT');await c.execute('UPDATE routing_owner_command SET admission_id=? WHERE tenant_id=? AND command_id=?',[admission.admission_id,tenant,ref.command_id]);});
 }
 async commit(tenant:string,ref:OwnerCommandRef,admission:string){
  return this.transaction(tenant,async c=>{
   const {row,binding}=await this.row(c,tenant,ref);if(row.state!=='prepared'||row.admission_id!==admission)ownerFail('INVALID_TRANSITION');
   const request=parse<{mine:boolean;from:string;snapshot_digest:string}>(row.request_json);if(ownerDigest(request)!==binding.payload_digest)ownerFail('CONFLICT');
   if(ownerDigest(await this.snapshot(c,tenant,binding.actor.principal_id,request.mine,request.from))!==request.snapshot_digest)ownerFail('STALE_VERSION');
   const result={version:'1',snapshot_digest:request.snapshot_digest};await c.execute("UPDATE routing_owner_command SET state='committed',result_json=?,terminal_digest=?,terminal_at=UTC_TIMESTAMP(6),version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND command_id=?",[ownerCanonical(result),ownerDigest(result),tenant,ref.command_id]);
  });
 }
 async proof(tenant:string,input:OwnerCommandRef,abort=false):Promise<OwnerRecoveryProof>{
  const ref=validateOwnerValue<OwnerCommandRef>('OwnerCommandRef',input);
  return this.transaction(tenant,async c=>{
   const {row,binding}=await this.row(c,tenant,ref);
   if(abort&&row.state==='prepared'){const result={error:'REVOKED'};await c.execute("UPDATE routing_owner_command SET state='aborted',result_json=?,terminal_digest=?,terminal_at=UTC_TIMESTAMP(6),version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND command_id=?",[ownerCanonical(result),ownerDigest(result),tenant,ref.command_id]);row.state='aborted';}
   return validateOwnerValue<OwnerRecoveryProof>('OwnerRecoveryProof',{binding,binding_digest:ref.binding_digest,state:row.state,effect_id:row.state==='committed'?tenant:null,effect_revision:row.state==='committed'?'1':null,children:[],candidate_digest:null,resource_contexts:[]});
  });
 }
}
