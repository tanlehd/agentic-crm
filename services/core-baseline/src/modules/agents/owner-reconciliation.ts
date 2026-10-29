import {randomUUID} from 'node:crypto';
import type {Pool,PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerRoutingSnapshot} from '@agentic-crm/contracts';
import {ownerCanonical,ownerDigest,ownerFail,validateOwnerValue} from '@agentic-crm/workload-transport';
type Query={principal_ids:string[];connection_ids:string[];all_channels:boolean;known_session_ids:string[]};
const sqlTime=(value:string|null)=>value===null?null:value.replace('T',' ').replace(/Z$/,'');
/** Source HTTP outside SQL, local gate/CAS and monotonically retained work history. */
export class NativeRoutingReconciliation{
 constructor(private readonly pool:Pool,private readonly source:(tenant:string,query:Query)=>Promise<OwnerRoutingSnapshot>){}
 private async transaction<T>(tenant:string,work:(c:PoolConnection)=>Promise<T>){
  if(!/^[0-9a-f-]{36}$/.test(tenant)||['01900000-0000-7000-8000-000000000001','00000000-0000-0000-0000-000000000000'].includes(tenant))ownerFail('FORBIDDEN');
  const c=await this.pool.getConnection();try{
   await c.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');await c.beginTransaction();
   const [[gate]]=await c.execute<RowDataPacket[]>('SELECT state FROM routing_capacity_gate WHERE tenant_id=? FOR UPDATE',[tenant]);if(gate?.state!=='open')ownerFail('REVOKED');
   const result=await work(c);await c.commit();return result;
  }catch(e){await c.rollback();throw e;}finally{c.release();}
 }
 private async config(c:PoolConnection,tenant:string){
  const [profiles]=await c.execute<RowDataPacket[]>('SELECT principal_id,capacity,enabled,version FROM routing_human_profile WHERE tenant_id=? ORDER BY principal_id LIMIT 501',[tenant]);
  const [queues]=await c.execute<RowDataPacket[]>('SELECT v.id,v.queue_id,v.version,v.connection_id,v.priority,q.enabled FROM routing_queue q JOIN routing_queue_version v ON v.tenant_id=q.tenant_id AND v.queue_id=q.id AND v.version=q.version WHERE q.tenant_id=? ORDER BY v.priority,q.id LIMIT 51',[tenant]);
  const [known]=await c.execute<RowDataPacket[]>("SELECT id,session_id,conversation_id,state,version FROM routing_work_item WHERE tenant_id=? AND state<>'completed' ORDER BY id LIMIT 501",[tenant]);
  if(profiles.length>500||queues.length>50||known.length>500)ownerFail('LIMIT_EXCEEDED');return {profiles,queues,known};
 }
 private async enqueue(c:PoolConnection,tenant:string,work:string,queueVersion:string){
  await c.execute("UPDATE routing_queue_entry SET state='cancelled',ended_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND work_id=? AND state='waiting'",[tenant,work]);
  await c.execute("INSERT INTO routing_queue_entry(tenant_id,id,work_id,queue_version_id,state) VALUES (?,?,?,?,'waiting')",[tenant,randomUUID(),work,queueVersion]);
 }
 async reconcile(tenant:string){
  const config=await this.transaction(tenant,c=>this.config(c,tenant)),enabled=config.queues.filter(q=>q.enabled);
  const query:Query={principal_ids:config.profiles.map(p=>String(p.principal_id)),connection_ids:[...new Set<string>(enabled.filter(q=>q.connection_id).map(q=>String(q.connection_id)))],all_channels:enabled.some(q=>!q.connection_id),known_session_ids:config.known.map(w=>String(w.session_id))};
  const source=validateOwnerValue<OwnerRoutingSnapshot>('OwnerRoutingSnapshot',await this.source(tenant,query));
  if(source.snapshot_digest!==ownerDigest({sessions:source.sessions,missing:source.missing})||new Set(source.sessions.map(r=>r.session_id)).size!==source.sessions.length)ownerFail('FORBIDDEN');
  // A missing retained session is corruption/unavailability, not proof of closure.
  if(source.missing.length||query.known_session_ids.some(id=>!source.sessions.some(r=>r.session_id===id)))ownerFail('REFERENCE_INVALID');
  for(const row of source.sessions){
   if((row.status==='closed')!==(row.closed_at!==null))ownerFail('FORBIDDEN');
   if(query.known_session_ids.includes(row.session_id))continue;
   if(row.status!=='active'||(row.owner_principal_id!==null?!query.principal_ids.includes(row.owner_principal_id):!query.all_channels&&!query.connection_ids.includes(row.connection_id)))ownerFail('FORBIDDEN');
  }
  return this.transaction(tenant,async c=>{
   if(ownerCanonical(await this.config(c,tenant))!==ownerCanonical(config))ownerFail('STALE_VERSION');
   let applied=0,pending=0;
   for(const row of source.sessions){
    const [[reserved]]=await c.execute<RowDataPacket[]>("SELECT id FROM routing_capacity_reservation WHERE tenant_id=? AND session_id=? AND state='reserved' LIMIT 1",[tenant,row.session_id]);if(reserved){pending++;continue;}
    const [[head]]=await c.execute<RowDataPacket[]>('SELECT * FROM routing_allocation_head WHERE tenant_id=? AND session_id=? FOR UPDATE',[tenant,row.session_id]);
    if(head&&(head.conversation_id!==row.conversation_id))ownerFail('CONFLICT');
    if(head&&(head.state==='closed'||BigInt(head.owner_revision)>BigInt(row.owner_revision)))continue;
    if(head&&String(head.owner_revision)===row.owner_revision&&head.principal_id!==row.owner_principal_id&&row.status!=='closed')ownerFail('CONFLICT');
    let [[work]]=await c.execute<RowDataPacket[]>('SELECT * FROM routing_work_item WHERE tenant_id=? AND session_id=? FOR UPDATE',[tenant,row.session_id]);
    if(work?.conversation_id&&work.conversation_id!==row.conversation_id)ownerFail('CONFLICT');
    if(work?.state==='completed')continue;
    const profile=config.profiles.find(p=>p.principal_id===row.owner_principal_id),queue=enabled.find(q=>!q.connection_id||q.connection_id===row.connection_id),closed=row.status==='closed';
    if(!work){
     if(closed||!profile&&(!queue||row.owner_principal_id))continue;
     work={id:randomUUID(),state:row.owner_principal_id?'assigned':'waiting'} as RowDataPacket;
     await c.execute('INSERT INTO routing_work_item(tenant_id,id,session_id,conversation_id,state) VALUES (?,?,?,?,?)',[tenant,work.id,row.session_id,row.conversation_id,work.state]);
     if(queue&&!row.owner_principal_id)await this.enqueue(c,tenant,work.id,queue.id);
    }
    const [[allocation]]=await c.execute<RowDataPacket[]>('SELECT id,principal_id FROM routing_human_allocation WHERE tenant_id=? AND active_work_id=? FOR UPDATE',[tenant,work.id]);
    if(allocation&&(closed||allocation.principal_id!==row.owner_principal_id))await c.execute('UPDATE routing_human_allocation SET released_at=COALESCE(?,UTC_TIMESTAMP(6)),release_reason=? WHERE tenant_id=? AND id=?',[closed?sqlTime(row.closed_at):null,closed?'completed':'transferred',tenant,allocation.id]);
    const [[entry]]=await c.execute<RowDataPacket[]>('SELECT id,queue_version_id,state FROM routing_queue_entry WHERE tenant_id=? AND work_id=? ORDER BY wait_started_at DESC,id DESC LIMIT 1',[tenant,work.id]);
    if(!closed&&profile&&(!allocation||allocation.principal_id!==row.owner_principal_id)){
     const attempt=randomUUID();await c.execute('INSERT INTO routing_assignment_attempt(tenant_id,id,work_id,entry_id,principal_id,owner_revision,reason) VALUES (?,?,?,?,?,?,?)',[tenant,attempt,work.id,entry?.state==='waiting'?entry.id:null,row.owner_principal_id,row.owner_revision,entry?.state==='waiting'?'routed':'owner_sync']);
     await c.execute('INSERT INTO routing_human_allocation(tenant_id,id,work_id,attempt_id,principal_id,team_id,assigned_at) VALUES (?,?,?,?,?,?,?)',[tenant,randomUUID(),work.id,attempt,row.owner_principal_id,row.team_id,sqlTime(row.assigned_at)]);
    }
    const state=closed?'completed':row.owner_principal_id?'assigned':'waiting';
    if(work.state!==state)await c.execute('UPDATE routing_work_item SET state=?,completed_at=?,version=version+1 WHERE tenant_id=? AND id=?',[state,closed?sqlTime(row.closed_at):null,tenant,work.id]);
    if(closed||row.owner_principal_id)await c.execute("UPDATE routing_queue_entry SET state=?,blocked_reason=NULL,ended_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND active_work_id=?",[closed?'cancelled':'assigned',tenant,work.id]);
    else if(work.state==='assigned'&&(entry||queue))await this.enqueue(c,tenant,work.id,entry?.queue_version_id??queue!.id);
    const headState=closed?'closed':row.owner_principal_id?'active':'unassigned';
    if(!head||String(head.owner_revision)!==row.owner_revision||head.state!==headState){
     await c.execute(`INSERT INTO routing_allocation_head(tenant_id,session_id,conversation_id,principal_id,reservation_id,owner_revision,state,version,created_at,updated_at) VALUES (?,?,?,?,NULL,?,?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))
       ON DUPLICATE KEY UPDATE principal_id=VALUES(principal_id),reservation_id=NULL,owner_revision=VALUES(owner_revision),state=VALUES(state),version=version+1,updated_at=UTC_TIMESTAMP(6)`,[tenant,row.session_id,row.conversation_id,row.owner_principal_id,row.owner_revision,headState]);
    }
    applied++;
   }
   return {observed:source.sessions.length,applied,pending};
  });
 }
}
