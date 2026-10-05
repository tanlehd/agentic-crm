import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError } from '../../kernel/reliability/commands.js';
export interface ChannelIdentity { id:string;contactId:string;connectionId:string;teamId:string }
// Channels owns connection/identity tables. Caller already holds tenant lock.
export class ChannelReferences {
  async lockIdentity(s:TransactionScope,id:string):Promise<ChannelIdentity>{
    const [row]=await s.query('SELECT * FROM contact_identity WHERE tenant_id=? AND id=? FOR UPDATE',[s.context.tenantId,id]);
    if(!row)throw new CommandError(404,'NOT_FOUND');
    const connection=await this.connection(s,row.connection_id);
    return {id:row.id,contactId:row.contact_id,connectionId:row.connection_id,teamId:connection.team_id};
  }
  async firstTouchpoint(s:TransactionScope,conversation:string){const [r]=await s.query('SELECT id FROM touchpoint WHERE tenant_id=? AND conversation_id=? ORDER BY received_at,id LIMIT 1',[s.context.tenantId,conversation]);return r?.id as string|undefined;}
  async attribution(s:TransactionScope,conversationId:string){
    const [row]=await s.query('SELECT source,ad_id,campaign_id FROM touchpoint WHERE tenant_id=? AND conversation_id=? ORDER BY received_at,id LIMIT 1',[s.context.tenantId,conversationId]);
    return row??{source:'unknown',ad_id:null,campaign_id:null};
  }
  async connection(s:TransactionScope,id:string){
    const [row]=await s.query("SELECT * FROM channel_connection WHERE tenant_id=? AND id=? AND status='active' AND provider='mock_messenger' FOR SHARE",[s.context.tenantId,id]);
    if(!row)throw new CommandError(409,'CONNECTION_UNAVAILABLE');return row;
  }
}
export type SendResult={status:'sent';providerMessageId:string}|{status:'failed';errorCode:'MOCK_PRE_DISPATCH'}|{status:'unknown';errorCode:'DELIVERY_UNKNOWN'};
export interface SendInput {tenantId:string;intentId:string;connectionId:string;text:string}
export interface Sender {send(input:SendInput):Promise<SendResult>;lookup(tenant:string,intent:string):Promise<SendResult|null>}
