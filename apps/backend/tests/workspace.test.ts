import { describe,it,expect } from 'vitest';
import { normalizedLabel,workspaceQuery } from '../src/modules/conversation/workspace.js';
import { workspaceReadConsumer } from '../src/modules/conversation/workspace-consumer.js';
import type { TransactionScope } from '../src/kernel/tenancy/unit-of-work.js';
describe('workspace query boundaries',()=>{
  it('normalizes Unicode consistently without accent stripping or wildcard expansion',()=>{expect(normalizedLabel('ĐẶNG'.normalize('NFD'))).toBe('đặng');expect(normalizedLabel('ĐẶNG')).not.toBe(normalizedLabel('dang'));expect(workspaceQuery({q:' %_ '} ).q).toBe('%_');});
  it('rejects unknown, multi-valued, oversized and ambiguous selectors',()=>{for(const input of [{scope:'team'},{team_id:'not-an-id'},{limit:0},{limit:101},{limit:'NaN'},{status:'open,open'},{q:' '},{q:['one','two']},{sort:'sql'},{other:'x'}])expect(()=>workspaceQuery(input)).toThrow('INVALID_REQUEST');expect(workspaceQuery({})).toMatchObject({status:['open','pending'],scope:'all',limit:50});});
  it('validates read notifications without replaying marker writes, rejects wrong actor/tenant and payloads',async()=>{
    const id='00000000-0000-4000-8000-000000000001',scope={context:{tenantId:id}} as TransactionScope;
    const event={event_id:id,tenant_id:id,event_type:'chat.read_marker.updated',schema_version:1,aggregate_type:'conversation_read_state',aggregate_id:id,aggregate_version:'2',occurred_at:'2026-10-06T00:00:00Z',correlation_id:'synthetic',causation_id:null,actor:{kind:'human',id},data:{conversation_id:id,principal_id:id,through_inbound_seq:'3',read_state_revision:'2'}};
    await expect(workspaceReadConsumer.handle(scope,event)).resolves.toBeUndefined();
    await expect(workspaceReadConsumer.handle(scope,{...event,actor:{kind:'service',id}})).rejects.toThrow('INVALID_EVENT');
    await expect(workspaceReadConsumer.handle(scope,{...event,data:{...event.data,unexpected:'value'}})).rejects.toThrow('INVALID_EVENT');
    await expect(workspaceReadConsumer.handle(scope,{...event,aggregate_version:'1'})).rejects.toThrow('INVALID_EVENT');
  });
});
