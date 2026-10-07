# Chatflow Orchestrator

Status: Target architecture accepted direction — PLAN-005 / ADR-017. Service extraction/API/physical schema chưa Ready; không đồng nghĩa deployed. [Module hiện tại](../modules/chatflow.md) · [Catalog](README.md) · [Cross-service rules](../contracts/service-boundaries.md).

## Phạm vi và trách nhiệm

Versioned conversational graphs, session/turn, collected variables/drafts/provenance, Human pause/complete và Runtime coordination.

Ngoài phạm vi: Không canonical message store/owner hoặc Lead master; không tự phát send provider.

## Kiến trúc bên trong

Deploy unit đề xuất `services/chatflow` gồm NestJS API và worker entrypoints theo workload. Cấu trúc `domain`, `application`, `ports`, `adapters/http`, `adapters/events`, `adapters/persistence`, `migrations`, `tests`, `docs`. Domain không import database entity hoặc implementation của service khác. API/worker chỉ truy cập MySQL database và credentials riêng của service; module kernel dùng schema-local outbox/inbox/receipt/audit. Tham chiếu remote là ID có tenant/service/type, không cross-database foreign key. Đây là source layout đích, chưa tạo directory source rỗng.

## Data model nội bộ và nguồn chuẩn

Tên entities dưới đây là logical target model, không phải danh sách bảng đã migrate. Physical schema/DDL mỗi service phải chốt tại extraction task. tenant_id, version, timestamps/retention theo loại entity; session/account exceptions nêu rõ ở rows. UUID opaque được giữ khi chuyển từ monolith.

| Entity / aggregate | Fields chính / quan hệ | Invariant / authority |
|---|---|---|
| chatflow_definition / chatflow_version | tenant_id,id,version,graph,publish state | Immutable graph version; capability/field constraints |
| chatflow_session / node_run / turn | session_id,conversation_ref,parent_run_ref,node,status,owner_revision,last message ref,used turn keys | One active session/conversation; one consumption/session/message |
| draft / variable / provenance / effect_operation | value,source message ref,text_source,node,operation key,receipt,status | Extracted/preview dùng inference; consent chỉ original explicit inbound |

Mỗi service có local `outbox_event`, `consumer_inbox`, `idempotency_receipt`, `audit_entry` khi phát sinh mutation; key tenant+consumer+event hoặc tenant+actor+command+idempotency. Không dùng một bảng chung có multi-service writers. Local FK tenant-bound, cross-service reference được validate bằng API hoặc reconciled projection theo policy.

## API, commands và events

ReadMessage/AcquireExecutionAuthority/SendMessage ở Chat; Execute/Cancel ở Runtime; UpsertDraft/Qualify ở Sales. Consumes chat.owner.changed/message.received/runtime.completed; emits chatflow.completed/handoff_required.

Các tên interface/event ở đây là logical proposals, chưa endpoint/schema được triển khai. Exact OpenAPI/JSON Schema, auth scopes, errors, versions, payload minimization và consumer contract tests thuộc PLAN-006 gate; legacy wire types giữ nguyên tới compatibility cutover. Không dùng DTO chung để import domain/service implementation.

## Consistency, authorization và failure handling

Ownership change phải chặn new effects tại Chat authority dù pause event chưa tới. Receipt/session node CAS chống stale results; Human completion needs actual current ownership and original consent. No cross-service transaction for Lead/session completion: saga pending then receipt.

Transaction chỉ local state+audit+outbox/inbox. Network call không giữ SQL transaction; remote action phải có operation key/status/reconciliation. Trace propagation không thay tenant authorization. Read/write luôn kiểm tenant và current rights; owner/grant projections không đủ làm authority cho side effect.

## Vận hành và scale

Fenced session workers, durable timers/turn receipts. Runtime timeout route attention; message event duplicates không chạy turn lần hai. Persist references, tránh duplicate transcripts vào operations logs.

Owner vận hành là team sở hữu service (chưa gán người cụ thể). Bắt buộc readiness dependency-aware, liveness process-only, metrics latency/error/saturation/backlog, redacted tracing, restore drill và graceful shutdown leases. SLO/RPO/RTO và alert thresholds phải được chốt/test theo deployment gate; chưa có số liệu production để claim đạt.

## Source mapping và lộ trình tách

ChatflowConversationPort/ChatflowLeads/Runtime gọi local hiện tại. Replace lần lượt bằng versioned APIs; test delayed owner event, lost ACK, early result và replay trước extraction.

Rollback/cutover tuân [migration plan](../planning/microservices-migration.md): single writer, shadow read/hash reconciliation, durable event watermark; không dual-write thủ công, không sửa migrations1–18. Source implementation hiện hữu chỉ được nói DONE theo [tracker](../tracking/tasks.md).

## Acceptance trước service Ready

Own DB credentials không đọc được DB khác; API/consumer schemas và tenant ACL negative tests; duplicate/out-of-order/lost ACK; crash sau remote effect; permission/owner revoked; broker/downstream outage; poison event/DLQ replay; migrate/restore và compatibility với client/run phiên bản cũ. Thêm domain cases ở module hiện hữu; với Draft module phải chốt domain AC trước code. Chưa test service phân tán, tất cả gates này NOT_RUN.

## UX-002 — Conversation activity projection

Chatflow run/session binding đã verify phát automation.conversation_activity.v1 theo [workspace contract](../contracts/agent-chat-workspace.md); source_service=chatflow, run_id là session ID, source_revision là session version, definition_version_id là pinned Chatflow version. Chat chỉ hiển thị event có source read permission; không lộ variables/consent/private proposal. Snooze không pause session; Human takeover vẫn theo contract cũ. Producer implementation thuộc SRC-034, chưa triển khai.


## SRC-034 implementation

SRC-034 implements versioned session activity notifications and current source ACL port. Verification status and limitations: [task evidence](../tracking/details/SRC-034.md).
