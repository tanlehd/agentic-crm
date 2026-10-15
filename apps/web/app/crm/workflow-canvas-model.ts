import {nodeDefaults,workflowEdges,type WorkflowGraph,type WorkflowNode,type WorkflowType} from './workflow-model';
export const triggerId='__workflow_trigger__';
export type Port='entry'|'next'|'on_true'|'on_false'|'on_timeout';
export type Positions=Record<string,{x:number;y:number}>;
export function ports(n:WorkflowNode):{id:Port;label:string;target:string|undefined}[]{
 if(n.type==='end')return [];
 if(n.type==='condition')return [{id:'on_true',label:'Đúng',target:n.config.on_true},{id:'on_false',label:'Sai',target:n.config.on_false}];
 return [{id:'next',label:n.type==='wait_event'?'Có kết quả':'Tiếp',target:n.next},...(n.type==='wait_event'?[{id:'on_timeout' as const,label:'Hết hạn',target:n.on_timeout}]:[])];
}
export function connectGraph(g:WorkflowGraph,source:string,port:Port,target:string):WorkflowGraph{
 if(target&&!g.nodes.some(n=>n.key===target))throw new Error('Node đích không tồn tại.');
 if(source===triggerId){if(port!=='entry')throw new Error('Cổng không hợp lệ.');return {...g,entry_node:target};}
 const node=g.nodes.find(n=>n.key===source);if(!node||!ports(node).some(p=>p.id===port))throw new Error('Cổng không hợp lệ.');
 if(target){const seen=new Set<string>();const reaches=(key:string):boolean=>{if(key===source)return true;if(seen.has(key))return false;seen.add(key);const n=g.nodes.find(v=>v.key===key);return !!n&&workflowEdges(n).some(t=>t&&reaches(t));};if(reaches(target))throw new Error('Đường nối này tạo vòng lặp. Hãy chọn bước khác.');}
 return {...g,nodes:g.nodes.map(n=>n.key!==source?n:port==='on_true'||port==='on_false'?{...n,config:{...n.config,[port]:target}}:{...n,[port]:target})};
}
export function addCanvasNode(g:WorkflowGraph,type:WorkflowType){let i=1;while(g.nodes.some(n=>n.key===`step_${i}`))i++;const node:WorkflowNode={key:`step_${i}`,type,config:nodeDefaults(type)};return {...g,nodes:[...g.nodes,node]};}
export function autoLayout(g:WorkflowGraph):Positions{
 const keys=new Set(g.nodes.map(n=>n.key)),degree=new Map(g.nodes.map(n=>[n.key,0])),depth=new Map(g.nodes.map(n=>[n.key,1]));
 for(const n of g.nodes)for(const t of workflowEdges(n))if(t&&keys.has(t))degree.set(t,degree.get(t)!+1);
 const queue=g.nodes.filter(n=>degree.get(n.key)===0).map(n=>n.key);
 for(let i=0;i<queue.length;i++){const key=queue[i]!,node=g.nodes.find(n=>n.key===key)!;for(const t of workflowEdges(node)){if(!t||!keys.has(t))continue;depth.set(t,Math.max(depth.get(t)!,depth.get(key)!+1));degree.set(t,degree.get(t)!-1);if(degree.get(t)===0)queue.push(t);}}
 const lanes=new Map<string,number>(),priority=new Map<string,number>();
 for(const key of queue){const n=g.nodes.find(v=>v.key===key)!,targets=workflowEdges(n).filter((t):t is string=>!!t&&keys.has(t)),split=new Set(targets).size>1;
  targets.forEach((t,i)=>{const rank=split?2:1;if(rank>(priority.get(t)??0)){lanes.set(t,(lanes.get(key)??0)+(split?(i===0?-160:160):0));priority.set(t,rank);}});
 }
 const positions:Positions={[triggerId]:{x:0,y:0}},occupied=new Set<string>();for(const n of g.nodes){let x=lanes.get(n.key)??0;const y=depth.get(n.key)!*145;while(occupied.has(`${x}:${y}`))x+=320;occupied.add(`${x}:${y}`);positions[n.key]={x,y};}return positions;
}
export function readPositions(key:string,fallback:Positions):Positions{
 try{const raw=JSON.parse(sessionStorage.getItem(key)??'{}');const out={...fallback};for(const id of Object.keys(fallback)){const p=raw[id];if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<100000&&Math.abs(p.y)<100000)out[id]={x:p.x,y:p.y};}return out;}catch{return fallback;}
}
