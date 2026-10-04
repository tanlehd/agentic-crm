import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { UnitOfWork } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError,DurableCommands } from '../../kernel/reliability/commands.js';
import { IdentityAuthorization,AccessError } from '../identity/authorization.js';
import { fieldAllowed,permits } from '../identity/domain/authorization.js';
import { withFieldPolicies } from '../crm/access.js';
import { ChannelReferences,type Sender,type SendResult,type SendInput } from '../channels/ports.js';
import { conversation } from './domain.js';
export class OutboundDispatcher {
  private readonly uow:UnitOfWork;private readonly auth:IdentityAuthorization;private readonly commands=new DurableCommands();
  constructor(private readonly source:DataSource,private readonly sender:Sender,private readonly channels=new ChannelReferences()){this.uow=new UnitOfWork(source);this.auth=new IdentityAuthorization(this.uow);}
  async dispatch(tenant:string,conversationId:string,intentId:string){
    const prepared=await this.uow.run({tenantId:tenant},async s=>{
      // Tenant -> registry -> intent lock order shared by commands/assignment.
      let access;const [candidate]=await s.query('SELECT account_id FROM outbound_intent WHERE tenant_id=? AND id=? AND conversation_id=?',[tenant,intentId,conversationId]);if(!candidate)return null;
      try{access=await withFieldPolicies(s,await this.auth.loadHuman(s,candidate.account_id));}catch(e){if(!(e instanceof AccessError))throw e;}
      const c=await conversation(s,conversationId,true);
      const [intent]=await s.query('SELECT * FROM outbound_intent WHERE tenant_id=? AND id=? AND conversation_id=? FOR UPDATE',[tenant,intentId,conversationId]);if(!intent||intent.status!=='queued')return null;
      let allowed=!!access&&intent.actor_kind==='human'&&access.principalId===intent.actor_id&&c.record.ownerPrincipalId===intent.actor_id&&c.record.ownerRevision===String(intent.owner_revision)&&c.row.status!=='closed'&&permits(access,'conversation','reply',c.record)&&permits(access,'conversation','read',c.record)&&fieldAllowed(access,'conversation','text','write')&&fieldAllowed(access,'conversation','text','read');
      try{await this.channels.connection(s,c.row.connection_id);}catch(e){if(!(e instanceof CommandError))throw e;allowed=false;}
      if(!allowed){await s.query("UPDATE outbound_intent SET status='cancelled',error_code='AUTHORIZATION_REVOKED' WHERE tenant_id=? AND id=?",[tenant,intentId]);await s.query("UPDATE message SET status='cancelled' WHERE tenant_id=? AND outbound_intent_id=?",[tenant,intentId]);await this.commands.systemAudit(s,intentId,'conversation',conversationId,'outbound.cancel',['status']);return null;}
      const token=randomUUID();await s.query("UPDATE outbound_intent SET status='sending',dispatch_token=?,sending_at=UTC_TIMESTAMP(6),error_code=NULL WHERE tenant_id=? AND id=?",[token,tenant,intentId]);await s.query("UPDATE message SET status='sending' WHERE tenant_id=? AND outbound_intent_id=?",[tenant,intentId]);
      await this.commands.systemAudit(s,intentId,'conversation',conversationId,'outbound.dispatch',['status']);
      return {token,input:{tenantId:tenant,intentId,connectionId:c.row.connection_id,text:intent.text} satisfies SendInput};
    });
    if(!prepared)return;
    let result:SendResult;
    try{result=await this.sender.send(prepared.input);}catch{result={status:'unknown',errorCode:'DELIVERY_UNKNOWN'};}
    await this.finish(tenant,conversationId,intentId,prepared.token,result,false);
  }
  private finish(tenant:string,conversationId:string,intentId:string,token:string|null,result:SendResult,reconcile:boolean){return this.uow.run({tenantId:tenant},async s=>{
    const c=await conversation(s,conversationId,true);const [intent]=await s.query('SELECT * FROM outbound_intent WHERE tenant_id=? AND id=? AND conversation_id=? FOR UPDATE',[tenant,intentId,conversationId]);
    if(!intent||intent.dispatch_token!==token||!(reconcile?intent.status==='unknown':intent.status==='sending'||intent.status==='unknown'))return;
    // An expired dispatch may confirm sent, but cannot downgrade unknown to retryable failed.
    if(intent.status==='unknown'&&result.status!=='sent')return;
    const provider=result.status==='sent'?result.providerMessageId:null,error=result.status==='sent'?null:result.errorCode;
    await s.query('UPDATE outbound_intent SET status=?,provider_message_id=?,error_code=? WHERE tenant_id=? AND id=?',[result.status,provider,error,tenant,intentId]);
    await s.query('UPDATE message SET status=?,provider_message_id=? WHERE tenant_id=? AND outbound_intent_id=?',[result.status,provider,tenant,intentId]);
    const [message]=await s.query('SELECT id FROM message WHERE tenant_id=? AND outbound_intent_id=?',[tenant,intentId]);
    await this.commands.systemAudit(s,intentId,'conversation',conversationId,'outbound.result',['status','error_code']);
    await this.commands.conversationEvent(s,intentId,result.status==='sent'?'message.sent':'message.delivery_failed',conversationId,c.record.version,result.status==='sent'?{conversation_id:conversationId,message_id:message.id,outbound_intent_id:intentId}:{conversation_id:conversationId,outbound_intent_id:intentId,error_code:error});
  });}
  async reconcile(tenant:string,conversationId:string,intentId:string){
    const [intent]=await this.source.query("SELECT dispatch_token FROM outbound_intent WHERE tenant_id=? AND conversation_id=? AND id=? AND status='unknown'",[tenant,conversationId,intentId]);if(!intent)throw new CommandError(409,'INVALID_TRANSITION');
    const receipt=await this.sender.lookup(tenant,intentId);if(receipt?.status==='sent')await this.finish(tenant,conversationId,intentId,intent.dispatch_token,receipt,true);
  }
  // Internal operator port; no HTTP until operations authorization is specified.
  retryFailed(tenant:string,conversationId:string,intentId:string){return this.uow.run({tenantId:tenant},async s=>{
    await conversation(s,conversationId,true);const [intent]=await s.query('SELECT status,error_code FROM outbound_intent WHERE tenant_id=? AND conversation_id=? AND id=? FOR UPDATE',[tenant,conversationId,intentId]);
    if(intent?.status!=='failed'||intent.error_code!=='MOCK_PRE_DISPATCH')throw new CommandError(409,'INVALID_TRANSITION');
    await s.query("UPDATE outbound_intent SET status='queued',error_code=NULL,dispatch_token=NULL,sending_at=NULL WHERE tenant_id=? AND id=?",[tenant,intentId]);await s.query("UPDATE message SET status='queued' WHERE tenant_id=? AND outbound_intent_id=?",[tenant,intentId]);await this.commands.systemAudit(s,intentId,'conversation',conversationId,'outbound.retry',['status']);
  });}
  async tick(){
    const expired=await this.source.query("SELECT tenant_id,conversation_id,id,dispatch_token FROM outbound_intent WHERE status='sending' AND sending_at<TIMESTAMPADD(SECOND,-60,UTC_TIMESTAMP(6)) ORDER BY sending_at,id LIMIT 25");
    for(const i of expired)await this.finish(i.tenant_id,i.conversation_id,i.id,i.dispatch_token,{status:'unknown',errorCode:'DELIVERY_UNKNOWN'},false);
    const queued=await this.source.query("SELECT tenant_id,conversation_id,id FROM outbound_intent WHERE status='queued' ORDER BY created_at,id LIMIT 25");
    for(const i of queued)await this.dispatch(i.tenant_id,i.conversation_id,i.id);
  }
}
