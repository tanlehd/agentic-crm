import { messageContent,legacyContentText } from './content.js';
import { prepareWorkspace,workspaceInbound,workspaceOutbound,workspaceClosed } from './workspace-storage.js';
import { stopSessions } from '../chatflow/lifecycle.js';
import { cancelAgentExecutions } from '../agents/cancellation.js';
import { randomUUID,createHmac,timingSafeEqual } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { UnitOfWork,type TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError,DurableCommands,canonical,type SystemActor } from '../../kernel/reliability/commands.js';
import { IdentityAuthorization,requireActiveTenant,conversationOwnerKind } from '../identity/authorization.js';
import { permits,fieldAllowed,type Access } from '../identity/domain/authorization.js';
import { uuid } from '../identity/admin.js';
import { RecordRegistry,type RegistryRecord } from '../crm/registry.js';
import { withFieldPolicies } from '../crm/access.js';
import { object,checkField } from '../crm/properties.js';
import { stamp,type ArchiveGuard } from '../crm/core.js';
import { ConversationCrmPort } from '../crm/conversation-ports.js';
import { ChannelReferences } from '../channels/ports.js';
export function messageText(v:unknown){if(typeof v!=='string'||!v.trim()||v.length>4000)throw new CommandError(422,'VALIDATION_FAILED');return v;}
export function revision(v:unknown):string{if(typeof v!=='string'||! /^[1-9][0-9]{0,19}$/.test(v))throw new CommandError(400,'INVALID_REQUEST');return v;}
export function requirePermission(a:Access,r:RegistryRecord,action:string){if(!permits(a,'conversation',action,r))throw new CommandError(action==='read'?404:403,action==='read'?'NOT_FOUND':'FORBIDDEN');}
export async function conversation(s:TransactionScope,id:string,lock=false){
  if(!uuid(id))throw new CommandError(400,'INVALID_REQUEST');
  const record=await new RecordRegistry().get(s,id,lock);if(record.objectKey!=='conversation'||record.archived)throw new CommandError(404,'NOT_FOUND');
  const [row]=await s.query('SELECT * FROM conversation WHERE tenant_id=? AND record_id=?',[s.context.tenantId,id]);if(!row)throw new CommandError(404,'NOT_FOUND');return {record,row};
}
export async function cancelQueued(s:TransactionScope,id:string){
  await s.query("UPDATE message m JOIN outbound_intent i ON i.tenant_id=m.tenant_id AND i.id=m.outbound_intent_id SET m.status='cancelled',i.status='cancelled',i.error_code='OWNER_OR_STATE_CHANGED' WHERE i.tenant_id=? AND i.conversation_id=? AND i.status='queued'",[s.context.tenantId,id]);
}
export const conversationArchiveGuard:ArchiveGuard=async(s,r)=>{if(r.objectKey==='contact'&&(await s.query("SELECT record_id FROM conversation WHERE tenant_id=? AND contact_id=? AND status<>'closed' LIMIT 1",[s.context.tenantId,r.id]))[0])throw new CommandError(409,'ACTIVE_DEPENDENCY');};
export type CloseHook=(s:TransactionScope,id:string)=>Promise<void>;
export class Conversations {
  readonly uow:UnitOfWork;readonly auth:IdentityAuthorization;
  private readonly commands=new DurableCommands();private readonly registry=new RecordRegistry();
  constructor(source:DataSource,private readonly secret:string|Buffer,private readonly channels=new ChannelReferences(),private readonly crm=new ConversationCrmPort(),private readonly onClose:CloseHook=async()=>{}){this.uow=new UnitOfWork(source);this.auth=new IdentityAuthorization(this.uow);}
  // Trusted normalized intake only. Caller owns transaction and durable delivery acknowledgment.
  async receive(s:TransactionScope,input:{identityId:string;crmContactId?:string;providerMessageId:string;text:string;occurredAt:string;correlation:string;actor?:SystemActor;content?:unknown}){
    const content=input.content===undefined?undefined:messageContent(input.content);
    if(content&&legacyContentText(content)!==input.text)throw new CommandError(422,'MESSAGE_CONTENT_INVALID');
    messageText(input.text);if(!uuid(input.identityId)||typeof input.providerMessageId!=='string'||!input.providerMessageId.trim()||input.providerMessageId.length>255||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(input.occurredAt)||!Number.isFinite(Date.parse(input.occurredAt)))throw new CommandError(400,'INVALID_REQUEST');
    await requireActiveTenant(s);
    const identity=await this.channels.lockIdentity(s,input.identityId);if(input.crmContactId!==undefined&&input.crmContactId!==identity.contactId)throw new CommandError(409,'CONTACT_BINDING_STALE');await this.crm.activeContact(s,identity.contactId);
    const tenant=s.context.tenantId;
    const [existing]=await s.query('SELECT m.*,c.contact_identity_id FROM message m JOIN conversation c ON c.tenant_id=m.tenant_id AND c.record_id=m.conversation_id WHERE m.tenant_id=? AND m.connection_id=? AND m.provider_message_id=?',[tenant,identity.connectionId,input.providerMessageId]);
    if(existing){const [stored]=await s.query('SELECT content FROM message_content WHERE tenant_id=? AND message_id=?',[tenant,existing.id]);if(canonical(stored?(typeof stored.content==='string'?JSON.parse(stored.content):stored.content):null)!==canonical(content??null))throw new CommandError(409,'MESSAGE_PAYLOAD_CONFLICT');if(existing.direction!=='inbound'||existing.contact_identity_id!==identity.id||existing.text!==input.text||stamp(existing.occurred_at)!==new Date(input.occurredAt).toISOString())throw new CommandError(409,'MESSAGE_PAYLOAD_CONFLICT');return {conversationId:existing.conversation_id,messageId:existing.id,duplicate:true};}
    const [active]=await s.query('SELECT record_id FROM conversation WHERE tenant_id=? AND active_identity_key=?',[tenant,identity.id]);
    let id:string,version:string;
    if(active){id=active.record_id;const c=await conversation(s,id,true);await this.registry.bump(s,c.record,c.record.version);version=String(BigInt(c.record.version)+1n);await s.query("UPDATE conversation SET status='open' WHERE tenant_id=? AND record_id=?",[tenant,id]);}
    else {id=await this.crm.createUnassigned(s,identity.teamId,input.correlation,input.actor);version='1';await s.query("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,opened_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))",[tenant,id,identity.contactId,identity.id,identity.connectionId]);await this.commands.conversationEvent(s,input.correlation,'conversation.created',id,version,{contact_id:identity.contactId,connection_id:identity.connectionId},input.actor);}
    await prepareWorkspace(s,id);
    const messageId=randomUUID();await s.query("INSERT INTO message(id,tenant_id,conversation_id,connection_id,provider_message_id,direction,text,occurred_at,received_at,status) VALUES (?,?,?,?,?,'inbound',?,?,UTC_TIMESTAMP(6),'received')",[messageId,tenant,id,identity.connectionId,input.providerMessageId,input.text,new Date(input.occurredAt)]);
    await workspaceInbound(s,id,messageId);
    if(content)await s.query('INSERT INTO message_content(tenant_id,message_id,content) VALUES (?,?,?)',[tenant,messageId,JSON.stringify(content)]);
    await this.commands.systemAudit(s,input.correlation,'conversation',id,'message.receive',['message_id'],input.actor);
    await this.commands.conversationEvent(s,input.correlation,'message.received',id,version,{conversation_id:id,message_id:messageId,connection_id:identity.connectionId},input.actor);
    return {conversationId:id,messageId,duplicate:false};
  }
  async findInbound(s:TransactionScope,connectionId:string,providerId:string):Promise<{conversationId:string;messageId:string}|null>{
    const [row]=await s.query("SELECT conversation_id,id FROM message WHERE tenant_id=? AND connection_id=? AND provider_message_id=? AND direction='inbound'",[s.context.tenantId,connectionId,providerId]);
    return row?{conversationId:row.conversation_id,messageId:row.id}:null;
  }
  private async latest(s:TransactionScope,a:Access,id:string){
    const [m]=await s.query('SELECT id,text,status,direction,received_at FROM message WHERE tenant_id=? AND conversation_id=? ORDER BY received_at DESC,id DESC LIMIT 1',[s.context.tenantId,id]);
    if(!m)return null;return {id:m.id,status:m.status,direction:m.direction,received_at:stamp(m.received_at),...(fieldAllowed(a,'conversation','text','read')?{text:m.text}:{})};
  }
  private async output(s:TransactionScope,a:Access,id:string){const {record:r,row:c}=await conversation(s,id);requirePermission(a,r,'read');return {id,contact_id:c.contact_id,contact_identity_id:c.contact_identity_id,connection_id:c.connection_id,...Object.fromEntries(Object.entries(await this.channels.metadata(s,c.connection_id)).filter(([field])=>fieldAllowed(a,'conversation',field,'read'))),status:c.status,opened_at:stamp(c.opened_at),closed_at:stamp(c.closed_at),version:r.version,owner_revision:r.ownerRevision,owner_principal_id:r.ownerPrincipalId,owner_kind:await conversationOwnerKind(s,r.ownerPrincipalId),allowed_actions:c.status==='closed'?[]:['reply','note','update','assign','takeover'].filter(action=>permits(a,'conversation',action,r)&&(['update','assign','takeover'].includes(action)||fieldAllowed(a,'conversation','text','read')&&fieldAllowed(a,'conversation','text','write'))&&(action!=='reply'||r.ownerPrincipalId===a.principalId)&&(action!=='note'||fieldAllowed(a,'activity','body','read')&&fieldAllowed(a,'activity','body','write'))),team_id:r.teamId,contact:await this.crm.contactSummary(s,a,c.contact_id),latest_message:await this.latest(s,a,id),...(fieldAllowed(a,'conversation','attribution','read')?{attribution:await this.channels.attribution(s,id)}:{})};}
  private async intent(s:TransactionScope,id:string,intent:string){
    if(!uuid(intent))throw new CommandError(400,'INVALID_REQUEST');const [r]=await s.query('SELECT i.id,i.conversation_id,m.id message_id,i.status,i.provider_message_id,i.error_code FROM outbound_intent i JOIN message m ON m.tenant_id=i.tenant_id AND m.outbound_intent_id=i.id WHERE i.tenant_id=? AND i.conversation_id=? AND i.id=?',[s.context.tenantId,id,intent]);if(!r)throw new CommandError(404,'NOT_FOUND');return r;
  }
  project(s:TransactionScope,a:Access,id:string){return this.output(s,a,id);}
  read(account:string,tenant:string,id?:string,kind:'detail'|'messages'|'envelopes'|'rich'|'intent'|'notes'='detail',query:Record<string,unknown>={},intentId?:string){return this.auth.runHuman(account,tenant,async(s,raw)=>{
    const a=await withFieldPolicies(s,raw);
    if(id){const {record}=await conversation(s,id);requirePermission(a,record,'read');if(kind==='notes'){const limit=query.limit===undefined?50:Number(query.limit);if(Object.keys(query).some(k=>!['limit','cursor'].includes(k))||!Number.isInteger(limit)||limit<1||limit>100||typeof query.limit==='object'||query.cursor!==undefined&&!uuid(query.cursor))throw new CommandError(400,'INVALID_REQUEST');return this.crm.notes(s,a,id,limit,query.cursor as string|undefined);}if(kind!=='messages'&&kind!=='envelopes'&&kind!=='rich'&&Object.keys(query).length)throw new CommandError(400,'INVALID_REQUEST');if(kind==='detail')return {data:await this.output(s,a,id)};if(kind==='intent')return {data:await this.intent(s,id,intentId!)};}
    const result=await this.list(s,a,account,id,query);
    if(kind!=='envelopes'&&kind!=='rich')return result;
    if(!id)throw new CommandError(400,'INVALID_REQUEST');
    const {row}=await conversation(s,id);
    const platform=await this.channels.historyPlatform(s,row.connection_id);
    const data=[];
    for(const message of result.data){
      const {provider_message_id,...wire}=message;
      let content=undefined;
      if(kind==='rich'){
        const [stored]=await s.query('SELECT content FROM message_content WHERE tenant_id=? AND message_id=?',[tenant,message.id]);
        if(stored)content=messageContent(typeof stored.content==='string'?JSON.parse(stored.content):stored.content);
      }
      const envelope={...wire,schema_version:kind==='rich'?3:2,connection_id:row.connection_id,platform,message_type:content?.message_type??'text',external_msg_id:provider_message_id,...(kind==='rich'?{text_source:content&&content.message_type!=='text'?content.text_source??'preview':'original'}:{})};
      if(fieldAllowed(a,'conversation','text','read')){
        let reply=null;
        if(content?.reply_to){
          const [target]=await s.query('SELECT id FROM message WHERE tenant_id=? AND connection_id=? AND conversation_id=? AND provider_message_id=? AND id<>?',[tenant,row.connection_id,id,content.reply_to.external_msg_id,message.id]);
          reply={external_msg_id:content.reply_to.external_msg_id,internal_message_id:target?.id??null};
        }
        Object.assign(envelope,{text:wire.text,reply_to:reply,attachment:content?.attachment??null});
      }
      data.push(envelope);
    }
    return {...result,data};
  });}
  channelOptions(account:string,tenant:string,q:Record<string,unknown>){return this.auth.runHuman(account,tenant,async(s,raw)=>{
    const a=await withFieldPolicies(s,raw);if(['channel','channel_id','page_id','channel_name'].some(field=>!fieldAllowed(a,'conversation',field,'read')))throw new CommandError(403,'FIELD_FORBIDDEN');
    if(!a.capabilities.includes('read')||!a.grants.some(g=>g.resource==='conversation'&&g.action==='read'))throw new CommandError(403,'FORBIDDEN');
    const limit=q.limit===undefined?100:Number(q.limit);if(Object.keys(q).some(k=>!['limit','cursor'].includes(k))||typeof q.limit==='object'||!Number.isInteger(limit)||limit<1||limit>100||q.cursor!==undefined&&!uuid(q.cursor))throw new CommandError(400,'INVALID_REQUEST');
    let cursor=(q.cursor??'') as string;const result:any[]=[];
    for(;;){const rows=await s.query('SELECT DISTINCT connection_id id FROM conversation WHERE tenant_id=? AND connection_id>? ORDER BY connection_id LIMIT 100',[tenant,cursor]);
      for(const row of rows){cursor=row.id;if((await this.list(s,a,account,undefined,{channel_id:row.id,limit:1})).data.length)result.push({id:row.id,...await this.channels.metadata(s,row.id)});if(result.length>limit)return {data:result.slice(0,limit),next_cursor:result[limit-1].id};}
      if(rows.length<100)return {data:result,next_cursor:null};
    }
  });}
  private async list(s:TransactionScope,a:Access,account:string,id:string|undefined,q:Record<string,unknown>){
    if(Object.keys(q).some(k=>!(id?['limit','cursor']:['limit','cursor','state','owner','team','channel','channel_id','page_id']).includes(k)))throw new CommandError(400,'INVALID_REQUEST');
    if(!a.capabilities.includes('read')||!a.grants.some(g=>g.resource==='conversation'&&g.action==='read'))throw new CommandError(403,'FORBIDDEN');
    const limit=q.limit===undefined?50:Number(q.limit);if(!Number.isInteger(limit)||limit<1||limit>100||typeof q.limit==='object')throw new CommandError(400,'INVALID_REQUEST');
    if(q.state!==undefined&&!['open','pending','closed'].includes(String(q.state)))throw new CommandError(400,'INVALID_REQUEST');for(const k of ['owner','team'])if(q[k]!==undefined&&q[k]!=='unassigned'&&!uuid(q[k]))throw new CommandError(400,'INVALID_REQUEST');
    if(q.channel!==undefined&&(typeof q.channel!=='string'||!['messenger','mock_messenger'].includes(q.channel))||q.channel_id!==undefined&&!uuid(q.channel_id)||q.page_id!==undefined&&(typeof q.page_id!=='string'||!q.page_id.trim()||q.page_id.length>255))throw new CommandError(400,'INVALID_REQUEST');
    for(const field of ['channel','channel_id','page_id'])if(q[field]!==undefined&&!fieldAllowed(a,'conversation',field,'filter'))throw new CommandError(403,'FIELD_FORBIDDEN');
    const binding={account,tenant:s.context.tenantId,id:id??null,state:q.state??null,owner:q.owner??null,team:q.team??null,...(q.channel!==undefined?{channel:q.channel}:{}),...(q.channel_id!==undefined?{channel_id:q.channel_id}:{}),...(q.page_id!==undefined?{page_id:q.page_id}:{})};let position:{time:string;id:string}|undefined;
    if(q.cursor!==undefined){try{if(typeof q.cursor!=='string'||q.cursor.length>4096)throw new Error();const [payload,sig,...rest]=q.cursor.split('.'),expected=createHmac('sha256',this.secret).update(payload!).digest('base64url');if(rest.length||!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw new Error();const parsed=JSON.parse(Buffer.from(payload!,'base64url').toString());if(canonical(parsed.binding)!==canonical(binding)||!uuid(parsed.position.id)||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(parsed.position.time))throw new Error();position=parsed.position;}catch{throw new CommandError(400,'INVALID_CURSOR');}}
    const visible:{data:any;position:{time:string;id:string}}[]=[];
    while(visible.length<=limit){
      const params:unknown[]=[s.context.tenantId],time=id?'m.received_at':'c.opened_at',identifier=id?'m.id':'c.record_id';let filter='';
      if(id){filter=' AND m.conversation_id=?';params.push(id);}else {if(q.state){filter+=' AND c.status=?';params.push(q.state);}for(const k of ['owner','team'])if(q[k]!==undefined){const col=k==='owner'?'r.owner_principal_id':'r.team_id';filter+=q[k]==='unassigned'?` AND ${col} IS NULL`:` AND ${col}=?`;if(q[k]!=='unassigned')params.push(q[k]);}}
      if(!id){if(q.channel!==undefined){filter+=' AND c.channel=?';params.push(q.channel);}if(q.channel_id!==undefined){filter+=' AND c.channel_id=?';params.push(q.channel_id);}if(q.page_id!==undefined){filter+=' AND EXISTS (SELECT 1 FROM channel_connection cc WHERE cc.tenant_id=c.tenant_id AND cc.id=c.connection_id AND cc.external_account_id=?)';params.push(q.page_id);}}
      if(position){filter+=` AND (${time}>? OR (${time}=? AND ${identifier}>?))`;params.push(position.time,position.time,position.id);}
      const rows=await s.query(`SELECT ${id?'m.*':'c.record_id id'},DATE_FORMAT(${time},'%Y-%m-%d %H:%i:%s.%f') position_time FROM ${id?'message m':'conversation c JOIN crm_record r ON r.tenant_id=c.tenant_id AND r.id=c.record_id'} WHERE ${id?'m':'c'}.tenant_id=?${filter} ORDER BY ${time},${identifier} LIMIT 100`,params);
      for(const row of rows){let data:any;if(id){const {tenant_id,connection_id,position_time,...wire}=row;data={...wire,occurred_at:stamp(row.occurred_at),received_at:stamp(row.received_at)};if(!fieldAllowed(a,'conversation','text','read'))delete data.text;}else {const {record}=await conversation(s,row.id);if(!permits(a,'conversation','read',record))continue;data=await this.output(s,a,row.id);}visible.push({data,position:{id:row.id,time:row.position_time}});if(visible.length>limit)break;}
      if(rows.length<100||visible.length>limit)break;const last=rows.at(-1);position={id:last.id,time:last.position_time};
    }
    let cursor:string|null=null;if(visible.length>limit){const payload=Buffer.from(JSON.stringify({binding,position:visible[limit-1]!.position})).toString('base64url');cursor=`${payload}.${createHmac('sha256',this.secret).update(payload).digest('base64url')}`;}
    return {data:visible.slice(0,limit).map(v=>v.data),next_cursor:cursor};
  }
  async mutate(account:string,tenant:string,id:string,kind:'messages'|'notes'|'transition',input:unknown,key:string,version:string|undefined,correlation:string,contactBound=false){
    if(typeof key!=='string'||! /^[\x21-\x7e]{1,128}$/.test(key))throw new CommandError(400,'INVALID_REQUEST');
    const b=object(input,kind==='messages'?['text','owner_revision',...(contactBound?['crm_contact_id']:[])]:kind==='notes'?['text']:['target_status','reason']);let actor:string|undefined;
    try{return await this.uow.run({tenantId:tenant},async s=>{
      const a=await withFieldPolicies(s,await this.auth.loadHuman(s,account,undefined,true));actor=a.principalId;
      const {record:r,row:c}=await conversation(s,id,true);requirePermission(a,r,'read');if(contactBound&&(!uuid(b.crm_contact_id)||b.crm_contact_id!==c.contact_id))throw new CommandError(409,'CONTACT_BINDING_STALE');const action=kind==='messages'?'reply':kind==='notes'?'note':'update';requirePermission(a,r,action);
      if(kind!=='transition'){messageText(b.text);checkField(a,'conversation','text','write');checkField(a,'conversation','text','read');}
      const command={actorId:a.principalId,correlationId:correlation,route:`POST /api/v1/conversations/${id}/${kind}${contactBound?'-v2':''}`,key,body:b,version};
      const replay=await this.commands.replay(s,command,async response=>{
        requirePermission(a,r,'read');
        if((response.body.data.latest_message as {text?:string}|undefined)?.text!==undefined&&!fieldAllowed(a,'conversation','text','read'))throw new CommandError(403,'FORBIDDEN');
        if(response.body.data.attribution&&!fieldAllowed(a,'conversation','attribution','read'))throw new CommandError(403,'FORBIDDEN');
        if(kind==='transition'&&response.body.data.contact){
          const current=await this.crm.contactSummary(s,a,c.contact_id);
          if(!current||Object.keys(response.body.data.contact as object).some(k=>!Object.hasOwn(current,k)))throw new CommandError(403,'FORBIDDEN');
        }
      });if(replay)return replay;
      let data:Record<string,unknown>,status=200;
      if(kind==='messages'){
        const rev=revision(b.owner_revision);
        const [old]=await s.query('SELECT * FROM outbound_intent WHERE tenant_id=? AND actor_id=? AND idempotency_key=?',[tenant,a.principalId,key]);
        if(old){if(old.conversation_id!==id||old.text!==b.text||String(old.owner_revision)!==rev)throw new CommandError(409,'IDEMPOTENCY_CONFLICT');data={...await this.intent(s,id,old.id),status_url:`/api/v1/conversations/${id}/outbound-intents/${old.id}`};}
        else {
          if(r.ownerPrincipalId!==a.principalId||r.ownerRevision!==rev)throw new CommandError(409,'OWNER_CONFLICT');if(c.status==='closed')throw new CommandError(409,'INVALID_TRANSITION');await this.channels.connection(s,c.connection_id);
          await prepareWorkspace(s,id);
          const intentId=randomUUID(),messageId=randomUUID();
          await s.query("INSERT INTO outbound_intent(id,tenant_id,conversation_id,actor_kind,actor_id,account_id,owner_revision,text,status,idempotency_key,created_at) VALUES (?,?,?,'human',?,?,?,?,'queued',?,UTC_TIMESTAMP(6))",[intentId,tenant,id,a.principalId,account,rev,b.text,key]);
          await s.query("INSERT INTO message(id,tenant_id,conversation_id,connection_id,outbound_intent_id,direction,text,occurred_at,received_at,status) VALUES (?,?,?,?,?,'outbound',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'queued')",[messageId,tenant,id,c.connection_id,intentId,b.text]);
          data={id:intentId,conversation_id:id,message_id:messageId,status:'queued',status_url:`/api/v1/conversations/${id}/outbound-intents/${intentId}`};
          await workspaceOutbound(s,id,messageId);
        }status=202;
      }else if(kind==='notes'){
        checkField(a,'activity','body','write');checkField(a,'activity','body','read');data={id:await this.crm.note(s,a,id,b.text,correlation),conversation_id:id};status=201;
      }else{
        if(!version)throw new CommandError(428,'PRECONDITION_REQUIRED');revision(version);
        if(typeof b.reason!=='string'||!b.reason.trim()||b.reason.length>1000||!['open','pending','closed'].includes(b.target_status))throw new CommandError(422,'VALIDATION_FAILED');
        if(c.status==='closed'||c.status===b.target_status)throw new CommandError(409,'INVALID_TRANSITION');
        await this.registry.bump(s,r,version);await s.query('UPDATE conversation SET status=?,closed_at=IF(?=\'closed\',UTC_TIMESTAMP(6),NULL) WHERE tenant_id=? AND record_id=?',[b.target_status,b.target_status,tenant,id]);
        if(b.target_status==='closed'){await workspaceClosed(s,id);await cancelQueued(s,id);await cancelAgentExecutions(s,id);await stopSessions(s,id,true);await this.onClose(s,id);}data=await this.output(s,a,id);
      }
      await this.commands.audit(s,a.principalId,correlation,'conversation',id,kind,Object.keys(b));const response={status,body:{data,meta:{correlation_id:correlation}}};await this.commands.complete(s,command,response);return response;
    });}catch(e){if(actor&&e instanceof CommandError&&[403,409].includes(e.status))await this.uow.run({tenantId:tenant},s=>this.commands.audit(s,actor!,correlation,'conversation',id,kind,[],'denied',e.code));throw e;}
  }
}
