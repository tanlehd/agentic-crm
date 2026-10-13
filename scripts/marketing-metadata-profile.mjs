// Design artifact generator/checker. Does not call Meta or schedule work.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=JSON.parse(fs.readFileSync('docs/data/marketing-storage-dictionary.json','utf8'));
const selected=source.fields.filter(f=>f.entity!=='marketing_insight_observation');
const operations={marketing_account:'account',marketing_campaign:'campaign',marketing_ad_set:'ad_set',marketing_ad:'ad',marketing_creative:'creative',marketing_audience_reference:'audience'};
const queries=Object.entries(operations).map(([table,operation])=>{
 const fields=selected.filter(f=>f.entity===table);
 assert(fields.length>0);assert(fields.some(f=>f.provider_field==='id'));
 return {operation,table,method:'GET',path:operation==='account'?'/v25.0/act_{authorized_account_id}':'/v25.0/{validated_external_id}',fields:fields.map(f=>f.provider_field+(f.selected_child?`{${f.selected_child}}`:'')),columns:fields.map(f=>f.storage.column),authorization:'credential-scoped account; Page admission before child persistence',live_verification:'NOT_RUN'};
});
const profile={schema_version:1,profile:'object_metadata_v1',status:'Ready design; backend NOT_IMPLEMENTED',api_version:'v25.0',provider_origin:'https://graph.facebook.com',required_read_permission:'ads_read',credential_authority:'channels-v1',source_dictionary:'marketing-storage-dictionary.json',metadata_field_count:selected.length,queries,scan:{operation:'ads_page',method:'GET',path:'/v25.0/act_{authorized_account_id}/ads',fields:queries.find(q=>q.operation==='ad').fields,limit:50,max_pages:1000,cursor_max_bytes:2048,follow_next_url:false},schedule:{interval_seconds:21600,min_interval_seconds:900,max_interval_seconds:604800,tick_seconds:15,lease_seconds:60,renew_seconds:20,max_consecutive_failures:8,max_global_accounts:4,max_account_writers:1,enabled_without_verified_binding:false},limits:{request_timeout_ms:10000,response_bytes:1048576,json_depth:12,json_array_elements:1000,selected_json_bytes:1048576},page_evidence:{typed_fields:['object_story_spec.page_id','actor_id'],conflict:'defer',absent:'defer',foreign:'skip',parse_post_id_prefix:false,require_authority_revision:true,credential_page_token_substitution:false},separate_scope:['insight_ad_daily_v1','insight_ad_age_daily_v1','insight_ad_region_daily_v1','report_builder'],source_refs:[{file:'ad-account.md.txt',line:137,contains:'`id`'},{file:'ad.md.txt',line:115,contains:'/act_<AD_ACCOUNT_ID>/ads'},{file:'creative.md.txt',line:250,contains:'Page ID'},{file:'creative.md.txt',line:295,contains:'Page ID'}]};
assert.equal(selected.length,88);
for(const q of queries){assert.equal(new Set(q.fields).size,q.fields.length);assert.equal(q.fields.length,q.columns.length);}
for(const ref of profile.source_refs){const text=fs.readFileSync('docs/references/meta/2026-10-07-marketing/'+ref.file,'utf8').split('\n')[ref.line-1];assert(text?.includes(ref.contains),JSON.stringify(ref));}
assert(profile.schedule.renew_seconds<profile.schedule.lease_seconds);
const path='docs/data/marketing-metadata-profile.json',output=JSON.stringify(profile,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(path,'utf8'),output);else fs.writeFileSync(path,output);
console.log(`PASS metadata design manifest: ${selected.length} fields,${queries.length} object queries + Ads scan; provider/Page source traces match; no network`);
