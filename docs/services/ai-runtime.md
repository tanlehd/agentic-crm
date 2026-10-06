# AI Runtime Platform

Status: Target architecture accepted direction — PLAN-005 / ADR-017. Service extraction/API/physical schema chưa Ready; không đồng nghĩa deployed. [Module hiện tại](../modules/agents.md) · [Catalog](README.md) · [Cross-service rules](../contracts/service-boundaries.md).

## Phạm vi và trách nhiệm

Provider catalog/binding/lifecycle/config versions, knowledge/instructions/tools, eval/testing, execution/tool runs, telemetry; CRM-managed và provider-managed modes.

Ngoài phạm vi: Không giữ channel credentials hoặc sở hữu Conversation/Lead owner. Routing allocation ở Routing service.

## Kiến trúc bên trong

Deploy unit đề xuất `services/ai-runtime` gồm NestJS API và worker entrypoints theo workload. Cấu trúc `domain`, `application`, `ports`, `adapters/http`, `adapters/events`, `adapters/persistence`, `migrations`, `tests`, `docs`. Domain không import database entity hoặc implementation của service khác. API/worker chỉ truy cập MySQL database và credentials riêng của service; module kernel dùng schema-local outbox/inbox/receipt/audit. Tham chiếu remote là ID có tenant/service/type, không cross-database foreign key. Đây là source layout đích, chưa tạo directory source rỗng.

## Data model nội bộ và nguồn chuẩn

Tên entities dưới đây là logical target model, không phải danh sách bảng đã migrate. Physical schema/DDL mỗi service phải chốt tại extraction task. tenant_id, version, timestamps/retention theo loại entity; session/account exceptions nêu rõ ở rows. UUID opaque được giữ khi chuyển từ monolith.

| Entity / aggregate | Fields chính / quan hệ | Invariant / authority |
|---|---|---|
| agent_definition / provider_binding / config_revision / sync_operation | tenant_id,agent_id,principal_ref,provider,external_asset_type/id,secret_ref,desired/observed config/version,status | Config authority ở Runtime; principal authority Identity; Meta BM budget cross-tenant authority riêng |
| knowledge_source / tool_definition / test_run / evaluation | source/version,state,tool allowlist,argument/result schema,eval summaries | No secret/transcript trong audit; content retention và field authorization |
| agent_execution / tool_execution / capacity_lease | session_ref,conversation_ref,owner_revision,policy revision,action/call id,dispatch fence,status,deadline | Durable execution/cancel/tool effect receipts; capacity leased, not conversation owner count |

Mỗi service có local `outbox_event`, `consumer_inbox`, `idempotency_receipt`, `audit_entry` khi phát sinh mutation; key tenant+consumer+event hoặc tenant+actor+command+idempotency. Không dùng một bảng chung có multi-service writers. Local FK tenant-bound, cross-service reference được validate bằng API hoặc reconciled projection theo policy.

## API, commands và events

ConfigureAgent/TestAgent/Execute/CancelExecution; Chat authorization + tool gateway calls owning service APIs. Emits runtime.execution.completed/failed. Hosted provider callbacks cần trusted subject/replay binding trước mutable tools.

Các tên interface/event ở đây là logical proposals, chưa endpoint/schema được triển khai. Exact OpenAPI/JSON Schema, auth scopes, errors, versions, payload minimization và consumer contract tests thuộc PLAN-006 gate; legacy wire types giữ nguyên tới compatibility cutover. Không dùng DTO chung để import domain/service implementation.

## Consistency, authorization và failure handling

CRM-managed proposal đi Chat send intent, không tự gửi provider. Provider-managed replies nhập từ Connector echoes; không tạo second send. Every tool rechecks current action authority, idempotency scoped execution/call; revoke không hứa thu hồi external effect đã chạy.

Transaction chỉ local state+audit+outbox/inbox. Network call không giữ SQL transaction; remote action phải có operation key/status/reconciliation. Trace propagation không thay tenant authorization. Read/write luôn kiểm tenant và current rights; owner/grant projections không đủ làm authority cho side effect.

## Vận hành và scale

Execution workers isolate tenant/provider quota, deadline/circuit breaker; persisted status khi queue mất. Secret manager binding scoped provider asset. Knowledge indexing/eval workers scale riêng nhưng cùng authority Runtime.

Owner vận hành là team sở hữu service (chưa gán người cụ thể). Bắt buộc readiness dependency-aware, liveness process-only, metrics latency/error/saturation/backlog, redacted tracing, restore drill và graceful shutdown leases. SLO/RPO/RTO và alert thresholds phải được chốt/test theo deployment gate; chưa có số liệu production để claim đạt.

## Source mapping và lộ trình tách

Mock execute/cancel M2 không đủ provider platform. Identity AiAgent+policy transaction thay bằng provisioning saga; G-08 hosted callbacks, Meta eligibility/BM authority vẫn gated.

Rollback/cutover tuân [migration plan](../planning/microservices-migration.md): single writer, shadow read/hash reconciliation, durable event watermark; không dual-write thủ công, không sửa migrations1–18. Source implementation hiện hữu chỉ được nói DONE theo [tracker](../tracking/tasks.md).

## Acceptance trước service Ready

Own DB credentials không đọc được DB khác; API/consumer schemas và tenant ACL negative tests; duplicate/out-of-order/lost ACK; crash sau remote effect; permission/owner revoked; broker/downstream outage; poison event/DLQ replay; migrate/restore và compatibility với client/run phiên bản cũ. Thêm domain cases ở module hiện hữu; với Draft module phải chốt domain AC trước code. Chưa test service phân tán, tất cả gates này NOT_RUN.
