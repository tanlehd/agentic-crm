import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import type { Access } from '../identity/domain/authorization.js';
import { salesChatSource } from './chat-source.js';
import { fieldError } from '../crm/properties.js';
import { appendSalesContext } from './session-context.js';
export const declaredSources=['referral','website','facebook','phone','other'];
export function declaredSource(value:unknown){if(value===null||value===undefined)return null;if(typeof value!=='string'||!declaredSources.includes(value))fieldError('declared_source');return value;}
export const sourceKeys=['source_conversation_session_id','source_origin','source_classification','source_channel','source_page_id','source_ad_id','source_campaign_id','source_connection_id','source_captured_at'] as const;
export async function captureLeadSource(s:TransactionScope,a:Access,lead:string,contact:string,conversation:string|null,session?:string|null){
  const values=conversation?await salesChatSource.source(a,conversation,contact,session):{source_conversation_session_id:null,source_touchpoint_id:null,source_origin:'manual',source_classification:'manual',source_channel:null,source_page_id:null,source_ad_id:null,source_campaign_id:null,source_connection_id:null};
  await s.query(`UPDATE \`lead\` SET conversation_id=?,conversation_session_id=?,source_touchpoint_id=?,${sourceKeys.filter(k=>k!=='source_captured_at').map(k=>k+'=?').join(',')},source_captured_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND record_id=? AND source_origin='legacy'`,[conversation,values.source_conversation_session_id,values.source_touchpoint_id,...sourceKeys.filter(k=>k!=='source_captured_at').map(k=>values[k]),s.context.tenantId,lead]);
  if(conversation&&values.source_conversation_session_id)await appendSalesContext(s,lead,conversation,values.source_conversation_session_id,a.principalId,'created');
}
