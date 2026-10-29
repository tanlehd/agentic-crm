import { describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { validateGraph,resolveConfig } from '../src/modules/workflow/graph.js';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import schema from '../../../packages/contracts/schemas/workflow.json';
const base=()=>({trigger:{event_type:'conversation.created',connection_id:randomUUID()},entry_node:'end',nodes:[{key:'end',type:'end',config:{outcome:'done'}}]});
describe('workflow typed DAG',()=>{
  it('can read a retired immutable version without accepting it for new execution',()=>{
    const graph={...base(),nodes:[{key:'end',type:'start_chatflow',config:{}}]};
    const validate=addFormats(new Ajv({strict:false})).compile({...schema,$ref:'#/definitions/workflow-versions'});
    expect(validate({data:[{id:randomUUID(),number:1,state:'published',graph,execution_role_id:randomUUID()}],meta:{correlation_id:'synthetic'}})).toBe(true);
    const validateAuthoring=addFormats(new Ajv({strict:false})).compile({...schema,$ref:'#/definitions/workflow-graph'});
    expect(validateAuthoring(graph)).toBe(false);
    expect(()=>validateGraph(graph)).toThrow('INVALID_WORKFLOW_GRAPH');
  });
  it('rejects malformed, cyclic, disconnected, extra fields and unbounded graph',()=>{
    for(const v of [null,{}, {...base(),nodes:[{key:'end',type:'condition'}]}, {...base(),nodes:[{key:'end',type:'wait_timer',config:{duration_seconds:1},next:'end'}]}, {...base(),nodes:[...base().nodes,{key:'extra',type:'end',config:{outcome:'done'}}]}, {...base(),unknown:1}, {...base(),nodes:Array(51).fill(base().nodes[0])}])expect(()=>validateGraph(v)).toThrow('INVALID_WORKFLOW_GRAPH');
  });
  it('binding must dominate on every branch and wait must name matching child',()=>{
    const g={...base(),entry_node:'fork',nodes:[{key:'fork',type:'condition',config:{left:true,op:'eq',right:true,on_true:'start',on_false:'wait'}},{key:'start',type:'request_lead_handoff',config:{lead_id:{ref:'trigger.aggregate_id'},target_team_id:randomUUID()},next:'wait'},{key:'wait',type:'wait_event',config:{event_type:'lead.accepted',match_key:{ref:'outputs.start.handoff_id'},timeout_seconds:20},next:'end',on_timeout:'end'},...base().nodes]};expect(()=>validateGraph(g)).toThrow('INVALID_WORKFLOW_GRAPH');g.entry_node='start';g.nodes.shift();expect(validateGraph(g)).toEqual(g);g.nodes[1]!.config.event_type='retired.event';expect(()=>validateGraph(g)).toThrow('INVALID_WORKFLOW_GRAPH');
  });
  it('rejects arbitrary property traversal, non UUID input, invalid timeout and scalar types',()=>{
    for(const ref of ['trigger.text','outputs.constructor.prototype','trigger.aggregate_id.anything']){const g={...base(),entry_node:'start',nodes:[{key:'start',type:'request_lead_handoff',config:{lead_id:{ref},target_team_id:randomUUID()},next:'end'},...base().nodes]};expect(()=>validateGraph(g)).toThrow('INVALID_WORKFLOW_GRAPH');}
    expect(()=>validateGraph({...base(),entry_node:'timer',nodes:[{key:'timer',type:'wait_timer',config:{duration_seconds:86401},next:'end'},...base().nodes]})).toThrow();
  });
  it('literal values retain type and missing optional result resolves absent',()=>{const n={key:'condition',type:'condition' as const,config:{left:{ref:'outputs.wait.lead_id'},op:'exists',on_true:'yes',on_false:'no'}};expect(resolveConfig(n,{trigger:{},outputs:{}})).toEqual({left:undefined,op:'exists',on_true:'yes',on_false:'no'});expect(validateGraph(base())).toEqual(expect.objectContaining({entry_node:'end'}));});
});
