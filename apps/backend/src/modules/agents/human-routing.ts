import {randomUUID} from 'node:crypto';
import type {DataSource} from 'typeorm';
import {UnitOfWork,type TransactionScope} from '../../kernel/tenancy/unit-of-work.js';
import {CommandError,DurableCommands} from '../../kernel/reliability/commands.js';
import type {Consumer} from '../../kernel/reliability/delivery.js';
import {IdentityAuthorization,requireActiveTenant} from '../identity/authorization.js';
import {RoutingIdentityPort} from '../identity/routing-port.js';
import {WorkspaceIdentityPort} from '../identity/workspace-port.js';
import {permits,fieldAllowed,type Access} from '../identity/domain/authorization.js';
import {uuid} from '../identity/admin.js';
import {RecordRegistry} from '../crm/registry.js';
import {withFieldPolicies} from '../crm/access.js';
import {object} from '../crm/properties.js';
import {ChannelReferences} from '../channels/ports.js';
import {HumanRoutingChatPort} from '../conversation/human-routing-port.js';
import {Routing} from './routing.js';
import {syncHumanWork,liveQueues,loadCount,jsonArray,enqueueWork} from './human-workload.js';
export type HumanRoutingCommand='skills'|'team-skills'|'profiles'|'queues'|'reroute';
const name=(v:unknown)=>typeof v==='string'&&v.trim().length>0&&v.length<=120;
const ids=(v:unknown):v is string[]=>Array.isArray(v)&&v.length<=200&&v.every(uuid)&&new Set(v).size===v.length;
export function humanRoutingInput(kind:HumanRoutingCommand,input:unknown){
 const keys={skills:['key','name'],'team-skills':['team_id','skill_ids'],profiles:['principal_id','capacity','enabled'],queues:['id','name','team_id','connection_id','skill_ids','priority','enabled'],reroute:['work_id','queue_id','owner_principal_id']};
 const b=object(input,keys[kind]);let valid=false;
 if(kind==='skills')valid=name(b.name)&&typeof b.key==='string'&&/^[a-z][a-z0-9_.-]{0,63}$/.test(b.key);
 if(kind==='team-skills')valid=uuid(b.team_id)&&ids(b.skill_ids);
 if(kind==='profiles')valid=uuid(b.principal_id)&&Number.isInteger(b.capacity)&&b.capacity>=0&&b.capacity<=100&&typeof b.enabled==='boolean';
 if(kind==='queues')valid=(b.id===undefined||uuid(b.id))&&name(b.name)&&uuid(b.team_id)&&(b.connection_id===null||uuid(b.connection_id))&&ids(b.skill_ids)&&Number.isInteger(b.priority)&&b.priority>=0&&b.priority<=999&&typeof b.enabled==='boolean';
 if(kind==='reroute')valid=uuid(b.work_id)&&uuid(b.queue_id)&&(b.owner_principal_id===null||uuid(b.owner_principal_id));
 if(!valid)throw new CommandError(400,'INVALID_REQUEST');return b;
}
export class HumanRouting {
 readonly uow:UnitOfWork;readonly auth:IdentityAuthorization;private readonly identity=new RoutingIdentityPort();private readonly registry=new RecordRegistry();private readonly commands=new DurableCommands();readonly routing:Routing;
 constructor(private readonly source:DataSource){this.uow=new UnitOfWork(source);this.auth=new IdentityAuthorization(this.uow);this.routing=new Routing(source);}
 private admin(a:Access,write=false){if(!permits(a,'routing',write?'manage':'read')||!permits(a,'conversation','read')||!permits(a,'conversation','assign')||!['owner_principal_id','team_id'].every(f=>fieldAllowed(a,'conversation',f,'read')))throw new CommandError(403,'FORBIDDEN');}
 async dispatch(s:TransactionScope,correlation:string=randomUUID()){
  await requireActiveTenant(s,true);await syncHumanWork(s);
  const entries=await s.query("SELECT e.*,v.team_id,v.skill_ids,v.priority FROM routing_queue_entry e JOIN routing_queue_version v ON v.tenant_id=e.tenant_id AND v.id=e.queue_version_id JOIN routing_queue q ON q.tenant_id=v.tenant_id AND q.id=v.queue_id WHERE e.tenant_id=? AND e.state='waiting' AND q.enabled=1 ORDER BY v.priority,e.wait_started_at,e.id LIMIT 100",[s.context.tenantId]);
  if(!entries.length)return;let service:Access;
  try{service=await withFieldPolicies(s,await this.identity.humanRoutingActor(s));if(!permits(service,'conversation','assign')||!permits(service,'conversation','read'))throw new CommandError(403,'FORBIDDEN');}
  catch(e){if(!(e instanceof CommandError)||e.status!==403)throw e;await s.query("UPDATE routing_queue_entry SET blocked_reason='routing_actor_unavailable' WHERE tenant_id=? AND state='waiting'",[s.context.tenantId]);return;}
  for(const entry of entries){
   const [work]=await s.query("SELECT * FROM routing_work_item WHERE tenant_id=? AND id=? AND state='waiting'",[s.context.tenantId,entry.work_id]);if(!work)continue;
   const [grants]=await s.query('SELECT skill_ids FROM routing_team_skill WHERE tenant_id=? AND team_id=?',[s.context.tenantId,entry.team_id]);
   let reason='no_available_agent',owner:string|null=null;
   if(!jsonArray(entry.skill_ids).every(id=>jsonArray(grants?.skill_ids??[]).includes(id)))reason='no_matching_skill';
   else {
    const record=await this.registry.get(s,work.conversation_id,true),candidates=[];
    for(const principal of await this.identity.candidates(s,entry.team_id)){
     const [profile]=await s.query('SELECT * FROM routing_human_profile WHERE tenant_id=? AND principal_id=?',[s.context.tenantId,principal]);
     if(!profile?.enabled)continue;const person=await this.identity.principal(s,principal);if(person?.kind!=='human')continue;
     const failure=await this.routing.eligibility(s,record,principal,entry.team_id,false);if(failure){if(!['unavailable','team'].includes(failure))reason='permission_denied';continue;}
     const load=await loadCount(s,principal);if(load>=profile.capacity){reason='all_at_capacity';continue;}candidates.push({principal,load});
    }
    candidates.sort((a,b)=>a.load-b.load||a.principal.localeCompare(b.principal));owner=candidates[0]?.principal??null;
   }
   if(owner)await this.routing.assignManaged(s,service,work.conversation_id,owner,entry.team_id,correlation,true);
   else await s.query('UPDATE routing_queue_entry SET blocked_reason=? WHERE tenant_id=? AND id=?',[reason,s.context.tenantId,entry.id]);
  }
 }
 consumers():Consumer[]{return ['acquisition_session.opened','acquisition_session.closed','record.assigned','principal.access_changed'].map(type=>({name:'human.routing.'+type+'.v1',type,handle:async(s,event)=>{await this.dispatch(s,event.correlation_id);}}));}
 private nextSweep=0;private cursor='';
 async tick(){
  if(Date.now()<this.nextSweep)return;this.nextSweep=Date.now()+30000;
  const rows=await this.source.query('SELECT tenant_id FROM (SELECT tenant_id FROM routing_queue UNION SELECT tenant_id FROM routing_human_profile) t WHERE tenant_id>? ORDER BY tenant_id LIMIT 100',[this.cursor]);
  for(const row of rows)try{await this.uow.run({tenantId:row.tenant_id},s=>this.dispatch(s));}catch{console.warn('HUMAN_ROUTING_RECONCILE_FAILED');}
  this.cursor=rows.length===100?rows.at(-1).tenant_id:'';
 }
 async read(account:string,tenant:string,mine=false){
  if(!uuid(tenant))throw new CommandError(400,'INVALID_REQUEST');
  return this.auth.runHuman(account,tenant,async(s,raw)=>{
   const a=await withFieldPolicies(s,raw);if(mine){if(!a.capabilities.includes('chat')||!a.grants.some(g=>g.resource==='conversation'&&g.action==='read'))throw new CommandError(403,'FORBIDDEN');}else this.admin(a);
   const profiles=await s.query(`SELECT p.*, (SELECT COUNT(*) FROM routing_human_allocation l WHERE l.tenant_id=p.tenant_id AND l.principal_id=p.principal_id AND l.released_at IS NULL) workload FROM routing_human_profile p WHERE p.tenant_id=? ${mine?'AND p.principal_id=?':''} ORDER BY p.principal_id`,[tenant,...(mine?[a.principalId]:[])]);
   const rows=await s.query(`SELECT w.*,l.id allocation_id,l.principal_id,l.team_id,l.assigned_at,e.id entry_id,e.blocked_reason,e.wait_started_at,v.queue_id,q.name queue_name FROM routing_work_item w LEFT JOIN routing_human_allocation l ON l.tenant_id=w.tenant_id AND l.active_work_id=w.id LEFT JOIN routing_queue_entry e ON e.tenant_id=w.tenant_id AND e.active_work_id=w.id LEFT JOIN routing_queue_version v ON v.tenant_id=e.tenant_id AND v.id=e.queue_version_id LEFT JOIN routing_queue q ON q.tenant_id=v.tenant_id AND q.id=v.queue_id WHERE w.tenant_id=? AND w.state<>'completed' ${mine?'AND l.principal_id=?':''} ORDER BY w.created_at,w.id LIMIT 501`,[tenant,...(mine?[a.principalId]:[])]);
   if(rows.length>500)throw new CommandError(422,'ROUTING_SESSION_LIMIT');const work=[];
   for(const row of rows){const r=await this.registry.get(s,row.conversation_id);if(permits(a,'conversation','read',r)&&(!mine||r.ownerPrincipalId===a.principalId))work.push({id:row.id,conversation_id:row.conversation_id,session_id:row.session_id,state:row.state,version:String(row.version),allocation_id:row.allocation_id,principal_id:fieldAllowed(a,'conversation','owner_principal_id','read')?row.principal_id:null,team_id:fieldAllowed(a,'conversation','team_id','read')?row.team_id:null,assigned_at:row.assigned_at,queue_id:row.queue_id,queue_name:row.queue_name,blocked_reason:row.blocked_reason,wait_started_at:row.wait_started_at});}
   const profileData=[];for(const p of profiles){const person=await this.identity.principal(s,p.principal_id);profileData.push({principal_id:p.principal_id,version:String(p.version),enabled:!!p.enabled,capacity:Number(p.capacity),workload:Number(p.workload),available:!!person?.available&&person.access.capabilities.includes('chat')});}
   if(mine)return {data:{profiles:profileData,work}};
   const options=await new WorkspaceIdentityPort().inboxOptions(s,true,true),queues=await liveQueues(s);
   const performance=await s.query("SELECT principal_id,COUNT(CASE WHEN assigned_at>=TIMESTAMPADD(DAY,-30,UTC_TIMESTAMP(6)) THEN 1 END) assignments,COUNT(CASE WHEN release_reason='completed' AND released_at>=TIMESTAMPADD(DAY,-30,UTC_TIMESTAMP(6)) THEN 1 END) completed,COUNT(CASE WHEN release_reason='transferred' AND released_at>=TIMESTAMPADD(DAY,-30,UTC_TIMESTAMP(6)) THEN 1 END) transferred,AVG(CASE WHEN release_reason='completed' AND released_at>=TIMESTAMPADD(DAY,-30,UTC_TIMESTAMP(6)) THEN GREATEST(0,TIMESTAMPDIFF(MICROSECOND,assigned_at,released_at)/1000000) END) handling_seconds FROM routing_human_allocation WHERE tenant_id=? AND (released_at IS NULL OR released_at>=TIMESTAMPADD(DAY,-30,UTC_TIMESTAMP(6))) GROUP BY principal_id",[tenant]);
   const [wait]=await s.query("SELECT AVG(TIMESTAMPDIFF(MICROSECOND,wait_started_at,ended_at)/1000000) seconds FROM routing_queue_entry WHERE tenant_id=? AND state='assigned' AND ended_at>=TIMESTAMPADD(DAY,-30,UTC_TIMESTAMP(6))",[tenant]);
   const reportSessions=await s.query('SELECT session_id FROM routing_work_item WHERE tenant_id=? AND (completed_at IS NULL OR completed_at>=TIMESTAMPADD(DAY,-30,UTC_TIMESTAMP(6))) LIMIT 5001',[tenant]);if(reportSessions.length>5000)throw new CommandError(422,'ROUTING_REPORT_LIMIT');
   return {data:{profiles:profileData,work,skills:await s.query('SELECT id,skill_key,name FROM routing_skill WHERE tenant_id=? ORDER BY name,id',[tenant]),team_skills:(await s.query('SELECT team_id,skill_ids,version FROM routing_team_skill WHERE tenant_id=?',[tenant])).map((r:any)=>({...r,version:String(r.version),skill_ids:jsonArray(r.skill_ids)})),queues:queues.map((q:any)=>({id:q.queue_id,name:q.name,team_id:q.team_id,connection_id:q.connection_id,priority:Number(q.priority),version:String(q.version),enabled:!!q.enabled,skill_ids:jsonArray(q.skill_ids)})),principals:options.principals,teams:(await this.identity.teams(s)).filter((t:any)=>['chat','general'].includes(t.purpose)).map((t:any)=>({id:t.id,name:t.name})),connections:await new ChannelReferences().workflowOptions(s),performance:performance.map((p:any)=>({...p,assignments:Number(p.assignments),completed:Number(p.completed),transferred:Number(p.transferred),handling_seconds:p.handling_seconds===null?null:Number(p.handling_seconds)})),replies:(await new HumanRoutingChatPort().replies(s,reportSessions.map((r:any)=>r.session_id))).map((r:any)=>({...r,submitted_replies:Number(r.submitted_replies)})),average_wait_seconds:wait.seconds===null?null:Number(wait.seconds),period_days:30}};
  });
 }
 private async validateSkills(s:TransactionScope,skills:string[]){for(const id of skills)if(!(await s.query('SELECT id FROM routing_skill WHERE tenant_id=? AND id=?',[s.context.tenantId,id]))[0])throw new CommandError(422,'INVALID_SKILL');}
 async mutate(account:string,tenant:string,kind:HumanRoutingCommand,input:unknown,key:string,version:string|undefined,correlation:string){
  if(!uuid(tenant)||! /^[\x21-\x7e]{1,128}$/.test(key))throw new CommandError(400,'INVALID_REQUEST');const b=humanRoutingInput(kind,input);
  if(kind!=='skills'&&version===undefined)throw new CommandError(428,'PRECONDITION_REQUIRED');if(version!==undefined&&! /^(0|[1-9][0-9]{0,19})$/.test(version))throw new CommandError(400,'INVALID_REQUEST');
  return this.uow.run({tenantId:tenant},async s=>{
   const a=await withFieldPolicies(s,await this.auth.loadHuman(s,account,undefined,true));this.admin(a,true);
   const command={actorId:a.principalId,correlationId:correlation,route:'POST /api/v1/human-routing/'+kind,key,body:b,version};const replay=await this.commands.replay(s,command,async()=>this.admin(a,true));if(replay)return replay;
   await syncHumanWork(s);let id:string,updated='1';
   const cas=(old:any)=>{if(String(old?.version??0)!==version)throw new CommandError(409,'VERSION_CONFLICT');updated=String(BigInt(version!)+1n);};
   if(kind==='skills'){
    const [count]=await s.query('SELECT COUNT(*) n FROM routing_skill WHERE tenant_id=?',[tenant]);if(count.n>=200)throw new CommandError(422,'SKILL_LIMIT');if((await s.query('SELECT id FROM routing_skill WHERE tenant_id=? AND skill_key=?',[tenant,b.key]))[0])throw new CommandError(409,'SKILL_EXISTS');id=randomUUID();await s.query('INSERT INTO routing_skill(tenant_id,id,skill_key,name) VALUES (?,?,?,?)',[tenant,id,b.key,b.name.trim()]);
   }else if(kind==='team-skills'){
    id=b.team_id;await this.identity.chatTeam(s,id);await this.validateSkills(s,b.skill_ids);const [old]=await s.query('SELECT version FROM routing_team_skill WHERE tenant_id=? AND team_id=?',[tenant,id]);cas(old);
    await s.query('INSERT INTO routing_team_skill(tenant_id,team_id,skill_ids,version) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE skill_ids=VALUES(skill_ids),version=VALUES(version),updated_at=UTC_TIMESTAMP(6)',[tenant,id,JSON.stringify(b.skill_ids),updated]);
   }else if(kind==='profiles'){
    id=b.principal_id;await new WorkspaceIdentityPort().target(s,'principal',id);if(!(await this.identity.principal(s,id))?.access.capabilities.includes('chat'))throw new CommandError(422,'CHAT_SEAT_REQUIRED');const [old]=await s.query('SELECT version FROM routing_human_profile WHERE tenant_id=? AND principal_id=?',[tenant,id]);cas(old);
    const [count]=await s.query('SELECT COUNT(*) n FROM routing_human_profile WHERE tenant_id=?',[tenant]);if(!old&&count.n>=500)throw new CommandError(422,'PROFILE_LIMIT');
    await s.query('INSERT INTO routing_human_profile(tenant_id,principal_id,capacity,enabled,version) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE capacity=VALUES(capacity),enabled=VALUES(enabled),version=VALUES(version),updated_at=UTC_TIMESTAMP(6)',[tenant,id,b.capacity,b.enabled,updated]);
   }else if(kind==='queues'){
    id=b.id??randomUUID();await this.identity.chatTeam(s,b.team_id);await this.validateSkills(s,b.skill_ids);if(b.connection_id)await new ChannelReferences().connection(s,b.connection_id);
    const [old]=await s.query('SELECT version FROM routing_queue WHERE tenant_id=? AND id=?',[tenant,id]);cas(old);const [count]=await s.query('SELECT COUNT(*) n FROM routing_queue WHERE tenant_id=?',[tenant]);if(!old&&count.n>=50)throw new CommandError(422,'QUEUE_LIMIT');
    await this.identity.humanRoutingActor(s,true);
    await s.query('INSERT INTO routing_queue(tenant_id,id,name,enabled,version) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),enabled=VALUES(enabled),version=VALUES(version),updated_at=UTC_TIMESTAMP(6)',[tenant,id,b.name.trim(),b.enabled,updated]);
    await s.query('INSERT INTO routing_queue_version(tenant_id,id,queue_id,version,team_id,connection_id,skill_ids,priority) VALUES (?,?,?,?,?,?,?,?)',[tenant,randomUUID(),id,updated,b.team_id,b.connection_id,JSON.stringify(b.skill_ids),b.priority]);
   }else{
    id=b.work_id;const [work]=await s.query('SELECT * FROM routing_work_item WHERE tenant_id=? AND id=?',[tenant,id]);if(!work)throw new CommandError(404,'NOT_FOUND');cas(work);if(work.state==='completed')throw new CommandError(409,'SESSION_CLOSED');
    const config=(await liveQueues(s)).find((q:any)=>q.queue_id===b.queue_id&&q.enabled);if(!config)throw new CommandError(422,'INVALID_QUEUE');
    await enqueueWork(s,id,config.id);
    await this.routing.assignManaged(s,a,work.conversation_id,b.owner_principal_id,config.team_id,correlation);
   }
   await this.commands.audit(s,a.principalId,correlation,'routing',id,kind,Object.keys(b));await this.dispatch(s,correlation);
   if(kind==='reroute'){const [w]=await s.query('SELECT version FROM routing_work_item WHERE tenant_id=? AND id=?',[tenant,id]);updated=String(w.version);}
   const response={status:200,body:{data:{id,version:updated},meta:{correlation_id:correlation}}};await this.commands.complete(s,command,response);return response;
  });
 }
}
