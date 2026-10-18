# MOD-05 — Lead/Opportunity & Sale Workspace

SRC-087: [Stage transition ledger and funnel contract](../contracts/stage-funnel-reporting.md) adds immutable from/to events on existing fixed Lead/Deal lifecycle commands and provides an owner read port to Reporting. No lifecycle state/reopen rule changed. [Evidence](../tracking/details/SRC-087.md).

Current SRC-068 / CHG-20261013-10: [Customer360/session contract](../contracts/customer-360-session.md) is authoritative for inbox_v2 and forward28: new Ad retains the open session, actual create/follow-up/closing context is separate from immutable origin, direct Deal is supported, duplicate Lead consolidation preserves original history. Prior v1 splitting descriptions below are historical. Stage/milestone configuration and connected funnel reporting remain outside this implemented slice.


Review CHG-20261013-09: inherited Deal primary origin may differ from the session where Deal was actually created. [ERD metric clarification](../data/chat-sales-erd.md) distinguishes acquisition-lineage reporting from create activity; exact create-context evidence and placement remain gated, existing source unchanged.

CHG-20261013-08 accepted [logical ERD](../data/chat-sales-erd.md): Lead qualification is optional before Deal; primary origin session is distinct from subsequent session context links. Target permits direct Deal with validated session origin. Won/stage/amount remain Sales authority, not editable session conversion fields. Existing source commands unchanged; exact API/DDL/compatibility gate remains before implementation.

**Current baseline override, review 2026-10-13:** SRC-045/046/053 đã triển khai Lead manual/from-session và Deal manual/from-Lead trong monolith. POST Deal, won amount/currency và Customer transition đã có; phần mô tả M2 không POST Deal bên dưới chỉ là phạm vi lịch sử. Nhiều Leads/session và Deals/Lead được phép; Lead→Deal không bắt buộc accepted, nhưng phải cùng Contact và không disqualified. Nguồn session chốt bất biến theo [implementation contract](../contracts/acquisition-session-implementation.md).

**Current priority CHG-20261007-14:** Lead/Deal → organic Conversation→Lead→Deal won with value → organic Page report/release (SRC-045/046/052/050); then Marketing sync/campaign reports (SRC-051/049). Ticket/receipts follow separately. Phase1 revenue means won Deal value, not cash collected. Exact scoped design: [organic Sales base](../contracts/organic-sales-base.md).


> Kiến trúc đích microservice theo ADR-017: [Sales](../services/sales.md). Nội dung implementation/UoW/FK dưới đây mô tả baseline monolith; không áp dụng transaction xuyên service. Service extraction chưa triển khai.
Status: Ready for implementation Lead qualification/handoff M2; Deal/customer đầy đủ Draft M4. Requirements: REQ-03, REQ-06, REQ-09.

## Mục tiêu và phạm vi

Đảm bảo Lead có nhu cầu rõ, nguồn và lịch sử hội thoại trước khi Sale nhận. Contact một người có nhiều Lead; mỗi Lead có thể sinh nhiều Deal về sau nếu nhu cầu được tách có chủ đích.

## Actor và quyền

Chat/AI qualify theo lead.create/qualify; workflow service actor chỉ handoff sang Sales team cấu hình. Sales user cần sales seat + lead.read/accept. Sales manager có assign/team scope. AI Sales owner được hỗ trợ bởi principal model nhưng mock case mặc định bàn giao Human.

## Use case và state machine

Lead `new → qualifying → qualified → handed_off → accepted`; new/qualifying → disqualified có reason. M2 không reopen terminal. Save draft không qualify; qualification command validate đủ field theo [dictionary](../data/dictionary.md). Từ new có thể qualify trực tiếp nếu input đầy đủ, vẫn ghi transition audit.

Qualified Lead handoff: tạo pending handoff, chuyển team sang Sales, route owner phù hợp hoặc NULL, grant Sales team read Contact, status handed_off. Sale accept atomically kiểm tra pending + quyền + version, set owner caller và status accepted, ghi accepted_at. Conversation owner vẫn giữ nguyên.

