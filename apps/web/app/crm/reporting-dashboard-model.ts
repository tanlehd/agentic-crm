import type {ReportDefinition} from './reporting-model';
import {editableReport} from './reporting-shape';
export interface DashboardWidget {id:string;title:string;note:string;generation:string;definition:ReportDefinition}
export interface DashboardDefinition {kind:'dashboard';schemaVersion:1;description:string;widgets:DashboardWidget[]}
export function editableDashboard(v:unknown):v is DashboardDefinition {
 const obj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const text=(x:unknown,max:number)=>typeof x==='string'&&x.length<=max;
 if(!obj(v)||Object.keys(v).some(k=>!['kind','schemaVersion','description','widgets'].includes(k))||v.kind!=='dashboard'||v.schemaVersion!==1||!text(v.description,4000)||!Array.isArray(v.widgets)||v.widgets.length>12)return false;
 return new Set(v.widgets.map(w=>obj(w)?w.id:null)).size===v.widgets.length&&v.widgets.every(w=>obj(w)&&Object.keys(w).length===5&&Object.keys(w).every(k=>['id','title','note','generation','definition'].includes(k))&&typeof w.id==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(w.id)&&text(w.title,160)&&typeof w.title==='string'&&!!w.title.trim()&&text(w.note,2000)&&typeof w.generation==='string'&&/^[a-f0-9]{64}$/.test(w.generation)&&editableReport(w.definition));
}
