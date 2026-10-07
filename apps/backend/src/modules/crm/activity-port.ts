import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { activityNotification,activitySupported,type ActivityActor } from '../../kernel/reliability/activity-notification.js';
import { RecordRegistry } from './registry.js';
import { allows } from './access.js';
import { fieldAllowed,type Access } from '../identity/domain/authorization.js';
export class CrmActivityPort {
  async binding(s:TransactionScope,id:string){const [r]=await s.query("SELECT a.related_record_id conversation_id,r.version FROM activity a JOIN crm_record r ON r.tenant_id=a.tenant_id AND r.id=a.record_id JOIN crm_record target ON target.tenant_id=a.tenant_id AND target.id=a.related_record_id JOIN object_type t ON t.tenant_id=target.tenant_id AND t.id=target.object_type_id WHERE a.tenant_id=? AND a.record_id=? AND a.kind='note' AND t.`key`='conversation'",[s.context.tenantId,id]);return r;}
  async read(s:TransactionScope,a:Access,id:string,conversation:string){
    const b=await this.binding(s,id);if(!b||b.conversation_id!==conversation)return null;
    const r=await new RecordRegistry().get(s,id);if(r.archived||!allows(a,'activity','read',r))return null;
    const [note]=await s.query('SELECT body FROM activity WHERE tenant_id=? AND record_id=?',[s.context.tenantId,id]);
    return {activity_id:id,...(fieldAllowed(a,'activity','body','read')?{body:note.body??''}:{})};
  }
  async history(s:TransactionScope,conversation:string,after:string){return s.query("SELECT a.record_id id,r.version,r.created_at occurred_at,r.owner_principal_id actor_id FROM activity a JOIN crm_record r ON r.tenant_id=a.tenant_id AND r.id=a.record_id WHERE a.tenant_id=? AND a.related_record_id=? AND a.kind='note' AND a.record_id>? ORDER BY a.record_id LIMIT 200",[s.context.tenantId,conversation,after]);}
  async ownership(s:TransactionScope,conversation:string,after:string){return s.query('SELECT * FROM ownership_history WHERE tenant_id=? AND record_id=? AND id>? ORDER BY id LIMIT 200',[s.context.tenantId,conversation,after]);}
}
export async function notifyConversationNote(s:TransactionScope,id:string,operation:'created'|'updated'|'archived',actor:ActivityActor,revision?:string){
  if(!await activitySupported(s))return;const b=await new CrmActivityPort().binding(s,id);if(!b)return;
  const source_revision=revision??String(b.version);
  await activityNotification(s,'crm.conversation_note.changed','activity',id,source_revision,{conversation_id:b.conversation_id,activity_id:id,operation,source_revision},actor);
}
