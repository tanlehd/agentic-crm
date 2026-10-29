# MOD-04 — Conversation & Chat Workspace

ADR-027: business orchestration belongs to [Workflow](../services/workflow.md). Chatflow/session terminology in baseline source notes below denotes [legacy compatibility](../contracts/legacy-chatflow.md), not an independent module/service to extend. The owning domain retains its own data, command validation and current authorization.


SRC-083 scope2026-10-17: [Custom Inbox builder](../contracts/custom-inbox-builder.md) exposes saved-query authoring/preview/lifecycle/share on existing Chat storage, with minimal authorized Identity options. Counts and membership evaluate under viewer rights; no routing/owner mutation. [Runtime evidence](../tracking/details/SRC-083.md); full SRC-036/037 remain separate.

**Implemented additive slice SRC-078 / 2026-10-16:** [Thread / Conversation exact contract](../contracts/thread-conversation-implementation.md), PLAN-033A DONE. Thread legacy IDs/API remain stable; Conversation episode has optional custom fields and stage, event-time ownership/contributor history, and Related Lead/Deal actions with current permissions. Cross-team transfer preserves the episode; Ticket and connected Reporting remain gated. Physical forward31 stays in the baseline monolith; service extraction rules below remain unchanged.

CHG-20261013-08 accepted [logical ERD](../data/chat-sales-erd.md): session is one inbox episode, new Ad during open session adds evidence without split/reset/cancellation solely due to referral. Configurable process version/current stage, transition history and evidence-backed milestone history are independent of open/closed processing status and Sales outcomes. SRC-068 implements the session/source/context subset through the exact Customer360 contract; stage/milestone configuration remains a separate design gate.

> Kiến trúc microservice theo ADR-017: [Chat / Conversation Server](../services/chat.md). Independent Chat API/worker và database đã nghiệm thu candidate T08; main cutover thuộc T09. UoW chỉ trong owning service; không áp dụng transaction/FK xuyên service.
Status: Ready for implementation text inbox M2. Requirements: REQ-05, REQ-06, REQ-09.

## Mục tiêu và phạm vi

Inbox tập trung xử lý hội thoại, timeline, owner, note, quick reply và qualification panel. M2 một channel mock Messenger; không có attachment, full-text search hay realtime socket.

## Actor và quyền

Chat agent có chat seat + conversation permissions; AI cần capability conversation.reply và policy. Chỉ current owner gửi tin; supervisor takeover trước send. Note nội bộ chỉ cần conversation.note, không phải current owner.

## Use case và state machine

Conversation là thread lâu dài trên identity; session là một đợt xử lý. Conversation `open ↔ pending`, `open/pending → closed`. Inbound mới khi pending đưa về open; tin sau thời điểm đóng reopen cùng Conversation và tạo session kế tiếp. Tin cũ đến trễ không reopen hay sửa nguồn của session đã đóng. Close tăng control revision, ghi event/terminal proof và cancel queued outbound; consumer ngoài Chat chịu trách nhiệm reconcile execution của mình.

Message outbound `queued → sending → sent|failed|unknown`; queued → cancelled khi handoff/close. Inbound bắt đầu received. Failed pre-dispatch có thể retry cùng intent; unknown phải reconcile. Timeline xếp received_at/id ổn định, lưu source occurred_at để giải thích tin trễ.

## Entity và invariant

Conversation là subtype của registry, owner không kế thừa từ Lead/Contact. Note là Activity kind note. Quick reply M2 là danh sách template trong fixture cấu hình UI; chèn text cho người dùng kiểm tra trước gửi, không auto-send. Qualification draft nằm trong Chatflow/session hoặc Lead draft, không chèn vào message system giả.

Inbound handler phải lock identity để tránh hai Conversation active. Send atomically kiểm tra owner_revision, create intent/message queued, audit. Dispatch dùng per-conversation lock trong DB để kiểm tra intent còn được phép, đánh dấu sending rồi external I/O; không giữ DB transaction trong network call.

## API và event

[Conversation API](../contracts/api.md), events `conversation.created`, `message.received/sent`, `record.assigned`, `message.delivery_failed`. Poll 5 giây khi mở inbox, dùng cursor cho timeline; pending outbound status poll theo cùng cadence.

## UI

