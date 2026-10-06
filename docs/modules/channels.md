# MOD-03 — Channels & Acquisition

> Kiến trúc đích microservice theo ADR-017: [CRM Connector / Messaging Platforms](../services/crm-connector.md). Nội dung implementation/UoW/FK dưới đây mô tả baseline monolith; không áp dụng transaction xuyên service. Service extraction chưa triển khai.
Status: Implemented SRC-015 cho mock Messenger text intake; real Meta/Google Ads Draft M3–M4. Requirements: REQ-05, REQ-09, REQ-11.

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

SRC-014 đã có ChannelReferences và MockSender persisted receipt (lookup reconcile không resend). `channel_connection`/`contact_identity` là foundation v9; public intake, credential binding, durable delivery và attribution thuộc SRC-015. Không có provider/Meta thật. Xem [contract](../contracts/conversation.md).

## Implementation SRC-015

[Exact contract](../contracts/mock-intake.md) · [evidence](../tracking/details/SRC-015.md). Endpoint credential-only ACK sau MySQL commit; status dùng connection credential hoặc Human operator, retry Human có CSRF/idempotency. Worker claim lease60s/fencing và bounded backoff, duplicate message kiểm trước identity/Contact để không tạo dữ liệu thừa; Touchpoint chỉ new message có referral CTM. Seed Alpha/Beta additive và repeat-safe; tokens random private .env, hash DB. API không trả raw payload. Conversation detail có attribution CTM/unknown qua Channels port.

Phạm vi chưa có: inbox UI SRC-016, routing SRC-017, workflow/chatflow/Lead/Sales xuyên luồng SRC-018…023; không Meta thật.

## M3 — CRM Connector (Draft)

CRM Connector là lớp tích hợp từng messaging platform (Messenger, Instagram, WhatsApp, Zalo...), sở hữu credential/connection, webhook normalization, outbound/receipt và provider conversation routing. Mỗi adapter phải có bản tài liệu chính thức lưu local, provenance/checksum, API version/capability matrix và test fixtures. [Meta dossier](../references/meta/README.md) là bộ khởi đầu, chưa đầy đủ mọi platform.

Messenger Conversation Routing và WhatsApp Business Agent Thread Control là các surface khác nhau, map qua control port riêng; không đồng nhất provider app owner với CRM principal. Hosted AI replies được ingest qua echo/standby theo platform, không resend từ CRM. Base message và render policy theo [draft contract](../contracts/messaging-platforms.md). M2 mock behavior ở các mục trước giữ nguyên; trạng thái hoàn tất toàn M2 theo tracker, các câu future-work SRC-016…023 phía trên là lịch sử SRC-015.

PLAN-003: [capability/gap matrix](../references/meta/capability-matrix.md) là nguồn kết luận nghiên cứu. Graph baseline v26.0; WhatsApp webhook batch/retry7 ngày/standby envelope khác Messenger. Live WA routing chưa Ready do exact handover payload và control endpoint discrepancy; normalization/media/compatibility có thể thiết kế độc lập tại PLAN-004.


SRC-026 Ready scope: tenant-bound history metadata port đọc provider kể cả inactive connection; chỉ mock_messenger đã supported, không dùng dispatch active guard cho lịch sử. [Contract](../contracts/message-envelope-v2.md).


SRC-027 thêm explicit mock intake message.type=rich/content v1; durable ACK/dedup giữ nguyên. [Contract](../contracts/rich-messages.md). Không Meta connector thật.

PLAN-004C scoped signed Messenger capture Ready: [contract](../contracts/messenger-ingress.md). Provider-shaped events stay in independent Connector until domain ingestion/control gate; no mock bridge reinterpretation.

## Target refinement ADR-019

M3 Connector owns provider name/avatar fetching, profile cache and confirmed CRM resolution cache. Canonical contact_identity belongs to CRM Core; cache hit sends crm_contact_id to Chat. [Responsibility contract](../contracts/contact-resolution.md). Baseline mock transaction described above is unchanged.

## SRC-030 scoped implementation

Authenticated lookup/resolve and deliveries-v2 routes use existing immutable mock connection context. Legacy intake delegates Contact creation to CRM application port. v2 processor validates mapping and duplicate message identity in its transaction; missing supplied mapping never creates a substitute Contact. See [compatibility contract](../contracts/contact-resolution-local.md).

## SRC-031 Facebook configuration and channel dimensions

[Exact OAuth/Page/schema19 contract](../contracts/facebook-configuration.md) and [operator runbook](../development/facebook-configuration.md) define Admin→Channels→Facebook, session/state-bound OAuth, encrypted DB Page credentials and manual verified token replacement. Baseline Channels remains sole writer of catalog/credentials; independent Connector capture is unchanged until API-based extraction/provisioning. Conversation channel and generated channel_id retain existing connection IDs, with Page metadata and tenant/field-authorized filters/options. Messaging activation and real sandbox acceptance remain separate.
