import { describe,it,expect } from 'vitest';
import { savedPredicate,shareTargets,catalogNormalize } from '../src/modules/conversation/workspace-catalogs.js';
describe('workspace catalog grammar',()=>{
 it('does not admit executable/nested query or implicit inbox references',()=>{
  for(const bad of [{q:'private name'},{where:'1=1'},{inbox_id:'other'},{scope:'team'},{tag_ids:['foreign']},{status:['open','open']}])expect(()=>savedPredicate(bad)).toThrow();
  expect(savedPredicate({})).toEqual({scope:'all',status:['open','pending'],snooze:'exclude',unread:'any'});
 });
 it('share sets are bounded unique typed references, never grants supplied by caller',()=>{
  const share={kind:'principal',id:'12345678-1234-1234-1234-123456789012'};
  expect(()=>shareTargets([share,share])).toThrow();expect(()=>shareTargets([{...share,permission:'write'}])).toThrow();expect(()=>shareTargets([{...share,kind:'role'}])).toThrow();expect(()=>shareTargets(Array(51).fill(share))).toThrow();expect(shareTargets([share])).toEqual([share]);
 });
 it('normalizes canonical Unicode without stripping accents or changing literal prefix characters',()=>{
  expect(catalogNormalize('ĐẶT'.normalize('NFD'))).toBe('đặt');expect(catalogNormalize('100%_')).toBe('100%_');expect(catalogNormalize('ß')).toBe('ß');
 });
});
