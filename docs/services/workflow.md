# Workflow platform — Web, API và Core

PLAN-024 / ADR-022, 2026-10-13 cập nhật **target architecture**: [Workflow Web](workflow-web.md) cho CMS, [Workflow API](workflow-api.md) sở hữu authoring/control trong crm_workflow, [Workflow Core](workflow-core.md) sở hữu execution trong crm_workflow_core. Kafka nhận CRM object changes; metadata object/property/association dùng chung CRM Base. [Architecture](../system/workflow-architecture.md) · [design plan](../planning/workflow-platform.md) · [metadata](../data/workflow-metadata.md). Architecture Ready, exact implementation gates TODO; source hiện hữu vẫn monolith.

Các phần bên dưới là mô tả target cũ của PLAN-005 để giữ lineage. ADR-022 thay single deploy unit/schema Workflow: definition/version về API; immutable installed artifact/run/step/wait/selection/action về Core, không shared SQL/UoW. Không còn dùng đề xuất services/workflow một schema chung để triển khai service mới.

Status: Target architecture accepted direction — PLAN-005 / ADR-017. Service extraction/API/physical schema chưa Ready; không đồng nghĩa deployed. [Module hiện tại](../modules/workflow.md) · [Catalog](README.md) · [Cross-service rules](../contracts/service-boundaries.md).

## Phạm vi và trách nhiệm

Versioned durable business graphs, run/step/wait/timer, saga coordination và action receipts.

Ngoài phạm vi: Không sở hữu Lead/Contact/Conversation state; không thực hiện SQL business services.

## Kiến trúc bên trong

Deploy unit đề xuất `services/workflow` gồm NestJS API và worker entrypoints theo workload. Cấu trúc `domain`, `application`, `ports`, `adapters/http`, `adapters/events`, `adapters/persistence`, `migrations`, `tests`, `docs`. Domain không import database entity hoặc implementation của service khác. API/worker chỉ truy cập MySQL database và credentials riêng của service; module kernel dùng schema-local outbox/inbox/receipt/audit. Tham chiếu remote là ID có tenant/service/type, không cross-database foreign key. Đây là source layout đích, chưa tạo directory source rỗng.

## Data model nội bộ và nguồn chuẩn

Tên entities dưới đây là logical target model, không phải danh sách bảng đã migrate. Physical schema/DDL mỗi service phải chốt tại extraction task. Mọi application table có tenant_id NOT NULL theo [DB guideline](../data/database-guidelines.md); version/timestamps/retention theo loại entity. UUID opaque được giữ khi chuyển từ monolith.

| Entity / aggregate | Fields chính / quan hệ | Invariant / authority |
|---|---|---|
| workflow_definition / workflow_version | tenant_id,id,version,graph,state,service_actor_ref,execution role ref | Published version immutable; runs pin version |
| workflow_run / step / wait / trigger_selection | run_id,node,attempt,deadline,fence,status,event match,selected trigger | One selection/event/definition; timer và wait persisted |
| workflow_action / compensation | action_key,target service,request digest,operation ref,receipt,compensation status | At-least-once commands với durable receipt; no blanket rollback |

Mỗi service có local `outbox_event`, `consumer_inbox`, `idempotency_receipt`, `audit_entry` khi phát sinh mutation; key tenant+consumer+event hoặc tenant+actor+command+idempotency. Không dùng một bảng chung có multi-service writers. Local FK tenant-bound, cross-service reference được validate bằng API hoặc reconciled projection theo policy.

## API, commands và events

Consume approved domain events; StartRun/CancelRun; typed action commands tới Chatflow/Sales/Routing; action status read/reconcile. Emits workflow.completed/failed. Events may arrive before wait registration: inbox lưu để match sau.

Các tên interface/event ở đây là logical proposals, chưa endpoint/schema được triển khai. Exact OpenAPI/JSON Schema, auth scopes, errors, versions, payload minimization và consumer contract tests thuộc PLAN-006 gate; legacy wire types giữ nguyên tới compatibility cutover. Không dùng DTO chung để import domain/service implementation.

## Consistency, authorization và failure handling

Crash sau remote commit trước local receipt phải reconcile bằng action key. Không retry mutation key mới. Compensation semantic theo action (release reservation/cancel pending), không reverse send/consent/accepted sale.

Transaction chỉ local state+audit+outbox/inbox. Network call không giữ SQL transaction; remote action phải có operation key/status/reconciliation. Trace propagation không thay tenant authorization. Read/write luôn kiểm tenant và current rights; owner/grant projections không đủ làm authority cho side effect.

## Vận hành và scale

Fenced local leases, DB timers source of truth, broker wakeup at-least-once. Worker scales by run partition; poison graph/version DLQ and operator controls.

Owner vận hành là team sở hữu service (chưa gán người cụ thể). Bắt buộc readiness dependency-aware, liveness process-only, metrics latency/error/saturation/backlog, redacted tracing, restore drill và graceful shutdown leases. SLO/RPO/RTO và alert thresholds phải được chốt/test theo deployment gate; chưa có số liệu production để claim đạt.

## Source mapping và lộ trình tách

Current shared-UoW action ports cần async operation contracts; không serialize TransactionScope qua broker. Cross-service saga behavior acceptance phải Ready trước switch.

Rollback/cutover tuân [migration plan](../planning/microservices-migration.md): single writer, shadow read/hash reconciliation, durable event watermark; không dual-write thủ công, không sửa migrations1–18. Source implementation hiện hữu chỉ được nói DONE theo [tracker](../tracking/tasks.md).

## Acceptance trước service Ready

Own DB credentials không đọc được DB khác; API/consumer schemas và tenant ACL negative tests; duplicate/out-of-order/lost ACK; crash sau remote effect; permission/owner revoked; broker/downstream outage; poison event/DLQ replay; migrate/restore và compatibility với client/run phiên bản cũ. Thêm domain cases ở module hiện hữu; với Draft module phải chốt domain AC trước code. Chưa test service phân tán, tất cả gates này NOT_RUN.

## UX-002 — Conversation activity projection

Run có Conversation binding verified phát automation.conversation_activity.v1 qua source outbox theo [workspace contract](../contracts/agent-chat-workspace.md), dùng pinned definition version/run revision và sanitized state. Chat không ghi run state, không dừng Workflow khi snooze. Source read permission vẫn bắt buộc trước khi hiển thị activity. Contract Ready, producer/consumer implementation thuộc SRC-034.


## SRC-034 implementation

SRC-034 implements verified Conversation-bound notifications and current run read authority via source port. Verification status and limitations: [task evidence](../tracking/details/SRC-034.md).

2026-10-16 / CHG-20261016-04: User authorized per-need AI enrichment and follow-up workflow; SRC-082 restores canonical conversation_id per CHG-20261016-05. PLAN-035/SRC-081 DONE; [runtime evidence](../tracking/details/SRC-081.md). See [contract](../contracts/need-follow-up.md). Forward34 renames four physical relationship columns; compatibility preserves immutable v1/graphs/receipts; real adapter configured explicitly; no invented provider result.

SRC-082 / CHG-20261016-05: [Conversation identity alignment](../contracts/conversation-identity.md) makes conversation_id canonical and preserves session_id episode semantics. Forward34 renames session_contribution/need_assessment/need_follow_up/sales_need_outcome.thread_id without changing IDs, grants, tenant ownership or cross-service boundaries. New need.assessed/classification events use v2; v1 artifacts stay readable. CI-01…03 validation tracked separately from SRC-081 history.
