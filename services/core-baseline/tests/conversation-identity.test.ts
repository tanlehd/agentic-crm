import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {validateGraph,resolve,resolveConfig} from '../src/modules/workflow/graph.js';
import {DurableDelivery} from '../src/kernel/reliability/delivery.js';
describe('conversation identity compatibility',()=>{
 it('reads old graphs and contexts without mutating immutable artifacts',()=>{
  const g={trigger:{event_type:'need.assessed',connection_id:randomUUID()},entry_node:'read',nodes:[{key:'read',type:'read_need',config:{thread_id:{ref:'trigger.thread_id'},session_id:{ref:'trigger.session_id'},need_id:{ref:'trigger.need_id'},assessment_version:{ref:'trigger.assessment_version'}},next:'end'},{key:'end',type:'end',config:{outcome:'done'}}]};
  const before=JSON.stringify(g),next=validateGraph(g);expect(next.nodes[0]!.config.conversation_id).toEqual({ref:'trigger.conversation_id'});expect(JSON.stringify(g)).toBe(before);
  expect(resolveConfig(next.nodes[0]!,{trigger:{thread_id:'old',session_id:'s',need_id:'n',assessment_version:'1'},outputs:{}}).conversation_id).toBe('old');
  expect(resolve({ref:'outputs.recover.owner_id'},{trigger:{},outputs:{recover:{owner_id:null}}})).toBe(null);
  expect(resolve({ref:'outputs.recover.conversation_id'},{trigger:{},outputs:{recover:{thread_id:'old'}}})).toBe('old');
  expect(()=>validateGraph({...g,nodes:[{...g.nodes[0],config:{...g.nodes[0]!.config,conversation_id:{ref:'trigger.conversation_id'}}},g.nodes[1]]})).toThrow();
 });
 it('delivery permits v2 only for the two explicitly versioned events',()=>{
  const d=new DurableDelivery({} as any) as any,row={payload:{conversation_id:randomUUID()},schema_version:2,occurred_at:new Date()};
  for(const event_type of ['need.assessed','conversation.classification_changed'])expect(d.envelope({...row,event_type}).schema_version).toBe(2);
  expect(()=>d.envelope({...row,event_type:'conversation.created'})).toThrow('INVALID_EVENT');expect(()=>d.envelope({...row,event_type:'need.assessed',schema_version:3})).toThrow('INVALID_EVENT');
 });
});
