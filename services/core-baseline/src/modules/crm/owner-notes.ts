import type {Pool,RowDataPacket} from 'mysql2/promise';
import type {OwnerCommandRef,OwnerCommandProof,OwnerNotePolicy} from '@agentic-crm/contracts';
import {ownerBindingDigest,ownerDigest,ownerFail,ownerRoute,validateOwnerValue,type WorkloadRoute} from '@agentic-crm/workload-transport';
import type {ReferenceProofReader} from '../../kernel/reliability/owner-reference.js';
import {activitySourceState} from '../../kernel/reliability/owner-activity-source.js';

type Input={command:OwnerCommandRef;admission_id:string;limit:number;cursor:string|null};
type ActivityInput={command:OwnerCommandRef;admission_id:string;limit:number;ids:string[]};
/** CRM reads only its own Activity/registry/shares. Conversation identity comes from Chat's proof. */
export class NativeNotes{
 constructor(private readonly pool:Pool,private readonly proof:ReferenceProofReader,private readonly policy:(tenant:string,input:{command:OwnerCommandRef;admission_id:string})=>Promise<OwnerNotePolicy>){}
 async contributions(tenant:string,input:{command:OwnerCommandRef;admission_id:string;ids:string[]}){
  const proof=validateOwnerValue<OwnerCommandProof>('OwnerCommandProof',await this.proof(tenant,input.command,false)),b=proof.binding;
  if(proof.state!=='prepared'||b.tenant_id!==tenant||b.owner!=='chat'||b.actor.kind!=='human'||b.operation!=='conversation-classification-get-conversations-conversation-sessions-session-contributions'||b.resource.object_key!=='conversation'||!b.session_id||!b.projection||b.command_id!==input.command.command_id||proof.binding_digest!==input.command.binding_digest||ownerBindingDigest(b)!==proof.binding_digest)ownerFail('FORBIDDEN');
  const policy=validateOwnerValue<OwnerNotePolicy>('OwnerNotePolicy',await this.policy(tenant,{command:input.command,admission_id:input.admission_id}));if(policy.principal_id!==b.actor.principal_id)ownerFail('FORBIDDEN');if(!input.ids.length)return {visible_ids:[]};
  const conditions:string[]=[],parameters:string[]=[tenant,b.resource.resource_id];if(policy.all)conditions.push('1=1');if(policy.own){conditions.push('r.owner_principal_id=?');parameters.push(policy.principal_id);}
  if(policy.team_ids.length){const marks=policy.team_ids.map(()=>'?').join(',');conditions.push(`(r.team_id IN (${marks}) OR EXISTS(SELECT 1 FROM record_team_access s WHERE s.tenant_id=r.tenant_id AND s.record_id=r.id AND s.team_id IN (${marks})))`);parameters.push(...policy.team_ids,...policy.team_ids);}
  const [rows]=await this.pool.execute<RowDataPacket[]>(`SELECT a.record_id id FROM activity a JOIN crm_record r ON r.tenant_id=a.tenant_id AND r.id=a.record_id JOIN object_type o ON o.tenant_id=r.tenant_id AND o.id=r.object_type_id AND o.\`key\`='activity' WHERE a.tenant_id=? AND a.related_record_id=? AND a.kind='note' AND r.archived_at IS NULL AND (${conditions.join(' OR ')||'0=1'}) AND a.record_id IN (${input.ids.map(()=>'?').join(',')})`,[...parameters,...input.ids]);
  return {visible_ids:rows.map(r=>String(r.id))};
 }
 async list(tenant:string,input:Input){
  const proof=validateOwnerValue<OwnerCommandProof>('OwnerCommandProof',await this.proof(tenant,input.command,false)),b=proof.binding;
  if(proof.state!=='prepared'||b.tenant_id!==tenant||b.owner!=='chat'||b.actor.kind!=='human'||b.operation!=='conversation-get-conversations-id-notes'||b.resource.object_key!=='conversation'||b.command_id!==input.command.command_id||proof.binding_digest!==input.command.binding_digest||ownerBindingDigest(b)!==proof.binding_digest)ownerFail('FORBIDDEN');
  const policy=validateOwnerValue<OwnerNotePolicy>('OwnerNotePolicy',await this.policy(tenant,{command:input.command,admission_id:input.admission_id}));
  if(policy.principal_id!==b.actor.principal_id||new Set(policy.team_ids).size!==policy.team_ids.length)ownerFail('FORBIDDEN');
  const predicates:string[]=[],parameters:string[]=[tenant,b.resource.resource_id];
  if(policy.all)predicates.push('1=1');
  if(policy.own){predicates.push('r.owner_principal_id=?');parameters.push(policy.principal_id);}
  if(policy.team_ids.length){const marks=policy.team_ids.map(()=>'?').join(',');predicates.push(`(r.team_id IN (${marks}) OR EXISTS (SELECT 1 FROM record_team_access shares WHERE shares.tenant_id=r.tenant_id AND shares.record_id=r.id AND shares.team_id IN (${marks})))`);parameters.push(...policy.team_ids,...policy.team_ids);}
  if(input.cursor)parameters.push(input.cursor);
  // ACL and body selection execute in a single CRM statement; no remote call holds a SQL lock.
  const [rows]=await this.pool.execute<RowDataPacket[]>(`SELECT a.record_id id,DATE_FORMAT(r.created_at,'%Y-%m-%dT%H:%i:%s.%fZ') created_at${policy.body?',a.body':''}
    FROM activity a JOIN crm_record r ON r.tenant_id=a.tenant_id AND r.id=a.record_id
    JOIN object_type o ON o.tenant_id=r.tenant_id AND o.id=r.object_type_id AND o.\`key\`='activity'
    WHERE a.tenant_id=? AND a.related_record_id=? AND a.kind='note' AND r.archived_at IS NULL AND (${predicates.join(' OR ')||'0=1'})
    ${input.cursor?'AND a.record_id>?':''} ORDER BY a.record_id LIMIT ${input.limit+1}`,parameters);
  return {data:rows.slice(0,input.limit),next_cursor:rows.length>input.limit?String(rows[input.limit-1]!.id):null};
 }
 async activity(tenant:string,input:ActivityInput){
  const proof=validateOwnerValue<OwnerCommandProof>('OwnerCommandProof',await this.proof(tenant,input.command,false)),b=proof.binding;
  if(proof.state!=='prepared'||b.tenant_id!==tenant||b.owner!=='chat'||b.actor.kind!=='human'||b.operation!=='workspace-get-activity'||b.resource.object_key!=='conversation'||!b.projection||b.command_id!==input.command.command_id||proof.binding_digest!==input.command.binding_digest||ownerBindingDigest(b)!==proof.binding_digest)ownerFail('FORBIDDEN');
  const policy=validateOwnerValue<OwnerNotePolicy>('OwnerNotePolicy',await this.policy(tenant,{command:input.command,admission_id:input.admission_id}));if(policy.principal_id!==b.actor.principal_id)ownerFail('FORBIDDEN');
  const conditions:string[]=[],parameters:string[]=[tenant,b.resource.resource_id];
  if(policy.all)conditions.push('1=1');if(policy.own){conditions.push('r.owner_principal_id=?');parameters.push(policy.principal_id);}
  if(policy.team_ids.length){const marks=policy.team_ids.map(()=>'?').join(',');conditions.push(`(r.team_id IN (${marks}) OR EXISTS(SELECT 1 FROM record_team_access s WHERE s.tenant_id=r.tenant_id AND s.record_id=r.id AND s.team_id IN (${marks})))`);parameters.push(...policy.team_ids,...policy.team_ids);}
  const c=await this.pool.getConnection();try{
   await c.beginTransaction();let data:RowDataPacket[]=[];
   if(input.ids.length){const marks=input.ids.map(()=>'?').join(',');[data]=await c.execute<RowDataPacket[]>(`SELECT a.record_id activity_id${policy.body?',a.body':''} FROM activity a JOIN crm_record r ON r.tenant_id=a.tenant_id AND r.id=a.record_id JOIN object_type o ON o.tenant_id=r.tenant_id AND o.id=r.object_type_id AND o.\`key\`='activity'
     WHERE a.tenant_id=? AND a.related_record_id=? AND a.kind='note' AND r.archived_at IS NULL AND (${conditions.join(' OR ')||'0=1'}) AND a.record_id IN (${marks}) ORDER BY FIELD(a.record_id,${marks}) LIMIT ${input.limit}`,[...parameters,...input.ids,...input.ids]);}
   const state=await activitySourceState(c,tenant,b.resource.resource_id,'crm.conversation_note.changed');await c.commit();return {policy_digest:ownerDigest(policy),state,data};
  }catch(error){await c.rollback();throw error;}finally{c.release();}
 }
}
export function noteReadRoutes(notes:NativeNotes):Record<string,WorkloadRoute>{return {
 '/internal/v1/owners/crm/contribution-sources-read':ownerRoute('crm','contribution-sources-read',['chat'],r=>notes.contributions(r.tenant_id,r.payload as {command:OwnerCommandRef;admission_id:string;ids:string[]})),
 '/internal/v1/owners/crm/note-list':ownerRoute('crm','note-list',['chat'],async r=>({...await notes.list(r.tenant_id,r.payload as Input),meta:{correlation_id:r.correlation_id}})),
 '/internal/v1/owners/crm/activity-notes':ownerRoute('crm','activity-notes',['chat'],r=>notes.activity(r.tenant_id,r.payload as ActivityInput)),
};}
