# T06 — Chat producer, local consumers và ranh giới còn lại

SRC-109/T06 DONE, Codex 2026-10-25; T07 IN_PROGRESS, T08–T09 TODO. D3 3/6, local 2/14. Chat owner boundary đã có evidence; Workflow, Sales và Reporting nghiệm thu riêng. Next: đóng gói API/worker Chat độc lập theo T07, giữ main routing tới T09. [T06 acceptance](../../quality/t06-chat-boundary-acceptance.md).

Phạm vi hiện hành CHG-20261023-19 / ADR-029: [nghiệm thu theo owner](../../governance/service-delivery-scope.md). T06 chỉ đóng trách nhiệm Chat; nghiệp vụ consumer khác theo [bảng bàn giao](consumer-handoff.md). [Human-first](../human-first-omni-crm.md) tiếp tục áp dụng: AI-only execution deferred, retained state/control/backlog được bảo toàn hoặc drain/fence có evidence.

Thuộc SRC-109 / PLAN-057. Dependency **T05 DONE**. Owner **Codex, 2026-10-25, DONE**. [Quy tắc chung](../chat-extraction-execution.md), [tracker](../../tracking/tasks.md), [handoff](../../tracking/chat-extraction-handoff.md).

Đọc contracts/events T01, migration/partition T02 và [capability inventory](../../architecture/chat-consumer-matrix.md). Theo ADR-027, Workflow là một owner; Chatflow đã retire, không xây lại adapter/framework cũ.

## Phạm vi và đầu ra

Chat owns conversation/session/message/close commands and durable events. Agent and Workflow business processing, including follow-up/recover_need, is implemented and accepted externally. Workspace supplies source context to the owning CRM/Sales command. Chat does not require a dedicated recovery endpoint to close T06.

1. Hoàn thiện các Chat-owned domain command/query/proof theo caller và invariant trong [review còn lại](remaining-boundaries.md), không lấy mọi tên operation trong catalog làm một gate độc lập. Giữ current authorization, tenant/field policy, source/session refs, idempotency và receipt/status. Chat không nhận triển khai public Routing views/reroute, Workflow execution, Sales merge hoặc Reporting source adapter/snapshot/facts/registry/metric/drilldown làm gate của mình.
2. Hoàn thiện Chat transactional outbox/relay/event-read/status/replay, stable IDs/digests/subscription sequence, retry/restart/quarantine và backlog. Dùng HTTP bridge ADR-025/026 hiện hành; không mở Kafka PLAN-024B. Chứng minh delivery boundary với receiver kiểm contract bền vững; chưa cần mọi consumer nghiệp vụ chạy. Không ACK subscription thật bằng receipt từ test receiver.
3. Tách tám Chat-owned consumers, deadline/freshness/reliability scanners và local inbox khỏi baseline shared worker theo manifest T02. Incoming event adapters kiểm source binding và quyền hiện hành; không triển khai toàn bộ nghiệp vụ producer bên ngoài chỉ để test Chat inbox.
4. Giữ compatibility adapters trực tiếp cần cho public Chat operations T04/T05: Identity admission, CRM metadata/Contact/notes, Connector send/reference, Routing reservation/confirmation và Sales outcome receipts khi command yêu cầu. Dùng owner endpoints tương thích đang có; không bắt extract/deploy dependency. Event đã phát không thay kết quả synchronous command.
5. Kiểm source/DI/SQL/grants hai chiều; lập exact old Chat writer/route/job/subscription inventory và replacement/fence áp dụng T09. Không còn Chat runtime đọc SQL hoặc import domain của owner khác; baseline writers phải được route/fence khi cutover, không ngầm giữ shared UoW.
6. Ghi per-owner consumer backlog và trạng thái thực theo bảng bàn giao. Giữ pending receipts/events và retained AI state; không xóa subscriber để làm queue sạch. Chỉ sửa adapter/fence bên owner khác khi cần giữ Chat contract hoặc single writer, không mở thêm feature.

## Tiêu chí hoàn tất

- Các phần Chat-owned và compatibility bắt buộc của 16 nhóm có implementation và boundary evidence; mỗi phần other-owner có backlog rõ, không phải gate đóng T06.
- Chat producer giao đúng transport contract; Chat local consumer/scanner có integration, dedup/replay/gap/restart/recovery evidence. Wrong-tenant/current-rights và stale-control cases được kiểm theo phần thay đổi.
- Inventory ghi rõ old Chat writers sẽ bị loại/fence, dependency contracts/grants và entrypoints cho T07; không rebaseline để giấu coupling.
- D3-03 review gồm T04/T05/T06 theo scope mới. D3-03 đạt theo [T06 acceptance](../../quality/t06-chat-boundary-acceptance.md), lũy kế3/6. T07 IN_PROGRESS; T08/T09 TODO, local2/14.

T08 nghiệm thu runtime các tính năng Chat và compatibility trực tiếp; downstream business E2E do owning service nghiệm thu riêng. Tiếp tục tuần tự theo quyền đã chốt trong execution plan, không mở agent/task source song song hoặc deploy ngoài scope Chat.
