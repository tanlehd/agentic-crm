import {describe,it,expect} from 'vitest';
import {executeQuery} from '../src/query.js';
import {describeMeasures} from '../src/authoring-measures.js';
import {syntheticCatalog,syntheticRows} from '../src/synthetic-source.js';
import {catalogV1} from '../src/catalog.js';
import {access,acquisition,marketing,snapshot} from './query-fixture.js';
const s=await snapshot();
const summary=(ids:string[])=>({...acquisition(),metrics:ids.map(id=>({id,version:1}))});
describe('registered field summaries',()=>{
 it('counts records independently of equal amounts and computes exact summary values',()=>{
  const d=summary(['summary_won_value_count','summary_won_value_avg','summary_won_value_min','summary_won_value_max','won_value']);
  expect(executeQuery(s,d,access(s)).totals).toEqual({summary_won_value_count:'3',summary_won_value_avg:'133.333333',summary_won_value_min:'100.000000',summary_won_value_max:'200.000000',won_value:'400.000000'});
 });
 it('recomputes weighted AVG for pivot margins instead of averaging group averages',()=>{
  const d=summary(['summary_won_value_avg','summary_won_value_count']);d.relations=['session_ad'];d.dimensions=['ad.name'];d.filters=[{field:'session.source_kind',op:'eq',value:'paid'}];d.visualization={type:'pivot',rows:['ad.name'],columns:[],values:d.metrics.map(m=>m.id)};
  const r=executeQuery(s,d,access(s));expect(r.rows.map(x=>x.metrics.summary_won_value_avg)).toEqual(['100.000000','200.000000']);expect(r.pivot?.columnTotals[0]?.summary_won_value_avg).toBe('133.333333');expect(r.pivot?.grandTotal.summary_won_value_count).toBe('3');
 });
 it('skips unanswered sessions for latency and distinguishes count from population size',()=>{
  const r=executeQuery(s,summary(['sessions_opened','summary_first_response_p95_count','summary_first_response_p95_avg','summary_first_response_p95_min','summary_first_response_p95_max','summary_first_response_p95_sum']),access(s));
  expect(Object.values(r.totals)).toEqual(['5','3','30.000000','10.000000','50.000000','90.000000']);
 });
 it('preserves fractional averages for integer/count-unit inputs',()=>{
  const d={...marketing(),metrics:[{id:'summary_base_impressions_avg',version:1}]};expect(executeQuery(s,d,access(s)).totals.summary_base_impressions_avg).toBe('583.333333');
 });
 it('returns null empty AVG/MIN/MAX and zero empty COUNT/SUM',()=>{
  const d=summary(['summary_first_response_p95_count','summary_first_response_p95_avg','summary_first_response_p95_min','summary_first_response_p95_max','summary_first_response_p95_sum']);d.filters=[{field:'session.source_kind',op:'eq',value:'unknown'}];expect(Object.values(executeQuery(s,d,access(s)).totals)).toEqual(['0',null,null,null,'0.000000']);
 });
 it('keeps strict missing-data SUM while new summaries skip nulls explicitly',async()=>{
  const rows=syntheticRows();rows.find(r=>r.object==='deal'&&r.id==='D1')!.values['deal.amount']=null;const changed=await snapshot(rows);
  const r=executeQuery(changed,summary(['summary_won_value_count','summary_won_value_avg','won_value']),access(changed));expect(r.totals).toEqual({summary_won_value_count:'2',summary_won_value_avg:'150.000000',won_value:null});expect(r.warnings).toContain('INCOMPLETE_METRIC_INPUT');
 });
 it('compares and averages exact monetary decimals beyond Number safe range',async()=>{
  const rows=syntheticRows();for(const r of rows.filter(r=>r.object==='deal'))r.values['deal.amount']=r.id==='D1'?'90071992547409.123456':'90071992547409.123459';const changed=await snapshot(rows);
  expect(executeQuery(changed,summary(['summary_won_value_avg','summary_won_value_min','summary_won_value_max']),access(changed)).totals).toEqual({summary_won_value_avg:'90071992547409.123458',summary_won_value_min:'90071992547409.123456',summary_won_value_max:'90071992547409.123459'});
 });
 it('enforces currency and hidden-field authority on new measures',async()=>{
  const d=summary(['summary_won_value_avg']);const denied=access(s);denied.fields=denied.fields.filter(f=>f!=='deal.amount');expect(()=>executeQuery(s,d,denied)).toThrow('QUERY_FORBIDDEN');const rows=syntheticRows();rows.find(r=>r.object==='deal')!.values['deal.currency']='VND';const changed=await snapshot(rows);expect(()=>executeQuery(changed,d,access(changed))).toThrow('CURRENCY_MISMATCH');
 });
 it('preserves historical descriptors and executes old catalog snapshots',async()=>{
  const catalog=syntheticCatalog();for(const m of catalogV1.metrics)expect(catalog.metrics.find(x=>x.id===m.id)).toEqual(m);catalog.metrics=structuredClone(catalogV1.metrics);const old=await snapshot(syntheticRows(catalog),catalog);expect(executeQuery(old,acquisition(),access(old)).totals.won_value).toBe('400.000000');expect(()=>executeQuery(old,summary(['summary_won_value_avg']),access(old))).toThrow();
 });
 it('discovers only executable covered measures with distinct formula/population/null semantics',()=>{
  const c=syntheticCatalog(),fields=c.fields.map(f=>f.id),options=describeMeasures(c,fields);expect(options).toHaveLength(71);
  expect(options.find(o=>o.id==='won_value')).toMatchObject({field:'deal.amount',operation:'sum',nullPolicy:'propagate'});expect(options.find(o=>o.id==='summary_won_value_avg')).toMatchObject({field:'deal.amount',operation:'avg',nullPolicy:'skip'});expect(options.find(o=>o.id==='session_to_lead_rate')).toMatchObject({operation:'ratio',numerator:'sessions_with_lead@1',denominator:'sessions_opened@1',multiplier:100});
  expect(describeMeasures(c,fields.filter(f=>f!=='lead.id')).some(o=>o.id==='session_to_lead_rate')).toBe(false);
  c.metrics.find(m=>m.id==='summary_won_value_avg')!.formula='changed';expect(describeMeasures(c,fields).some(o=>o.id==='summary_won_value_avg')).toBe(false);
 });
});
