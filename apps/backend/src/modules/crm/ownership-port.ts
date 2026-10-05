import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
export async function ownershipHistory(s:TransactionScope,id:string){return (await s.query('SELECT from_owner_id,to_owner_id,from_team_id,to_team_id,owner_revision,reason,actor_kind,actor_id FROM ownership_history WHERE tenant_id=? AND record_id=? ORDER BY owner_revision DESC LIMIT 100',[s.context.tenantId,id])).map((r:any)=>({...r,owner_revision:String(r.owner_revision)}));}

export async function ownedRecords(s:TransactionScope,principal:string){return (await s.query('SELECT id FROM crm_record WHERE tenant_id=? AND owner_principal_id=? AND archived_at IS NULL ORDER BY id FOR UPDATE',[s.context.tenantId,principal])).map((r:any)=>r.id as string);}
