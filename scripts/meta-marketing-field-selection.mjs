import { readFile,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const sourceDirectory='docs/references/meta/2026-10-07-marketing';
const selections={
 'ad-account':['marketing_account','id account_id name account_status disable_reason currency timezone_id timezone_name timezone_offset_hours_utc business spend_cap'],
 campaign:['marketing_campaign','id account_id name objective buying_type status effective_status daily_budget lifetime_budget budget_remaining bid_strategy special_ad_categories special_ad_category_country is_adset_budget_sharing_enabled start_time stop_time created_time updated_time'],
 'ad-set':['marketing_ad_set','id account_id campaign_id name status effective_status destination_type optimization_goal billing_event bid_strategy bid_amount daily_budget lifetime_budget budget_remaining start_time end_time adset_schedule is_dynamic_creative attribution_spec promoted_object targeting learning_stage_info issues_info created_time updated_time'],
 ad:['marketing_ad','id account_id campaign_id adset_id name creative status effective_status issues_info created_time updated_time'],
 creative:['marketing_creative','id account_id name actor_id object_story_spec instagram_user_id object_story_id effective_object_story_id effective_instagram_media_id body title asset_feed_spec image_hash video_id thumbnail_url call_to_action_type url_tags degrees_of_freedom_spec'],
 'custom-audience':['marketing_audience_reference','id account_id name subtype lookalike_spec'],
 'account-insights':['marketing_insight_observation','account_id campaign_id adset_id ad_id account_currency date_start date_stop impressions clicks inline_link_clicks reach spend actions action_values attribution_setting']
};
const ids={'ad-account':'provider_node_id',campaign:'external_campaign_id','ad-set':'external_adset_id',ad:'external_ad_id',creative:'external_creative_id','custom-audience':'external_audience_id'};
const aliases={account_id:'external_account_id',campaign_id:'external_campaign_id',adset_id:'external_adset_id',ad_id:'external_ad_id',created_time:'provider_created_at',updated_time:'provider_updated_at',status:'configured_status',account_status:'account_status_code',disable_reason:'disable_reason_code',timezone_id:'provider_timezone_id',timezone_offset_hours_utc:'observed_utc_offset_hours',body:'provider_body',title:'provider_title',url_tags:'provider_url_tags',degrees_of_freedom_spec:'creative_transformation_spec',asset_feed_spec:'asset_feed'};
const fields=[];
for(const [source,[entity,keys]] of Object.entries(selections)){
 const file=source+'.md.txt',lines=(await readFile(sourceDirectory+'/'+file,'utf8')).split('\n');
 for(const key of keys.split(' ')){
  const index=lines.findIndex(line=>line.startsWith('| `'+key+'`'));
  assert(index>=0,`${source}.${key} not found in official table`);
  const type=lines[index].split(' | ')[0].match(/\*([^*]+)\*/)?.[1]?.replace(/\[([^\]]+)\]\([^)]+\)/g,'$1');
  assert(type,`${source}.${key} provider type missing`);
  const nested=key==='business'?'id':key==='creative'?'id':null;
  let crmField=key==='id'?ids[source]:(aliases[key]??key);
  if(['daily_budget','lifetime_budget','budget_remaining','bid_amount','spend_cap'].includes(key))crmField=key+'_raw';
  if(key==='business')crmField='business_id';if(key==='creative')crmField='external_creative_id';
  fields.push({entity,provider_field:key,...(nested?{selected_child:nested}:{}),crm_field:crmField,provider_type:type,source_file:file,source_line:index+1,stage:source==='account-insights'?'separate-insights-scope':'metadata-sync',verification:'official-documentation-only; live field coverage NOT_RUN'});
 }
}
const output={status:'logical-selection-not-DDL-or-runtime',owner:'Marketing',target_schema:'crm_marketing',documentation_snapshot:'2026-10-07-marketing',semantics:'marketing-field-mapping.md',default_write_policy:'provider-read-only; adapter writes authorized tenant replica',fields};
await writeFile('docs/data/marketing-field-selection.json',JSON.stringify(output,null,2)+'\n');
console.log(`PASS ${fields.length} selected fields traced to official table rows`);
