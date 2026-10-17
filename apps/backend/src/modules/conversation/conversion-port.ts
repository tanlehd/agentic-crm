import type {TransactionScope} from '../../kernel/tenancy/unit-of-work.js';
export async function conversionChatFacts(s:TransactionScope){
 const sessions=await s.query(`SELECT a.*,
 (SELECT c.owner_id FROM session_contribution c WHERE c.tenant_id=a.tenant_id AND c.session_id=a.id AND c.kind IN ('opened','assignment') AND c.owner_id IS NOT NULL AND EXISTS(SELECT 1 FROM session_contribution o WHERE o.tenant_id=a.tenant_id AND o.session_id=a.id AND o.kind='opened') ORDER BY c.revision LIMIT 1) initial_owner_id,
 (SELECT c.team_id FROM session_contribution c WHERE c.tenant_id=a.tenant_id AND c.session_id=a.id AND c.kind IN ('opened','assignment') AND c.owner_id IS NOT NULL AND EXISTS(SELECT 1 FROM session_contribution o WHERE o.tenant_id=a.tenant_id AND o.session_id=a.id AND o.kind='opened') ORDER BY c.revision LIMIT 1) initial_team_id
 FROM conversation_acquisition_session a WHERE a.tenant_id=? LIMIT 5001`,[s.context.tenantId]);
 const needs=await s.query('SELECT id,session_id,created_at FROM session_need WHERE tenant_id=? LIMIT 5001',[s.context.tenantId]);
 return {sessions,needs};
}
