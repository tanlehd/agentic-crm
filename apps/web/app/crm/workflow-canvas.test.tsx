import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {addCanvasNode,autoLayout,connectGraph,ports,triggerId} from './workflow-canvas-model';
import {initialWorkflow,insertNode} from './workflow-model';
import {validateGraph} from '../../../backend/src/modules/workflow/graph';
describe('Workflow canvas execution graph compatibility',()=>{
 it('replaces only the selected branch, removes it and keeps the saved graph immutable',()=>{
  const g=insertNode(insertNode(initialWorkflow(randomUUID()),'wait_timer','end'),'condition','step_1'),before=structuredClone(g);
  const next=connectGraph(g,'step_2','on_false','end');expect(next.nodes.find(n=>n.key==='step_2')!.config).toMatchObject({on_true:'step_1',on_false:'end'});expect(validateGraph(next)).toEqual(next);expect(g).toEqual(before);
  expect(connectGraph(next,'step_2','on_false','').nodes.find(n=>n.key==='step_2')!.config.on_false).toBe('');
 });
 it('rejects self/indirect cycles, missing nodes and invalid ports; trigger supports entry replacement',()=>{
  const g=insertNode(insertNode(initialWorkflow(),'wait_timer','end'),'condition','step_1');
  expect(()=>connectGraph(g,'step_1','next','step_1')).toThrow('vòng lặp');expect(()=>connectGraph(g,'step_1','next','step_2')).toThrow('vòng lặp');expect(()=>connectGraph(g,'step_1','next','missing')).toThrow();expect(()=>connectGraph(g,'end','next','step_1')).toThrow();expect(connectGraph(g,triggerId,'entry','step_1').entry_node).toBe('step_1');
 });
 it('maps wait timeout independently and keeps disconnected dropped nodes explicit',()=>{
  const g=addCanvasNode(initialWorkflow(),'wait_event'),node=g.nodes[1]!;expect(ports(node).map(p=>p.id)).toEqual(['next','on_timeout']);const next=connectGraph(connectGraph(g,node.key,'next','end'),node.key,'on_timeout','end');expect(next.nodes[1]).toMatchObject({next:'end',on_timeout:'end'});expect(g.nodes[1]!.next).toBeUndefined();expect(next.entry_node).toBe('end');
 });
 it('lays out branches and converging paths after their predecessors; positions never enter wire graph',()=>{
  const g=insertNode(insertNode(initialWorkflow(randomUUID()),'wait_timer','end'),'condition','step_1');const p=autoLayout(g);expect(p.step_2!.y).toBeLessThan(p.step_1!.y);expect(p.step_1!.y).toBeLessThan(p.end!.y);expect(new Set(Object.values(p).map(v=>`${v.x},${v.y}`)).size).toBe(g.nodes.length+1);expect(autoLayout(g)).toEqual(p);expect(validateGraph(g)).toEqual(g);expect(JSON.stringify(g)).not.toContain('position');
 });
});
