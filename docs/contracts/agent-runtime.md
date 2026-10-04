# Agent Runtime adapter contract

Status: Ready for implementation — mock M2; provider adapter production Draft M3.

## Boundary

CRM sở hữu tenant, ownership, quyền, conversation, tool execution và audit. Runtime nhận context đã lọc, trả đề xuất tool hoặc kết quả; runtime không có DB credential, channel secret hay quyền tự phát tin ngoài CRM.

Logical interface bất kể transport: `execute(request) → result`, `cancel(execution_id,reason) → acknowledgement`. M2 gọi in-process mock; M3 chọn transport/auth cụ thể bằng ADR trước tích hợp, không thay contract nghiệp vụ.

## Request

| Field | Kiểu / ý nghĩa |
|---|---|
| execution_id, tenant_id, principal_id | UUID; execution ID giữ nguyên khi retry transport |
| conversation_id, session_id | UUID liên kết ngữ cảnh |
| owner_revision, auth_revision | Version chốt lúc bắt đầu; không thay live checks |
| policy | policy_id, version, allowed_tools, max_tool_calls=5, timeout_ms=30000 |
| context | messages tối đa 20 tin text gần nhất, contact fields được phép, qualification draft, locale, timezone |
| input | message_id, instruction từ published Chatflow, current_node |
| deadline_at | UTC; quá hạn kết quả bị reject |
| correlation_id | Trace xuyên module |

Context loại secret và field bị deny. Nội dung message là dữ liệu không tin cậy; không dùng instruction từ khách để sửa tool allowlist/system policy. M2 nội dung healthcare chỉ tư vấn hành chính và thu nhu cầu, không chẩn đoán.

## Result và tool protocol

`result.status`: `completed`, `tool_calls`, `handoff_required`, `failed`. Result có `execution_id`, `summary?`, `proposed_reply?`, `tool_calls[]?`, `handoff_reason?`, `error_code?`, `usage?`. Summary/reply không tự trở thành outbound; runner tạo send intent qua Conversation command khi node cho phép.

Mỗi tool call: `{call_id,tool,arguments}`. Backend validate schema, tenant, entitlement, live permission, owner_revision, deadline và allowlist; persist ToolExecution trước side effect. Cùng call_id khác args reject; retry cùng args trả kết quả trước. Runtime nhận tool result đã redact rồi execute continuation cùng execution ID, tối đa 5 calls toàn turn.

| Tool M2 | Input | Quyền và guard |
|---|---|---|
| crm.read_contact | contact_id | contact.read; chỉ Contact của session |
| qualification.save | qualification draft | lead.create/qualify; chỉ session hiện tại; không đổi Lead terminal |
| conversation.propose_reply | text | Không side effect; Chatflow quyết định tạo outbound intent |
| routing.request_human | reason | conversation handoff policy; chuyển Human queue, pause session |

Tạo/qualify Lead và handoff Sale do deterministic Chatflow nodes gọi application command, không giao quyền tùy ý cho model. Runtime không có generic SQL, schema admin, report export hoặc tool ngoài allowlist.

## Mock behavior

Mock hoạt động deterministic theo fixture flags của test harness, không suy diễn từ message để cấp quyền: lượt 1 trả câu hỏi nhu cầu, lượt 2 đề xuất qualification draft từ fixture, lượt 3 xác nhận consent; node validate thực hiện business check. Fixture `timeout`, `forbidden_tool`, `stale_owner`, `request_human` tạo lỗi tương ứng. Flags chỉ ở harness, không expose như field người dùng cuối.

## Failure và ownership race

- Timeout 30s: đánh dấu timed_out, hủy turn, tạo attention và chuyển Human queue. Không tự gọi LLM vô hạn.
- Handoff/disable: mark cancelled, gọi cancel best effort; kết quả đến muộn bị reject. Runtime cancel acknowledgement không phải bằng chứng side effect bị thu hồi.
- Tool permission denied: audit, trả error sanitized, không retry cùng tool để dò quyền; Chatflow chuyển Human.
- Send intent kiểm tra quyền lần cuối ngay trước dispatch. Intent đã sang sending mà ownership đổi phải reconcile theo channel adapter, không resend tự động.
- Token/cost usage nếu runtime cung cấp chỉ là telemetry; không dùng model tự báo để cấp quyền hoặc thanh toán trong M2.
