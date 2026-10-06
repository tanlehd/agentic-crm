# Rich messages — normalized content v1 / envelope v3

> Microservices target ADR-017 dùng [cross-service rules](service-boundaries.md). APIs/UoW trong tài liệu này là baseline implementation hiện tại; exact remote contracts và sagas cần PLAN-006 trước extraction.
Status: Implemented SRC-027, PLAN-004B DONE / CHG-20261006-06. SRC-027 phụ thuộc SRC-026 DONE. Scope: mock normalized intake → durable content → API → passive inbox renderer. Không production Meta adapter, upload/download media hoặc outbound template composer.

## Version và compatibility

Giữ strict message-envelopes schema_version2 và messages v1, kể cả null-only reply/attachment ở v2. Endpoint mới GET `/api/v1/conversations/{id}/message-envelopes-v3` có schema_version3, cùng query/cursor/auth/meta với SRC-026. Client inbox chuyển sang v3 sau backend+schema18. Không fallback endpoint âm thầm nếu backend cũ: hiển thị lỗi load hiện có. API v1/v2 trả text caption hoặc localized fallback cố định cho rich-only; không leak raw JSON. Migration18 là sidecar, không đổi message.text NOT NULL hoặc ID/index cũ. Rollback app cũ không an toàn với automation rich: ngừng worker và quay forward-compatible release; không drop sidecar.

## Normalized content v1

Machine schema `message-content.json` là nguồn exact shapes, additionalProperties false mọi object, tối đa UTF-8 JSON64KiB. Mọi content có version1, message_type, text (null hoặc1–4000 nonblank), reply_to (null hoặc external_msg_id1–255, không internal ID do ingress cung cấp), attachment. Không URL/HTML/raw provider payload/secret trong bất kỳ field có ý nghĩa thực thi. Nontext content cho phép text_source extracted/preview, default preview; text source luôn original. text_source=extracted yêu cầu text non-null. Nội dung trích xuất do adapter cung cấp, chưa có OCR/transcription engine trong scope.

| Type | Attachment | Text |
|---|---|---|
| text | null | bắt buộc string |
| media | version1, kind media, items1–10; mỗi item media_type image/audio/video/file, external_media_id opaque1–255, name nullable1–255 | caption hoặc null |
| template | version1, kind gallery, cards1–10; title1–80, subtitle nullable1–80, buttons0–3 label1–20; hoặc kind csat, title1–80, prompt1–400 | caption hoặc null |
| unsupported | version1, kind unsupported, label1–120 đã được normalizer chọn | caption hoặc null |

Đây là normalized display subset, không vendor send payload. Gallery/CSAT chỉ mock Messenger; WhatsApp carousel/Instagram/Zalo không được suy diễn hỗ trợ. Buttons là label lịch sử, không URL/postback action, không cho click gửi feedback. Media chỉ metadata placeholder, không fetch external_media_id. External connector tương lai cần normalize/drop unsupported actions, không dump raw payload.

reply_to chỉ external reference. Read v3 resolve internal_message_id nullable bằng tenant+connection+conversation+provider ID trong cùng quyền Conversation; không trả quoted text, không resolve cross-conversation. Out-of-order target tự resolve khi read sau, không update message history. Self reference giữ unresolved. Field conversation.text/read deny loại text/reply_to/attachment toàn bộ; reply target IDs cũng không lộ. Không thêm ACL độc lập khiến policy cũ bị bypass.

## Ingress và transaction

Mock deliveries hiện hữu tiếp nhận thêm message `{type: rich, content: <content v1>}` bên cạnh text cũ; rich discriminator là explicit opt-in. Không gọi đây là Meta payload/webhook. Auth credential tenant-bound, durable ACK/hash/receipt/fencing giữ nguyên. 64KiB bound kiểm trước ACK. Unknown version/type/additional props trả422. Nội dung cùng provider ID different event giữ dedup first-write hiện hữu; cùng event different payload409. Internal Conversations.receive kiểm content canonical khi duplicate trực tiếp, không overwrite. Sidecar insert cùng UoW message/audit/event; rollback tất cả khi fail. Correlation/audit/outbox chỉ IDs, không transcript.

Message.text lưu content.text hoặc preview xác định (`[Media]`, `[Gallery]`, `[CSAT]`, `[Unsupported message]`). Sidecar là nguồn authoritative của rich content; legacy text rows không backfill. Với text rich reply, sidecar có text thật. Theo user clarification: text là tin gốc khi message_type=text; media/template text là trích xuất hoặc preview. text_source=original cho text; extracted/preview cho rich (default preview). API v3 trả message.text đã materialize, không null; nếu ingress chưa cung cấp text thì tạo preview từ title/prompt/name đã chuẩn hóa, tối đa4000 ký tự; không tự OCR. JSON content ingress được giữ nguyên theo schema, UI parse attachment/reply thay vì suy từ preview. Chatflow next mặc định nhận mọi text để inference/collect khi cần; riêng consent chỉ chọn original. Human consent inbound mặc định original-only, invoke_agent dùng inference mode. Không đồng nhất extracted/preview với lời khách xác nhận. Conversation.created và message.received vẫn giữ event v1 chỉ IDs; consumer phải đọc qua port đã lọc. Không thay Human/AI owner/send eligibility.

## Schema18

Bảng `message_content`: tenant_id/message_id UUID ascii_bin composite PK, composite FK tới message(tenant_id,id), content JSON NOT NULL; CHECK JSON object, JSON length<=65536 bytes. App validator kiểm toàn bộ content v1 và bounds. Không thêm cross-module FK/truy cập bảng Channels trực tiếp. Chỉ Conversation sở hữu sidecar, runtime grants bổ sung đúng bảng. Legacy SELECT m.* không đổi vì không thêm cột vào message. Migrations1–17 immutable; schema runner journal/migration rerun kiểm no-op. Không down migration/destructive reset.

## UI và media gate

Renderer trong inbox nhận v3: text dùng React escaped text; reply hiển thị đã liên kết/chưa tải được; media danh sách tên/loại kèm chưa có bản xem trước; gallery cards/title/subtitle/button labels; CSAT title/prompt lịch sử; unsupported fallback. Không raw HTML, remote image/audio/link/iframe, không interactive CSAT; unknown platform/type/version fallback đọc an toàn. Content denied hiển thị thông báo quyền cũ. Loading/error/cursor/status giữ inbox hiện hữu.

Authenticated media resolver là task riêng Draft: opaque tenant-scoped media reference, live Conversation ACL, MIME/size limit, expiry, allowlisted provider host và DNS/redirect SSRF defense, cache isolation/revocation, credentials server-only. Chưa có endpoint/file store nên renderer không đoán URL từ ID. Việc có placeholder không tính PASS media download/preview.

## Acceptance SRC-027

Upgrade17→18 giữ message/history/journal; fresh migrate/no-op và composite tenant FK. Text/media-only/multi-item/reply-before-target/gallery/CSAT/unsupported roundtrip; oversize/unknown version/action URL reject; duplicate no sidecar overwrite, atomic rollback; v1/v2 strict unchanged và v3 field ACL/cross-tenant/cursor; Chatflow đọc text trích xuất/preview cho inference nhưng không dùng làm consent. Mock HTTP ACK→worker→read, safe passive renderer output và build/typecheck. Browser real flow chỉ claim khi thực chạy. Real Meta, authenticated media, template sending và orchestration vẫn NOT_RUN.
