import assert from 'node:assert/strict';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import { connect,migrate,digest,systemTenant } from './lib/marketing-database.mjs';
const env=parseEnv(await readFile('.local/marketing-test.env','utf8'));
assert.equal(env.MARKETING_DB_NAME,'test_crm_marketing');
const c=await connect(env),passed=[];
const now='2026-10-08 00:00:00.000000';
const tenantA=randomUUID(),tenantB=randomUUID(),accountA=randomUUID(),accountB=randomUUID(),accountOther=randomUUID();
const accountExternal='9007199254740993123456789012345',adExternal='9007199254740993987654321';
const mutable={created_at:now,updated_at:now};
const common={...mutable,last_seen_at:now,availability:'available',field_coverage:'{}'};
async function insert(table,row,db=c){const names=Object.keys(row);await db.execute(`INSERT INTO ${table} (${names.join(',')}) VALUES (${names.map(()=>'?').join(',')})`,Object.values(row));return row.id;}
async function rejects(fn,codes){await assert.rejects(fn,e=>codes.includes(e.code));}
const fkErrors=['ER_NO_REFERENCED_ROW_2'];
const checkErrors=['ER_CHECK_CONSTRAINT_VIOLATED','ER_BAD_NULL_ERROR','ER_NO_DEFAULT_FOR_FIELD'];
async function group(name,fn){await fn();passed.push(name);console.log('PASS '+name);}
const ids={};
try{
 await group('all27tables: tenant nonnull, system/business scopes, same-schema tenant FKs',async()=>{
  const [cols]=await c.query("SELECT TABLE_NAME name,IS_NULLABLE nullable FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND COLUMN_NAME='tenant_id'");assert.equal(cols.length,27);assert(cols.every(x=>x.nullable==='NO'));
  const [fks]=await c.query('SELECT CONSTRAINT_NAME name,TABLE_NAME tbl,REFERENCED_TABLE_SCHEMA refSchema,GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION) cols FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL GROUP BY CONSTRAINT_NAME,TABLE_NAME,REFERENCED_TABLE_SCHEMA');assert(fks.length>35);assert(fks.every(x=>x.refSchema==='test_crm_marketing'&&x.cols.split(',')[0]==='tenant_id'));
  await rejects(()=>insert('marketing_facebook_page_ref',{tenant_id:systemTenant,id:randomUUID(),external_page_id:'x',...mutable}),checkErrors);
  await rejects(()=>insert('marketing_facebook_page_ref',{tenant_id:'',id:randomUUID(),external_page_id:'x',...mutable}),checkErrors);
  await rejects(()=>insert('schema_migration',{tenant_id:tenantA,version:999,step:1,checksum:'0'.repeat(64),applied_at:now}),checkErrors);
 });
 await group('shared external account and parent replicas isolated per tenant',async()=>{
  for(const [tenant,id,node] of [[tenantA,accountA,accountExternal],[tenantB,accountB,accountExternal],[tenantA,accountOther,accountExternal+'2']])await insert('marketing_account',{tenant_id:tenant,id,provider_node_id:'act_'+node,external_account_id:node,currency:'VND',...common});
  await rejects(()=>insert('marketing_account',{tenant_id:tenantA,id:randomUUID(),provider_node_id:'act_'+accountExternal,...common}),['ER_DUP_ENTRY']);
  for(const [t,a,key] of [[tenantA,accountA,'a'],[tenantB,accountB,'b'],[tenantA,accountOther,'other']]){
   const binding=await insert('marketing_account_binding',{tenant_id:t,account_id:a,id:randomUUID(),credential_ref:'synthetic-only',credential_owner:'connector',status:'active',...mutable});
   const run=await insert('marketing_sync_run',{tenant_id:t,account_id:a,id:randomUUID(),binding_id:binding,profile:'object_metadata_v1',status:'complete',fence:1,...mutable});ids[key]={binding,run};
   const obs=await insert('marketing_object_observation',{tenant_id:t,account_id:a,id:randomUUID(),object_type:'campaign',external_object_id:'shared-campaign',revision:1,sync_run_id:run,fetched_at:now,payload_hash:Buffer.alloc(32),mapping_version:'1',api_version:'fixture',field_coverage:'{}',selected_payload:'{}'});
   ids[key].campaign=await insert('marketing_campaign',{tenant_id:t,account_id:a,id:randomUUID(),external_campaign_id:'shared-campaign',latest_observation_id:obs,...common});
  }
 });
 const obsBase={tenant_id:tenantA,account_id:accountA,sync_run_id:ids.a.run,fetched_at:now,payload_hash:Buffer.alloc(32),mapping_version:'1',api_version:'fixture',field_coverage:'{}',selected_payload:'{}',revision:1};
 await group('cross-tenant and same-tenant wrong-account references rejected',async()=>{
  await rejects(()=>insert('marketing_sync_run',{tenant_id:tenantA,account_id:accountA,id:randomUUID(),binding_id:ids.b.binding,profile:'x',status:'pending',fence:1,...mutable}),fkErrors);
  await rejects(()=>insert('marketing_sync_run',{tenant_id:tenantA,account_id:accountA,id:randomUUID(),binding_id:ids.other.binding,profile:'x',status:'pending',fence:1,...mutable}),fkErrors);
  await rejects(()=>insert('marketing_object_observation',{...obsBase,id:randomUUID(),object_type:'campaign',external_object_id:'x',sync_run_id:ids.b.run}),fkErrors);
 });
 await group('one active binding; revoke preserves other tenant',async()=>{
  await rejects(()=>insert('marketing_account_binding',{tenant_id:tenantA,account_id:accountA,id:randomUUID(),credential_ref:'synthetic',credential_owner:'connector',status:'active',...mutable}),['ER_DUP_ENTRY']);
  await c.execute("UPDATE marketing_account_binding SET status='revoked',version=version+1 WHERE tenant_id=? AND id=?",[tenantB,ids.b.binding]);
  const [[row]]=await c.execute('SELECT status FROM marketing_account_binding WHERE tenant_id=? AND id=?',[tenantA,ids.a.binding]);assert.equal(row.status,'active');
 });
 const admission={admission_page_id:'page-'+tenantA,page_binding_ref:randomUUID(),page_binding_namespace:'fixture-app',page_binding_revision:'1',admission_policy_version:'1',admitted_at:now,ownership_checked_at:now};
 await group('accepted Ad observation requires Page authority evidence',async()=>{
  await rejects(()=>insert('marketing_object_observation',{...obsBase,id:randomUUID(),object_type:'ad',external_object_id:adExternal}),checkErrors);
  ids.page=await insert('marketing_facebook_page_ref',{tenant_id:tenantA,id:randomUUID(),external_page_id:admission.admission_page_id,...mutable});
  ids.adObs=await insert('marketing_object_observation',{...obsBase,id:randomUUID(),object_type:'ad',external_object_id:adExternal,...admission});
  ids.ad=await insert('marketing_ad',{tenant_id:tenantA,account_id:accountA,id:randomUUID(),external_ad_id:adExternal,latest_observation_id:ids.adObs,campaign_id:ids.a.campaign,...admission,...common});
  await rejects(()=>c.execute('UPDATE marketing_ad SET campaign_id=? WHERE tenant_id=? AND id=?',[ids.b.campaign,tenantA,ids.ad]),fkErrors);
  await rejects(()=>c.execute('UPDATE marketing_ad SET campaign_id=? WHERE tenant_id=? AND id=?',[ids.other.campaign,tenantA,ids.ad]),fkErrors);
 });
 await group('Page/Instagram/Post/Media and content links are tenant scoped',async()=>{
  ids.ig=await insert('marketing_instagram_account_ref',{tenant_id:tenantA,id:randomUUID(),external_instagram_id:'ig-'+tenantA,...mutable});
  await insert('marketing_page_instagram_link',{tenant_id:tenantA,id:randomUUID(),page_id:ids.page,instagram_account_id:ids.ig,observed_at:now,evidence_ref:'synthetic'});
  await insert('marketing_facebook_post_ref',{tenant_id:tenantA,id:randomUUID(),external_post_id:'post-'+tenantA,page_id:ids.page,...mutable});
  await insert('marketing_instagram_media_ref',{tenant_id:tenantA,id:randomUUID(),external_media_id:'media-'+tenantA,instagram_account_id:ids.ig,...mutable});
  await rejects(()=>insert('marketing_facebook_post_ref',{tenant_id:tenantB,id:randomUUID(),external_post_id:'foreign-page',page_id:ids.page,...mutable}),fkErrors);
 });
 await group('Creative variants and targeting audience observations persist with local links',async()=>{
  for(const [kind,column,key] of [['creative','external_creative_id','creative'],['ad_set','external_adset_id','adset'],['audience_reference','external_audience_id','audience']]){
   const observation=await insert('marketing_object_observation',{...obsBase,id:randomUUID(),object_type:kind,external_object_id:key});
   ids[key+'Obs']=observation;
   ids[key]=await insert('marketing_'+kind,{tenant_id:tenantA,account_id:accountA,id:randomUUID(),[column]:key,latest_observation_id:observation,...common});
  }
  const creativeRevision=await insert('marketing_creative_revision',{tenant_id:tenantA,account_id:accountA,id:randomUUID(),creative_id:ids.creative,observation_id:ids.creativeObs,page_id:ids.page,instagram_account_id:ids.ig,created_at:now});
  await insert('marketing_content_variant',{tenant_id:tenantA,account_id:accountA,id:randomUUID(),creative_revision_id:creativeRevision,kind:'body',provider_path:'asset_feed.bodies[0]',content_text:'Synthetic marketing copy',created_at:now});
  const targeting=await insert('marketing_targeting_revision',{tenant_id:tenantA,account_id:accountA,id:randomUUID(),ad_set_id:ids.adset,observation_id:ids.adsetObs,selected_targeting:'{"age_min":18}',created_at:now});
  await insert('marketing_targeting_audience_ref',{tenant_id:tenantA,account_id:accountA,id:randomUUID(),targeting_revision_id:targeting,audience_id:ids.audience,relation:'include',created_at:now});
  await insert('marketing_ad_creative_binding',{tenant_id:tenantA,account_id:accountA,id:randomUUID(),ad_id:ids.ad,creative_id:ids.creative,observation_id:ids.adObs,external_creative_id:'creative',created_at:now});
  await rejects(()=>insert('marketing_content_variant',{tenant_id:tenantB,account_id:accountB,id:randomUUID(),creative_revision_id:creativeRevision,kind:'body',provider_path:'x',created_at:now}),fkErrors);
 });
 const grainBase={tenant_id:tenantA,account_id:accountA,external_ad_id:adExternal,date_start:'2026-10-07',date_stop:'2026-10-07',account_timezone:'Asia/Ho_Chi_Minh',created_at:now};
 const query='{"level":"ad","profile":"base","api":"fixture"}',breakdown='{"state":"not_requested"}';
 const grain={...grainBase,id:randomUUID(),dataset_profile:'insight_ad_daily_v1',query_signature:Buffer.from(digest(query),'hex'),breakdown_signature:Buffer.from(digest(breakdown),'hex'),query_canonical:query,breakdown_canonical:breakdown};
 await group('base/age/region distinct grains, canonical hashes, duplicate rejection',async()=>{
  ids.grain=await insert('marketing_insight_grain',grain);
  await rejects(()=>insert('marketing_insight_grain',{...grain,id:randomUUID()}),['ER_DUP_ENTRY']);
  await rejects(()=>insert('marketing_insight_grain',{...grain,id:randomUUID(),query_signature:Buffer.alloc(32)}),checkErrors);
  for(const [profile,value] of [['age','25-34'],['region','synthetic-region']]){
   const q=JSON.stringify({level:'ad',profile,api:'fixture'}),b=JSON.stringify({[profile]:value});
   ids[profile]=await insert('marketing_insight_grain',{...grainBase,id:randomUUID(),dataset_profile:`insight_ad_${profile}_daily_v1`,query_signature:Buffer.from(digest(q),'hex'),breakdown_signature:Buffer.from(digest(b),'hex'),query_canonical:q,breakdown_canonical:b});
  }
 });
 const insight={tenant_id:tenantA,account_id:accountA,grain_id:ids.grain,revision:1,sync_run_id:ids.a.run,ad_observation_id:ids.adObs,admission_page_id:admission.admission_page_id,external_ad_id:adExternal,date_start:'2026-10-07',date_stop:'2026-10-07',fetched_at:now,api_version:'fixture',mapping_version:'1',requested_settings:'{}',resolved_settings:'{}',field_coverage:'{"reach":"not_returned"}',completeness:'complete',selected_payload:'{}',account_currency:'VND',spend:'123456789012345678901234.123456',impressions:'9007199254740993123456789'};
 await group('exact decimals/opaque IDs; revisions select latest without summing',async()=>{
  ids.insight=await insert('marketing_insight_observation',{...insight,id:randomUUID()});
  await insert('marketing_insight_observation',{...insight,id:randomUUID(),revision:2,spend:'10.250000'});
  await rejects(()=>insert('marketing_insight_observation',{...insight,id:randomUUID()}),['ER_DUP_ENTRY']);
  const [[first]]=await c.execute('SELECT spend,impressions,reach,external_ad_id FROM marketing_insight_observation WHERE tenant_id=? AND id=?',[tenantA,ids.insight]);assert.equal(first.spend,insight.spend);assert.equal(first.impressions,insight.impressions);assert.equal(first.reach,null);assert.equal(first.external_ad_id,adExternal);
  const [[current]]=await c.execute('SELECT spend FROM marketing_insight_observation WHERE tenant_id=? AND account_id=? AND grain_id=? ORDER BY revision DESC LIMIT 1',[tenantA,accountA,ids.grain]);assert.equal(current.spend,'10.250000');
 });
 await group('Insights cannot point to other ad, tenant, Page or period',async()=>{
  for(const change of [{date_stop:'2026-10-08'},{external_ad_id:'unrelated-ad'},{admission_page_id:'foreign-page'},{sync_run_id:ids.b.run}])await rejects(()=>insert('marketing_insight_observation',{...insight,id:randomUUID(),revision:3,...change}),fkErrors);
 });
 await group('age and region metrics stored separately without CRM conversion fields',async()=>{
  for(const profile of ['age','region'])await insert('marketing_insight_observation',{...insight,id:randomUUID(),grain_id:ids[profile],spend:'3.250000',[profile]:profile==='age'?'25-34':'synthetic-region'});
  const [rows]=await c.execute('SELECT g.dataset_profile,COUNT(*) n FROM marketing_insight_observation o JOIN marketing_insight_grain g ON g.tenant_id=o.tenant_id AND g.account_id=o.account_id AND g.id=o.grain_id WHERE o.tenant_id=? AND o.account_id=? GROUP BY g.dataset_profile',[tenantA,accountA]);assert.equal(rows.length,3);
  const [cols]=await c.query("SELECT COLUMN_NAME col FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='marketing_insight_observation'");assert(!cols.some(x=>/contact|lead|deal|won/.test(x.col)));
 });
 await group('action windows and metric kinds remain separate',async()=>{
  const action={tenant_id:tenantA,account_id:accountA,observation_id:ids.insight,action_type:'lead',window_key:'value',metric_kind:'actions',value:'12.500000',created_at:now};
  await insert('marketing_insight_action',{...action,id:randomUUID()});
  await insert('marketing_insight_action',{...action,id:randomUUID(),window_key:'7d_click'});
  await insert('marketing_insight_action',{...action,id:randomUUID(),metric_kind:'action_values'});
  await rejects(()=>insert('marketing_insight_action',{...action,id:randomUUID()}),['ER_DUP_ENTRY']);
 });
 await group('unknown provider enum and field coverage retained; JSON bounded',async()=>{
  await c.execute('UPDATE marketing_ad SET effective_status=?,field_coverage=? WHERE tenant_id=? AND id=?',['FUTURE_STATUS','{"name":"forbidden"}',tenantA,ids.ad]);
  await rejects(()=>c.execute('UPDATE marketing_ad SET field_coverage=? WHERE tenant_id=? AND id=?',[JSON.stringify({tooLarge:'x'.repeat(1048600)}),tenantA,ids.ad]),checkErrors);
 });
 await group('all105 provider fields exist with dictionary nullability',async()=>{
  const dictionary=JSON.parse(await readFile('docs/data/marketing-storage-dictionary.json','utf8'));
  const [cols]=await c.query('SELECT TABLE_NAME tbl,COLUMN_NAME col,IS_NULLABLE nullable FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()');
  for(const f of dictionary.fields){const actual=cols.find(x=>x.tbl===f.storage.table&&x.col===f.storage.column);assert(actual,f.storage.column);assert.equal(actual.nullable,f.storage.nullable?'YES':'NO');}
 });
 await group('runtime cannot DDL, alter history/journal or read CRM; operator schema-only',async()=>{
  const runtime=await connect(env,'RUNTIME');
  try{
   await rejects(()=>runtime.query('CREATE TABLE forbidden (id INT)'),['ER_TABLEACCESS_DENIED_ERROR']);
   await rejects(()=>runtime.query('SELECT * FROM schema_migration'),['ER_TABLEACCESS_DENIED_ERROR']);
   await rejects(()=>runtime.execute('UPDATE marketing_insight_observation SET spend=0 WHERE tenant_id=?',[tenantA]),['ER_TABLEACCESS_DENIED_ERROR']);
   await rejects(()=>runtime.query('SELECT * FROM agentic_crm.tenant LIMIT 1'),['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR']);
   await rejects(()=>c.query('SELECT * FROM agentic_crm.tenant LIMIT 1'),['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR']);
  }finally{await runtime.end();}
 });
 await group('migration rerun + concurrent runners + reconnect retain fixtures',async()=>{
  assert.equal((await migrate(c)).applied,0);const other=await connect(env);
  try{const results=await Promise.all([migrate(c),migrate(other)]);assert(results.every(x=>x.applied===0));const [[row]]=await other.execute('SELECT external_ad_id FROM marketing_ad WHERE tenant_id=? AND id=?',[tenantA,ids.ad]);assert.equal(row.external_ad_id,adExternal);}finally{await other.end();}
 });
 const [explain]=await c.execute('EXPLAIN SELECT spend FROM marketing_insight_observation WHERE tenant_id=? AND account_id=? AND grain_id=? ORDER BY revision DESC LIMIT 1',[tenantA,accountA,ids.grain]);assert(explain[0].key);
 passed.push('EXPLAIN current-grain lookup uses index');
 await mkdir('artifacts/marketing-database',{recursive:true});
 await writeFile('artifacts/marketing-database/tests-latest.json',JSON.stringify({environment:'persistent local MySQL test_crm_marketing',passed,groups:passed.length,tenantA,tenantB,reset:false,liveMeta:'NOT_RUN',explain},null,2));
 console.log(`PASS ${passed.length} Marketing database groups; persistent fixtures retained`);
}finally{await c.end();}
