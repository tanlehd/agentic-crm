import type {Definition} from './types.js';
import {digest} from './registry.js';
export function operationsTemplate(){
 const time={mode:'activity' as const,from:'2026-10-01T00:00:00.000Z',to:'2026-10-17T00:00:00.000Z',asOf:'2026-10-17T00:00:00.000Z',timezone:'Asia/Ho_Chi_Minh',bucket:'day' as const,rollingDays:30};
 const recipe=(key:string,label:string,model:string,dimensions:string[],metrics:string[],relations:string[]=[],filters:Definition['filters']=[],note='')=>({key,label,note,definition:{schemaVersion:1 as const,model:{id:model,version:1},bindingId:'11111111-1111-4111-8111-111111111111',dimensions,metrics:metrics.map(id=>({id,version:1})),relations,filters,time,visualization:{type:'table' as const}},layout:{x:0,y:0,w:6,h:6}});
 const recipes=[
  recipe('workload','Workload và capacity hiện tại','ops_workload',['ops_agent.name'],['ops_workload_workload_sum','ops_workload_capacity_sum'],[],[],'Một dòng mỗi agent; snapshot hiện tại, pending/snooze vẫn chiếm tải.'),
  recipe('waiting','Hàng chờ theo queue và lý do','ops_waiting',['ops_queue.name','ops_queue_visit.blocked_reason'],['ops_waiting_count','ops_waiting_waiting_seconds_max'],['ops_queue_visit_to_ops_queue'],[{field:'ops_queue_visit.state',op:'eq',value:'waiting'}],'Chỉ lượt đang chờ; refresh để lấy tuổi chờ mới.'),
  recipe('outcomes','Hoàn tất và chuyển giao theo agent','ops_resolved',['ops_agent.name'],['ops_resolved_completed_sum','ops_resolved_transferred_sum'],['ops_assignment_to_ops_agent'],[],'Theo thời điểm kết thúc lượt; chuyển giao không tính hoàn tất.'),
  recipe('handling','Thời gian xử lý trung bình','ops_resolved',['ops_agent.name'],['ops_resolved_handling_seconds_avg'],['ops_assignment_to_ops_agent'],[{field:'ops_assignment.release_reason',op:'eq',value:'completed'}],'Giây giữ việc; gồm thời gian chờ khách. Tổng tính lại theo lượt.'),
  recipe('wait','Thời gian chờ trước phân công','ops_queue_exits',['ops_queue.name'],['ops_queue_exits_assigned_wait_seconds_avg'],['ops_queue_visit_to_ops_queue'],[{field:'ops_queue_visit.state',op:'eq',value:'assigned'}],'Theo thời điểm được phân công, không gồm lượt đang chờ.'),
  recipe('replies','Phản hồi theo nhân viên','ops_replies',['ops_agent.name'],['ops_replies_count'],['ops_reply_to_ops_agent'],[],'Yêu cầu gửi đã được hệ thống nhận; không phải xác nhận delivery/read.'),
  recipe('assigned','Lượt phân công theo ngày','ops_assigned',['ops_assignment.assigned_at'],['ops_assigned_count'],[],[],'Một công việc chuyển người có nhiều lượt phân công.')
 ];
 const styles:Definition['visualization'][]=[{type:'bar',x:'ops_agent.name',y:['ops_workload_workload_sum','ops_workload_capacity_sum']},{type:'table'},{type:'bar',x:'ops_agent.name',y:['ops_resolved_completed_sum','ops_resolved_transferred_sum']},{type:'kpi'},{type:'kpi'},{type:'horizontal_bar',x:'ops_agent.name',y:['ops_replies_count']},{type:'line',x:'ops_assignment.assigned_at',y:['ops_assigned_count']}];
 recipes.forEach((r,i)=>{(r.definition as Definition).visualization=styles[i]!;if(styles[i]!.type==='kpi')r.definition.dimensions=[];});
 const manifest={key:'conversation_operations_v1',version:1,name:'Vận hành hội thoại',description:'Dữ liệu CRM kết nối: workload, hàng chờ và hiệu suất xử lý. Tùy chỉnh từng report bằng builder.',category:'Vận hành hội thoại',environment:'connected',sourceSlot:'operations',recipes};
 return {...manifest,contentHash:digest(manifest),reportCount:recipes.length};
}
