# Media & Content Processing

Status: Target architecture accepted direction — PLAN-005 / ADR-017. Service extraction/API/physical schema chưa Ready; không đồng nghĩa deployed. Module đích mới; chưa có service độc lập. · [Catalog](README.md) · [Cross-service rules](../contracts/service-boundaries.md).

## Phạm vi và trách nhiệm

Private media references/binary lifecycle, authorized download/preview, scan/transcode và OCR/transcription adapters.

Ngoài phạm vi: Không own conversation policy/message JSON; không tự sửa text gốc hoặc tự coi extraction là consent.

## Kiến trúc bên trong

Deploy unit đề xuất `services/media` gồm NestJS API và worker entrypoints theo workload. Cấu trúc `domain`, `application`, `ports`, `adapters/http`, `adapters/events`, `adapters/persistence`, `migrations`, `tests`, `docs`. Domain không import database entity hoặc implementation của service khác. API/worker chỉ truy cập MySQL database và credentials riêng của service; module kernel dùng schema-local outbox/inbox/receipt/audit. Tham chiếu remote là ID có tenant/service/type, không cross-database foreign key. Đây là source layout đích, chưa tạo directory source rỗng.

## Data model nội bộ và nguồn chuẩn

Tên entities dưới đây là logical target model, không phải danh sách bảng đã migrate. Physical schema/DDL mỗi service phải chốt tại extraction task. tenant_id, version, timestamps/retention theo loại entity; session/account exceptions nêu rõ ở rows. UUID opaque được giữ khi chuyển từ monolith.

| Entity / aggregate | Fields chính / quan hệ | Invariant / authority |
|---|---|---|
| media_asset / object_binding | tenant_id,id,conversation_ref,message_ref,connection_ref,provider media ref,object key,mime,bytes,hash,status,expiry | Private blob store + MySQL metadata; owner Chat authorization needed |
| media_processing_job / rendition / extraction | asset_id,job key,processor/version,status,output object/text ref,confidence | Versioned provenance; original bytes separate derivatives, no overwrite original |
| access_grant / retention_operation | asset ref,authorization revision,expiry,delete status | Short-lived access, no permanent public URL; deletion/retention audited |

Mỗi service có local `outbox_event`, `consumer_inbox`, `idempotency_receipt`, `audit_entry` khi phát sinh mutation; key tenant+consumer+event hoặc tenant+actor+command+idempotency. Không dùng một bảng chung có multi-service writers. Local FK tenant-bound, cross-service reference được validate bằng API hoặc reconciled projection theo policy.

## API, commands và events

CreateMediaReference từ Connector; AuthorizeMessageRead ở Chat; provider fetch credential proxy qua Connector scoped operation; publish media.ready/extraction.completed tới Chat. Chat accepts extraction only expected asset/content revision; emits content-updated projection event.

Các tên interface/event ở đây là logical proposals, chưa endpoint/schema được triển khai. Exact OpenAPI/JSON Schema, auth scopes, errors, versions, payload minimization và consumer contract tests thuộc PLAN-006 gate; legacy wire types giữ nguyên tới compatibility cutover. Không dùng DTO chung để import domain/service implementation.

## Consistency, authorization và failure handling

Anti-SSRF scheme/host/IP/redirect/DNS policy, MIME/size/scan limits; enforce ACL at download, not only link generation. Tenant isolation every object key/job; expired/revoked inaccessible. Extraction event cannot replace original text or user-corrected newer text.

Transaction chỉ local state+audit+outbox/inbox. Network call không giữ SQL transaction; remote action phải có operation key/status/reconciliation. Trace propagation không thay tenant authorization. Read/write luôn kiểm tenant và current rights; owner/grant projections không đủ làm authority cho side effect.

## Vận hành và scale

Untrusted files processing sandbox; isolated workers/quota. Provider URLs expire, refresh via Connector. Keep retryable expired reference distinct permanently unavailable; no log signed URL/token.

Owner vận hành là team sở hữu service (chưa gán người cụ thể). Bắt buộc readiness dependency-aware, liveness process-only, metrics latency/error/saturation/backlog, redacted tracing, restore drill và graceful shutdown leases. SLO/RPO/RTO và alert thresholds phải được chốt/test theo deployment gate; chưa có số liệu production để claim đạt.

## Source mapping và lộ trình tách

New service Draft exact implementation; SRC-027 only metadata placeholders. Need storage/ACL/retention/SSRF/OCR contract gate before code. No fake production resolver in blueprint.

Rollback/cutover tuân [migration plan](../planning/microservices-migration.md): single writer, shadow read/hash reconciliation, durable event watermark; không dual-write thủ công, không sửa migrations1–18. Source implementation hiện hữu chỉ được nói DONE theo [tracker](../tracking/tasks.md).

## Acceptance trước service Ready

Own DB credentials không đọc được DB khác; API/consumer schemas và tenant ACL negative tests; duplicate/out-of-order/lost ACK; crash sau remote effect; permission/owner revoked; broker/downstream outage; poison event/DLQ replay; migrate/restore và compatibility với client/run phiên bản cũ. Thêm domain cases ở module hiện hữu; với Draft module phải chốt domain AC trước code. Chưa test service phân tán, tất cả gates này NOT_RUN.
