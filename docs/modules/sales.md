# MOD-05 — Lead/Opportunity & Sale Workspace

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
