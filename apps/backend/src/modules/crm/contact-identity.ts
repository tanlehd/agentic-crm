import { createHash,randomUUID } from 'node:crypto';
import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError,canonical,type SystemActor } from '../../kernel/reliability/commands.js';
import { ConversationCrmPort } from './conversation-ports.js';
export interface ContactMapping {tenant_id:string;connection_id:string;external_subject_id:string;crm_contact_id:string;crm_identity_id:string;mapping_revision:'1'}
export function identityLabel(value:unknown):string {if(typeof value!=='string'||!value.trim()||value.length>255||/[\u0000-\u001f\u007f]/.test(value))throw new CommandError(422,'VALIDATION_FAILED');return value;}
// Caller authenticates/locks tenant and connection; canonical SQL lives in CRM.
export class ContactIdentities {
 constructor(private readonly crm=new ConversationCrmPort()){}
 async lookup(s:TransactionScope,connection:string,subject:string):Promise<ContactMapping|null>{
  const [r]=await s.query('SELECT id,contact_id FROM contact_identity WHERE tenant_id=? AND connection_id=? AND external_subject_id=?',[s.context.tenantId,connection,subject]);
  if(!r)return null;await this.crm.activeContact(s,r.contact_id);
  return {tenant_id:s.context.tenantId,connection_id:connection,external_subject_id:subject,crm_contact_id:r.contact_id,crm_identity_id:r.id,mapping_revision:'1'};
 }
 async resolve(s:TransactionScope,connection:string,team:string,subject:string,label:string,correlation:string,actor:SystemActor){
  const found=await this.lookup(s,connection,subject);if(found)return {mapping:found,created:false};
  const contact=await this.crm.createInboundContact(s,team,label,correlation,actor),id=randomUUID();
  await s.query('INSERT INTO contact_identity(id,tenant_id,connection_id,contact_id,external_subject_id,display_label) VALUES (?,?,?,?,?,?)',[id,s.context.tenantId,connection,contact,subject,label]);
  return {mapping:{tenant_id:s.context.tenantId,connection_id:connection,external_subject_id:subject,crm_contact_id:contact,crm_identity_id:id,mapping_revision:'1' as const},created:true};
 }
 async resolveCommand(s:TransactionScope,c:{id:string;team_id:string;service_actor_id:string},input:{external_subject_id:string;operation_id:string;display_label?:string},correlation:string){
  const route=`crm.resolve-contact/${c.id}`,digest=createHash('sha256').update(canonical(input)).digest('hex');
  const [old]=await s.query("SELECT request_hash,response_body FROM idempotency_record WHERE tenant_id=? AND actor_kind='service' AND actor_id=? AND route_key=? AND `key`=?",[s.context.tenantId,c.service_actor_id,route,input.operation_id]);
  if(old){if(old.request_hash!==digest)throw new CommandError(409,'IDEMPOTENCY_CONFLICT');const result=typeof old.response_body==='string'?JSON.parse(old.response_body):old.response_body;await this.crm.activeContact(s,result.mapping.crm_contact_id);return result;}
  const result=await this.resolve(s,c.id,c.team_id,input.external_subject_id,input.display_label??'Messenger contact',correlation,{kind:'service',id:c.service_actor_id});
  await s.query("INSERT INTO idempotency_record(id,tenant_id,actor_kind,actor_id,route_key,`key`,request_hash,status,response_status,response_body,created_at,updated_at) VALUES (?,?,'service',?,?,?,?,'completed',200,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),s.context.tenantId,c.service_actor_id,route,input.operation_id,digest,JSON.stringify(result)]);return result;
 }
}
