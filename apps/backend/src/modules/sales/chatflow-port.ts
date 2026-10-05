import { ChannelReferences } from '../channels/ports.js';
import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError,DurableCommands,canonical } from '../../kernel/reliability/commands.js';
import type { Access } from '../identity/domain/authorization.js';
import { allows } from '../crm/access.js';
import { contactReferences } from '../crm/core.js';
import { checkField } from '../crm/properties.js';
import { createSessionLeadRecord } from '../crm/session-lead-port.js';
import { RecordRegistry } from '../crm/registry.js';
import { qualification } from './leads.js';
export interface LeadInput {sessionId:string;conversationId:string;contactId:string;ownerId:string;teamId:string|null;values:Record<string,unknown>;evidence?:string;complete:boolean;disqualified?:boolean}
export class ChatflowLeads {
  validate(a:Access,values:Record<string,unknown>,evidence?:string,complete=true){
    const raw={...values};delete raw.consent_evidence;if(raw.phone===null)delete raw.phone;
    const q=qualification(raw,a,false);if(evidence)q.consent_evidence={kind:'message',message_id:evidence};
    for(const k of Object.keys(q)){checkField(a,'lead',k,'read');checkField(a,'lead',k,'write');}checkField(a,'lead','qualification','read');checkField(a,'lead','qualification','write');
    return qualification({},a,complete,q);
  }
  async upsert(s:TransactionScope,a:Access,input:LeadInput,kind:'human'|'service'){
    const q=this.validate(a,input.values,input.evidence,input.complete),registry=new RecordRegistry(),commands=new DurableCommands();
    await contactReferences.requireActive(s,a,input.contactId);
    let [lead]=await s.query('SELECT * FROM `lead` WHERE tenant_id=? AND qualification_session_id=? FOR UPDATE',[s.context.tenantId,input.sessionId]);
    let record;if(lead){if(lead.contact_id!==input.contactId||lead.conversation_id!==input.conversationId||!['new','qualifying','qualified'].includes(lead.status))throw new CommandError(409,'INVALID_TRANSITION');record=await registry.get(s,lead.record_id,true);if(record.archived)throw new CommandError(409,'INVALID_TRANSITION');}
    else {const source=await new ChannelReferences().firstTouchpoint(s,input.conversationId);record=await createSessionLeadRecord(s,a,input.ownerId,input.teamId,input.sessionId,kind);await s.query("INSERT INTO `lead`(tenant_id,record_id,contact_id,conversation_id,qualification_session_id,source_touchpoint_id,status,qualification) VALUES (?,?,?,?,?,?,'new',JSON_OBJECT())",[s.context.tenantId,record.id,input.contactId,input.conversationId,input.sessionId,source??null]);await commands.automationEvent(s,'lead.created',record.id,record.version,{lead_id:record.id,contact_id:input.contactId,conversation_id:input.conversationId},{kind,id:a.principalId},input.sessionId);}
    if(!allows(a,'lead','qualify',record))throw new CommandError(403,'FORBIDDEN');
    if(lead?.status==='qualified'){if(input.complete&&canonical(typeof lead.qualification==='string'?JSON.parse(lead.qualification):lead.qualification)===canonical(q))return record.id;throw new CommandError(409,'INVALID_TRANSITION');}
    await registry.bump(s,record,record.version);await s.query("UPDATE `lead` SET qualification=?,status=?,qualified_at=IF(?,UTC_TIMESTAMP(6),NULL) WHERE tenant_id=? AND record_id=?",[JSON.stringify(q),input.disqualified?'disqualified':input.complete?'qualified':'qualifying',input.complete,s.context.tenantId,record.id]);
    if(kind==='human')await commands.audit(s,a.principalId,input.sessionId,'lead',record.id,'chatflow.qualification',['qualification','status']);else await commands.systemAudit(s,input.sessionId,'lead',record.id,'chatflow.qualification',['qualification','status'],{kind,id:a.principalId});
    if(input.complete)await commands.automationEvent(s,'lead.qualified',record.id,String(BigInt(record.version)+1n),{lead_id:record.id,qualified_at:new Date().toISOString(),source_touchpoint_id:lead?.source_touchpoint_id??await new ChannelReferences().firstTouchpoint(s,input.conversationId)??null},{kind,id:a.principalId},input.sessionId);return record.id;
  }
}
