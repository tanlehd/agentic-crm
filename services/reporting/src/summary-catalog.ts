import {catalogV1} from './catalog.js';
import type {MetricDescriptor} from './types.js';
import type {Operator} from './query-registry.js';

// Additive immutable metric refs. Never rewrite a descriptor in catalogV1.
export function summaryExtensions():{descriptor:MetricDescriptor;operator:Operator}[]{
 const origins=[{id:'won_value',field:'deal.amount',collection:'won'},{id:'first_response_p95',field:'session.first_response_seconds',collection:'base'},
  ...['base','age','region'].flatMap(profile=>['impressions','clicks','spend'].map(field=>({id:profile+'_'+field,field:'insights_'+profile+'.'+field,collection:'base'})))];
 return origins.flatMap(origin=>{
  const base=catalogV1.metrics.find(m=>m.id===origin.id)!;
  const operations:('count'|'avg'|'min'|'max'|'sum')[]=origin.id==='first_response_p95'?['count','avg','min','max','sum']:['count','avg','min','max'];
  return operations.map(op=>({descriptor:{...structuredClone(base),id:'summary_'+origin.id+'_'+op,label:op.toUpperCase()+' · '+origin.field,
   aggregation:op,unit:op==='count'?'count' as const:base.unit,formula:op+'('+origin.field+'; non-null; '+origin.collection+' population)'},
   operator:{op,collection:origin.collection,field:origin.field,nullPolicy:'skip' as const}}));
 });
}
