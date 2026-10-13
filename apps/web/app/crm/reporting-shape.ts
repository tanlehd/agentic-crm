import type {ReportDefinition} from './reporting-model';
// Draft storage deliberately accepts future definitions. Only open shapes this editor can preserve.
export function editableReport(value:unknown):value is ReportDefinition {
 const object=(x:unknown):x is Record<string,any>=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const strings=(x:unknown,max:number):x is string[]=>Array.isArray(x)&&x.length<=max&&x.every(v=>typeof v==='string');
 const ref=(x:unknown)=>object(x)&&typeof x.id==='string'&&Number.isSafeInteger(x.version)&&x.version>0&&Object.keys(x).every(k=>['id','version'].includes(k));
 const scalar=(x:unknown)=>typeof x==='string'||typeof x==='boolean'||typeof x==='number'&&Number.isSafeInteger(x);
 if(!object(value)||Object.keys(value).some(k=>!['schemaVersion','model','bindingId','relations','dimensions','metrics','filters','time','currency','visualization'].includes(k))||value.schemaVersion!==1||!ref(value.model)||typeof value.bindingId!=='string'||!strings(value.relations,5)||!strings(value.dimensions,4)||!Array.isArray(value.metrics)||value.metrics.length>8||!value.metrics.every(ref)||!Array.isArray(value.filters)||value.filters.length>20)return false;
 if(!value.filters.every(f=>object(f)&&typeof f.field==='string'&&['eq','in','gte','lte','is_null'].includes(f.op)&&Object.keys(f).every(k=>['field','op','value'].includes(k))&&(f.op==='is_null'?f.value===undefined:f.op==='in'?Array.isArray(f.value)&&f.value.every(scalar):scalar(f.value))))return false;
 const t=value.time,v=value.visualization;if(!object(t)||!['activity','acquisition_cohort'].includes(t.mode)||!['day','week','month'].includes(t.bucket)||!['from','to','asOf','timezone'].every(k=>typeof t[k]==='string')||Object.keys(t).some(k=>!['mode','bucket','from','to','asOf','timezone'].includes(k))||value.currency!==undefined&&typeof value.currency!=='string'||!object(v))return false;
 if(v.type==='table'||v.type==='kpi')return Object.keys(v).length===1;
 if(['bar','line','horizontal_bar','stacked_bar','area','pie','donut'].includes(v.type))return typeof v.x==='string'&&strings(v.y,8)&&(v.series===undefined||typeof v.series==='string')&&Object.keys(v).every(k=>['type','x','y','series'].includes(k));
 return v.type==='pivot'&&strings(v.rows,3)&&strings(v.columns,1)&&strings(v.values,8)&&Object.keys(v).every(k=>['type','rows','columns','values'].includes(k));
}
