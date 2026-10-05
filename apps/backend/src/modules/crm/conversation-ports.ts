import { randomUUID } from 'node:crypto';
import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError,DurableCommands,type SystemActor } from '../../kernel/reliability/commands.js';
import { validateOwnershipTarget } from '../identity/authorization.js';
import { fieldAllowed,type Access } from '../identity/domain/authorization.js';
import { RecordRegistry } from './registry.js';
import { allows } from './access.js';
// Internal composition port. Never exposed as a general-purpose HTTP create bypass.
export class ConversationCrmPort {
  async createUnassigned(s:TransactionScope,team:string,correlation:string,actor:SystemActor={kind:'system',id:s.context.tenantId}):Promise<string>{
    await validateOwnershipTarget(s,null,team);
    const [type]=await s.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='conversation' AND archived_at IS NULL",[s.context.tenantId]);if(!type)throw new CommandError(409,'CONVERSATION_NOT_CONFIGURED');
    const id=randomUUID(),tenant=s.context.tenantId;
    await s.query('INSERT INTO crm_record(id,tenant_id,object_type_id,team_id,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[id,tenant,type.id,team]);
    await s.query("INSERT INTO ownership_history(id,tenant_id,record_id,to_team_id,owner_revision,reason,actor_kind,actor_id,created_at) VALUES (?,?,?, ?,1,'inbound',?,?,UTC_TIMESTAMP(6))",[randomUUID(),tenant,id,team,actor.kind,actor.id]);
    await new DurableCommands().systemAudit(s,correlation,'conversation',id,'create',['team_id'],actor);return id;
  }
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
  async contactSummary(s:TransactionScope,a:Access,id:string){
    const r=await new RecordRegistry().get(s,id);if(!allows(a,'contact','read',r))return null;
    const [row]=await s.query('SELECT record_id id,display_name,normalized_phone,normalized_email FROM contact WHERE tenant_id=? AND record_id=?',[s.context.tenantId,id]);
    return Object.fromEntries(Object.entries(row).filter(([k])=>fieldAllowed(a,'contact',k,'read')));
  }
  async notes(s:TransactionScope,a:Access,id:string,limit:number,cursor?:string){
    const visible:any[]=[];let after=cursor;
    while(visible.length<=limit){
      const rows=await s.query(`SELECT a.record_id id,a.body,r.created_at FROM activity a JOIN crm_record r ON r.tenant_id=a.tenant_id AND r.id=a.record_id WHERE a.tenant_id=? AND a.related_record_id=? AND a.kind='note' AND r.archived_at IS NULL${after?' AND a.record_id>?':''} ORDER BY a.record_id LIMIT 100`,[s.context.tenantId,id,...(after?[after]:[])]);
      for(const row of rows){const record=await new RecordRegistry().get(s,row.id);if(!allows(a,'activity','read',record))continue;visible.push({id:row.id,created_at:row.created_at instanceof Date?row.created_at.toISOString():new Date(row.created_at).toISOString(),...(fieldAllowed(a,'activity','body','read')?{body:row.body}:{})});if(visible.length>limit)break;}
      if(rows.length<100||visible.length>limit)break;after=rows.at(-1).id;
    }
    return {data:visible.slice(0,limit),next_cursor:visible.length>limit?visible[limit-1].id:null};
  }
  async note(s:TransactionScope,a:Access,conversation:string,text:string,correlation:string){
    const [type]=await s.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='activity' AND archived_at IS NULL",[s.context.tenantId]);if(!type)throw new CommandError(409,'ACTIVITY_NOT_CONFIGURED');
    const id=randomUUID(),record=await new RecordRegistry().get(s,conversation);
    await s.query('INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,team_id,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[id,s.context.tenantId,type.id,a.principalId,record.teamId]);
    await s.query("INSERT INTO activity(tenant_id,record_id,kind,subject,body,related_record_id) VALUES (?,?,'note','Internal note',?,?)",[s.context.tenantId,id,text,conversation]);
    await s.query("INSERT INTO ownership_history(id,tenant_id,record_id,to_owner_id,to_team_id,owner_revision,reason,actor_kind,actor_id,created_at) VALUES (?,?,?,?,?,1,'note','human',?,UTC_TIMESTAMP(6))",[randomUUID(),s.context.tenantId,id,a.principalId,record.teamId,a.principalId]);
    await new DurableCommands().audit(s,a.principalId,correlation,'activity',id,'note',['body','related_record_id']);return id;
  }
}
