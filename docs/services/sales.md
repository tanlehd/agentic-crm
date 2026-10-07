# Sales

Status: Target architecture accepted direction — PLAN-005 / ADR-017. Service extraction/API/physical schema chưa Ready; không đồng nghĩa deployed. [Module hiện tại](../modules/sales.md) · [Catalog](README.md) · [Cross-service rules](../contracts/service-boundaries.md).

## Phạm vi và trách nhiệm

Lead/draft/qualification, handoff/acceptance; Deal/Customer transitions thuộc future M4.

Ngoài phạm vi: Không thay Conversation owner khi Sales nhận Lead; Contact master và chat timeline thuộc service khác.

## Kiến trúc bên trong

Deploy unit đề xuất `services/sales` gồm NestJS API và worker entrypoints theo workload. Cấu trúc `domain`, `application`, `ports`, `adapters/http`, `adapters/events`, `adapters/persistence`, `migrations`, `tests`, `docs`. Domain không import database entity hoặc implementation của service khác. API/worker chỉ truy cập MySQL database và credentials riêng của service; module kernel dùng schema-local outbox/inbox/receipt/audit. Tham chiếu remote là ID có tenant/service/type, không cross-database foreign key. Đây là source layout đích, chưa tạo directory source rỗng.

## Data model nội bộ và nguồn chuẩn

Tên entities dưới đây là logical target model, không phải danh sách bảng đã migrate. Physical schema/DDL mỗi service phải chốt tại extraction task. Mọi application table có tenant_id NOT NULL theo [DB guideline](../data/database-guidelines.md); version/timestamps/retention theo loại entity. UUID opaque được giữ khi chuyển từ monolith.

| Entity / aggregate | Fields chính / quan hệ | Invariant / authority |
|---|---|---|
| lead / lead_draft / lead_handoff | tenant_id,id,contact_ref,conversation_ref,session_ref,qualification,consent_evidence_ref,status,owner_revision,version | One Lead/session idempotency local; handoff pending/accepted/cancelled |
| lead_owner / ownership_history / share_operation | principal_ref,team_ref,revision,contact_share_receipt,operation status | Authority Lead owner ở Sales; acceptance cần Contact-share prerequisite confirmed |
| deal / pipeline / customer_transition | target-only model: stage,amount,currency,won revision,contact/company refs | M4 Draft; không tạo bảng chỉ vì blueprint đổi |

Mỗi service có local `outbox_event`, `consumer_inbox`, `idempotency_receipt`, `audit_entry` khi phát sinh mutation; key tenant+consumer+event hoặc tenant+actor+command+idempotency. Không dùng một bảng chung có multi-service writers. Local FK tenant-bound, cross-service reference được validate bằng API hoặc reconciled projection theo policy.

## API, commands và events

UpsertQualificationDraft/QualifyLead/RequestHandoff/AcceptLead; EnsureContactShare tới CRM; emits sales.lead.qualified/handoff_requested/accepted. Consent evidence kiểm Chat API với tenant+message+source, không nhận arbitrary transcript làm consent.

Các tên interface/event ở đây là logical proposals, chưa endpoint/schema được triển khai. Exact OpenAPI/JSON Schema, auth scopes, errors, versions, payload minimization và consumer contract tests thuộc PLAN-006 gate; legacy wire types giữ nguyên tới compatibility cutover. Không dùng DTO chung để import domain/service implementation.

## Consistency, authorization và failure handling

Cross-service handoff là saga pending_access→ready→accepted; chưa confirmed share không báo acceptance DONE. Owner Contact/Lead/Conversation độc lập. Retry keyed action/session/command, không tạo Lead lần hai.

Transaction chỉ local state+audit+outbox/inbox. Network call không giữ SQL transaction; remote action phải có operation key/status/reconciliation. Trace propagation không thay tenant authorization. Read/write luôn kiểm tenant và current rights; owner/grant projections không đủ làm authority cho side effect.

## Vận hành và scale

Team acceptance races giải bằng local CAS. CRM/Identity unavailable giữ pending/attention, không grant giả hoặc rollback bằng xóa Contact.

Owner vận hành là team sở hữu service (chưa gán người cụ thể). Bắt buộc readiness dependency-aware, liveness process-only, metrics latency/error/saturation/backlog, redacted tracing, restore drill và graceful shutdown leases. SLO/RPO/RTO và alert thresholds phải được chốt/test theo deployment gate; chưa có số liệu production để claim đạt.

## Source mapping và lộ trình tách

CRM registry và Lead cùng transaction hiện tại phải tách ownership/version local. Chatflow→Sales save cần idempotent command receipts thay shared transaction.

Rollback/cutover tuân [migration plan](../planning/microservices-migration.md): single writer, shadow read/hash reconciliation, durable event watermark; không dual-write thủ công, không sửa migrations1–18. Source implementation hiện hữu chỉ được nói DONE theo [tracker](../tracking/tasks.md).

## Acceptance trước service Ready

Own DB credentials không đọc được DB khác; API/consumer schemas và tenant ACL negative tests; duplicate/out-of-order/lost ACK; crash sau remote effect; permission/owner revoked; broker/downstream outage; poison event/DLQ replay; migrate/restore và compatibility với client/run phiên bản cũ. Thêm domain cases ở module hiện hữu; với Draft module phải chốt domain AC trước code. Chưa test service phân tán, tất cả gates này NOT_RUN.
