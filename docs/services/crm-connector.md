# CRM Connector / Messaging Platforms

Status: Target architecture accepted direction — PLAN-005 / ADR-017. Service extraction/API/physical schema chưa Ready; không đồng nghĩa deployed. [Module hiện tại](../modules/channels.md) · [Catalog](README.md) · [Cross-service rules](../contracts/service-boundaries.md).

## Phạm vi và trách nhiệm

Nhận webhook Facebook/Instagram/WhatsApp/Zalo, xác thực provider, bind tenant connection, parse/normalize event; outbound transport, receipt/control, reconcile và rate limit.

Ngoài phạm vi: Không giữ chat timeline authoritative, không quyết định CRM owner hoặc thực thi AI tools.

## Kiến trúc bên trong

Deploy unit đề xuất `services/crm-connector` gồm NestJS API và worker entrypoints theo workload. Cấu trúc `domain`, `application`, `ports`, `adapters/http`, `adapters/events`, `adapters/persistence`, `migrations`, `tests`, `docs`. Domain không import database entity hoặc implementation của service khác. API/worker chỉ truy cập MySQL database và credentials riêng của service; module kernel dùng schema-local outbox/inbox/receipt/audit. Tham chiếu remote là ID có tenant/service/type, không cross-database foreign key. Đây là source layout đích, chưa tạo directory source rỗng.

## Data model nội bộ và nguồn chuẩn

Tên entities dưới đây là logical target model, không phải danh sách bảng đã migrate. Physical schema/DDL mỗi service phải chốt tại extraction task. tenant_id, version, timestamps/retention theo loại entity; session/account exceptions nêu rõ ở rows. UUID opaque được giữ khi chuyển từ monolith.

| Entity / aggregate | Fields chính / quan hệ | Invariant / authority |
|---|---|---|
| connection / credential_binding / provider_identity_observation | tenant_id,id,platform,external_asset_type/id,secret_ref,config_version,status | Provider keys scoped tenant+connection; canonical identity mapping thuộc CRM; Connector giữ observations/cache refs |
| webhook_delivery / normalized_event / ingestion_operation | provider event ID/hash,body reference,received_at,status,lease,fence,normalized version | Durable intake trước ACK; raw body kiểm signature trước normalization; retention/access policy, không audit raw transcript |
| transport_operation / provider_control / receipt / touchpoint | operation_id,message_ref,owner_revision,control revision,status,provider ID,source attribution | Desired/observed control độc lập CRM owner; IDs opaque namespace theo connection |

Mỗi service có local `outbox_event`, `consumer_inbox`, `idempotency_receipt`, `audit_entry` khi phát sinh mutation; key tenant+consumer+event hoặc tenant+actor+command+idempotency. Không dùng một bảng chung có multi-service writers. Local FK tenant-bound, cross-service reference được validate bằng API hoặc reconciled projection theo policy.

## API, commands và events

Provider endpoint tại service này: verify challenge, signature raw bytes, fan-out batches. Publishes connector.message.normalized/receipt.observed/control.observed; nhận DispatchMessage/ChangeProviderControl. Profile enrichment dùng provider API/cache; Contact resolution gọi CRM idempotent, cache confirmed crm_contact_id rồi Chat ingestion saga; event delivery/order không guaranteed.

Các tên interface/event ở đây là logical proposals, chưa endpoint/schema được triển khai. Exact OpenAPI/JSON Schema, auth scopes, errors, versions, payload minimization và consumer contract tests thuộc PLAN-006 gate; legacy wire types giữ nguyên tới compatibility cutover. Không dùng DTO chung để import domain/service implementation.

## Consistency, authorization và failure handling

Không ACK thành công trước durable save. Không dùng text/time để dedup. Unknown send không blind resend; authorization/control fence trước external I/O. `text` original/extracted/preview, content JSON theo platform schema; control/read/CSAT submission không giả làm customer text.

Transaction chỉ local state+audit+outbox/inbox. Network call không giữ SQL transaction; remote action phải có operation key/status/reconciliation. Trace propagation không thay tenant authorization. Read/write luôn kiểm tenant và current rights; owner/grant projections không đủ làm authority cho side effect.

