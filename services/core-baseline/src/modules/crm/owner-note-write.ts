import {randomUUID} from 'node:crypto';
import type {Pool,PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerAdmission,OwnerCommandRef,OwnerCommandProof,OwnerNoteReceipt} from '@agentic-crm/contracts';
import {ownerBindingDigest,ownerCanonical,ownerDigest,ownerFail,ownerRoute,validateOwnerValue,type WorkloadRoute} from '@agentic-crm/workload-transport';
import type {ReferenceProofReader} from '../../kernel/reliability/owner-reference.js';

/** CRM-local receipt serializes create against permanent abort; Chat body never enters its own ledger. */
export class NativeNoteWriter{
 constructor(private readonly pool:Pool,private readonly proof:ReferenceProofReader,private readonly admission:(tenant:string,command:OwnerCommandRef,id:string)=>Promise<OwnerAdmission>){}
 private async transaction<T>(work:(c:PoolConnection)=>Promise<T>){const c=await this.pool.getConnection();try{await c.query("SET time_zone='+00:00'");await c.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');await c.beginTransaction();const result=await work(c);await c.commit();return result;}catch(error){await c.rollback();throw error;}finally{c.release();}}
 async apply(tenant:string,command:OwnerCommandRef,text?:string):Promise<OwnerNoteReceipt>{
  const proof=validateOwnerValue<OwnerCommandProof>('OwnerCommandProof',await this.proof(tenant,command,false)),b=proof.binding,pin=b.note,creating=text!==undefined;
  if(b.tenant_id!==tenant||b.owner!=='chat'||b.operation!=='note-effect'||!pin||b.actor.kind!=='human'||b.resource.object_key!=='conversation'||b.command_id!==command.command_id||proof.binding_digest!==command.binding_digest||ownerBindingDigest(b)!==command.binding_digest)ownerFail('FORBIDDEN');
  let admitted:OwnerAdmission|undefined;
  if(creating){
   if(proof.state!=='prepared'||!text!.trim()||text!.length>4000||ownerDigest({text})!==pin.body_digest||!b.dependencies.some(d=>d.owner==='crm'&&d.receipt_id===command.command_id&&d.binding_digest===command.binding_digest))ownerFail('FORBIDDEN');
   const dep=b.dependencies.find(d=>d.owner==='identity'&&d.binding_digest===command.binding_digest);if(!dep)ownerFail('FORBIDDEN');
   admitted=validateOwnerValue<OwnerAdmission>('OwnerAdmission',await this.admission(tenant,command,dep.receipt_id));
   if(admitted.state!=='admitted'||admitted.command_id!==command.command_id||admitted.binding_digest!==command.binding_digest||admitted.admission_id!==dep.receipt_id||ownerCanonical([...admitted.allowed_fields].sort())!==ownerCanonical(['body','text']))ownerFail('REVOKED');
  }
  return this.transaction(async c=>{
   const aborted:OwnerNoteReceipt={command,state:'aborted',activity_id:null,occurred_at:null};
   if(creating)await c.execute(`INSERT INTO crm_owner_command(tenant_id,command_id,operation,binding_digest,actor_kind,actor_id,delegation_id,resource_kind,resource_id,record_version,owner_revision,control_revision,binding_json,request_json,admission_id,state,version,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'prepared',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE command_id=command_id`,[tenant,command.command_id,'note-create',command.binding_digest,b.actor.kind,b.actor.principal_id,b.actor.delegation_id,'conversation',b.resource.resource_id,b.resource.record_version,b.resource.owner_revision,b.resource.control_revision,ownerCanonical(b),ownerCanonical({body_digest:pin.body_digest}),admitted!.admission_id]);
   else await c.execute(`INSERT INTO crm_owner_command(tenant_id,command_id,binding_digest,state,result_json,terminal_digest,terminal_at,version,created_at,updated_at)
     VALUES (?,?,?,'aborted',?,?,UTC_TIMESTAMP(6),1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE command_id=command_id`,[tenant,command.command_id,command.binding_digest,ownerCanonical(aborted),ownerDigest(aborted)]);
   const [[row]]=await c.execute<RowDataPacket[]>('SELECT * FROM crm_owner_command WHERE tenant_id=? AND command_id=? FOR UPDATE',[tenant,command.command_id]);
   if(!row||row.binding_digest!==command.binding_digest)ownerFail('CONFLICT');
   if(row.state!=='prepared')return validateOwnerValue<OwnerNoteReceipt>('OwnerNoteReceipt',typeof row.result_json==='string'?JSON.parse(row.result_json):row.result_json);
   if(!creating)ownerFail('DEPENDENCY_UNAVAILABLE'); // A prepared insert exists only inside its atomic create transaction.
   const [[type]]=await c.execute<RowDataPacket[]>("SELECT id FROM object_type WHERE tenant_id=? AND `key`='activity' AND archived_at IS NULL FOR SHARE",[tenant]);if(!type)ownerFail('REFERENCE_INVALID');
   const id=randomUUID();
   await c.execute('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,team_id,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[id,tenant,type.id,b.actor.principal_id,b.resource.team_id]);
   await c.execute("INSERT INTO activity(tenant_id,record_id,kind,subject,body,related_record_id) VALUES (?,?,'note','Internal note',?,?)",[tenant,id,text!,b.resource.resource_id]);
   await c.execute("INSERT INTO ownership_history(id,tenant_id,record_id,to_owner_id,to_team_id,owner_revision,reason,actor_kind,actor_id,created_at) VALUES (?,?,?,?,?,1,'note','human',?,UTC_TIMESTAMP(6))",[randomUUID(),tenant,id,b.actor.principal_id,b.resource.team_id,b.actor.principal_id]);
   await c.execute("INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,correlation_id,occurred_at,created_at) VALUES (?,?,'human',?,'note','activity',?,'accepted',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),tenant,b.actor.principal_id,id,ownerCanonical(['body','related_record_id']),pin.correlation_id]);
   await c.execute("INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,'crm.conversation_note.changed',1,'activity',?,'1',?,?,'human',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')",[randomUUID(),tenant,id,ownerCanonical({conversation_id:b.resource.resource_id,activity_id:id,operation:'created',source_revision:'1'}),pin.correlation_id,b.actor.principal_id]);
   const [[clock]]=await c.execute<RowDataPacket[]>("SELECT DATE_FORMAT(created_at,'%Y-%m-%dT%H:%i:%s.%fZ') occurred_at FROM crm_record WHERE tenant_id=? AND id=?",[tenant,id]);
   const result:OwnerNoteReceipt={command,state:'committed',activity_id:id,occurred_at:clock!.occurred_at};
   await c.execute("UPDATE crm_owner_command SET state='committed',result_json=?,terminal_digest=?,terminal_at=UTC_TIMESTAMP(6),version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND command_id=?",[ownerCanonical(result),ownerDigest(result),tenant,command.command_id]);return result;
  });
 }
}
export function noteWriteRoutes(notes:NativeNoteWriter):Record<string,WorkloadRoute>{return {
 '/internal/v1/owners/crm/note-create':ownerRoute('crm','note-create',['chat'],r=>notes.apply(r.tenant_id,r.payload.command as OwnerCommandRef,r.payload.text as string)),
 '/internal/v1/owners/crm/note-abort':ownerRoute('crm','note-abort',['chat'],r=>notes.apply(r.tenant_id,validateOwnerValue<OwnerCommandRef>('OwnerCommandRef',r.payload))),
};}