UX-003: [Inbox screen](../ux/inbox-screen.md) và [app shell](../ux/app-shell.md) supersede bố cục app rail bên dưới: grouped nav + header + work tabs, giữ nghiệp vụ/cursors/ownership UX-002. Không thêm API/schema/event trong UX-003.

[Đặc tả UX rebuild](../ux/agent-chat-workspace.md) thay bố cục wireframe M2: app rail, Inbox sidebar, danh sách + search/filter, header actions, timeline/composer và context drawer/rail. UX-002 bổ sung [product contract](../contracts/agent-chat-workspace.md): unread theo Human principal, metrics có ACL, custom/shared saved query, conversation tags, durable snooze overlay, activity feed và snippets. Snooze không phải lifecycle state hoặc pause automation; wake do deadline/inbound mới/assignment, close cancel. Read marker không phải customer receipt. Contact/qualification/history theo quyền; owner change vẫn chặn stale composer. Thiết kế Ready; backend triển khai theo SRC-032…034, UI rebuild còn SRC-036; [tracker](../tracking/tasks.md) ghi kết quả thực thi.

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


## SRC-034 implementation

SRC-034 adds schema22 snooze commands/deadline scanning, transactional wake/activity hooks and source-authorized activity reads. Legacy DTOs and owner semantics remain unchanged. Verification status and limitations: [task evidence](../tracking/details/SRC-034.md).

Target clarification CHG-20261008-03: [acquisition sessions](../contracts/conversation-acquisition-session.md) introduce long-lived Conversation → interaction Sessions under Page/channel identity. This supersedes the legacy closed→new Conversation behavior for the target only; current runtime is unchanged until SRC-053. Chat owns session boundaries/message membership; acquisition sessions are distinct from Chatflow sessions. Exact close/reopen/referral/timeout migration gate is PLAN-011.

Historical SRC-053 implementation followed [acquisition session contract](../contracts/acquisition-session-implementation.md): canonical thread reopens after close; organic joins active session until agent closes, new CTM referral opens a new session. Legacy first-touch attribution remains thread-level; Lead creation resolves a selected acquisition session. Runtime verification tracked separately in SRC-053, not inferred from design.

SRC-0682026-10-13: [Ready Customer360/session contract](../contracts/customer-360-session.md) defines forward28 session_touchpoint (Chat), sales_session_context and lead_merge (Sales), immutable origin versus actual context, active-session referral continuity and separate duplicate consolidation. Implemented and verified in SRC-068: 333unit,11 persistent MySQL,6 focused healthcare and8 native/browser groups; no stage/milestone/report completion claim. Existing physical monolith retains application ports; no external FK.

PLAN-025 / SRC-069: [Ready session progress contract](../contracts/session-progress.md) defines six Chat-owned tables in forward29, pinned process/stage, need-scoped manual evidence/corrections and a connected behavioral session funnel. Current monolith application producer + pure Reporting reducer; no cross-service SQL or mock-builder permission activation. SP-01…07 implemented and verified in SRC-069 (345unit,13persistent MySQL,8native/browser,6healthcare); see task evidence.

2026-10-16 / CHG-20261016-04: User authorized per-need AI enrichment and follow-up workflow; SRC-082 restores canonical conversation_id per CHG-20261016-05. PLAN-035/SRC-081 DONE; [runtime evidence](../tracking/details/SRC-081.md). See [contract](../contracts/need-follow-up.md). Forward34 renames four physical relationship columns; compatibility preserves immutable v1/graphs/receipts; real adapter configured explicitly; no invented provider result.

SRC-082 / CHG-20261016-05: [Conversation identity alignment](../contracts/conversation-identity.md) makes conversation_id canonical and preserves session_id episode semantics. Forward34 renames session_contribution/need_assessment/need_follow_up/sales_need_outcome.thread_id without changing IDs, grants, tenant ownership or cross-service boundaries. New need.assessed/classification events use v2; v1 artifacts stay readable. CI-01…03 validation tracked separately from SRC-081 history.


SRC-089: [External Conversation read contract](../contracts/external-conversations.md) exposes Chat-owned list/detail and selected message text through private-app scopes. Parent/team intersection and positive projection apply; internal Human APIs, owner commands and sessions remain unchanged.
