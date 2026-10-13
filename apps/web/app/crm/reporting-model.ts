// Wire types for the versioned Reporting authoring/query API; no service implementation imports.
export interface ReportField {id:string;object:string;label:string;type:string;groupable:boolean;filterable:boolean;values?:string[]}
export interface ReportMetric {id:string;version:number;label:string;unit:string;formula:string;dimensions:string[];models:string[];aggregation:string;grain:string;inputs:string[];requires:{id:string;version:number}[]}
export interface ReportModel {id:string;version:number;base:string;timeField:string;mode:'activity'|'acquisition_cohort';periodBasis:string;relations:string[]}
export interface ReportRelation {id:string;from:string;to:string;cardinality:string}
export interface ReportCatalog {objects:{id:string;grain:string}[];fields:ReportField[];metrics:ReportMetric[];models:ReportModel[];relations:ReportRelation[]}
export interface ReportMeasureOption {id:string;version:number;model:string;field?:string;operation:string;population:string;nullPolicy:"skip"|"propagate"|"ratio";numerator?:string;denominator?:string;multiplier?:number}
export interface ReportSource {id:string;generation:string;historyFrom:string;observedThrough:string;catalog:ReportCatalog;availableFields:string[];measureOptions?:ReportMeasureOption[]}
export interface ReportFilter {field:string;op:'eq'|'in'|'gte'|'lte'|'is_null';value?:string|number|boolean|(string|number|boolean)[]}
export type ReportVisualization={type:'table'|'kpi'}|{type:'bar'|'line'|'horizontal_bar'|'stacked_bar'|'area'|'pie'|'donut';x:string;y:string[];series?:string}|{type:'pivot';rows:string[];columns:string[];values:string[]};
export const visualLabels:Record<ReportVisualization['type'],string>={table:'Bảng dữ liệu',kpi:'KPI card',bar:'Biểu đồ cột',horizontal_bar:'Bar ngang',stacked_bar:'Cột chồng',line:'Biểu đồ đường · Trend',area:'Biểu đồ miền · Area',pie:'Biểu đồ tròn · Pie',donut:'Vòng khuyên · Donut',pivot:'Pivot table'};
export interface ReportDefinition {schemaVersion:1;model:{id:string;version:number};bindingId:string;relations:string[];dimensions:string[];metrics:{id:string;version:number}[];filters:ReportFilter[];currency?:string;time:{mode:'activity'|'acquisition_cohort';from:string;to:string;asOf:string;timezone:string;bucket:'day'|'week'|'month'};visualization:ReportVisualization}
export interface ReportResult {environment:'mock';snapshotId:string;dimensions:string[];metrics:string[];rows:{dimensions:unknown[];metrics:Record<string,string|null>}[];totals:Record<string,string|null>;warnings:string[];pivot?:{rows:unknown[][];columns:unknown[][];cells:{row:number;column:number;metrics:Record<string,string|null>}[];rowTotals:Record<string,string|null>[];columnTotals:Record<string,string|null>[];grandTotal:Record<string,string|null>}}
export function initialReport(source:ReportSource,model=source.catalog.models[0]!):ReportDefinition {
 const metric=source.catalog.metrics.find(m=>m.models.includes(model.id+'@'+model.version));
 return {schemaVersion:1,model:{id:model.id,version:model.version},bindingId:source.id,relations:[],dimensions:[model.timeField],metrics:metric?[{id:metric.id,version:metric.version}]:[],filters:[],currency:'USD',time:{mode:model.mode,from:source.historyFrom,to:source.observedThrough,asOf:source.observedThrough,timezone:'UTC',bucket:'day'},visualization:{type:'table'}};
}
export function reportOptions(source:ReportSource,d:ReportDefinition){
 const model=source.catalog.models.find(m=>m.id===d.model.id&&m.version===d.model.version),objects=new Set(model?[model.base]:[]),relations=source.catalog.relations.filter(r=>model?.relations.includes(r.id)&&r.cardinality==='many_to_one');
 for(let n=0;n<relations.length;n++)for(const r of relations)if(d.relations.includes(r.id)&&objects.has(r.from))objects.add(r.to);
 const selectedMetrics=source.catalog.metrics.filter(m=>d.metrics.some(x=>x.id===m.id&&x.version===m.version));
 return {model,objects,relations:relations.filter(r=>objects.has(r.from)),fields:source.catalog.fields.filter(f=>objects.has(f.object)&&source.availableFields.includes(f.id)),dimensions:source.catalog.fields.filter(f=>objects.has(f.object)&&source.availableFields.includes(f.id)&&f.groupable&&selectedMetrics.every(m=>m.dimensions.includes(f.id))),metrics:source.catalog.metrics.filter(m=>m.models.includes(d.model.id+'@'+d.model.version)&&[...d.dimensions,...d.filters.map(f=>f.field)].every(f=>m.dimensions.includes(f))&&(!source.measureOptions||source.measureOptions.some(o=>o.id===m.id&&o.version===m.version&&o.model===d.model.id+'@'+d.model.version)))};
}
export function encodeReport(d:ReportDefinition,type:ReportVisualization['type'],column?:string,series?:string):ReportDefinition{
 const measures=d.metrics.map(m=>m.id);let visualization:ReportVisualization;
 if(type==='pivot')visualization={type,rows:d.dimensions.filter(f=>f!==column),columns:column?[column]:[],values:measures};
 else if(type!=='table'&&type!=='kpi')visualization={type,x:d.dimensions.find(f=>f!==series)??'',y:measures,...(series?{series}:{})};
 else visualization={type};return {...d,visualization};
}
export function typedFilter(field:ReportField,op:ReportFilter['op'],raw:string):ReportFilter{
 if(op==='is_null')return {field:field.id,op};
 const parse=(v:string):string|number|boolean=>{if(field.type==='integer'){const n=Number(v);if(!v.trim()||!Number.isSafeInteger(n))throw new Error('Nhập số nguyên hợp lệ.');return n;}if(field.type==='boolean'){if(!['true','false'].includes(v))throw new Error('Chọn true hoặc false.');return v==='true';}if(field.type==='datetime'&&!Number.isFinite(Date.parse(v)))throw new Error('Nhập thời gian ISO hợp lệ.');return v;};
 return {field:field.id,op,value:op==='in'?raw.split(',').map(s=>parse(s.trim())):parse(raw)};
}
export const exactValue=(v:unknown)=>v===null||v===undefined?'—':String(v).replace(/(\.\d*?[1-9])0+$|\.0+$/,'$1');
