import { randomUUID } from 'node:crypto';
import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError,DurableCommands,type SystemActor } from '../../kernel/reliability/commands.js';
import { validateOwnershipTarget } from '../identity/authorization.js';
import { RecordRegistry } from './registry.js';
// Internal composition port. Never exposed as a general-purpose HTTP create bypass.
export class ConversationCrmPort {
  async createInboundContact(s:TransactionScope,team:string,label:string,correlation:string,actor:SystemActor){
    await validateOwnershipTarget(s,null,team);
    const [type]=await s.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='contact' AND archived_at IS NULL",[s.context.tenantId]);if(!type)throw new CommandError(409,'CONTACT_NOT_CONFIGURED');
    const id=randomUUID(),tenant=s.context.tenantId;
    await s.query('INSERT INTO crm_record(id,tenant_id,object_type_id,team_id,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[id,tenant,type.id,team]);
    await s.query('INSERT INTO contact(tenant_id,record_id,display_name) VALUES (?,?,?)',[tenant,id,label]);
    await s.query("INSERT INTO ownership_history(id,tenant_id,record_id,to_team_id,owner_revision,reason,actor_kind,actor_id,created_at) VALUES (?,?,?,?,1,'inbound',?,?,UTC_TIMESTAMP(6))",[randomUUID(),tenant,id,team,actor.kind,actor.id]);
    const commands=new DurableCommands();await commands.systemAudit(s,correlation,'contact',id,'create',['team_id'],actor);await commands.conversationEvent(s,correlation,'contact.created',id,'1',{contact_id:id},actor);return id;
  }
  async activeContact(s:TransactionScope,id:string){const r=await new RecordRegistry().get(s,id,true);if(r.objectKey!=='contact'||r.archived)throw new CommandError(409,'CONTACT_UNAVAILABLE');}
}
