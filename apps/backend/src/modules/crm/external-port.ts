import type {TransactionScope} from '../../kernel/tenancy/unit-of-work.js';
import {standardFields,standardProperty} from './core.js';
import {properties} from './properties.js';
export interface ExternalObject {key:string;label:string;scope:string;properties:{key:string;label:string;type:string;sensitive:boolean}[]}
// CRM owns metadata discovery. Only explicitly implemented read aggregates are admitted.
export async function externalCatalog(scope:TransactionScope):Promise<ExternalObject[]>{
  const rows=await scope.query("SELECT id,`key`,label,kind FROM object_type WHERE tenant_id=? AND archived_at IS NULL AND (kind='custom' OR `key` IN ('contact','company','lead','deal')) ORDER BY `key` LIMIT 200",[scope.context.tenantId]);
  return Promise.all(rows.map(async(row:any)=>({key:row.key,label:row.label,scope:`crm.objects.${row.key}.read`,properties:[...(standardFields[row.key]??[]),...(row.key==='deal'?[standardProperty('amount','decimal'),standardProperty('currency','string')]:[]),...await properties(scope,row.id)].map(p=>({key:p.key,label:p.label,type:p.type,sensitive:!!p.sensitive}))})));
}
