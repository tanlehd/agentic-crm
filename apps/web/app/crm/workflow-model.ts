export type WorkflowType='assign_owner'|'wait_event'|'condition'|'request_lead_handoff'|'wait_timer'|'recover_need'|'read_need'|'end';
export interface WorkflowNode {key:string;type:WorkflowType;config:Record<string,any>;next?:string;on_timeout?:string}
export interface WorkflowGraph {trigger:{event_type:'conversation.created'|'need.assessed';connection_id:string};entry_node:string;nodes:WorkflowNode[]}
export interface WorkflowDefinition {id:string;key:string;name:string;service_actor_id:string;active_version_id:string|null;enabled:boolean;version:string}
export interface WorkflowVersion {id:string;number:number;state:'draft'|'published';graph:WorkflowGraph;execution_role_id:string}
export interface WorkflowOptions {actors:{id:string;key:string;role_id:string;role_name:string}[];teams:{id:string;name:string;purpose:string}[];connections:{id:string;name:string;provider:string}[]}
export const workflowLabels:Record<WorkflowType,string>={read_need:'Đọc đánh giá nhu cầu',recover_need:'Mở phiên follow-up',assign_owner:'Phân công phụ trách',wait_event:'Chờ kết quả',condition:'Rẽ nhánh',request_lead_handoff:'Bàn giao Lead',wait_timer:'Trì hoãn',end:'Kết thúc'};
export function initialWorkflow(connection=''):WorkflowGraph{return {trigger:{event_type:'conversation.created',connection_id:connection},entry_node:'end',nodes:[{key:'end',type:'end',config:{outcome:'done'}}]};}
export function supportedWorkflow(g:WorkflowGraph){return g.nodes.every(n=>Object.hasOwn(workflowLabels,n.type));}
export function nodeDefaults(type:WorkflowType):Record<string,any>{switch(type){
 case 'read_need':return {conversation_id:{ref:'trigger.conversation_id'},session_id:{ref:'trigger.session_id'},need_id:{ref:'trigger.need_id'},assessment_version:{ref:'trigger.assessment_version'}};
 case 'recover_need':return {conversation_id:{ref:'trigger.conversation_id'},session_id:{ref:'trigger.session_id'},need_id:{ref:'trigger.need_id'},assessment_version:{ref:'trigger.assessment_version'},team_id:'',preference:'human',min_confidence:0.8,cooldown_seconds:0,max_age_seconds:604800};
 case 'assign_owner':return {record_id:{ref:'trigger.aggregate_id'},team_id:'',capability:'chat',preference:'any'};
 case 'wait_event':return {event_type:'lead.accepted',match_key:{ref:'outputs.handoff.handoff_id'},timeout_seconds:3600};
 case 'condition':return {left:{ref:'trigger.contact_id'},op:'exists',on_true:'',on_false:''};
 case 'request_lead_handoff':return {lead_id:{ref:'outputs.wait.lead_id'},target_team_id:''};
 case 'wait_timer':return {duration_seconds:60};case 'end':return {outcome:'done'};
}}
export function workflowEdges(n:WorkflowNode){return n.type==='end'?[]:n.type==='condition'?[n.config.on_true,n.config.on_false]:n.type==='wait_event'?[n.next,n.on_timeout]:[n.next];}
export function renameNode(g:WorkflowGraph,old:string,key:string):WorkflowGraph{
 const swap=(v:string|undefined)=>v===old?key:v;
 return {...g,entry_node:swap(g.entry_node)!,nodes:g.nodes.map(n=>{
   const config={...n.config};for(const k of ['on_true','on_false'])if(k in config)config[k]=swap(config[k]);
   for(const [k,v] of Object.entries(config))if(v&&typeof v==='object'&&typeof v.ref==='string'&&v.ref.startsWith(`outputs.${old}.`))config[k]={ref:`outputs.${key}.${v.ref.split('.')[2]}`};
   return {...n,key:swap(n.key)!,config,...(n.next!==undefined?{next:swap(n.next)}:{}),...(n.on_timeout!==undefined?{on_timeout:swap(n.on_timeout)}:{})};
 })};
}
export function insertNode(g:WorkflowGraph,type:WorkflowType,before:string):WorkflowGraph{
 let index=1;while(g.nodes.some(n=>n.key===`step_${index}`))index++;const key=`step_${index}`,config=nodeDefaults(type);
 if(type==='condition'){config.on_true=before;config.on_false=before;}
 const node:WorkflowNode={key,type,config,...(!['end','condition'].includes(type)?{next:before}:{}),...(type==='wait_event'?{on_timeout:before}:{})};
 const nodes=g.nodes.map(n=>({...n,config:n.type==='condition'?{...n.config,on_true:n.config.on_true===before?key:n.config.on_true,on_false:n.config.on_false===before?key:n.config.on_false}:n.config,...(n.next===before?{next:key}:{}),...(n.on_timeout===before?{on_timeout:key}:{})}));
 nodes.splice(Math.max(0,nodes.findIndex(n=>n.key===before)),0,node);return {...g,entry_node:g.entry_node===before?key:g.entry_node,nodes};
}
export function workflowRefs(g:WorkflowGraph){const fields:Record<WorkflowType,string[]>={read_need:['current','assessment_status','need_clarity','intent','product_interest','unresolved_reason'],recover_need:['outcome','conversation_id','session_id','owner_id'],assign_owner:['owner_id','owner_revision'],wait_event:['outcome','lead_id','timed_out'],condition:[],request_lead_handoff:['handoff_id','lead_id'],wait_timer:['woke_at'],end:[]};return [...(g.trigger.event_type==='need.assessed'?['trigger.session_id','trigger.need_id','trigger.assessment_version']:[]),'trigger.conversation_id','trigger.aggregate_id','trigger.contact_id','trigger.connection_id',...g.nodes.flatMap(n=>fields[n.type].map(f=>`outputs.${n.key}.${f}`))];}
