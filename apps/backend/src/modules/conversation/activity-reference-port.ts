import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
// Source-side verified trigger binding; replace with Chat API on extraction.
export async function verifyActivityConversation(s:TransactionScope,id:string,contact:string,connection:string){
  if(![id,contact,connection].every(v=>typeof v==='string'))return false;
  const [c]=await s.query('SELECT record_id FROM conversation WHERE tenant_id=? AND record_id=? AND contact_id=? AND connection_id=?',[s.context.tenantId,id,contact,connection]);
  return !!c;
}
