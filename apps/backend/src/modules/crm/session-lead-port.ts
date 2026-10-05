import { randomUUID } from 'node:crypto';
import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError,DurableCommands } from '../../kernel/reliability/commands.js';
import type { Access } from '../identity/domain/authorization.js';
import { validateOwnershipTarget } from '../identity/authorization.js';
import { allows } from './access.js';
import { RecordRegistry } from './registry.js';
export async function createSessionLeadRecord(s:TransactionScope,a:Access,owner:string,team:string|null,correlation:string,kind:'human'|'service'){
  const candidate={tenantId:s.context.tenantId,ownerPrincipalId:owner,teamId:team,sharedTeamIds:[]};if(!allows(a,'lead','create',candidate))throw new CommandError(403,'FORBIDDEN');
  await validateOwnershipTarget(s,owner,team);const [type]=await s.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='lead' AND archived_at IS NULL",[s.context.tenantId]);if(!type)throw new CommandError(422,'LEAD_NOT_CONFIGURED');
  const id=randomUUID();await s.query('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,team_id,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[id,s.context.tenantId,type.id,owner,team]);
  await s.query("INSERT INTO ownership_history(id,tenant_id,record_id,to_owner_id,to_team_id,owner_revision,reason,actor_kind,actor_id,created_at) VALUES (?,?,?,?,?,1,'chatflow',?,?,UTC_TIMESTAMP(6))",[randomUUID(),s.context.tenantId,id,owner,team,kind,a.principalId]);
  if(kind==='human')await new DurableCommands().audit(s,a.principalId,correlation,'lead',id,'lead.create',['owner_principal_id','team_id']);else await new DurableCommands().systemAudit(s,correlation,'lead',id,'lead.create',['owner_principal_id','team_id'],{kind,id:a.principalId});return new RecordRegistry().get(s,id);
}
