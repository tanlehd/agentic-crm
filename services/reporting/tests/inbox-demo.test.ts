import {describe,it,expect} from 'vitest';
import {inboxDemoAdapter,inboxDemoDashboards,inboxDemoRows} from '../src/inbox-demo.js';
import {canonicalObservations,validateManifest,validateObservations} from '../src/projection-contract.js';
import {executeQuery} from '../src/query.js';
import {context,access} from './query-fixture.js';
const adapter=inboxDemoAdapter(context),manifest=await adapter.describe(context);
validateManifest(context,manifest);
for(let i=0;i<manifest.pageHashes.length;i++)validateObservations(manifest,await adapter.page(context,manifest.snapshotId,i));
const s={manifest,records:canonicalObservations(inboxDemoRows()),binding:{id:context.bindingId,tenantId:context.tenantId,environment:'mock' as const,revision:manifest.snapshotId,models:manifest.catalog.models.map(({id,version})=>({id,version})),availableFields:manifest.availableFields}};
const dashboards=inboxDemoDashboards(context.bindingId,manifest.snapshotId);
const query=(id:string)=>{const w=dashboards.flatMap(d=>d.definition.widgets).find(w=>w.id===id)!;return executeQuery(s,w.definition,access(s));};
describe('50 inbox dashboard scenario',()=>{
 it('compiles and executes all eleven pinned widgets without incomplete inputs',()=>{for(const d of dashboards)for(const w of d.definition.widgets){const r=executeQuery(s,w.definition,access(s));expect(r.warnings).toEqual([]);expect(r.snapshotId).toBe(manifest.snapshotId);}});
 it('reconciles mutually exclusive handling states and coverage',()=>{
  expect(query('volume').totals).toEqual({ops_received:'50',ops_accepted:'30',ops_queued:'20',ops_accept_rate:'60.000000'});
  expect(query('state').rows.map(r=>r.metrics.ops_received).sort()).toEqual(['10','10','20','5','5']);
  expect(query('quality').totals).toMatchObject({adq_lead:'10',adq_lead_rate:'20.000000',adq_lead_accepted_rate:'33.333333',adq_interest_rate:'66.666667'});
 });
 it('uses only responded / queued populations for elapsed-time metrics',()=>{
  // Response delays: 50,90,130,170,210,175,215,255,295,335, repeated three times.
  expect(query('speed').totals).toEqual({ops_responded:'30',ops_response_seconds_avg:'192.500000',ops_response_seconds_p50:'192.500000',ops_response_seconds_p95:'335.000000',ops_sla_all:'12.000000',ops_sla_responded:'20.000000'});
  expect(query('queue').totals).toEqual({ops_accept_seconds_avg:'142.500000',ops_accept_seconds_p95:'255.000000',ops_queue_age_seconds_avg:'882.500000',ops_queue_age_seconds_p95:'1438.250000',ops_queue_age_seconds_max:'1500.000000'});
 });
 it('recomputes occupancy and productivity from active work and staffed hours',()=>{expect(query('capacity').totals).toMatchObject({agent_accepted:'30',agent_active:'25',agent_slots:'24',agent_occupancy:'104.166667',agent_productivity:'15'});expect(query('capacity').rows).toHaveLength(2);});
 it('counts activity in event-time buckets and preserves all events',()=>{const r=query('flow');expect(r.totals).toEqual({activity_received:'50',activity_accepted:'30',activity_responded:'30'});expect(r.rows.map(x=>x.dimensions[0])).toEqual(['09:00','09:15','09:30','09:45']);});
 it('keeps spend at ad grain and zero-lead CPL unavailable',()=>{const r=query('cost');expect(r.totals).toMatchObject({adq_spend:'1700000.000000',adq_received:'50',adq_lead:'10',adq_cpi:'34000.000000',adq_cpl:'170000.000000',adq_cost_interest:'85000.000000'});expect(r.rows[2]!.metrics.adq_cpl).toBeNull();expect(query('coverage').rows.map(r=>[r.metrics.adq_accepted,r.metrics.adq_queued])).toEqual([['15','5'],['12','8'],['3','7']]);});
});
