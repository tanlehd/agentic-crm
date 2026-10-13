import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import type { Access } from '../identity/domain/authorization.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { RecordRegistry } from '../crm/registry.js';
import { checkField } from '../crm/properties.js';
import { ChannelReferences } from '../channels/ports.js';

// Baseline application port. Chat/Channels remain the authorities for source evidence.
export async function conversationLeadSource(s:TransactionScope,a:Access,id:string,contact:string,session?:string|null){
  const registry=new RecordRegistry(),r=await registry.get(s,id,true);
  registry.read(a,r);
  if(r.objectKey!=='conversation'||r.archived)throw new CommandError(404,'NOT_FOUND');
  for(const field of ['contact_id','channel','channel_id','page_id','attribution'])checkField(a,'conversation',field,'read');
  const [row]=await s.query('SELECT contact_id,connection_id FROM conversation WHERE tenant_id=? AND record_id=?',[s.context.tenantId,id]);
  if(!row||row.contact_id!==contact)throw new CommandError(422,'CONTACT_BINDING_MISMATCH');
  const [acquisition]=await s.query(`SELECT * FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=? AND ${session?'id=?':"status='active'"}`,[s.context.tenantId,id,...(session?[session]:[])]);
  if(session&&!acquisition)throw new CommandError(404,'NOT_FOUND');
  if(acquisition)return {source_conversation_session_id:acquisition.id,source_touchpoint_id:acquisition.source_touchpoint_id,source_origin:'conversation',source_classification:acquisition.source_classification,source_channel:acquisition.source_channel,source_page_id:acquisition.source_page_id,source_ad_id:acquisition.source_ad_id,source_campaign_id:acquisition.source_campaign_id,source_connection_id:acquisition.source_connection_id};
  if((await s.query('SELECT id FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=? LIMIT 1',[s.context.tenantId,id])).length)throw new CommandError(409,'SESSION_SELECTION_REQUIRED');
  const channels=new ChannelReferences(),meta=await channels.metadata(s,row.connection_id),source=await channels.attribution(s,id);
  return {source_conversation_session_id:null,source_touchpoint_id:await channels.firstTouchpoint(s,id)??null,source_origin:'conversation',source_classification:source.source==='ctm'?'paid':meta.page_id?'organic':'unknown',source_channel:meta.channel,source_page_id:meta.page_id,source_ad_id:source.ad_id,source_campaign_id:source.campaign_id,source_connection_id:row.connection_id};
}
