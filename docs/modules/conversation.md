# MOD-04 — Conversation & Chat Workspace

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

[Wireframe](../ux/workspaces.md): queue trái, timeline giữa, Contact/Lead/qualification phải. Có badge Human/AI, owner và team, ad source, trạng thái bàn giao, send pending/unknown. Owner thay đổi hiển thị banner và reload controls; không để stale composer tiếp tục gửi.

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
