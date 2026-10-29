import { writeChatOutbox } from './event-store.js';
import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerAdmission,OwnerCommandBinding,OwnerCommandRef} from '@agentic-crm/contracts';
import {ownerCanonical,ownerDigest,ownerFail,ownerRoute,OwnerDomainError,validateOwnerValue,type OwnerCommandRequest,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';
import type {RecordPeers} from './record-action.js';

type Target={kind:'principal'|'team';id:string};
type Policy={principal_id:string;auth_revision:string;team_ids:string[];can_manage_own:boolean;can_manage_all:boolean;can_share_own:boolean;filter_fields:string[];directory:{teams:{id:string;name:string}[];principals:{id:string;name:string}[]}|null};
type Peers=RecordPeers&{policy(tenant:string,ref:OwnerCommandRef,admission:string):Promise<Policy>;connection(tenant:string,id:string):Promise<{connection_id:string}>};
export const inboxOperations=['catalog-inbox-options','catalog-list-inboxes','catalog-create-inbox','catalog-get-inbox','catalog-patch-inbox','catalog-delete-inbox','catalog-inbox-shares'] as const;
const parse=(v:any):any=>typeof v==='string'?JSON.parse(v):v;
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
const sorts=['latest_message_desc','latest_message_asc','waiting_longest'];
function receiptRoute(input:OwnerCommandRequest){return `${input.operation==='catalog-create-inbox'?'create':input.operation==='catalog-inbox-shares'?'shares':input.operation==='catalog-delete-inbox'?'archive':'update'} /api/v1/chat-workspace/inboxes/${input.payload.id??''}`;}
function predicate(input:unknown):Record<string,any>{
 if(!input||typeof input!=='object'||Array.isArray(input))ownerFail('INVALID_REQUEST');const raw=input as Record<string,any>;
 if(Object.keys(raw).some(k=>!['scope','team_id','status','snooze','unread','channel','channel_id','tag_ids'].includes(k)))ownerFail('INVALID_REQUEST');
 const p:Record<string,any>={scope:'all',status:['open','pending'],snooze:'exclude',unread:'any',...raw};
 if(!['all','mine','unassigned','team'].includes(p.scope)||!Array.isArray(p.status)||!p.status.length||p.status.length>3||p.status.some((v:unknown)=>!['open','pending','closed'].includes(String(v)))||new Set(p.status).size!==p.status.length||!['exclude','include','only'].includes(p.snooze)||!['any','only'].includes(p.unread)||p.scope==='team'&&!uuid(p.team_id)||p.team_id!==undefined&&(p.scope!=='team'||!uuid(p.team_id))||p.channel!==undefined&&!['messenger','mock_messenger'].includes(p.channel)||p.channel_id!==undefined&&!uuid(p.channel_id)||p.tag_ids!==undefined&&(!Array.isArray(p.tag_ids)||p.tag_ids.length>10||p.tag_ids.some((v:unknown)=>!uuid(v))||new Set(p.tag_ids).size!==p.tag_ids.length))ownerFail('INVALID_REQUEST');
 return {...p,status:[...p.status].sort(),...(p.tag_ids?{tag_ids:[...p.tag_ids].sort()}:{})};
}
function targets(raw:unknown):Target[]{
 if(!Array.isArray(raw)||raw.length>50||raw.some(v=>!v||typeof v!=='object'||Object.keys(v).sort().join(',')!=='id,kind'||!['principal','team'].includes(v.kind)||!uuid(v.id)))ownerFail('INVALID_REQUEST');
 const result=raw as Target[];if(new Set(result.map(t=>t.kind+':'+t.id)).size!==result.length)ownerFail('INVALID_REQUEST');return [...result].sort((a,b)=>(a.kind+a.id).localeCompare(b.kind+b.id));
}
export class ChatInboxes{
 private readonly key:Buffer;
 constructor(private readonly commands:ChatOwnerCommands,private readonly peers:Peers,key:string|Buffer){this.key=Buffer.from(key);if(this.key.length<32)throw new Error('CHAT_CATALOG_CURSOR_KEY_REQUIRED');}
 private manages(p:Policy,r:RowDataPacket){return p.can_manage_all||r.creator_principal_id===p.principal_id&&p.can_manage_own;}
 private shares(c:PoolConnection,tenant:string,id:string){return c.execute<RowDataPacket[]>('SELECT target_kind kind,target_id id FROM chat_inbox_share WHERE tenant_id=? AND inbox_id=? ORDER BY target_kind,target_id',[tenant,id]).then(([rows])=>rows as unknown as Target[]);}
 private visible(p:Policy,r:RowDataPacket,shares:Target[],manager=true){return r.creator_principal_id===p.principal_id||manager&&p.can_manage_all||shares.some(t=>t.kind==='principal'?t.id===p.principal_id:p.team_ids.includes(t.id));}
 private async project(c:PoolConnection,tenant:string,p:Policy,r:RowDataPacket){
  const allowed_actions=this.manages(p,r)?['update','archive']:[];if(r.creator_principal_id===p.principal_id&&p.can_share_own)allowed_actions.push('share');if(p.can_manage_all)allowed_actions.push('transfer');
  return {id:r.id,version:String(r.version),archived:!!r.archived_at,allowed_actions,name:r.name,creator_principal_id:r.creator_principal_id,predicate_schema_version:1,predicate:parse(r.predicate),sort:r.sort,shared:r.creator_principal_id!==p.principal_id,...(r.creator_principal_id===p.principal_id||p.can_manage_all?{shares:await this.shares(c,tenant,r.id)}:{})};
 }
 private signature(raw:string){return createHmac('sha256',this.key).update(raw).digest('base64url');}
 private async list(c:PoolConnection,input:OwnerCommandRequest,p:Policy){
  const limit=Number(input.payload.limit??50),group=input.payload.group??'all';if(!Number.isInteger(limit)||limit<1||limit>100||!['all','by_me','by_others'].includes(String(group)))ownerFail('INVALID_REQUEST');
  const binding=createHmac('sha256',this.key).update(ownerCanonical({version:2,tenant:input.tenant_id,policy:{...p,directory:null},kind:'inboxes',limit,group})).digest('hex');let after='';
  if(input.payload.cursor!==undefined){let decoded:any;try{const token=input.payload.cursor;if(typeof token!=='string'||token.length>4096)throw new Error();const [raw,sig,...rest]=token.split('.'),expected=this.signature(raw!);if(rest.length||!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw new Error();decoded=JSON.parse(Buffer.from(raw!,'base64url').toString());if(!uuid(decoded.id)||!Number.isFinite(decoded.exp))throw new Error();}catch{throw new OwnerDomainError('INVALID_CURSOR',input.correlation_id);}if(decoded.exp<Date.now())throw new OwnerDomainError('CURSOR_EXPIRED',input.correlation_id);if(decoded.binding!==binding)throw new OwnerDomainError('QUERY_CHANGED',input.correlation_id);after=decoded.id;}
  const chosen:RowDataPacket[]=[];
  for(;;){const [rows]=await c.execute<RowDataPacket[]>('SELECT * FROM chat_inbox WHERE tenant_id=? AND archived_at IS NULL AND id>? ORDER BY id LIMIT 100',[input.tenant_id,after]);
   for(const row of rows){if(!this.visible(p,row,await this.shares(c,input.tenant_id,row.id),false)||group==='by_me'&&row.creator_principal_id!==p.principal_id||group==='by_others'&&row.creator_principal_id===p.principal_id)continue;chosen.push(row);if(chosen.length>limit)break;}
   if(chosen.length>limit||rows.length<100)break;after=rows.at(-1)!.id;
  }
  const data=[];for(const row of chosen.slice(0,limit))data.push(await this.project(c,input.tenant_id,p,row));
  const raw=Buffer.from(JSON.stringify({binding,id:chosen[limit-1]?.id,exp:Date.now()+300000})).toString('base64url');
  return {data,next_cursor:chosen.length>limit?raw+'.'+this.signature(raw):null,meta:{as_of:new Date().toISOString(),correlation_id:input.correlation_id,allowed_actions:p.can_manage_own||p.can_manage_all?['create']:[]}};
 }
 async execute(raw:OwnerCommandRequest){
  if(!(inboxOperations as readonly string[]).includes(raw.operation))ownerFail('INVALID_REQUEST');
  const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-'+raw.operation,raw);if(input.actor.kind!=='human')ownerFail('FORBIDDEN');
  const op=input.operation,tenant=input.tenant_id,creating=op==='catalog-create-inbox',sharing=op==='catalog-inbox-shares',reading=['catalog-inbox-options','catalog-list-inboxes','catalog-get-inbox'].includes(op),body=(input.payload.body??{}) as Record<string,any>;
  if(!reading&&!/^[\x21-\x7e]{1,128}$/.test(String(input.payload.idempotency_key)))ownerFail('INVALID_REQUEST');
  const saved=creating||body.predicate!==undefined?predicate(body.predicate):undefined;
  if(saved&&body.predicate_schema_version!==1||!saved&&body.predicate_schema_version!==undefined)ownerFail('INVALID_REQUEST');
  const share=creating||sharing?targets(body.shares):undefined;
  // A retained receipt may outlive its original reference targets. This is only a
  // replay hint: commit rechecks the receipt and current resource rights below.
  const replaying=!reading&&await this.commands.transaction(tenant,async c=>{
   const [[receipt]]=await c.execute<RowDataPacket[]>("SELECT status FROM idempotency_record WHERE tenant_id=? AND actor_kind='human' AND actor_id=? AND route_key=? AND `key`=?",[tenant,input.actor.principal_id,receiptRoute(input),input.payload.idempotency_key as string]);return receipt?.status==='completed';
  });
  const refs:Target[]=[...(share??[]),...(saved?.team_id?[{kind:'team' as const,id:saved.team_id}]:[]),...(body.creator_principal_id?[{kind:'principal' as const,id:body.creator_principal_id}]:[])];
  const fields=saved?['status',...(['mine','unassigned'].includes(saved.scope)?['owner_principal_id']:[]),...(saved.team_id?['team_id']:[]),...(saved.channel?['channel']:[]),...(saved.channel_id?['channel_id']:[]),...(saved.tag_ids?['tags']:[])]:[];
  const command=randomUUID(),request={payload:input.payload},binding:OwnerCommandBinding={tenant_id:tenant,command_id:command,owner:'chat',operation:op,actor:input.actor,resource:{resource_id:tenant,object_key:'chat_inbox_catalog',record_version:'0',owner_revision:'0',control_revision:'0',owner_principal_id:null,team_id:null,shared_team_ids:[],archived:false},target:null,session_id:null,fields:[],payload_digest:ownerDigest(request),legacy_receipt_key:'inbox:'+command,graph:null,dependencies:[],inbox_inputs:{targets:replaying?[]:refs,filter_fields:replaying?[]:fields}};
  const prepared=await this.commands.prepare(binding,request),ref={command_id:command,binding_digest:prepared.binding_digest};let admission:OwnerAdmission|undefined;
  try{
   admission=validateOwnerValue<OwnerAdmission>('OwnerAdmission',await this.peers.admit(tenant,ref));if(admission.state!=='admitted'||admission.command_id!==command||admission.binding_digest!==ref.binding_digest||admission.allowed_fields.length)ownerFail('FORBIDDEN');await this.commands.rememberDependency(tenant,ref,'identity-admission',admission);
   const policy=await this.peers.policy(tenant,ref,admission.admission_id);validateOwnerValue('Reply_identity-admission-inbox-policy',{schema_version:1,request_id:input.request_id,tenant_id:tenant,result:policy});if(policy.principal_id!==input.actor.principal_id||policy.auth_revision!==admission.auth_revision)ownerFail('FORBIDDEN');
   if(!replaying&&saved?.channel_id&&(await this.peers.connection(tenant,saved.channel_id)).connection_id!==saved.channel_id)ownerFail('REFERENCE_INVALID');
   let result:Record<string,unknown>|undefined;
   await this.commands.commit(tenant,ref,admission.admission_id,async c=>{
    if(op==='catalog-inbox-options'){if(!policy.directory)ownerFail('DEPENDENCY_UNAVAILABLE');result={data:{filter_fields:policy.filter_fields,can_share:policy.can_share_own,...policy.directory},meta:{as_of:new Date().toISOString(),correlation_id:input.correlation_id}};}
    else if(op==='catalog-list-inboxes')result=await this.list(c,input,policy);
    else if(op==='catalog-get-inbox'){const row=await this.row(c,tenant,input.payload.id as string,policy,false);result={data:await this.project(c,tenant,policy,row),meta:{as_of:new Date().toISOString(),correlation_id:input.correlation_id}};}
    else result=await this.mutate(c,input,policy,saved,share,replaying);
    validateOwnerValue('Reply_chat-'+op,{schema_version:1,request_id:input.request_id,tenant_id:tenant,result});const data=result!.data as Record<string,unknown>|unknown[];
    return {effect_id:!Array.isArray(data)&&typeof data.id==='string'?data.id:tenant,effect_revision:!Array.isArray(data)&&typeof data.version==='string'?data.version:'1'};
   },!reading);
   await this.peers.settle(tenant,ref,admission.admission_id);return result!;
  }catch(error){try{await this.commands.abort(tenant,ref);if(admission)await this.peers.settle(tenant,ref,admission.admission_id);}catch{/* Durable owner proof supports Identity recovery. */}throw error;}
 }
 private async row(c:PoolConnection,tenant:string,id:string,p:Policy,archived:boolean){const [[row]]=await c.execute<RowDataPacket[]>('SELECT * FROM chat_inbox WHERE tenant_id=? AND id=? FOR UPDATE',[tenant,id]);if(!row||!archived&&row.archived_at||!this.visible(p,row,await this.shares(c,tenant,id)))ownerFail('NOT_FOUND');return row;}
 private async mutate(c:PoolConnection,input:OwnerCommandRequest,p:Policy,saved:Record<string,any>|undefined,share:Target[]|undefined,replaying:boolean){
  const op=input.operation,tenant=input.tenant_id,creating=op==='catalog-create-inbox',sharing=op==='catalog-inbox-shares',archive=op==='catalog-delete-inbox',body=input.payload.body as Record<string,any>,id=input.payload.id as string|undefined,version=input.payload.expected_version??null;
  let row=creating?undefined:await this.row(c,tenant,id!,p,true);
  if(creating?!p.can_manage_own&&!p.can_manage_all:!this.manages(p,row!))ownerFail('FORBIDDEN');
  const canShare=(r?:RowDataPacket)=>p.can_share_own&&(!r||r.creator_principal_id===p.principal_id);
  if((sharing||creating&&share!.length>0)&&!canShare(row))ownerFail('FORBIDDEN');
  const route=receiptRoute(input),key=input.payload.idempotency_key as string,digest=ownerDigest({body,version});
  const [[receipt]]=await c.execute<RowDataPacket[]>("SELECT request_hash,status,response_body FROM idempotency_record WHERE tenant_id=? AND actor_kind='human' AND actor_id=? AND route_key=? AND `key`=? FOR UPDATE",[tenant,p.principal_id,route,key]);
  if(receipt){if(receipt.request_hash!==digest&&!(version!==null&&receipt.request_hash===ownerDigest({body,version:'"'+version+'"'})))throw new OwnerDomainError('IDEMPOTENCY_CONFLICT',input.correlation_id);if(receipt.status!=='completed')ownerFail('DEPENDENCY_UNAVAILABLE');const result=parse(receipt.response_body),target=await this.row(c,tenant,result.data.id,p,true);if(!this.manages(p,target)||(sharing||creating&&share!.length>0)&&!canShare(target))ownerFail('FORBIDDEN');return result;}
  if(replaying)ownerFail('DEPENDENCY_UNAVAILABLE');
  if(!creating){if(version===null)ownerFail('PRECONDITION_REQUIRED');if(String(row!.version)!==version)throw new OwnerDomainError('VERSION_CONFLICT',input.correlation_id);if(row!.archived_at)throw new OwnerDomainError('ARCHIVED',input.correlation_id);}
  const values:Record<string,string|Date>={};let operation=creating?'created':archive?'archived':sharing?'shared':'updated';
  if(archive)values.archived_at=new Date();else if(!sharing){
   if(creating||body.name!==undefined){if(typeof body.name!=='string'||!body.name.trim()||body.name.trim().length>80)ownerFail('INVALID_REQUEST');values.name=body.name.trim();}
   if(saved){
    if(saved.snooze==='only'){const [[rollout]]=await c.execute<RowDataPacket[]>("SELECT state FROM chat_workspace_rollout WHERE tenant_id=? AND feature_key='snooze_v1'",[tenant]);if(rollout&&rollout.state!=='ready')throw new OwnerDomainError('CAPABILITY_UNAVAILABLE',input.correlation_id);}
    for(const tag of saved.tag_ids??[])if(!(await c.execute<RowDataPacket[]>('SELECT id FROM conversation_tag WHERE tenant_id=? AND id=? FOR SHARE',[tenant,tag]))[0].length)ownerFail('NOT_FOUND');values.predicate=ownerCanonical(saved);
   }
   if(creating||body.sort!==undefined){if(!sorts.includes(body.sort))ownerFail('INVALID_REQUEST');values.sort=body.sort;}
   if(creating)values.creator_principal_id=p.principal_id;
   else if(body.creator_principal_id!==undefined){if(!p.can_manage_all||!uuid(body.creator_principal_id))ownerFail('FORBIDDEN');values.creator_principal_id=body.creator_principal_id;operation='transferred';}
   if(values.creator_principal_id){
    // Commit acquired the tenant inbox mutex before beginning its snapshot; quota checks serialize.
    const [[count]]=await c.execute<RowDataPacket[]>('SELECT COUNT(*) n FROM chat_inbox WHERE tenant_id=? AND creator_principal_id=? AND archived_at IS NULL AND id<>?',[tenant,values.creator_principal_id,id??'']);if(Number(count!.n)>=50)throw new OwnerDomainError('INBOX_QUOTA',input.correlation_id);
   }
  }
  if(!creating&&!sharing&&!Object.keys(values).length)ownerFail('INVALID_REQUEST');const target=id??randomUUID(),keys=Object.keys(values);
  if(creating)await c.execute(`INSERT INTO chat_inbox(tenant_id,id,${keys.map(k=>'`'+k+'`').join(',')},created_at,updated_at) VALUES (?,?,${keys.map(()=>'?').join(',')},UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,[tenant,target,...Object.values(values)]);
  else await c.execute(`UPDATE chat_inbox SET ${keys.map(k=>'`'+k+'`=?').join(',')}${keys.length?',':''}version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?`,[...Object.values(values),tenant,target]);
  if(share){await c.execute('DELETE FROM chat_inbox_share WHERE tenant_id=? AND inbox_id=?',[tenant,target]);for(const t of share)await c.execute('INSERT INTO chat_inbox_share(tenant_id,inbox_id,target_kind,target_id,created_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6))',[tenant,target,t.kind,t.id]);}
  [[row]]=await c.execute<RowDataPacket[]>('SELECT * FROM chat_inbox WHERE tenant_id=? AND id=?',[tenant,target]);
  await c.execute("INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,correlation_id,occurred_at,created_at) VALUES (?,?,'human',?,?,'chat_inbox',?,'accepted',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),tenant,p.principal_id,operation,target,ownerCanonical(Object.keys(body)),input.correlation_id]);
  await writeChatOutbox(c, "INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,'chat.inbox.changed',1,'chat_inbox',?,?,?,?,'human',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')",[randomUUID(),tenant,target,String(row!.version),ownerCanonical({inbox_id:target,operation}),input.correlation_id,p.principal_id]);
  const result={data:archive?{id:target,archived:true}:await this.project(c,tenant,p,row!),meta:{correlation_id:input.correlation_id}};
  await c.execute("INSERT INTO idempotency_record(id,tenant_id,actor_kind,actor_id,route_key,`key`,request_hash,status,response_status,response_body,created_at,updated_at,expires_at) VALUES (?,?,'human',?,?,?,?,'completed',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),TIMESTAMPADD(DAY,7,UTC_TIMESTAMP(6)))",[randomUUID(),tenant,p.principal_id,route,key,digest,creating?201:200,ownerCanonical(result)]);return result;
 }
}
export function chatInboxRoutes(inboxes:ChatInboxes):Record<string,WorkloadRoute>{return Object.fromEntries(inboxOperations.map(operation=>['/internal/v1/owners/chat/'+operation,ownerRoute('chat',operation,['bff'],r=>inboxes.execute(r as OwnerCommandRequest))]));}
