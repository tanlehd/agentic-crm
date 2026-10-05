import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import type { Access } from '../identity/domain/authorization.js';
import { fieldAllowed,permits } from '../identity/domain/authorization.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { conversation } from './domain.js';
import { ConversationCrmPort } from '../crm/conversation-ports.js';
export class AgentConversationPort {
  async bound(s:TransactionScope,id:string,message:string,a:Access){
    const c=await conversation(s,id,true);if(c.row.status==='closed'||!permits(a,'conversation','read',c.record)||!permits(a,'conversation','reply',c.record)||!fieldAllowed(a,'conversation','text','read')||!fieldAllowed(a,'conversation','text','write'))throw new CommandError(403,'RUNTIME_AUTH_REVOKED');
    const [m]=await s.query("SELECT id FROM message WHERE tenant_id=? AND conversation_id=? AND id=? AND direction='inbound'",[s.context.tenantId,id,message]);if(!m)throw new CommandError(404,'MESSAGE_NOT_FOUND');return c;
  }
  async context(s:TransactionScope,id:string,a:Access,contactId:string){
    const messages=(await s.query('SELECT id,direction,text FROM message WHERE tenant_id=? AND conversation_id=? ORDER BY received_at DESC,id DESC LIMIT 20',[s.context.tenantId,id])).reverse();
    const contact=await new ConversationCrmPort().contactSummary(s,a,contactId);return {messages,contact};
  }
  async contact(s:TransactionScope,id:string,a:Access){const contact=await new ConversationCrmPort().contactSummary(s,a,id);if(!contact)throw new CommandError(403,'RUNTIME_AUTH_REVOKED');return contact;}
}
