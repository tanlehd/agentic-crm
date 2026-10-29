import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerAdmission,OwnerCommandBinding,OwnerCommandRef,OwnerResource} from '@agentic-crm/contracts';
import {ownerCanonical,ownerDigest,ownerFail,OwnerDomainError,validateOwnerValue,type OwnerCommandRequest} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';

export type RecordPeers={admit(tenant:string,ref:OwnerCommandRef):Promise<OwnerAdmission>;settle(tenant:string,ref:OwnerCommandRef,admission:string):Promise<unknown>};
export async function recordSnapshot(c:PoolConnection,tenant:string,id:string){
 const [[row]]=await c.execute<RowDataPacket[]>(`SELECT r.*,v.status,h.control_revision FROM crm_record r
  JOIN conversation v ON v.tenant_id=r.tenant_id AND v.record_id=r.id
  JOIN chat_control_head h ON h.tenant_id=r.tenant_id AND h.conversation_id=r.id WHERE r.tenant_id=? AND r.id=? FOR UPDATE`,[tenant,id]);
 if(!row||row.archived_at!==null)ownerFail('NOT_FOUND');
 const [shares]=await c.execute<RowDataPacket[]>('SELECT team_id FROM record_team_access WHERE tenant_id=? AND record_id=? ORDER BY team_id FOR UPDATE',[tenant,id]);
 const resource:OwnerResource={resource_id:id,object_key:'conversation',record_version:String(row.version),owner_revision:String(row.owner_revision),control_revision:String(row.control_revision),owner_principal_id:row.owner_principal_id,team_id:row.team_id,shared_team_ids:shares.map(r=>String(r.team_id)),archived:false};
 return {resource,status:String(row.status)};
}
type Action={fields:string[];route?:string;versioned?:boolean;ready?(c:PoolConnection,b:OwnerCommandBinding):Promise<void>;apply(c:PoolConnection,b:OwnerCommandBinding,allowed:string[],status:string):Promise<Record<string,unknown>>};
/** Fresh current admission and fenced local transaction; public receipts never replace authorization. */
export class ChatRecordActions {
 constructor(private readonly commands:ChatOwnerCommands,private readonly peers:RecordPeers){}
 async run(input:OwnerCommandRequest,action:Action){
  if(input.actor.kind!=='human')ownerFail('FORBIDDEN');
  const tenant=input.tenant_id,id=input.payload.id as string,key=input.payload.idempotency_key as string;
  if(action.route&&!/^[\x21-\x7e]{1,128}$/.test(key))ownerFail('INVALID_REQUEST');
  const snapshot=await this.commands.transaction(tenant,c=>recordSnapshot(c,tenant,id));
  const command=randomUUID(),request={payload:input.payload};
  const b:OwnerCommandBinding={tenant_id:tenant,command_id:command,owner:'chat',operation:input.operation,actor:input.actor,resource:snapshot.resource,target:null,session_id:null,fields:action.fields,payload_digest:ownerDigest(request),legacy_receipt_key:'record-action:'+command,graph:null,dependencies:[]};
  const prepared=await this.commands.prepare(b,request),ref={command_id:command,binding_digest:prepared.binding_digest};let admission:OwnerAdmission|undefined;
  try{
   admission=validateOwnerValue<OwnerAdmission>('OwnerAdmission',await this.peers.admit(tenant,ref));
   if(admission.state!=='admitted'||admission.command_id!==command||admission.binding_digest!==ref.binding_digest||admission.allowed_fields.some(f=>!action.fields.includes(f)))ownerFail('FORBIDDEN');
   await this.commands.rememberDependency(tenant,ref,'identity-admission',admission);
   let result:Record<string,unknown>|undefined;
   await this.commands.commit(tenant,ref,admission.admission_id,async c=>{
    const current=await recordSnapshot(c,tenant,id);
    if(ownerCanonical(current)!==ownerCanonical(snapshot))ownerFail('STALE_VERSION');
    await action.ready?.(c,b);
    const version=action.versioned?input.payload.expected_version??null:null,body=input.payload.body??{};
    const digest=ownerDigest({body,version});
    if(action.route){
     const [[receipt]]=await c.execute<RowDataPacket[]>("SELECT request_hash,status,response_body FROM idempotency_record WHERE tenant_id=? AND actor_kind='human' AND actor_id=? AND route_key=? AND `key`=? FOR UPDATE",[tenant,b.actor.principal_id,action.route,key]);
     if(receipt){
      if(receipt.request_hash!==digest&&!(action.versioned&&version!==null&&receipt.request_hash===ownerDigest({body,version:'"'+version+'"'})))throw new OwnerDomainError('IDEMPOTENCY_CONFLICT',input.correlation_id);
      if(receipt.status!=='completed')ownerFail('DEPENDENCY_UNAVAILABLE');
      result=typeof receipt.response_body==='string'?JSON.parse(receipt.response_body):receipt.response_body;
     }
    }
    if(!result){
     if(action.versioned){if(version===null)ownerFail('PRECONDITION_REQUIRED');if(version!==current.resource.record_version)throw new OwnerDomainError('VERSION_CONFLICT',input.correlation_id);}
     const data=await action.apply(c,b,admission!.allowed_fields,current.status);result={data,meta:{correlation_id:input.correlation_id,as_of:new Date().toISOString()}};
     if(action.route)await c.execute("INSERT INTO idempotency_record(id,tenant_id,actor_kind,actor_id,route_key,`key`,request_hash,status,response_status,response_body,created_at,updated_at,expires_at) VALUES (?,?,'human',?,?,?,?,'completed',200,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),TIMESTAMPADD(DAY,7,UTC_TIMESTAMP(6)))",[randomUUID(),tenant,b.actor.principal_id,action.route,key,digest,ownerCanonical(result)]);
    }
    validateOwnerValue('Reply_chat-'+input.operation,{schema_version:1,request_id:input.request_id,tenant_id:tenant,result});
    const [[record]]=await c.execute<RowDataPacket[]>('SELECT version FROM crm_record WHERE tenant_id=? AND id=?',[tenant,id]);
    return {effect_id:id,effect_revision:String(record!.version)};
   });
   await this.peers.settle(tenant,ref,admission.admission_id);return result!;
  }catch(error){try{await this.commands.abort(tenant,ref);if(admission)await this.peers.settle(tenant,ref,admission.admission_id);}catch{/* The durable proof remains available to Identity drain. */}throw error;}
 }
}
