import type {Definition} from './types.js';
import {digest} from './registry.js';
export function conversionTemplate(){
 const time={mode:'acquisition_cohort' as const,from:'2026-01-01T00:00:00.000Z',to:'2026-10-17T00:00:00.000Z',asOf:'2026-10-17T00:00:00.000Z',timezone:'Asia/Ho_Chi_Minh',bucket:'day' as const,rollingDays:30};
 const recipe=(key:string,label:string,model:string,metrics:string[],dimensions:string[]=[],note='')=>({key,label,note,definition:{schemaVersion:1,model:{id:model,version:1},bindingId:'11111111-1111-4111-8111-111111111111',relations:[],dimensions,metrics:metrics.map(id=>({id,version:1})),filters:[],time:{...time,...(model==='cv_actions'?{mode:'activity' as const}:{})},visualization:{type:dimensions.length?'table':'kpi'}} as Definition,layout:{x:0,y:0,w:6,h:6}});
 const recipes=[
  recipe('sessions','Hội thoại trong cohort','cv_sessions',['cv_sessions_count'],[],'Mỗi lượt trao đổi tính một lần; bao gồm phiên chưa có kết quả.'),
  recipe('lead_rate','Hội thoại → Lead','cv_sessions',['cv_sessions_lead_rate'],[],'Phiên có ít nhất một Lead / tất cả phiên; giữ nguồn gốc ban đầu.'),
  recipe('won_rate','Hội thoại → Won','cv_sessions',['cv_sessions_won_rate'],[],'Bao gồm Deal trực tiếp; không bắt buộc qua Lead.'),
  recipe('lead_won','Lead → Won (gộp trùng)','cv_leads_canonical',['cv_leads_canonical_won_rate'],[],'Cohort theo ngày tạo Lead canonical; Deal của Lead đã merge được giữ.'),
  recipe('won','Deal won từ cohort hội thoại','cv_sessions',['cv_sessions_won'],[],'Đếm Deal won một lần, kể cả nhiều phiên follow-up.'),
  recipe('source','Chuyển đổi theo Page nguồn','cv_sessions',['cv_sessions_count','cv_sessions_with_lead','cv_sessions_with_won','cv_sessions_lead_rate','cv_sessions_won_rate'],['cv_session.page_id'],'Tỷ lệ tính lại từ cùng cohort. Nguồn không rõ hiển thị —.'),
  recipe('branches','Nhánh qua Lead và Deal trực tiếp','cv_sessions',['cv_sessions_via_lead_won','cv_sessions_direct_won'],['cv_session.channel'],'Một phiên có thể có cả hai nhánh; không cộng hai nhánh thành tổng phiên won.'),
  recipe('owner','Chuyển đổi theo người nhận đầu','cv_sessions',['cv_sessions_count','cv_sessions_lead_rate','cv_sessions_won_rate'],['cv_session.initial_owner_id'],'Lịch sử có evidence; — là chưa có lịch sử. Không gán công cho owner hiện tại.'),
  recipe('actions','Việc cần xem xét để chuyển đổi','cv_actions',['cv_actions_age'],['cv_attention.kind','cv_attention.record_id','cv_attention.reason','cv_attention.owner_id'],'Bấm Mở bản ghi để xử lý. Tuổi tính theo ngày; thêm bộ lọc tuổi theo chính sách của đội. Đây là backlog hiện tại, không phải cohort.')
 ];
 const money=recipe('won_value','Giá trị Deal won theo ngày chốt','cv_won_activity',['cv_won_activity_won_value'],[],'Tiền tệ được chọn khi tạo dashboard. Đây là won value theo ngày chốt, không phải tiền đã thu.');money.definition.time.mode='activity';money.definition.currency='USD';money.definition.filters=[{field:'cv_deal.stage',op:'eq',value:'won'},{field:'cv_deal.currency',op:'eq',value:'USD'}];recipes.splice(5,0,money);
 const manifest={key:'business_conversion_v1',version:1,name:'Chuyển đổi hội thoại → Lead → Won',description:'Kết quả chuyển đổi và công việc cần xử lý. Mở report KPI để đặt mục tiêu, kỳ đo và thời gian theo dõi. Chưa đặt mục tiêu khi chưa có giá trị doanh nghiệp.',category:'Hiệu suất kinh doanh',environment:'connected',sourceSlot:'conversion',recipes};
 return {...manifest,contentHash:digest(manifest),reportCount:recipes.length};
}
