import { createCipheriv,createDecipheriv,createHash,randomBytes } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { UnitOfWork,type TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError,canonical } from '../../kernel/reliability/commands.js';
import { DeliveryError,type Consumer } from '../../kernel/reliability/delivery.js';
import { notificationFreshness } from '../../kernel/reliability/activity-notification.js';
import { IdentityAuthorization } from '../identity/authorization.js';
import { fieldAllowed,type Access } from '../identity/domain/authorization.js';
import { withFieldPolicies } from '../crm/access.js';
import { CrmActivityPort } from '../crm/activity-port.js';
import { WorkflowActivityPort } from '../workflow/activity-port.js';
import { ChatflowActivityPort } from '../chatflow/activity-port.js';
import { stamp } from '../crm/core.js';
import { object } from '../crm/properties.js';
import { uuid } from '../identity/admin.js';
import { ChannelReferences } from '../channels/ports.js';
import { conversation,requirePermission } from './domain.js';
import { messageContent } from './content.js';
import { activitySupported,activityFeature,appendActivity,prepareActivity } from './activity-storage.js';
const decimal=(v:unknown)=>typeof v==='string'&&/^[1-9][0-9]{0,19}$/.test(v);
export const activityConsumers:Consumer[]=['crm.conversation_note.changed','automation.conversation_activity.v1'].map(type=>({name:'chat.activity.'+(type.startsWith('crm')?'note':'automation')+'.v1',type,async handle(s,e){
  const d=e.data,note=type.startsWith('crm'),service=note?'crm':String(d.source_service);
  const keys=note?['conversation_id','activity_id','operation','source_revision']:['conversation_id','run_id','definition_version_id','source_service','state','source_revision'];
  const sourceId=note?d.activity_id:d.run_id;
  if(e.tenant_id!==s.context.tenantId||e.schema_version!==1||!uuid(d.conversation_id)||!uuid(sourceId)||!decimal(d.source_revision)||e.aggregate_id!==sourceId||e.aggregate_version!==d.source_revision||!uuid(e.actor.id)||!['human','system','service'].includes(e.actor.kind)||Object.keys(d).length!==keys.length||Object.keys(d).some(k=>!keys.includes(k))||e.aggregate_type!==(note?'activity':service==='workflow'?'workflow_run':'chatflow_session')||note&&!['created','updated','archived'].includes(String(d.operation))||!note&&(!['workflow','chatflow'].includes(service)||!uuid(d.definition_version_id)||!['started','paused','resumed','completed','failed','cancelled'].includes(String(d.state))))throw new DeliveryError('INVALID_EVENT');
  if(!await activitySupported(s))throw new CommandError(503,'ACTIVITY_UNAVAILABLE');
  const b=note?await new CrmActivityPort().binding(s,sourceId as string):service==='workflow'?await new WorkflowActivityPort().binding(s,sourceId as string):await new ChatflowActivityPort().binding(s,sourceId as string);
  if(!b||b.conversation_id!==d.conversation_id||BigInt(String(note?b.version:b.revision))<BigInt(d.source_revision as string)||!note&&b.definition_version_id!==d.definition_version_id)throw new DeliveryError('INVALID_EVENT');
  await s.query('SELECT id FROM crm_record WHERE tenant_id=? AND id=? FOR UPDATE',[s.context.tenantId,d.conversation_id]);
  await prepareActivity(s,d.conversation_id as string);
  await appendActivity(s,d.conversation_id as string,{service,sourceKind:note?'note':'automation',sourceId:sourceId as string,revision:d.source_revision as string,kind:note?'note':'automation',payload:note?{activity_id:sourceId}:{source_service:service,run_id:sourceId,definition_version_id:d.definition_version_id,state:d.state},occurred:e.occurred_at,actor:e.actor});
}}));
export class ConversationActivity {
  private readonly uow:UnitOfWork;private readonly auth:IdentityAuthorization;private readonly key:Buffer;
  constructor(source:DataSource,secret:string|Buffer,readonly crm=new CrmActivityPort(),readonly workflow=new WorkflowActivityPort(),readonly chatflow=new ChatflowActivityPort()){this.uow=new UnitOfWork(source);this.auth=new IdentityAuthorization(this.uow);this.key=createHash('sha256').update(secret).digest();}
  private token(binding:string,seq:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.key,iv),body=Buffer.concat([cipher.update(JSON.stringify({binding,seq,exp:Date.now()+300000})),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64url');}
  private cursor(token:unknown,binding:string){let v:any;try{if(typeof token!=='string'||token.length>4096)throw Error();const b=Buffer.from(token,'base64url'),dec=createDecipheriv('aes-256-gcm',this.key,b.subarray(0,12));dec.setAuthTag(b.subarray(12,28));v=JSON.parse(Buffer.concat([dec.update(b.subarray(28)),dec.final()]).toString());if(!/^(0|[1-9][0-9]{0,19})$/.test(v.seq)||!Number.isFinite(v.exp))throw Error();}catch{throw new CommandError(400,'INVALID_CURSOR');}if(v.exp<Date.now())throw new CommandError(400,'CURSOR_EXPIRED');if(v.binding!==binding)throw new CommandError(409,'QUERY_CHANGED');return v.seq as string;}
  private async message(s:TransactionScope,a:Access,id:string,message:string,connection:string){
    const [m]=await s.query('SELECT * FROM message WHERE tenant_id=? AND conversation_id=? AND id=?',[s.context.tenantId,id,message]);if(!m)return null;
    const {tenant_id,connection_id,provider_message_id,...wire}=m;
    const envelope:any={...wire,occurred_at:stamp(m.occurred_at),received_at:stamp(m.received_at),schema_version:3,connection_id:connection,platform:await new ChannelReferences().historyPlatform(s,connection),message_type:'text',external_msg_id:provider_message_id,text_source:'original'};
    const [stored]=await s.query('SELECT content FROM message_content WHERE tenant_id=? AND message_id=?',[s.context.tenantId,message]);
    const content=stored?messageContent(typeof stored.content==='string'?JSON.parse(stored.content):stored.content):null;
    if(content){envelope.message_type=content.message_type;envelope.text_source=content.message_type==='text'?'original':content.text_source??'preview';}
    if(fieldAllowed(a,'conversation','text','read')){let reply=null;if(content?.reply_to){const [target]=await s.query('SELECT id FROM message WHERE tenant_id=? AND connection_id=? AND conversation_id=? AND provider_message_id=? AND id<>?',[s.context.tenantId,connection,id,content.reply_to.external_msg_id,message]);reply={external_msg_id:content.reply_to.external_msg_id,internal_message_id:target?.id??null};}Object.assign(envelope,{reply_to:reply,attachment:content?.attachment??null});}else delete envelope.text;
    const [w]=await s.query('SELECT inbound_seq FROM message_workspace WHERE tenant_id=? AND message_id=?',[s.context.tenantId,message]);
    return {message_id:message,envelope,inbound_seq:w?.inbound_seq==null?null:String(w.inbound_seq)};
  }
  read(account:string,tenant:string,id:string,input:Record<string,unknown>={}){return this.uow.run({tenantId:tenant},async s=>{
    const a=await withFieldPolicies(s,await this.auth.loadHuman(s,account));if(!a.capabilities.includes('chat'))throw new CommandError(403,'FORBIDDEN');
    const {record,row:c}=await conversation(s,id);requirePermission(a,record,'read');if(!await activityFeature(s,'activity_v1'))throw new CommandError(409,'CAPABILITY_UNAVAILABLE');
    const q=object(input,['before','after','limit']),limit=Number(q.limit??50);if(q.before!==undefined&&q.after!==undefined||!Number.isInteger(limit)||limit<1||limit>100||Object.values(q).some(v=>typeof v!=='string'&&typeof v!=='number'))throw new CommandError(400,'INVALID_REQUEST');
    const binding=createHash('sha256').update(canonical({a,tenant,id})).digest('hex'),forward=q.after!==undefined;
    let pos=q.after!==undefined?this.cursor(q.after,binding):q.before!==undefined?this.cursor(q.before,binding):'18446744073709551615',high=forward?pos:'0',low=pos,hasMore=false,scanned=0;
    const data:any[]=[],unavailable=new Set<string>();
    while(data.length<limit&&scanned<2000){
      const rows=await s.query(`SELECT * FROM conversation_activity WHERE tenant_id=? AND conversation_id=? AND activity_seq${forward?'>':'<'}? ORDER BY activity_seq ${forward?'ASC':'DESC'} LIMIT 100`,[tenant,id,pos]);if(!rows.length)break;
      for(const r of rows){pos=String(r.activity_seq);if(BigInt(pos)>BigInt(high))high=pos;if(BigInt(pos)<BigInt(low))low=pos;scanned++;
        let payload=typeof r.payload==='string'?JSON.parse(r.payload):r.payload;try{
          if(r.kind==='message')payload=await this.message(s,a,id,r.source_id,c.connection_id);
          if(r.kind==='note')payload=await this.crm.read(s,a,r.source_id,id);
          if(r.kind==='automation'&&!await (r.source_service==='workflow'?this.workflow:this.chatflow).read(s,a,r.source_id,record))payload=null;
          if(r.kind==='tags'&&!fieldAllowed(a,'conversation','tags','read'))payload=null;
        }catch(e){if(e instanceof CommandError&&[403,404].includes(e.status))payload=null;else{unavailable.add(r.source_service);payload=null;}}
        if(payload)data.push({id:r.id,kind:r.kind,occurred_at:stamp(r.occurred_at),recorded_at:stamp(r.recorded_at),actor:r.actor_id?{kind:r.actor_kind,id:r.actor_id}:null,source_ref:{service:r.source_service,kind:r.source_kind,id:r.source_id,revision:String(r.source_revision)},payload});
        if(data.length>=limit||scanned>=2000)break;
      }
      if(rows.length<100&&pos===String(rows.at(-1).activity_seq))break;
    }
    hasMore=!!(await s.query(`SELECT id FROM conversation_activity WHERE tenant_id=? AND conversation_id=? AND activity_seq${forward?'>':'<'}? LIMIT 1`,[tenant,id,pos]))[0];
    if(!forward)data.reverse();
    const pending=await notificationFreshness(s,id),[counter]=await s.query('SELECT backfilled FROM conversation_activity_counter WHERE tenant_id=? AND conversation_id=?',[tenant,id]);
    const [due]=await s.query('SELECT conversation_id FROM conversation_snooze WHERE tenant_id=? AND conversation_id=? AND until_at<=UTC_TIMESTAMP(6)',[tenant,id]);if(due)pending.push({service:'chat',state:'delayed'});
    const sources=[];for(const service of ['chat','crm','workflow','chatflow']){const [last]=await s.query('SELECT MAX(recorded_at) observed FROM conversation_activity WHERE tenant_id=? AND conversation_id=? AND source_service=?',[tenant,id,service]);sources.push({service,state:unavailable.has(service)||pending.some(p=>p.service===service&&p.state==='unavailable')?'unavailable':pending.some(p=>p.service===service)?'delayed':'ready',last_observed_at:stamp(last.observed)});}
    return {data,older_cursor:!forward&&hasMore?this.token(binding,pos):null,newer_cursor:this.token(binding,high),has_more:hasMore,meta:{state:!counter?.backfilled?'backfilling':sources.some(p=>p.state!=='ready')?'partial':'ready',as_of:new Date().toISOString(),sources}};
  },'REPEATABLE READ');}
}
