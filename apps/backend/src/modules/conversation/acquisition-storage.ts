import { randomUUID } from 'node:crypto';
import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError,DurableCommands,type SystemActor } from '../../kernel/reliability/commands.js';
import { ChannelReferences } from '../channels/ports.js';
import { stamp } from '../crm/core.js';
export interface AcquisitionReferral {ad_id?:string|null;campaign_id?:string|null;touchpoint_id:string}
export function lateAcquisitionMessage(occurredAt:string,opening:string|Date){return Date.parse(occurredAt)<new Date(opening).getTime();}
export async function activeAcquisition(s:TransactionScope,conversation:string){const [row]=await s.query("SELECT * FROM conversation_acquisition_session WHERE tenant_id=? AND active_conversation_key=?",[s.context.tenantId,conversation]);return row;}
async function event(s:TransactionScope,row:any,type:'acquisition_session.opened'|'acquisition_session.closed',correlation:string,actor?:SystemActor|{kind:'human';id:string}){
 const a=actor??{kind:'system',id:s.context.tenantId};
 await s.query("INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,?,1,'acquisition_session',?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')",[randomUUID(),s.context.tenantId,type,row.id,row.version,JSON.stringify({session_id:row.id,conversation_id:row.conversation_id,status:row.status,source_classification:row.source_classification,source_ad_id:row.source_ad_id,sequence:String(row.sequence)}),correlation,a.kind,a.id]);
}
export async function closeAcquisition(s:TransactionScope,conversation:string,reason:'agent_closed'|'new_referral',correlation:string,actor?:SystemActor|{kind:'human';id:string}){
 const row=await activeAcquisition(s,conversation);if(!row)return;
 await s.query("UPDATE conversation_acquisition_session SET status='closed',closed_at=UTC_TIMESTAMP(6),close_reason=?,version=version+1 WHERE tenant_id=? AND id=?",[reason,s.context.tenantId,row.id]);
 await event(s,{...row,status:'closed',version:String(BigInt(row.version)+1n)},'acquisition_session.closed',correlation,actor);
}
export async function acquisitionInbound(s:TransactionScope,input:{conversation:string;message:string;connection:string;occurredAt:string;correlation:string;actor?:SystemActor;referral?:AcquisitionReferral}){
 const {conversation,message,connection,occurredAt,correlation,actor,referral}=input;let current=await activeAcquisition(s,conversation);
 if(current&&lateAcquisitionMessage(occurredAt,current.opening_occurred_at)){await membership(s,conversation,message,null,'unresolved_late');return;}
 if(!current||referral){
  if(current)await closeAcquisition(s,conversation,'new_referral',correlation,actor);
  const [last]=await s.query('SELECT sequence FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=? ORDER BY sequence DESC LIMIT 1',[s.context.tenantId,conversation]);
  const meta=await new ChannelReferences().metadata(s,connection),id=randomUUID(),sequence=String(BigInt(last?.sequence??0)+1n);
  const source=referral?'paid':meta.page_id?'organic':'unknown';
  await s.query("INSERT INTO conversation_acquisition_session(tenant_id,id,conversation_id,sequence,status,opening_reason,opened_at,opening_occurred_at,source_classification,source_channel,source_page_id,source_ad_id,source_campaign_id,source_connection_id,source_touchpoint_id,policy_version) VALUES (?,?,?,?,'active',?,UTC_TIMESTAMP(6),?,?,?,?,?,?,?,?,'acquisition_v1')",[s.context.tenantId,id,conversation,sequence,referral?'new_referral':last?'after_close':'first_inbound',new Date(occurredAt),source,meta.channel,meta.page_id,referral?.ad_id??null,referral?.campaign_id??null,connection,referral?.touchpoint_id??null]);
  current=await activeAcquisition(s,conversation);await event(s,current,'acquisition_session.opened',correlation,actor);
  await new DurableCommands().systemAudit(s,correlation,'acquisition_session',id,'acquisition.open',['status','source'],actor);
 }
 await membership(s,conversation,message,current.id,'assigned');
}
async function membership(s:TransactionScope,conversation:string,message:string,session:string|null,resolution:string){
 // Writer verifies the message is in this thread; no cross-thread nullable-session loophole.
 const [m]=await s.query('SELECT id FROM message WHERE tenant_id=? AND id=? AND conversation_id=?',[s.context.tenantId,message,conversation]);if(!m)throw new CommandError(409,'MESSAGE_BINDING_MISMATCH');
 await s.query('INSERT INTO message_acquisition_membership(tenant_id,message_id,conversation_id,session_id,resolution,created_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))',[s.context.tenantId,message,conversation,session,resolution]);
}
export async function acquisitionOutbound(s:TransactionScope,conversation:string,message:string){const row=await activeAcquisition(s,conversation);await membership(s,conversation,message,row?.id??null,row?'assigned':'unresolved_legacy');}
export async function listAcquisitions(s:TransactionScope,conversation:string,query:Record<string,unknown>){
 const limit=query.limit===undefined?50:Number(query.limit),before=query.before_sequence;
 if(Object.keys(query).some(k=>!['limit','before_sequence'].includes(k))||!Number.isInteger(limit)||limit<1||limit>100||typeof query.limit==='object'||before!==undefined&&(typeof before!=='string'||! /^[1-9][0-9]{0,19}$/.test(before)))throw new CommandError(400,'INVALID_REQUEST');
 const rows=await s.query(`SELECT * FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=? ${before?'AND sequence<?':''} ORDER BY sequence DESC LIMIT ?`,[s.context.tenantId,conversation,...(before?[before]:[]),limit+1]);
 return {data:rows.slice(0,limit).map((r:any)=>{const {tenant_id,active_conversation_key,...row}=r;return {...row,sequence:String(row.sequence),version:String(row.version),opened_at:stamp(row.opened_at),opening_occurred_at:stamp(row.opening_occurred_at),closed_at:stamp(row.closed_at)};}),next_before_sequence:rows.length>limit?String(rows[limit-1].sequence):null};
}
