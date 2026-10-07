# Identity & Access

Status: Target architecture accepted direction — PLAN-005 / ADR-017. Service extraction/API/physical schema chưa Ready; không đồng nghĩa deployed. [Module hiện tại](../modules/identity.md) · [Catalog](README.md) · [Cross-service rules](../contracts/service-boundaries.md).

## Phạm vi và trách nhiệm

Tenant/account, membership, Human/AI principal, team/seat/roles, field policy và authorization revisions. Authentication native/password/session do CRM sở hữu trong MySQL theo [native auth](../contracts/native-auth.md) và ADR-021; bỏ Keycloak khỏi target.

Ngoài phạm vi: Không sở hữu conversation owner, business record hoặc lifecycle agent provider.

## Kiến trúc bên trong

Deploy unit đề xuất `services/identity` gồm NestJS API và worker entrypoints theo workload. Cấu trúc `domain`, `application`, `ports`, `adapters/http`, `adapters/events`, `adapters/persistence`, `migrations`, `tests`, `docs`. Domain không import database entity hoặc implementation của service khác. API/worker chỉ truy cập MySQL database và credentials riêng của service; module kernel dùng schema-local outbox/inbox/receipt/audit. Tham chiếu remote là ID có tenant/service/type, không cross-database foreign key. Đây là source layout đích, chưa tạo directory source rỗng.

## Data model nội bộ và nguồn chuẩn

Tên entities dưới đây là logical target model, không phải danh sách bảng đã migrate. Physical schema/DDL mỗi service phải chốt tại extraction task. Mọi application table có tenant_id NOT NULL, version/timestamps/retention theo loại entity; account/session thuộc system scope explicit theo [guideline](../data/database-guidelines.md). UUID opaque được giữ khi chuyển từ monolith.

| Entity / aggregate | Fields chính / quan hệ | Invariant / authority |
|---|---|---|
| account / tenant | account: login_key, credential/security revision trong system tenant; tenant: tenant_id=id,kind,status,locale,timezone,version | Account multi-membership được giữ; mọi table có tenant_id, không wildcard system access |
| membership / principal | tenant_id,id,account_id hoặc agent_ref,kind,status,seat,auth_revision | Human membership và principal atomic local; agent_ref là logical external reference |
| role / team / service_actor / field_policy | permissions,team members,service scopes,resource/field keys,revision | Policy là authority ở Identity; object metadata từ CRM qua versioned API, không FK xuyên DB |

Mỗi service có local `outbox_event`, `consumer_inbox`, `idempotency_receipt`, `audit_entry` khi phát sinh mutation; key tenant+consumer+event hoặc tenant+actor+command+idempotency. Không dùng một bảng chung có multi-service writers. Local FK tenant-bound, cross-service reference được validate bằng API hoặc reconciled projection theo policy.

## API, commands và events

Public auth/admin giữ gateway routes tương thích; internal AuthorizeAction/ResolvePrincipal/ReadPolicy; emits principal.access_changed, tenant.status_changed. Consumer chỉ cache projection, không tự cấp quyền.

Các tên interface/event ở đây là logical proposals, chưa endpoint/schema được triển khai. Exact OpenAPI/JSON Schema, auth scopes, errors, versions, payload minimization và consumer contract tests thuộc PLAN-006 gate; legacy wire types giữ nguyên tới compatibility cutover. Không dùng DTO chung để import domain/service implementation.

## Consistency, authorization và failure handling

Disable/permission revoke cần checked authorization trước side effect; revision event dùng invalidation, không thay kiểm tra authoritative. Agent provisioning liên AI Runtime là saga provisioning→active/failed, chưa active thì không eligible.

Transaction chỉ local state+audit+outbox/inbox. Network call không giữ SQL transaction; remote action phải có operation key/status/reconciliation. Trace propagation không thay tenant authorization. Read/write luôn kiểm tenant và current rights; owner/grant projections không đủ làm authority cho side effect.

## Vận hành và scale

API stateless; session/credential và rate-limit authority ở MySQL; MySQL auth outage fail closed. Identity outage chặn privileged writes; public reads chỉ theo policy cache gate đã được thiết kế, không tự cho phép stale token.

Owner vận hành là team sở hữu service (chưa gán người cụ thể). Bắt buộc readiness dependency-aware, liveness process-only, metrics latency/error/saturation/backlog, redacted tracing, restore drill và graceful shutdown leases. SLO/RPO/RTO và alert thresholds phải được chốt/test theo deployment gate; chưa có số liệu production để claim đạt.

SRC-038 native auth hiện chạy trong apps/backend; database agentic_crm, target crm_identity. Credentials/session/quyền kiểm trong MySQL; xem [runbook](../development/native-auth.md).

## Source mapping và lộ trình tách

Hiện ai_agent/agent_policy sống trong Identity schema. Giữ principal identity ở đây; chuyển provider config/execution policy sang AI Runtime có mapping và receipt, không move nguyên bảng theo folder.

Rollback/cutover tuân [migration plan](../planning/microservices-migration.md): single writer, shadow read/hash reconciliation, durable event watermark; không dual-write thủ công, không sửa migrations1–18. Source implementation hiện hữu chỉ được nói DONE theo [tracker](../tracking/tasks.md).

## Acceptance trước service Ready

Own DB credentials không đọc được DB khác; API/consumer schemas và tenant ACL negative tests; duplicate/out-of-order/lost ACK; crash sau remote effect; permission/owner revoked; broker/downstream outage; poison event/DLQ replay; migrate/restore và compatibility với client/run phiên bản cũ. Thêm domain cases ở module hiện hữu; với Draft module phải chốt domain AC trước code. Chưa test service phân tán, tất cả gates này NOT_RUN.
