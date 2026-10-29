import {describe,it,expect} from 'vitest';
import {chatWorkspaceQuery} from '../../chat/src/workspace-query.js';
describe('owning Chat workspace query boundaries',()=>{
 it('rejects unknown, multi-valued, oversized and ambiguous selectors',()=>{
  for(const input of [{scope:'team'},{team_id:'not-an-id'},{limit:0},{limit:101},{limit:'NaN'},{status:'open,open'},{q:' '},{q:['one','two']},{sort:'sql'},{other:'x'}])expect(()=>chatWorkspaceQuery(input)).toThrow();
  expect(chatWorkspaceQuery({})).toMatchObject({status:['open','pending'],scope:'all',limit:50});expect(chatWorkspaceQuery({q:' %_ '}).q).toBe('%_');
 });
});
