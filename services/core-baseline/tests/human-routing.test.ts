import {describe,it,expect} from 'vitest';
import {humanRoutingInput} from '../src/modules/agents/human-routing-input.js';
const id='8d788ab7-7f49-4b53-a123-111111111111';
describe('Human routing boundaries',()=>{
 it('rejects unknown fields, duplicate skill refs and noninteger capacity',()=>{
  expect(()=>humanRoutingInput('profiles',{principal_id:id,capacity:1.5,enabled:true})).toThrow();
  expect(()=>humanRoutingInput('profiles',{principal_id:id,capacity:1,enabled:true,tenant_id:id})).toThrow();
  expect(()=>humanRoutingInput('team-skills',{team_id:id,skill_ids:[id,id]})).toThrow();
 });
 it('distinguishes paused queue, zero capacity and unassigned command',()=>{
  expect(humanRoutingInput('profiles',{principal_id:id,capacity:0,enabled:false}).capacity).toBe(0);
  expect(humanRoutingInput('reroute',{work_id:id,queue_id:id,owner_principal_id:null}).owner_principal_id).toBeNull();
  expect(()=>humanRoutingInput('reroute',{work_id:id,queue_id:id})).toThrow();
 });
});
