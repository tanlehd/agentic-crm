# Conversation text M2 — SRC-014

> Microservices target ADR-017 dùng [cross-service rules](service-boundaries.md). APIs/UoW trong tài liệu này là baseline implementation hiện tại; exact remote contracts và sagas cần PLAN-006 trước extraction.
Status: Ready. Bổ sung tương thích cho [API](api.md), [module](../modules/conversation.md). Các route dưới `/api/v1`, session cookie, X-Tenant-Id; mutation cần Origin/CSRF và Idempotency-Key. Không public create Conversation hoặc mock inbound ở task này.

- GET `/conversations`: state=open|pending|closed, owner/team UUID hoặc unassigned, limit 1–100 (default 50), cursor signed ràng buộc account/tenant/filter; scoped conversation.read.
- GET `/conversations/{id}`: id, contact_id, contact_identity_id, connection_id, status, opened_at, closed_at, version, owner_revision, owner_principal_id, team_id, contact summary nullable theo Contact permission/field policy; ETag version.
- GET `/conversations/{id}/messages`: limit/cursor; message id, conversation_id, direction, text (omit khi field denied), status, provider_message_id nullable, outbound_intent_id nullable, occurred_at/received_at. Sort received_at/id, cursor giữ microsecond DB.
- POST `/conversations/{id}/messages`: `{text,owner_revision}`; nonblank text max4000, decimal revision string; 202 `{data:{id,conversation_id,message_id,status,status_url},meta}`. Current Human owner + chat seat + conversation.reply, field text write/read. AI entrypoint fail closed đến SRC-018. Receipt replay kiểm lại live quyền đọc; không gửi lần nữa.
- GET `/conversations/{id}/outbound-intents/{intentId}`: id, conversation_id, message_id, status, provider_message_id, error_code; không text/actor account. Intent phải thuộc Conversation.
- POST `/conversations/{id}/notes`: `{text}` max4000; conversation.note và read, không cần current owner hoặc activity.create. CRM internal port tạo Activity kind note liên kết Conversation, response201 `{id,conversation_id}`. Note không thành outbound Message.
- POST `/conversations/{id}/transition`: `{target_status,reason}` nonblank reason max1000; If-Match bắt buộc; 200 Conversation. open↔pending, open/pending→closed; closed terminal. Audit chỉ changed fields, không raw reason/body.

Internal intake port nhận TransactionScope + identity ID, provider message ID, text, occurred_at và correlation; Channels port lock/validate identity/connection/contact trong cùng transaction; inbound pending→open, closed→new; new registry owner NULL và team từ connection. Unique tenant+connection+provider ID; replay cùng message no-op, payload conflict409. Atomic registry/subtype/message/audit/outbox. Durable ACK/referral/touchpoint thuộc SRC-015.

Outbound commit queued trước I/O; worker lock registry Conversation rồi intent, kiểm live seat/grants/owner_revision/connection, sending với dispatch token/started_at. I/O bên ngoài transaction. Result CAS token, update intent/message/event/audit atomic. Timeout hoặc crash sending quá60s→unknown; tuyệt đối không auto resend. Explicit internal retry chỉ failed trước dispatch; internal reconcile chỉ lookup receipt, không send. Mock receipt lưu tenant+intent, deterministic fake provider ID; fault modes chỉ test constructor, không HTTP. Queued cancel khi close/owner hook; sending giữ nguyên qua close/handoff. Future orchestration close hook cùng UoW; chưa có session để dừng ở SRC-014.

Errors theo API chung: 400 invalid input/cursor, 403 forbidden, 404 inaccessible, 409 owner/version/transition/idempotency conflict, 422 validation, 428 missing If-Match, 503 transient. Notes/intent receipt max7 ngày theo kernel; outbound intent key durable unique riêng không hết hạn.

## SRC-016 compatible inbox projection

Detail/list add optional `latest_message` (id/status/direction/received_at/text?; null if empty; text follows Conversation field ACL), `owner_kind` (human/ai/null) from Identity and `allowed_actions` (reply/note/update). Actions apply live seat, scoped grants, field ACL, owner and closed-state checks; commands still authorize independently.

GET `/conversations/{id}/notes?limit=50&cursor=<UUID>` returns `{data:[{id,created_at,body?}],next_cursor,meta}`. Requires Conversation read; only non-archived Activity kind note linked to this Conversation and independently readable by caller are returned. Body omitted when activity.body read denied. Ascending note ID cursor, limit 1–100; UI sorts loaded notes chronologically and polls loaded pages. No new persisted schema or changes to existing note creation.

SRC-017 adds optional allowed_actions entries assign/takeover according to current seat/scope; ownership UI/API follows [routing contract](routing.md). Existing reply/note/update behavior and message schemas are unchanged.

## M3 extension (Draft)

[Platform message envelope](messaging-platforms.md) định hướng fields/rich rendering theo CHG-20261006-03. Contract text M2 này và generated schemas giữ nguyên cho đến khi có compatibility/version/migration gate. Provider-hosted messages và thread control cần contract riêng, không giả thành mock outbound receipt.


GET message-envelopes bổ sung read-only theo [envelope v2](message-envelope-v2.md); routes/DTO v1 messages không đổi.

## UX-002 — Workspace product extension

[Contract Agent Chat Workspace](agent-chat-workspace.md) bổ sung namespace `/api/v1/chat-workspace`: unread/metrics/query, saved/shared inbox, tags, snooze overlay, activity và snippets. Legacy DTOs/routes/status giữ nguyên; backend writer mới phải duy trì sidecar sequence/coverage cùng message transaction kể cả request từ client cũ. Snooze không pause AI hoặc đổi pending; assignment/inbound mới wake, close cancel. Thiết kế Ready, source/migrations TODO theo SRC-032…037.
