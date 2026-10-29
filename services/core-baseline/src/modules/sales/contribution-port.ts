import type {TransactionScope} from '../../kernel/tenancy/unit-of-work.js';
import type {Access} from '../identity/domain/authorization.js';
import {fieldAllowed} from '../identity/domain/authorization.js';
import {RecordRegistry} from '../crm/registry.js';
import {allows} from '../crm/access.js';
// Sales-owned read policy for a Chat contribution reference; no record contents.
export async function visibleSalesContribution(s:TransactionScope,a:Access,context:string,session:string){
 const [row]=await s.query('SELECT record_id FROM sales_session_context WHERE tenant_id=? AND id=? AND session_id=?',[s.context.tenantId,context,session]);if(!row)return false;
 const record=await new RecordRegistry().get(s,row.record_id);
 return ['lead','deal'].includes(record.objectKey)&&allows(a,record.objectKey,'read',record)&&fieldAllowed(a,record.objectKey,'contact_id','read');
}
