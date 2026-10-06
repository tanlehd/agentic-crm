# Message envelope v2 — legacy text foundation

Status: Implemented SRC-026; PLAN-004A design DONE, CHG-20261006-05. Chỉ projection text hiện hữu; rich storage, adapters và AI provider setup thuộc PLAN-004 còn Draft.

## HTTP và wire contract

GET `/api/v1/conversations/{id}/message-envelopes` trả collection `data`, `next_cursor`, `meta.correlation_id`. Transport vẫn v1; từng message có `schema_version: 2`. Giữ nguyên GET/POST messages v1, không content negotiation ngầm. Query `limit`1–100/default50 và signed `cursor` có cùng semantics timeline cũ; cursor dùng qua hai projection được vì thứ tự và binding account/tenant/conversation không đổi. Unknown query bị400.

Message giữ id, conversation_id, direction, status, outbound_intent_id, occurred_at, received_at. Bổ sung connection_id; platform lấy qua Channels application port với tenant binding, kể cả connection inactive để đọc lịch sử. Hiện chỉ `mock_messenger` được phép; unknown provider trả503 fail closed, không relabel mock thành messenger. `message_type: text`; `external_msg_id` alias duy nhất của provider_message_id, nullable khi chưa receipt. Không xuất provider_message_id trong envelope mới. `text` giữ nguyên text cũ khi có quyền; `reply_to: null`, `attachment: null` vì lịch sử chưa lưu rich data. Ba content fields đều omitted khi conversation.text/read bị deny. Không có payload JSON tùy ý, remote fetch hoặc HTML renderer.

Schema chính xác nằm ở definitions `conversation-message-envelope-v2` và `conversation-envelope-timeline` trong conversation.json, generated TypeScript/OpenAPI bằng generator hiện hữu. Schema giới hạn null-only reply/attachment là có chủ ý: mở rich variants phải qua contract/migration tiếp theo; không claim media support.

## Authorization và ownership

Dùng cùng runHuman, live membership/seat/capability, record scope, field policies,404 cross-tenant và signed cursor như timeline cũ, trong cùng transaction. Channels port không kiểm active status cho history read. Không thay owner, send eligibility, runtime execution, webhook, durable event hay outbox.

## Data và compatibility

Không migration/backfill. Migrations1–17 immutable, physical text NOT NULL và provider ID/index giữ nguyên. Projection chỉ đọc, không copy data/ID. Rollback source không ảnh hưởng dữ liệu. Client cũ vẫn dùng messages; inbox chưa chuyển tới khi renderer rich Ready. Không UI change hoặc sandbox claim trong SRC-026.

## Acceptance SRC-026

AC-05/M3 text foundation: schema strict; mock platform honest; inbound/outbound ID alias (including null); text escaped by existing UI unchanged; hidden content absent; same history/cursor/status; invalid query/cursor and other account/tenant rejected; inactive connection history readable; HTTP endpoint mounted with no-store/errors. Unit schema và MySQL application/HTTP regression cần PASS. Media/gallery/CSAT, real Meta và browser renderer NOT_RUN/out of scope.

SRC-027 giữ nguyên v2 và thêm [envelope v3/rich renderer](rich-messages.md). Rich rows ở v2 dùng text preview với reply_to/attachment null; v3 dùng JSON và text_source.
