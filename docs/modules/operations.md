# MOD-11 — Audit & Operations

> Kiến trúc đích microservice theo ADR-017: [Operations & Audit](../services/operations.md). Nội dung implementation/UoW/FK dưới đây mô tả baseline monolith; không áp dụng transaction xuyên service. Service extraction chưa triển khai.
Status: Ready for implementation M1–M2. Requirements: REQ-05, REQ-08, REQ-12.

## Mục tiêu và phạm vi

Chứng minh ai làm gì, khôi phục công việc sau crash và xử lý integration lỗi mà không tạo business duplicate. Audit và technical log là hai luồng khác nhau.

## Actor và quyền

Tenant operator xem integration/run/audit theo role; platform operator chỉ thấy health/metadata hạ tầng mặc định. Replay command cần integration.retry hoặc automation.operate và reason; không cấp khả năng sửa raw payload đã được xử lý.

## Use case và state machine

Outbox pending → leased (persisted status `processing`) → dispatched; lease expired trở lại pending. Consumer inbox processing → completed cùng business transaction; worker crash trước commit không để inbox completed giả. Inbound delivery failed được retry với payload/key cũ, không tạo delivery mới.

Audit append-only ghi actor kind/id, action, resource, field names/redacted diff, outcome/reason, correlation/time. Business mutation thành công audit chung transaction; mutation bị deny ghi security audit độc lập không chứa record data bị cấm.

## Entity và invariant

[Reliability dictionary](../data/dictionary.md); idempotency response 7 ngày, permanent domain unique bảo vệ message/session/handoff sau thời hạn đó. Outbox/inbox dùng same tenant context. Lease fencing token ngăn worker cũ commit sau takeover. Correlation IDs không được dùng làm authorization.

Relay tick 1 giây, batch 100, lease 60 giây; retry delay theo [events](../contracts/events.md). Worker job payload chỉ IDs + tenant, fetch fresh data; không serialize toàn Contact/message vào queue.

## API và event

`GET /operations/audit` filter resource/correlation/time, cursor theo API conventions, quyền audit.read/all. `GET /operations/failed-deliveries` cần integration.read/all. Retry API trong [contract](../contracts/api.md). Các endpoint read không hiện secret hoặc raw PII; run detail cho người có quyền record liên quan.

## UI

Failed delivery list, sanitized error, attempts, next retry, correlation và nút retry có reason. Audit record detail chỉ hiện field được phép. Queue attention hiển thị handoff quá hạn, runtime error và message unknown riêng.

## Failure handling

Transient tối đa 5 retry; terminal error vào failed queue cần người xử lý. Manual retry cùng key có thể no-op nếu business đã commit. Provider unknown không được dùng generic retry button để resend; cần reconciliation route được chốt khi làm adapter thật.

## Acceptance và dependency

[AC-05, AC-08, AC-12, AC-17, AC-18](../quality/acceptance.md); là hạ tầng dùng chung cho các module. Log test assert không có secret/message body; restore/replay test thuộc gate M3 production.

## Mở rộng còn Draft

Retention/erasure, audit export compliance, incident runbook production, backup RPO/RTO và centralized observability stack phải được chốt trước production, không ảnh hưởng khả năng mock M2.

CHG-20261003-06: SRC-007 đã có transaction port/storage audit/idempotency/outbox phục vụ Identity admin; chưa có relay/inbox/lease execution hoặc cleanup receipt. SRC-008 dùng lại migration v3/v4 và port kernel, bổ sung consumer/fencing/retry và audit database grants, không tạo lại bảng đã có.

## SRC-008 delivery execution (CHG-20261003-07)

Relay M1 chạy registry consumer trong worker, port publish chỉ trả thành công khi mọi consumer tương ứng commit. MySQL là durable backlog; Redis outage không làm mất event. Không có CRM/workflow consumer trước module tương ứng; unknown event đi failed với mã sanitized, không silently acknowledge. Identity consumer `identity.access.v1` chỉ validate/acknowledge `principal.access_changed`: authorization hiện tại luôn đọc DB, chưa có cache hoặc execution để cancel. BullMQ dùng cho job wakeup ở modules sau, không là nguồn durable state.

Claim global batch tối đa 100 bằng row locks SKIP LOCKED; tất cả mutation/consume sau claim bind tenant+event+fencing token. Token tăng mỗi claim, lease 60 giây tính theo DB UTC. Dispatch/failed transition kiểm tra token và lease còn hiệu lực. Consumer khóa outbox row và kiểm lease trước và sau handler, transaction rollback cả side effect+inbox nếu lỗi/lease expired; handler chỉ transactional SQL/application ports, không external I/O. Duplicate giữ tombstone vĩnh viễn M1/M2. Retry 5 lần sau lần đầu, delay 1/5/30/120/600 giây; validation/permission terminal.

Receipt completed hết hạn sau 7 ngày từ completion; expiry được kiểm tra tại replay và cleanup theo batch trong worker. Pending cùng transaction business, không có pending commit bình thường. Caller vẫn bắt buộc load quyền hiện hành trước replay; kernel replay nhận callback bắt buộc để authorize stored response (record/field nếu module có policy). Audit app user chỉ SELECT/INSERT; schema journal SELECT-only; root credential chỉ có ở provisioning/grants one-shot. Runtime không có database-wide DML.

SRC-022 implementation follows [M2 workspace contract](../contracts/workspaces-m2.md): failed inbound listing/retry, Workflow run list/detail and read-only definition versions, Agent Runtime status/attention projection. Metadata only, current Conversation scope for runs, no request/result/tool payload. Audit viewer and raw outbox replay are outside this UI task.
