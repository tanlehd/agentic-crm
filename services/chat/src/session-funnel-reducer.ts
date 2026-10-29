// Pure Chat-owned reduction of already authorized facts. Baseline parity is retained during extraction.
export interface FunnelSession {id:string;coverage:'full'|'partial'|'none';process_version:string}
export interface MilestoneFact {id:string;session_id:string;need_id:string;milestone_key:string;kind:'record'|'replace'|'retract';supersedes_id:string|null;occurred_at:string;recorded_at:string}
export function effectiveFacts(facts:MilestoneFact[],asOf:string){
 const cutoff=Date.parse(asOf),known=facts.filter(f=>Date.parse(f.recorded_at)<=cutoff),superseded=new Set(known.flatMap(f=>f.supersedes_id?[f.supersedes_id]:[]));
 return known.filter(f=>f.kind!=='retract'&&!superseded.has(f.id)&&Date.parse(f.occurred_at)<=cutoff);
}
export function sessionFunnel(sessions:FunnelSession[],facts:MilestoneFact[],steps:{key:string;label:string}[],version:string,asOf:string){
 const coverage={full:0,partial:0,none:0,other_version:0},covered=new Set<string>();
 for(const s of sessions){if(s.coverage==='none')coverage.none++;else if(s.process_version!==version)coverage.other_version++;else {coverage[s.coverage]++;if(s.coverage==='full')covered.add(s.id);}}
 const subjects=new Map<string,MilestoneFact[]>();
 for(const fact of effectiveFacts(facts,asOf)){if(!covered.has(fact.session_id))continue;const key=fact.session_id+':'+fact.need_id;const values=subjects.get(key)??[];values.push(fact);subjects.set(key,values);}
 const reached=steps.map(()=>new Set<string>());
 for(const values of subjects.values()){
  values.sort((a,b)=>Date.parse(a.occurred_at)-Date.parse(b.occurred_at));let earliest=-Infinity;
  for(let i=0;i<steps.length;i++){const match=values.find(f=>f.milestone_key===steps[i]!.key&&Date.parse(f.occurred_at)>=earliest);if(!match)break;earliest=Date.parse(match.occurred_at);reached[i]!.add(match.session_id);}
 }
 const rate=(n:number,d:number)=>d===0?null:n/d;
 return {sessions:sessions.length,denominator:covered.size,coverage,steps:steps.map((step,i)=>({...step,sessions:reached[i]!.size,cohort_rate:rate(reached[i]!.size,covered.size),previous_rate:rate(reached[i]!.size,i===0?covered.size:reached[i-1]!.size)}))};
}
