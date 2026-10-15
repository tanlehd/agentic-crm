import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
// Published references only; caller must hold automation.design/all.
export function workflowChatflowOptions(s:TransactionScope){
  return s.query("SELECT v.id,d.name,v.number FROM chatflow_version v JOIN chatflow_definition d ON d.tenant_id=v.tenant_id AND d.id=v.definition_id WHERE v.tenant_id=? AND v.state='published' ORDER BY v.id LIMIT 201",[s.context.tenantId]);
}
