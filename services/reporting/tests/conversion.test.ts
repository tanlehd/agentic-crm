import {describe,it,expect} from 'vitest';
import {conversionCatalog} from '../src/conversion-catalog.js';
import {conversionTemplate} from '../src/conversion-template.js';
import {withSourcePolicy,connectedSnapshots,connectedSnapshot,liveDefinition,conversionBinding} from '../src/connected-sources.js';
import {executeQuery} from '../src/query.js';
import {completeMockAccess} from '../src/query-service.js';
import type {Definition} from '../src/types.js';
const tenant='11111111-1111-4111-8111-111111111111',asOf='2026-10-17T12:00:00.000Z';
const at=(day:number)=>`2026-10-${String(day).padStart(2,'0')}T00:00:00.000Z`;
export function conversionFixture(){
 const {catalog}=conversionCatalog(),rows:Record<string,any[]>=Object.fromEntries(catalog.objects.map(o=>[o.id,[]]));
 const row=(object:string,id:string,values:Record<string,unknown>)=>{const r=Object.fromEntries(catalog.fields.filter(f=>f.object===object).map(f=>[f.id.slice(object.length+1),null]));Object.assign(r,{id},values);rows[object]!.push(r);return r;};
 for(const [id,day]of [['s1',1],['s2',2],['s3',3],['s4',16]] as const)row('cv_session',id,{opened_at:at(day),conversation_id:'thread',status:'closed',source_kind:'organic',page_id:'page'});
 row('cv_lead','l1',{created_at:at(1),canonical_id:'l1',origin_session_id:'s1',status:'new'});
 row('cv_lead','l2',{created_at:at(2),canonical_id:'l1',origin_session_id:'s2',status:'new'});
 row('cv_lead','l3',{created_at:at(3),canonical_id:'l3',origin_session_id:'s2',status:'new'});
 for(const l of rows.cv_lead!.filter(r=>r.id===r.canonical_id))row('cv_canonical_lead',l.id,l);
 for(const [id,lead,session,closed]of [['d1','l1','s1',4],['d2','l2','s2',5],['d3',null,'s3',15]] as const)row('cv_deal',id,{created_at:at(3),closed_at:at(closed),lead_id:lead,canonical_lead_id:lead?'l1':null,origin_session_id:session,via_lead_session_id:lead?session:null,direct_session_id:lead?null:session,stage:'won',amount:'10.000000',currency:'VND'});
 row('cv_attention','attention',{kind:'deal',record_id:'d4',reason:'Deal đang mở',age_days:8,as_of:'2026-10-17T11:59:59.000Z'});
 return {allowMock:false,operations:null,conversion:{schemaVersion:1,tenantId:tenant,asOf,historyFrom:'2025-10-17T12:00:00.000Z',rows}};
}
async function query(model:string,metrics:string[],change:Partial<Definition>={},policy=conversionFixture()){
 return withSourcePolicy(tenant,policy,async()=>{const s=connectedSnapshots()[0]!,m=s.manifest.catalog.models.find(m=>m.id===model)!;
 const d:Definition={schemaVersion:1,model:{id:model,version:1},bindingId:s.binding.id,relations:[],dimensions:[],metrics:metrics.map(id=>({id,version:1})),filters:[],currency:'VND',time:{mode:m.mode,from:at(1),to:asOf,asOf,timezone:'UTC',bucket:'day',rollingDays:30},visualization:{type:'table'},...change,bindingId:s.binding.id};
 const access=completeMockAccess({audience:'reporting-query-v1',tenantId:tenant,principalId:tenant,authRevision:'1',mockSource:'all',canExport:true,bodyHash:'a'.repeat(64),issuedAt:Date.now(),expiresAt:Date.now()+5000},s);return executeQuery(s,liveDefinition(d,s.manifest),access);});
}
describe('connected conversion cohorts',()=>{
 it('derives later Sales won from lineage while closed Chat sessions remain unchanged',async()=>{
  const p=conversionFixture(),chat=structuredClone(p.conversion.rows.cv_session),deal=p.conversion.rows.cv_deal!.find(r=>r.id==='d2')!;
  const metrics=['cv_sessions_count','cv_sessions_with_lead','cv_sessions_via_lead_won','cv_sessions_with_won'];
  deal.stage='open';deal.closed_at=null;
  expect((await query('cv_sessions',metrics,{},p)).totals).toEqual({cv_sessions_count:'4',cv_sessions_with_lead:'2',cv_sessions_via_lead_won:'1',cv_sessions_with_won:'2'});
  deal.stage='won';deal.closed_at=at(5);
  expect((await query('cv_sessions',metrics,{},p)).totals).toEqual({cv_sessions_count:'4',cv_sessions_with_lead:'2',cv_sessions_via_lead_won:'2',cv_sessions_with_won:'3'});
  expect(p.conversion.rows.cv_session).toEqual(chat);
  expect(chat.every(row=>row.status==='closed')).toBe(true);
 });
 it('rejects oversized sources and unavailable catalog pins without truncation or fallback',async()=>{const p=conversionFixture(),row=p.conversion.rows.cv_session![0]!;p.conversion.rows.cv_session=Array.from({length:10001},(_,i)=>({...row,id:'s'+i}));await expect(withSourcePolicy(tenant,p,async()=>{})).rejects.toThrow('CONVERSION_SOURCE_LIMIT');await withSourcePolicy(tenant,conversionFixture(),async()=>{expect(()=>connectedSnapshot(conversionBinding(tenant),'f'.repeat(64))).toThrow('SNAPSHOT_PIN_UNAVAILABLE');});});
 it('keeps empty sessions and separates raw volume, distinct session rates and direct won',async()=>{const r=await query('cv_sessions',['cv_sessions_count','cv_sessions_leads','cv_sessions_lead_rate','cv_sessions_won_rate','cv_sessions_direct_won','cv_sessions_via_lead_won','cv_sessions_won_value']);expect(r.totals).toEqual({cv_sessions_count:'4',cv_sessions_leads:'3',cv_sessions_lead_rate:'50.000000',cv_sessions_won_rate:'75.000000',cv_sessions_direct_won:'1',cv_sessions_via_lead_won:'2',cv_sessions_won_value:'30.000000'});});
 it('preserves duplicate Lead deal lineage while canonical rates count one group',async()=>{expect((await query('cv_leads_raw',['cv_leads_raw_count','cv_leads_raw_won_rate'])).totals).toEqual({cv_leads_raw_count:'3',cv_leads_raw_won_rate:'66.666667'});expect((await query('cv_leads_canonical',['cv_leads_canonical_count','cv_leads_canonical_won','cv_leads_canonical_won_rate','cv_leads_canonical_won_value'])).totals).toEqual({cv_leads_canonical_count:'2',cv_leads_canonical_won:'2',cv_leads_canonical_won_rate:'50.000000',cv_leads_canonical_won_value:'20.000000'});});
 it('matures cohort and excludes late won after the same observation horizon',async()=>{const r=await query('cv_sessions',['cv_sessions_count','cv_sessions_won_rate'],{time:{mode:'acquisition_cohort',from:at(1),to:asOf,asOf,timezone:'UTC',bucket:'day',rollingDays:30,horizonDays:7}});expect(r.cohort).toEqual({eligible:3,immature:1,horizonDays:7});expect(r.totals.cv_sessions_won_rate).toBe('66.666667');});
 it('returns recomputed goal gap in percentage points and null attainment for zero target',async()=>{const r=await query('cv_sessions',['cv_sessions_won_rate'],{goal:{metricId:'cv_sessions_won_rate',target:'80.5'}});expect(r.goal).toEqual({metricId:'cv_sessions_won_rate',target:'80.5',actual:'75.000000',gap:'-5.500000',attainment:'93.167702',unit:'percent'});expect((await query('cv_sessions',['cv_sessions_count'],{goal:{metricId:'cv_sessions_count',target:'0'}})).goal?.attainment).toBeNull();});
 it('rejects goal on incompatible populations and horizon on current actions',async()=>{await expect(query('cv_sessions',['cv_sessions_won_rate'],{goal:{metricId:'cv_sessions_count',target:'2'}})).rejects.toThrow('GOAL_SCOPE_INVALID');await expect(query('cv_actions',['cv_actions_count'],{time:{mode:'activity',from:at(1),to:asOf,asOf,timezone:'UTC',bucket:'day',rollingDays:30,horizonDays:7}})).rejects.toThrow('HORIZON_UNSUPPORTED');});
 it('handles zero denominators and exact currency; does not sum equal money values away',async()=>{const p=conversionFixture();p.conversion.rows.cv_session=[];expect((await query('cv_sessions',['cv_sessions_lead_rate'],{},p)).totals.cv_sessions_lead_rate).toBeNull();const mixed=conversionFixture();mixed.conversion.rows.cv_deal![0]!.currency='USD';await expect(query('cv_sessions',['cv_sessions_won_value'],{},mixed)).rejects.toThrow('CURRENCY_MISMATCH');});
 it('validates every template recipe on real adapter without mock fallback',async()=>{for(const r of conversionTemplate().recipes){const result=await query(r.definition.model.id,r.definition.metrics.map(m=>m.id),r.definition);expect(result.environment).toBe('connected');}});
 it('isolates tenant and validates payload shape, source count and current catalog pin',async()=>{const p=conversionFixture();p.conversion.tenantId='22222222-2222-4222-8222-222222222222';await expect(withSourcePolicy(tenant,p,async()=>{})).rejects.toThrow('INVALID_SOURCE_PAYLOAD');const bad=conversionFixture();bad.conversion.rows.cv_session![0]!.transcript='never';await expect(withSourcePolicy(tenant,bad,async()=>{})).rejects.toThrow('INVALID_SOURCE_PAYLOAD');expect(conversionBinding(tenant)).not.toBe(conversionBinding(p.conversion.tenantId));expect(connectedSnapshots()).toEqual([]);});
});
