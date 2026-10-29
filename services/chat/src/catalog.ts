import { writeChatOutbox } from './event-store.js';
import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerAdmission,OwnerCommandBinding,OwnerCommandRef} from '@agentic-crm/contracts';
import {ownerCanonical,ownerDigest,ownerFail,ownerRoute,OwnerDomainError,validateOwnerValue,type OwnerCommandRequest,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';
import type {RecordPeers} from './record-action.js';

type Kind='tags'|'snippets';
type Policy={kind:Kind;principal_id:string;auth_revision:string;can_read:boolean;can_manage:boolean};
type Peers=RecordPeers&{policy(tenant:string,ref:OwnerCommandRef,admission:string):Promise<Policy>};
const tables={tags:'conversation_tag',snippets:'chat_snippet'} as const;
export const catalogOperations=['catalog-list-tags','catalog-create-tag','catalog-get-tag','catalog-patch-tag','catalog-delete-tag','catalog-list-snippets','catalog-create-snippet','catalog-get-snippet','catalog-patch-snippet','catalog-delete-snippet'] as const;
const json=(v:any):any=>typeof v==='string'?JSON.parse(v):v;
const normalized=(v:string)=>v.normalize('NFC').toLowerCase();
const text=(v:unknown,max:number)=>{if(typeof v!=='string'||!v.trim()||v.trim().length>max)ownerFail('INVALID_REQUEST');return v.trim();};

/** Tag/snippet definitions are tenant catalogs, never authority to view Conversation records. */
export class ChatCatalog {
 private readonly key:Buffer;
 constructor(private readonly commands:ChatOwnerCommands,private readonly peers:Peers,key:string|Buffer){this.key=Buffer.from(key);if(this.key.length<32)throw new Error('CHAT_CATALOG_CURSOR_KEY_REQUIRED');}
 private project(kind:Kind,row:RowDataPacket,policy:Policy){const common={id:row.id,version:String(row.version),archived:!!row.archived_at,allowed_actions:policy.can_manage?['update','archive']:[]};return kind==='tags'?{...common,name:row.name,color:row.color}:{...common,title:row.title,shortcut:row.shortcut,text:row.text};}
 private signature(payload:string){return createHmac('sha256',this.key).update(payload).digest('base64url');}
 private cursor(token:unknown,binding:string,correlation:string){
  if(token===undefined)return '';let v:any;
  try{if(typeof token!=='string'||token.length>4096)throw new Error();const [p,s,...tail]=token.split('.'),sig=this.signature(p!);if(tail.length||!s||s.length!==sig.length||!timingSafeEqual(Buffer.from(s),Buffer.from(sig)))throw new Error();v=JSON.parse(Buffer.from(p!,'base64url').toString());if(!/^[0-9a-f-]{36}$/.test(v.id)||!Number.isFinite(v.exp))throw new Error();}catch{throw new OwnerDomainError('INVALID_CURSOR',correlation);}
  if(v.exp<Date.now())throw new OwnerDomainError('CURSOR_EXPIRED',correlation);if(v.binding!==binding)throw new OwnerDomainError('QUERY_CHANGED',correlation);return String(v.id);
 }
 private async list(c:PoolConnection,input:OwnerCommandRequest,kind:Kind,policy:Policy){
  const q=input.payload,limit=Number(q.limit??50),prefix=q.q===undefined?'':normalized(text(q.q,80));
  if(!Number.isInteger(limit)||limit<1||limit>100)ownerFail('INVALID_REQUEST');
  const binding=createHmac('sha256',this.key).update(ownerCanonical({version:2,tenant:input.tenant_id,policy,kind,limit,prefix})).digest('hex');
  let after=this.cursor(q.cursor,binding,input.correlation_id);const selected:RowDataPacket[]=[];
  for(;;){
   const [rows]=await c.execute<RowDataPacket[]>(`SELECT * FROM ${tables[kind]} WHERE tenant_id=? AND archived_at IS NULL AND id>? ORDER BY id LIMIT 100`,[input.tenant_id,after]);
   for(const row of rows){if(prefix&&![row.name,row.title,row.shortcut].some(v=>typeof v==='string'&&normalized(v).startsWith(prefix)))continue;selected.push(row);if(selected.length>limit)break;}
   if(selected.length>limit||rows.length<100)break;after=String(rows.at(-1)!.id);
  }
  const p=Buffer.from(JSON.stringify({binding,id:selected[limit-1]?.id,exp:Date.now()+300000})).toString('base64url');
  return {data:selected.slice(0,limit).map(row=>this.project(kind,row,policy)),next_cursor:selected.length>limit?p+'.'+this.signature(p):null,meta:{as_of:new Date().toISOString(),correlation_id:input.correlation_id,allowed_actions:policy.can_manage?['create']:[]}};
 }
 async execute(raw:OwnerCommandRequest){
  if(!(catalogOperations as readonly string[]).includes(raw.operation))ownerFail('INVALID_REQUEST');
  const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-'+raw.operation,raw);if(input.actor.kind!=='human')ownerFail('FORBIDDEN');
  const [,action,entity]=input.operation.split('-'),kind:Kind=entity!.startsWith('tag')?'tags':'snippets',tenant=input.tenant_id,mutation=!['list','get'].includes(action!),key=input.payload.idempotency_key as string;
  if(mutation&&!/^[\x21-\x7e]{1,128}$/.test(key))ownerFail('INVALID_REQUEST');
  const command=randomUUID(),request={payload:input.payload};
  const b:OwnerCommandBinding={tenant_id:tenant,command_id:command,owner:'chat',operation:input.operation,actor:input.actor,resource:{resource_id:tenant,object_key:'chat_catalog',record_version:'0',owner_revision:'0',control_revision:'0',owner_principal_id:null,team_id:null,shared_team_ids:[],archived:false},target:null,session_id:null,fields:[],payload_digest:ownerDigest(request),legacy_receipt_key:'catalog:'+command,graph:null,dependencies:[]};
  const prepared=await this.commands.prepare(b,request),ref={command_id:command,binding_digest:prepared.binding_digest};let admission:OwnerAdmission|undefined;
  try{
   admission=validateOwnerValue<OwnerAdmission>('OwnerAdmission',await this.peers.admit(tenant,ref));
   if(admission.state!=='admitted'||admission.command_id!==command||admission.binding_digest!==ref.binding_digest||admission.allowed_fields.length)ownerFail('FORBIDDEN');
   await this.commands.rememberDependency(tenant,ref,'identity-admission',admission);
   const policy=await this.peers.policy(tenant,ref,admission.admission_id);
   validateOwnerValue('Reply_identity-admission-catalog-policy',{schema_version:1,request_id:input.request_id,tenant_id:tenant,result:policy});
   if(policy.kind!==kind||policy.principal_id!==b.actor.principal_id||policy.auth_revision!==admission.auth_revision||mutation&&!policy.can_manage||!mutation&&!policy.can_read)ownerFail('FORBIDDEN');
   let result:Record<string,unknown>|undefined;
   await this.commands.commit(tenant,ref,admission.admission_id,async c=>{
    if(action==='list')result=await this.list(c,input,kind,policy);
    else if(action==='get'){
     const [[row]]=await c.execute<RowDataPacket[]>(`SELECT * FROM ${tables[kind]} WHERE tenant_id=? AND id=?`,[tenant,input.payload.id as string]);if(!row||row.archived_at)ownerFail('NOT_FOUND');
     result={data:this.project(kind,row,policy),meta:{as_of:new Date().toISOString(),correlation_id:input.correlation_id}};
    }else result=await this.mutate(c,input,kind,action!,policy);
    validateOwnerValue('Reply_chat-'+input.operation,{schema_version:1,request_id:input.request_id,tenant_id:tenant,result});
    const data=result!.data as Record<string,unknown>|unknown[];return {effect_id:Array.isArray(data)?tenant:String(data.id),effect_revision:Array.isArray(data)?'1':String(data.version??'1')};
   });
   await this.peers.settle(tenant,ref,admission.admission_id);return result!;
  }catch(error){try{await this.commands.abort(tenant,ref);if(admission)await this.peers.settle(tenant,ref,admission.admission_id);}catch{/* Retained admission is drained from terminal proof. */}
   if((error as {code?:string}).code==='ER_DUP_ENTRY')throw new OwnerDomainError(kind==='tags'?'NAME_CONFLICT':'SHORTCUT_CONFLICT',input.correlation_id);throw error;
  }
 }
 private async mutate(c:PoolConnection,input:OwnerCommandRequest,kind:Kind,action:string,policy:Policy){
  const tenant=input.tenant_id,creating=action==='create',id=input.payload.id as string|undefined,body=input.payload.body as Record<string,unknown>,version=input.payload.expected_version??null,key=input.payload.idempotency_key as string,table=tables[kind];
  const operation=creating?'create':action==='patch'?'update':'archive',route=`${operation} /api/v1/chat-workspace/${kind}/${id??''}`,digest=ownerDigest({body,version});
  let row:RowDataPacket|undefined;
  if(!creating){[[row]]=await c.execute<RowDataPacket[]>(`SELECT * FROM ${table} WHERE tenant_id=? AND id=? FOR UPDATE`,[tenant,id!]);if(!row)ownerFail('NOT_FOUND');}
  const [[receipt]]=await c.execute<RowDataPacket[]>("SELECT request_hash,status,response_body FROM idempotency_record WHERE tenant_id=? AND actor_kind='human' AND actor_id=? AND route_key=? AND `key`=? FOR UPDATE",[tenant,policy.principal_id,route,key]);
  if(receipt){
   if(receipt.request_hash!==digest&&!(version!==null&&receipt.request_hash===ownerDigest({body,version:'"'+version+'"'})))throw new OwnerDomainError('IDEMPOTENCY_CONFLICT',input.correlation_id);
   if(receipt.status!=='completed')ownerFail('DEPENDENCY_UNAVAILABLE');if(!policy.can_read)ownerFail('FORBIDDEN');
   const result=json(receipt.response_body);
   if(creating&&!(await c.execute<RowDataPacket[]>(`SELECT id FROM ${table} WHERE tenant_id=? AND id=?`,[tenant,result.data.id]))[0].length)ownerFail('NOT_FOUND');
   return result;
  }
  if(!creating){if(version===null)ownerFail('PRECONDITION_REQUIRED');if(String(row!.version)!==version)throw new OwnerDomainError('VERSION_CONFLICT',input.correlation_id);if(row!.archived_at)throw new OwnerDomainError('ARCHIVED',input.correlation_id);}
  const values:Record<string,string|Buffer|Date>={};
  if(action==='delete')values.archived_at=new Date();
  else if(kind==='tags'){
   if(creating||body.name!==undefined){values.name=text(body.name,40);values.normalized_name=Buffer.from(normalized(values.name as string));}
   if(creating||body.color!==undefined){if(!['gray','blue','green','amber','red','purple'].includes(String(body.color)))ownerFail('INVALID_REQUEST');values.color=String(body.color);}
  }else{
   if(creating||body.title!==undefined)values.title=text(body.title,80);
   if(creating||body.text!==undefined){text(body.text,4000);if(typeof body.text!=='string'||body.text.length>4000)ownerFail('INVALID_REQUEST');values.text=body.text;}
   if(creating||body.shortcut!==undefined){if(typeof body.shortcut!=='string'||!/^[a-z0-9_-]{1,32}$/.test(body.shortcut))ownerFail('INVALID_REQUEST');values.shortcut=body.shortcut;}
  }
  if(!Object.keys(values).length)ownerFail('INVALID_REQUEST');
  const target=id??randomUUID(),keys=Object.keys(values);
  if(creating)await c.execute(`INSERT INTO ${table}(tenant_id,id,${keys.map(k=>'`'+k+'`').join(',')},created_at,updated_at) VALUES (?,?,${keys.map(()=>'?').join(',')},UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,[tenant,target,...Object.values(values)]);
  else await c.execute(`UPDATE ${table} SET ${keys.map(k=>'`'+k+'`=?').join(',')},version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?`,[...Object.values(values),tenant,target]);
  [[row]]=await c.execute<RowDataPacket[]>(`SELECT * FROM ${table} WHERE tenant_id=? AND id=?`,[tenant,target]);
  const singular=kind==='tags'?'tag':'snippet',eventOperation=creating?'created':action==='delete'?'archived':'updated';
  await c.execute("INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,correlation_id,occurred_at,created_at) VALUES (?,?,'human',?,?,?,?,'accepted',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),tenant,policy.principal_id,eventOperation,table,target,ownerCanonical(Object.keys(body)),input.correlation_id]);
  await writeChatOutbox(c, "INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,?,1,?,?,?,?,?,'human',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')",[randomUUID(),tenant,kind==='tags'?'chat.tag_definition.changed':'chat.snippet.changed',table,target,String(row!.version),ownerCanonical({[singular+'_id']:target,operation:eventOperation}),input.correlation_id,policy.principal_id]);
  const result={data:action==='delete'?{id:target,archived:true}:this.project(kind,row!,policy),meta:{correlation_id:input.correlation_id}};
  await c.execute("INSERT INTO idempotency_record(id,tenant_id,actor_kind,actor_id,route_key,`key`,request_hash,status,response_status,response_body,created_at,updated_at,expires_at) VALUES (?,?,'human',?,?,?,?,'completed',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),TIMESTAMPADD(DAY,7,UTC_TIMESTAMP(6)))",[randomUUID(),tenant,policy.principal_id,route,key,digest,creating?201:200,ownerCanonical(result)]);
  return result;
 }
}
export function chatCatalogRoutes(catalog:ChatCatalog):Record<string,WorkloadRoute>{return Object.fromEntries(catalogOperations.map(operation=>['/internal/v1/owners/chat/'+operation,ownerRoute('chat',operation,['bff'],r=>catalog.execute(r as OwnerCommandRequest))]));}
