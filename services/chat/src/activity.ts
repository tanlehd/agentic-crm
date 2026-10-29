import {createCipheriv,createDecipheriv,createHash,randomBytes,randomUUID} from 'node:crypto';
import {Ajv} from 'ajv';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {messageContentSchema,type MessageContent,type OwnerAdmission,type OwnerActivityPolicy,type OwnerCommandBinding,type OwnerCommandRef} from '@agentic-crm/contracts';
import {ownerCanonical,ownerDigest,ownerFail,OwnerDomainError,ownerRoute,validateOwnerValue,type OwnerCommandRequest,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';
import {recordSnapshot,type RecordPeers} from './record-action.js';

type State='ready'|'delayed'|'unavailable';
type Batch={command:OwnerCommandRef;admission_id:string;ids:string[];limit:number};
type Notes={policy_digest:string;state:State;data:{activity_id:string;body?:string|null}[]};
type Runs={policy_digest:string;state:State;data:{run_id:string;definition_version_id:string;revision:string}[]};
type Peers=RecordPeers&{
 policy(tenant:string,command:OwnerCommandRef,admission:string):Promise<OwnerActivityPolicy>;
 notes(tenant:string,input:Batch):Promise<Notes>;runs(tenant:string,input:Batch):Promise<Runs>;
 platform(tenant:string,connection:string):Promise<{connection_id:string;platform:'mock_messenger'}>;
};
const stamp=(v:unknown)=>v==null?null:v instanceof Date?v.toISOString():new Date(String(v).replace(' ','T').replace(/Z?$/,'Z')).toISOString();
const contentValidator=new Ajv({strict:true}).compile<MessageContent>(messageContentSchema);
const operation='workspace-get-activity';
export class ChatActivityCursor{
 private readonly key:Buffer;
 constructor(secret:string|Buffer){if(Buffer.byteLength(secret)<32)throw Error('CHAT_RETAINED_CURSOR_KEY_REQUIRED');this.key=createHash('sha256').update(secret).digest();}
 encode(binding:string,seq:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.key,iv),body=Buffer.concat([cipher.update(JSON.stringify({binding,seq,exp:Date.now()+300000})),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64url');}
 decode(token:unknown,binding:string,correlation:string){let value:{seq:string;exp:number;binding:string};try{
  if(typeof token!=='string'||token.length>4096)throw Error();const b=Buffer.from(token,'base64url'),dec=createDecipheriv('aes-256-gcm',this.key,b.subarray(0,12));dec.setAuthTag(b.subarray(12,28));value=JSON.parse(Buffer.concat([dec.update(b.subarray(28)),dec.final()]).toString());
  if(typeof value.seq!=='string'||!/^(0|[1-9][0-9]{0,19})$/.test(value.seq)||BigInt(value.seq)>18446744073709551615n||!Number.isFinite(value.exp))throw Error();
 }catch{throw new OwnerDomainError('INVALID_CURSOR',correlation);}if(value.exp<Date.now())throw new OwnerDomainError('CURSOR_EXPIRED',correlation);if(value.binding!==binding)throw new OwnerDomainError('QUERY_CHANGED',correlation);return value.seq;}
}
/** Local index and delivery fence; all foreign sources are fetched outside Chat transactions. */
export class ChatActivity{
 private readonly cursor:ChatActivityCursor;
 constructor(private readonly commands:ChatOwnerCommands,private readonly peers:Peers,key:string|Buffer){this.cursor=new ChatActivityCursor(key);}
 private async snapshot(c:PoolConnection,tenant:string,id:string){
  const record=await recordSnapshot(c,tenant,id),[[row]]=await c.execute<RowDataPacket[]>('SELECT contact_id,connection_id FROM conversation WHERE tenant_id=? AND record_id=?',[tenant,id]);
  const [[counter]]=await c.execute<RowDataPacket[]>('SELECT last_seq,backfilled FROM conversation_activity_counter WHERE tenant_id=? AND conversation_id=?',[tenant,id]);
  const [[flag]]=await c.execute<RowDataPacket[]>("SELECT state FROM chat_workspace_rollout WHERE tenant_id=? AND feature_key='activity_v1'",[tenant]);
  return {...record,projection:{contact_id:String(row!.contact_id),connection_id:String(row!.connection_id)},last_seq:String(counter?.last_seq??'0'),backfilled:Boolean(counter?.backfilled),enabled:!flag||flag.state==='ready'};
 }
 private async message(c:PoolConnection,tenant:string,id:string,message:string,connection:string,text:boolean,platform:'mock_messenger'){
  const [[row]]=await c.execute<RowDataPacket[]>(`SELECT id,conversation_id,direction,${text?'text,':''}status,provider_message_id,outbound_intent_id,occurred_at,received_at FROM message WHERE tenant_id=? AND conversation_id=? AND id=?`,[tenant,id,message]);if(!row)return null;
  const [[stored]]=await c.execute<RowDataPacket[]>('SELECT content FROM message_content WHERE tenant_id=? AND message_id=?',[tenant,message]);
  let content:MessageContent|undefined;if(stored){const value=typeof stored.content==='string'?JSON.parse(stored.content):stored.content;if(!contentValidator(value))ownerFail('DEPENDENCY_UNAVAILABLE');content=value;}
  const {provider_message_id,...wire}=row,envelope:Record<string,unknown>={...wire,occurred_at:stamp(row.occurred_at),received_at:stamp(row.received_at),schema_version:3,connection_id:connection,platform,message_type:content?.message_type??'text',external_msg_id:provider_message_id,text_source:content&&content.message_type!=='text'?content.text_source??'preview':'original'};
  if(text){let reply=null;if(content?.reply_to){const [[target]]=await c.execute<RowDataPacket[]>('SELECT id FROM message WHERE tenant_id=? AND connection_id=? AND conversation_id=? AND provider_message_id=? AND id<>?',[tenant,connection,id,content.reply_to.external_msg_id,message]);reply={external_msg_id:content.reply_to.external_msg_id,internal_message_id:target?.id??null};}Object.assign(envelope,{reply_to:reply,attachment:content?.attachment??null});}
  const [[w]]=await c.execute<RowDataPacket[]>('SELECT inbound_seq FROM message_workspace WHERE tenant_id=? AND message_id=?',[tenant,message]);return {message_id:message,envelope,inbound_seq:w?.inbound_seq==null?null:String(w.inbound_seq)};
 }
 async read(raw:OwnerCommandRequest){
  if(raw.operation!==operation)ownerFail('INVALID_REQUEST');const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-'+operation,raw);if(input.actor.kind!=='human')ownerFail('FORBIDDEN');
  const tenant=input.tenant_id,id=input.payload.id as string,q=input.payload,limit=Number(q.limit??50),forward=q.after!==undefined;
  if(q.before!==undefined&&forward||!Number.isInteger(limit)||limit<1||limit>100)ownerFail('INVALID_REQUEST');
  const snapshot=await this.commands.transaction(tenant,c=>this.snapshot(c,tenant,id));if(!snapshot.enabled)throw new OwnerDomainError('CAPABILITY_UNAVAILABLE',input.correlation_id);
  const command=randomUUID(),request={payload:q},fields=['tags','text'];
  const b:OwnerCommandBinding={tenant_id:tenant,command_id:command,owner:'chat',operation,actor:input.actor,resource:snapshot.resource,projection:snapshot.projection,target:null,session_id:null,fields,payload_digest:ownerDigest(request),legacy_receipt_key:'activity:'+command,graph:null,dependencies:[]};
  const prepared=await this.commands.prepare(b,request),ref={command_id:command,binding_digest:prepared.binding_digest};let admission:OwnerAdmission|undefined;
  try{
   admission=validateOwnerValue<OwnerAdmission>('OwnerAdmission',await this.peers.admit(tenant,ref));if(admission.state!=='admitted'||admission.command_id!==command||admission.binding_digest!==ref.binding_digest||admission.allowed_fields.some(f=>!fields.includes(f)))ownerFail('FORBIDDEN');await this.commands.rememberDependency(tenant,ref,'identity-admission',admission);
   const policy=validateOwnerValue<OwnerActivityPolicy>('OwnerActivityPolicy',await this.peers.policy(tenant,ref,admission.admission_id));if(policy.principal_id!==input.actor.principal_id||policy.auth_revision!==admission.auth_revision||ownerCanonical(policy.allowed_fields)!==ownerCanonical(admission.allowed_fields))ownerFail('FORBIDDEN');
   const binding=ownerDigest({version:1,tenant,id,policy}),position=q.after!==undefined?this.cursor.decode(q.after,binding,input.correlation_id):q.before!==undefined?this.cursor.decode(q.before,binding,input.correlation_id):'18446744073709551615';
   const rows=await this.commands.transaction(tenant,async c=>{
    if(ownerCanonical(await this.snapshot(c,tenant,id))!==ownerCanonical(snapshot))ownerFail('STALE_VERSION');
    const [rows]=await c.execute<RowDataPacket[]>(`SELECT * FROM conversation_activity WHERE tenant_id=? AND conversation_id=? AND activity_seq${forward?'>':'<'}? ORDER BY activity_seq ${forward?'ASC':'DESC'} LIMIT 2001`,[tenant,id,position]);return rows;
   });
   const scan=rows.slice(0,2000),batch=(kind:string):Batch=>({command:ref,admission_id:admission!.admission_id,ids:[...new Set(scan.filter(r=>r.kind===kind).map(r=>String(r.source_id)))],limit});
   // Calls return at most the first limit visible source IDs in scan order, even across 2000 hidden references.
   const [notes,runs,platform]=await Promise.allSettled([this.peers.notes(tenant,batch('note')),this.peers.runs(tenant,batch('automation')),scan.some(r=>r.kind==='message')?this.peers.platform(tenant,snapshot.projection.connection_id):Promise.resolve(null)]);
   if(runs.status==='fulfilled'&&runs.value.policy_digest!==ownerDigest(policy))ownerFail('REVOKED');
   if(notes.status==='fulfilled'&&notes.value.policy_digest!==policy.note_policy_digest)ownerFail('REVOKED');
   if(platform.status==='fulfilled'&&platform.value&&(platform.value.connection_id!==snapshot.projection.connection_id||platform.value.platform!=='mock_messenger'))ownerFail('FORBIDDEN');
   const noteMap=new Map(notes.status==='fulfilled'?notes.value.data.map(r=>[r.activity_id,r]):[]),runMap=new Map(runs.status==='fulfilled'?runs.value.data.map(r=>[r.run_id,r]):[]);
   if(ownerCanonical(await this.peers.policy(tenant,ref,admission.admission_id))!==ownerCanonical(policy))ownerFail('REVOKED');
   let result:Record<string,unknown>|undefined;
   await this.commands.commit(tenant,ref,admission.admission_id,async c=>{
    if(ownerCanonical(await this.snapshot(c,tenant,id))!==ownerCanonical(snapshot))ownerFail('STALE_VERSION');
    const states:Record<string,State>={chat:platform.status==='rejected'?'unavailable':'ready',crm:notes.status==='fulfilled'?notes.value.state:'unavailable',workflow:runs.status==='fulfilled'?runs.value.state:'unavailable'};
    const data:Record<string,unknown>[]= [];let pos=position,high=forward?position:'0',scanned=0;
    for(const r of scan){pos=String(r.activity_seq);scanned++;if(BigInt(pos)>BigInt(high))high=pos;let payload:unknown=typeof r.payload==='string'?JSON.parse(r.payload):r.payload;
     if(r.kind==='note'){const note=noteMap.get(r.source_id);payload=note?{activity_id:note.activity_id,...(typeof note.body==='string'?{body:note.body}:{})}:null;}
     if(r.kind==='automation'){const run=runMap.get(r.source_id),p=payload as Record<string,unknown>;if(!policy.automation_read||r.source_service!=='workflow'||!run||run.definition_version_id!==p.definition_version_id||BigInt(run.revision)<BigInt(r.source_revision))payload=null;}
     if(r.kind==='tags'&&!policy.allowed_fields.includes('tags'))payload=null;
     if(r.kind==='message'){try{payload=platform.status==='fulfilled'&&platform.value?await this.message(c,tenant,id,r.source_id,snapshot.projection.connection_id,policy.allowed_fields.includes('text'),platform.value.platform):null;}catch{states.chat='unavailable';payload=null;}}
     if(payload)data.push({id:r.id,kind:r.kind,occurred_at:stamp(r.occurred_at),recorded_at:stamp(r.recorded_at),actor:r.actor_id?{kind:r.actor_kind,id:r.actor_id}:null,source_ref:{service:r.source_service,kind:r.source_kind,id:r.source_id,revision:String(r.source_revision)},payload});
     if(data.length>=limit)break;
    }
    if(!forward)data.reverse();const hasMore=rows.length>scanned;
    const [[due]]=await c.execute<RowDataPacket[]>('SELECT conversation_id FROM conversation_snooze WHERE tenant_id=? AND conversation_id=? AND until_at<=UTC_TIMESTAMP(6)',[tenant,id]);if(due&&states.chat==='ready')states.chat='delayed';
    const [observed]=await c.execute<RowDataPacket[]>('SELECT source_service,MAX(recorded_at) observed FROM conversation_activity WHERE tenant_id=? AND conversation_id=? GROUP BY source_service',[tenant,id]);
    const sources=['chat','crm','workflow'].map(service=>({service,state:states[service],last_observed_at:stamp(observed.find(r=>r.source_service===service)?.observed)}));
    result={data,older_cursor:!forward&&hasMore?this.cursor.encode(binding,pos):null,newer_cursor:this.cursor.encode(binding,high),has_more:hasMore,meta:{state:!snapshot.backfilled?'backfilling':sources.some(s=>s.state!=='ready')?'partial':'ready',as_of:new Date().toISOString(),sources,correlation_id:input.correlation_id}};
    validateOwnerValue('Reply_chat-'+operation,{schema_version:1,request_id:input.request_id,tenant_id:tenant,result});return {effect_id:id,effect_revision:snapshot.resource.record_version};
   });
   await this.peers.settle(tenant,ref,admission.admission_id);return result!;
  }catch(error){try{await this.commands.abort(tenant,ref);if(admission)await this.peers.settle(tenant,ref,admission.admission_id);}catch{/* Native Identity drain retains terminal recovery ownership. */}throw error;}
 }
}
export function chatActivityRoutes(activity:ChatActivity):Record<string,WorkloadRoute>{return {'/internal/v1/owners/chat/workspace-get-activity':ownerRoute('chat',operation,['bff'],r=>activity.read(r as OwnerCommandRequest))};}
