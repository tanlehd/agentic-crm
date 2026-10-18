import type {Catalog,FieldDescriptor,MetricDescriptor} from './types.js';
export const stageMetrics=[['sf_count','Đã qua bước','count'],['sf_previous_rate','Chuyển đổi từ bước trước (%)','percent'],['sf_overall_rate','Chuyển đổi từ bước đầu (%)','percent'],['sf_entries','Lượt vào stage trong kỳ','count'],['sf_exits','Lượt ra stage trong kỳ','count'],['sf_duration','Thời gian visit hoàn tất TB (giây)','seconds'],['sf_age','Tuổi stage đang mở TB (giây)','seconds'],['sf_pending','Chưa qua bước kế tại cutoff','count']] as const;
export function stageCatalog():Catalog{
 const c:Catalog={objects:[],fields:[],relations:[],models:[],metrics:[]};
 const object=(id:string,owner:string,fields:[string,FieldDescriptor['type']][])=>{c.objects.push({id,owner,grain:id,key:id+'.id'});for(const [key,type]of [['id','reference'],...fields] as [string,FieldDescriptor['type']][])c.fields.push({id:id+'.'+key,object:id,label:key,type,groupable:id==='sf_subject',filterable:id==='sf_subject'});};
 object('sf_subject','Chat/Sales',[['kind','string'],['record_id','reference'],['process_version','string'],['stage','string'],['started_at','datetime'],['coverage','string'],['closed_at','datetime'],['owner_id','reference'],['team_id','reference']]);
 object('sf_event','Chat/Sales',[['subject_id','reference'],['sequence','string'],['from_stage','string'],['to_stage','string'],['occurred_at','datetime'],['recorded_at','datetime']]);
 object('sf_stage','Chat/Sales',[['kind','string'],['process_version','string'],['key','string'],['label','string'],['position','integer']]);
 for(const kind of ['conversation','lead','deal'])c.models.push({id:'sf_'+kind,version:1,base:'sf_subject',timeField:'sf_subject.started_at',mode:'activity',periodBasis:'event',relations:[]});
 for(const [id,label,unit]of stageMetrics)c.metrics.push({id,version:1,label,unit,grain:'sf_subject',aggregation:unit==='percent'?'ratio':unit==='seconds'?'avg':'count_distinct',formula:label,inputs:c.fields.map(f=>f.id),requires:[],dimensions:c.fields.filter(f=>f.object==='sf_subject').map(f=>f.id),models:c.models.map(m=>m.id+'@1')} as MetricDescriptor);
 return c;
}
