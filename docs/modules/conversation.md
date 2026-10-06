# MOD-04 — Conversation & Chat Workspace

> Kiến trúc đích microservice theo ADR-017: [Chat / Conversation Server](../services/chat.md). Nội dung implementation/UoW/FK dưới đây mô tả baseline monolith; không áp dụng transaction xuyên service. Service extraction chưa triển khai.
Status: Ready for implementation text inbox M2. Requirements: REQ-05, REQ-06, REQ-09.

## Mục tiêu và phạm vi

Inbox tập trung xử lý hội thoại, timeline, owner, note, quick reply và qualification panel. M2 một channel mock Messenger; không có attachment, full-text search hay realtime socket.

## Actor và quyền

Chat agent có chat seat + conversation permissions; AI cần capability conversation.reply và policy. Chỉ current owner gửi tin; supervisor takeover trước send. Note nội bộ chỉ cần conversation.note, không phải current owner.

## Use case và state machine

Conversation `open ↔ pending`, `open/pending → closed`. Inbound khi pending đưa về open trong transaction message; closed không reopen, tin mới tạo Conversation mới trên identity. Close dừng chatflow/AI pending và cancel queued outbound.

Message outbound `queued → sending → sent|failed|unknown`; queued → cancelled khi handoff/close. Inbound bắt đầu received. Failed pre-dispatch có thể retry cùng intent; unknown phải reconcile. Timeline xếp received_at/id ổn định, lưu source occurred_at để giải thích tin trễ.

## Entity và invariant

Conversation là subtype của registry, owner không kế thừa từ Lead/Contact. Note là Activity kind note. Quick reply M2 là danh sách template trong fixture cấu hình UI; chèn text cho người dùng kiểm tra trước gửi, không auto-send. Qualification draft nằm trong Chatflow/session hoặc Lead draft, không chèn vào message system giả.

Inbound handler phải lock identity để tránh hai Conversation active. Send atomically kiểm tra owner_revision, create intent/message queued, audit. Dispatch dùng per-conversation lock trong DB để kiểm tra intent còn được phép, đánh dấu sending rồi external I/O; không giữ DB transaction trong network call.

## API và event

[Conversation API](../contracts/api.md), events `conversation.created`, `message.received/sent`, `record.assigned`, `message.delivery_failed`. Poll 5 giây khi mở inbox, dùng cursor cho timeline; pending outbound status poll theo cùng cadence.

## UI

[Đặc tả UX rebuild](../ux/agent-chat-workspace.md) thay bố cục wireframe M2: app rail, Inbox sidebar, danh sách + search/filter, header actions, timeline/composer và context drawer/rail. UX-002 bổ sung [product contract](../contracts/agent-chat-workspace.md): unread theo Human principal, metrics có ACL, custom/shared saved query, conversation tags, durable snooze overlay, activity feed và snippets. Snooze không phải lifecycle state hoặc pause automation; wake do deadline/inbound mới/assignment, close cancel. Read marker không phải customer receipt. Contact/qualification/history theo quyền; owner change vẫn chặn stale composer. Thiết kế Ready, source mới chưa triển khai; [baseline/evidence](../ux/workspaces.md) giữ nguyên.

## Failure handling

Network lỗi giữ draft local, không tự tạo idempotency key mới khi retry send. 409 owner/version reload và yêu cầu người dùng xem assignment mới; không silently takeover. AI timeout tạo Human attention. In-flight message vẫn có thể tới provider sau handoff và phải hiển thị chính xác.

## Acceptance và dependency

[AC-05, AC-06, AC-07, AC-09, AC-18](../quality/acceptance.md); phụ thuộc Channels, CRM, Agents, Operations và Chatflow.

## Mở rộng còn Draft

Omnichannel merge, attachment, message edit/delete, typing indicator, realtime stream, macro quản trị, SLA response calendar và chatbot content builder.

## Implementation SRC-014

