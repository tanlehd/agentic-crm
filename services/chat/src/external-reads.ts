import {createHmac,timingSafeEqual} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerAdmission,OwnerCommandBinding,OwnerCommandRef,OwnerExternalReadPolicy} from '@agentic-crm/contracts';
import {ownerBindingDigest,ownerCanonical,ownerDigest,ownerFail,ownerRoute,OwnerDomainError,validateOwnerValue,type OwnerCommandRequest,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';

export const externalReadOperations=['external-conversations','external-conversations-id','external-conversations-id-messages','external-conversations-id-messages-messageId'] as const;
const conversationFields=['status','opened_at','closed_at','contact_id','team_id','owner_principal_id'];
const messageFields=['direction','status','occurred_at','received_at','text'];
type Peers={policy(tenant:string,ref:OwnerCommandRef):Promise<OwnerExternalReadPolicy>;settle(tenant:string,ref:OwnerCommandRef,id:string):Promise<unknown>};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
const stamp=(v:unknown)=>v==null?null:v instanceof Date?v.toISOString():new Date(String(v).replace(' ','T').replace(/Z?$/,'Z')).toISOString();

/** App credentials stay at Identity. Only exact admitted policies can query Chat data. */
export class ChatExternalReads {
 constructor(private readonly commands:ChatOwnerCommands,private readonly peers:Peers,private readonly cursorKey:string|Buffer){if(Buffer.byteLength(cursorKey)<32)throw new Error('CHAT_EXTERNAL_CURSOR_KEY_REQUIRED');}
 private describe(raw:OwnerCommandRequest){
  if(!(externalReadOperations as readonly string[]).includes(raw.operation))ownerFail('INVALID_REQUEST');
  const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-'+raw.operation,raw);
  if(input.actor.kind!=='app'||input.actor.delegation_id!==input.command_id)ownerFail('FORBIDDEN');
  const request={payload:input.payload},message=input.operation.includes('-messages');
  const binding:OwnerCommandBinding={tenant_id:input.tenant_id,command_id:input.command_id,owner:'chat',operation:input.operation,actor:input.actor,
   resource:{resource_id:input.tenant_id,object_key:'external_conversation_query',record_version:'0',owner_revision:'0',control_revision:'0',owner_principal_id:null,team_id:null,shared_team_ids:[],archived:false},
   target:null,session_id:null,fields:[...(message?messageFields:conversationFields)].sort(),payload_digest:ownerDigest(request),legacy_receipt_key:'external-read:'+input.command_id,graph:null,dependencies:[]};
  return {input,binding,request,message,ref:{command_id:input.command_id,binding_digest:ownerBindingDigest(binding)}};
 }
 async prepare(raw:OwnerCommandRequest){const d=this.describe(raw);await this.commands.prepare(d.binding,d.request);return d.ref;}
 async execute(raw:OwnerCommandRequest){
  const d=this.describe(raw),{input,ref,message}=d,tenant=input.tenant_id;
  const proof=await this.commands.proof(tenant,ref);
  if(proof.state!=='prepared')ownerFail('INVALID_TRANSITION');
  let admission:OwnerAdmission|undefined,result:unknown;
  try{
   const policy=validateOwnerValue<OwnerExternalReadPolicy>('OwnerExternalReadPolicy',await this.peers.policy(tenant,ref));admission=policy.admission;
   if(admission.state!=='admitted'||admission.command_id!==ref.command_id||admission.binding_digest!==ref.binding_digest||policy.app_id!==input.actor.principal_id||policy.policy_key!==`${policy.app_id}:${admission.auth_revision}`||policy.predicates.length!==(message?2:1)||admission.allowed_fields.some(f=>!d.binding.fields.includes(f)))ownerFail('FORBIDDEN');
   await this.commands.rememberDependency(tenant,ref,'identity-admission',admission);
   await this.commands.commit(tenant,ref,admission.admission_id,async c=>{
    result={...await this.read(c,input,policy,message),meta:{correlation_id:input.correlation_id}};
    validateOwnerValue('Reply_chat-'+input.operation,{schema_version:1,request_id:input.request_id,tenant_id:tenant,result});
    return {effect_id:tenant,effect_revision:admission!.auth_revision};
   });
   if(result===undefined)ownerFail('INVALID_TRANSITION');
   await this.peers.settle(tenant,ref,admission.admission_id);return result;
  }catch(error){try{await this.commands.abort(tenant,ref);if(admission)await this.peers.settle(tenant,ref,admission.admission_id);}catch{/* Identity drain and command recovery retain exact proof. */}throw error;}
 }
 private async read(c:PoolConnection,input:OwnerCommandRequest,policy:OwnerExternalReadPolicy,message:boolean){
  const tenant=input.tenant_id,q=input.payload,id=q.id as string|undefined,messageId=q.messageId as string|undefined,detail=message?!!messageId:!!id,limit=Number(q.limit??50);
  const binding={tenant,policy:policy.policy_key,kind:message?'messages':'conversations',parent:message?id:null};
  let position:{time:string;id:string}|undefined;
  if(q.cursor!==undefined){try{
   const [raw,sig,...rest]=(q.cursor as string).split('.'),expected=createHmac('sha256',this.cursorKey).update(raw!).digest('base64url');
   if(rest.length||!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw Error();
   const decoded=JSON.parse(Buffer.from(raw!,'base64url').toString());
   if(ownerCanonical(decoded.binding)!==ownerCanonical(binding)||!uuid(decoded.position?.id)||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(decoded.position.time))throw Error();position=decoded.position;
  }catch{throw new OwnerDomainError('INVALID_CURSOR',input.correlation_id);}}
  const params:string[]=[tenant];let where='';
  // Parent and message policies are independent AND predicates, including team shares.
  for(const grant of policy.predicates){if(grant.all)continue;if(!grant.team_ids.length){where+=' AND 1=0';continue;}
   const marks=grant.team_ids.map(()=>'?').join(',');where+=` AND (r.team_id IN (${marks}) OR EXISTS(SELECT 1 FROM record_team_access a WHERE a.tenant_id=r.tenant_id AND a.record_id=r.id AND a.team_id IN (${marks})))`;params.push(...grant.team_ids,...grant.team_ids);
  }
  if(id){where+=' AND c.record_id=?';params.push(id);}
  const from='FROM conversation c JOIN crm_record r ON r.tenant_id=c.tenant_id AND r.id=c.record_id';
  if(message){const [parent]=await c.execute<RowDataPacket[]>(`SELECT c.record_id ${from} WHERE c.tenant_id=? AND r.archived_at IS NULL${where} LIMIT 1`,params);if(!parent.length)ownerFail('NOT_FOUND');}
  if(messageId){where+=' AND m.id=?';params.push(messageId);}
  const time=message?'m.received_at':'c.opened_at',key=message?'m.id':'c.record_id';
  if(position){where+=` AND (${time}>? OR (${time}=? AND ${key}>?))`;params.push(position.time,position.time,position.id);}
  const columns=message?'m.id,m.conversation_id,m.direction,m.status,m.occurred_at,m.received_at,m.text':'c.record_id id,r.version,c.status,c.opened_at,c.closed_at,c.contact_id,r.team_id,r.owner_principal_id';
  const [rows]=await c.execute<RowDataPacket[]>(`SELECT ${columns},DATE_FORMAT(${time},'%Y-%m-%d %H:%i:%s.%f') position_time ${from}${message?' JOIN message m ON m.tenant_id=c.tenant_id AND m.conversation_id=c.record_id':''} WHERE c.tenant_id=? AND r.archived_at IS NULL${where} ORDER BY ${time},${key} LIMIT ${detail?1:limit+1}`,params);
  if(detail&&!rows.length)ownerFail('NOT_FOUND');
  const shape=(row:RowDataPacket)=>({id:row.id,...(message?{conversation_id:row.conversation_id}:{version:String(row.version)}),properties:Object.fromEntries(policy.admission.allowed_fields.map(f=>[f,f.endsWith('_at')?stamp(row[f]):row[f]]))});
  if(detail)return {data:shape(rows[0]!)};
  let cursor:string|null=null;
  if(rows.length>limit){const row=rows[limit-1]!,raw=Buffer.from(JSON.stringify({binding,position:{time:row.position_time,id:row.id}})).toString('base64url');cursor=raw+'.'+createHmac('sha256',this.cursorKey).update(raw).digest('base64url');}
  return {data:rows.slice(0,limit).map(shape),next_cursor:cursor};
 }
}
export function chatExternalReadRoutes(reads:ChatExternalReads):Record<string,WorkloadRoute>{
 return {'/internal/v1/owners/chat/external-prepare':ownerRoute('chat','external-prepare',['bff'],r=>{const input=r.payload as unknown as OwnerCommandRequest;if(input.tenant_id!==r.tenant_id)ownerFail('FORBIDDEN');return reads.prepare(input);}),
  ...Object.fromEntries(externalReadOperations.map(operation=>['/internal/v1/owners/chat/'+operation,ownerRoute('chat',operation,['bff'],r=>reads.execute(r as OwnerCommandRequest))]))};
}
