import { writeChatOutbox } from './event-store.js';
import {randomUUID} from 'node:crypto';
import type {Pool,PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerCommandBinding} from '@agentic-crm/contracts';
import {nextOwnerCounter,ownerCanonical,ownerCounter,ownerFail,ownerRoute,OwnerDomainError,validateOwnerValue,type OwnerCommandRequest,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';
import {businessTenant} from './database.js';
import {ChatRecordActions,recordSnapshot,type RecordPeers} from './record-action.js';

export const workspaceStateOperations=['workspace-conversations-id-read-state','workspace-mark-read','workspace-get-snooze','workspace-put-snooze','workspace-post-wake','catalog-put-conversation-tag','catalog-delete-conversation-tag'] as const;
const stamp=(v:unknown)=>v===null?null:new Date(String(v).replace(' ','T').replace(/Z?$/,'Z')).toISOString();
async function ready(c:PoolConnection,b:OwnerCommandBinding,snooze:boolean){
 const tenant=b.tenant_id,id=b.resource.resource_id;
 const [[workspace]]=await c.execute<RowDataPacket[]>('SELECT conversation_id FROM conversation_workspace WHERE tenant_id=? AND conversation_id=?',[tenant,id]);
 if(!workspace)throw new OwnerDomainError('WORKSPACE_BACKFILLING',b.command_id);
 if(snooze){
  const [[rollout]]=await c.execute<RowDataPacket[]>("SELECT state FROM chat_workspace_rollout WHERE tenant_id=? AND feature_key='snooze_v1'",[tenant]);
  if(rollout&&rollout.state!=='ready')throw new OwnerDomainError('CAPABILITY_UNAVAILABLE',b.command_id);
 }
}
async function readState(c:PoolConnection,b:OwnerCommandBinding){
 const [[row]]=await c.execute<RowDataPacket[]>(`SELECT w.latest_inbound_seq,
  COALESCE(r.last_read_inbound_seq,IF(p.principal_id IS NULL,0,COALESCE(c.baseline_inbound_seq,0))) last_read_inbound_seq,COALESCE(r.revision,0) read_state_revision
  FROM conversation_workspace w LEFT JOIN conversation_read_state r ON r.tenant_id=w.tenant_id AND r.conversation_id=w.conversation_id AND r.principal_id=?
  LEFT JOIN chat_read_rollout_principal p ON p.tenant_id=w.tenant_id AND p.principal_id=?
  LEFT JOIN chat_read_rollout_conversation c ON c.tenant_id=w.tenant_id AND c.conversation_id=w.conversation_id WHERE w.tenant_id=? AND w.conversation_id=?`,[b.actor.principal_id,b.actor.principal_id,b.tenant_id,b.resource.resource_id]);
 if(!row||BigInt(row.last_read_inbound_seq)>BigInt(row.latest_inbound_seq))throw new OwnerDomainError('WORKSPACE_BACKFILLING',b.command_id);
 return {conversation_id:b.resource.resource_id,last_read_inbound_seq:String(row.last_read_inbound_seq),latest_inbound_seq:String(row.latest_inbound_seq),unread_message_count:String(BigInt(row.latest_inbound_seq)-BigInt(row.last_read_inbound_seq)),read_state_revision:String(row.read_state_revision)};
}
async function event(c:PoolConnection,b:OwnerCommandBinding,type:string,aggregate:string,id:string,version:string,payload:Record<string,unknown>,actor={kind:String(b.actor.kind),id:b.actor.principal_id}){
 await writeChatOutbox(c, "INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,?,1,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')",[randomUUID(),b.tenant_id,type,aggregate,id,version,ownerCanonical(payload),b.command_id,actor.kind,actor.id]);
}
async function audit(c:PoolConnection,b:OwnerCommandBinding,action:string,resource:string,id:string,fields:string[],system=false){
 await c.execute("INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,correlation_id,occurred_at,created_at) VALUES (?,?,?,?,?,?,?,'accepted',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),b.tenant_id,system?'system':b.actor.kind,system?b.tenant_id:b.actor.principal_id,action,resource,id,ownerCanonical(fields),b.command_id]);
}
async function snoozeState(c:PoolConnection,b:OwnerCommandBinding,reason:boolean){
 const [[z]]=await c.execute<RowDataPacket[]>('SELECT *,until_at>UTC_TIMESTAMP(6) active FROM conversation_snooze WHERE tenant_id=? AND conversation_id=?',[b.tenant_id,b.resource.resource_id]);
 const [[r]]=await c.execute<RowDataPacket[]>('SELECT version FROM crm_record WHERE tenant_id=? AND id=?',[b.tenant_id,b.resource.resource_id]);
 const active=Number(z?.active)===1;
 return {conversation_id:b.resource.resource_id,until:active?stamp(z!.until_at):null,snooze_revision:String(z?.revision??0),version:String(r!.version),...(reason&&active&&z?.reason!==null?{reason:z!.reason}:{})};
}
async function snoozeChange(c:PoolConnection,b:OwnerCommandBinding,until:Date|null,cause:string,reason:string|null,system=false){
 const tenant=b.tenant_id,id=b.resource.resource_id;
 const [[counter]]=await c.execute<RowDataPacket[]>('SELECT last_seq,backfilled FROM conversation_activity_counter WHERE tenant_id=? AND conversation_id=? FOR UPDATE',[tenant,id]);
 if(!counter?.backfilled)throw new OwnerDomainError('WORKSPACE_BACKFILLING',b.command_id);
 await c.execute('INSERT INTO conversation_snooze(tenant_id,conversation_id,until_at,actor_principal_id,reason,last_cause,updated_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE until_at=VALUES(until_at),revision=revision+1,actor_principal_id=VALUES(actor_principal_id),reason=VALUES(reason),last_cause=VALUES(last_cause),updated_at=UTC_TIMESTAMP(6)',[tenant,id,until,system?null:b.actor.principal_id,reason,cause]);
 await c.execute('UPDATE conversation_workspace w JOIN conversation_snooze z ON z.tenant_id=w.tenant_id AND z.conversation_id=w.conversation_id SET w.snoozed_until=z.until_at,w.snooze_revision=z.revision WHERE w.tenant_id=? AND w.conversation_id=?',[tenant,id]);
 const [[r]]=await c.execute<RowDataPacket[]>('SELECT z.revision,r.version FROM conversation_snooze z JOIN crm_record r ON r.tenant_id=z.tenant_id AND r.id=z.conversation_id WHERE z.tenant_id=? AND z.conversation_id=?',[tenant,id]);
 const actor={kind:system?'system':'human',id:system?tenant:b.actor.principal_id},seq=nextOwnerCounter(String(counter.last_seq));
 await event(c,b,'chat.snooze.changed','conversation',id,String(r!.version),{conversation_id:id,until:until?.toISOString()??null,snooze_revision:String(r!.revision),cause},actor);
 await c.execute("INSERT INTO conversation_activity(tenant_id,id,conversation_id,activity_seq,source_service,source_kind,source_id,source_revision,kind,actor_kind,actor_id,occurred_at,recorded_at,payload) VALUES (?,?,?,?,'chat','snooze',?,?,'snooze',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?)",[tenant,randomUUID(),id,seq,id,String(r!.revision),actor.kind,actor.id,ownerCanonical({until:until?.toISOString()??null,cause})]);
 await c.execute('UPDATE conversation_activity_counter SET last_seq=? WHERE tenant_id=? AND conversation_id=?',[seq,tenant,id]);
 await audit(c,b,'snooze.'+cause,'conversation',id,['snoozed_until'],true);
}
export class ChatWorkspaceState {
 private readonly actions:ChatRecordActions;
 constructor(private readonly commands:ChatOwnerCommands,peers:RecordPeers,private readonly pool:Pool){this.actions=new ChatRecordActions(commands,peers);}
 async execute(raw:OwnerCommandRequest){
  if(!(workspaceStateOperations as readonly string[]).includes(raw.operation))ownerFail('INVALID_REQUEST');
  const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-'+raw.operation,raw),op=input.operation,id=input.payload.id as string;
  if(op==='catalog-put-conversation-tag'||op==='catalog-delete-conversation-tag')return this.tag(input);
  const marker=op==='workspace-mark-read',read=op==='workspace-conversations-id-read-state',get=op==='workspace-get-snooze',snooze=!marker&&!read;
  const route=marker?`POST /api/v1/chat-workspace/conversations/${id}/read-state`:!get&&!read?`${op==='workspace-put-snooze'?'snooze':'wake'} /api/v1/chat-workspace/conversations/${id}`:undefined;
  return this.actions.run(input,{fields:get?['reason']:[],route,versioned:snooze&&!get,ready:(c,b)=>ready(c,b,snooze),apply:async(c,b,allowed,status)=>{
   if(read)return readState(c,b);
   const tenant=b.tenant_id,body=input.payload.body as Record<string,unknown>;
   if(marker){
    const through=BigInt(ownerCounter(body.through_inbound_seq)),current=await readState(c,b);
    if(through>BigInt(current.latest_inbound_seq))throw new OwnerDomainError('INVALID_READ_POSITION',input.correlation_id);
    if(through>BigInt(current.last_read_inbound_seq)){
     const [[old]]=await c.execute<RowDataPacket[]>('SELECT id FROM conversation_read_state WHERE tenant_id=? AND conversation_id=? AND principal_id=?',[tenant,id,b.actor.principal_id]);
     const stateId=old?.id??randomUUID(),rev=nextOwnerCounter(current.read_state_revision);
     await c.execute('INSERT INTO conversation_read_state(tenant_id,conversation_id,principal_id,id,last_read_inbound_seq,revision,updated_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE last_read_inbound_seq=VALUES(last_read_inbound_seq),revision=VALUES(revision),updated_at=UTC_TIMESTAMP(6)',[tenant,id,b.actor.principal_id,stateId,String(through),rev]);
     await audit(c,b,'mark_read','conversation_read_state',stateId,['last_read_inbound_seq']);
     await event(c,b,'chat.read_marker.updated','conversation_read_state',stateId,rev,{conversation_id:id,principal_id:b.actor.principal_id,through_inbound_seq:String(through),read_state_revision:rev});
    }
    return readState(c,b);
   }
   if(get)return snoozeState(c,b,allowed.includes('reason'));
   if(status==='closed')ownerFail('INVALID_TRANSITION');
   const [[clock]]=await c.execute<RowDataPacket[]>('SELECT UNIX_TIMESTAMP(UTC_TIMESTAMP(6))*1000 now_ms');
   let until:Date|null=null;
   if(op==='workspace-put-snooze'){
    const value=body.until;
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(value)||!Number.isFinite(Date.parse(value))||Date.parse(value)<=Number(clock!.now_ms)||Date.parse(value)>Number(clock!.now_ms)+30*86400000||new Date(value).toISOString().slice(0,19)!==value.slice(0,19))throw new OwnerDomainError('VALIDATION_FAILED',input.correlation_id);
    until=new Date(value);
   }
   await c.execute('UPDATE crm_record SET version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[tenant,id]);
   const [[z]]=await c.execute<RowDataPacket[]>('SELECT *,until_at<=UTC_TIMESTAMP(6) due FROM conversation_snooze WHERE tenant_id=? AND conversation_id=? FOR UPDATE',[tenant,id]);
   if(z?.until_at&&Number(z.due))await snoozeChange(c,b,null,'deadline',null);
   if(until)await snoozeChange(c,b,until,z?.until_at&&!Number(z.due)?'rescheduled':'scheduled',typeof body.reason==='string'?body.reason:null);
   else if(z?.until_at&&!Number(z.due))await snoozeChange(c,b,null,'manual',null);
   await audit(c,b,op==='workspace-put-snooze'?'snooze':'wake','conversation',id,['snoozed_until']);
   return snoozeState(c,b,false);
  }});
 }
 private async tag(input:OwnerCommandRequest){
  const id=input.payload.id as string,tag=input.payload.tagId as string,attach=input.operation==='catalog-put-conversation-tag';
  return this.actions.run(input,{fields:['tags'],route:`${attach?'PUT':'DELETE'} /api/v1/chat-workspace/conversations/${id}/tags/${tag}`,ready:(c,b)=>ready(c,b,false),apply:async(c,b,allowed)=>{
   if(ownerCanonical(allowed)!==ownerCanonical(['tags']))ownerFail('FORBIDDEN');
   const tenant=b.tenant_id;
   const [[definition]]=await c.execute<RowDataPacket[]>('SELECT archived_at FROM conversation_tag WHERE tenant_id=? AND id=? FOR SHARE',[tenant,tag]);if(!definition)ownerFail('NOT_FOUND');
   const [links]=await c.execute<RowDataPacket[]>('SELECT tag_id FROM conversation_tag_link WHERE tenant_id=? AND conversation_id=? ORDER BY tag_id FOR UPDATE',[tenant,id]);
   const exists=links.some(l=>l.tag_id===tag),changed=attach?!exists:exists;
   if(changed){
    if(attach){if(definition.archived_at)throw new OwnerDomainError('ARCHIVED',input.correlation_id);if(links.length>=20)throw new OwnerDomainError('TAG_QUOTA',input.correlation_id);}
    const [[counter]]=await c.execute<RowDataPacket[]>('SELECT last_seq,backfilled FROM conversation_activity_counter WHERE tenant_id=? AND conversation_id=? FOR UPDATE',[tenant,id]);
    if(!counter?.backfilled)throw new OwnerDomainError('WORKSPACE_BACKFILLING',input.correlation_id);
    if(attach)await c.execute('INSERT INTO conversation_tag_link(tenant_id,conversation_id,tag_id,actor_principal_id,created_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6))',[tenant,id,tag,b.actor.principal_id]);
    else await c.execute('DELETE FROM conversation_tag_link WHERE tenant_id=? AND conversation_id=? AND tag_id=?',[tenant,id,tag]);
    await c.execute('UPDATE conversation_workspace SET tag_set_revision=tag_set_revision+1 WHERE tenant_id=? AND conversation_id=?',[tenant,id]);
    await c.execute('UPDATE crm_record SET version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[tenant,id]);
    const [[state]]=await c.execute<RowDataPacket[]>('SELECT w.tag_set_revision,r.version FROM conversation_workspace w JOIN crm_record r ON r.tenant_id=w.tenant_id AND r.id=w.conversation_id WHERE w.tenant_id=? AND w.conversation_id=?',[tenant,id]);
    const seq=nextOwnerCounter(String(counter.last_seq)),operation=attach?'attached':'detached';
    await c.execute("INSERT INTO conversation_activity(tenant_id,id,conversation_id,activity_seq,source_service,source_kind,source_id,source_revision,kind,actor_kind,actor_id,occurred_at,recorded_at,payload) VALUES (?,?,?,?,'chat','tags',?,?,'tags','human',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?)",[tenant,randomUUID(),id,seq,id,String(state!.tag_set_revision),b.actor.principal_id,ownerCanonical({tag_id:tag,operation})]);
    await c.execute('UPDATE conversation_activity_counter SET last_seq=? WHERE tenant_id=? AND conversation_id=?',[seq,tenant,id]);
    await audit(c,b,attach?'tag_attached':'tag_detached','conversation',id,['tags']);
    await event(c,b,'chat.conversation_tag.changed','conversation',id,String(state!.version),{conversation_id:id,tag_id:tag,operation,tag_set_revision:String(state!.tag_set_revision)});
   }
   const [[state]]=await c.execute<RowDataPacket[]>('SELECT w.tag_set_revision,r.version FROM conversation_workspace w JOIN crm_record r ON r.tenant_id=w.tenant_id AND r.id=w.conversation_id WHERE w.tenant_id=? AND w.conversation_id=?',[tenant,id]);
   const [final]=await c.execute<RowDataPacket[]>('SELECT tag_id FROM conversation_tag_link WHERE tenant_id=? AND conversation_id=? ORDER BY tag_id',[tenant,id]);
   return {conversation_id:id,tag_ids:final.map(l=>String(l.tag_id)),tag_set_revision:String(state!.tag_set_revision),version:String(state!.version)};
  }});
 }
 async wakeDue(tenant:string,id:string,revision:string){
  return this.commands.transaction(tenant,async c=>{
   const snapshot=await recordSnapshot(c,tenant,id);
   const [[z]]=await c.execute<RowDataPacket[]>('SELECT until_at,revision,until_at<=UTC_TIMESTAMP(6) due FROM conversation_snooze WHERE tenant_id=? AND conversation_id=? FOR UPDATE',[tenant,id]);
   if(!z?.until_at||String(z.revision)!==revision||!Number(z.due))return false;
   const b={tenant_id:tenant,command_id:randomUUID(),resource:snapshot.resource,actor:{kind:'service',principal_id:tenant}} as OwnerCommandBinding;
   await c.execute('UPDATE crm_record SET version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[tenant,id]);
   await snoozeChange(c,b,null,'deadline',null,true);return true;
  });
 }
 async tick(tenants:readonly string[]){
  const scope=[...new Set(tenants.map(businessTenant))];if(!scope.length)ownerFail('INVALID_REQUEST');
  const [rows]=await this.pool.query<RowDataPacket[]>('SELECT tenant_id,conversation_id,revision FROM conversation_snooze WHERE tenant_id IN (?) AND until_at<=UTC_TIMESTAMP(6) ORDER BY until_at,tenant_id,conversation_id LIMIT 100',[scope]);
  for(const row of rows)await this.wakeDue(row.tenant_id,row.conversation_id,String(row.revision));
 }
}
export function chatWorkspaceStateRoutes(workspace:ChatWorkspaceState):Record<string,WorkloadRoute>{return Object.fromEntries(workspaceStateOperations.map(operation=>['/internal/v1/owners/chat/'+operation,ownerRoute('chat',operation,['bff'],r=>workspace.execute(r as OwnerCommandRequest))]));}
