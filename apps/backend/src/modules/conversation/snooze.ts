import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { UnitOfWork,type TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { activityNotification,activitySupported,type ActivityActor } from '../../kernel/reliability/activity-notification.js';
import { CommandError,DurableCommands } from '../../kernel/reliability/commands.js';
import { IdentityAuthorization } from '../identity/authorization.js';
import { permits,type Access } from '../identity/domain/authorization.js';
import { withFieldPolicies } from '../crm/access.js';
import { stamp } from '../crm/core.js';
import { object } from '../crm/properties.js';
import { conversation,requirePermission } from './domain.js';
import { appendActivity,prepareActivity,activityFeature } from './activity-storage.js';
export function snoozeInput(input:unknown,now:Date){
  const b=object(input,['until','reason']);
  if(typeof b.until!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(b.until)||!Number.isFinite(Date.parse(b.until))||Date.parse(b.until)<=now.getTime()||Date.parse(b.until)>now.getTime()+30*86400000||b.reason!==undefined&&(typeof b.reason!=='string'||b.reason.length>250))throw new CommandError(422,'VALIDATION_FAILED');
  if(new Date(b.until).toISOString().slice(0,19)!==b.until.slice(0,19))throw new CommandError(422,'VALIDATION_FAILED');
  return {until:new Date(b.until),reason:b.reason??null};
}
async function recordChange(s:TransactionScope,id:string,until:Date|null,cause:string,actor:ActivityActor,reason:string|null=null){
  const tenant=s.context.tenantId;
  await s.query('INSERT INTO conversation_snooze(tenant_id,conversation_id,until_at,actor_principal_id,reason,last_cause,updated_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE until_at=VALUES(until_at),revision=revision+1,actor_principal_id=VALUES(actor_principal_id),reason=VALUES(reason),last_cause=VALUES(last_cause),updated_at=UTC_TIMESTAMP(6)',[tenant,id,until,actor.kind==='human'?actor.id:null,reason,cause]);
  await s.query('UPDATE conversation_workspace w JOIN conversation_snooze z ON z.tenant_id=w.tenant_id AND z.conversation_id=w.conversation_id SET w.snoozed_until=z.until_at,w.snooze_revision=z.revision WHERE w.tenant_id=? AND w.conversation_id=?',[tenant,id]);
  const [r]=await s.query('SELECT z.revision,r.version FROM conversation_snooze z JOIN crm_record r ON r.tenant_id=z.tenant_id AND r.id=z.conversation_id WHERE z.tenant_id=? AND z.conversation_id=?',[tenant,id]);
  const payload={conversation_id:id,until:stamp(until),snooze_revision:String(r.revision),cause};
  await activityNotification(s,'chat.snooze.changed','conversation',id,String(r.version),payload,actor);
  await appendActivity(s,id,{service:'chat',sourceKind:'snooze',sourceId:id,revision:String(r.revision),kind:'snooze',payload:{until:stamp(until),cause},actor});
  await new DurableCommands().systemAudit(s,randomUUID(),'conversation',id,'snooze.'+cause,['snoozed_until'],{kind:'system',id:tenant});
}
// Caller holds Conversation fence; compound legacy commands already increment version.
export async function wakeSnooze(s:TransactionScope,id:string,cause:'deadline'|'inbound'|'manual'|'assignment'|'closed',bump=false,expected?:string,actor:ActivityActor={kind:'system',id:s.context.tenantId}){
  if(!await activitySupported(s))return false;
  const [z]=await s.query('SELECT *,until_at<=UTC_TIMESTAMP(6) due FROM conversation_snooze WHERE tenant_id=? AND conversation_id=?',[s.context.tenantId,id]);
  if(!z?.until_at||expected!==undefined&&String(z.revision)!==expected||cause==='deadline'&&!Number(z.due))return false;
  await prepareActivity(s,id);
  if(bump)await s.query('UPDATE crm_record SET version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[s.context.tenantId,id]);
  await recordChange(s,id,null,cause,actor);return true;
}
export class ConversationSnooze {
  readonly uow:UnitOfWork;private readonly auth:IdentityAuthorization;private readonly commands=new DurableCommands();
  constructor(private readonly source:DataSource){this.uow=new UnitOfWork(source);this.auth=new IdentityAuthorization(this.uow);}
  private async ready(s:TransactionScope,a:Access){if(!a.capabilities.includes('chat'))throw new CommandError(403,'FORBIDDEN');if(!await activityFeature(s,'snooze_v1'))throw new CommandError(409,'CAPABILITY_UNAVAILABLE');}
  async state(s:TransactionScope,a:Access,id:string,reason=true){
    const {record}=await conversation(s,id);requirePermission(a,record,'read');
    const [z]=await s.query('SELECT *,until_at>UTC_TIMESTAMP(6) active FROM conversation_snooze WHERE tenant_id=? AND conversation_id=?',[s.context.tenantId,id]);
    const active=Number(z?.active)===1;
    return {conversation_id:id,until:active?stamp(z.until_at):null,snooze_revision:String(z?.revision??0),version:record.version,...(reason&&active&&z.reason!==null&&permits(a,'conversation','update',record)?{reason:z.reason}:{})};
  }
  get(account:string,tenant:string,id:string){return this.auth.runHuman(account,tenant,async(s,raw)=>{const a=await withFieldPolicies(s,raw);await this.ready(s,a);return {data:await this.state(s,a,id),meta:{as_of:new Date().toISOString()}};});}
  mutate(account:string,tenant:string,id:string,operation:'snooze'|'wake',input:unknown,key:string,version:unknown,correlation:string){return this.uow.run({tenantId:tenant},async s=>{
    const a=await withFieldPolicies(s,await this.auth.loadHuman(s,account,undefined,true));await this.ready(s,a);
    const {record:r,row:c}=await conversation(s,id,true);requirePermission(a,r,'read');requirePermission(a,r,'update');
    if(typeof key!=='string'||!/^[\x21-\x7e]{1,128}$/.test(key))throw new CommandError(400,'INVALID_REQUEST');
    const body=object(input,operation==='wake'?[]:['until','reason']),command={actorId:a.principalId,route:`${operation} /api/v1/chat-workspace/conversations/${id}`,key,body,version:typeof version==='string'?version:undefined,correlationId:correlation};
    const replay=await this.commands.replay(s,command,async()=>{});if(replay)return replay;
    if(version===undefined)throw new CommandError(428,'PRECONDITION_REQUIRED');if(typeof version!=='string'||!/^(?:"[1-9][0-9]{0,19}"|[1-9][0-9]{0,19})$/.test(version))throw new CommandError(400,'INVALID_REQUEST');if(version.replaceAll('"','')!==r.version)throw new CommandError(409,'VERSION_CONFLICT');
    if(c.status==='closed')throw new CommandError(409,'INVALID_TRANSITION');
    const [{now}]=await s.query('SELECT UTC_TIMESTAMP(6) now');const schedule=operation==='snooze'?snoozeInput(body,new Date(now)):null;
    await prepareActivity(s,id);await s.query('UPDATE crm_record SET version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[tenant,id]);
    const actor={kind:'human',id:a.principalId};
    // Materialize an expired generation before replacing it, under the same fence.
    const expired=await wakeSnooze(s,id,'deadline',false,undefined,actor);
    if(schedule){const [z]=await s.query('SELECT until_at FROM conversation_snooze WHERE tenant_id=? AND conversation_id=?',[tenant,id]);await recordChange(s,id,schedule.until,z?.until_at?'rescheduled':'scheduled',actor,schedule.reason);}
    else if(!expired)await wakeSnooze(s,id,'manual',false,undefined,actor);
    await this.commands.audit(s,a.principalId,correlation,'conversation',id,operation,['snoozed_until']);
    const result={status:200,body:{data:await this.state(s,a,id,false),meta:{correlation_id:correlation}}};await this.commands.complete(s,command,result);return result;
  });}
  async tick(){
    if(!(await this.source.query("SELECT version FROM schema_migration WHERE version=22 AND state='applied'"))[0])return;
    const rows=await this.source.query('SELECT tenant_id,conversation_id,revision FROM conversation_snooze WHERE until_at<=UTC_TIMESTAMP(6) ORDER BY until_at,tenant_id,conversation_id LIMIT 100');
    for(const z of rows)await this.uow.run({tenantId:z.tenant_id},async s=>{await s.query('SELECT id FROM tenant WHERE id=? FOR SHARE',[z.tenant_id]);await s.query('SELECT id FROM crm_record WHERE tenant_id=? AND id=? FOR UPDATE',[z.tenant_id,z.conversation_id]);await wakeSnooze(s,z.conversation_id,'deadline',true,String(z.revision));});
  }
}
