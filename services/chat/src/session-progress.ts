import { writeChatOutbox } from './event-store.js';
import {stageRequirementsMet,validStageRequirements} from './stage-requirements.js';
import {validConversationStageTypes} from '@agentic-crm/contracts';
import {readSessionConvertTime} from './session-convert-time.js';
import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerAdmission,OwnerCommandBinding,OwnerCommandRef,OwnerResource} from '@agentic-crm/contracts';
import {nextOwnerCounter,ownerCanonical,ownerDigest,ownerFail,OwnerDomainError,ownerRoute,validateOwnerValue,type OwnerCommandRequest,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';
import {recordSnapshot,type RecordPeers} from './record-action.js';
import {advanceSessionClock,advanceSessionDatasets,cleanSessionRow,ensureSessionProcess,initializeSessionProgress,readSessionProcess,sessionProgressContribution,sessionStamp,type ProcessDefinition} from './session-progress-storage.js';

export const sessionProgressOperations={process:'session-progress-get-session-process',publish:'session-progress-post-session-process',read:'session-progress-get-conversations-conversation-sessions-session-progress',write:'session-progress-post-conversations-conversation-sessions-session-progress'} as const;
type Policy={principal_id:string;auth_revision:string;can_edit:boolean};
type Peers=RecordPeers&{policy(tenant:string,command:OwnerCommandRef,admission:string):Promise<Policy>;contact(tenant:string,command:OwnerCommandRef,admission:string):Promise<{contact_id:string;version:string}>};
const sqlTime=(value:string)=>value.replace('T',' ').replace('Z','');
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
type Snapshot={resource:OwnerResource;projection?:{contact_id:string;connection_id:string};session?:RowDataPacket;requiredFields?:string[]};
export class ChatSessionProgress{
 constructor(private readonly commands:ChatOwnerCommands,private readonly peers:Peers){}
 private async snapshot(c:PoolConnection,tenant:string,input:OwnerCommandRequest):Promise<Snapshot>{
  if([sessionProgressOperations.process,sessionProgressOperations.publish].includes(input.operation as typeof sessionProgressOperations.process)){
   const process=await readSessionProcess(c,tenant);return {resource:{resource_id:tenant,object_key:'session_process',record_version:process.current_version,owner_revision:'0',control_revision:'0',owner_principal_id:null,team_id:null,shared_team_ids:[],archived:false}};
  }
  const id=input.payload.conversation as string,base=await recordSnapshot(c,tenant,id),[[row]]=await c.execute<RowDataPacket[]>('SELECT contact_id,connection_id FROM conversation WHERE tenant_id=? AND record_id=?',[tenant,id]);
  const [[session]]=await c.execute<RowDataPacket[]>('SELECT id,status,version,opening_occurred_at,closed_at FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=? AND id=?',[tenant,id,input.payload.session as string]);if(!session)ownerFail('NOT_FOUND');
  const body=input.payload.body as {action?:string;stage_key?:string}|undefined;
  let requiredFields:string[]=[];
  if(body?.action==='stage'){
   const [[progress]]=await c.execute<RowDataPacket[]>('SELECT process_version FROM session_progress WHERE tenant_id=? AND session_id=?',[tenant,session.id]);
   if(progress){const pinned=await readSessionProcess(c,tenant,String(progress.process_version));requiredFields=[...(pinned.definition.stages.find(s=>s.key===body.stage_key)?.requirements?.fields??[])].sort();}
  }
  return {resource:base.resource,projection:{contact_id:row!.contact_id,connection_id:row!.connection_id},session,requiredFields};
 }
 async run(raw:OwnerCommandRequest){
  if(!(Object.values(sessionProgressOperations) as string[]).includes(raw.operation))ownerFail('INVALID_REQUEST');const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-'+raw.operation,raw);if(input.actor.kind!=='human')ownerFail('FORBIDDEN');
  const tenant=input.tenant_id,write=[sessionProgressOperations.publish,sessionProgressOperations.write].includes(input.operation as typeof sessionProgressOperations.write),process=[sessionProgressOperations.process,sessionProgressOperations.publish].includes(input.operation as typeof sessionProgressOperations.process);
  if(write&&(!/^[\x21-\x7e]{1,128}$/.test(input.payload.idempotency_key as string)||process&&input.payload.expected_version==='0'))ownerFail('INVALID_REQUEST');if(write&&input.payload.expected_version===null)ownerFail('PRECONDITION_REQUIRED');
  const snapshot=await this.commands.transaction(tenant,c=>this.snapshot(c,tenant,input)),command=randomUUID(),request={payload:input.payload},fields=process?[]:['attribution','channel','channel_id','contact_id','page_id','text'];
  const binding:OwnerCommandBinding={tenant_id:tenant,command_id:command,owner:'chat',operation:input.operation,actor:input.actor,resource:snapshot.resource,...(snapshot.projection?{projection:snapshot.projection}:{}),...(snapshot.requiredFields?.length?{session_read_fields:snapshot.requiredFields}:{}),target:null,session_id:snapshot.session?.id??null,fields,payload_digest:ownerDigest(request),legacy_receipt_key:'session-progress:'+command,graph:null,dependencies:[]};
  const prepared=await this.commands.prepare(binding,request),ref={command_id:command,binding_digest:prepared.binding_digest};let admission:OwnerAdmission|undefined;
  try{
   admission=validateOwnerValue<OwnerAdmission>('OwnerAdmission',await this.peers.admit(tenant,ref));if(admission.state!=='admitted'||admission.command_id!==command||admission.binding_digest!==ref.binding_digest||ownerCanonical(admission.allowed_fields)!==ownerCanonical(fields))ownerFail('FORBIDDEN');await this.commands.rememberDependency(tenant,ref,'identity-admission',admission);
   const policy=validateOwnerValue<Policy>('OwnerSessionProgressPolicy',await this.peers.policy(tenant,ref,admission.admission_id));if(policy.principal_id!==input.actor.principal_id||policy.auth_revision!==admission.auth_revision||write&&!policy.can_edit)ownerFail('FORBIDDEN');
   if(!process){const contact=await this.peers.contact(tenant,ref,admission.admission_id);if(contact.contact_id!==snapshot.projection!.contact_id)ownerFail('FORBIDDEN');}
   let result:Record<string,unknown>|undefined;
   await this.commands.commit(tenant,ref,admission.admission_id,async c=>{
    if(process)await ensureSessionProcess(c,tenant);
    if(ownerCanonical(await this.snapshot(c,tenant,input))!==ownerCanonical(snapshot))ownerFail('STALE_VERSION');
    if(write){
     const route=process?'POST /api/v1/session-process':`POST /api/v1/conversations/${binding.resource.resource_id}/sessions/${binding.session_id}/progress`,key=input.payload.idempotency_key as string,body=input.payload.body,version=input.payload.expected_version as string,digest=ownerDigest({body,version});
     const [[receipt]]=await c.execute<RowDataPacket[]>("SELECT request_hash,status,response_body FROM idempotency_record WHERE tenant_id=? AND actor_kind='human' AND actor_id=? AND route_key=? AND `key`=? FOR UPDATE",[tenant,binding.actor.principal_id,route,key]);
     if(receipt){if(receipt.request_hash!==digest)throw new OwnerDomainError('IDEMPOTENCY_CONFLICT',input.correlation_id);if(receipt.status!=='completed')ownerFail('DEPENDENCY_UNAVAILABLE');result=typeof receipt.response_body==='string'?JSON.parse(receipt.response_body):receipt.response_body;}
     else{
      const data=process?await this.publish(c,binding,input):await this.mutate(c,binding,input,snapshot.session!);result={data,meta:{correlation_id:input.correlation_id}};
      await c.execute("INSERT INTO idempotency_record(id,tenant_id,actor_kind,actor_id,route_key,`key`,request_hash,status,response_status,response_body,created_at,updated_at,expires_at) VALUES (?,?,'human',?,?,?,?,'completed',200,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),TIMESTAMPADD(DAY,7,UTC_TIMESTAMP(6)))",[randomUUID(),tenant,binding.actor.principal_id,route,key,digest,ownerCanonical(result)]);
      await advanceSessionDatasets(c,tenant);
     }
    }else result={data:process?await readSessionProcess(c,tenant,input.payload.version as string|undefined):await this.read(c,binding,input,snapshot.session!,policy),meta:{correlation_id:input.correlation_id}};
    validateOwnerValue('Reply_chat-'+input.operation,{schema_version:1,request_id:input.request_id,tenant_id:tenant,result});return {effect_id:binding.session_id??tenant,effect_revision:snapshot.resource.record_version};
   });
   await this.peers.settle(tenant,ref,admission.admission_id);return result!;
  }catch(error){try{await this.commands.abort(tenant,ref);if(admission)await this.peers.settle(tenant,ref,admission.admission_id);}catch{/* Native Identity barrier retains terminal proof recovery. */}throw error;}
 }
 private async audit(c:PoolConnection,b:OwnerCommandBinding,input:OwnerCommandRequest,resource:string,id:string,action:string,fields:string[]){await c.execute("INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,correlation_id,occurred_at,created_at) VALUES (?,?,'human',?,?,?,?,'accepted',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),b.tenant_id,b.actor.principal_id,action,resource,id,ownerCanonical(fields),input.correlation_id]);}
 private async publish(c:PoolConnection,b:OwnerCommandBinding,input:OwnerCommandRequest){
  const definition=input.payload.body as ProcessDefinition;
  for(const rows of [definition.stages,definition.milestones])if(new Set(rows.map(r=>r.key)).size!==rows.length||rows.some(r=>!r.label.trim()))throw new OwnerDomainError('INVALID_PROCESS',input.correlation_id);
  if(!validStageRequirements(definition))throw new OwnerDomainError('INVALID_PROCESS',input.correlation_id);
  const current=await ensureSessionProcess(c,b.tenant_id);if(current!==input.payload.expected_version)throw new OwnerDomainError('VERSION_CONFLICT',input.correlation_id);
  const previous=await readSessionProcess(c,b.tenant_id,current);if(!validConversationStageTypes(definition,previous.definition))throw new OwnerDomainError('INVALID_PROCESS',input.correlation_id);
  const next=nextOwnerCounter(current),at=await advanceSessionClock(c,b.tenant_id);
  await c.execute('INSERT INTO session_process_version(tenant_id,version,definition,created_at,actor_id) VALUES (?,?,?,?,?)',[b.tenant_id,next,ownerCanonical(definition),sqlTime(at),b.actor.principal_id]);await c.execute('UPDATE session_process_head SET version=? WHERE tenant_id=?',[next,b.tenant_id]);
  await this.audit(c,b,input,'session_process',b.tenant_id,'session.process_publish',['version']);return {version:next,current_version:next,definition};
 }
 private async read(c:PoolConnection,b:OwnerCommandBinding,input:OwnerCommandRequest,session:RowDataPacket,policy:Policy){
  const tenant=b.tenant_id,sid=b.session_id!,[[progress]]=await c.execute<RowDataPacket[]>('SELECT * FROM session_progress WHERE tenant_id=? AND session_id=?',[tenant,sid]);
  if(!progress)return {session_id:sid,status:session.status,can_edit:policy.can_edit,coverage:'none',version:'0',process:null,convert_time:null,needs:[],history:[],next_before_revision:null};
  const before=input.payload.before_revision as string|undefined,params=[tenant,sid,...(before?[before]:[])],where=before?' AND e.revision<?':'';
  const [stages]=await c.execute<RowDataPacket[]>(`SELECT e.* FROM session_stage_event e WHERE e.tenant_id=? AND e.session_id=?${where} ORDER BY e.revision DESC LIMIT 51`,params),[facts]=await c.execute<RowDataPacket[]>(`SELECT e.*,corrected.id corrected_by FROM session_milestone_event e LEFT JOIN session_milestone_event corrected ON corrected.tenant_id=e.tenant_id AND corrected.supersedes_id=e.id WHERE e.tenant_id=? AND e.session_id=?${where} ORDER BY e.revision DESC LIMIT 51`,params);
  const history=[...stages.map(r=>({...cleanSessionRow(r),revision:String(r.revision),type:'stage'})),...facts.map(r=>({...cleanSessionRow(r),revision:String(r.revision),type:'milestone'}))].sort((x,y)=>BigInt(String(x.revision))>BigInt(String(y.revision))?-1:1),[needs]=await c.execute<RowDataPacket[]>('SELECT * FROM session_need WHERE tenant_id=? AND session_id=? ORDER BY created_at,id LIMIT 100',[tenant,sid]);
  const process=await readSessionProcess(c,tenant,String(progress.process_version)),convert_time=await readSessionConvertTime(c,tenant,sid,process.definition);
  return {...cleanSessionRow(progress),status:session.status,can_edit:policy.can_edit,process,convert_time,needs:needs.map(cleanSessionRow),history:history.slice(0,50),next_before_revision:history.length>50?String(history[49]!.revision):null};
 }
 private async mutate(c:PoolConnection,b:OwnerCommandBinding,input:OwnerCommandRequest,session:RowDataPacket){
  const tenant=b.tenant_id,sid=b.session_id!,body=input.payload.body as Record<string,unknown>,action=body.action as string,expected=input.payload.expected_version as string,fail=(code:ConstructorParameters<typeof OwnerDomainError>[0]):never=>{throw new OwnerDomainError(code,input.correlation_id);};
  const text=(v:unknown,max=500)=>{if(typeof v!=='string'||!v.trim()||v.length>max)fail('VALIDATION_FAILED');return (v as string).trim();};
  await ensureSessionProcess(c,tenant);const at=await advanceSessionClock(c,tenant);let [[p]]=await c.execute<RowDataPacket[]>('SELECT * FROM session_progress WHERE tenant_id=? AND session_id=? FOR UPDATE',[tenant,sid]);
  if(String(p?.version??0)!==expected)fail('VERSION_CONFLICT');if(['enroll','stage','need'].includes(action)&&session.status!=='active')fail('SESSION_CLOSED');
  let id=sid;const next=nextOwnerCounter(expected);let priorStage:string|undefined;
  if(action==='enroll'){if(p)fail('ALREADY_ENROLLED');await initializeSessionProgress(c,tenant,sid,at);}
  else{
   if(!p&&action==='identify_need'){await initializeSessionProgress(c,tenant,sid,at);[[p]]=await c.execute<RowDataPacket[]>('SELECT * FROM session_progress WHERE tenant_id=? AND session_id=?',[tenant,sid]);}
   if(!p)fail('ENROLLMENT_REQUIRED');const process=await readSessionProcess(c,tenant,String(p!.process_version));priorStage=p!.stage_key;
   if(action==='stage'){
    const reason=text(body.reason),target=process.definition.stages.find(s=>s.key===body.stage_key);if(!target||p!.stage_key===body.stage_key)fail('INVALID_TRANSITION');
    if(!await stageRequirementsMet(c,tenant,sid,target!.requirements))fail('STAGE_REQUIREMENTS_NOT_MET');id=randomUUID();
    await c.execute('INSERT INTO session_stage_event(tenant_id,id,session_id,revision,from_stage,to_stage,reason,actor_id,recorded_at) VALUES (?,?,?,?,?,?,?,?,?)',[tenant,id,sid,next,p!.stage_key,body.stage_key as string,reason,b.actor.principal_id,sqlTime(at)]);await c.execute('UPDATE session_progress SET stage_key=? WHERE tenant_id=? AND session_id=?',[body.stage_key as string,tenant,sid]);
   }else if(action==='need'||action==='identify_need'){
    const label=text(body.label,120),[[count]]=await c.execute<RowDataPacket[]>('SELECT COUNT(*) n FROM session_need WHERE tenant_id=? AND session_id=?',[tenant,sid]);if(Number(count!.n)>=100)fail('NEED_LIMIT');id=randomUUID();await c.execute('INSERT INTO session_need(tenant_id,id,session_id,label,created_at,actor_id) VALUES (?,?,?,?,?,?)',[tenant,id,sid,label,sqlTime(at),b.actor.principal_id]);
   }else{
    const reason=text(body.reason);let need=body.need_id,milestone=body.milestone_key,occurred=body.occurred_at,parent:RowDataPacket|undefined;
    if(action!=='record'){
     if(!uuid(body.supersedes_id))ownerFail('INVALID_REQUEST');[[parent]]=await c.execute<RowDataPacket[]>('SELECT e.*,corrected.id corrected_by FROM session_milestone_event e LEFT JOIN session_milestone_event corrected ON corrected.tenant_id=e.tenant_id AND corrected.supersedes_id=e.id WHERE e.tenant_id=? AND e.session_id=? AND e.id=?',[tenant,sid,body.supersedes_id]);
     if(!parent||parent.kind==='retract'||parent.corrected_by)fail('EVIDENCE_CONFLICT');need=parent!.need_id;milestone=parent!.milestone_key;if(action==='retract')occurred=sessionStamp(parent!.occurred_at);
    }
    if(!uuid(need)||!process.definition.milestones.some(m=>m.key===milestone))fail('INVALID_EVIDENCE');
    const [[subject]]=await c.execute<RowDataPacket[]>('SELECT id FROM session_need WHERE tenant_id=? AND session_id=? AND id=?',[tenant,sid,need as string]);if(!subject)fail('INVALID_EVIDENCE');
    if(typeof occurred!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(occurred)||!Number.isFinite(Date.parse(occurred))||new Date(occurred).toISOString()!==occurred)ownerFail('INVALID_REQUEST');
    if(action!=='retract'&&(Date.parse(occurred)<Date.parse(sessionStamp(session.opening_occurred_at)!)||Date.parse(occurred)>Date.parse(at)||session.closed_at&&Date.parse(occurred)>Date.parse(sessionStamp(session.closed_at)!)))fail('EVIDENCE_TIME_OUTSIDE_SESSION');
    if(body.message_id!==undefined){if(!uuid(body.message_id))ownerFail('INVALID_REQUEST');const [[message]]=await c.execute<RowDataPacket[]>("SELECT m.id FROM message m JOIN message_acquisition_membership x ON x.tenant_id=m.tenant_id AND x.message_id=m.id WHERE m.tenant_id=? AND m.conversation_id=? AND x.session_id=? AND m.id=? AND m.direction='inbound'",[tenant,b.resource.resource_id,sid,body.message_id]);if(!message)fail('INVALID_EVIDENCE');}
    id=randomUUID();await c.execute('INSERT INTO session_milestone_event(tenant_id,id,session_id,need_id,revision,milestone_key,kind,supersedes_id,message_id,reason,occurred_at,recorded_at,actor_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',[tenant,id,sid,need as string,next,milestone as string,action,parent?.id??null,body.message_id as string??null,reason,sqlTime(occurred),sqlTime(at),b.actor.principal_id]);
   }
   await c.execute('UPDATE session_progress SET version=?,updated_at=? WHERE tenant_id=? AND session_id=?',[next,sqlTime(at),tenant,sid]);
  }
  await sessionProgressContribution(c,b,session.status,action==='stage'?'stage':'evidence',id,next,{action,...(action==='stage'?{from_stage:priorStage,to_stage:body.stage_key}:{})});
  await this.audit(c,b,input,'session_progress',sid,'session.'+action,[action]);
  await writeChatOutbox(c, "INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,'session.progress_changed',1,'session_progress',?,?,?,?,'human',?,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3),'pending')",[randomUUID(),tenant,sid,next,ownerCanonical({session_id:sid,revision:next,action}),input.correlation_id,b.actor.principal_id]);return {id,session_id:sid,version:next,action};
 }
}
export function chatSessionProgressRoutes(progress:ChatSessionProgress):Record<string,WorkloadRoute>{return Object.fromEntries(Object.values(sessionProgressOperations).map(op=>['/internal/v1/owners/chat/'+op,ownerRoute('chat',op,['bff'],r=>progress.run(r as OwnerCommandRequest))]));}
