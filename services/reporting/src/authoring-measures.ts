import {builtInExecutions,type ExecutionRegistry} from './query-registry.js';
import {createRegistry,digest,refKey} from './registry.js';
import type {Catalog,MetricRef} from './types.js';

export interface MeasureOption extends MetricRef {
 model:string;field?:string;operation:string;population:string;nullPolicy:'skip'|'propagate'|'ratio';
 numerator?:string;denominator?:string;multiplier?:number;
}
export function describeMeasures(catalog:Catalog,availableFields:string[],executions:ExecutionRegistry=builtInExecutions()):MeasureOption[]{
 if(catalog.models.every(m=>m.id.startsWith('sf_')))return catalog.models.flatMap(model=>catalog.metrics.filter(m=>m.inputs.every(f=>availableFields.includes(f))).map(m=>({id:m.id,version:m.version,model:refKey(model),operation:'stage_event',population:'ordered stage events',nullPolicy:'skip' as const})));
 const registry=createRegistry(catalog),available=new Set(availableFields),result:MeasureOption[]=[];
 for(const model of catalog.models){
  const registeredModel=executions.model(model);if(!registeredModel||registeredModel.descriptorHash!==digest(model))continue;
  const supported=(ref:MetricRef):boolean=>{
   const metric=catalog.metrics.find(m=>refKey(m)===refKey(ref)),execution=executions.metric(ref);
   if(!metric||!execution||execution.descriptorHash!==digest(metric)||!registry.metricInputs(ref).every(f=>available.has(f)))return false;
   if(execution.operator.op==='ratio')return metric.requires.every(supported);
   const op=execution.operator,spec=registeredModel.collections[op.collection];
   const inputs=[op.field,model.timeField,catalog.objects.find(o=>o.id===model.base)!.key];
   if(op.collection!=='base'){if(!spec)return false;inputs.push(spec.foreignKey,spec.baseKey,spec.timeField,catalog.objects.find(o=>o.id===spec.object)!.key);if(spec.where)inputs.push(spec.where.field);}
   const field=catalog.fields.find(f=>f.id===op.field);if(field?.type==='money')inputs.push(field.object+'.currency');
   return inputs.every(f=>available.has(f))&&metric.requires.every(supported);
  };
  for(const metric of catalog.metrics.filter(m=>m.models.includes(refKey(model)))){
   if(!supported(metric))continue;const op=executions.metric(metric)!.operator;
   const common={id:metric.id,version:metric.version,model:refKey(model)};
   if(op.op==='ratio'){result.push({...common,operation:'ratio',population:model.base,nullPolicy:'ratio',numerator:op.numerator,denominator:op.denominator,multiplier:op.multiplier});continue;}
   const spec=registeredModel.collections[op.collection];
   const population=op.collection==='base'?model.base:`${spec!.object} · ${spec!.where?spec!.where.field+' = '+spec!.where.value+' · ':''}${spec!.foreignKey} → ${spec!.baseKey} · ${spec!.timeField} ≤ asOf`;
   result.push({...common,field:op.field,operation:op.op==='distinct'?'count_distinct':op.op==='percentile'?'p'+op.percentile:op.op,population,
    nullPolicy:op.op==='sum'&&op.nullPolicy!=='skip'?'propagate':'skip'});
  }
 }
 return result;
}
