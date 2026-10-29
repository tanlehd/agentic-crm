import {CommandError} from '../../kernel/reliability/commands.js';
import type {TransactionScope} from '../../kernel/tenancy/unit-of-work.js';
import type {NativeCrmOwnerMetadata} from './owner-metadata.js';

export type MetadataWrite={object:string;barrier:string};
/** CRM-local SQL fence; remote drain completes before the public writer enters its UoW. */
export class CrmMetadataWriter{
 constructor(private readonly owner:NativeCrmOwnerMetadata){}
 async drain(tenant:string,write:MetadataWrite){
  if((await this.owner.close(tenant,write.object,write.barrier)).state==='closing')throw new CommandError(503,'TEMPORARILY_UNAVAILABLE');
 }
 async enter(scope:TransactionScope,write:MetadataWrite){
  const [gate]=await scope.query("SELECT state,barrier_command_id FROM crm_reference_gate WHERE tenant_id=? AND resource_kind='metadata' AND resource_id=? FOR UPDATE",[scope.context.tenantId,write.object]);
  if(!gate||gate.barrier_command_id!==write.barrier||!['open','closing'].includes(gate.state))throw new CommandError(409,'VERSION_CONFLICT');
  if(gate.state==='open')return 'open' as const;
  const pending=await scope.query("SELECT id FROM crm_reference_reservation WHERE tenant_id=? AND resource_kind='metadata' AND resource_id=? AND state='held' LIMIT 1",[scope.context.tenantId,write.object]);
  if(pending.length)throw new CommandError(503,'TEMPORARILY_UNAVAILABLE');
  return gate.state as 'open'|'closing';
 }
 async complete(scope:TransactionScope,write:MetadataWrite){
  const [type]=await scope.query('SELECT schema_version FROM object_type WHERE tenant_id=? AND id=?',[scope.context.tenantId,write.object]);
  const result=await scope.query("UPDATE crm_reference_gate SET state='open',resource_revision=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND resource_kind='metadata' AND resource_id=? AND state='closing' AND barrier_command_id=?",[String(type.schema_version),scope.context.tenantId,write.object,write.barrier]);
  if(result.affectedRows!==1)throw new CommandError(409,'VERSION_CONFLICT');
 }
 cancel(tenant:string,write:MetadataWrite){return this.owner.cancelClose(tenant,write.object,write.barrier);}
}
