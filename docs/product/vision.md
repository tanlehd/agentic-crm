# Tầm nhìn sản phẩm

Status: Ready for implementation — baseline phạm vi.

## Mục tiêu

Chuyển hội thoại thành kết quả CRM có thể đo: nhu cầu được qualify, sale tiếp nhận, lịch hẹn, cơ hội thắng và chăm sóc sau bán. Doanh nghiệp cấu hình object, quyền, quy trình và agent theo ngành mà không fork ứng dụng.

## Người sử dụng

| Persona | Công việc | Kết quả cần thấy |
|---|---|---|
| Tenant admin | Cấu hình user/seat/team, object, policy | Quyền rõ ràng, thay đổi có audit |
| Chat agent / supervisor | Nhận tin, qualify, hỗ trợ AI, phân công | Ít bỏ sót, phản hồi nhanh, Lead có chất lượng |
| Sales agent / manager | Nhận Lead, follow-up, đặt hẹn, cập nhật Deal | Pipeline rõ, Lead không mất khi bàn giao |
| Service agent | Nhận Ticket và escalation | Theo dõi SLA và giải quyết liên tục |
| Business analyst | Xem funnel, hiệu suất Human/AI | Metric rõ grain, attribution và phạm vi dữ liệu |
| Platform operator | Vận hành tenant, integration và worker | Phát hiện lỗi, replay an toàn, không truy cập nội dung mặc định |

## Năng lực và ranh giới

Platform gồm CRM core, conversation, workflow/chatflow, ticket, sales, AI routing, custom objects và reporting. Healthcare là gói cấu hình/fixtures kiểm thử tính tổng quát, không phải logic ngành hard-code trong core.

Đợt đầu không triển khai billing SaaS, EMR/EHR, chẩn đoán, kế toán, payment gateway, marketplace, email campaign hoặc mô hình huấn luyện riêng. Seat là entitlement chức năng; chưa có thu phí tự động. Không cố sao chép toàn bộ HubSpot/Salesforce/respond.io.

## Yêu cầu sản phẩm

| ID | Yêu cầu |
|---|---|
| REQ-01 | Cô lập tenant trên dữ liệu, cấu hình, integration và job |
| REQ-02 | Seat, role, team và phạm vi own/team/all độc lập, kiểm tra backend |
| REQ-03 | CRM lifecycle Contact → Lead → Deal → Customer không mất danh tính |
| REQ-04 | Custom object/property/association dùng lại trong form, workflow, report |
| REQ-05 | Inbound và command retry không tạo tác dụng trùng |
| REQ-06 | Conversation/Lead/Deal/Ticket có Human hoặc AI owner và lịch sử handoff |
| REQ-07 | AI bị giới hạn tool/policy; dừng khi mất quyền hoặc ownership |
| REQ-08 | Workflow/Chatflow có version, durable run và phục hồi sau restart |
| REQ-09 | Chat qualify → Lead → Sale có đầu mối và SLA bàn giao rõ |
| REQ-10 | Ticket có pipeline/SLA/escalation và liên kết CRM |
| REQ-11 | Funnel/attribution/report có grain, thời gian và quyền nhất quán |
| REQ-12 | Audit, trace và replay hỗ trợ điều tra mà không lộ secret |
| REQ-13 | Healthcare chứng minh extension qua Appointment/Service Offering |
| REQ-14 | Tài liệu → contract → acceptance → code truy vết được |

M1–M2 thành công khi mock case đi đến Lead được Sale nhận, không mất nguồn, không trùng do retry, có audit đầy đủ và vượt qua kiểm thử hai tenant. Hiệu quả kinh doanh thực tế chỉ đánh giá khi có dữ liệu vận hành; không đặt chỉ tiêu conversion giả định làm cam kết.
