# Chat / Conversation Server

Status: Target architecture accepted direction — PLAN-005 / ADR-017. Service extraction/API/physical schema chưa Ready; không đồng nghĩa deployed. [Module hiện tại](../modules/conversation.md) · [Catalog](README.md) · [Cross-service rules](../contracts/service-boundaries.md).

## Phạm vi và trách nhiệm

Conversation lifecycle, message timeline/rich JSON/text projection, Human/AI ownership, outbound intent và chat read/realtime delivery.

Ngoài phạm vi: Không giữ provider secret, không parse webhook vendor trực tiếp, không sở hữu Contact master.

## Kiến trúc bên trong

Deploy unit đề xuất `services/chat` gồm NestJS API và worker entrypoints theo workload. Cấu trúc `domain`, `application`, `ports`, `adapters/http`, `adapters/events`, `adapters/persistence`, `migrations`, `tests`, `docs`. Domain không import database entity hoặc implementation của service khác. API/worker chỉ truy cập MySQL database và credentials riêng của service; module kernel dùng schema-local outbox/inbox/receipt/audit. Tham chiếu remote là ID có tenant/service/type, không cross-database foreign key. Đây là source layout đích, chưa tạo directory source rỗng.

## Data model nội bộ và nguồn chuẩn

Tên entities dưới đây là logical target model, không phải danh sách bảng đã migrate. Physical schema/DDL mỗi service phải chốt tại extraction task. tenant_id, version, timestamps/retention theo loại entity; session/account exceptions nêu rõ ở rows. UUID opaque được giữ khi chuyển từ monolith.

| Entity / aggregate | Fields chính / quan hệ | Invariant / authority |
|---|---|---|
| conversation / conversation_owner / ownership_history | tenant_id,id,crm_contact_id,crm_identity_id,connection_ref,status,version,owner_revision,principal_ref,team_ref | Authority owner của Conversation ở Chat; assign/takeover+queued intent invalidation atomic local |
| message / message_content / message_source_key | id,conversation_id,crm_contact_id,connection_ref,external_msg_id,direction,text,text_source,content schema/version,reply_to | Unique tenant+connection+external message ID; JSON scoped read, reply resolve cùng conversation |
| outbound_intent / dispatch_authorization / message_receipt | intent_id,idempotency key,expected owner revision,phase,status,provider receipt | Intent trước I/O, no exactly-once promise provider; remote receipt không rewrite CRM owner |

Mỗi service có local `outbox_event`, `consumer_inbox`, `idempotency_receipt`, `audit_entry` khi phát sinh mutation; key tenant+consumer+event hoặc tenant+actor+command+idempotency. Không dùng một bảng chung có multi-service writers. Local FK tenant-bound, cross-service reference được validate bằng API hoặc reconciled projection theo policy.

## API, commands và events

IngestMessage command/event từ Connector; ReadTimeline/SendMessage/AssignOwner/Takeover; emits chat.message.received, chat.owner.changed, chat.send.requested. Gateway route compatibility và stream resume contract sau design gate; client hiện polling.

Các tên interface/event ở đây là logical proposals, chưa endpoint/schema được triển khai. Exact OpenAPI/JSON Schema, auth scopes, errors, versions, payload minimization và consumer contract tests thuộc PLAN-006 gate; legacy wire types giữ nguyên tới compatibility cutover. Không dùng DTO chung để import domain/service implementation.

## Consistency, authorization và failure handling

Kiểm permission qua Identity + ownership/version local trước mutation. Takeover invalidates local queued intents ngay; publishes revoke cho Chatflow/AI/Connector. Side effect đã dispatch trước takeover có thể tới provider; UI pending/unknown/receipt trung thực. Không chờ distributed cancel rồi mới bảo vệ local state.

Transaction chỉ local state+audit+outbox/inbox. Network call không giữ SQL transaction; remote action phải có operation key/status/reconciliation. Trace propagation không thay tenant authorization. Read/write luôn kiểm tenant và current rights; owner/grant projections không đủ làm authority cho side effect.

## Vận hành và scale

