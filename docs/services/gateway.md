# API Gateway & Workspace BFF

Status: Target architecture accepted direction — PLAN-005 / ADR-017. Service extraction/API/physical schema chưa Ready; không đồng nghĩa deployed. Module đích mới; chưa có service độc lập. · [Catalog](README.md) · [Cross-service rules](../contracts/service-boundaries.md).

## Phạm vi và trách nhiệm

TLS/routing/session integration, request context, workspace read composition, throttling và compatibility routes.

Ngoài phạm vi: Không giữ business state/owner, không sole authorization enforcement hoặc distributed transaction coordinator.

## Kiến trúc bên trong

Deploy unit đề xuất `services/gateway` gồm NestJS API và worker entrypoints theo workload. Cấu trúc `domain`, `application`, `ports`, `adapters/http`, `adapters/events`, `adapters/persistence`, `migrations`, `tests`, `docs`. Domain không import database entity hoặc implementation của service khác. Gateway/BFF stateless không cần business MySQL database hoặc outbox riêng. Session authority ở Identity, route config trong deployment config, optional cache Redis scoped. Chỉ gọi service APIs, không truy cập business database. Tham chiếu remote là ID có tenant/service/type, không cross-database foreign key. Đây là source layout đích, chưa tạo directory source rỗng.

## Data model nội bộ và nguồn chuẩn

Tên entities dưới đây là logical target model, không phải danh sách bảng đã migrate. Physical schema/DDL mỗi service phải chốt tại extraction task. Mọi application table có tenant_id NOT NULL theo [DB guideline](../data/database-guidelines.md); version/timestamps/retention theo loại entity. UUID opaque được giữ khi chuyển từ monolith.

| Entity / aggregate | Fields chính / quan hệ | Invariant / authority |
|---|---|---|
| session / csrf / request_context | session reference,selected tenant,native account/session ref,expiry,trace | Identity authority; durable session authority MySQL tại Identity, optional Redis cache; no credential browser |
| route_contract / compatibility_map | public API version,target service route,timeout/error mapping | Deployment config versioned; routing ownership cutover explicit |
| read_cache | tenant+principal+auth revision+query key,TTL | Optional; no cross-user/tenant cache, no stale response after revoke without defined policy |

Gateway không ghi business mutation receipt: owning service giữ receipt/audit. Route config và cache ở đây không phải schema business; không tạo database chỉ để đủ template.

## API, commands và events

Next.js → public gateway/BFF → owning services; auth via Identity. Connector public webhook path routes directly without Human session. Stream subscription auth via Chat; fan-out without reading Chat DB.

Các tên interface/event ở đây là logical proposals, chưa endpoint/schema được triển khai. Exact OpenAPI/JSON Schema, auth scopes, errors, versions, payload minimization và consumer contract tests thuộc PLAN-006 gate; legacy wire types giữ nguyên tới compatibility cutover. Không dùng DTO chung để import domain/service implementation.

## Consistency, authorization và failure handling

Ignore client supplied actor/internal service headers; derive tenant from authenticated membership or Connector credential binding. Service verifies signed audience-specific delegation and record permission again. Compose reads has no atomicity promise; partial unavailable states explicit.

Transaction chỉ local state+audit+outbox/inbox. Network call không giữ SQL transaction; remote action phải có operation key/status/reconciliation. Trace propagation không thay tenant authorization. Read/write luôn kiểm tenant và current rights; owner/grant projections không đủ làm authority cho side effect.

## Vận hành và scale

Bounded parallel calls/timeouts/circuit breakers; no cascading retry per hop. W3C trace propagation and sanitized errors; overload shedding, stable correlation IDs.

Owner vận hành là team sở hữu service (chưa gán người cụ thể). Bắt buộc readiness dependency-aware, liveness process-only, metrics latency/error/saturation/backlog, redacted tracing, restore drill và graceful shutdown leases. SLO/RPO/RTO và alert thresholds phải được chốt/test theo deployment gate; chưa có số liệu production để claim đạt.

## Source mapping và lộ trình tách

Hiện gateway nginx/API Nest routing; target BFF paths can retain /api/v1. No requirement to deploy BFF business logic as separate service if gateway sufficient; deploy unit remains stateless edge.

Rollback/cutover tuân [migration plan](../planning/microservices-migration.md): single writer, shadow read/hash reconciliation, durable event watermark; không dual-write thủ công, không sửa migrations1–18. Source implementation hiện hữu chỉ được nói DONE theo [tracker](../tracking/tasks.md).

## Acceptance trước service Ready

Own DB credentials không đọc được DB khác; API/consumer schemas và tenant ACL negative tests; duplicate/out-of-order/lost ACK; crash sau remote effect; permission/owner revoked; broker/downstream outage; poison event/DLQ replay; migrate/restore và compatibility với client/run phiên bản cũ. Thêm domain cases ở module hiện hữu; với Draft module phải chốt domain AC trước code. Chưa test service phân tán, tất cả gates này NOT_RUN.
