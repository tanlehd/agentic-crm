import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
// Historical fixture only: current domain writers require the latest schema.
export async function historicalConversation(ds:DataSource,input:{tenant:string;contact:string;identity:string;connection:string;principal?:string;account?:string;outbound?:boolean}){
 const {tenant,contact,identity,connection,principal,account,outbound}=input,id=randomUUID();
 const [type]=await ds.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='conversation'",[tenant]);
 await ds.query('INSERT INTO crm_record(tenant_id,id,object_type_id,created_at,updated_at) VALUES (?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[tenant,id,type.id]);
 await ds.query('INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,opened_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))',[tenant,id,contact,identity,connection]);
 await ds.query("INSERT INTO message(id,tenant_id,conversation_id,connection_id,provider_message_id,direction,text,occurred_at,received_at,status) VALUES (?,?,?,?,?,'inbound','Synthetic legacy','2026-10-06 01:00:00',UTC_TIMESTAMP(6),'received')",[randomUUID(),tenant,id,connection,randomUUID()]);
 if(outbound){const intent=randomUUID();await ds.query("INSERT INTO outbound_intent(id,tenant_id,conversation_id,actor_kind,actor_id,account_id,owner_revision,text,status,idempotency_key,created_at) VALUES (?,?,?,'human',?,?,1,'Synthetic legacy coverage unknown','queued',?,UTC_TIMESTAMP(6))",[intent,tenant,id,principal,account,randomUUID()]);await ds.query("INSERT INTO message(id,tenant_id,conversation_id,connection_id,outbound_intent_id,direction,text,occurred_at,received_at,status) VALUES (?,?,?,?,?,'outbound','Synthetic legacy coverage unknown',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'queued')",[randomUUID(),tenant,id,connection,intent]);}
 return id;
}
