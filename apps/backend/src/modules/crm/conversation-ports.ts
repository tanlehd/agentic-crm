import { randomUUID } from 'node:crypto';
import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError,DurableCommands } from '../../kernel/reliability/commands.js';
import { validateOwnershipTarget } from '../identity/authorization.js';
import { fieldAllowed,type Access } from '../identity/domain/authorization.js';
import { RecordRegistry } from './registry.js';
import { allows } from './access.js';
// Internal composition port. Never exposed as a general-purpose HTTP create bypass.
export class ConversationCrmPort {
  async createUnassigned(s:TransactionScope,team:string,correlation:string):Promise<string>{
    await validateOwnershipTarget(s,null,team);
    const [type]=await s.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='conversation' AND archived_at IS NULL",[s.context.tenantId]);if(!type)throw new CommandError(409,'CONVERSATION_NOT_CONFIGURED');
    const id=randomUUID(),tenant=s.context.tenantId;
    await s.query('INSERT INTO crm_record(id,tenant_id,object_type_id,team_id,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[id,tenant,type.id,team]);
    await s.query("INSERT INTO ownership_history(id,tenant_id,record_id,to_team_id,owner_revision,reason,actor_kind,actor_id,created_at) VALUES (?,?,?, ?,1,'inbound','system',?,UTC_TIMESTAMP(6))",[randomUUID(),tenant,id,team,tenant]);
    await new DurableCommands().systemAudit(s,correlation,'conversation',id,'create',['team_id']);return id;
  }
  async activeContact(s:TransactionScope,id:string){const r=await new RecordRegistry().get(s,id,true);if(r.objectKey!=='contact'||r.archived)throw new CommandError(409,'CONTACT_UNAVAILABLE');}
  async contactSummary(s:TransactionScope,a:Access,id:string){
    const r=await new RecordRegistry().get(s,id);if(!allows(a,'contact','read',r))return null;
    const [row]=await s.query('SELECT record_id id,display_name,normalized_phone,normalized_email FROM contact WHERE tenant_id=? AND record_id=?',[s.context.tenantId,id]);
    return Object.fromEntries(Object.entries(row).filter(([k])=>fieldAllowed(a,'contact',k,'read')));
  }
  async note(s:TransactionScope,a:Access,conversation:string,text:string,correlation:string){
    const [type]=await s.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='activity' AND archived_at IS NULL",[s.context.tenantId]);if(!type)throw new CommandError(409,'ACTIVITY_NOT_CONFIGURED');
    const id=randomUUID(),record=await new RecordRegistry().get(s,conversation);
    await s.query('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,team_id,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[id,s.context.tenantId,type.id,a.principalId,record.teamId]);
    await s.query("INSERT INTO activity(tenant_id,record_id,kind,subject,body,related_record_id) VALUES (?,?,'note','Internal note',?,?)",[s.context.tenantId,id,text,conversation]);
    await s.query("INSERT INTO ownership_history(id,tenant_id,record_id,to_owner_id,to_team_id,owner_revision,reason,actor_kind,actor_id,created_at) VALUES (?,?,?,?,?,1,'note','human',?,UTC_TIMESTAMP(6))",[randomUUID(),s.context.tenantId,id,a.principalId,record.teamId,a.principalId]);
    await new DurableCommands().audit(s,a.principalId,correlation,'activity',id,'note',['body','related_record_id']);return id;
  }
}
