import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID} from 'node:crypto';
import {ReportingStore} from '../services/reporting/dist/storage.js';
import {ProjectionStore} from '../services/reporting/dist/projections.js';
import {QueryRunner} from '../services/reporting/dist/query-runner.js';
import {digest} from '../services/reporting/dist/registry.js';
import {syntheticAdapter} from '../services/reporting/dist/synthetic-source.js';

// Reuse the projection harness's retained G1. This harness performs no writes.
const env=parseEnv(await readFile('.local/reporting-test.env','utf8'));
assert.equal(env.REPORTING_DB_NAME,'test_crm_reporting');assert.equal(env.REPORTING_DB_HOST,'127.0.0.1');assert.equal(env.REPORTING_DB_PORT,'13306');
const fixture=JSON.parse(await readFile('.local/reporting-projection-fixture.json','utf8'));
const context={tenantId:fixture.tenantA,bindingId:fixture.binding,adapterId:'synthetic_g1_v1',environment:'mock'};
const identity={tenantId:context.tenantId,principalId:'01900000-0000-7000-8000-000000000041'};
const owner=new ReportingStore(env),store=new ProjectionStore(owner.pool),groups=[];
const test=async(name,fn)=>{await fn();groups.push(name);console.log('PASS '+name);};
try{
 const snapshot=await store.read(context),generation=(await syntheticAdapter(context).describe(context)).snapshotId;
 assert.equal(snapshot.binding.revision,generation);
 const scope={...identity,authRevision:'1',scopeFingerprint:'internal_mysql_fixture',permissions:['report.run'],objects:snapshot.manifest.catalog.objects.map(o=>o.id),fields:snapshot.binding.availableFields,bindings:[context.bindingId],rows:Object.fromEntries(snapshot.manifest.catalog.objects.map(o=>[o.id,'all'])),expiresAt:Date.now()+60000};
 let authority=structuredClone(scope),loads=0;
 const runner=new QueryRunner({authorize:async()=>structuredClone(authority),load:async(i,b,g)=>{loads++;return store.read({...context,tenantId:i.tenantId,bindingId:b},g);}});
 const definition={schemaVersion:1,model:{id:'acquisition',version:1},bindingId:context.bindingId,relations:['session_ad'],dimensions:['ad.name'],metrics:['sessions_opened','engaged_contacts','crm_leads','sessions_with_lead','session_to_lead_rate','deals_won','won_value','first_response_p95'].map(id=>({id,version:1})),filters:[{field:'session.source_kind',op:'eq',value:'paid'}],time:{mode:'acquisition_cohort',from:'2026-09-01T00:00:00Z',to:'2026-09-08T00:00:00Z',asOf:'2026-10-08T00:00:00Z',timezone:'UTC',bucket:'day'},currency:'USD',visualization:{type:'table'}};
 const fingerprint=async()=>{const [tables]=await owner.pool.query("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE 'report_%' ORDER BY TABLE_NAME");return Promise.all(tables.map(async({name})=>{const [rows]=await owner.pool.query('SELECT * FROM `'+name+'`');return [name,digest(rows.map(r=>JSON.stringify(r)).sort())];}));};
 const before=await fingerprint();let golden;
 await test('real MySQL pinned G1 returns exact paid cohort and nonadditive Contact totals',async()=>{
  golden=await runner.run(identity,context.bindingId,definition,{generation});
  assert.equal(golden.snapshotId,generation);assert.equal(golden.totals.sessions_opened,'4');assert.equal(golden.totals.engaged_contacts,'3');assert.equal(golden.totals.session_to_lead_rate,'50.000000');assert.equal(golden.totals.won_value,'400.000000');assert.equal(golden.totals.first_response_p95,'48.000000');
  assert.deepEqual(golden.rows.map(r=>[r.dimensions[0],r.metrics.engaged_contacts,r.metrics.won_value]),[['Ad A','2','200.000000'],['Ad B','2','200.000000']]);
 });
 await test('pivot margins recompute underlying cohort from persisted observations',async()=>{const d=structuredClone(definition);d.dimensions.push('session.opened_at');d.time.bucket='week';d.visualization={type:'pivot',rows:['ad.name'],columns:['session.opened_at'],values:d.metrics.map(m=>m.id)};const r=await runner.run(identity,context.bindingId,d);assert.equal(r.pivot.columnTotals[0].engaged_contacts,'3');assert.equal(r.pivot.grandTotal.won_value,'400.000000');});
 await test('base/age/region provider datasets keep their own denominators and spend',async()=>{for(const profile of ['base','age','region']){const d={...definition,model:{id:'marketing_'+profile,version:1},relations:[],dimensions:[],filters:[],metrics:['impressions','clicks','spend','ctr','cpc','cpm'].map(id=>({id:profile+'_'+id,version:1})),time:{...definition.time,mode:'activity'}};const r=await runner.run(identity,context.bindingId,d);assert.equal(r.totals[profile+'_spend'],profile==='base'?'175.000000':'100.000000');if(profile==='base'){assert.equal(r.totals.base_ctr,'8.571429');assert.equal(r.totals.base_cpc,'1.166667');}}});
 await test('cache rechecks rights; explicit base scope cannot reuse broader result',async()=>{authority.rows.session=['S2'];const r=await runner.run(identity,context.bindingId,definition);assert.equal(r.totals.sessions_opened,'1');assert.equal(r.totals.crm_leads,'0');authority.rows.lead=[];await assert.rejects(runner.run(identity,context.bindingId,definition),e=>e.code==='SOURCE_SCOPE_INCOMPLETE');authority=structuredClone(scope);});
 await test('cross-tenant authority mismatch fails before snapshot load',async()=>{const n=loads;await assert.rejects(runner.run({...identity,tenantId:fixture.tenantB},context.bindingId,definition),e=>e.code==='QUERY_FORBIDDEN');assert.equal(loads,n);await assert.rejects(store.read({...context,tenantId:randomUUID()},generation),e=>e.code==='BINDING_NOT_FOUND');});
 await test('revocation before cached CSV delivery fails closed',async()=>{let calls=0,revoked=false;const r=new QueryRunner({authorize:async()=>({...scope,authRevision:revoked&&++calls%2===0?'2':'1'}),load:async()=>store.read(context,generation)});await r.run(identity,context.bindingId,definition);revoked=true;await assert.rejects(r.run(identity,context.bindingId,definition,{csv:true}),e=>e.code==='STALE_AUTHORIZATION');});
 await test('aggregate CSV and repeated pinned read preserve every Reporting table',async()=>{const csv=await runner.run(identity,context.bindingId,definition,{generation,csv:true});assert(csv.includes('"Ad A"'));assert(csv.includes('"200.000000"'));assert.deepEqual(await runner.run(identity,context.bindingId,definition,{generation}),golden);assert.deepEqual(await fingerprint(),before);await mkdir('artifacts/reporting-query',{recursive:true});await writeFile('artifacts/reporting-query/paid-by-ad.csv',csv);await writeFile('artifacts/reporting-query/paid-by-ad.json',JSON.stringify(golden,null,2));});
 await writeFile('artifacts/reporting-query/mysql.json',JSON.stringify({at:new Date().toISOString(),database:env.REPORTING_DB_NAME,authorization:'internal test port; not native Identity',readOnly:true,passed:groups.length,groups},null,2));
 console.log(JSON.stringify({passed:groups.length}));
}finally{await owner.close();}
