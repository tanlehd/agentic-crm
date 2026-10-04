# MOD-03 — Channels & Acquisition

Status: Ready for implementation mock Messenger M2; real Meta/Google Ads Draft M3–M4. Requirements: REQ-05, REQ-09, REQ-11.

## Mục tiêu và phạm vi

Nhận inbound tin nhắn, chuẩn hóa identity/content/referral, giữ nguồn marketing và chống trùng. Connector adapter tách payload provider khỏi domain. M2 chỉ text mock và fake outbound receipt.

## Actor và quyền

Integration service actor gắn một connection/tenant; admin tạo cấu hình qua fixture/bootstrap, operator tenant có integration.read/retry. Webhook thật phải xác minh chữ ký theo provider trước intake; chưa implement xác minh giả rồi gọi đó là production-ready.

## Use case và state machine

Delivery `received → processed` hoặc `received → failed → received` khi retry. ACK sau durable save. Worker lock delivery, kiểm tra provider_message unique, resolve identity, tạo Contact nếu chưa có, lock identity rồi tìm/tạo active Conversation; ghi Message/touchpoint/event cùng transaction.

Nếu event mới lặp message ID, no-op phần business. Nếu thiếu referral vẫn nhận tin, attribution unknown. Timestamps giữ occurred_at và received_at; không chèn ngược vào chatflow đã xử lý theo thời gian provider.

## Entity và invariant

Connection external account namespace; ContactIdentity tenant+connection+external_subject unique. Contact mới gán Chat team và owner NULL; Conversation gán Chat team, owner sẽ được Workflow route. Provider event hash xung đột đưa vào error, không ghi đè payload trước. Raw payload chỉ allowlist và có kiểm soát truy cập, không lưu secret.

Touchpoint một/delivery có referral CTM; không coi mỗi tin nhắn là một lead/ad click. Campaign/ad ID là opaque string nullable, không giả định luôn có hoặc có quyền fetch campaign.

## API và event

[Normalized inbound](../contracts/api.md), [event catalog](../contracts/events.md). Inbound sinh `contact.created` khi cần, `conversation.created` chỉ phiên mới, `message.received` mỗi message mới. Sender adapter `send(intent) → sent|failed|unknown` có provider_message_id nếu sent; mock hỗ trợ idempotency theo intent ID.

## UI

Conversation hiển thị nguồn CTM/ad ID khi có, badge unknown khi thiếu; không che message vì thiếu attribution. Trang integration status hiển thị queued/failed/retry và error code sanitized.

## Failure handling

Validation/scope conflict không retry; DB transient theo retry policy. Retry không tạo ID business mới. External timeout sau send chuyển unknown; chỉ reconcile hoặc explicit operator decision, không resend mù. Rate limit tương lai tuân provider Retry-After.

## Acceptance và dependency

[AC-05, AC-15, AC-17](../quality/acceptance.md); phụ thuộc CRM, Conversation, Operations và tenant-bound credential.

## Mở rộng còn Draft

Meta signature, app review, page subscription, message permission/window, attachment, delivery receipts và token rotation phải kiểm chứng với tài liệu Meta tại M3. Google Ads lead form cần raw webhook schema, mapping form → Contact/Lead, consent, dedup submission ID và cách giữ campaign attribution trước M4.
