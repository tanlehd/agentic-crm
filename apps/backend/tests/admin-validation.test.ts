import { expect, it } from 'vitest';
import { validateBody } from '../src/modules/identity/admin.js';
import { canonical } from '../src/kernel/reliability/commands.js';
it('rejects empty/null PATCH, unknown fields, duplicate references and invalid action scopes',()=>{
  for(const body of [{},null,{tenant_id:'forged'},{seat_code:'root'},{status:'invited'},{role_ids:['11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111']}])expect(()=>validateBody('memberships','patch',body)).toThrow('INVALID_REQUEST');
  expect(()=>validateBody('roles','create',{key:'test',name:' ',permissions:[]})).toThrow();
  expect(()=>validateBody('roles','create',{key:'test',name:'Test',permissions:[{resource:'team',action:'read',scope:'*'}]})).toThrow();
  expect(validateBody('memberships','patch',{role_ids:[]})).toEqual({role_ids:[]});
});
it('canonical body hash preserves value types and array ordering but ignores property order',()=>{
  expect(canonical({b:[{y:2,x:1}],a:1})).toBe(canonical({a:1,b:[{x:1,y:2}]}));
  expect(canonical({a:1})).not.toBe(canonical({a:'1'}));
  expect(canonical([1,2])).not.toBe(canonical([2,1]));
});
