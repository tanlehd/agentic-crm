import {compileDefinition} from './compiler.js';
import {canonical,createRegistry,digest,refKey} from './registry.js';
import {validateManifest,validateObservations,type Observation,type ProjectionSnapshot,type Scalar} from './projection-contract.js';
import type {AccessContext,Definition,MetricDescriptor,MetricRef} from './types.js';
import {builtInExecutions,ExecutionRegistry,type CollectionSpec, type MetricExecution} from './query-registry.js';
import {add,decimal,divide,format,rational,sum,type Rational} from './query-math.js';
export class QueryError extends Error {constructor(readonly code:string){super(code);}}
export interface QueryAccess extends AccessContext {rows:Record<string,'all'|readonly string[]>;expiresAt:number}
export interface QueryLimits {maxRows?:number;maxGroups?:number;maxCells?:number;maxOperations?:number;timeoutMs?:number;signal?:AbortSignal;now?:()=>number}
export interface QueryRow {dimensions:Scalar[];metrics:Record<string,string|null>}
export interface QueryResult {environment:'mock';snapshotId:string;catalogHash:string;fingerprint:string;dimensions:string[];metrics:string[];rows:QueryRow[];totals:Record<string,string|null>;warnings:string[];pivot?:{rows:Scalar[][];columns:Scalar[][];cells:{row:number;column:number;metrics:Record<string,string|null>}[];rowTotals:Record<string,string|null>[];columnTotals:Record<string,string|null>[];grandTotal:Record<string,string|null>}}
const requireQuery=(ok:unknown,code:string):void=>{if(!ok)throw new QueryError(code);};
export function accessFingerprint(a:QueryAccess){return digest({tenant:a.tenantId,principal:a.principalId,revision:a.authRevision,scope:a.scopeFingerprint,permissions:a.permissions,objects:a.objects,fields:a.fields,bindings:a.bindings,rows:a.rows});}
export function assertQueryAccess(a:QueryAccess,now=Date.now()){requireQuery(!!a&&a.permissions.includes('report.run')&&Number.isFinite(a.expiresAt)&&a.expiresAt>now&&!!a.rows,'QUERY_FORBIDDEN');}
class Budget {
 private operations=0;private readonly end:number;readonly now:()=>number;
 constructor(private readonly limits:QueryLimits){this.now=limits.now??Date.now;this.end=this.now()+Math.min(limits.timeoutMs??3000,3000);}
 tick(amount=1){this.operations+=amount;requireQuery(!this.limits.signal?.aborted,'QUERY_CANCELLED');requireQuery(this.now()<this.end,'QUERY_TIMEOUT');requireQuery(this.operations<=Math.min(this.limits.maxOperations??2000000,2000000),'QUERY_BUDGET_EXCEEDED');}
}
function bucket(value:Scalar,definition:Definition):Scalar{
 if(value===null)return null;const parts=new Intl.DateTimeFormat('en-CA',{timeZone:definition.time.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(String(value)));const part=(name:string)=>parts.find(p=>p.type===name)!.value;
 const date=`${part('year')}-${part('month')}-${part('day')}`;if(definition.time.bucket==='month')return date.slice(0,7);if(definition.time.bucket==='day')return date;const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);
}
function compare(a:Scalar,b:Scalar,type:string):number{
 if(a===b)return 0;if(a===null)return -1;if(b===null)return 1;
 if(type==='money'||type==='decimal'){const x=decimal(a as string),y=decimal(b as string),delta=x.n*y.d-y.n*x.d;return delta<0n?-1:delta>0n?1:0;}
 if(type==='datetime')return Math.sign(Date.parse(String(a))-Date.parse(String(b)));
 return a<b?-1:1;
}
function selectedTupleKey(values:Scalar[]){return canonical(values);}
export function executeQuery(snapshot:ProjectionSnapshot,input:unknown,access:QueryAccess,executions:ExecutionRegistry=builtInExecutions(),limits:QueryLimits={}):QueryResult{
 const budget=new Budget(limits);budget.tick();assertQueryAccess(access,budget.now());
 requireQuery(snapshot.binding.environment==='mock'&&snapshot.manifest.environment==='mock'&&snapshot.binding.tenantId===access.tenantId,'QUERY_FORBIDDEN');
 validateManifest({tenantId:access.tenantId,bindingId:snapshot.binding.id,adapterId:'synthetic_g1_v1',environment:'mock'},snapshot.manifest);
 requireQuery(snapshot.binding.revision===snapshot.manifest.snapshotId&&digest(snapshot.manifest.catalog)===snapshot.manifest.catalogHash,'SNAPSHOT_MISMATCH');
 const registry=createRegistry(snapshot.manifest.catalog),catalog=registry.snapshot();
 const compiled=compileDefinition(registry,input,{...access,permissions:[...access.permissions,'report.design']},snapshot.binding);if(!compiled.ok)throw new QueryError(compiled.issues.some(i=>i.code==='REFERENCE_UNAVAILABLE')?'QUERY_FORBIDDEN':compiled.issues[0]!.code);
 const d=compiled.plan.definition,model=catalog.models.find(m=>refKey(m)===refKey(d.model))!,modelExecution=executions.model(d.model);
 requireQuery(modelExecution&&modelExecution.descriptorHash===digest(model),'EXECUTION_UNSUPPORTED');
 requireQuery(Date.parse(d.time.asOf)===Date.parse(snapshot.manifest.observedThrough)&&Date.parse(d.time.from)>=Date.parse(snapshot.manifest.historyFrom),'SNAPSHOT_ASOF_REQUIRED');
 requireQuery(snapshot.records.length<=Math.min(limits.maxRows??10000,10000),'QUERY_ROW_LIMIT');
 const required=new Set(compiled.plan.requiredFields),metricExecutions=new Map<string,{descriptor:MetricDescriptor;execution:MetricExecution}>(),collections=new Map<string,CollectionSpec>();
 const walk=(ref:MetricRef)=>{const key=refKey(ref);if(metricExecutions.has(key))return;const m=catalog.metrics.find(m=>refKey(m)===key),e=executions.metric(ref);requireQuery(m&&e&&e.descriptorHash===digest(m),'EXECUTION_UNSUPPORTED');metricExecutions.set(key,{descriptor:m!,execution:e!});for(const dep of m!.requires)walk(dep);const op=e!.operator;
  if(op.op!=='ratio'){required.add(op.field);if(op.collection!=='base'){const spec=modelExecution!.collections[op.collection];requireQuery(spec,'EXECUTION_UNSUPPORTED');collections.set(op.collection,spec!);for(const f of [spec!.foreignKey,spec!.baseKey,spec!.timeField,objectKey(spec!.object),...(spec!.where?[spec!.where.field]:[])])required.add(f);}
   if(registry.field(op.field)?.type==='money')required.add(op.field.split('.')[0]+'.currency');
  }
 };
 const objectKey=(object:string)=>catalog.objects.find(o=>o.id===object)!.key;
 for(const m of d.metrics)walk(m);required.add(objectKey(model.base));required.add(model.timeField);
 const neededObjects=new Set<string>();for(const id of required){const f=registry.field(id);requireQuery(f&&access.objects.includes(f.object)&&access.fields.includes(id)&&snapshot.binding.availableFields.includes(id),'QUERY_FORBIDDEN');neededObjects.add(f!.object);}
 for(const object of neededObjects){requireQuery(access.fields.includes(objectKey(object))&&snapshot.binding.availableFields.includes(objectKey(object)),'QUERY_FORBIDDEN');const scope=access.rows[object];requireQuery(scope==='all'||Array.isArray(scope),'QUERY_FORBIDDEN');if(object!==model.base)requireQuery(scope==='all','SOURCE_SCOPE_INCOMPLETE');}
 const indexes=new Map<string,Map<string,Observation>>();for(const record of snapshot.records){budget.tick();validateObservations(snapshot.manifest,[record]);}
 for(const row of snapshot.records){budget.tick();requireQuery(!row.deleted,'SNAPSHOT_NOT_CANONICAL');let index=indexes.get(row.object);if(!index){index=new Map();indexes.set(row.object,index);}requireQuery(!index.has(row.id),'SNAPSHOT_NOT_CANONICAL');index.set(row.id,row);}
 const warnings=new Set<string>(),scope=access.rows[model.base],allowed=scope==='all'?null:new Set(scope as readonly string[]),base=[...(indexes.get(model.base)?.values()??[])].filter(r=>!allowed||allowed.has(r.id));
 const relations=d.relations.map(id=>catalog.relations.find(r=>r.id===id)!);
 const relationIndexes=new Map<string,Map<string,Observation>>();for(const relation of relations){const index=new Map<string,Observation>();for(const row of indexes.get(relation.to)?.values()??[]){budget.tick();const value=row.values[relation.toKey];if(value===null)continue;const key=canonical(value);requireQuery(!index.has(key),'RELATION_NOT_UNIQUE');index.set(key,row);}relationIndexes.set(relation.id,index);}
 type Fact={base:Observation;values:Record<string,Scalar>;dimensions:Scalar[]};const facts:Fact[]=[];
 for(const row of base){budget.tick();const time=row.values[model.timeField];if(time===null||time===undefined){warnings.add('MISSING_TIME');continue;}if(Date.parse(String(time))<Date.parse(d.time.from)||Date.parse(String(time))>=Date.parse(d.time.to))continue;
  const joined=new Map<string,Observation|undefined>([[model.base,row]]),pending=[...relations];const values={...row.values};while(pending.length){budget.tick();const i=pending.findIndex(r=>joined.has(r.from));requireQuery(i>=0,'UNSAFE_RELATION');const relation=pending.splice(i,1)[0]!,parent=joined.get(relation.from),id=parent?.values[relation.fromKey],target=id===null||id===undefined?undefined:relationIndexes.get(relation.id)?.get(canonical(id));joined.set(relation.to,target);if(id!==null&&id!==undefined&&!target)warnings.add('UNRESOLVED_REFERENCE');for(const f of catalog.fields.filter(f=>f.object===relation.to))values[f.id]=target?.values[f.id]??null;}
  const matches=d.filters.every(filter=>{const value=values[filter.field]??null,type=registry.field(filter.field)!.type;if(filter.op==='is_null')return value===null;if(value===null)return false;if(filter.op==='in')return (filter.value as Scalar[]).some(x=>compare(value,x,type)===0);const comparison=compare(value,filter.value as Scalar,type);return filter.op==='eq'?comparison===0:filter.op==='gte'?comparison>=0:comparison<=0;});if(!matches)continue;
  facts.push({base:row,values,dimensions:d.dimensions.map(id=>registry.field(id)!.type==='datetime'?bucket(values[id]??null,d):values[id]??null)});
 }
 const childIndexes=new Map<string,Map<string,Observation[]>>();for(const [name,spec]of collections){const indexed=new Map<string,Observation[]>();for(const row of indexes.get(spec.object)?.values()??[]){budget.tick();if(spec.where&&row.values[spec.where.field]!==spec.where.value)continue;const time=row.values[spec.timeField];if(time===null){throw new QueryError('MISSING_OUTCOME_TIME');}if(Date.parse(String(time))>Date.parse(d.time.asOf))continue;const id=row.values[spec.foreignKey];if(id===null)continue;const key=String(id);const rows=indexed.get(key)??[];rows.push(row);indexed.set(key,rows);}childIndexes.set(name,indexed);}
 const aggregate=(population:Fact[])=>{
  const cache=new Map<string,Rational|null>(),collectionCache=new Map<string,Observation[]>();collectionCache.set('base',population.map(f=>f.base));
  const getCollection=(name:string)=>{if(!collectionCache.has(name)){const spec=collections.get(name)!;const unique=new Map<string,Observation>();for(const f of population){budget.tick();for(const r of childIndexes.get(name)?.get(String(f.base.values[spec.baseKey]))??[])unique.set(r.id,r);}collectionCache.set(name,[...unique.values()]);}return collectionCache.get(name)!;};
  const calculate=(key:string):Rational|null=>{budget.tick();if(cache.has(key))return cache.get(key)!;const registered=metricExecutions.get(key);requireQuery(registered,'EXECUTION_UNSUPPORTED');const op=registered!.execution.operator;let value:Rational|null;
   if(op.op==='ratio'){const numerator=calculate(op.numerator),denominator=calculate(op.denominator);value=numerator===null||denominator===null?null:divide(numerator,denominator,BigInt(op.multiplier));}
   else {const rows=getCollection(op.collection);const values=rows.map(r=>r.values[op.field]??null);budget.tick(rows.length);
    if(op.op==='distinct'){value=rational(BigInt(new Set(values.filter(v=>v!==null).map(v=>canonical(v))).size));}
    else if(op.op==='count'){value=rational(BigInt(values.filter(v=>v!==null).length));}
    else if(op.op==='percentile'){const numbers=values.filter(v=>v!==null);requireQuery(numbers.every(v=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0),'INVALID_SOURCE_VALUE');const sorted=(numbers as number[]).sort((a,b)=>a-b);if(!sorted.length)value=null;else{const position=BigInt(sorted.length-1)*BigInt(op.percentile!),lower=Number(position/100n),remainder=position%100n;value=add(rational(BigInt(sorted[lower]!)),rational(BigInt((sorted[lower+1]??sorted[lower]!) - sorted[lower]!)*remainder,100n));}}
    else {const field=registry.field(op.field)!;requireQuery(['integer','decimal','money'].includes(field.type),'EXECUTION_UNSUPPORTED');if(field.type==='money')for(const row of rows)requireQuery(row.values[field.object+'.currency']===d.currency,'CURRENCY_MISMATCH');if(op.op==='sum'&&op.nullPolicy!=='skip'&&values.some(v=>v===null)){warnings.add('INCOMPLETE_METRIC_INPUT');value=null;}else {const present=values.filter(v=>v!==null);if(field.type==='integer')requireQuery(present.every(v=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0),'INVALID_SOURCE_VALUE');const numbers=present.map(v=>decimal(v as string|number));if(op.op==='avg')value=divide(sum(numbers),rational(BigInt(numbers.length)));else if(op.op==='min'||op.op==='max')value=numbers.reduce<Rational|null>((chosen,n)=>chosen===null||(op.op==='min'?n.n*chosen.d<chosen.n*n.d:n.n*chosen.d>chosen.n*n.d)?n:chosen,null);else value=sum(numbers);}}
   }cache.set(key,value);return value;
  };
  return Object.fromEntries(d.metrics.map(ref=>{const m=metricExecutions.get(refKey(ref))!.descriptor;return [ref.id,format(calculate(refKey(ref)),m.unit==='count'&&m.aggregation!=='avg'?0:6)];}));
 };
 const group=(population:Fact[],positions:number[])=>{const groups=new Map<string,{tuple:Scalar[];facts:Fact[]}>();for(const fact of population){budget.tick();const tuple=positions.map(p=>fact.dimensions[p]!),key=selectedTupleKey(tuple);const g=groups.get(key)??{tuple,facts:[]};g.facts.push(fact);groups.set(key,g);requireQuery(groups.size<=Math.min(limits.maxGroups??500,500),'QUERY_GROUP_LIMIT');}if(!positions.length&&!groups.size)groups.set('[]',{tuple:[],facts:[]});return [...groups.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([,g])=>g);};
 const groups=group(facts,d.dimensions.map((_,i)=>i)),totals=aggregate(facts);const result:QueryResult={environment:'mock',snapshotId:snapshot.manifest.snapshotId,catalogHash:snapshot.manifest.catalogHash,fingerprint:digest({semantic:compiled.plan.fingerprint,policy:accessFingerprint(access)}),dimensions:d.dimensions,metrics:d.metrics.map(m=>m.id),rows:groups.map(g=>({dimensions:g.tuple,metrics:aggregate(g.facts)})),totals,warnings:[]};
 if(d.visualization.type==='pivot'){const rowPositions=d.visualization.rows.map(f=>d.dimensions.indexOf(f)),columnPositions=d.visualization.columns.map(f=>d.dimensions.indexOf(f)),rowGroups=group(facts,rowPositions),columnGroups=group(facts,columnPositions);requireQuery(rowGroups.length*columnGroups.length*d.metrics.length<=Math.min(limits.maxCells??5000,5000),'PIVOT_CELL_LIMIT');const rowIndex=new Map(rowGroups.map((g,i)=>[selectedTupleKey(g.tuple),i])),columnIndex=new Map(columnGroups.map((g,i)=>[selectedTupleKey(g.tuple),i]));result.pivot={rows:rowGroups.map(g=>g.tuple),columns:columnGroups.map(g=>g.tuple),cells:groups.map(g=>({row:rowIndex.get(selectedTupleKey(rowPositions.map(p=>g.tuple[p]!)))!,column:columnIndex.get(selectedTupleKey(columnPositions.map(p=>g.tuple[p]!)))!,metrics:aggregate(g.facts)})),rowTotals:rowGroups.map(g=>aggregate(g.facts)),columnTotals:columnGroups.map(g=>aggregate(g.facts)),grandTotal:totals};}
 result.warnings=[...warnings].sort();budget.tick();assertQueryAccess(access,budget.now());requireQuery(Buffer.byteLength(JSON.stringify(result))<=2097152,'QUERY_RESULT_LIMIT');return result;
}
export function aggregateCsv(result:QueryResult):string{
 const cell=(value:Scalar)=>{let text=value===null?'':String(value);if(/^[\s]*[=+\-@]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
 const lines=[[...result.dimensions,...result.metrics],...result.rows.map(row=>[...row.dimensions,...result.metrics.map(id=>row.metrics[id]??null)])];return lines.map(line=>line.map(cell).join(',')).join('\r\n')+'\r\n';
}
