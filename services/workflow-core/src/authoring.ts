import {Ajv} from 'ajv';
import addFormats from 'ajv-formats';
import {workflowAuthoringSchema,workflowCatalogSchema,type WorkflowAuthoring,type WorkflowCatalog} from '@agentic-crm/contracts';

const compiler=new Ajv({allErrors:false,strict:true});
(addFormats as unknown as (a:Ajv)=>void)(compiler);
const graphSchema=compiler.compile<WorkflowAuthoring>(workflowAuthoringSchema);
const catalogSchema=compiler.compile<WorkflowCatalog>(workflowCatalogSchema);
type Node=WorkflowAuthoring['nodes'][number];
type Binding=Extract<Node,{type:'data.get_record'}>['config']['target'];
type Property=WorkflowCatalog['objects'][number]['properties'][number];
type Shape={kind:'record'|'collection';objectId:string;nullable:false}|{kind:'scalar';type:string;nullable:boolean;options?:string[]|null;literal?:unknown;constant?:boolean};
export interface ValidationResult {valid:boolean;executable:false;issues:{code:string;path:string}[];node_count:number;catalog_revision:string}
export const nodeCatalog=Object.freeze([
  ['end','control'],['delay.duration','control'],['delay.until','control'],['branch.if_else','control'],
  ['data.get_record','data'],['data.find_related','data'],['data.update_record','data'],
  ['routing.assign_owner','business'],['communication.send_message','communication'],['communication.send_email','communication'],['communication.notify','communication'],
].map(([type,category])=>Object.freeze({type:type!,version:1,category:category!,execution_available:false,reason:'EXECUTION_NOT_IMPLEMENTED'})));

function literalFits(p:{type:string;nullable:boolean;options?:string[]|null},v:unknown):boolean {
  if(v===null)return p.nullable;
  if(p.type==='integer')return Number.isSafeInteger(v);
  if(p.type==='boolean')return typeof v==='boolean';
  if(typeof v!=='string')return false;
  if(p.type==='enum')return !!p.options?.includes(v);
  if(p.type==='string'||p.type==='text')return v.length<=(p.type==='string'?255:4000);
  if(p.type==='decimal')return /^-?(?:0|[1-9]\d{0,13})(?:\.\d{1,6})?$/.test(v);
  if(p.type==='reference')return /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
  if(p.type==='date'||p.type==='datetime') {
    const pattern=p.type==='date'?/^\d{4}-\d{2}-\d{2}$/:/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
    if(!pattern.test(v)||v<'1000-01-01'||!Number.isFinite(Date.parse(v)))return false;
    return new Date(v).toISOString().slice(0,p.type==='date'?10:19)===v.slice(0,p.type==='date'?10:19);
  }
  return false;
}
function assignable(target:{type:string;nullable:boolean;options?:string[]|null},source:Shape):boolean {
  if(source.kind!=='scalar'||target.type==='opaque'||source.type==='opaque')return false;
  if(source.constant)return literalFits(target,source.literal);
  if(source.nullable&&!target.nullable)return false;
  if(target.type!==source.type&&!(target.type==='text'&&source.type==='string'))return false;
  return target.type!=='enum'||!!source.options?.every(v=>target.options?.includes(v));
}
const edges=(node:Node):string[]=>node.type==='end'?[]:node.type==='branch.if_else'?[node.config.on_true,node.config.on_false]:[node.next];

