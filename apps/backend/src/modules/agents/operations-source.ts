import type {DataSource} from 'typeorm';
import {UnitOfWork} from '../../kernel/tenancy/unit-of-work.js';
import {IdentityAuthorization} from '../identity/authorization.js';
import {withFieldPolicies} from '../crm/access.js';
import {permits,fieldAllowed} from '../identity/domain/authorization.js';
import {WorkspaceIdentityPort} from '../identity/workspace-port.js';
import {RoutingIdentityPort} from '../identity/routing-port.js';
import {HumanRoutingChatPort} from '../conversation/human-routing-port.js';
import {CommandError} from '../../kernel/reliability/commands.js';
const iso=(v:any)=>v===null?null:new Date(typeof v==='string'&&!v.endsWith('Z')?v.replace(' ','T')+'Z':v).toISOString();
// Routing-owned read port. No Reporting SQL over producer tables.
export async function operationsSource(source:DataSource,account:string,tenant:string,csv=false){
 return new IdentityAuthorization(new UnitOfWork(source)).runHuman(account,tenant,async(s,raw)=>{
  const a=await withFieldPolicies(s,raw),allowMock=permits(a,'report_mock_source','read');
  const allowed=permits(a,'report_definition','run')&&(!csv||permits(a,'report_definition','export'))&&permits(a,'routing','read')&&permits(a,'conversation','read')&&permits(a,'conversation','assign')&&['owner_principal_id','team_id'].every(f=>fieldAllowed(a,'conversation',f,'read')&&fieldAllowed(a,'conversation',f,'filter')&&(!csv||fieldAllowed(a,'conversation',f,'export')));
  if(!allowed)return {authRevision:a.revision,policy:{allowMock,operations:null}};
  const start=new Date(),historyFrom=new Date(start.getTime()-30*86400000).toISOString(),params=[tenant,historyFrom.slice(0,-1).replace('T',' ')];
  const work=await s.query('SELECT id,session_id,conversation_id,state,created_at,completed_at FROM routing_work_item WHERE tenant_id=? AND (completed_at IS NULL OR completed_at>=?) LIMIT 5001',params);
  const allocations=await s.query('SELECT id,work_id,principal_id,team_id,assigned_at,released_at,release_reason FROM routing_human_allocation WHERE tenant_id=? AND (released_at IS NULL OR released_at>=?) LIMIT 5001',params);
  const entries=await s.query('SELECT e.id,e.work_id,v.queue_id,e.state,e.blocked_reason,e.wait_started_at,e.ended_at FROM routing_queue_entry e JOIN routing_queue_version v ON v.tenant_id=e.tenant_id AND v.id=e.queue_version_id WHERE e.tenant_id=? AND (e.ended_at IS NULL OR e.ended_at>=?) LIMIT 5001',params);
  const queues=await s.query('SELECT q.id,q.name,v.team_id FROM routing_queue q JOIN routing_queue_version v ON v.tenant_id=q.tenant_id AND v.queue_id=q.id AND v.version=q.version WHERE q.tenant_id=?',[tenant]);
  const profiles=await s.query('SELECT p.*, (SELECT COUNT(*) FROM routing_human_allocation l WHERE l.tenant_id=p.tenant_id AND l.principal_id=p.principal_id AND l.released_at IS NULL) workload FROM routing_human_profile p WHERE p.tenant_id=?',[tenant]);
  if(work.length+allocations.length+entries.length+queues.length+profiles.length>5000)throw new CommandError(422,'OPERATIONS_SOURCE_LIMIT');
  const replies=await new HumanRoutingChatPort().replyFacts(s,work.map((w:any)=>w.session_id),historyFrom);
  if(work.length+allocations.length+entries.length+queues.length+profiles.length+replies.length>5000)throw new CommandError(422,'OPERATIONS_SOURCE_LIMIT');
  const directory=await new WorkspaceIdentityPort().inboxOptions(s,true,true),identity=new RoutingIdentityPort(),agents=[];
  for(const p of profiles){const person=await identity.principal(s,p.principal_id);agents.push({id:p.principal_id,name:directory.principals.find(n=>n.id===p.principal_id)?.name??p.principal_id,capacity:Number(p.capacity),workload:Number(p.workload),available:!!person?.available,enabled:!!p.enabled,as_of:start.toISOString()});}
  const asOf=new Date(Math.max(Date.now(),start.getTime()+1)).toISOString();
  const seconds=(from:any,to:any)=>Math.max(0,Math.floor((Date.parse(iso(to)!)-Date.parse(iso(from)!))/1000));
  return {authRevision:a.revision,policy:{allowMock,operations:{schemaVersion:1,tenantId:tenant,asOf,historyFrom,rows:{
   ops_agent:agents,
   ops_queue:queues.map((q:any)=>({id:q.id,name:q.name,team_id:q.team_id,as_of:start.toISOString()})),
   ops_work:work.map((w:any)=>({id:w.id,session_id:w.session_id,conversation_id:w.conversation_id,state:w.state,created_at:iso(w.created_at),completed_at:iso(w.completed_at)})),
   ops_assignment:allocations.map((r:any)=>({id:r.id,work_id:r.work_id,agent_id:r.principal_id,team_id:r.team_id,assigned_at:iso(r.assigned_at),released_at:iso(r.released_at),release_reason:r.release_reason,completed:r.release_reason==='completed'?1:0,transferred:r.release_reason==='transferred'?1:0,handling_seconds:r.release_reason==='completed'?seconds(r.assigned_at,r.released_at):null})),
   ops_queue_visit:entries.map((e:any)=>({id:e.id,work_id:e.work_id,queue_id:e.queue_id,state:e.state,blocked_reason:e.blocked_reason,started_at:iso(e.wait_started_at),ended_at:iso(e.ended_at),waiting_seconds:e.state==='waiting'?seconds(e.wait_started_at,asOf):null,assigned_wait_seconds:e.state==='assigned'?seconds(e.wait_started_at,e.ended_at):null,as_of:start.toISOString()})),
   ops_reply:replies.map((r:any)=>({id:r.id,session_id:r.session_id,agent_id:r.actor_id,team_id:r.team_id,submitted_at:iso(r.recorded_at)}))
  }}}};
 });
}
