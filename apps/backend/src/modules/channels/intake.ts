import { ContactIdentities,identityLabel,type ContactMapping } from '../crm/contact-identity.js';
import { ChatContactCache } from '../conversation/contact-cache.js';
import { legacyContentText } from '../conversation/content.js';
import { page } from '../operations/paging.js';
import { createHash,randomUUID,timingSafeEqual } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { UnitOfWork,type TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError,DurableCommands,canonical } from '../../kernel/reliability/commands.js';
import { IdentityAuthorization,requireService,requireActiveTenant,AccessError } from '../identity/authorization.js';
import { permits,type Access } from '../identity/domain/authorization.js';
import { uuid } from '../identity/admin.js';
import { stamp } from '../crm/core.js';
import { object } from '../crm/properties.js';
import { ConversationCrmPort } from '../crm/conversation-ports.js';
import { Conversations } from '../conversation/domain.js';
import { normalized } from './normalized.js';
export interface IntakeClaim {tenantId:string;connectionId:string;id:string;token:string}
export class IntakeLeaseLost extends Error {constructor(){super('INTAKE_LEASE_LOST');}}
const delays=[1,5,30,120,600];
export class MessengerIntake {
  readonly contactCache=new ChatContactCache();private readonly identities=new ContactIdentities();
  readonly uow:UnitOfWork;private readonly auth:IdentityAuthorization;private readonly commands=new DurableCommands();
  constructor(private readonly source:DataSource,private readonly conversations=new Conversations(source,'internal-intake-no-pagination'),private readonly crm=new ConversationCrmPort()) {this.uow=new UnitOfWork(source);this.auth=new IdentityAuthorization(this.uow);}
  private async authenticated(connectionId:unknown,authorization:unknown){
    if(!uuid(connectionId)||typeof authorization!=='string'||!/^Bearer [a-f0-9]{64}$/.test(authorization))throw new CommandError(401,'INTEGRATION_UNAUTHORIZED');
    // Bootstrap lookup is the only global connection query; no payload or tenant override.
    const [row]=await this.source.query('SELECT tenant_id,credential_hash FROM channel_connection WHERE id=?',[connectionId]);
    const hash=createHash('sha256').update(authorization.slice(7)).digest();const expected=Buffer.from(row?.credential_hash??'0'.repeat(64),'hex');
    if(expected.length!==hash.length||!timingSafeEqual(expected,hash)||!row?.credential_hash)throw new CommandError(401,'INTEGRATION_UNAUTHORIZED');
    return {tenantId:String(row.tenant_id),connectionId:connectionId as string,hash:hash.toString('hex')};
  }
  private async connection(s:TransactionScope,id:string,hash?:string){
    // Hold tenant before connection; service auth rechecked after row lock.
    await requireActiveTenant(s);
    const [row]=await s.query('SELECT * FROM channel_connection WHERE tenant_id=? AND id=? FOR UPDATE',[s.context.tenantId,id]);
    if(!row||row.provider!=='mock_messenger'||row.status!=='active'||!row.service_actor_id||!row.credential_hash||hash!==undefined&&row.credential_hash!==hash)throw new CommandError(403,'INTEGRATION_FORBIDDEN');
    await requireService(s,row.service_actor_id,'integration','deliver');return row;
  }
  async binding(connectionId:unknown,authorization:unknown){
    const ctx=await this.authenticated(connectionId,authorization);
    return this.uow.run({tenantId:ctx.tenantId},async s=>{await this.connection(s,ctx.connectionId,ctx.hash);return {tenant_id:ctx.tenantId,connection_id:ctx.connectionId,platform:'mock_messenger' as const};});
  }
  async identity(connectionId:unknown,authorization:unknown,input:unknown,resolve:boolean,correlation:string){
    const ctx=await this.authenticated(connectionId,authorization),b=object(input,resolve?['external_subject_id','operation_id','display_label']:['external_subject_id']),subject=identityLabel(b.external_subject_id);
    if(resolve&&!uuid(b.operation_id))throw new CommandError(422,'VALIDATION_FAILED');
    const label=b.display_label===undefined?undefined:identityLabel(b.display_label);
    return this.uow.run({tenantId:ctx.tenantId},async s=>{const c=await this.connection(s,ctx.connectionId,ctx.hash);return resolve?this.identities.resolveCommand(s,c,{external_subject_id:subject,operation_id:b.operation_id as string,...(label===undefined?{}:{display_label:label})},correlation):{mapping:await this.identities.lookup(s,c.id,subject)};});
  }
  async accept(connectionId:unknown,authorization:unknown,input:unknown,correlation:string,contactBound=false){
    const wrapper=contactBound?object(input,['crm_contact_id','crm_identity_id','intake']):undefined;
    if(wrapper&&(!uuid(wrapper.crm_contact_id)||!uuid(wrapper.crm_identity_id)))throw new CommandError(422,'CONTACT_CONTEXT_REQUIRED');
    const ctx=await this.authenticated(connectionId,authorization),payload=normalized(wrapper?wrapper.intake:input),stored=wrapper?{version:2,crm_contact_id:wrapper.crm_contact_id,crm_identity_id:wrapper.crm_identity_id,intake:payload}:payload;
    let confirmed:ContactMapping|undefined;
    const cacheKey=this.contactCache.key(ctx.tenantId,ctx.connectionId,payload.external_subject_id);
    const hash=createHash('sha256').update(canonical(stored)).digest('hex');
    const result=await this.uow.run({tenantId:ctx.tenantId},async s=>{
      const c=await this.connection(s,ctx.connectionId,ctx.hash),actor={kind:'service' as const,id:c.service_actor_id};
      if(wrapper){let mapping=this.contactCache.get(cacheKey);if(!mapping||mapping.crm_contact_id!==wrapper.crm_contact_id||mapping.crm_identity_id!==wrapper.crm_identity_id){mapping=await this.identities.lookup(s,c.id,payload.external_subject_id);if(mapping)confirmed=mapping;}
        if(!mapping||mapping.crm_contact_id!==wrapper.crm_contact_id||mapping.crm_identity_id!==wrapper.crm_identity_id)throw new CommandError(409,'CONTACT_BINDING_STALE');await this.crm.activeContact(s,mapping.crm_contact_id);
      }
      const [old]=await s.query('SELECT id,payload_hash FROM inbound_delivery WHERE tenant_id=? AND connection_id=? AND provider_event_id=?',[ctx.tenantId,ctx.connectionId,payload.provider_event_id]);
      if(old){if(old.payload_hash!==hash){await this.commands.systemAudit(s,correlation,'inbound_delivery',old.id,'intake.payload_conflict',[],actor);return {conflict:true,id:old.id};}return {conflict:false,id:old.id};}
      const id=randomUUID();await s.query("INSERT INTO inbound_delivery(id,tenant_id,connection_id,provider_event_id,payload_hash,payload,received_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6))",[id,ctx.tenantId,ctx.connectionId,payload.provider_event_id,hash,JSON.stringify(stored)]);
      await this.commands.systemAudit(s,correlation,'inbound_delivery',id,'intake.received',['status'],actor);return {conflict:false,id};
    });
    if(result.conflict)throw new CommandError(409,'IDEMPOTENCY_CONFLICT');if(confirmed)this.contactCache.put(cacheKey,confirmed);return {data:{delivery_id:result.id,status:'received'},meta:{correlation_id:correlation}};
  }
  private output(row:any){return {id:row.id,connection_id:row.connection_id,status:row.status,attempts:Number(row.attempts),error_code:row.last_error_code,conversation_id:row.conversation_id,message_id:row.message_id,duplicate:!!row.duplicate,attribution:row.attribution,received_at:stamp(row.received_at),processed_at:stamp(row.processed_at)};}
  private async row(s:TransactionScope,id:string){if(!uuid(id))throw new CommandError(400,'INVALID_REQUEST');const [r]=await s.query('SELECT * FROM inbound_delivery WHERE tenant_id=? AND id=?',[s.context.tenantId,id]);if(!r)throw new CommandError(404,'NOT_FOUND');return r;}
  async readCredential(connectionId:unknown,authorization:unknown,id:string){const ctx=await this.authenticated(connectionId,authorization);return this.uow.run({tenantId:ctx.tenantId},async s=>{await this.connection(s,ctx.connectionId,ctx.hash);const row=await this.row(s,id);if(row.connection_id!==ctx.connectionId)throw new CommandError(404,'NOT_FOUND');return this.output(row);});}
  private operator(access:Access,action:'read'|'retry'){if(!permits(access,'integration',action))throw new CommandError(403,'FORBIDDEN');}
  readHuman(account:string,tenant:string,id:string){return this.auth.runHuman(account,tenant,async(s,a)=>{this.operator(a,'read');return this.output(await this.row(s,id));});}
  failedDeliveries(account:string,tenant:string,query:Record<string,unknown>){return this.auth.runHuman(account,tenant,async(s,a)=>{this.operator(a,'read');const {limit,cursor}=page(query),rows=await s.query("SELECT id,connection_id,status,attempts,last_error_code,next_attempt_at,received_at FROM inbound_delivery WHERE tenant_id=? AND status='failed' AND id>? ORDER BY id LIMIT ?",[tenant,cursor,limit+1]);return {data:rows.slice(0,limit).map((r:any)=>({id:r.id,connection_id:r.connection_id,status:r.status,attempts:Number(r.attempts),error_code:r.last_error_code,next_attempt_at:stamp(r.next_attempt_at),received_at:stamp(r.received_at),can_retry:permits(a,'integration','retry')&&r.next_attempt_at===null})),next_cursor:rows.length>limit?rows[limit-1].id:null};});}
  retry(account:string,tenant:string,id:string,input:unknown,key:string,correlation:string,operations=false){
    if(!/^[\x21-\x7e]{1,128}$/.test(key))throw new CommandError(400,'INVALID_REQUEST');const body=object(input,operations?['reason']:[]);if(operations&&body.reason!=='operator_retry')throw new CommandError(400,'INVALID_REQUEST');
    return this.uow.run({tenantId:tenant},async s=>{
      const a=await this.auth.loadHuman(s,account,undefined,true);this.operator(a,'read');this.operator(a,'retry');const row=await this.row(s,id);
      const command={actorId:a.principalId,correlationId:correlation,route:`POST /api/v1/${operations?'operations':'integrations'}/deliveries/${id}/retry`,key,body};const replay=await this.commands.replay(s,command,async()=>{this.operator(a,'read');});if(replay)return replay;
      if(row.status!=='failed'||operations&&(row.next_attempt_at!==null||row.lease_until!==null))throw new CommandError(409,'INVALID_TRANSITION');
      await s.query("UPDATE inbound_delivery SET status='received',attempts=0,next_attempt_at=NULL,lease_until=NULL,fencing_token=fencing_token+1,last_error_code=NULL WHERE tenant_id=? AND id=?",[tenant,id]);
      await this.commands.audit(s,a.principalId,correlation,'inbound_delivery',id,'intake.retry',['status'],'accepted',operations?'operator_retry':null);const result={status:200,body:{data:this.output(await this.row(s,id)),meta:{correlation_id:correlation}}};await this.commands.complete(s,command,result);return result;
    });
  }
  async claim():Promise<IntakeClaim[]>{
    const runner=this.source.createQueryRunner();await runner.connect();
    try{await runner.startTransaction('READ COMMITTED');const rows=await runner.query("SELECT id,tenant_id,connection_id,fencing_token FROM inbound_delivery WHERE (status='received' AND (lease_until IS NULL OR lease_until<=UTC_TIMESTAMP(6))) OR (status='failed' AND next_attempt_at<=UTC_TIMESTAMP(6)) ORDER BY received_at,id LIMIT 25 FOR UPDATE SKIP LOCKED");
      const claims:IntakeClaim[]=[];for(const r of rows){const token=String(BigInt(r.fencing_token)+1n);await runner.query("UPDATE inbound_delivery SET status='received',attempts=attempts+1,lease_until=TIMESTAMPADD(SECOND,60,UTC_TIMESTAMP(6)),fencing_token=?,next_attempt_at=NULL WHERE tenant_id=? AND id=?",[token,r.tenant_id,r.id]);claims.push({tenantId:r.tenant_id,connectionId:r.connection_id,id:r.id,token});}await runner.commitTransaction();return claims;
    }catch(e){if(runner.isTransactionActive)await runner.rollbackTransaction();throw e;}finally{await runner.release();}
  }
  private async locked(s:TransactionScope,claim:IntakeClaim){
    const [row]=await s.query("SELECT * FROM inbound_delivery WHERE tenant_id=? AND connection_id=? AND id=? AND status='received' AND fencing_token=? AND lease_until>UTC_TIMESTAMP(6) FOR UPDATE",[s.context.tenantId,claim.connectionId,claim.id,claim.token]);if(!row)throw new IntakeLeaseLost();return row;
  }
  async process(claim:IntakeClaim){
    await this.uow.run({tenantId:claim.tenantId},async s=>{
      const c=await this.connection(s,claim.connectionId),row=await this.locked(s,claim),saved=typeof row.payload==='string'?JSON.parse(row.payload):row.payload,payload=normalized(saved.version===2?saved.intake:saved),actor={kind:'service' as const,id:c.service_actor_id};
      const existing=await this.conversations.findInbound(s,c.id,payload.provider_message_id);let refs=existing,attribution='unknown';
      if(!refs||saved.version===2){
        const resolved=saved.version===2?{mapping:await this.identities.lookup(s,c.id,payload.external_subject_id)}:await this.identities.resolve(s,c.id,c.team_id,payload.external_subject_id,payload.display_label??'Messenger contact',claim.id,actor);
        if(!resolved.mapping||saved.version===2&&(resolved.mapping.crm_contact_id!==saved.crm_contact_id||resolved.mapping.crm_identity_id!==saved.crm_identity_id))throw new CommandError(409,'CONTACT_BINDING_STALE');
        const identity={id:resolved.mapping.crm_identity_id,contact_id:resolved.mapping.crm_contact_id};
        refs=await this.conversations.receive(s,{identityId:identity.id,crmContactId:identity.contact_id,providerMessageId:payload.provider_message_id,text:payload.message.type==='rich'?legacyContentText(payload.message.content):payload.message.text,...(payload.message.type==='rich'?{content:payload.message.content}:{}),occurredAt:payload.occurred_at,correlation:claim.id,actor});
        if(payload.referral&&!existing){attribution='ctm';await s.query("INSERT INTO touchpoint(id,tenant_id,connection_id,delivery_id,contact_id,conversation_id,channel,source,campaign_id,ad_id,occurred_at,received_at) VALUES (?,?,?,?,?,?,'mock_messenger','ctm',?,?,?,?)",[randomUUID(),claim.tenantId,c.id,claim.id,identity.contact_id,refs.conversationId,payload.referral.campaign_id??null,payload.referral.ad_id??null,new Date(payload.occurred_at),row.received_at]);}
      }
      if(existing){const [touchpoint]=await s.query('SELECT id FROM touchpoint WHERE tenant_id=? AND delivery_id IN (SELECT id FROM inbound_delivery WHERE tenant_id=? AND message_id=? AND duplicate=0)',[claim.tenantId,claim.tenantId,refs.messageId]);if(touchpoint)attribution='ctm';}
      await this.locked(s,claim);
      await s.query("UPDATE inbound_delivery SET status='processed',lease_until=NULL,next_attempt_at=NULL,last_error_code=NULL,conversation_id=?,message_id=?,duplicate=?,attribution=?,processed_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=? AND fencing_token=?",[refs.conversationId,refs.messageId,!!existing,attribution,claim.tenantId,claim.id,claim.token]);
      await this.commands.systemAudit(s,claim.id,'inbound_delivery',claim.id,existing?'intake.duplicate':'intake.processed',['status','message_id'],actor);
    });
  }
  private async failed(claim:IntakeClaim,error:unknown){
    if(error instanceof IntakeLeaseLost)return;
    const terminal=error instanceof CommandError||error instanceof AccessError;const code=terminal?'INTAKE_FORBIDDEN':'INTAKE_TEMPORARY_FAILURE';
    await this.uow.run({tenantId:claim.tenantId},async s=>{
      try{await requireActiveTenant(s);}catch(e){if(!(e instanceof AccessError))throw e;}
      const row=await this.locked(s,claim),retry=!terminal&&Number(row.attempts)<=delays.length;
      await s.query(`UPDATE inbound_delivery SET status='failed',lease_until=NULL,last_error_code=?,next_attempt_at=${retry?'TIMESTAMPADD(SECOND,?,UTC_TIMESTAMP(6))':'NULL'} WHERE tenant_id=? AND id=? AND fencing_token=?`,[code,...(retry?[delays[Number(row.attempts)-1]]:[]),claim.tenantId,claim.id,claim.token]);
      await this.commands.systemAudit(s,claim.id,'inbound_delivery',claim.id,'intake.failed',['status','error_code']);
    }).catch(e=>{if(!(e instanceof IntakeLeaseLost))throw e;});
  }
  async dispatch(claim:IntakeClaim){try{await this.process(claim);}catch(e){await this.failed(claim,e);}}
  async tick(){for(const claim of await this.claim())await this.dispatch(claim);}
}
