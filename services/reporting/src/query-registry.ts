import {conversionCatalog} from './conversion-catalog.js';
import {operationsCatalog} from './operations-catalog.js';
import {summaryExtensions} from './summary-catalog.js';
import {inboxDemoExtensions} from './inbox-demo.js';
import {catalogV1} from './catalog.js';
import {digest,refKey} from './registry.js';
import type {Catalog,MetricRef} from './types.js';
export interface CollectionSpec {object:string;foreignKey:string;baseKey:string;timeField:string;where?:{field:string;value:string}}
export type Operator={op:'distinct'|'count'|'sum'|'avg'|'min'|'max'|'percentile';collection:string;field:string;percentile?:number;nullPolicy?:'skip'}|{op:'ratio';numerator:string;denominator:string;multiplier:number};
export interface MetricExecution {descriptorHash:string;operator:Operator}
export interface ModelExecution {descriptorHash:string;collections:Record<string,CollectionSpec>}
export class ExecutionRegistry {
 private readonly metrics=new Map<string,MetricExecution>();private readonly models=new Map<string,ModelExecution>();
 registerModel(catalog:Catalog,ref:MetricRef,collections:Record<string,CollectionSpec>={}){const descriptor=catalog.models.find(m=>refKey(m)===refKey(ref));if(!descriptor||this.models.has(refKey(ref)))throw new Error('EXECUTION_REGISTRATION_INVALID');this.models.set(refKey(ref),structuredClone({descriptorHash:digest(descriptor),collections}));return this;}
 registerMetric(catalog:Catalog,ref:MetricRef,operator:Operator){const descriptor=catalog.metrics.find(m=>refKey(m)===refKey(ref));if(!descriptor||this.metrics.has(refKey(ref)))throw new Error('EXECUTION_REGISTRATION_INVALID');if(operator.op==='ratio'&&(!descriptor.requires.some(r=>refKey(r)===operator.numerator)||!descriptor.requires.some(r=>refKey(r)===operator.denominator)||!Number.isSafeInteger(operator.multiplier)))throw new Error('EXECUTION_REGISTRATION_INVALID');if(operator.op==='percentile'&&(!Number.isInteger(operator.percentile)||operator.percentile!<0||operator.percentile!>100))throw new Error('EXECUTION_REGISTRATION_INVALID');this.metrics.set(refKey(ref),structuredClone({descriptorHash:digest(descriptor),operator}));return this;}
 model(ref:MetricRef){const m=this.models.get(refKey(ref));return m?structuredClone(m):undefined;}
 metric(ref:MetricRef){const m=this.metrics.get(refKey(ref));return m?structuredClone(m):undefined;}
}
export function builtInExecutions(){
 const registry=new ExecutionRegistry();for(const model of catalogV1.models)registry.registerModel(catalogV1,model,model.id==='acquisition'?{leads:{object:'lead',foreignKey:'lead.origin_session_id',baseKey:'session.id',timeField:'lead.created_at'},won:{object:'deal',foreignKey:'deal.origin_session_id',baseKey:'session.id',timeField:'deal.closed_at',where:{field:'deal.stage',value:'won'}}}:{});
 const simple:Record<string,Operator>={sessions_opened:{op:'distinct',collection:'base',field:'session.id'},engaged_contacts:{op:'distinct',collection:'base',field:'session.contact_id'},crm_leads:{op:'distinct',collection:'leads',field:'lead.id'},sessions_with_lead:{op:'distinct',collection:'leads',field:'lead.origin_session_id'},session_to_lead_rate:{op:'ratio',numerator:'sessions_with_lead@1',denominator:'sessions_opened@1',multiplier:100},deals_won:{op:'distinct',collection:'won',field:'deal.id'},won_value:{op:'sum',collection:'won',field:'deal.amount'},first_response_p95:{op:'percentile',collection:'base',field:'session.first_response_seconds',percentile:95}};
 for(const [id,operator]of Object.entries(simple))registry.registerMetric(catalogV1,{id,version:1},operator);
 for(const profile of ['base','age','region']){for(const field of ['impressions','clicks','spend'])registry.registerMetric(catalogV1,{id:profile+'_'+field,version:1},{op:'sum',collection:'base',field:'insights_'+profile+'.'+field});for(const [id,numerator,denominator,multiplier]of [['ctr','clicks','impressions',100],['cpc','spend','clicks',1],['cpm','spend','impressions',1000]] as const)registry.registerMetric(catalogV1,{id:profile+'_'+id,version:1},{op:'ratio',numerator:`${profile}_${numerator}@1`,denominator:`${profile}_${denominator}@1`,multiplier});}
 for(const item of summaryExtensions())registry.registerMetric({...catalogV1,metrics:[item.descriptor]},item.descriptor,item.operator);
 const demo=inboxDemoExtensions();for(const model of demo.catalog.models)registry.registerModel(demo.catalog,model);for(const {descriptor,operator}of demo.operators)registry.registerMetric(demo.catalog,descriptor,operator);
 const operations=operationsCatalog();for(const model of operations.catalog.models)registry.registerModel(operations.catalog,model);for(const {descriptor,operator}of operations.operators)registry.registerMetric(operations.catalog,descriptor,operator);
 const conversion=conversionCatalog();for(const model of conversion.catalog.models)registry.registerModel(conversion.catalog,model,conversion.collections[model.id]);for(const {descriptor,operator}of conversion.operators)registry.registerMetric(conversion.catalog,descriptor,operator);
 return registry;
}
