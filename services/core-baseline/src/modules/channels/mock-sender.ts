import type { DataSource } from 'typeorm';
import { UnitOfWork } from '../../kernel/tenancy/unit-of-work.js';
import type { Sender,SendInput,SendResult } from './ports.js';
// Fault injection is constructor-only, never a transport field or real provider.
export class MockSender implements Sender {
  constructor(private readonly source:DataSource,private readonly mode:'sent'|'pre_dispatch_failure'|'timeout_after_accept'='sent'){}
  async send(input:SendInput):Promise<SendResult>{
    if(this.mode==='pre_dispatch_failure')return {status:'failed',errorCode:'MOCK_PRE_DISPATCH'};
    const providerMessageId=`mock-${input.intentId}`;
    await new UnitOfWork(this.source).run({tenantId:input.tenantId},async s=>{
      await s.query('INSERT INTO mock_outbound_receipt(tenant_id,intent_id,provider_message_id) VALUES (?,?,?) ON DUPLICATE KEY UPDATE intent_id=intent_id',[input.tenantId,input.intentId,providerMessageId]);
    });
    return this.mode==='timeout_after_accept'?{status:'unknown',errorCode:'DELIVERY_UNKNOWN'}:{status:'sent',providerMessageId};
  }
  async lookup(tenant:string,intent:string):Promise<SendResult|null>{
    const [r]=await this.source.query('SELECT provider_message_id FROM mock_outbound_receipt WHERE tenant_id=? AND intent_id=?',[tenant,intent]);
    return r?{status:'sent',providerMessageId:r.provider_message_id}:null;
  }
}