Domain/API text, internal note Activity, signed timeline/queue cursor, owner-only outbound intent và persisted mock sender đã có. [Exact contract](../contracts/conversation.md) · [evidence](../tracking/details/SRC-014.md). Intake port `Conversations.receive` dùng shared TransactionScope; không public inbound tới SRC-015. `cancelQueued` là assignment hook phải gọi cùng registry lock/UoW tại SRC-017; `onClose` nối orchestration tại SRC-020. AI outbound submit remains fail closed until authorized Chatflow orchestration SRC-020. Inbox UI SRC-016 đã triển khai, evidence theo tracker; routing/takeover SRC-017 đã có.

SRC-015 đã nối `Conversations.receive` từ durable intake worker; inbound events/history mang actor service ingress. `findInbound` là port đọc reference phục vụ dedup trước identity creation. Detail bổ sung attribution optional qua ChannelReferences, áp dụng conversation field deny và live authorization khi replay. Inbox UI được nối tại SRC-016.

SRC-016: inbox queue/detail/messages/notes polling 5 giây, owner kind và allowed_actions từ backend. Notes port kiểm Conversation read rồi Activity scope/field ACL riêng. Khi mất ACK, giữ nguyên payload/key và chỉ kiểm tra lại yêu cầu cũ; owner revision đổi chặn composer đến khi người dùng xem lại phân công. Context Contact/CTM có thật; chưa session qualification/attention/routing UI.

SRC-017 integrates actual assignment/takeover with queued cancellation in one UoW, version/owner_revision checks, eligible owner selector and history in inbox. Sending intents retain real completion/reconciliation behavior. SRC-018 cancels actual queued/running runtime executions and tool rows atomically on assignment/close; active Chatflow session pause binds at SRC-020.

## M3 — Platform-aware messages (Draft)

Common envelope có `platform`, `message_type`, `external_msg_id`, `text`, `reply_to` JSON và `attachment` JSON, cùng internal IDs/tenant/direction/status/timestamps. Client chọn renderer theo platform/type/template version, hỗ trợ media/gallery/CSAT theo capability và fallback an toàn. Rich message là scope M3 theo CHG-20261006-03; edit/delete/realtime/omnichannel merge vẫn ngoài lát cắt này. [Draft contract và compatibility](../contracts/messaging-platforms.md).

Human/AI owner trong CRM tách khỏi external thread control; UI cần biểu thị pending/unknown/confirmed control và chỉ mở send khi backend cho phép. External provider-hosted replies cập nhật timeline qua connector, không giả thành outbound intent do CRM gửi. Exact transitions/API/UX chốt ở [M3 plan](../planning/m3-provider-plan.md).


SRC-026 Ready scope: read-only [legacy envelope v2](../contracts/message-envelope-v2.md); inbox text UI không đổi, rich variants vẫn Draft.


SRC-027 Ready scope theo [rich messages](../contracts/rich-messages.md): sidecar storage, envelope v3, ACL-safe reply resolution, passive renderer. Chatflow ports nhận rich text cho inference, consent chỉ original; v1/v2 giữ compatibility.

ADR-019 target: all new inbound/outbound Chat message inputs/events require crm_contact_id for the customer, validated against tenant/identity/conversation. Chat never creates Contact. [Contract](../contracts/contact-resolution.md); versioned rollout required for legacy strict APIs.

## SRC-030 scoped implementation

Chat bounded cache is a hint, hydrated only after successful ingress commit. Contact-bound inbound/outbound commands validate customer context; actor/permission/owner checks remain independent. Legacy strict event and timeline envelope versions remain compatible. See [compatibility contract](../contracts/contact-resolution-local.md).

## SRC-031 Facebook configuration and channel dimensions

[Exact OAuth/Page/schema19 contract](../contracts/facebook-configuration.md) and [operator runbook](../development/facebook-configuration.md) define Admin→Channels→Facebook, session/state-bound OAuth, encrypted DB Page credentials and manual verified token replacement. Baseline Channels remains sole writer of catalog/credentials; independent Connector capture is unchanged until API-based extraction/provisioning. Conversation channel and generated channel_id retain existing connection IDs, with Page metadata and tenant/field-authorized filters/options. Messaging activation and real sandbox acceptance remain separate.
