import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {chartIssue,CommonReportChart,consecutive,type Chart} from './reporting-chart';
import {ReportingVisual} from './reporting-visual';
import {reportPreset,visualizationError} from './reporting-presets';
import {editableReport} from './reporting-shape';
import {initialReport,visualLabels,type ReportSource,type ReportResult} from './reporting-model';
import {catalogV1} from '../../../../services/reporting/src/catalog';
const source:ReportSource={id:'test',generation:'a'.repeat(64),historyFrom:'2026-09-01T00:00:00Z',observedThrough:'2026-10-08T00:00:00Z',catalog:catalogV1,availableFields:catalogV1.fields.map(f=>f.id)};
const d=initialReport(source,catalogV1.models.find(m=>m.id==='marketing_base')!);
const result=():ReportResult=>({environment:'mock',snapshotId:'test',dimensions:['insights_base.date_start'],metrics:['base_spend'],rows:[{dimensions:['2026-09-01'],metrics:{base_spend:'100.000000'}},{dimensions:['2026-09-02'],metrics:{base_spend:'50.000000'}}],totals:{base_spend:'150.000000'},warnings:[]});
const chart=(type:Chart['type']):Chart=>({type,x:'insights_base.date_start',y:['base_spend']});
describe('common visualization safety and presets',()=>{
 it.each(Object.keys(visualLabels).filter(x=>x!=='funnel') as (keyof typeof visualLabels)[])('builds compatible %s preset without losing filters/time',type=>{
  const current={...d,filters:[{field:'insights_base.currency',op:'eq' as const,value:'USD'}]};
  const p=reportPreset(source,current,type);expect(p.reason).toBeUndefined();expect(p.definition).toBeDefined();expect(p.definition!.filters).toEqual(current.filters);expect(p.definition!.time).toEqual(current.time);expect(editableReport(p.definition)).toBe(true);expect(visualizationError(p.definition!,source)).toBe('');
 });
 it('rejects funnel on a non-stage source',()=>{expect(reportPreset(source,d,'funnel').definition).toBeUndefined();expect(reportPreset(source,d,'funnel').reason).toBeTruthy();});
 it('does not force a preset by discarding unavailable filter constraints',()=>{expect(reportPreset(source,{...d,filters:[{field:'unknown',op:'eq',value:'x'}]},'pie').reason).toBeTruthy();});
 it.each(['bar','horizontal_bar','line','area','pie','donut'] as const)('renders %s and retains exact table',type=>{const markup=renderToStaticMarkup(<ReportingVisual result={result()} definition={{...d,visualization:chart(type)}} catalog={source.catalog}/>);expect(markup).toContain('<svg');expect(markup).toContain('<table');expect(markup).toContain('150');expect(markup).toContain('USD');});
 it('blocks nonadditive, null, negative, zero, excessive and mismatched composition data',()=>{
  for(const value of [null,'-1','9007199254740993']){const r=result();r.rows[0]!.metrics.base_spend=value;expect(chartIssue(r,chart('pie'),source.catalog)).toBeTruthy();}
  const r=result();r.totals.base_spend='149.999999';expect(chartIssue(r,chart('donut'),source.catalog)).toBeTruthy();
  r.totals.base_spend='0';r.rows.forEach(row=>row.metrics.base_spend='0');expect(chartIssue(r,chart('pie'),source.catalog)).toBeTruthy();
  const many=result();many.rows=Array.from({length:13},(_,i)=>({dimensions:[String(i)],metrics:{base_spend:'1'}}));many.totals.base_spend='13';expect(chartIssue(many,chart('pie'),source.catalog)).toContain('12');
  const ratio=result();ratio.metrics=['base_ctr'];expect(chartIssue(ratio,chart('pie'),source.catalog)).toBeTruthy();
 });
 it('checks decimal partition totals exactly and preserves precision in table fallback',()=>{
  const r=result();r.rows[0]!.metrics.base_spend='0.1';r.rows[1]!.metrics.base_spend='0.2';r.totals.base_spend='0.3';expect(chartIssue(r,chart('pie'),source.catalog)).toBe('');
  r.rows[0]!.metrics.base_spend='9007199254740993.123456';const html=renderToStaticMarkup(<ReportingVisual result={r} definition={{...d,visualization:chart('bar')}} catalog={source.catalog}/>);expect(html).not.toContain('<svg');expect(html).toContain('9007199254740993.123456');
 });
 it('rejects mixed units and incomplete stacks instead of converting missing cells to zero',()=>{
  const r=result();r.dimensions.push('insights_base.currency');r.rows[0]!.dimensions.push('USD');r.rows[1]!.dimensions.push('VND');const c={...chart('stacked_bar'),series:'insights_base.currency'};expect(chartIssue(r,c,source.catalog)).toContain('đầy đủ');
  r.metrics.push('base_clicks');expect(chartIssue(r,chart('bar'),source.catalog)).toContain('cùng đơn vị');
 });
 it('renders complete stacks and signed bars with finite geometry',()=>{
  const r=result();r.dimensions.push('insights_base.currency');r.rows.forEach(row=>row.dimensions.push('USD'));const c={...chart('stacked_bar'),series:'insights_base.currency'};expect(chartIssue(r,c,source.catalog)).toBe('');expect(renderToStaticMarkup(<CommonReportChart result={r} chart={c} catalog={source.catalog} definition={d}/>)).toContain('<rect');
  r.rows[0]!.metrics.base_spend='-100';expect(chartIssue(r,chart('horizontal_bar'),source.catalog)).toBe('');expect(renderToStaticMarkup(<CommonReportChart result={r} chart={chart('horizontal_bar')} catalog={source.catalog} definition={d}/>)).not.toMatch(/NaN|Infinity/);
 });
 it('sorts trend buckets and breaks at null/missing buckets across day/week/month boundaries',()=>{
  const r=result();r.rows=[{dimensions:['2026-09-05'],metrics:{base_spend:'4'}},{dimensions:['2026-09-01'],metrics:{base_spend:'1'}},{dimensions:['2026-09-02'],metrics:{base_spend:null}},{dimensions:['2026-09-03'],metrics:{base_spend:'3'}}];
  const html=renderToStaticMarkup(<CommonReportChart result={r} chart={chart('area')} catalog={source.catalog} definition={d}/>);expect(html.match(/data-segment="trend"/g)).toHaveLength(3);expect(html.indexOf('2026-09-01:')).toBeLessThan(html.indexOf('2026-09-05:'));
  expect(consecutive('2026-12','2027-01','month')).toBe(true);expect(consecutive('2026-09-07','2026-09-14','week')).toBe(true);expect(consecutive('2026-09-01','2026-09-03','day')).toBe(false);
 });
});
