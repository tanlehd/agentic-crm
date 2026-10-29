import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {nextOwnerCounter,ownerCanonical,ownerDigest,ownerFail,ownerRoute,validateOwnerValue,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';

type Event={tenant_id:string;producer:'crm'|'workflow';consumer:string;event_id:string;event_type:string;schema_version:1;aggregate_id:string;aggregate_type:string;aggregate_version:string;stream_sequence:string;occurred_at:string;correlation_id:string;causation_id:string|null;actor:{kind:string;id:string};data:{conversation_id:string;source_revision:string;activity_id?:string;operation?:string;run_id?:string;definition_version_id?:string;source_service?:string;state?:string}};
type Notice={producer:string;consumer:string;event_id:string;event_type:string;schema_version:number;aggregate_id:string;stream_sequence:string;digest:string};
type Binding={conversation_id:string;source_id:string;revision:string;definition_version_id:string|null;projection:{contact_id:string;connection_id:string}|null};
type Receipt={event_id:string;consumer:string;producer:string;digest:string;state:'pending'|'applied'|'duplicate'|'quarantined';watermark:string};
export function activityEventDigest(e:Event){const {consumer:_consumer,stream_sequence:_sequence,...original}=e;return ownerDigest(original);}
/** Two scoped subscriptions. Worker relay/replay wiring remains an explicit composition step. */
export class ChatActivityNotifications{
 constructor(private readonly commands:ChatOwnerCommands,private readonly binding:(tenant:string,producer:'crm'|'workflow',input:{conversation_id:string;source_id:string;minimum_revision:string})=>Promise<Binding>){}
 private check(tenant:string,peer:string,raw:unknown){
  const e=validateOwnerValue<Event>('OwnerChatEvent',raw),note=e.producer==='crm',d=e.data;
  if(e.tenant_id!==tenant||peer!==e.producer||!['crm','workflow'].includes(peer)||e.consumer!==(note?'chat.activity.note.v1':'chat.activity.automation.v1')||e.aggregate_type!==(note?'activity':'workflow_run')||e.aggregate_id!==(note?d.activity_id:d.run_id)||e.aggregate_version!==d.source_revision||!['human','system','service'].includes(e.actor.kind)||!note&&d.source_service!=='workflow')ownerFail('FORBIDDEN');
  return e;
 }
 private async row(c:PoolConnection,tenant:string,e:{producer:string;consumer:string;event_id:string}){const [[row]]=await c.execute<RowDataPacket[]>('SELECT * FROM chat_event_inbox WHERE tenant_id=? AND producer=? AND consumer_name=? AND event_id=? FOR UPDATE',[tenant,e.producer,e.consumer,e.event_id]);return row;}
 private async watermark(c:PoolConnection,tenant:string,e:{producer:string;consumer:string;aggregate_id:string;aggregate_type:string}){
  const [[row]]=await c.execute<RowDataPacket[]>("SELECT MAX(CASE WHEN state='applied' THEN sequence ELSE 0 END) high,MIN(CASE WHEN state<>'applied' THEN sequence END) blocked FROM chat_event_inbox WHERE tenant_id=? AND producer=? AND consumer_name=? AND aggregate_type=? AND aggregate_id=?",[tenant,e.producer,e.consumer,e.aggregate_type,e.aggregate_id]);
  let high=BigInt(row?.high??0);if(row?.blocked!==null&&row?.blocked!==undefined&&high>=BigInt(row.blocked))high=BigInt(row.blocked)-1n;return high.toString();
 }
 private receipt(e:Event|Notice,state:Receipt['state'],watermark:string):Receipt{return {event_id:e.event_id,consumer:e.consumer,producer:e.producer,digest:'digest' in e?e.digest:activityEventDigest(e),state,watermark};}
 async deliver(tenant:string,peer:string,raw:unknown,fence?:(c:PoolConnection)=>Promise<void>){
  const e=this.check(tenant,peer,raw),digest=activityEventDigest(e),id=e.data.conversation_id;
  const staged=await this.commands.transaction(tenant,async c=>{
   const [[record]]=await c.execute<RowDataPacket[]>('SELECT v.contact_id,v.connection_id FROM crm_record r JOIN conversation v ON v.tenant_id=r.tenant_id AND v.record_id=r.id WHERE r.tenant_id=? AND r.id=? FOR UPDATE',[tenant,id]);if(!record)ownerFail('NOT_FOUND');
   if(fence)await fence(c);
   const old=await this.row(c,tenant,e);
   if(old){
    if(old.event_digest!==digest||String(old.sequence)!==e.stream_sequence||ownerCanonical(typeof old.envelope_json==='string'?JSON.parse(old.envelope_json):old.envelope_json)!==ownerCanonical(e)){
     await c.execute("UPDATE chat_event_inbox SET state='quarantined',applied_at=NULL,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND producer=? AND consumer_name=? AND event_id=?",[tenant,e.producer,e.consumer,e.event_id]);return {receipt:this.receipt(e,'quarantined',await this.watermark(c,tenant,e)),projection:record};
    }
    if(old.state!=='pending')return {receipt:this.receipt(e,old.state==='applied'?'duplicate':'quarantined',await this.watermark(c,tenant,e)),projection:record};
   }else{
    const [[collision]]=await c.execute<RowDataPacket[]>('SELECT event_id FROM chat_event_inbox WHERE tenant_id=? AND producer=? AND consumer_name=? AND aggregate_type=? AND aggregate_id=? AND sequence=? FOR UPDATE',[tenant,e.producer,e.consumer,e.aggregate_type,e.aggregate_id,e.stream_sequence]);
    if(collision){await c.execute("UPDATE chat_event_inbox SET state='quarantined',applied_at=NULL,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND producer=? AND consumer_name=? AND event_id=?",[tenant,e.producer,e.consumer,collision.event_id]);return {receipt:this.receipt(e,'quarantined',await this.watermark(c,tenant,e)),projection:record};}
    await c.execute("INSERT INTO chat_event_inbox(tenant_id,producer,consumer_name,event_id,aggregate_type,aggregate_id,sequence,event_digest,envelope_json,state,next_attempt_at,attempts,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'pending',UTC_TIMESTAMP(6),0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[tenant,e.producer,e.consumer,e.event_id,e.aggregate_type,e.aggregate_id,e.stream_sequence,digest,ownerCanonical(e)]);
   }
   const watermark=await this.watermark(c,tenant,e);return {receipt:e.stream_sequence!==nextOwnerCounter(watermark)?this.receipt(e,'pending',watermark):null,projection:record};
  });
  if(staged.receipt)return staged.receipt;
  let source:Binding;
  try{source=validateOwnerValue<Binding>('OwnerActivityNotificationBinding',await this.binding(tenant,e.producer,{conversation_id:id,source_id:e.aggregate_id,minimum_revision:e.aggregate_version}));}catch{return this.receipt(e,'pending',(BigInt(e.stream_sequence)-1n).toString());}
  if(source.conversation_id!==id||source.source_id!==e.aggregate_id||BigInt(source.revision)<BigInt(e.aggregate_version)||e.producer==='workflow'&&(source.definition_version_id!==e.data.definition_version_id||ownerCanonical(source.projection)!==ownerCanonical(staged.projection))||e.producer==='crm'&&(source.projection!==null||source.definition_version_id!==null))ownerFail('REFERENCE_INVALID');
  return this.commands.transaction(tenant,async c=>{
   const [[record]]=await c.execute<RowDataPacket[]>('SELECT v.contact_id,v.connection_id FROM crm_record r JOIN conversation v ON v.tenant_id=r.tenant_id AND v.record_id=r.id WHERE r.tenant_id=? AND r.id=? FOR UPDATE',[tenant,id]);if(!record||ownerCanonical(record)!==ownerCanonical(staged.projection))ownerFail('STALE_VERSION');
   if(fence)await fence(c);
   const row=await this.row(c,tenant,e),watermark=await this.watermark(c,tenant,e);if(!row||row.event_digest!==digest)ownerFail('CONFLICT');if(row.state!=='pending')return this.receipt(e,row.state==='applied'?'duplicate':'quarantined',watermark);if(nextOwnerCounter(watermark)!==e.stream_sequence)return this.receipt(e,'pending',watermark);
   const [[counter]]=await c.execute<RowDataPacket[]>('SELECT last_seq,backfilled FROM conversation_activity_counter WHERE tenant_id=? AND conversation_id=? FOR UPDATE',[tenant,id]);if(!counter?.backfilled)ownerFail('PRECONDITION_REQUIRED');
   const kind=e.producer==='crm'?'note':'automation',[[old]]=await c.execute<RowDataPacket[]>('SELECT MAX(source_revision) revision FROM conversation_activity WHERE tenant_id=? AND conversation_id=? AND source_service=? AND source_kind=? AND source_id=?',[tenant,id,e.producer,kind,e.aggregate_id]);
   if(BigInt(old?.revision??0)<BigInt(e.aggregate_version)){
    const payload=kind==='note'?{activity_id:e.aggregate_id}:{source_service:'workflow',run_id:e.aggregate_id,definition_version_id:e.data.definition_version_id,state:e.data.state},seq=nextOwnerCounter(String(counter.last_seq));
    await c.execute('INSERT INTO conversation_activity(tenant_id,id,conversation_id,activity_seq,source_service,source_kind,source_id,source_revision,kind,actor_kind,actor_id,occurred_at,recorded_at,payload) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),?)',[tenant,randomUUID(),id,seq,e.producer,kind,e.aggregate_id,e.aggregate_version,kind,e.actor.kind,e.actor.id,e.occurred_at.replace('T',' ').replace('Z',''),ownerCanonical(payload)]);
    await c.execute('UPDATE conversation_activity_counter SET last_seq=? WHERE tenant_id=? AND conversation_id=?',[seq,tenant,id]);
   }
   await c.execute("INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,correlation_id,occurred_at,created_at) VALUES (?,?,'system',?,'activity.reconcile','conversation',?,'accepted','[\"activity_reference\"]',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),tenant,tenant,id,e.correlation_id]);
   await c.execute("UPDATE chat_event_inbox SET state='applied',applied_at=UTC_TIMESTAMP(6),attempts=attempts+1,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND producer=? AND consumer_name=? AND event_id=?",[tenant,e.producer,e.consumer,e.event_id]);
   return this.receipt(e,'applied',e.stream_sequence);
  });
 }
 async status(tenant:string,peer:string,raw:unknown){
  const e=validateOwnerValue<Notice>('OwnerEventNotice',raw);if(e.producer!==peer||!['crm','workflow'].includes(peer)||e.consumer!==(peer==='crm'?'chat.activity.note.v1':'chat.activity.automation.v1'))ownerFail('FORBIDDEN');
  return this.commands.transaction(tenant,async c=>{const row=await this.row(c,tenant,e);if(!row)ownerFail('NOT_FOUND');const stored=typeof row.envelope_json==='string'?JSON.parse(row.envelope_json):row.envelope_json;
   if(row.event_digest!==e.digest||String(row.sequence)!==e.stream_sequence||row.aggregate_id!==e.aggregate_id||stored.event_type!==e.event_type||stored.schema_version!==e.schema_version)ownerFail('CONFLICT');return this.receipt(e,row.state,await this.watermark(c,tenant,{...e,aggregate_type:row.aggregate_type}));});
 }
}
export function chatActivityNotificationRoutes(consumer:ChatActivityNotifications):Record<string,WorkloadRoute>{return {
 '/internal/v1/owners/chat/event-deliver':ownerRoute('chat','event-deliver',['crm','workflow'],(r,p)=>consumer.deliver(r.tenant_id,p.service,r.payload)),
 '/internal/v1/owners/chat/event-status':ownerRoute('chat','event-status',['crm','workflow'],(r,p)=>consumer.status(r.tenant_id,p.service,r.payload)),
};}
