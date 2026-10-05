import { CommandError } from '../../kernel/reliability/commands.js';
import { uuid } from '../identity/admin.js';
export type Primitive='assign_owner'|'start_chatflow'|'wait_event'|'condition'|'request_lead_handoff'|'wait_timer'|'end';
export interface Node {key:string;type:Primitive;config:Record<string,any>;next?:string;on_timeout?:string}
export interface Graph {trigger:{event_type:'conversation.created';connection_id:string};entry_node:string;nodes:Node[]}
const fields:Record<Primitive,Record<string,string>>={assign_owner:{owner_id:'uuid?',owner_revision:'string'},start_chatflow:{session_id:'uuid'},request_lead_handoff:{handoff_id:'uuid',lead_id:'uuid'},wait_event:{outcome:'string',lead_id:'uuid?',timed_out:'boolean'},wait_timer:{woke_at:'string'},condition:{},end:{}};
const bad=():never=>{throw new CommandError(422,'INVALID_WORKFLOW_GRAPH');};
function exact(v:any,keys:string[]){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k)))bad();}
const key=(v:any)=>typeof v==='string'&&/^[a-z][a-z0-9_]{0,47}$/.test(v)&&!['constructor','prototype','__proto__'].includes(v);
export function edges(n:Node):string[]{return n.type==='end'?[]:n.type==='condition'?[n.config.on_true,n.config.on_false]:n.type==='wait_event'?[n.next!,n.on_timeout!]:[n.next!];}
export function validateGraph(input:unknown):Graph {
  const g=input as Graph;exact(g,['trigger','entry_node','nodes']);exact(g.trigger,['event_type','connection_id']);
  if(g.trigger.event_type!=='conversation.created'||!uuid(g.trigger.connection_id)||!key(g.entry_node)||!Array.isArray(g.nodes)||!g.nodes.length||g.nodes.length>50)bad();
  const map=new Map<string,Node>();
  for(const n of g.nodes){exact(n,['key','type','config','next','on_timeout']);if(!key(n.key)||map.has(n.key)||!Object.hasOwn(fields,n.type))bad();exact(n.config,['record_id','team_id','capability','preference','conversation_id','chatflow_version_id','lead_id','target_team_id','event_type','match_key','timeout_seconds','duration_seconds','left','op','right','on_true','on_false','outcome']);map.set(n.key,n);}
  if(!map.has(g.entry_node))bad();
  const seen=new Set<string>(),stack=new Set<string>(),order:string[]=[];
  function visit(k:string){if(stack.has(k)||!map.has(k))bad();if(seen.has(k))return;stack.add(k);for(const e of edges(map.get(k)!)){if(!key(e))bad();visit(e);}stack.delete(k);seen.add(k);order.unshift(k);}
  visit(g.entry_node);if(seen.size!==map.size)bad();
  const dom=new Map<string,Set<string>>();
  for(const k of order){const parents=g.nodes.filter(n=>edges(n).includes(k)).map(n=>n.key);const ancestors=parents.length?new Set([...dom.get(parents[0]!)!,parents[0]!]):new Set<string>();for(const p of parents.slice(1))for(const a of ancestors)if(a!==p&&!dom.get(p)!.has(a))ancestors.delete(a);dom.set(k,ancestors);}
  function type(v:any,n:Node):string {if(v&&typeof v==='object'){exact(v,['ref']);if(typeof v.ref!=='string')return bad();const p=v.ref.split('.');if(p.length===2&&p[0]==='trigger'&&['aggregate_id','contact_id','connection_id'].includes(p[1]))return 'uuid';if(p.length!==3||p[0]!=='outputs'||!dom.get(n.key)!.has(p[1]))return bad();return fields[map.get(p[1])!.type][p[2]]??bad();}if(v===null)return 'null';if(typeof v==='string')return uuid(v)?'uuid':'string';if(typeof v==='number'&&Number.isFinite(v)||typeof v==='boolean')return typeof v;return bad();}
  function identifier(v:any,n:Node){if(type(v,n)!=='uuid')bad();}
  for(const n of g.nodes){const c=n.config;
    const configs:Record<Primitive,string[]>={assign_owner:['record_id','team_id','capability','preference'],start_chatflow:['conversation_id','chatflow_version_id'],request_lead_handoff:['lead_id','target_team_id'],wait_event:['event_type','match_key','timeout_seconds'],wait_timer:['duration_seconds'],condition:['left','op','right','on_true','on_false'],end:['outcome']};exact(c,configs[n.type]);
    if(n.type==='end'||n.type==='condition'){if(n.next!==undefined||n.on_timeout!==undefined)bad();}else if(n.type!=='wait_event'&&n.on_timeout!==undefined)bad();
    if(n.type==='assign_owner'){identifier(c.record_id,n);if(!uuid(c.team_id)||!['chat','sales'].includes(c.capability)||!['human','ai','any'].includes(c.preference))bad();}
    if(n.type==='start_chatflow'){identifier(c.conversation_id,n);if(!uuid(c.chatflow_version_id))bad();}
    if(n.type==='request_lead_handoff'){const t=type(c.lead_id,n);if(!['uuid','uuid?'].includes(t)||!uuid(c.target_team_id))bad();}
    if(n.type==='wait_event'){identifier(c.match_key,n);const p=c.match_key?.ref?.split('.');if(!p||p[0]!=='outputs'||!['chatflow.completed','lead.accepted'].includes(c.event_type)||map.get(p[1])?.type!==(c.event_type==='chatflow.completed'?'start_chatflow':'request_lead_handoff')||p[2]!==(c.event_type==='chatflow.completed'?'session_id':'handoff_id'))bad();if(!Number.isInteger(c.timeout_seconds)||c.timeout_seconds<1||c.timeout_seconds>86400)bad();}
    if(n.type==='wait_timer'&&(!Number.isInteger(c.duration_seconds)||c.duration_seconds<1||c.duration_seconds>86400))bad();
    if(n.type==='end'&&(typeof c.outcome!=='string'||! /^[a-z][a-z0-9_]{0,63}$/.test(c.outcome)))bad();
    if(n.type==='condition'){const l=type(c.left,n);if(!['eq','exists'].includes(c.op))bad();if(c.op==='exists'){if(Object.hasOwn(c,'right'))bad();}else{const r=type(c.right,n);if(l.replace('?','')!==r&&!(l.replace('?','')==='uuid'&&r==='string')&&r!=='null')bad();}}
  }return structuredClone(g);
}
export function resolve(v:any,context:{trigger:Record<string,unknown>;outputs:Record<string,Record<string,unknown>>}):any {if(!v||typeof v!=='object')return v;const p=v.ref.split('.');return p[0]==='trigger'?context.trigger[p[1]]:context.outputs[p[1]]?.[p[2]];}
export function resolveConfig(n:Node,context:any){return Object.fromEntries(Object.entries(n.config).map(([k,v])=>[k,resolve(v,context)]));}
export function sanitizeOutput(type:Primitive,value:Record<string,unknown>){const out:Record<string,unknown>={};for(const [k,t] of Object.entries(fields[type])){const v=value[k];if(v===undefined||v===null){if(t.endsWith('?')){out[k]=null;continue;}bad();}if(t.startsWith('uuid')?!uuid(v):typeof v!==t)bad();if(typeof v==='string'&&v.length>128)bad();if(k==='outcome'&&(typeof v!=='string'||! /^[a-z][a-z0-9_]{0,63}$/.test(v)))bad();if(k==='owner_revision'&&(typeof v!=='string'||! /^[1-9][0-9]{0,19}$/.test(v)))bad();out[k]=v;}return out;}
