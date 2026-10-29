import {it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import type {DispatchRequest,ChatClaimProofRead} from '@agentic-crm/contracts';
import {wireChatClaimInspector} from '../src/modules/identity/dispatch-proof.js';
const consume=():Extract<DispatchRequest,{operation:'identity-consume'}>=>({schema_version:1,operation:'identity-consume',request_id:randomUUID(),grant_id:randomUUID(),claim_id:randomUUID(),fence_id:randomUUID(),binding:{tenant_id:randomUUID(),conversation_id:randomUUID(),crm_contact_id:randomUUID(),connection_id:randomUUID(),intent_id:randomUUID(),attempt_id:randomUUID(),principal_id:randomUUID(),delegation_id:randomUUID(),actor_kind:'human',owner_revision:'1',record_version:'2',payload_digest:'a'.repeat(64)}});
const response=(c:ReturnType<typeof consume>,r:ChatClaimProofRead)=>({schema_version:1,request_id:r.request_id,receipt_id:c.claim_id,state:'claimed',claim_id:c.claim_id,grant_id:c.grant_id,binding:c.binding,resource_context:{object_key:'conversation',owner_principal_id:c.binding.principal_id,owner_revision:'1',record_version:'2',team_id:null,shared_team_ids:[]}});
it('maps a correlated full owner proof and rejects every authority/correlation mismatch',async()=>{
 const c=consume(),signal=new AbortController().signal;
 const result=await wireChatClaimInspector(async r=>response(c,r))(c,signal);expect(result.grant_id).toBe(c.grant_id);expect(Object.keys(result).sort()).toEqual(['binding','claim_id','grant_id','resource_context','state']);
 const corruptions=[(p:any)=>({...p,extra:true}),(p:any)=>({...p,request_id:randomUUID()}),(p:any)=>({...p,receipt_id:randomUUID()}),(p:any)=>({...p,claim_id:randomUUID()}),(p:any)=>({...p,grant_id:randomUUID()}),(p:any)=>({...p,binding:{...p.binding,tenant_id:randomUUID()}}),(p:any)=>({...p,resource_context:{...p.resource_context,owner_principal_id:randomUUID()}}),(p:any)=>({...p,resource_context:{...p.resource_context,owner_revision:'2'}}),(p:any)=>({...p,resource_context:{...p.resource_context,record_version:'3'}})];
 for(const corrupt of corruptions)await expect(wireChatClaimInspector(async r=>corrupt(response(c,r)))(c,signal)).rejects.toMatchObject({code:'FORBIDDEN'});
});
it('copies requests before awaiting and denies cancellation or missing transport proof',async()=>{
 const c=consume(),original=structuredClone(c),controller=new AbortController();
 const port=wireChatClaimInspector(async r=>{c.binding.owner_revision='99';return response(original,r);});expect((await port(c,controller.signal)).binding.owner_revision).toBe('1');
 controller.abort();let called=false;await expect(wireChatClaimInspector(async()=>{called=true;return {}; })(original,controller.signal)).rejects.toMatchObject({code:'DEPENDENCY_UNAVAILABLE'});expect(called).toBe(false);
 const active=new AbortController();await expect(wireChatClaimInspector(async()=>{throw new Error('offline');})(original,active.signal)).rejects.toThrow('offline');
 await expect(wireChatClaimInspector(async r=>{active.abort();return response(original,r);})(original,active.signal)).rejects.toMatchObject({code:'DEPENDENCY_UNAVAILABLE'});
});
