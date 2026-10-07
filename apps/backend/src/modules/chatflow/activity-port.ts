import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { activitySupported,activityNotification } from '../../kernel/reliability/activity-notification.js';
import { permits,type Access } from '../identity/domain/authorization.js';
import type { RegistryRecord } from '../crm/registry.js';
export class ChatflowActivityPort {
  async binding(s:TransactionScope,id:string){const [r]=await s.query('SELECT conversation_id,version_id definition_version_id,version revision,status FROM chatflow_session WHERE tenant_id=? AND id=?',[s.context.tenantId,id]);return r?{...r,revision:String(r.revision)}:null;}
  async read(s:TransactionScope,a:Access,id:string,c:RegistryRecord){const r=await this.binding(s,id);return r?.conversation_id===c.id&&permits(a,'automation','read',c)?r:null;}
}
export async function notifyChatflowActivity(s:TransactionScope,id:string,previous?:string){
  if(!await activitySupported(s))return;const b=await new ChatflowActivityPort().binding(s,id);if(!b||b.status===previous)return;
  const state=b.status==='paused_human'?'paused':b.status==='running'?(previous==='paused_human'?'resumed':previous===undefined?'started':null):['completed','failed','cancelled'].includes(b.status)?b.status:null;
  if(!state)return;
  await activityNotification(s,'automation.conversation_activity.v1','chatflow_session',id,b.revision,{conversation_id:b.conversation_id,run_id:id,definition_version_id:b.definition_version_id,source_service:'chatflow',state,source_revision:b.revision},{kind:'system',id:s.context.tenantId});
}
