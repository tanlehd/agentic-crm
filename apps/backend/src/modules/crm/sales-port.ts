import { randomUUID } from 'node:crypto';
import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError,DurableCommands } from '../../kernel/reliability/commands.js';
import type { Access } from '../identity/domain/authorization.js';
import { validateOwnershipTarget } from '../identity/authorization.js';
import { allows } from './access.js';
import { RecordRegistry,type RegistryRecord } from './registry.js';
// Sales has validated the command's state/team/CAS. CRM owns registry/share SQL.
export class SalesCrmPort {
 private readonly registry=new RecordRegistry();private readonly commands=new DurableCommands();
 async contact(s:TransactionScope,id:string){const r=await this.registry.get(s,id,true);if(r.objectKey!=='contact'||r.archived)throw new CommandError(409,'CONTACT_UNAVAILABLE');return r;}
 async shareContact(s:TransactionScope,id:string,team:string){await this.contact(s,id);await s.query('INSERT INTO record_team_access(tenant_id,record_id,team_id) VALUES (?,?,?) ON DUPLICATE KEY UPDATE team_id=VALUES(team_id)',[s.context.tenantId,id,team]);}
 async ownership(s:TransactionScope,a:Access,r:RegistryRecord,version:string,owner:string|null,team:string,correlation:string,kind:'human'|'service',action:'handoff'|'accept'){
  if(r.objectKey!=='lead'||r.archived||!allows(a,'lead',action,r))throw new CommandError(403,'FORBIDDEN');this.registry.read(a,r);
  await validateOwnershipTarget(s,owner,team);await this.registry.bump(s,r,version);
  await s.query('UPDATE crm_record SET owner_principal_id=?,team_id=?,owner_revision=owner_revision+1 WHERE tenant_id=? AND id=?',[owner,team,s.context.tenantId,r.id]);
  const current=await this.registry.get(s,r.id);
  await s.query('INSERT INTO ownership_history(id,tenant_id,record_id,from_owner_id,to_owner_id,from_team_id,to_team_id,owner_revision,reason,actor_kind,actor_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))',[randomUUID(),s.context.tenantId,r.id,r.ownerPrincipalId,owner,r.teamId,team,current.ownerRevision,action,kind,a.principalId]);
  await this.commands.recordAssigned(s,a.principalId,correlation,r.id,current.version,{record_id:r.id,object_type:'lead',from_owner_id:r.ownerPrincipalId,to_owner_id:owner,team_id:team,owner_revision:current.ownerRevision,reason:action},kind);return current;
 }
}
