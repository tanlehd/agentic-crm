# MOD-06 — Ticket System

Status: Draft M4. Requirements: REQ-06, REQ-10.

## Mục tiêu và phạm vi

Theo dõi yêu cầu chăm sóc/phản hồi sau tư vấn hoặc sau bán, liên kết Contact/Conversation/Deal. Dùng chung principal ownership và object metadata, không xây identity/permission riêng.

## Actor và quyền

Service agent có service seat + ticket actions; supervisor điều phối/escalate; AI owner chỉ được xử lý loại Ticket theo policy. Quyền Ticket không tự cấp quyền Conversation hay mọi thông tin khách hàng.

## Use case và state machine

Blueprint: new → open → waiting_customer/waiting_internal → resolved → closed; reopen phải có reason. Tạo từ Conversation hoặc thủ công; chuyển Human nếu AI không đủ capability. SLA first response và resolution là hai đồng hồ riêng.

## Entity và invariant

Ticket subtype registry; pipeline/stage, priority, Contact bắt buộc, Conversation optional. SLA policy/calendar và pause interval cần persistent history, không tính bằng updated_at. Customer message có thể resume SLA theo policy đã pin lúc tạo.

## API và event

Định hướng commands create, assign, reply/link conversation, transition, escalate; dùng REST conventions hiện có. Event tương lai ticket.created/resolved/sla_breached cần schema trước code, chưa nằm catalog M2.

## UI

Queue theo SLA/priority/owner/team; detail timeline, liên kết Contact và Conversation có quyền; badge SLA hiển thị timezone/calendar và trạng thái pause.

## Failure handling

Escalation retry không lặp assignment/notification; clock drift và lịch nghỉ không làm mất interval; owner không hợp lệ chuyển queue có audit. Ticket failure không được đóng Conversation ngầm.

## Acceptance và dependency

[AC-10](../quality/acceptance.md); phụ thuộc CRM, Identity, Workflow, Channels và Operations.

## Mở rộng còn Draft

Trước M4 chốt SLA business calendar/timezone, điều kiện pause/resume, reopen window, stage version/migration, escalation target và reply channel policy. Chưa có bảng SLA vật lý hay endpoint implementable trong baseline này.
