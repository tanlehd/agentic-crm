# Yêu cầu nền tảng và traceability

Các mã REQ-01…14 được giữ để truy vết thiết kế và acceptance đã có. Chúng xuất phát từ baseline M1–M2 và các phần mở rộng được dự kiến; không phải danh mục đầy đủ của [tầm nhìn Agentic CRM](vision.md). Mỗi phạm vi chỉ Ready hoặc Implemented theo contract và evidence tương ứng. Lát cắt Messenger → Lead → Sales là một kịch bản kiểm chứng; các nguồn tương tác và mô hình vận hành khác có thể có luồng riêng.

| ID | Yêu cầu |
|---|---|
| REQ-01 | Cô lập tenant trên dữ liệu, cấu hình, integration và job |
| REQ-02 | Seat, role, team và phạm vi own/team/all độc lập, kiểm tra backend |
| REQ-03 | Liên kết Contact, Lead, Deal và quan hệ khách hàng, giữ danh tính và lịch sử xuyên nghiệp vụ; không bắt buộc mọi hồ sơ đi qua một chuỗi chuyển đổi |
| REQ-04 | Custom object/property/association dùng lại trong form, workflow, report theo capability của từng consumer |
| REQ-05 | Inbound và command retry không tạo tác dụng trùng |
| REQ-06 | Conversation/Lead/Deal/Ticket có Human hoặc AI owner và lịch sử handoff theo phạm vi owner hỗ trợ |
| REQ-07 | AI bị giới hạn tool/policy; dừng khi mất quyền hoặc ownership |
| REQ-08 | Workflow có version, durable run và phục hồi sau restart |
| REQ-09 | Qualification và bàn giao Lead cho Sales có đầu mối và SLA rõ; Chat → Lead → Sales là kịch bản nghiệm thu ban đầu |
| REQ-10 | Ticket có pipeline/SLA/escalation và liên kết CRM |
| REQ-11 | Funnel/attribution/report có grain, thời gian và quyền nhất quán |
| REQ-12 | Audit, trace và replay hỗ trợ điều tra mà không lộ secret |
| REQ-13 | Healthcare kiểm chứng extension qua Appointment/Service Offering trong phạm vi tương ứng |
| REQ-14 | Tài liệu → contract → acceptance → code truy vết được |

[Ma trận acceptance](../quality/acceptance.md) giữ mapping REQ→design→AC và bằng chứng từng phần. Kết quả của mock slice M1–M2 không nghiệm thu toàn bộ Marketing, Sales, Customer Service, các kênh tích hợp hoặc AI production. Hiệu quả kinh doanh cần dữ liệu vận hành thực tế; không cam kết KPI từ fixture.
