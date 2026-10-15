import { describe,it,expect } from 'vitest';
import { sessionFunnel,effectiveFacts,type MilestoneFact } from '../src/modules/reporting/session-funnel.js';
import { processDefinition,defaultProcess } from '../src/modules/conversation/session-process-storage.js';
import { instant } from '../src/modules/conversation/session-progress.js';
const steps=[{key:'a',label:'A'},{key:'b',label:'B'},{key:'c',label:'C'}],asOf='2026-10-14T10:00:00.000Z';
const sessions=[{id:'s',coverage:'full' as const,process_version:'1'}];
function fact(id:string,need:string,key:string,time=1,extra:Partial<MilestoneFact>={}):MilestoneFact{return {id,session_id:'s',need_id:need,milestone_key:key,kind:'record',supersedes_id:null,occurred_at:`2026-10-14T09:00:0${time}.000Z`,recorded_at:'2026-10-14T09:01:00.000Z',...extra};}
describe('same need session funnel',()=>{
 it('does not combine distinct needs or repeat sessions',()=>{const r=sessionFunnel(sessions,[fact('1','n1','a'),fact('2','n2','b',2),fact('3','n1','a')],steps,'1',asOf);expect(r.steps.map(s=>s.sessions)).toEqual([1,0,0]);});
 it('finds ordered prefixes after early out-of-order evidence and repeated subjects',()=>{const facts=[fact('1','n','b'),fact('2','n','a',2),fact('3','n','b',3),fact('4','n','c',3),fact('5','other','a',2),fact('6','other','b',3)];expect(sessionFunnel(sessions,facts,steps,'1',asOf).steps.map(s=>s.sessions)).toEqual([1,1,1]);});
 it('corrects append-only by recorded cutoff without resurrecting replaced evidence',()=>{const a=fact('1','n','a'),replacement=fact('2','n','a',2,{kind:'replace',supersedes_id:'1',recorded_at:'2026-10-14T10:01:00.000Z'});expect(effectiveFacts([a,replacement],asOf).map(f=>f.id)).toEqual(['1']);expect(effectiveFacts([a,replacement], '2026-10-14T10:02:00.000Z').map(f=>f.id)).toEqual(['2']);const future={...replacement,occurred_at:'2026-10-14T11:00:00.000Z'};expect(effectiveFacts([a,future],'2026-10-14T10:02:00.000Z')).toEqual([]);});
 it('supports retracting a replacement and excludes late records',()=>{const a=fact('1','n','a'),b=fact('2','n','a',2,{kind:'replace',supersedes_id:'1'}),c=fact('3','n','a',2,{kind:'retract',supersedes_id:'2'}),late=fact('4','n','a',1,{recorded_at:'2026-10-15T00:00:00.000Z'});expect(effectiveFacts([a,b,c,late],asOf)).toEqual([]);});
 it('reports coverage and null zero denominators explicitly',()=>{const r=sessionFunnel([{id:'1',coverage:'partial',process_version:'1'},{id:'2',coverage:'none',process_version:''},{id:'3',coverage:'full',process_version:'2'}],[],steps,'1',asOf);expect(r.coverage).toEqual({full:0,partial:1,none:1,other_version:1});expect(r.denominator).toBe(0);expect(r.steps[0]?.cohort_rate).toBeNull();});
});
describe('immutable config boundary',()=>{
 it('allows reordered and configurable labels',()=>{expect(processDefinition(defaultProcess)).toEqual(defaultProcess);});
 it.each(['won','lost','consent','revenue'])('rejects authoritative outcome key %s',key=>expect(()=>processDefinition({...defaultProcess,milestones:[{key,label:'Outcome'}]})).toThrow());
 it('rejects duplicate keys, unexpected fields, empty and oversized arrays',()=>{for(const input of [{...defaultProcess,stages:[]},{...defaultProcess,extra:true},{...defaultProcess,stages:[defaultProcess.stages[0],defaultProcess.stages[0]]},{...defaultProcess,milestones:Array(13).fill({key:'a',label:'A'})}])expect(()=>processDefinition(input)).toThrow();});
 it('requires canonical timestamps',()=>{for(const value of ['2026-02-30T00:00:00.000Z','today','2026-10-14',null])expect(()=>instant(value)).toThrow();expect(instant(asOf)).toBe(asOf);});
});
