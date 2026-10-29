import {describe,it,expect} from 'vitest';
import {ChannelChatIngressRelay} from '../src/modules/channels/chat-ingress-relay.js';
const id=(n:number)=>`01900000-0000-7000-8000-${String(n).padStart(12,'0')}`;
const binding={tenant_id:id(1),connection_id:id(2),crm_contact_id:id(3),crm_identity_id:id(4),mapping_revision:'1' as const,platform:'mock_messenger' as const};
const intake={provider_event_id:'synthetic-event',provider_message_id:'synthetic-message',external_subject_id:'synthetic-subject',occurred_at:'2026-10-26T00:00:00.000Z',message:{type:'text' as const,text:'Synthetic relay verification'}};
describe('Channels relay to owning Chat',()=>{
 it('reads the receipt after every accepted replay and preserves the original accept request',async()=>{
  const calls:{operation:string;request:Record<string,unknown>}[]=[];
  let terminal=false;
  const relay=new ChannelChatIngressRelay(async(operation,tenant,request)=>{
   expect(tenant).toBe(binding.tenant_id);expect(request.binding).toEqual(binding);calls.push({operation,request});
   return {schema_version:1,request_id:request.request_id,receipt_id:id(6),...(operation==='ingress-read'&&terminal?{state:'processed',conversation_id:id(7),message_id:id(8),duplicate:false}:{state:'received'})};
  });
  expect((await relay.receive(binding,id(5),intake)).state).toBe('received');terminal=true;
  expect(await relay.receive(binding,id(5),intake)).toMatchObject({state:'processed',message_id:id(8)});
  expect(calls.map(c=>c.operation)).toEqual(['ingress-accept','ingress-read','ingress-accept','ingress-read']);
  expect(calls[0]!.request).toEqual(calls[2]!.request);
  expect(calls[0]!.request.request_id).toBe(id(5));expect(calls[0]!.request.source_delivery_id).toBe(id(5));
  expect(calls[1]!.request.receipt_id).toBe(id(6));expect(calls[1]!.request.request_id).not.toBe(calls[3]!.request.request_id);
 });
 it('does not turn a lost read response into success or use a local fallback',async()=>{
  const relay=new ChannelChatIngressRelay(async(operation,_tenant,request)=>{
   if(operation==='ingress-read')throw Error('synthetic dropped ACK');
   return {schema_version:1,request_id:request.request_id,receipt_id:id(6),state:'received'};
  });
  await expect(relay.receive(binding,id(5),intake)).rejects.toThrow('synthetic dropped ACK');
 });
 it('rejects a mismatched request or receipt instead of completing another delivery',async()=>{
  for(const fault of ['request','receipt']){
   const relay=new ChannelChatIngressRelay(async(operation,_tenant,request)=>({schema_version:1,request_id:fault==='request'?id(99):request.request_id,receipt_id:operation==='ingress-read'&&fault==='receipt'?id(99):id(6),state:'received'}));
   await expect(relay.receive(binding,id(5),intake)).rejects.toThrow('CHAT_INGRESS_REPLY_MISMATCH');
  }
 });
});
