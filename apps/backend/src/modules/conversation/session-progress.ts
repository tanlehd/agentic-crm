import { randomUUID } from 'node:crypto';
import { contribute } from './contribution-storage.js';
import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError,DurableCommands } from '../../kernel/reliability/commands.js';
import type { Access } from '../identity/domain/authorization.js';
import { permits,fieldAllowed } from '../identity/domain/authorization.js';
import { withFieldPolicies,allows } from '../crm/access.js';
import { object,checkField } from '../crm/properties.js';
import { contactReferences,stamp } from '../crm/core.js';
import { uuid } from '../identity/admin.js';
import { Conversations,conversation,requirePermission } from './domain.js';
import { ensureProcess,readProcess,processDefinition,initializeProgress,advanceProgressClock } from './session-process-storage.js';
import { sessionFunnel,type FunnelSession,type MilestoneFact } from '../reporting/session-funnel.js';

function fail(code='INVALID_REQUEST',status=400):never{throw new CommandError(status,code);}
function text(v:unknown,max=500){if(typeof v!=='string'||!v.trim()||v.length>max)fail('VALIDATION_FAILED',422);return v.trim();}
export function instant(v:unknown){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString()!==v)fail();return v;}
function versionCheck(v:string|undefined,zero=false){if(v===undefined)fail('PRECONDITION_REQUIRED',428);if(!(zero?/^(0|[1-9][0-9]{0,19})$/:/^[1-9][0-9]{0,19}$/).test(v))fail();return v;}
function commandKey(key:string){if(typeof key!=='string'||!key||key.length>128||! /^[\x21-\x7e]+$/.test(key))fail();}
function clean(row:any){const {tenant_id,...rest}=row;for(const k of ['version','revision','process_version'])if(rest[k]!=null)rest[k]=String(rest[k]);for(const k of ['created_at','updated_at','recorded_at','occurred_at'])if(rest[k]!=null)rest[k]=stamp(rest[k]);return rest;}
async function event(s:TransactionScope,actor:string,correlation:string,id:string,revision:string,action:string){
 const commands=new DurableCommands();await commands.audit(s,actor,correlation,'session_progress',id,'session.'+action,[action]);
 await s.query("INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,'session.progress_changed',1,'session_progress',?,?,?,?,'human',?,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3),'pending')",[randomUUID(),s.context.tenantId,id,revision,JSON.stringify({session_id:id,revision,action}),correlation,actor]);
}
export class SessionProgress {
 constructor(private readonly conversations:Conversations){}
 private async access(s:TransactionScope,account:string){return withFieldPolicies(s,await this.conversations.auth.loadHuman(s,account,undefined,true));}
 private async authorize(s:TransactionScope,a:Access,cid:string,sid:string,write=false,lock=false){
  const {record,row}=await conversation(s,cid,lock);requirePermission(a,record,'read');if(write)requirePermission(a,record,'update');
  for(const field of ['contact_id','channel','channel_id','page_id','attribution','text'])checkField(a,'conversation',field,'read');if(write)checkField(a,'conversation','text','write');
  await contactReferences.requireActive(s,a,row.contact_id);
  const [session]=await s.query('SELECT * FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=? AND id=?',[s.context.tenantId,cid,sid]);if(!session)fail('NOT_FOUND',404);
  return {...session,can_edit:permits(a,'conversation','update',record)&&fieldAllowed(a,'conversation','text','write')};
 }
 async process(account:string,tenant:string,query:Record<string,unknown>={}){
  if(Object.keys(query).some(k=>k!=='version')||query.version!==undefined&&(typeof query.version!=='string'||! /^[1-9][0-9]{0,19}$/.test(query.version)))fail();
  return this.conversations.uow.run({tenantId:tenant},async s=>{const a=await this.access(s,account);if(!a.capabilities.includes('read')||!a.grants.some(g=>g.resource==='conversation'&&g.action==='read'))fail('FORBIDDEN',403);return {data:await readProcess(s,query.version as string|undefined)};});
 }
 async publish(account:string,tenant:string,input:unknown,key:string,version:string|undefined,correlation:string){
  commandKey(key);const expected=versionCheck(version),definition=processDefinition(input);
  return this.conversations.uow.run({tenantId:tenant},async s=>{
   const a=await this.access(s,account);if(!allows(a,'schema','update'))fail('FORBIDDEN',403);
   const commands=new DurableCommands(),cmd={actorId:a.principalId,correlationId:correlation,route:'POST /api/v1/session-process',key,version:expected,body:definition};
   const current=await ensureProcess(s),replay=await commands.replay(s,cmd,async()=>{});if(replay)return replay;if(current!==expected)fail('VERSION_CONFLICT',409);
   const next=String(BigInt(current)+1n),recordedAt=await advanceProgressClock(s);await s.query('INSERT INTO session_process_version(tenant_id,version,definition,created_at,actor_id) VALUES (?,?,?,?,?)',[tenant,next,JSON.stringify(definition),recordedAt,a.principalId]);
   await s.query('UPDATE session_process_head SET version=? WHERE tenant_id=?',[next,tenant]);
   await commands.audit(s,a.principalId,correlation,'session_process',tenant,'session.process_publish',['version']);
   const response={status:200,body:{data:{version:next,current_version:next,definition},meta:{correlation_id:correlation}}};await commands.complete(s,cmd,response);return response;
  });
 }
 async read(account:string,tenant:string,cid:string,sid:string,query:Record<string,unknown>={}){
  if(!uuid(sid)||Object.keys(query).some(k=>k!=='before_revision')||query.before_revision!==undefined&&(typeof query.before_revision!=='string'||! /^[1-9][0-9]{0,19}$/.test(query.before_revision)))fail();
  return this.conversations.uow.run({tenantId:tenant},async s=>{
   const a=await this.access(s,account),session=await this.authorize(s,a,cid,sid),[p]=await s.query('SELECT * FROM session_progress WHERE tenant_id=? AND session_id=?',[tenant,sid]);
   if(!p)return {data:{session_id:sid,status:session.status,can_edit:session.can_edit,coverage:'none',version:'0',process:null,needs:[],history:[],next_before_revision:null}};
   const before=query.before_revision,params=[tenant,sid,...(before?[before]:[])],where=before?' AND e.revision<?':'';
   const stages=await s.query(`SELECT e.* FROM session_stage_event e WHERE e.tenant_id=? AND e.session_id=?${where} ORDER BY e.revision DESC LIMIT 51`,params);
   const facts=await s.query(`SELECT e.*,c.id corrected_by FROM session_milestone_event e LEFT JOIN session_milestone_event c ON c.tenant_id=e.tenant_id AND c.supersedes_id=e.id WHERE e.tenant_id=? AND e.session_id=?${where} ORDER BY e.revision DESC LIMIT 51`,params);
   const history=[...stages.map((r:any)=>({...clean(r),type:'stage'})),...facts.map((r:any)=>({...clean(r),type:'milestone'}))].sort((x,y)=>BigInt(x.revision)>BigInt(y.revision)?-1:1);
   const needs=await s.query('SELECT * FROM session_need WHERE tenant_id=? AND session_id=? ORDER BY created_at,id LIMIT 100',[tenant,sid]);
   return {data:{...clean(p),status:session.status,can_edit:session.can_edit,process:await readProcess(s,String(p.process_version)),needs:needs.map(clean),history:history.slice(0,50),next_before_revision:history.length>50?history[49].revision:null}};
  },'REPEATABLE READ');
 }
 async mutate(account:string,tenant:string,cid:string,sid:string,input:unknown,key:string,version:string|undefined,correlation:string){
  if(!uuid(sid))fail();commandKey(key);const expected=versionCheck(version,true),base=object(input,['action','stage_key','reason','label','need_id','milestone_key','occurred_at','message_id','supersedes_id']);
  const fields:Record<string,string[]>={enroll:[],stage:['stage_key','reason'],need:['label'],record:['need_id','milestone_key','occurred_at','reason','message_id'],replace:['supersedes_id','occurred_at','reason','message_id'],retract:['supersedes_id','reason']};
  if(typeof base.action!=='string'||!Object.hasOwn(fields,base.action))fail();const b=object(base,['action',...fields[base.action]!]),action=b.action as string;
  return this.conversations.uow.run({tenantId:tenant},async s=>{
   const a=await this.access(s,account),session=await this.authorize(s,a,cid,sid,true,true),commands=new DurableCommands();
   await ensureProcess(s);
   const cmd={actorId:a.principalId,correlationId:correlation,route:`POST /api/v1/conversations/${cid}/sessions/${sid}/progress`,key,version:expected,body:b};
   const replay=await commands.replay(s,cmd,async()=>{});if(replay)return replay;
   const recordedAt=await advanceProgressClock(s);
   const [p]=await s.query('SELECT * FROM session_progress WHERE tenant_id=? AND session_id=? FOR UPDATE',[tenant,sid]);if(String(p?.version??0)!==expected)fail('VERSION_CONFLICT',409);
   if(['enroll','stage','need'].includes(action)&&session.status!=='active')fail('SESSION_CLOSED',409);
   let id=sid,next=String(BigInt(expected)+1n);
   if(action==='enroll'){if(p)fail('ALREADY_ENROLLED',409);await initializeProgress(s,sid,'partial',recordedAt);}
   else{
    if(!p)fail('ENROLLMENT_REQUIRED',409);const process=await readProcess(s,String(p.process_version));
    if(action==='stage'){
     const reason=text(b.reason);if(!process.definition.stages.some(x=>x.key===b.stage_key)||p.stage_key===b.stage_key)fail('INVALID_TRANSITION',422);
     id=randomUUID();await s.query('INSERT INTO session_stage_event(tenant_id,id,session_id,revision,from_stage,to_stage,reason,actor_id,recorded_at) VALUES (?,?,?,?,?,?,?,?,?)',[tenant,id,sid,next,p.stage_key,b.stage_key,reason,a.principalId,recordedAt]);
     await s.query('UPDATE session_progress SET stage_key=? WHERE tenant_id=? AND session_id=?',[b.stage_key,tenant,sid]);
    }else if(action==='need'){
     const label=text(b.label,120),[count]=await s.query('SELECT COUNT(*) n FROM session_need WHERE tenant_id=? AND session_id=?',[tenant,sid]);if(Number(count.n)>=100)fail('NEED_LIMIT',422);
     id=randomUUID();await s.query('INSERT INTO session_need(tenant_id,id,session_id,label,created_at,actor_id) VALUES (?,?,?,?,?,?)',[tenant,id,sid,label,recordedAt,a.principalId]);
    }else{
     const reason=text(b.reason);let need=b.need_id,milestone=b.milestone_key,occurred=b.occurred_at,parent:any;
     if(action!=='record'){
      if(!uuid(b.supersedes_id))fail();[parent]=await s.query('SELECT e.*,c.id corrected_by FROM session_milestone_event e LEFT JOIN session_milestone_event c ON c.tenant_id=e.tenant_id AND c.supersedes_id=e.id WHERE e.tenant_id=? AND e.session_id=? AND e.id=?',[tenant,sid,b.supersedes_id]);
      if(!parent||parent.kind==='retract'||parent.corrected_by)fail('EVIDENCE_CONFLICT',409);need=parent.need_id;milestone=parent.milestone_key;if(action==='retract')occurred=stamp(parent.occurred_at);
     }
     if(!uuid(need)||!process.definition.milestones.some(x=>x.key===milestone))fail('INVALID_EVIDENCE',422);
     const [subject]=await s.query('SELECT id FROM session_need WHERE tenant_id=? AND session_id=? AND id=?',[tenant,sid,need]);if(!subject)fail('INVALID_EVIDENCE',422);
     const at=instant(occurred);
     if(action!=='retract'&&(Date.parse(at)<new Date(session.opening_occurred_at).getTime()||Date.parse(at)>recordedAt.getTime()||session.closed_at&&Date.parse(at)>new Date(session.closed_at).getTime()))fail('EVIDENCE_TIME_OUTSIDE_SESSION',422);
     if(b.message_id!==undefined){if(!uuid(b.message_id))fail();const [message]=await s.query("SELECT m.id FROM message m JOIN message_acquisition_membership x ON x.tenant_id=m.tenant_id AND x.message_id=m.id WHERE m.tenant_id=? AND m.conversation_id=? AND x.session_id=? AND m.id=? AND m.direction='inbound'",[tenant,cid,sid,b.message_id]);if(!message)fail('INVALID_EVIDENCE',422);}
     id=randomUUID();await s.query('INSERT INTO session_milestone_event(tenant_id,id,session_id,need_id,revision,milestone_key,kind,supersedes_id,message_id,reason,occurred_at,recorded_at,actor_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',[tenant,id,sid,need,next,milestone,action,parent?.id??null,b.message_id??null,reason,new Date(at),recordedAt,a.principalId]);
    }
    await s.query('UPDATE session_progress SET version=?,updated_at=? WHERE tenant_id=? AND session_id=?',[next,recordedAt,tenant,sid]);
   }
   await contribute(s,cid,{session:sid,kind:action==='stage'?'stage':'evidence',source:id,revision:next,actor:{kind:'human',id:a.principalId},payload:{action,...(action==='stage'?{from_stage:p.stage_key,to_stage:b.stage_key}:{})}});
   await event(s,a.principalId,correlation,sid,next,action);const response={status:200,body:{data:{id,session_id:sid,version:next,action},meta:{correlation_id:correlation}}};await commands.complete(s,cmd,response);return response;
  });
 }
 async funnel(account:string,tenant:string,query:Record<string,unknown>){
  if(Object.keys(query).some(k=>!['from','to','as_of','process_version'].includes(k))||typeof query.process_version!=='string')fail();const from=instant(query.from),to=instant(query.to),selected=versionCheck(query.process_version);
  if(Date.parse(to)<=Date.parse(from)||Date.parse(to)-Date.parse(from)>93*86400000)fail('INVALID_WINDOW',422);
  return this.conversations.uow.run({tenantId:tenant},async s=>{
   const a=await this.access(s,account);if(!a.capabilities.includes('read')||!a.grants.some(g=>g.resource==='conversation'&&g.action==='read'))fail('FORBIDDEN',403);
   // READ COMMITTED observes writers committed before the lock. Later writers stamp
   // strictly after this durable watermark, even if the database wall clock regresses.
   const closedCutoff=(await advanceProgressClock(s)).toISOString(),asOf=query.as_of===undefined?closedCutoff:instant(query.as_of);if(Date.parse(asOf)>Date.parse(closedCutoff))fail('INVALID_AS_OF',422);
   const process=await readProcess(s,selected),rows=await s.query('SELECT x.id,x.conversation_id,x.opened_at,p.process_version,p.coverage,p.created_at progress_at FROM conversation_acquisition_session x LEFT JOIN session_progress p ON p.tenant_id=x.tenant_id AND p.session_id=x.id WHERE x.tenant_id=? AND x.opened_at>=? AND x.opened_at<? AND x.opened_at<=? ORDER BY x.opened_at,x.id LIMIT 2001',[tenant,new Date(from),new Date(to),new Date(asOf)]);if(rows.length>2000)fail('QUERY_TOO_LARGE',422);
   const sessions:FunnelSession[]=[],facts:MilestoneFact[]=[];
   for(const row of rows){try{await this.authorize(s,a,row.conversation_id,row.id);}catch(e){if(e instanceof CommandError&&[403,404].includes(e.status))continue;throw e;}
    sessions.push({id:row.id,coverage:row.progress_at&&new Date(row.progress_at).getTime()<=Date.parse(asOf)?row.coverage:'none',process_version:String(row.process_version??'')});
    if(row.coverage==='full'&&String(row.process_version)===selected){const events=await s.query('SELECT * FROM session_milestone_event WHERE tenant_id=? AND session_id=? AND recorded_at<=? ORDER BY recorded_at,revision LIMIT ?',[tenant,row.id,new Date(asOf),20001-facts.length]);facts.push(...events.map(clean));if(facts.length>20000)fail('QUERY_TOO_LARGE',422);}
   }
   return {data:{...sessionFunnel(sessions,facts,process.definition.milestones,selected,asOf),from,to,as_of:asOf,process_version:selected,timezone:'UTC',scope:'current_authorized_conversations',mode:'same_need_ordered'}};
  });
 }
}
