import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import type { Access } from '../identity/domain/authorization.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { conversation,requirePermission } from './domain.js';
import { checkField } from '../crm/properties.js';
import { contactReferences } from '../crm/core.js';

// Chat-owned validation in the baseline monolith UoW; remote port after extraction.
export async function requireSalesSession(s:TransactionScope,a:Access,conversationId:string,sessionId:string,contact?:string,active=true,write=true){
 const {record,row}=await conversation(s,conversationId,true);requirePermission(a,record,'read');
 if(write)requirePermission(a,record,'update');
 for(const field of ['contact_id','channel','channel_id','page_id','attribution'])checkField(a,'conversation',field,'read');
 if(contact&&row.contact_id!==contact)throw new CommandError(422,'CONTACT_BINDING_MISMATCH');
 await contactReferences.requireActive(s,a,row.contact_id);
 const [session]=await s.query('SELECT id,status FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=? AND id=?',[s.context.tenantId,conversationId,sessionId]);
 if(!session)throw new CommandError(404,'NOT_FOUND');
 if(active&&(session.status!=='active'||row.status==='closed'))throw new CommandError(409,'SESSION_CLOSED');
 return {contactId:row.contact_id,sessionId:session.id};
}
