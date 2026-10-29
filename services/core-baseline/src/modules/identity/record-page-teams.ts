import type {TransactionScope} from '../../kernel/tenancy/unit-of-work.js';
import {CommandError} from '../../kernel/reliability/commands.js';
import {permits,type Access} from './domain/authorization.js';
/** Identity-owned application port. Baseline local UoW; replace with Identity API on extraction. */
export async function recordPageTeams(scope:TransactionScope,access:Access,admin=false):Promise<{id:string;name:string}[]> {
  if(scope.context.tenantId!==access.tenantId||admin&&!permits(access,'team','read'))throw new CommandError(403,'FORBIDDEN');
  if(!admin&&!access.teamIds.length)return [];
  const rows=await scope.query(`SELECT id,name FROM team WHERE tenant_id=? AND active=1${admin?'':` AND id IN (${access.teamIds.map(()=>'?').join(',')})`} ORDER BY name,id LIMIT 1001`,[access.tenantId,...(admin?[]:access.teamIds)]);
  if(rows.length>1000)throw new CommandError(422,'TEAM_LIMIT_EXCEEDED');return rows;
}
