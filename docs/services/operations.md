# Operations & Audit

ENV-003 developer tooling: [local service manager](../development/service-manager.md) observes/controls local processes and Compose infrastructure. It is independent of this target production service and does not implement tenant Operations APIs, central audit or remote Linux supervision.

Status: Target architecture accepted direction — PLAN-005 / ADR-017. Service extraction/API/physical schema chưa Ready; không đồng nghĩa deployed. [Module hiện tại](../modules/operations.md) · [Catalog](README.md) · [Cross-service rules](../contracts/service-boundaries.md).

## Phạm vi và trách nhiệm

Cross-service operational views, audit aggregation, DLQ/replay requests, incident traces và health dashboards.

Ngoài phạm vi: Không sửa business tables hoặc bypass service authorization khi retry/repair.

## Kiến trúc bên trong

Deploy unit đề xuất `services/operations` gồm NestJS API và worker entrypoints theo workload. Cấu trúc `domain`, `application`, `ports`, `adapters/http`, `adapters/events`, `adapters/persistence`, `migrations`, `tests`, `docs`. Domain không import database entity hoặc implementation của service khác. API/worker chỉ truy cập MySQL database và credentials riêng của service; module kernel dùng schema-local outbox/inbox/receipt/audit. Tham chiếu remote là ID có tenant/service/type, không cross-database foreign key. Đây là source layout đích, chưa tạo directory source rỗng.

## Data model nội bộ và nguồn chuẩn

Tên entities dưới đây là logical target model, không phải danh sách bảng đã migrate. Physical schema/DDL mỗi service phải chốt tại extraction task. Mọi application table có tenant_id NOT NULL theo [DB guideline](../data/database-guidelines.md); version/timestamps/retention theo loại entity. UUID opaque được giữ khi chuyển từ monolith.

| Entity / aggregate | Fields chính / quan hệ | Invariant / authority |
|---|---|---|
| audit_projection / service_checkpoint | tenant_id,event_id,service,actor ref,action,resource ref,result,trace,time | Authoritative audit appended locally at source; aggregator dedup, immutable retention |
| incident / replay_request | source service/operation/event refs,reason,requester,status,receipt | Replay command routed to source owner with policy, no direct queue payload edit |
| operational_projection | sanitized execution/delivery status,attempts,age,error code,watermark | No message body/secret/raw payload by default |

Mỗi service có local `outbox_event`, `consumer_inbox`, `idempotency_receipt`, `audit_entry` khi phát sinh mutation; key tenant+consumer+event hoặc tenant+actor+command+idempotency. Không dùng một bảng chung có multi-service writers. Local FK tenant-bound, cross-service reference được validate bằng API hoặc reconciled projection theo policy.

## API, commands và events

Consumes audit/operation events; ReadOperations, RequestReplay→owning service; source service reauthorizes/dedups. Metrics/traces pipeline separate from business event records.

Các tên interface/event ở đây là logical proposals, chưa endpoint/schema được triển khai. Exact OpenAPI/JSON Schema, auth scopes, errors, versions, payload minimization và consumer contract tests thuộc PLAN-006 gate; legacy wire types giữ nguyên tới compatibility cutover. Không dùng DTO chung để import domain/service implementation.

## Consistency, authorization và failure handling

Audit write local cùng mutation; central outage không mất audit nhờ outbox. Tenant operators chỉ tenant data; platform infra role không ngầm được đọc nội dung khách.

Transaction chỉ local state+audit+outbox/inbox. Network call không giữ SQL transaction; remote action phải có operation key/status/reconciliation. Trace propagation không thay tenant authorization. Read/write luôn kiểm tenant và current rights; owner/grant projections không đủ làm authority cho side effect.

## Vận hành và scale

Independent retention/search capacity; alert queue age, DLQ, authorization failures, saga stuck. Replay rate limited and audited; do not poison active workflows with incompatible old events.

Owner vận hành là team sở hữu service (chưa gán người cụ thể). Bắt buộc readiness dependency-aware, liveness process-only, metrics latency/error/saturation/backlog, redacted tracing, restore drill và graceful shutdown leases. SLO/RPO/RTO và alert thresholds phải được chốt/test theo deployment gate; chưa có số liệu production để claim đạt.

## Source mapping và lộ trình tách

Hiện Operations đọc qua monolith application services; migrate to projections/authorized status APIs. Historical audit partition mapping needs tenant+origin service IDs.

Rollback/cutover tuân [migration plan](../planning/microservices-migration.md): single writer, shadow read/hash reconciliation, durable event watermark; không dual-write thủ công, không sửa migrations1–18. Source implementation hiện hữu chỉ được nói DONE theo [tracker](../tracking/tasks.md).

## Acceptance trước service Ready

Own DB credentials không đọc được DB khác; API/consumer schemas và tenant ACL negative tests; duplicate/out-of-order/lost ACK; crash sau remote effect; permission/owner revoked; broker/downstream outage; poison event/DLQ replay; migrate/restore và compatibility với client/run phiên bản cũ. Thêm domain cases ở module hiện hữu; với Draft module phải chốt domain AC trước code. Chưa test service phân tán, tất cả gates này NOT_RUN.
