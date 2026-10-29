import type {TransactionScope} from '../../kernel/tenancy/unit-of-work.js';
// CRM-owned metadata read port for the current monolith, not a cross-service join.
export async function conversionRecordMetadata(s:TransactionScope){
 return s.query("SELECT r.id,r.owner_principal_id,r.team_id,r.created_at,r.archived_at FROM crm_record r JOIN object_type o ON o.tenant_id=r.tenant_id AND o.id=r.object_type_id WHERE r.tenant_id=? AND o.`key` IN ('conversation','lead','deal') LIMIT 5001",[s.context.tenantId]);
}
