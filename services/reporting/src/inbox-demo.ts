import {syntheticCatalog} from './synthetic-source.js';
import type {Catalog,FieldType,MetricDescriptor,Definition} from './types.js';
import type {Operator} from './query-registry.js';
import {ImmutableSnapshotAdapter,type Observation,type ProjectionContext,type Scalar} from './projection-contract.js';

export const inboxDemoWindow={historyFrom:'2026-10-14T02:00:00.000Z',observedThrough:'2026-10-14T03:00:00.000Z'};
export const inboxDemoNamespace='inbox50_v1';
export type DemoState='lead'|'information'|'spam'|'silent'|'queued';
export interface DemoIdentity {session:string;conversation:string;contact:string;lead?:string;agent?:string}
export interface DemoEpisode extends DemoIdentity {index:number;ad:string;agentLabel:string|null;state:DemoState;arrival:string;acceptedAt:string|null;firstReplyAt:string|null}
const iso=(seconds:number)=>new Date(Date.parse(inboxDemoWindow.historyFrom)+seconds*1000).toISOString();
export function inboxDemoEpisodes(identities:DemoIdentity[]=[]):DemoEpisode[]{
 if(identities.length!==0&&identities.length!==50)throw Error('DEMO_IDENTITY_COUNT');
 const distribution:[DemoState,number[]][]=[['lead',[8,2,0]],['information',[5,4,1]],['spam',[1,3,1]],['silent',[1,3,1]],['queued',[5,8,7]]];
 const agents=[...new Set(identities.map(i=>i.agent).filter(Boolean))];
 if(identities.length&&(new Set(identities.map(i=>i.session)).size!==50||agents.length!==2||identities.slice(0,30).some(i=>!i.agent)||identities.slice(30).some(i=>i.agent)))throw Error('DEMO_IDENTITY_MAPPING');
 const out:DemoEpisode[]=[];
 for(const [state,counts] of distribution)for(let a=0;a<3;a++)for(let n=0;n<counts[a]!;n++){
  const i=out.length,arrival=i<30?i*70:2100+(i-30)*65,accepted=state==='queued'?null:arrival+30+(i%10)*25,reply=accepted===null?null:accepted+20+(i%5)*15;
  out.push({...identities[i]??{session:'S'+(i+1),conversation:'C'+(i+1),contact:'P'+(i+1),...(state==='lead'?{lead:'L'+(i+1)}:{})},index:i,ad:['Ad A · Nhu cầu rõ','Ad B · Nội dung rộng','Ad C · Thử nghiệm'][a]!,agentLabel:state==='queued'?null:['Alpha admin','Chat Anna'][identities.length?agents.indexOf(identities[i]?.agent):i%2]!,state,arrival:iso(arrival),acceptedAt:accepted===null?null:iso(accepted),firstReplyAt:reply===null?null:iso(reply)});
 }
 return out;
}
export function inboxDemoExtensions(){
 const catalog:Catalog={objects:[],fields:[],relations:[],models:[],metrics:[]},operators:{descriptor:MetricDescriptor;operator:Operator}[]=[];
 const object=(id:string,model:string,fields:Record<string,[FieldType,boolean,string]>)=>{
  catalog.objects.push({id,owner:'synthetic',grain:id+'_scenario',key:id+'.id'});
  const all:Record<string,[FieldType,boolean,string]>={id:['reference',false,'ID'],at:['datetime',true,'Thời điểm'],...fields};
  for(const [name,[type,groupable,label]] of Object.entries(all))catalog.fields.push({id:id+'.'+name,object:id,type,groupable,filterable:groupable,label});
  catalog.models.push({id:model,version:1,base:id,timeField:id+'.at',mode:'activity',periodBasis:'event',relations:[]});
 };
 const counts:Record<string,[FieldType,boolean,string]>=Object.fromEntries(['received','accepted','queued','lead','information','spam','silent','interested','responded','sla_met','active'].map(k=>[k,['integer',false,k]]));
 object('inbox_episode','inbox_operations',{status:['string',true,'Trạng thái xử lý'],agent:['string',true,'Agent tiếp nhận'],ad:['string',true,'Quảng cáo nguồn'],arrival_slot:['string',true,'Khung nhận inbox'],...counts,accept_seconds:['integer',false,'Chờ tiếp nhận (giây)'],response_seconds:['integer',false,'Phản hồi đầu (giây)'],queue_age_seconds:['integer',false,'Tuổi hàng chờ (giây)']});
 object('inbox_activity','inbox_activity',{slot:['string',true,'Khung 15 phút'],...Object.fromEntries(['received','accepted','responded'].map(k=>[k,['integer',false,k] as [FieldType,boolean,string]]))});
 object('inbox_agent','agent_workload',{agent:['string',true,'Agent'],accepted:['integer',false,'Đã nhận'],active:['integer',false,'Đang giữ'],slots:['integer',false,'Sức chứa giả định'],staffed_hours:['integer',false,'Giờ trực giả định'],lead:['integer',false,'Phiên tạo Lead'],spam:['integer',false,'Spam đã đóng']});
 object('inbox_ad','ad_inbox_quality',{ad:['string',true,'Quảng cáo'],...counts,currency:['string',true,'Tiền tệ'],spend:['money',false,'Chi phí quảng cáo mô phỏng'],impressions:['integer',false,'Hiển thị mô phỏng'],clicks:['integer',false,'Click mô phỏng']});
 const metric=(model:string,id:string,label:string,op:Operator,unit:MetricDescriptor['unit']='count')=>{
  const m=catalog.models.find(m=>m.id===model)!,requires=op.op==='ratio'?[op.numerator,op.denominator].map(v=>({id:v.split('@')[0]!,version:1})):[],inputs=op.op==='ratio'?[]:[op.field,...(catalog.fields.find(f=>f.id===op.field)?.type==='money'?[m.base+'.currency']:[])];
  const descriptor:MetricDescriptor={id,version:1,label,grain:m.base,unit,aggregation:op.op==='distinct'?'count_distinct':op.op,inputs,requires,dimensions:catalog.fields.filter(f=>f.object===m.base&&f.groupable).map(f=>f.id),models:[model+'@1'],formula:op.op==='ratio'?`${op.multiplier} × ${op.numerator} / ${op.denominator} (recomputed totals)`:`${op.op}(${op.field}); nulls excluded for latency`};catalog.metrics.push(descriptor);operators.push({descriptor,operator:op});
 };
 const names:Record<string,string>={received:'Inboxes / phiên',accepted:'Đã tiếp nhận',queued:'Đang chờ agent',lead:'Đã tạo Lead',information:'Đang trao đổi thông tin',spam:'Spam đã xác nhận',silent:'Khách chưa trả lời sau tin đầu',interested:'Nhu cầu đã thể hiện',responded:'Đã gửi phản hồi đầu',sla_met:'Phản hồi ≤ 120 giây',active:'Phiên đang giữ'};
 for(const [model,obj,prefix] of [['inbox_operations','inbox_episode','ops'],['ad_inbox_quality','inbox_ad','adq']] as const){
  for(const [field,label] of Object.entries(names))metric(model,prefix+'_'+field,label,{op:'sum',collection:'base',field:obj+'.'+field});
  for(const [key,label,numerator,denominator]of [['accept_rate','Tỷ lệ tiếp nhận','accepted','received'],['lead_rate','Inbox → Lead','lead','received'],['lead_accepted_rate','Lead / đã tiếp nhận','lead','accepted'],['interest_rate','Nhu cầu / đã tiếp nhận','interested','accepted'],['spam_rate','Spam / đã tiếp nhận','spam','accepted'],['silent_rate','Khách im lặng / đã tiếp nhận','silent','accepted'],['sla_all','SLA phản hồi / tất cả inbox','sla_met','received'],['sla_responded','SLA / phiên đã phản hồi','sla_met','responded']])metric(model,prefix+'_'+key,label!,{op:'ratio',numerator:prefix+'_'+numerator+'@1',denominator:prefix+'_'+denominator+'@1',multiplier:100},'percent');
 }
 for(const [field,label] of [['accept_seconds','Chờ tiếp nhận'],['response_seconds','Phản hồi đầu'],['queue_age_seconds','Tuổi hàng chờ']] as const)for(const [suffix,op]of [['avg','avg'],['p50','percentile'],['p95','percentile'],['max','max']] as const)metric('inbox_operations','ops_'+field+'_'+suffix,label+' '+suffix+' (giây)',{op,collection:'base',field:'inbox_episode.'+field,...(op==='percentile'?{percentile:suffix==='p50'?50:95}:{})},'seconds');
 for(const field of ['received','accepted','responded'])metric('inbox_activity','activity_'+field,names[field]!,{op:'sum',collection:'base',field:'inbox_activity.'+field});
 for(const [field,label]of [['accepted','Tiếp nhận trong ca'],['active','Đang giữ'],['slots','Sức chứa giả định'],['staffed_hours','Tổng giờ-agent giả định'],['lead','Phiên có Lead'],['spam','Spam đã đóng']] as const)metric('agent_workload','agent_'+field,label,{op:'sum',collection:'base',field:'inbox_agent.'+field});
 metric('agent_workload','agent_occupancy','Mức sử dụng sức chứa',{op:'ratio',numerator:'agent_active@1',denominator:'agent_slots@1',multiplier:100},'percent');
 metric('agent_workload','agent_productivity','Phiên nhận / giờ-agent',{op:'ratio',numerator:'agent_accepted@1',denominator:'agent_staffed_hours@1',multiplier:1});
 for(const field of ['spend','impressions','clicks'])metric('ad_inbox_quality','adq_'+field,{spend:'Chi phí mô phỏng',impressions:'Hiển thị mô phỏng',clicks:'Click mô phỏng'}[field]!,{op:'sum',collection:'base',field:'inbox_ad.'+field},field==='spend'?'currency':'count');
 for(const [key,label,denominator]of [['cpl','Chi phí / Lead','lead'],['cpi','Chi phí / inbox','received'],['cost_interest','Chi phí / phiên có nhu cầu','interested']] as const)metric('ad_inbox_quality','adq_'+key,label,{op:'ratio',numerator:'adq_spend@1',denominator:'adq_'+denominator+'@1',multiplier:1},'currency');
 return {catalog,operators};
}
export function inboxDemoCatalog(){const original=syntheticCatalog(),extra=inboxDemoExtensions().catalog;return Object.fromEntries(Object.keys(original).map(k=>[k,[...original[k as keyof Catalog],...extra[k as keyof Catalog]]])) as unknown as Catalog;}
const statusLabel:Record<DemoState,string>={lead:'Đã tạo Lead',information:'Đang trao đổi thông tin',spam:'Spam',silent:'Khách chưa phản hồi',queued:'Chờ agent tiếp nhận'};
export function inboxDemoRows(identities:DemoIdentity[]=[]):Observation[]{
 const catalog=inboxDemoCatalog(),episodes=inboxDemoEpisodes(identities),out:Observation[]=[];
 const row=(object:string,id:string,values:Record<string,Scalar>)=>{const fields=Object.fromEntries(catalog.fields.filter(f=>f.object===object).map(f=>[f.id,null])) as Record<string,Scalar>;for(const [key,value]of Object.entries({id,...values}))fields[object+'.'+key]=value;out.push({object,id,revision:'1',deleted:false,observedAt:inboxDemoWindow.observedThrough,values:fields});};
 const slot=(at:string)=>{const minutes=(Date.parse(at)-Date.parse(inboxDemoWindow.historyFrom))/60000;return '09:'+String(Math.floor(minutes/15)*15).padStart(2,'0');};
 const inputs=episodes.map(e=>{
  const response=e.firstReplyAt===null?null:(Date.parse(e.firstReplyAt)-Date.parse(e.arrival))/1000;
  const values={received:1,accepted:e.acceptedAt?1:0,queued:e.state==='queued'?1:0,lead:e.state==='lead'?1:0,information:e.state==='information'?1:0,spam:e.state==='spam'?1:0,silent:e.state==='silent'?1:0,interested:['lead','information'].includes(e.state)?1:0,responded:e.firstReplyAt?1:0,sla_met:response!==null&&response<=120?1:0,active:!['queued','spam'].includes(e.state)?1:0};
  row('inbox_episode',e.session,{at:e.arrival,status:statusLabel[e.state],agent:e.agentLabel,ad:e.ad,arrival_slot:slot(e.arrival),...values,accept_seconds:e.acceptedAt?(Date.parse(e.acceptedAt)-Date.parse(e.arrival))/1000:null,response_seconds:response,queue_age_seconds:e.state==='queued'?(Date.parse(inboxDemoWindow.observedThrough)-Date.parse(e.arrival))/1000:null});
  for(const [kind,at] of [['received',e.arrival],['accepted',e.acceptedAt],['responded',e.firstReplyAt]] as const)if(at)row('inbox_activity',e.session+'_'+kind,{at,slot:slot(at),received:kind==='received'?1:0,accepted:kind==='accepted'?1:0,responded:kind==='responded'?1:0});return values;
 });
 const total=(indices:number[],field:keyof typeof inputs[number])=>indices.reduce((n,i)=>n+inputs[i]![field],0);
 for(const [i,agent] of ['Alpha admin','Chat Anna'].entries()){const indices=episodes.filter(e=>e.agentLabel===agent).map(e=>e.index);row('inbox_agent','AGENT'+i,{at:inboxDemoWindow.historyFrom,agent,slots:12,staffed_hours:1,accepted:total(indices,'accepted'),active:total(indices,'active'),lead:total(indices,'lead'),spam:total(indices,'spam')});}
 const ads=[...new Set(episodes.map(e=>e.ad))];ads.forEach((ad,i)=>{const indices=episodes.filter(e=>e.ad===ad).map(e=>e.index),counts=Object.fromEntries(Object.keys(inputs[0]!).map(k=>[k,total(indices,k as keyof typeof inputs[number])]));row('inbox_ad','AD'+i,{at:inboxDemoWindow.historyFrom,ad,...counts,currency:'VND',spend:['800000.000000','600000.000000','300000.000000'][i]!,impressions:[12000,15000,8000][i]!,clicks:[200,240,130][i]!});});
 return out;
}
export function inboxDemoAdapter(context:ProjectionContext,identities:DemoIdentity[]=[]){return new ImmutableSnapshotAdapter(context,inboxDemoCatalog(),inboxDemoRows(identities),100,inboxDemoWindow);}
export interface DemoDashboard {kind:'dashboard';schemaVersion:1;description:string;widgets:{id:string;title:string;note:string;generation:string;definition:Definition}[]}
export function inboxDemoDashboards(bindingId:string,generation:string):{name:string;definition:DemoDashboard}[]{
 const widget=(id:string,title:string,model:string,metrics:string[],dimensions:string[]=[],type:'kpi'|'table'|'bar'|'stacked_bar'|'donut'='table',note='')=>({id,title,note,generation,definition:{schemaVersion:1 as const,bindingId,model:{id:model,version:1},relations:[],dimensions,metrics:metrics.map(id=>({id,version:1})),filters:[],time:{mode:'activity' as const,from:inboxDemoWindow.historyFrom,to:inboxDemoWindow.observedThrough,asOf:inboxDemoWindow.observedThrough,timezone:'Asia/Ho_Chi_Minh',bucket:'day' as const},...(model==='ad_inbox_quality'?{currency:'VND'}:{}),visualization:type==='kpi'||type==='table'?{type:'table' as const}:{type,x:dimensions[0]!,y:metrics}}});
 return [
  {name:'Điều hành inbox · 50 phiên DEMO',definition:{kind:'dashboard',schemaVersion:1,description:'Mô phỏng ca 09:00–10:00 ngày 14/10/2026. 50 inbox; 30 đã nhận; 20 chờ. 2 agent × 12 slot. Thời gian và công suất là giả định, không phải đo tải thật. 15 phiên nhận/giờ-agent ⇒ cần 4 agent nếu giữ nguyên nhịp xử lý để cân bằng 50 inbox/giờ.',widgets:[
   widget('volume','Tiếp nhận và tồn hàng chờ','inbox_operations',['ops_received','ops_accepted','ops_queued','ops_accept_rate'],[],'kpi','Mẫu số 50 phiên; tiếp nhận không đồng nghĩa đã giải quyết.'),
   widget('state','Trạng thái 50 lượt inbox','inbox_operations',['ops_received'],['inbox_episode.status'],'donut','10 Lead + 10 trao đổi + 5 spam + 5 khách im lặng + 20 chờ agent.'),
   widget('speed','Tốc độ phản hồi đầu','inbox_operations',['ops_responded','ops_response_seconds_avg','ops_response_seconds_p50','ops_response_seconds_p95','ops_sla_all','ops_sla_responded'],[],'kpi','Độ trễ trên 30 phiên đã gửi tin, không tính 20 chưa trả lời. SLA giả định 120 giây; hai tỷ lệ có mẫu số 50 và 30.'),
   widget('queue','Chờ tiếp nhận và tuổi hàng chờ','inbox_operations',['ops_accept_seconds_avg','ops_accept_seconds_p95','ops_queue_age_seconds_avg','ops_queue_age_seconds_p95','ops_queue_age_seconds_max'],[],'table','Chờ tiếp nhận trên 30 đã nhận; tuổi hàng chờ trên 20 chưa nhận tại 10:00.'),
   widget('flow','Luồng vào và xử lý mỗi 15 phút','inbox_activity',['activity_received','activity_accepted','activity_responded'],['inbox_activity.slot'],'bar','Tính theo thời điểm event. 50 vào/giờ, 30 nhận/giờ: hàng chờ tăng 20/giờ trong case.'),
   widget('capacity','Tải và năng lực theo agent','agent_workload',['agent_accepted','agent_active','agent_slots','agent_occupancy','agent_productivity','agent_lead','agent_spam'],['inbox_agent.agent'],'table','25 phiên còn giữ / 24 slot = 104,17%. 5 spam đã đóng giải phóng slot. Sức chứa 12 slot/agent là giả định.'),
  ]}},
  {name:'Chất lượng chuyển đổi quảng cáo · 50 phiên DEMO',definition:{kind:'dashboard',schemaVersion:1,description:'Cùng cohort 50 inbox từ 3 quảng cáo, snapshot 10:00. Phân biệt chất lượng khách với độ phủ xử lý: 20 phiên chưa nhận chưa thể kết luận chất lượng. Lead là nhu cầu đã tạo, chưa phải qualified hay Deal thắng. Chi phí/hiển thị/click hoàn toàn mô phỏng.',widgets:[
   widget('quality','Chuyển đổi và độ phủ xử lý','ad_inbox_quality',['adq_received','adq_accepted','adq_queued','adq_lead','adq_lead_rate','adq_lead_accepted_rate','adq_interest_rate'],[],'kpi','10/50=20% inbox → Lead; 10/30 = 33,33% Lead/đã nhận; 20/30 = 66,67% đã thể hiện nhu cầu.'),
   widget('coverage','Độ phủ tiếp nhận từng quảng cáo','ad_inbox_quality',['adq_accepted','adq_queued'],['inbox_ad.ad'],'bar','Ad A 15/20; B 12/20; C 3/10. Không so sánh chất lượng mà bỏ qua phần chờ.'),
   widget('outcomes','Kết quả xử lý theo quảng cáo','ad_inbox_quality',['adq_lead','adq_information','adq_spam','adq_silent','adq_queued'],['inbox_ad.ad'],'bar','Các nhóm loại trừ nhau; mỗi session chỉ tính một lần.'),
   widget('rates','Chất lượng trên tập đã tiếp nhận','ad_inbox_quality',['adq_accept_rate','adq_lead_rate','adq_lead_accepted_rate','adq_interest_rate','adq_spam_rate','adq_silent_rate'],['inbox_ad.ad'],'table','Cỡ mẫu đã xử lý A 15 / B 12 / C 3. Còn non dữ liệu; không coi 0 Lead ở C là bằng chứng quảng cáo vô giá trị.'),
   widget('cost','Hiệu quả chi phí mô phỏng','ad_inbox_quality',['adq_spend','adq_received','adq_lead','adq_cpi','adq_cpl','adq_cost_interest'],['inbox_ad.ad'],'table','Chi phí 1,7 triệu VND tính đúng một lần/Ad; CPL tổng 170.000 VND. Ad C chưa có Lead ⇒ CPL chưa xác định, không phải 0.'),
  ]}},
 ];
}
