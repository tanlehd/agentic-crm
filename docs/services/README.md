# Service catalog và ranh giới trách nhiệm

[Quy tắc nghiệm thu và triển khai chung](../governance/service-delivery-scope.md) (ADR-029) áp dụng cho mọi service bên dưới: producer/API hoàn tất ở boundary của owner; consumer nghiệp vụ nghiệm thu riêng. Chỉ rollout service được bàn giao và các unit thay đổi bắt buộc đã liệt kê, không toàn stack.

Mỗi tài liệu dưới đây mô tả trách nhiệm hiện hành, dữ liệu sở hữu, phần ngoài phạm vi, giao tiếp và contract nguồn chuẩn. Catalog không phải danh sách feature phải xây, số container bắt buộc hoặc bằng chứng đã deploy. [Tracker](../tracking/tasks.md) giữ trạng thái công việc; [topology](../system/deployment-topology.md) giữ hiện trạng vận hành; [execution log](../tracking/log.md) giữ lịch sử thay đổi.

| Service / component | Dữ liệu và trách nhiệm chính | Ranh giới quan trọng |
|---|---|---|
| [Identity](identity.md) | Auth/session, principal/team/roles, current authorization, app grants | Không sở hữu business record hoặc Conversation owner |
| [CRM](crm.md) | Contact/mapping, Company/Activity, custom record và metadata | Không đặt lifecycle cho Chat/Sales/Ticket |
| [Connector](crm-connector.md) | Connection/credential, webhook, transport/receipt, referral evidence | Không sở hữu Contact hay chat timeline |
| [Chat](chat.md) | Conversation/episode/message/owner, outbound và workspace | Không archive Contact hoặc sửa Sales outcome |
| [Sales](sales.md) | Lead/Deal, qualification/handoff, stage/outcome/value và nguồn | Không đổi Conversation owner hoặc Contact master trực tiếp |
| [Routing](routing.md) | Matching/queue/rules/capacity/proposal | Owner service quyết định assignment cuối cùng |
| [Workflow](workflow.md) | Definition/version/enrollment/run/wait và mọi business flow tự động hóa | Business record/permission vẫn thuộc owner; một service cho cả conversational flows |
| [AI Runtime](ai-runtime.md) | Agent/provider config, execution/tools/capacity | Tool effect phải qua business owner |
| [Media](media.md) | Private binary/asset/scan/extraction | Không thay consent/original message |
| [Ticket](ticket.md) | Yêu cầu hỗ trợ/resolution/owner; scope Draft | Không sao chép lifecycle chung từ CRM |
| [Reporting](reporting.md) | Model/report/dashboard/query/export/projections | Facts thuộc producer, không cross-service SQL |
| [Marketing](marketing.md) | Meta hierarchy/metadata/Insights replica/sync | Không sửa CRM attribution hoặc giữ message transport |
| [Operations](operations.md) | Audit/status projections, replay requests | Không sửa business DB hoặc bypass quyền |
| [Gateway/BFF](gateway.md) | Public routes/context/read composition | Không là business authority |

[External API facade](external-api.md) là adapter, không thêm service dữ liệu. [Workflow](workflow.md) là một service với editor/API/engine/worker bên trong, không có Chatflow hoặc Workflow API/Core service riêng. Catalog hiện có14ranh giới trách nhiệm; thay catalog không tăng số service đã deploy.

## Ranh giới chung

[Repository map](../architecture/repository-map.md) ánh xạ đủ các owner ở trên sang source hiện tại và path đích. Quy ước: một web app tại `apps/web`, backend theo `services/<owner>`, reusable libraries tại `packages`. `services/core-baseline` vẫn là baseline chuyển tiếp; vị trí thư mục/package không tự chứng minh runtime độc lập. Workflow Core hiện có là validator library, không thêm một service.

- Mỗi aggregate chỉ có một owner ghi dữ liệu. Service khác dùng versioned API/events hoặc projection có provenance; không SQL/FK/UoW xuyên service.
- [Schema catalog](../data/schema-catalog.md) và [ownership map](../data/service-ownership.md) xác định placement. Mọi application table có tenant_id NOT NULL; không sửa applied migration để phù hợp tài liệu mới.
- Identity quyết quyền; owner kiểm thêm điều kiện nghiệp vụ/version tại effect. Receipt, cached mapping hoặc event không tự cấp quyền.
- Chỉ dùng trạng thái, reservation, barrier hoặc saga khi một thao tác thực tế cần chúng. Không mặc định mọi entity có create/active/archived hoặc mọi mutation cần consumer drain. Gateway/UI không cần database/ledger chỉ để đủ template.
- Contract phải chỉ ra use case, producer/consumer, inputs/outputs và lỗi liên quan. Metadata mô tả capability đã có; không ép mọi owner hỗ trợ mọi CRUD/lifecycle.
- Test theo boundary thay đổi và rủi ro thực tế. Không bắt service triển khai broker, worker, DLQ, publish hay archive nếu phạm vi không sử dụng chúng.

## Cách đọc và cập nhật

Phạm vi phát triển bắt đầu từ service sở hữu nghiệp vụ trong catalog. Với mỗi thay đổi, xác định:

1. **Owner và kết quả:** service chịu trách nhiệm, use case cần phục vụ và phần ngoài phạm vi.
2. **Thiết kế chi tiết:** module design, contract/API/events, data ownership và acceptance được liên kết từ service doc. Bổ sung liên kết còn thiếu tại service đó; không chép logic vào README gốc.
3. **Phối hợp:** service cung cấp/tiêu thụ liên quan và thay đổi contract nếu có. Mỗi owner giữ trách nhiệm của mình; một luồng xuyên service không chuyển quyền sở hữu dữ liệu sang bên điều phối.
4. **Triển khai:** chọn task có dependency DONE và đúng phạm vi Ready trong [build plan](../planning/build-plan.md) và [tracker](../tracking/tasks.md). Catalog không tự mở rộng scope Draft hoặc tạo thêm task active.
5. **Nghiệm thu:** cập nhật thiết kế hiện hành tại service/contract liên quan; ghi kết quả, evidence và bước tiếp theo trong tracker/log/checkpoint.

Service doc giữ mô tả hiện hành; không chèn chuỗi cập nhật tiến độ đối nghịch ở đầu/cuối trang. Business states nằm trong contract của owner, physical schema nằm trong dictionary/migrations, runtime evidence nằm trong tracker/runbook. Draft phải ghi rõ use case chưa triển khai; không biến một proposal thành prerequisite của service khác.

Generic Contact archive và saga chặn Chat/Sales đã được bỏ khỏi phạm vi theo CHG-20261021-06. [Legacy compatibility](../contracts/legacy-record-archive.md) ghi code/data còn tồn tại; không yêu cầu service mới tái tạo chúng. Quyền/tenant isolation, provider state, session close và durable execution vẫn theo contract riêng.
