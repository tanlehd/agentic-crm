import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError, DurableCommands } from '../../kernel/reliability/commands.js';
import { validateOwnershipTarget } from '../identity/authorization.js';
import type { Access, RecordAccess } from '../identity/domain/authorization.js';
import { allows } from './access.js';
import { registryId } from './ids.js';
export interface RegistryRecord extends RecordAccess { id:string; objectTypeId:string; objectKey:string; kind:'standard'|'custom'; version:string; ownerRevision:string; archived:boolean }
// Installed only by module composition. Never accept an adapter/table from HTTP.
export interface SubtypeAdapter {
  insert(scope:TransactionScope,id:string,input:unknown):Promise<void>;
  exists(scope:TransactionScope,id:string):Promise<boolean>;
  eligible(scope:TransactionScope,record:RegistryRecord,owner:string|null,team:string|null):Promise<void>;
  assigned(scope:TransactionScope,record:RegistryRecord):Promise<void>;
}
export class RecordRegistry {
  constructor(private readonly adapters:ReadonlyMap<string,SubtypeAdapter>=new Map(),private readonly commands=new DurableCommands()){}
  private adapter(key:string):SubtypeAdapter {const adapter=this.adapters.get(key);if(!adapter)throw new CommandError(422,'OBJECT_NOT_IMPLEMENTED');return adapter;}
  async get(scope:TransactionScope,id:string,lock=false):Promise<RegistryRecord>{
    const [r]=await scope.query(`SELECT r.*,o.\`key\` object_key,o.kind FROM crm_record r JOIN object_type o ON o.tenant_id=r.tenant_id AND o.id=r.object_type_id WHERE r.tenant_id=? AND r.id=?${lock?' FOR UPDATE':''}`,[scope.context.tenantId,id]);
    if(!r)throw new CommandError(404,'NOT_FOUND');
    return {id:r.id,tenantId:r.tenant_id,objectTypeId:r.object_type_id,objectKey:r.object_key,kind:r.kind,ownerPrincipalId:r.owner_principal_id,teamId:r.team_id,sharedTeamIds:(await scope.query('SELECT team_id FROM record_team_access WHERE tenant_id=? AND record_id=?',[scope.context.tenantId,id])).map((t:any)=>t.team_id),version:String(r.version),ownerRevision:String(r.owner_revision),archived:r.archived_at!==null};
  }
  read(access:Access,record:RegistryRecord):void {if(!allows(access,record.objectKey,'read',record))throw new CommandError(404,'NOT_FOUND');}
  async create(scope:TransactionScope,access:Access,key:string,input:unknown,team:string|null,correlation:string):Promise<RegistryRecord>{
    const adapter=this.adapter(key);
    const [type]=await scope.query('SELECT id FROM object_type WHERE tenant_id=? AND `key`=? AND archived_at IS NULL',[scope.context.tenantId,key]);
    if(!type)throw new CommandError(404,'NOT_FOUND');
    const candidate={tenantId:scope.context.tenantId,ownerPrincipalId:access.principalId,teamId:team,sharedTeamIds:[]};
    if(!allows(access,key,'create',candidate)||team&&!access.teamIds.includes(team)&&!allows(access,key,'create'))throw new CommandError(403,'FORBIDDEN');
    await validateOwnershipTarget(scope,access.principalId,team);
    const id=registryId();
    await scope.query('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,team_id,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[id,scope.context.tenantId,type.id,access.principalId,team]);
    await adapter.insert(scope,id,input);
    if(!await adapter.exists(scope,id))throw new Error('SUBTYPE_REQUIRED');
    const record=await this.get(scope,id);
    await this.history(scope,access,record,null,null,'created');
    await this.commands.audit(scope,access.principalId,correlation,key,id,'create',['owner_principal_id','team_id']);
    return record;
  }
  // Callers must not swallow errors: subtype and registry share the same UoW.
  async update(scope:TransactionScope,access:Access,id:string,version:string,write:(scope:TransactionScope)=>Promise<void>):Promise<RegistryRecord>{
    const record=await this.get(scope,id,true);this.read(access,record);
    if(!allows(access,record.objectKey,'update',record))throw new CommandError(403,'FORBIDDEN');
    const adapter=this.adapter(record.objectKey);
    if(record.archived)throw new CommandError(409,'INVALID_TRANSITION');
    await this.bump(scope,record,version);await write(scope);
    if(!await adapter.exists(scope,id))throw new Error('SUBTYPE_REQUIRED');
    return this.get(scope,id);
  }
  async bump(scope:TransactionScope,record:RegistryRecord,version:string):Promise<void>{
    if(record.tenantId!==scope.context.tenantId)throw new CommandError(404,'NOT_FOUND');
    const result=await scope.query('UPDATE crm_record SET version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=? AND version=?',[scope.context.tenantId,record.id,version]);
    if(result.affectedRows!==1)throw new CommandError(409,'VERSION_CONFLICT');
  }
  async assign(scope:TransactionScope,access:Access,id:string,version:string,owner:string|null,team:string|null,correlation:string):Promise<RegistryRecord>{
    const record=await this.get(scope,id,true);this.read(access,record);
    if(!allows(access,record.objectKey,'assign',record)||team===null&&record.teamId!==null&&!access.capabilities.includes('configure'))throw new CommandError(403,'FORBIDDEN');
    if(record.archived)throw new CommandError(409,'INVALID_TRANSITION');
    const adapter=this.adapter(record.objectKey);
    await validateOwnershipTarget(scope,owner,team);await adapter.eligible(scope,record,owner,team);
    if(!await adapter.exists(scope,id))throw new Error('SUBTYPE_REQUIRED');
    await this.bump(scope,record,version);
    await scope.query('UPDATE crm_record SET owner_principal_id=?,team_id=?,owner_revision=owner_revision+1 WHERE tenant_id=? AND id=?',[owner,team,scope.context.tenantId,id]);
    const current=await this.get(scope,id);
    await adapter.assigned(scope,current);
    await this.history(scope,access,current,record.ownerPrincipalId,record.teamId,'assigned');
    await this.commands.audit(scope,access.principalId,correlation,record.objectKey,id,'assign',['owner_principal_id','team_id','owner_revision']);
    await this.commands.recordAssigned(scope,access.principalId,correlation,id,current.version,{record_id:id,object_type:record.objectKey,from_owner_id:record.ownerPrincipalId,to_owner_id:owner,team_id:team,owner_revision:current.ownerRevision,reason:'assigned'});
    return current;
  }
  private async history(scope:TransactionScope,access:Access,r:RegistryRecord,fromOwner:string|null,fromTeam:string|null,reason:string){
    if(access.tenantId!==scope.context.tenantId)throw new CommandError(403,'FORBIDDEN');
    await scope.query("INSERT INTO ownership_history(id,tenant_id,record_id,from_owner_id,to_owner_id,from_team_id,to_team_id,owner_revision,reason,actor_kind,actor_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,'human',?,UTC_TIMESTAMP(6))",[registryId(),scope.context.tenantId,r.id,fromOwner,r.ownerPrincipalId,fromTeam,r.teamId,r.ownerRevision,reason,access.principalId]);
  }
}
