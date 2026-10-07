import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { activitySupported,activityNotification } from '../../kernel/reliability/activity-notification.js';
import { permits,type Access } from '../identity/domain/authorization.js';
import type { RegistryRecord } from '../crm/registry.js';
import { verifyActivityConversation } from '../conversation/activity-reference-port.js';
export class WorkflowActivityPort {
  async binding(s:TransactionScope,id:string){const [r]=await s.query('SELECT id,version_id,context,activity_revision FROM workflow_run WHERE tenant_id=? AND id=?',[s.context.tenantId,id]);if(!r)return null;const context=typeof r.context==='string'?JSON.parse(r.context):r.context,t=context.trigger??{};if(!await verifyActivityConversation(s,t.aggregate_id,t.contact_id,t.connection_id))return null;return {conversation_id:t.aggregate_id,definition_version_id:r.version_id,revision:String(r.activity_revision)};}
  async read(s:TransactionScope,a:Access,id:string,c:RegistryRecord){const r=await this.binding(s,id);return r?.conversation_id===c.id&&permits(a,'automation','read',c)?r:null;}
}
export async function notifyWorkflowActivity(s:TransactionScope,id:string,state:'started'|'completed'|'failed'|'cancelled'){
  if(!await activitySupported(s)||!await new WorkflowActivityPort().binding(s,id))return;
  await s.query('UPDATE workflow_run SET activity_revision=activity_revision+1 WHERE tenant_id=? AND id=?',[s.context.tenantId,id]);
  const b=await new WorkflowActivityPort().binding(s,id);if(!b)return;
  await activityNotification(s,'automation.conversation_activity.v1','workflow_run',id,b.revision,{conversation_id:b.conversation_id,run_id:id,definition_version_id:b.definition_version_id,source_service:'workflow',state,source_revision:b.revision},{kind:'system',id:s.context.tenantId});
}
