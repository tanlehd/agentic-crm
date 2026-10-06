# CRM Core & Metadata

Status: Target architecture accepted direction — PLAN-005 / ADR-017. Service extraction/API/physical schema chưa Ready; không đồng nghĩa deployed. [Module hiện tại](../modules/crm.md) · [Catalog](README.md) · [Cross-service rules](../contracts/service-boundaries.md).

## Phạm vi và trách nhiệm

Contact/Company/Activity, canonical external identity→Contact mapping, provider profile observations, custom objects, schema/property/form/view/association metadata và registry catalog.

Ngoài phạm vi: Không làm single mutable registry cho owner/version của Chat, Sales, Ticket sau extraction.

## Kiến trúc bên trong

Deploy unit đề xuất `services/crm` gồm NestJS API và worker entrypoints theo workload. Cấu trúc `domain`, `application`, `ports`, `adapters/http`, `adapters/events`, `adapters/persistence`, `migrations`, `tests`, `docs`. Domain không import database entity hoặc implementation của service khác. API/worker chỉ truy cập MySQL database và credentials riêng của service; module kernel dùng schema-local outbox/inbox/receipt/audit. Tham chiếu remote là ID có tenant/service/type, không cross-database foreign key. Đây là source layout đích, chưa tạo directory source rỗng.

## Data model nội bộ và nguồn chuẩn

Tên entities dưới đây là logical target model, không phải danh sách bảng đã migrate. Physical schema/DDL mỗi service phải chốt tại extraction task. tenant_id, version, timestamps/retention theo loại entity; session/account exceptions nêu rõ ở rows. UUID opaque được giữ khi chuyển từ monolith.

| Entity / aggregate | Fields chính / quan hệ | Invariant / authority |
|---|---|---|
| contact / company / activity | tenant_id,id,fields,owner_id,team_id,version,owner_revision | CRM-owned records có local record registry và ownership history |
| contact_identity / provider_profile_observation | tenant_id,platform,connection_id,external_subject_id,crm_contact_id,mapping_revision; profile source/revision/time | CRM canonical mapping unique theo identity key; preserve human-edited fields |
| object_type / property / custom_record / property_index_value | type key,schema version,validation,index value | Custom object và field definitions canonical tại CRM |
| form / view / association / record_catalog | definition version; source/target service+type+id; catalog projection revision | External domain records chỉ projection; không FK/cascade/UPDATE xuyên service |

Mỗi service có local `outbox_event`, `consumer_inbox`, `idempotency_receipt`, `audit_entry` khi phát sinh mutation; key tenant+consumer+event hoặc tenant+actor+command+idempotency. Không dùng một bảng chung có multi-service writers. Local FK tenant-bound, cross-service reference được validate bằng API hoặc reconciled projection theo policy.

## API, commands và events

ResolveOrCreateContact idempotent bằng tenant+source identity key; EnsureContactShare/RecordActivity; metadata API; emits contact.created/updated, metadata.changed, record-share.confirmed. Generic UI dispatch business commands tới owning service.

Các tên interface/event ở đây là logical proposals, chưa endpoint/schema được triển khai. Exact OpenAPI/JSON Schema, auth scopes, errors, versions, payload minimization và consumer contract tests thuộc PLAN-006 gate; legacy wire types giữ nguyên tới compatibility cutover. Không dùng DTO chung để import domain/service implementation.

## Consistency, authorization và failure handling

Cross-service association kiểm target qua API, lưu logical refs và trạng thái pending/verified/unavailable. Contact merge/deletion cần saga, không cascade sang Chat. Unique Contact resolution key ở CRM tránh duplicate khi Connector retry.

Transaction chỉ local state+audit+outbox/inbox. Network call không giữ SQL transaction; remote action phải có operation key/status/reconciliation. Trace propagation không thay tenant authorization. Read/write luôn kiểm tenant và current rights; owner/grant projections không đủ làm authority cho side effect.

## Vận hành và scale

Index/query workload scale độc lập. Event gap làm catalog stale: expose watermark; không dùng catalog để authorize mutation.

Owner vận hành là team sở hữu service (chưa gán người cụ thể). Bắt buộc readiness dependency-aware, liveness process-only, metrics latency/error/saturation/backlog, redacted tracing, restore drill và graceful shutdown leases. SLO/RPO/RTO và alert thresholds phải được chốt/test theo deployment gate; chưa có số liệu production để claim đạt.

## Source mapping và lộ trình tách

Tách crm_record/ownership_history/record_team_access theo owning domain. Conversation/Lead subtype FK và registry CAS hiện tại cần local metadata projection + local version authority trước khi extraction.

Rollback/cutover tuân [migration plan](../planning/microservices-migration.md): single writer, shadow read/hash reconciliation, durable event watermark; không dual-write thủ công, không sửa migrations1–18. Source implementation hiện hữu chỉ được nói DONE theo [tracker](../tracking/tasks.md).

## Acceptance trước service Ready

Own DB credentials không đọc được DB khác; API/consumer schemas và tenant ACL negative tests; duplicate/out-of-order/lost ACK; crash sau remote effect; permission/owner revoked; broker/downstream outage; poison event/DLQ replay; migrate/restore và compatibility với client/run phiên bản cũ. Thêm domain cases ở module hiện hữu; với Draft module phải chốt domain AC trước code. Chưa test service phân tán, tất cả gates này NOT_RUN.

ADR-019 / PLAN-006B: [ResolveContact, ValidateContactBinding và SyncContactProfile](../contracts/contact-resolution.md). CRM transaction tạo Contact+identity+receipt, trả crm_contact_id cho Connector cache. Không gọi Facebook hoặc giữ Page token; quyền/profile fetching ở Connector. No source implementation claim.

PLAN-006C: expose read-only LookupContactIdentity independently of ResolveContact. CRM DB is SoT; lookup distinguishes not_found from auth/outage errors; atomic resolve/create handles concurrent misses. Cache consumers are both Chat and Connector. [Policy](../contracts/contact-resolution.md).

## SRC-030 scoped implementation

CRM application port owns immutable contact_identity lookup and atomic resolve/create with service idempotency receipt. Existing schema18 is reused; no cross-service SQL access. See [compatibility contract](../contracts/contact-resolution-local.md).