## Vận hành và scale

Ingress và worker cùng service có thể scale riêng theo provider/connection. Provider429 áp dụng bounded backoff/rate limit; poison event vào DLQ theo tenant. API outage khác không chặn ACK đã lưu; backlog có SLA/age alert.

Owner vận hành là team sở hữu service (chưa gán người cụ thể). Bắt buộc readiness dependency-aware, liveness process-only, metrics latency/error/saturation/backlog, redacted tracing, restore drill và graceful shutdown leases. SLO/RPO/RTO và alert thresholds phải được chốt/test theo deployment gate; chưa có số liệu production để claim đạt.

## Source mapping và lộ trình tách

Đích đầu tiên cần tách. Hiện ChannelsController/MessengerIntake chỉ mock bearer/normalized DTO; chưa Facebook verification/parser. Không đưa shared UoW qua mạng; replace Conversations.receive bằng durable versioned ingestion contract.

Rollback/cutover tuân [migration plan](../planning/microservices-migration.md): single writer, shadow read/hash reconciliation, durable event watermark; không dual-write thủ công, không sửa migrations1–18. Source implementation hiện hữu chỉ được nói DONE theo [tracker](../tracking/tasks.md).

## Acceptance trước service Ready

Own DB credentials không đọc được DB khác; API/consumer schemas và tenant ACL negative tests; duplicate/out-of-order/lost ACK; crash sau remote effect; permission/owner revoked; broker/downstream outage; poison event/DLQ replay; migrate/restore và compatibility với client/run phiên bản cũ. Thêm domain cases ở module hiện hữu; với Draft module phải chốt domain AC trước code. Full distributed/provider gates vẫn NOT_RUN; scoped HTTP ingress evidence theo SRC-028.


SRC-028 implemented slice: [independent durable HTTP bridge](../contracts/connector-bridge.md), private schema1 and integration binding. Full provider/domain extraction remains gated.

[Source architecture/data/runbook](../../services/crm-connector/README.md): private schema1, API/worker/release image and compatibility HTTP receiver. SRC-029 đã thêm signed Facebook capture/parser; chưa có Chat/Contact resolution integration.

PLAN-004C: [signed Messenger capture](../contracts/messenger-ingress.md) adds own schema2 Page bindings/events/audit and optional raw webhook endpoint; source status SRC-029 in tracker. Full Chat/control extraction remains separate.

## ADR-019 — Profile enrichment và resolution cache

Connector gọi provider GET profile (name/avatar theo permission), lưu profile cache và confirmed identity→crm_contact_id cache; TTL/invalidation/fallback tại [contract](../contracts/contact-resolution.md). Không own canonical contact_identity. Lượt sau cache hit gửi message có crm_contact_id sang Chat, không gọi lại provider/ResolveContact tại Connector. Outbound/echo dùng customer recipient identity; không dùng Page/agent làm Contact. Đây là design, chưa code cache/API adapter.

PLAN-006C: resolution cache miss first loads persisted mapping through CRM read port/API; only confirmed DB absence invokes CRM resolve/create. Successful DB read/create receipt hydrates cache. Enrichment is asynchronous and does not block message delivery. [Policy](../contracts/contact-resolution.md).

## SRC-030 scoped implementation

Independent Connector worker now uses bounded cache→authenticated CRM lookup→resolve only on explicit absence, then sends deliveries-v2 with confirmed CRM IDs. Raw Messenger capture remains separate; profile enrichment is pending. See [compatibility contract](../contracts/contact-resolution-local.md).

## SRC-031 Facebook configuration and channel dimensions

[Exact OAuth/Page/schema19 contract](../contracts/facebook-configuration.md) and [operator runbook](../development/facebook-configuration.md) define Admin→Channels→Facebook, session/state-bound OAuth, encrypted DB Page credentials and manual verified token replacement. Baseline Channels remains sole writer of catalog/credentials; independent Connector capture is unchanged until API-based extraction/provisioning. Conversation channel and generated channel_id retain existing connection IDs, with Page metadata and tenant/field-authorized filters/options. Messaging activation and real sandbox acceptance remain separate.