Read replicas/search projections cần tenant filters và freshness. Stream fan-out Redis chỉ ephemeral, durable cursor từ Chat. Đứt broker giữ outbox/backlog; fail closed dispatch khi authorization/control chưa xác nhận.

Owner vận hành là team sở hữu service (chưa gán người cụ thể). Bắt buộc readiness dependency-aware, liveness process-only, metrics latency/error/saturation/backlog, redacted tracing, restore drill và graceful shutdown leases. SLO/RPO/RTO và alert thresholds phải được chốt/test theo deployment gate; chưa có số liệu production để claim đạt.

## Source mapping và lộ trình tách

Message/schema18 đã có trong monolith. Tách local record ownership khỏi CRM registry; ContactIdentity/connection FKs chuyển logical refs có ingestion binding; Chatflow guard chuyển service API. API/worker là processes cùng Chat service, không gọi chúng là hai domain services.

Rollback/cutover tuân [migration plan](../planning/microservices-migration.md): single writer, shadow read/hash reconciliation, durable event watermark; không dual-write thủ công, không sửa migrations1–18. Source implementation hiện hữu chỉ được nói DONE theo [tracker](../tracking/tasks.md).

## Acceptance trước service Ready

Own DB credentials không đọc được DB khác; API/consumer schemas và tenant ACL negative tests; duplicate/out-of-order/lost ACK; crash sau remote effect; permission/owner revoked; broker/downstream outage; poison event/DLQ replay; migrate/restore và compatibility với client/run phiên bản cũ. Thêm domain cases ở module hiện hữu; với Draft module phải chốt domain AC trước code. Chưa test service phân tán, tất cả gates này NOT_RUN.

ADR-019 / PLAN-006B: [required contact context](../contracts/contact-resolution.md) trên new IngestMessage/SendMessage/DispatchMessage, observed echo và emitted message events ở cả inbound/outbound. Chat validates CRM mapping/tenant/contact→Conversation binding; không tự tạo Contact hoặc enrichment. crm_contact_id là khách hàng, actor principal riêng. Compatibility version mới, không sửa strict legacy schemas.

PLAN-006C: Chat uses cache-aside identity mapping: valid cache→use; miss→CRM DB lookup via read port/API→hydrate; authoritative absence→CRM resolver in trusted preparation stage. Existing message crm_contact_id must match; no substitute Contact for mismatched ID. No mandatory CRM RPC per valid cache hit; auth/dispatch checks separate. [Policy](../contracts/contact-resolution.md).

## SRC-030 scoped implementation

Chat ingress caches confirmed CRM mappings after commit, checks active Contact separately, and requires customer crm_contact_id/crm_identity_id on deliveries-v2. messages-v2 requires matching crm_contact_id with existing permission/ownership guards. Existing event/envelope versions remain unchanged. See [compatibility contract](../contracts/contact-resolution-local.md).

## SRC-031 Facebook configuration and channel dimensions

[Exact OAuth/Page/schema19 contract](../contracts/facebook-configuration.md) and [operator runbook](../development/facebook-configuration.md) define Admin→Channels→Facebook, session/state-bound OAuth, encrypted DB Page credentials and manual verified token replacement. Baseline Channels remains sole writer of catalog/credentials; independent Connector capture is unchanged until API-based extraction/provisioning. Conversation channel and generated channel_id retain existing connection IDs, with Page metadata and tenant/field-authorized filters/options. Messaging activation and real sandbox acceptance remain separate.

## UX-002 — Agent workspace product design

[Workspace contract](../contracts/agent-chat-workspace.md) và [data model](../data/agent-chat-workspace.md) bổ sung Chat-owned unread/count/query, inbox/share, conversation tags, durable snooze, snippets và activity index. Snooze deadline worker dùng MySQL CAS, không Redis-only; read marker per Human không gọi provider seen. Metrics/read/tag writes không đổi owner_revision. Activity hydrates CRM notes và checks source-run ACL qua ports/API, không copy transcript hay run state authority. Source TODO theo [build plan](../planning/agent-chat-workspace.md); không thay trạng thái extraction/deployment.
