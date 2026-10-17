import {randomUUID} from 'node:crypto';
import type {TransactionScope} from '../../kernel/tenancy/unit-of-work.js';
import {HumanRoutingChatPort} from '../conversation/human-routing-port.js';
import {CommandError} from '../../kernel/reliability/commands.js';
export const jsonArray=(v:unknown):string[]=>typeof v==='string'?JSON.parse(v):v as string[];
const chat=new HumanRoutingChatPort();
export async function loadCount(s:TransactionScope,principal:string){const [r]=await s.query('SELECT COUNT(*) n FROM routing_human_allocation WHERE tenant_id=? AND principal_id=? AND released_at IS NULL',[s.context.tenantId,principal]);return Number(r.n);}
export async function liveQueues(s:TransactionScope){return s.query('SELECT v.*,q.name,q.enabled FROM routing_queue q JOIN routing_queue_version v ON v.tenant_id=q.tenant_id AND v.queue_id=q.id AND v.version=q.version WHERE q.tenant_id=? ORDER BY v.priority,q.id',[s.context.tenantId]);}
export async function workEntry(s:TransactionScope,work:string){const [r]=await s.query("SELECT e.*,v.team_id,v.skill_ids,v.priority,v.queue_id,q.enabled FROM routing_queue_entry e JOIN routing_queue_version v ON v.tenant_id=e.tenant_id AND v.id=e.queue_version_id JOIN routing_queue q ON q.tenant_id=v.tenant_id AND q.id=v.queue_id WHERE e.tenant_id=? AND e.work_id=? ORDER BY e.wait_started_at DESC,e.id DESC LIMIT 1",[s.context.tenantId,work]);return r;}
export async function enqueueWork(s:TransactionScope,work:string,config:string){
 await s.query("UPDATE routing_queue_entry SET state='cancelled',ended_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND work_id=? AND state='waiting'",[s.context.tenantId,work]);
 await s.query("INSERT INTO routing_queue_entry(tenant_id,id,work_id,queue_version_id,state) VALUES (?,?,?,?,'waiting')",[s.context.tenantId,randomUUID(),work,config]);
 await s.query("UPDATE routing_work_item SET state='waiting',version=version+1 WHERE tenant_id=? AND id=?",[s.context.tenantId,work]);
}
// Caller holds the exclusive Identity tenant lock. Live Chat state repairs replay/crash ordering.
export async function syncHumanWork(s:TransactionScope){
 const tenant=s.context.tenantId,profiles=await s.query('SELECT * FROM routing_human_profile WHERE tenant_id=?',[tenant]),queues=await liveQueues(s);
 if(!profiles.length&&!queues.length)return;
 const enabled=queues.filter((q:any)=>q.enabled),active=await chat.active(s,profiles.map((p:any)=>p.principal_id),enabled.filter((q:any)=>q.connection_id).map((q:any)=>q.connection_id),enabled.some((q:any)=>!q.connection_id)),known=await s.query("SELECT * FROM routing_work_item WHERE tenant_id=? AND state<>'completed' ORDER BY id LIMIT 501",[tenant]);
 if(known.length>500)throw new CommandError(422,'ROUTING_SESSION_LIMIT');
 const all=new Map(active.map((r:any)=>[r.session_id,r]));
 for(const work of known)if(!all.has(work.session_id)){const row=await chat.session(s,work.session_id);if(row)all.set(row.session_id,row);}
 for(const row of all.values() as Iterable<any>){
  let work=known.find((w:any)=>w.session_id===row.session_id);const profile=profiles.find((p:any)=>p.principal_id===row.owner_principal_id);
  const queue=queues.find((q:any)=>q.enabled&&(!q.connection_id||q.connection_id===row.connection_id));
  if(!work){
   if(row.status!=='active'||!profile&&(!queue||row.owner_principal_id))continue;
   const [previous]=await s.query('SELECT id FROM routing_work_item WHERE tenant_id=? AND session_id=?',[tenant,row.session_id]);if(previous)continue;
   work={id:randomUUID(),session_id:row.session_id,state:row.owner_principal_id?'assigned':'waiting'};
   await s.query('INSERT INTO routing_work_item(tenant_id,id,session_id,conversation_id,state) VALUES (?,?,?,?,?)',[tenant,work.id,row.session_id,row.conversation_id,work.state]);
   if(queue&&!row.owner_principal_id)await enqueueWork(s,work.id,queue.id);
  }
  const [allocation]=await s.query('SELECT * FROM routing_human_allocation WHERE tenant_id=? AND active_work_id=?',[tenant,work.id]);
  const closed=row.status!=='active';
  if(allocation&&(closed||allocation.principal_id!==row.owner_principal_id))await s.query('UPDATE routing_human_allocation SET released_at=COALESCE(?,UTC_TIMESTAMP(6)),release_reason=? WHERE tenant_id=? AND id=?',[closed?row.closed_at:null,closed?'completed':'transferred',tenant,allocation.id]);
  if(closed){await s.query("UPDATE routing_work_item SET state='completed',completed_at=?,version=version+1 WHERE tenant_id=? AND id=? AND state<>'completed'",[row.closed_at,tenant,work.id]);await s.query("UPDATE routing_queue_entry SET state='cancelled',ended_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND active_work_id=?",[tenant,work.id]);continue;}
  if(profile&&(!allocation||allocation.principal_id!==row.owner_principal_id)){
   const entry=await workEntry(s,work.id),attempt=randomUUID();
   await s.query('INSERT INTO routing_assignment_attempt(tenant_id,id,work_id,entry_id,principal_id,owner_revision,reason) VALUES (?,?,?,?,?,?,?)',[tenant,attempt,work.id,entry?.state==='waiting'?entry.id:null,row.owner_principal_id,row.owner_revision,entry?.state==='waiting'?'routed':'owner_sync']);
   await s.query('INSERT INTO routing_human_allocation(tenant_id,id,work_id,attempt_id,principal_id,team_id,assigned_at) VALUES (?,?,?,?,?,?,?)',[tenant,randomUUID(),work.id,attempt,row.owner_principal_id,row.team_id,row.assigned_at]);
  }
  if(row.owner_principal_id){
   await s.query("UPDATE routing_work_item SET state='assigned',version=version+1 WHERE tenant_id=? AND id=? AND state<>'assigned'",[tenant,work.id]);
   await s.query("UPDATE routing_queue_entry SET state='assigned',blocked_reason=NULL,ended_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND active_work_id=?",[tenant,work.id]);
  }else if(work.state==='assigned'){
   const entry=await workEntry(s,work.id);if(entry)await enqueueWork(s,work.id,entry.queue_version_id);
   else if(queue)await enqueueWork(s,work.id,queue.id);
   else await s.query("UPDATE routing_work_item SET state='waiting',version=version+1 WHERE tenant_id=? AND id=?",[tenant,work.id]);
  }
 }
}
export async function checkHumanCapacity(s:TransactionScope,conversation:string,owner:string,current:string|null,team:string|null){
 const [p]=await s.query('SELECT * FROM routing_human_profile WHERE tenant_id=? AND principal_id=?',[s.context.tenantId,owner]);
 const [work]=await s.query("SELECT id FROM routing_work_item WHERE tenant_id=? AND conversation_id=? AND state<>'completed'",[s.context.tenantId,conversation]);
 if(!p){if(work)throw new CommandError(409,'HUMAN_PROFILE_REQUIRED');return;}
 if(current!==owner&&(!p.enabled||await loadCount(s,owner)>=p.capacity))throw new CommandError(409,'HUMAN_CAPACITY_FULL');
 if(work){const entry=await workEntry(s,work.id);if(entry){const [grants]=await s.query('SELECT skill_ids FROM routing_team_skill WHERE tenant_id=? AND team_id=?',[s.context.tenantId,team]);if(!jsonArray(entry.skill_ids).every(id=>jsonArray(grants?.skill_ids??[]).includes(id)))throw new CommandError(409,'NO_MATCHING_SKILL');}}
}
