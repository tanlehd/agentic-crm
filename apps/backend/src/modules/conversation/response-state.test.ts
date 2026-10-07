import { expect,it,vi } from 'vitest';
import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { needResponse } from './workspace-storage.js';

it('leaves new inbound unassessed even with known causal coverage; only sent coverage is replied',async()=>{
  for(const [waiting,expected] of [[new Date(),null],[null,false]] as const){
    const query=vi.fn().mockResolvedValueOnce([{version:20}]).mockResolvedValueOnce([{waiting_metric_state:'ready',waiting_since:waiting}]);
    const scope={context:{tenantId:'tenant-a'},query} as unknown as TransactionScope;
    expect(await needResponse(scope,'conversation-a','open')).toBe(expected);
  }
});

it('does not label missing or unavailable historical coverage as answered',async()=>{
  for(const row of [undefined,{waiting_metric_state:'unavailable',waiting_since:null}]){
    const query=vi.fn().mockResolvedValueOnce([{version:20}]).mockResolvedValueOnce(row?[row]:[]);
    const scope={context:{tenantId:'tenant-a'},query} as unknown as TransactionScope;
    expect(await needResponse(scope,'conversation-a','open')).toBeNull();
    expect(query.mock.calls[1]?.[1]).toEqual(['tenant-a','conversation-a']);
  }
});
it('supports old schema reads without querying workspace tables and closed without a reply claim',async()=>{
  const query=vi.fn().mockResolvedValue([]),scope={context:{tenantId:'tenant-a'},query} as unknown as TransactionScope;
  expect(await needResponse(scope,'conversation-a','open')).toBeNull();
  expect(query).toHaveBeenCalledTimes(1);
  expect(await needResponse(scope,'conversation-a','closed')).toBe(false);
  expect(query).toHaveBeenCalledTimes(1);
});
