import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {StageConfiguration,StageVisual} from './reporting-stage';
import {initialReport,type ReportSource,type ReportResult} from './reporting-model';
import {editableReport} from './reporting-shape';
import {stageCatalog} from '../../../../services/reporting/src/stage-catalog';
const catalog=stageCatalog(),source:ReportSource={id:'stage',generation:'a'.repeat(64),environment:'connected',historyFrom:'2025-10-18T00:00:00Z',observedThrough:'2026-10-18T00:00:00Z',catalog,availableFields:catalog.fields.map(f=>f.id),stageProcesses:['open','qualified','won','lost'].map((key,position)=>({kind:'deal',process_version:'1',key,label:key,position}))};
const definition=initialReport(source,catalog.models.find(m=>m.id==='sf_deal'));
const result:ReportResult={environment:'connected',snapshotId:'stage',dimensions:['sf_subject.stage'],metrics:['sf_count'],rows:[{dimensions:['open'],metrics:{sf_count:'1'}}],totals:{sf_count:'1'},warnings:['STAGE_HISTORY_INCOMPLETE'],stage:{kind:'deal',processVersion:'1',mode:'entry_cohort',coverage:{full:1,partial:2,none:3},cohort:1,steps:[{key:'open',label:'open',reached:1,pending:1,members:[{id:'deal-1',recordId:'deal-1'}],pendingMembers:[{id:'deal-1',recordId:'deal-1'}]}]}};
describe('stage funnel presentation',()=>{
 it('creates editable event configuration without treating terminal loss as a required success step',()=>{expect(definition.stageFunnel?.stages).toEqual(['open','qualified','won']);expect(editableReport(JSON.parse(JSON.stringify(definition)))).toBe(true);const html=renderToStaticMarkup(<StageConfiguration source={source} definition={definition} onChange={()=>{}}/>);expect(html).toContain('Cách chọn kỳ');expect(html).toContain('Bỏ stage qualified');});
 it('discloses missing history and links observed members; renders only selected metric columns',()=>{const html=renderToStaticMarkup(<StageVisual result={result} definition={definition}/>);expect(html).toContain('một phần: 2');expect(html).toContain('chưa có: 3');expect(html).toContain('/?screen=deals&amp;record=deal-1');expect(html).toContain('width:100%');expect(html).not.toContain('<th>Lượt vào</th>');});
 it('keeps exact table in table mode and handles zero cohorts without invalid geometry',()=>{const html=renderToStaticMarkup(<StageVisual result={{...result,stage:{...result.stage!,cohort:0}}} definition={{...definition,visualization:{type:'table'}}}/>);expect(html).toContain('<table');expect(html).not.toContain('Biểu đồ funnel');expect(html).not.toMatch(/NaN|Infinity/);});
});
