import type {Catalog,FieldDescriptor,MetricDescriptor} from './types.js';
import type {Operator,CollectionSpec} from './query-registry.js';
export function conversionCatalog(){
 const catalog:Catalog={objects:[],fields:[],relations:[],models:[],metrics:[]},operators:{descriptor:MetricDescriptor;operator:Operator}[]=[],collections:Record<string,Record<string,CollectionSpec>>={};
 type F=[string,string,FieldDescriptor['type'],string[]?];
 const add=(id:string,owner:string,grain:string,fields:F[])=>{catalog.objects.push({id,owner,grain,key:id+'.id'});for(const [key,label,type,values]of [['id','ID','reference'],...fields] as F[])catalog.fields.push({id:id+'.'+key,object:id,label,type,filterable:true,groupable:true,...(values?{values}:{})});};
 const source:F[]=[['origin_session_id','Phiên nguồn','reference'],['channel','Kênh nguồn','string'],['page_id','Page nguồn','string'],['ad_id','Ad nguồn','string'],['source_kind','Loại nguồn','string']];
 const owners:F[]=[['owner_id','Owner hiện tại','reference'],['team_id','Team hiện tại','reference']];
 add('cv_session','Chat','Một lượt hội thoại',[['conversation_id','Thread','reference'],['opened_at','Mở phiên','datetime'],['status','Trạng thái phiên','string'],...source.slice(1),['initial_owner_id','Người nhận đầu có evidence','reference'],['initial_team_id','Team nhận đầu có evidence','reference']]);
 const lead:F[]=[['created_at','Tạo Lead','datetime'],['canonical_id','Lead canonical','reference'],['status','Trạng thái Lead hiện tại','string'],...source,...owners];
 add('cv_lead','Sales','Một Lead gốc, gồm bản đã merge',lead);add('cv_canonical_lead','Sales','Một nhóm Lead theo canonical hiện tại',lead);
 add('cv_deal','Sales','Một Deal',[['created_at','Tạo Deal','datetime'],['closed_at','Chốt Deal','datetime'],['lead_id','Lead gốc','reference'],['canonical_lead_id','Lead canonical','reference'],['via_lead_session_id','Phiên nguồn qua Lead','reference'],['direct_session_id','Phiên nguồn Deal trực tiếp','reference'],['stage','Stage hiện tại','enum',['open','qualified','proposal','won','lost']],['amount','Giá trị Deal','money'],['currency','Tiền tệ','string'],...source,...owners]);
 add('cv_attention','Chat/Sales','Một đối tượng cần xem xét hiện tại',[['kind','Loại bản ghi','enum',['conversation','lead','deal']],['record_id','Mở bản ghi','reference'],['session_id','Phiên liên quan','reference'],['reason','Lý do cần xem xét','string'],['age_days','Tuổi công việc (ngày)','integer'],['as_of','Quan sát lúc','datetime'],...owners]);
 for(const [id,base,time,mode]of [['cv_sessions','cv_session','opened_at','acquisition_cohort'],['cv_leads_raw','cv_lead','created_at','acquisition_cohort'],['cv_leads_canonical','cv_canonical_lead','created_at','acquisition_cohort'],['cv_deals','cv_deal','created_at','acquisition_cohort'],['cv_won_activity','cv_deal','closed_at','activity'],['cv_actions','cv_attention','as_of','activity']] as const){
  catalog.models.push({id,version:1,base,timeField:base+'.'+time,mode,periodBasis:'event',relations:[]});const dimensions=catalog.fields.filter(f=>f.object===base).map(f=>f.id);collections[id]={};
  const metric=(key:string,label:string,operator:Operator,inputs:string[],unit:MetricDescriptor['unit']='count')=>{const descriptor:MetricDescriptor={id:id+'_'+key,version:1,label,grain:base,aggregation:operator.op==='distinct'?'count_distinct':operator.op,formula:label,unit,inputs,requires:operator.op==='ratio'?[operator.numerator,operator.denominator].map(x=>({id:x.split('@')[0]!,version:1})):[],dimensions,models:[id+'@1']};catalog.metrics.push(descriptor);operators.push({descriptor,operator});return descriptor.id;};
  metric('count',id==='cv_leads_raw'?'Lead gốc (gồm bản merge)':id==='cv_leads_canonical'?'Lead canonical':id==='cv_sessions'?'Phiên trong cohort':id==='cv_actions'?'Việc cần xem xét':'Deal trong cohort',{op:'distinct',collection:'base',field:base+'.id'},[base+'.id']);
  if(base==='cv_attention'){metric('age','Tuổi lớn nhất (ngày)',{op:'max',collection:'base',field:base+'.age_days'},[base+'.age_days']);continue;}
  const collection=(name:string,object:string,foreignKey:string,timeField:string,where?:CollectionSpec['where'])=>{collections[id]![name]={object,foreignKey,baseKey:base+'.id',timeField,...(where?{where}:{})};};
  const ratio=(key:string,label:string,numerator:string)=>metric(key,label,{op:'ratio',numerator:id+'_'+numerator+'@1',denominator:id+'_count@1',multiplier:100},[],'percent');
  const count=(name:string,label:string,field:string)=>{const c=collections[id]![name]!;metric(name,label,{op:'distinct',collection:name,field},[field,c.foreignKey,c.baseKey,c.timeField,...(c.where?[c.where.field]:[])]);};
  if(base==='cv_session'){
   collection('leads','cv_lead','cv_lead.origin_session_id','cv_lead.created_at');count('leads','Lead gốc từ cohort','cv_lead.id');
   metric('with_lead','Phiên có Lead',{op:'distinct',collection:'leads',field:'cv_lead.origin_session_id'},['cv_lead.origin_session_id','cv_lead.created_at']);ratio('lead_rate','Phiên → Lead (%)','with_lead');
  }
  const foreign=base==='cv_session'?'origin_session_id':base==='cv_lead'?'lead_id':base==='cv_canonical_lead'?'canonical_lead_id':'id';
  collection('deals','cv_deal','cv_deal.'+foreign,'cv_deal.created_at');collection('won','cv_deal','cv_deal.'+foreign,'cv_deal.closed_at',{field:'cv_deal.stage',value:'won'});
  count('deals','Số Deal','cv_deal.id');count('won','Số Deal won','cv_deal.id');
  for(const name of ['deals','won']){metric('with_'+name,(base==='cv_session'?'Phiên':base==='cv_deal'?'Deal':'Lead')+' có '+name,{op:'distinct',collection:name,field:'cv_deal.'+foreign},['cv_deal.'+foreign,collections[id]![name]!.timeField,'cv_deal.stage']);ratio(name+'_rate',(name==='won'?'Chuyển đổi won':'Chuyển đổi Deal')+' (%)','with_'+name);}
  metric('won_value','Giá trị won',{op:'sum',collection:'won',field:'cv_deal.amount'},['cv_deal.amount','cv_deal.currency','cv_deal.closed_at','cv_deal.stage','cv_deal.'+foreign],'currency');
  if(base==='cv_session')for(const [key,field,label]of [['direct_won','direct_session_id','Phiên có direct Deal won'],['via_lead_won','via_lead_session_id','Phiên qua Lead → Won']]){collection(key!,'cv_deal','cv_deal.'+field,'cv_deal.closed_at',{field:'cv_deal.stage',value:'won'});count(key!,label!,'cv_deal.'+field);ratio(key+'_rate',label+' (%)',key!);}
 }
 return {catalog,operators,collections};
}
