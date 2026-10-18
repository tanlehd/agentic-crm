import {digest} from './registry.js';
import {validateObservations,type ProjectionSnapshot,type Scalar} from './projection-contract.js';
import type {Definition,SemanticPlan} from './types.js';
import {QueryError,accessFingerprint,type QueryAccess,type QueryResult} from './query.js';
import {divide,format,rational} from './query-math.js';
type Row=Record<string,Scalar>;
export interface StageResult {kind:string;processVersion:string;mode:string;coverage:{full:number;partial:number;none:number};cohort:number;steps:{key:string;label:string;reached:number;pending:number|null;members:{id:string;recordId:string}[];pendingMembers:{id:string;recordId:string}[]}[]}
const fail=(condition:unknown,code:string)=>{if(!condition)throw new QueryError(code);};
const rate=(n:number,d:number)=>format(divide(rational(BigInt(n)),rational(BigInt(d)),100n),6);
const average=(values:number[])=>values.length?format(divide(rational(BigInt(values.reduce((a,b)=>a+b,0))),rational(BigInt(values.length*1000))),6):null;
export function executeStage(snapshot:ProjectionSnapshot,d:Definition,a:QueryAccess,plan:SemanticPlan,tick:()=>void):QueryResult{
 const cfg=d.stageFunnel!,kind=d.model.id.slice(3),from=Date.parse(d.time.from),to=Date.parse(d.time.to),asOf=Date.parse(d.time.asOf);
 fail(snapshot.manifest.adapterId==='native_stage_v1','STAGE_SOURCE_REQUIRED');
 fail(asOf===Date.parse(snapshot.manifest.observedThrough)&&from>=Date.parse(snapshot.manifest.historyFrom),'SNAPSHOT_ASOF_REQUIRED');
 fail(snapshot.records.length<=10000,'QUERY_ROW_LIMIT');
 for(const object of snapshot.manifest.catalog.objects){fail(a.objects.includes(object.id)&&a.rows[object.id]==='all','SOURCE_SCOPE_INCOMPLETE');}
 const rows:Record<string,Row[]>={sf_subject:[],sf_event:[],sf_stage:[]},ids=new Set<string>();
 for(const record of snapshot.records){tick();validateObservations(snapshot.manifest,[record]);fail(!record.deleted&&!ids.has(record.object+':'+record.id),'SNAPSHOT_NOT_CANONICAL');ids.add(record.object+':'+record.id);rows[record.object]!.push(Object.fromEntries(Object.entries(record.values).map(([k,v])=>[k.slice(record.object.length+1),v])));}
 const definitions=rows.sf_stage!.filter(r=>r.kind===kind&&r.process_version===cfg.processVersion);
 fail(definitions.length>0&&cfg.stages.every(key=>definitions.filter(r=>r.key===key).length===1),'STAGE_CONFIGURATION_UNAVAILABLE');
 const selected=cfg.stages.map(key=>({key,label:String(definitions.find(r=>r.key===key)!.label)})),known=new Set(definitions.map(r=>r.key));
 const buckets=new Map<string,Row[]>();for(const e of rows.sf_event!){tick();const list=buckets.get(String(e.subject_id))??[];list.push(e);buckets.set(String(e.subject_id),list);}
 const coverage={full:0,partial:0,none:0},reached=selected.map(()=>new Map<string,{id:string;recordId:string}>()),entries=selected.map(()=>0),exits=selected.map(()=>0),durations=selected.map(()=>[] as number[]),ages=selected.map(()=>[] as number[]);
 let invalid=0;
 const inWindow=(at:number)=>at>=from&&at<to&&at<=asOf;
 const matches=(s:Row)=>d.filters.every(f=>{const value=s[f.field.slice('sf_subject.'.length)];if(f.op==='is_null')return value===null;if(value===null)return false;if(f.op==='in')return (f.value as Scalar[]).includes(value!);return f.op==='eq'?value===f.value:f.op==='gte'?value!>=f.value!:value!<=f.value!;});
 for(const s of rows.sf_subject!){tick();if(s.kind!==kind||s.process_version!==cfg.processVersion&&s.coverage!=='none'||!matches(s))continue;
  const ev=(buckets.get(String(s.id))??[]).filter(e=>Date.parse(String(e.recorded_at))<=asOf&&Date.parse(String(e.occurred_at))<=asOf);
  fail(ev.every(e=>/^[1-9][0-9]{0,15}$/.test(String(e.sequence))),'STAGE_SEQUENCE_INVALID');
  ev.sort((x,y)=>BigInt(String(x.sequence))<BigInt(String(y.sequence))?-1:1);
  let valid=true,previous:Row|undefined;
  for(const e of ev){tick();if(!/^[1-9][0-9]{0,15}$/.test(String(e.sequence))||!known.has(e.to_stage)||e.from_stage!==null&&!known.has(e.from_stage)||e.from_stage===e.to_stage||Date.parse(String(e.occurred_at))>Date.parse(String(e.recorded_at)))valid=false;
   if(previous&&(BigInt(String(e.sequence))<=BigInt(String(previous.sequence))||e.from_stage!==previous.to_stage||Date.parse(String(e.occurred_at))<Date.parse(String(previous.occurred_at))||kind!=='conversation'&&BigInt(String(e.sequence))!==BigInt(String(previous.sequence))+1n))valid=false;
   previous=e;
  }
  if(previous&&previous.to_stage!==s.stage)valid=false;
  const full=s.coverage==='full'&&ev.length>0&&ev[0]!.from_stage===null&&ev[0]!.sequence==='1'&&valid;
  if(!valid){invalid++;coverage.partial++;continue;}
  if(full)coverage.full++;else if(ev.length)coverage.partial++;else coverage.none++;
  // Movement counts use all observed valid transitions, including partial history.
  let open:{key:string;at:number}|null=null;
  for(const e of ev){tick();const at=Date.parse(String(e.occurred_at)),enter=cfg.stages.indexOf(String(e.to_stage)),exit=cfg.stages.indexOf(String(e.from_stage));
   if(inWindow(at)){if(enter>=0)entries[enter]!++;if(exit>=0)exits[exit]!++;if(open&&open.key===e.from_stage&&exit>=0)durations[exit]!.push(at-open.at);}
   open={key:String(e.to_stage),at};
  }
  if(open&&s.closed_at===null&&!['won','lost','disqualified'].includes(open.key)){const i=cfg.stages.indexOf(open.key);if(i>=0)ages[i]!.push(asOf-open.at);}
  if(!full)continue;
  const first=ev.findIndex(e=>e.to_stage===cfg.stages[0]&&inWindow(Date.parse(String(e.occurred_at))));if(first<0)continue;
  let cursor=first;const member={id:String(s.id),recordId:String(s.record_id)};
  for(let step=0;step<cfg.stages.length;step++){
   const index=ev.findIndex((e,i)=>i>=cursor&&e.to_stage===cfg.stages[step]&&(cfg.mode==='entry_cohort'||inWindow(Date.parse(String(e.occurred_at)))));
   if(index<0)break;reached[step]!.set(member.id,member);cursor=index+1;
  }
 }
 const cohort=reached[0]!.size,steps=selected.map((s,i)=>{const pendingMembers=i===selected.length-1?[]:[...reached[i]!.values()].filter(m=>!reached[i+1]!.has(m.id));return {...s,reached:reached[i]!.size,pending:i===selected.length-1?null:pendingMembers.length,members:[...reached[i]!.values()],pendingMembers};});
 const allRows=steps.map((s,i)=>({dimensions:[s.label],metrics:{sf_count:String(s.reached),sf_previous_rate:rate(s.reached,i?steps[i-1]!.reached:cohort),sf_overall_rate:rate(s.reached,cohort),sf_entries:String(entries[i]),sf_exits:String(exits[i]),sf_duration:average(durations[i]!),sf_age:average(ages[i]!),sf_pending:s.pending===null?null:String(s.pending)}}));
 const totals:Record<string,string|null>={sf_count:String(cohort),sf_previous_rate:null,sf_overall_rate:rate(steps.at(-1)!.reached,cohort),sf_entries:String(entries.reduce((a,b)=>a+b,0)),sf_exits:String(exits.reduce((a,b)=>a+b,0)),sf_duration:average(durations.flat()),sf_age:average(ages.flat()),sf_pending:String(cohort-steps.at(-1)!.reached)};
 tick();return {environment:'connected',asOf:d.time.asOf,snapshotId:snapshot.manifest.snapshotId,catalogHash:snapshot.manifest.catalogHash,fingerprint:digest({semantic:plan.fingerprint,policy:accessFingerprint(a)}),dimensions:d.dimensions,metrics:d.metrics.map(m=>m.id),rows:allRows.map(r=>({dimensions:r.dimensions,metrics:Object.fromEntries(d.metrics.map(m=>[m.id,r.metrics[m.id as keyof typeof r.metrics]??null]))})),totals:Object.fromEntries(d.metrics.map(m=>[m.id,totals[m.id]??null])),warnings:[...(coverage.partial||coverage.none?['STAGE_HISTORY_INCOMPLETE']:[]),...(invalid?['STAGE_SEQUENCE_INCOMPLETE']:[])],stage:{kind,processVersion:cfg.processVersion,mode:cfg.mode,coverage,cohort,steps}};
}
