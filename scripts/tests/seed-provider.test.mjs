import {test} from 'node:test';
import assert from 'node:assert/strict';
import {provisionSeedUsers,seedUserNames} from '../seed-provider.mjs';
function provider(){
  let profile={attributes:[{name:'username'}],groups:[{name:'preserved'}]};
  const users=new Map(),writes=[];
  const api=async(path,method='GET',body)=>{
    if(method!=='GET')writes.push({path,method});
    if(path==='users/profile'){if(method==='PUT')profile=body;return profile;}
    if(path.startsWith('users?')){const user=users.get(new URLSearchParams(path.split('?')[1]).get('username'));return user?[{id:user.id}]:[];}
    if(path==='users'&&method==='POST'){
      assert(profile.attributes.some(a=>a.name==='crm_fixture'));
      users.set(body.username,{...body,id:body.username});return;
    }
    if(path.startsWith('users/'))return users.get(path.slice(6));
    throw new Error('Unexpected request');
  };
  return {api,users,writes,profile:()=>profile};
}
const passwords=Object.fromEntries(seedUserNames.map(u=>[u,'synthetic-test-value']));
test('declares admin-only marker before creation; rerun preserves users, password, profile and status',async()=>{
  const p=provider();const mapping=await provisionSeedUsers(p.api,passwords);
  assert.equal(Object.keys(mapping).length,6);assert.equal(p.writes.length,7);
  assert.deepEqual(p.profile().groups,[{name:'preserved'}]);
  assert.deepEqual(p.profile().attributes[1].permissions,{view:['admin'],edit:['admin']});
  p.users.get('alpha_admin').enabled=false;
  const before=JSON.stringify([...p.users]);p.writes.length=0;
  assert.deepEqual(await provisionSeedUsers(p.api,passwords),mapping);assert.equal(JSON.stringify([...p.users]),before);assert.deepEqual(p.writes,[]);
});
test('refuses unmarked username; never resets/adopts existing user',async()=>{
  const p=provider();p.users.set('alpha_admin',{id:'alpha_admin',attributes:{}});
  await assert.rejects(provisionSeedUsers(p.api,passwords),/collision/);
  assert(!p.writes.some(w=>w.path==='users'||w.path.startsWith('users/alpha_admin')));
});
test('refuses user-editable fixture marker configuration',async()=>{
  const p=provider();p.profile().attributes.push({name:'crm_fixture',permissions:{view:['admin','user'],edit:['user']}});
  await assert.rejects(provisionSeedUsers(p.api,passwords),/profile conflict/);assert.deepEqual(p.writes,[]);
});
