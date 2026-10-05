import { randomUUID } from 'node:crypto';
import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError,DurableCommands } from '../../kernel/reliability/commands.js';
import type { Access } from '../identity/domain/authorization.js';
import { fieldAllowed } from '../identity/domain/authorization.js';
import { ChannelReferences } from '../channels/ports.js';
import { conversation,requirePermission,messageText,cancelQueued } from './domain.js';
export class ChatflowConversationPort {
  async read(s:TransactionScope,id:string,a?:Access){const c=await conversation(s,id,true);if(a)requirePermission(a,c.record,'read');return c;}
  async inbound(s:TransactionScope,id:string,message:string){const [m]=await s.query("SELECT id,text FROM message WHERE tenant_id=? AND conversation_id=? AND id=? AND direction='inbound'",[s.context.tenantId,id,message]);if(!m)throw new CommandError(422,'CONSENT_MESSAGE_INVALID');return m as {id:string;text:string};}
  async next(s:TransactionScope,id:string,used:string[]){const [m]=await s.query(`SELECT id,text FROM message WHERE tenant_id=? AND conversation_id=? AND direction='inbound' ${used.length?'AND id NOT IN ('+used.map(()=>'?').join(',')+')':''} ORDER BY received_at,id LIMIT 1`,[s.context.tenantId,id,...used]);return m as {id:string;text:string}|undefined;}
  async prompt(s:TransactionScope,id:string,a:Access,ownerRevision:string,text:string,key:string,session:string){
    messageText(text);const c=await this.read(s,id,a);requirePermission(a,c.record,'reply');
    if(c.row.status==='closed'||c.record.ownerPrincipalId!==a.principalId||c.record.ownerRevision!==ownerRevision)throw new CommandError(409,'OWNER_CONFLICT');
    if(!fieldAllowed(a,'conversation','text','read')||!fieldAllowed(a,'conversation','text','write'))throw new CommandError(403,'FORBIDDEN');
    await new ChannelReferences().connection(s,c.row.connection_id);
    const [old]=await s.query('SELECT id,text,owner_revision,conversation_id FROM outbound_intent WHERE tenant_id=? AND actor_id=? AND idempotency_key=?',[s.context.tenantId,a.principalId,key]);
    if(old){if(old.text!==text||String(old.owner_revision)!==ownerRevision||old.conversation_id!==id)throw new CommandError(409,'IDEMPOTENCY_CONFLICT');return old.id as string;}
    const intent=randomUUID();await s.query("INSERT INTO outbound_intent(id,tenant_id,conversation_id,actor_kind,actor_id,owner_revision,text,status,idempotency_key,chatflow_session_id,created_at) VALUES (?,?,?,'ai',?,?,?,'queued',?,?,UTC_TIMESTAMP(6))",[intent,s.context.tenantId,id,a.principalId,ownerRevision,text,key,session]);
    await s.query("INSERT INTO message(id,tenant_id,conversation_id,connection_id,outbound_intent_id,direction,text,occurred_at,received_at,status) VALUES (?,?,?,?,?,'outbound',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'queued')",[randomUUID(),s.context.tenantId,id,c.row.connection_id,intent,text]);
    await new DurableCommands().systemAudit(s,intent,'conversation',id,'chatflow.prompt',['message_id']);return intent;
  }
  async cancel(s:TransactionScope,id:string){await cancelQueued(s,id);}
}
