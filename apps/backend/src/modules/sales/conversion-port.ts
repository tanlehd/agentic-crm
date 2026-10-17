import type {TransactionScope} from '../../kernel/tenancy/unit-of-work.js';
export async function conversionSalesFacts(s:TransactionScope){
 const tenant=s.context.tenantId;
 const leads=await s.query('SELECT record_id,source_conversation_session_id,source_channel,source_page_id,source_ad_id,source_classification,status FROM `lead` WHERE tenant_id=? LIMIT 5001',[tenant]);
 const deals=await s.query('SELECT record_id,lead_id,source_conversation_session_id,source_channel,source_page_id,source_ad_id,source_classification,stage,amount,currency,closed_at FROM deal WHERE tenant_id=? LIMIT 5001',[tenant]);
 const merges=await s.query('SELECT source_id,target_id,recorded_at FROM lead_merge WHERE tenant_id=? LIMIT 5001',[tenant]);
 const contexts=await s.query('SELECT record_id,session_id,kind FROM sales_session_context WHERE tenant_id=? LIMIT 5001',[tenant]);
 const outcomes=await s.query('SELECT need_id,record_id,session_id FROM sales_need_outcome WHERE tenant_id=? LIMIT 5001',[tenant]);
 return {leads,deals,merges,contexts,outcomes};
}
