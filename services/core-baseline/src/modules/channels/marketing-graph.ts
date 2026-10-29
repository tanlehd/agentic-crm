import { CommandError } from '../../kernel/reliability/commands.js';
import { metadataProfile } from './marketing-contract.generated.js';
type Shape=true|{[key:string]:Shape}|readonly [Shape];
const reference:Shape={id:true,name:true};
const geo:Shape={countries:[true],regions:[{key:true,name:true}],cities:[{key:true,name:true,radius:true,distance_unit:true}],zips:[{key:true}],location_types:[true]};
const targetingGroup:Shape={interests:[reference],behaviors:[reference]};
const cta:Shape={type:true,value:{link:true,app_link:true,page:true}};
const storyContent:Shape={message:true,name:true,description:true,link:true,caption:true,image_hash:true,video_id:true,call_to_action:cta,child_attachments:[{link:true,name:true,description:true,image_hash:true,video_id:true,call_to_action:cta}]};
const shapes:Record<string,Shape>={
 business:{id:true},creative:{id:true},special_ad_categories:[true],special_ad_category_country:[true],adset_schedule:[{days:[true],start_minute:true,end_minute:true,timezone_type:true}],attribution_spec:[{event_type:true,window_days:true}],
 promoted_object:{page_id:true,pixel_id:true,application_id:true,custom_conversion_id:true,custom_event_type:true},
 targeting:{geo_locations:geo,excluded_geo_locations:geo,age_min:true,age_max:true,age_range:[true],genders:[true],locales:[true],flexible_spec:[targetingGroup],exclusions:targetingGroup,custom_audiences:[reference],excluded_custom_audiences:[reference],targeting_automation:{advantage_audience:true},targeting_relaxation_types:{custom_audience:true,lookalike:true},targeting_optimization:true,publisher_platforms:[true],device_platforms:[true],facebook_positions:[true],instagram_positions:[true],messenger_positions:[true],audience_network_positions:[true]},
 learning_stage_info:{status:true,last_sig_edit_ts:true,attribution_windows:[true]},issues_info:[{error_code:true,error_summary:true}],
 object_story_spec:{page_id:true,instagram_actor_id:true,link_data:storyContent,photo_data:storyContent,video_data:storyContent,text_data:storyContent,template_data:storyContent},
 asset_feed_spec:{bodies:[{text:true,adlabels:[reference]}],titles:[{text:true,adlabels:[reference]}],descriptions:[{text:true,adlabels:[reference]}],images:[{hash:true,adlabels:[reference]}],videos:[{video_id:true,adlabels:[reference]}],link_urls:[{website_url:true,display_url:true,adlabels:[reference]}],call_to_action_types:[true],ad_formats:[true],asset_customization_rules:[{customization_spec:{publisher_platforms:[true],facebook_positions:[true],instagram_positions:[true]},body_label:reference,title_label:reference,image_label:reference,video_label:reference,link_url_label:reference}]},
 degrees_of_freedom_spec:{creative_features_spec:{standard_enhancements:{enroll_status:true},image_touchups:{enroll_status:true},text_optimizations:{enroll_status:true}}},
 lookalike_spec:{country:true,ratio:true,starting_ratio:true,type:true,origin:[reference]},
};
function project(v:unknown,shape:Shape,depth=0):unknown{
 if(v===null)return null;if(depth>12)throw new CommandError(502,'PROVIDER_SHAPE_INVALID');
 if(shape===true){if(!['string','number','boolean'].includes(typeof v)||typeof v==='string'&&v.length>65535||typeof v==='number'&&(!Number.isFinite(v)||Number.isInteger(v)&&!Number.isSafeInteger(v)))throw new CommandError(502,'PROVIDER_SHAPE_INVALID');return v;}
 if(Array.isArray(shape)){if(!Array.isArray(v)||v.length>1000)throw new CommandError(502,'PROVIDER_SHAPE_INVALID');return v.map(x=>project(x,shape[0]!,depth+1));}
 if(!v||typeof v!=='object'||Array.isArray(v))throw new CommandError(502,'PROVIDER_SHAPE_INVALID');
 const out:Record<string,unknown>={};for(const [k,s] of Object.entries(shape))if(Object.hasOwn(v,k))out[k]=project((v as Record<string,unknown>)[k],s,depth+1);return out;
}
const opaque=(x:unknown):x is string=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,255}$/.test(x);
export class MarketingGraph {
 constructor(private readonly request:typeof fetch=fetch){}
 private async fetch(path:string,fields:string[],token:string,after?:string,limit?:number){
  if(!token||token.length>8192||/[\r\n\x00]/.test(token))throw new CommandError(422,'CREDENTIAL_INVALID');
  const p=new URLSearchParams({fields:fields.join(','),...(after?{after}:{}),...(limit?{limit:String(limit)}:{})});
  try{
   const r=await this.request('https://graph.facebook.com/v25.0/'+path+'?'+p,{headers:{authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(10000)});
   const reader=r.body?.getReader();if(!reader)throw new Error();const chunks:Uint8Array[]=[];let size=0;
   try{for(;;){const b=await reader.read();if(b.done)break;size+=b.value.length;if(size>1048576)throw new Error();chunks.push(b.value);}}finally{await reader.cancel();reader.releaseLock();}
   const text=Buffer.concat(chunks).toString('utf8');if(text.includes(token))throw new Error();const body=JSON.parse(text);if(!body||typeof body!=='object')throw new Error();
   if(!r.ok||body.error){const code=body.error?.code,rate=r.status===429||[4,17,32,613].includes(code),retry=rate||r.status>=500||body.error?.is_transient===true;throw new CommandError(retry?503:422,rate?'PROVIDER_RATE_LIMITED':[190,10,200].includes(code)||[401,403].includes(r.status)?'CREDENTIAL_DENIED':code===100?'PROVIDER_CAPABILITY_UNAVAILABLE':'PROVIDER_UNAVAILABLE');}return body;
  }catch(e){if(e instanceof CommandError)throw e;throw new CommandError(503,'PROVIDER_UNAVAILABLE');}
 }
 async verify(account:string,token:string){if(!opaque(account))throw new CommandError(400,'INVALID_REQUEST');const b=await this.fetch('act_'+account,['id','account_id','currency','timezone_name'],token);if(b.id!=='act_'+account||b.account_id!==account)throw new CommandError(409,'ACCOUNT_MISMATCH');const ads=await this.fetch('act_'+account+'/ads',['id','account_id'],token,undefined,1);if(!Array.isArray(ads.data)||ads.data.length>1||ads.data.some((x:any)=>!opaque(x.id)||x.account_id!==account))throw new CommandError(502,'ACCOUNT_MISMATCH');return {id:b.id,account_id:b.account_id};}
 async read(account:string,token:string,operation:string,external?:string,after?:string){
  const profile=metadataProfile.queries.find(q=>q.operation===(operation==='ads_page'?'ad':operation));if(!profile||!opaque(account)||external!==undefined&&!opaque(external)||after!==undefined&&(!/^[\x21-\x7e]{1,2048}$/.test(after)||operation!=='ads_page'))throw new CommandError(400,'INVALID_REQUEST');
  const paged=operation==='ads_page',path=paged?'act_'+account+'/ads':operation==='account'?'act_'+account:external;if(!path)throw new CommandError(400,'INVALID_REQUEST');
  const body=await this.fetch(path,profile.fields,token,after,paged?50:undefined);
  const select=(row:any)=>{if(!row||!opaque(row.id)||row.account_id!==account||!paged&&row.id!==path)throw new CommandError(502,'ACCOUNT_MISMATCH');const payload:Record<string,unknown>={},coverage:Record<string,string>={};for(const field of profile.fields){const key=field.split('{')[0]!;coverage[key]=!Object.hasOwn(row,key)?'not_returned':row[key]===null?'null':'present';if(Object.hasOwn(row,key))payload[key]=project(row[key],shapes[key]??true);}return {payload,field_coverage:coverage};};
  if(!paged)return {...select(body),api_version:'v25.0',fetched_at:new Date().toISOString()};
  if(!Array.isArray(body.data)||body.data.length>50)throw new CommandError(502,'PROVIDER_SHAPE_INVALID');const cursor=body.paging?.next?body.paging?.cursors?.after:null;if(cursor!==null&&(typeof cursor!=='string'||!/^[\x21-\x7e]{1,2048}$/.test(cursor)||cursor===after))throw new CommandError(502,'PROVIDER_CURSOR_INVALID');
  return {items:body.data.map(select),next_after:cursor,api_version:'v25.0',fetched_at:new Date().toISOString()};
 }
}
