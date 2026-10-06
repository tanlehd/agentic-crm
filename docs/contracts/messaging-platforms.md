# Messaging platforms — common message envelope

Status: Draft M3, CHG-20261006-03; field direction approved by user, exact JSON Schema/API/migration not yet Ready. [Plan](../planning/m3-provider-plan.md). [Conversation M2](conversation.md) giữ compatibility; legacy envelope độc lập đã triển khai theo contract bên dưới.

## Base structure

| Field | Semantic đề xuất |
|---|---|
| crm_contact_id | Required non-null UUID in new Chat inbound/outbound message contracts, always customer Contact resolved by CRM; not agent/Page ID. Legacy v2/v3 unchanged until new version per ADR-019 |
| platform | Messaging platform, ví dụ messenger/instagram/whatsapp/zalo; lấy từ tenant-bound connection, không tin giá trị do client tùy ý gửi. AI provider là binding khác |
| message_type | Discriminator nội dung: text/media/template/unsupported; exact enum và mapping từng platform chốt theo docs, không dùng làm delivery status |
| external_msg_id | ID opaque do platform cấp; nullable khi outbound chưa có receipt hoặc event không có message ID. Namespace tenant+connection, không unique toàn hệ thống |
| text | Text/caption hoặc fallback đã chuẩn hóa; nullable cho media-only. Không ép gallery/CSAT thành text làm mất dữ liệu |
| reply_to | JSON nullable: external reference, internal message reference nếu đã resolve; chỉ resolve cùng tenant/connection/conversation và kiểm read quyền. Giữ reference unresolved khi tin gốc chưa tới, không đoán ID |
| attachment | JSON nullable, envelope có schema version + danh sách items/template payload được allowlist. Field tên số ít vẫn chứa nhiều media; exact per-platform schema, size/count/depth limits chốt trước code |

Giữ `id`, `tenant_id`, `conversation_id`, `connection_id`, `direction`, `status`, `occurred_at`, `received_at` hiện có. Message content không chứa credential hoặc raw webhook không lọc. JSON không đồng nghĩa arbitrary HTML/JS. Provider control/receipt/feedback events có event type riêng; không coi mọi webhook là customer message tạo Chatflow turn hoặc consent evidence.

## Connector mapping và renderer

CRM Connector nhận provider payload → kiểm signature/tenant binding → durable ingest → normalize envelope. Unknown template được giữ theo policy allowlist/retention và hiển thị fallback an toàn, không bỏ cả timeline. Outbound đi chiều ngược lại với capability/permission/window validation ở backend. UI renderer chọn platform + message_type + template type/version; không cho payload lựa chọn code hay URL fetch tùy ý.

Messenger `message.mid` map tới `external_msg_id`; `attachments[]` map vào `attachment` theo schema đã chốt. Gallery generic template và customer feedback template giữ cấu trúc riêng. Reply, postback, echo, read/delivery và routing cần mappings riêng; echo trùng cùng external ID chỉ bổ sung trạng thái/nguồn, không tạo message mới hoặc gửi lại.

Media cần chính sách URL scheme/host, file MIME/size, signed URL expiry, kiểm quyền khi tải và fallback thiếu media; server fetch phải chặn SSRF. Browser không render raw HTML provider; CSAT/postback display lịch sử không được tự gọi action hoặc gửi feedback thay khách.

## Compatibility / migration proposal

`provider_message_id` hiện hữu là cùng semantic với `external_msg_id` trong envelope mới. Giữ field/key vật lý và API M2 cho đến khi có migration/contract version được kiểm chứng; không tạo hai nguồn ID độc lập. Không sửa lịch sử migration. Đề xuất projection mới alias từ ID cũ, default legacy `message_type=text`, `reply_to=null`, `attachment=null`; platform suy ra connection. Mock connection phải giữ dấu hiệu synthetic, không relabel thành integration thật.

Nullable text của media và enum mở rộng có thể phá validator/client cũ: exact version negotiation/projection, rollout order, backfill/index/FK/constraints và downgrade limits thuộc PLAN-004. Không tự thêm optional field vào schema M2 strict rồi gọi là backward compatible.

## Acceptance dự kiến

Round-trip text/media-only/multi-attachment/reply/gallery/CSAT; missing reply target; unsupported type/version; same external ID khác tenant/connection; webhook duplicate và echo trước ACK; XSS/SSRF/URL expiry; backend capability reject; old text/client projection và migration giữ IDs/history. Fixtures tổng hợp theo source snapshot; sandbox proof riêng cho từng platform, không suy ra từ mock PASS.

## PLAN-003 source mapping refinement

[Capability matrix](../references/meta/capability-matrix.md) chốt mapping evidence: WhatsApp Agent reply echo nằm tại `value.standby.message_echoes[]`; send-time `message.template` và sibling template definition phải giữ riêng để render đúng. `standby.statuses` không tạo consumer turn; inbound/outbound reply reference dùng field khác nhau. Media URLs chỉ5 phút, media ID retention theo nguồn khác nhau; cần media reference + authenticated resolver, không coi URL là permanent attachment. Exact CRM JSON Schema vẫn thuộc PLAN-004.


Phần độc lập Ready: [legacy text envelope v2](message-envelope-v2.md) cho SRC-026. Rich JSON persistence/renderer và connectors vẫn Draft; không coi null-only projection là rich support.

Phần normalized rich mock storage/render được chốt tại [rich messages](rich-messages.md). text là nguyên văn khi gửi text; media dùng text extracted/preview cho automation, còn UI đọc JSON. Production provider payload mapping/media resolver giữ Draft.

Required customer context, cache ownership and version migration follow [Contact resolution](contact-resolution.md). Raw webhook/control records before resolution are not domain Chat message events.