## Entity và invariant

Unique qualification_session_id chống tạo nhiều Lead từ retry chatflow. Một pending handoff mỗi Lead; due_at=requested_at+15 phút elapsed UTC. Không có assignee vẫn giữ trong Sales queue và cảnh báo, không đánh dấu accepted giả.

Lead snapshot source_touchpoint không thay bởi tin mới. Accepted không đồng nghĩa Deal won/Customer. M4 Deal bắt buộc Contact, Lead optional; một Contact thành Customer ở Deal thắng đầu tiên; appointment chỉ là bước trung gian.

## API và event

[Lead APIs](../contracts/api.md); `lead.created`, `lead.qualified`, `lead.handoff_requested`, `lead.accepted`. M2 không POST Deal hoặc cập nhật revenue thật. Pending handoff cancel dành cho hệ thống khi archive/suspend workflow có quyết định riêng; UI M2 không expose cancel/reopen.

## UI

Sales queue lọc pending/accepted, owner/team và nguồn; detail hiển thị nhu cầu, consent, phương thức liên lạc, Contact được phép đọc, link Conversation nếu có quyền. CTA “Nhận Lead” hiển thị kết quả CAS; không tự sửa record khác khi mở màn hình.

## Failure handling

Thiếu consent/nhu cầu → validation error, giữ draft. Hai sales nhận đồng thời chỉ một commit; người còn lại thấy owner mới. Assignment thất bại không rollback sự tồn tại Lead qualified; handoff command có thể để owner NULL nhưng phải lưu Sales team.

## Acceptance và dependency

[AC-03, AC-09, AC-15](../quality/acceptance.md); phụ thuộc CRM, Identity, Agents, Operations; tạo Lead từ Chatflow qua application command.

## Mở rộng còn Draft

Deal pipeline configurable, currency/forecast, lost reason, reopen/correction, task cadence, meeting conflict, customer lifecycle correction và approval cho hành động bán hàng cần đặc tả trước M4.

SRC-012 triển khai manual Lead create/draft/qualification/disqualify và session creation interface fail closed M1. [Exact core contract](../contracts/crm-core.md). SRC-013 có UI Lead qualification, không handoff/acceptance; Workflow handoff/acceptance đã có ở SRC-021; Sales queue UI đã có SRC-022.

SRC-021 exact commands, transaction authorization and durable attention: [Sales handoff contract](../contracts/sales-handoff.md).

SRC-022 Sales workspace projection, source/team/owner filters and explicit accept UI: [exact contract](../contracts/workspaces-m2.md). Related Contact/Conversation links require current read permission; queue/detail do not accept automatically.

## CRM base priority — PLAN-010

[CRM base plan](../planning/crm-base-outcomes.md) ưu tiên manual Lead/Deal và Conversation→Lead trước framework automation. [Source attribution rules](../contracts/crm-source-attribution.md): system channel/Page/ad và origin refs do backend snapshot một lần, không editable; declared source agent được chọn/sửa riêng có audit. Deal từ Lead pin lineage tới receipts/refunds và marketing report. Manual Deal không Lead hợp lệ, không fabricated attribution. Lead qualification/consent/handoff hiện có giữ nguyên; Deal pipeline/won/lost/reopen, collection evidence và exact permissions/API/DDL/UI chờ PLAN-011 Ready. SRC-045/046/048 là source follow-up, không claim runtime từ product rules này.

SRC-0682026-10-13: [Ready Customer360/session contract](../contracts/customer-360-session.md) defines forward28 session_touchpoint (Chat), sales_session_context and lead_merge (Sales), immutable origin versus actual context, active-session referral continuity and separate duplicate consolidation. Implemented and verified in SRC-068: 333unit,11 persistent MySQL,6 focused healthcare and8 native/browser groups; no stage/milestone/report completion claim. Existing physical monolith retains application ports; no external FK.