/** Draft validation only. The caller must supply its own current authorized catalog. */
export function validateAuthoringGraph(input:unknown,catalog:unknown,tenantId:string):ValidationResult {
  const result:ValidationResult={valid:false,executable:false,issues:[],node_count:0,catalog_revision:''};
  const issue=(code:string,path:string)=>{if(result.issues.length<100)result.issues.push({code,path});};
  if(!catalogSchema(catalog)){issue('INVALID_CATALOG','');return result;}
  if(catalog.tenant_id!==tenantId){issue('TENANT_MISMATCH','');return result;}
  result.catalog_revision=catalog.revision;
  if(!graphSchema(input)){issue('INVALID_GRAPH_SHAPE',graphSchema.errors?.[0]?.instancePath??'');return result;}
  const graph=input;result.node_count=graph.nodes.length;
  if(graph.catalog_revision!==catalog.revision)issue('CATALOG_REVISION_MISMATCH','/catalog_revision');
  const objects=new Map(catalog.objects.map(o=>[o.id,o]));
  const relations=new Map(catalog.relations.map(r=>[r.id,r]));
  if(objects.size!==catalog.objects.length||relations.size!==catalog.relations.length||catalog.objects.some(o=>new Set(o.properties.map(p=>p.id)).size!==o.properties.length))issue('INVALID_CATALOG','');
  const root=objects.get(graph.root_object_id);
  if(!root)issue('OBJECT_NOT_AVAILABLE','/root_object_id');
  const property=(objectId:string,id:string,path:string):Property|undefined=>{
    const p=objects.get(objectId)?.properties.find(p=>p.id===id);
    if(!p)issue('PROPERTY_NOT_AVAILABLE',path);return p;
  };
  for(const [i,id] of graph.trigger.changed_property_ids.entries())property(graph.root_object_id,id,`/trigger/changed_property_ids/${i}`);
  if(graph.trigger.operation==='created'&&graph.trigger.changed_property_ids.length)issue('CREATED_TRIGGER_HAS_CHANGED_FIELDS','/trigger/changed_property_ids');
  const nodes=new Map<string,Node>();const positions=new Map<string,number>();
  for(const [i,n] of graph.nodes.entries()){
    if(['constructor','prototype','__proto__'].includes(n.key)||nodes.has(n.key))issue('DUPLICATE_OR_UNSAFE_NODE',`/nodes/${i}/key`);
    nodes.set(n.key,n);positions.set(n.key,i);
  }
  if(!nodes.has(graph.entry_node))issue('ENTRY_NOT_FOUND','/entry_node');
  for(const [i,n] of graph.nodes.entries())for(const edge of edges(n))if(!nodes.has(edge))issue('EDGE_NOT_FOUND',`/nodes/${i}`);
  if(result.issues.length)return result;
  const visited=new Set<string>(),active=new Set<string>(),order:string[]=[];
  function visit(key:string){
    if(active.has(key)){issue('GRAPH_CYCLE',`/nodes/${positions.get(key)}`);return;}
    if(visited.has(key))return;active.add(key);
    for(const edge of edges(nodes.get(key)!))visit(edge);
    active.delete(key);visited.add(key);order.unshift(key);
  }
  visit(graph.entry_node);
  if(visited.size!==nodes.size)issue('UNREACHABLE_NODE','/nodes');
  if(result.issues.length)return result;
  const dominators=new Map<string,Set<string>>(),outputs=new Map<string,Shape>();
  for(const key of order){
    const parents=graph.nodes.filter(n=>edges(n).includes(key)).map(n=>n.key);
    let dom=new Set<string>();
    for(const [i,parent] of parents.entries()){
      const set=new Set([parent,...dominators.get(parent)!]);
      dom=i===0?set:new Set([...dom].filter(k=>set.has(k)));
    }
    dominators.set(key,dom);
    const node=nodes.get(key)!,path=`/nodes/${positions.get(key)}/config`;
    const rootShape:Shape={kind:'record',objectId:graph.root_object_id,nullable:false};
    const resolve=(binding:Binding,where:string):Shape|undefined=>{
      if('literal' in binding){
        if(typeof binding.literal==='number'&&!Number.isSafeInteger(binding.literal)){issue('INVALID_INTEGER_LITERAL',where);return;}
        return {kind:'scalar',type:binding.literal===null?'null':typeof binding.literal==='number'?'integer':typeof binding.literal,nullable:binding.literal===null,constant:true,literal:binding.literal};
      }
      if(binding.ref==='root')return rootShape;
      if(binding.ref==='property'){
        const p=property(rootShape.objectId,binding.property_id,where);return p?{kind:'scalar',type:p.type,nullable:p.nullable,options:p.options}:undefined;
      }
      if(!dom.has(binding.node_key)){issue('OUTPUT_NOT_DOMINATING',where);return;}
      const output=outputs.get(binding.node_key);
      if(!output){issue('OUTPUT_NOT_AVAILABLE',where);return;}
      if(binding.ref==='output')return output;
      if(output.kind!=='record'){issue('SCALAR_RECORD_REQUIRED',where);return;}
      const p=property(output.objectId,binding.property_id,where);return p?{kind:'scalar',type:p.type,nullable:p.nullable,options:p.options}:undefined;
    };
    const record=(binding:Binding,where:string)=>{
      const s=resolve(binding,where);if(s?.kind!=='record'){if(s)issue('SCALAR_RECORD_REQUIRED',where);return undefined;}return s;
    };
    if(node.type==='data.get_record'){
      const target=record(node.config.target,path+'/target');
      if(!objects.has(node.config.object_id))issue('OBJECT_NOT_AVAILABLE',path+'/object_id');
      if(target&&target.objectId!==node.config.object_id)issue('RECORD_OBJECT_MISMATCH',path+'/target');
      if(target)outputs.set(key,target);
    }else if(node.type==='data.find_related'){
      const source=record(node.config.source,path+'/source');if(!source)continue;
      let objectId=source.objectId;const traversed=new Set([objectId]);let valid=true;
      for(const [i,hop] of node.config.relation_path.entries()){
        const r=relations.get(hop.association_id),where=path+`/relation_path/${i}`;
        if(!r){issue('RELATION_NOT_AVAILABLE',where);valid=false;break;}
        const from=hop.direction==='outgoing'?r.source_object_type_id:r.target_object_type_id;
        const to=hop.direction==='outgoing'?r.target_object_type_id:r.source_object_type_id;
        if(from!==objectId||!objects.has(to)){issue('RELATION_PATH_MISMATCH',where);valid=false;break;}
        if(traversed.has(to)){issue('RELATION_PATH_CYCLE',where);valid=false;break;}
        traversed.add(to);objectId=to;
      }
      if(valid)outputs.set(key,{kind:'collection',objectId,nullable:false});
    }else if(node.type==='data.update_record'){
      const target=record(node.config.target,path+'/target');if(!target)continue;
      const seen=new Set<string>();
      for(const [i,field] of node.config.fields.entries()){
        const where=path+`/fields/${i}`,p=property(target.objectId,field.property_id,where);
        if(seen.has(field.property_id))issue('DUPLICATE_FIELD',where);seen.add(field.property_id);
        if(p&&!p.writable)issue('FIELD_NOT_WRITABLE',where);
        const value=resolve(field.value,where+'/value');
        if(p&&value&&!assignable(p,value))issue('FIELD_TYPE_MISMATCH',where+'/value');
      }
    }else if(node.type==='delay.until'){
      const at=resolve(node.config.at,path+'/at');
      if(at&&!assignable({type:'datetime',nullable:false},at))issue('DATETIME_REQUIRED',path+'/at');
    }else if(node.type==='branch.if_else'){
      const left=resolve(node.config.left,path+'/left'),op=node.config.op;
      if(op==='exists'){if(Object.hasOwn(node.config,'right'))issue('UNEXPECTED_RIGHT_OPERAND',path+'/right');continue;}
      if(!Object.hasOwn(node.config,'right')){issue('RIGHT_OPERAND_REQUIRED',path+'/right');continue;}
      if(!left)continue;
      if(left.kind!=='scalar'||left.type==='opaque'){issue('SCALAR_REQUIRED',path+'/left');continue;}
      if(['gt','gte','lt','lte'].includes(op)&&!['integer','decimal','date','datetime'].includes(left.type))issue('ORDERED_COMPARISON_TYPE',path+'/op');
      const right=node.config.right;
      if(op==='in'?!Array.isArray(right):Array.isArray(right)){issue('COMPARISON_OPERAND_SHAPE',path+'/right');continue;}
      const values=Array.isArray(right)?right:[right];
      if(values.some(v=>!literalFits({...left,nullable:op==='eq'||op==='ne'?true:false},v)))issue('COMPARISON_TYPE_MISMATCH',path+'/right');
    }else if(node.type==='routing.assign_owner'||node.type.startsWith('communication.')){
      if('target' in node.config)record(node.config.target,path+'/target');
    }
  }
  result.valid=result.issues.length===0;return result;
}
