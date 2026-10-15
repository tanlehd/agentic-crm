import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import type {WorkflowCatalog} from '@agentic-crm/contracts';
import {validateAuthoringGraph,nodeCatalog} from '../src/authoring.js';

const tenant=randomUUID(),rootId=randomUUID(),relatedId=randomUUID(),relationId=randomUUID();
const revision='a'.repeat(64);
const field=(key:string,type='string',options:string[]|null=null)=>({id:`standard:${key}`,key,label:key,type,required:false,nullable:true,options,indexed:true,readable:true,writable:true,filter_operators:['eq','in'],version:'1'});
const capabilities={record_read:true,record_query:true,record_update:true,workflow_actions:false,object_change_events:false,change_images:false,relation_traversal:false};
const catalog=()=>({schema_version:1,tenant_id:tenant,principal_id:randomUUID(),authorization_revision:'1',revision,objects:[
  {id:rootId,key:'contact',label:'Contact',kind:'standard',version:'1',schema_version:'1',owner_service:'crm',properties:[field('name'),field('count','integer'),field('amount','decimal'),field('date','date'),field('at','datetime'),field('state','enum',['new','done']),field('json','opaque')],capabilities},
  {id:relatedId,key:'appointment',label:'Appointment',kind:'custom',version:'1',schema_version:'1',owner_service:'crm',properties:[field('name')],capabilities},
],relations:[{id:relationId,key:'appointments',label:'Appointments',version:'1',source_object_type_id:rootId,target_object_type_id:relatedId,cardinality:'one_to_many'}]} as WorkflowCatalog);
const end={key:'end',type:'end',version:1,config:{outcome:'done'}};
const graph=(nodes:unknown[]=[end])=>({schema_version:1,catalog_revision:revision,root_object_id:rootId,trigger:{operation:'updated',changed_property_ids:[]},entry_node:(nodes[0] as {key:string}).key,nodes});
const codes=(g:unknown,c:unknown=catalog(),t=tenant)=>validateAuthoringGraph(g,c,t).issues.map(i=>i.code);
const update=(id:string,value:unknown)=>graph([{key:'update',type:'data.update_record',version:1,config:{target:{ref:'root'},fields:[{property_id:'standard:'+id,value:{literal:value}}]},next:'end'},end]);
describe('Workflow Core trusted-catalog draft validation',()=>{
  it('valid draft is never executable and no node claims runtime capability',()=>{
    const result=validateAuthoringGraph(graph(),catalog(),tenant);expect(result).toMatchObject({valid:true,executable:false,node_count:1,issues:[]});
    expect(nodeCatalog).toHaveLength(11);expect(nodeCatalog.every(n=>!n.execution_available)).toBe(true);
  });
  it('rejects invalid shape and unknown keys instead of accepting injected permissions',()=>{
    for(const input of [null,{}, {...graph(),tenant_id:tenant},graph([{...end,version:2}]),graph([{...end,config:{outcome:'done',code:'eval()'}}])])expect(codes(input)).toContain('INVALID_GRAPH_SHAPE');
  });
  it('rejects tenant mismatch and stale catalog without consuming foreign metadata',()=>{
    expect(codes(graph(),catalog(),randomUUID())).toEqual(['TENANT_MISMATCH']);expect(codes({...graph(),catalog_revision:'b'.repeat(64)})).toContain('CATALOG_REVISION_MISMATCH');
  });
  it('unknown root/field and incomplete catalog fail closed',()=>{
    expect(codes({...graph(),root_object_id:randomUUID()})).toContain('OBJECT_NOT_AVAILABLE');
    expect(codes(update('hidden','value'))).toContain('PROPERTY_NOT_AVAILABLE');expect(codes(graph(),{...catalog(),objects:[]})).toContain('OBJECT_NOT_AVAILABLE');
  });
  it('checks trigger field IDs and created/changed semantics',()=>{
    expect(codes({...graph(),trigger:{operation:'updated',changed_property_ids:['standard:absent']}})).toContain('PROPERTY_NOT_AVAILABLE');
    expect(codes({...graph(),trigger:{operation:'created',changed_property_ids:['standard:name']}})).toContain('CREATED_TRIGGER_HAS_CHANGED_FIELDS');
  });
  it('rejects duplicate/unsafe keys, dangling edges, cycles and unreachable nodes',()=>{
    expect(codes(graph([end,end]))).toContain('DUPLICATE_OR_UNSAFE_NODE');expect(codes(graph([{...end,key:'constructor'}]))).toContain('DUPLICATE_OR_UNSAFE_NODE');
    const delay={key:'wait',type:'delay.duration',version:1,config:{seconds:60},next:'wait'};
    expect(codes(graph([delay]))).toContain('GRAPH_CYCLE');expect(codes(graph([{...delay,next:'missing'}]))).toContain('EDGE_NOT_FOUND');
    expect(codes(graph([end,{...end,key:'orphan'}]))).toContain('UNREACHABLE_NODE');
  });
  it('requires output dominator on every branch and handles forward-ordered graph arrays',()=>{
    const fork={key:'fork',type:'branch.if_else',version:1,config:{left:{ref:'property',property_id:'standard:name'},op:'exists',on_true:'read',on_false:'write'}};
    const read={key:'read',type:'data.get_record',version:1,config:{object_id:rootId,target:{ref:'root'}},next:'write'};
    const write={key:'write',type:'data.update_record',version:1,config:{target:{ref:'output',node_key:'read'},fields:[{property_id:'standard:name',value:{literal:'x'}}]},next:'end'};
    expect(codes(graph([fork,write,read,end]))).toContain('OUTPUT_NOT_DOMINATING');
    expect(codes({...graph([write,end,read]),entry_node:'read'})).toEqual([]);
  });
  it('rejects object reinterpretation and collection-to-record coercion',()=>{
    expect(codes(graph([{key:'read',type:'data.get_record',version:1,config:{object_id:relatedId,target:{ref:'root'}},next:'end'},end]))).toContain('RECORD_OBJECT_MISMATCH');
    const find={key:'find',type:'data.find_related',version:1,config:{source:{ref:'root'},relation_path:[{association_id:relationId,direction:'outgoing'}],limit:10},next:'send'};
    const send={key:'send',type:'communication.send_email',version:1,config:{target:{ref:'output',node_key:'find'},template_id:randomUUID()},next:'end'};
    expect(codes(graph([find,send,end]))).toContain('SCALAR_RECORD_REQUIRED');
  });
  it('resolves directional relations and blocks invalid paths/relation cycles',()=>{
    const find={key:'find',type:'data.find_related',version:1,config:{source:{ref:'root'},relation_path:[{association_id:relationId,direction:'outgoing'}],limit:10},next:'end'};
    expect(codes(graph([find,end]))).toEqual([]);
    expect(codes(graph([{...find,config:{...find.config,relation_path:[{association_id:relationId,direction:'incoming'}]}},end]))).toContain('RELATION_PATH_MISMATCH');
    expect(codes({...graph([{...find,config:{...find.config,relation_path:[{association_id:relationId,direction:'incoming'}]}},end]),root_object_id:relatedId})).toEqual([]);
    expect(codes(graph([{...find,config:{...find.config,relation_path:[...find.config.relation_path,{association_id:relationId,direction:'incoming'}]}},end]))).toContain('RELATION_PATH_CYCLE');
  });
  it.each([['count',1.1],['count',Number.MAX_SAFE_INTEGER+1],['amount',1.23],['amount','1e4'],['date','2026-02-30'],['at','2026-10-13T00:00:00+07:00'],['state','invalid'],['json','arbitrary']])('rejects invalid typed literal %s=%s',(id,value)=>expect(codes(update(id as string,value))).not.toEqual([]));
  it.each([['count',17],['amount','123.450001'],['date','2026-10-13'],['at','2026-10-13T00:00:00Z'],['state','done'],['name',null]])('accepts matching typed literal %s=%s',(id,value)=>expect(codes(update(id as string,value))).toEqual([]));
  it('respects immutable/field deny and required/null policy',()=>{
    const c=catalog();c.objects[0]!.properties[0]!.writable=false;expect(codes(update('name','x'),c)).toContain('FIELD_NOT_WRITABLE');
    c.objects[0]!.properties[0]!.writable=true;c.objects[0]!.properties[0]!.nullable=false;expect(codes(update('name',null),c)).toContain('FIELD_TYPE_MISMATCH');
  });
  it('checks branch operand shape, enum type, nullable and ordered comparisons',()=>{
    const branch=(config:unknown)=>graph([{key:'branch',type:'branch.if_else',version:1,config},end]);
    const config={left:{ref:'property',property_id:'standard:state'},op:'eq',right:'new',on_true:'end',on_false:'end'};
    expect(codes(branch(config))).toEqual([]);expect(codes(branch({...config,right:'bad'}))).toContain('COMPARISON_TYPE_MISMATCH');
    expect(codes(branch({...config,op:'gt'}))).toContain('ORDERED_COMPARISON_TYPE');expect(codes(branch({...config,op:'in'}))).toContain('COMPARISON_OPERAND_SHAPE');
    expect(codes(branch({...config,op:'exists'}))).toContain('UNEXPECTED_RIGHT_OPERAND');
  });
  it('validates timers, nonnull datetime binding and max graph/collection bounds',()=>{
    const timer={key:'wait',type:'delay.until',version:1,config:{at:{literal:'2026-10-13T00:00:00Z'},offset_seconds:0},next:'end'};
    expect(codes(graph([timer,end]))).toEqual([]);
    expect(codes(graph([{...timer,config:{...timer.config,at:{literal:'2026-02-30'}}},end]))).toContain('DATETIME_REQUIRED');
    expect(codes(graph(Array(51).fill(end)))).toContain('INVALID_GRAPH_SHAPE');
  });
});
