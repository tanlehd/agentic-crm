import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {initialWorkflow,insertNode,renameNode,type WorkflowGraph} from './workflow-model';
import {validateGraph} from '../../../backend/src/modules/workflow/graph';
import {can,type Context} from './api';
describe('Workflow authoring transformations',()=>{
 it('inserts delay and branch as connected valid DAG without mutating a saved snapshot',()=>{
  const initial=initialWorkflow(randomUUID()),copy=structuredClone(initial),delayed=insertNode(initial,'wait_timer','end'),branched=insertNode(delayed,'condition','step_1');
  expect(initial).toEqual(copy);expect(branched.entry_node).toBe('step_2');expect(validateGraph(branched)).toEqual(branched);expect(branched.nodes.find(n=>n.key==='step_2')!.config.on_false).toBe('step_1');
 });
 it('renaming updates entry/normal/timeout/branch edges and typed output bindings',()=>{
  const g:WorkflowGraph={...initialWorkflow(randomUUID()),entry_node:'start',nodes:[{key:'start',type:'start_chatflow',config:{conversation_id:{ref:'trigger.aggregate_id'},chatflow_version_id:randomUUID()},next:'wait'},{key:'wait',type:'wait_event',config:{event_type:'chatflow.completed',match_key:{ref:'outputs.start.session_id'},timeout_seconds:60},next:'branch',on_timeout:'end'},{key:'branch',type:'condition',config:{left:{ref:'outputs.wait.lead_id'},op:'exists',on_true:'end',on_false:'end'}},{key:'end',type:'end',config:{outcome:'done'}}]};
  const renamed=renameNode(renameNode(g,'start','collect'),'end','finish');expect(renamed.entry_node).toBe('collect');expect(renamed.nodes[1]!.config.match_key.ref).toBe('outputs.collect.session_id');expect(renamed.nodes[1]!.on_timeout).toBe('finish');expect(renamed.nodes[2]!.config.on_true).toBe('finish');expect(validateGraph(renamed)).toEqual(renamed);expect(g.nodes[0]!.key).toBe('start');
 });
 it('automation privileged actions require configure and all scope exactly like backend',()=>{
  const ctx:Context={principal_id:randomUUID(),capabilities:['read','chat'],grants:[{resource:'automation',action:'design',scope:'all'}],objects:[]};expect(can(ctx,'automation','design')).toBe(false);ctx.capabilities=['read','configure'];expect(can(ctx,'automation','design')).toBe(true);ctx.grants[0]!.scope='own';expect(can(ctx,'automation','design')).toBe(false);
 });
});
