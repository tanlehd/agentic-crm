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

## SRC-018 implementation contract (CHG-20261005-04)

Private application ports only; no HTTP execute/tools/fixture flags. `AgentExecutions.start(scope, session_id, message_id, action_key)` requires a trusted ChatflowSessionPort snapshot (conversation/principal/owner revision/service actor/current node/instruction/allowed tools). It verifies actual Conversation/Message and live Identity/fields/policy. Action key unique tenant+session+key; same key different message/session snapshot conflicts. Session port default throws SESSION_NOT_AVAILABLE until SRC-020; isolated tests supply a durable synthetic port, never a public mock session endpoint. Runtime result is not a public API response.

V12 adds agent_execution and tool_execution; session_id UUID is validated through the session port, physical session FK deferred until SRC-020 exists. Conversation/principal/service_actor FKs tenant-scoped. Execution queued→running→completed|failed|timed_out|cancelled; queue deadline30s and execution deadline min(policy.timeout_ms,30000). Reserve capacity in same UoW as running; terminal releases slot. Execution UUID never reused after expiry/release. Worker crash does not rerun external execution blindly: expired running becomes timed_out and requests Human. Request JSON stores trusted metadata/tool subset only, not transcript or draft; context and filtered draft rehydrated at every dispatch. No model-controlled test mode is persisted.

Adapter `execute(request, tool_results?)` returns protocol-validated result; continuation keeps execution ID/deadline, max5 unique tool calls total. Each batch validates schemas, unique call IDs, tool allowlist, all args and current access before committing; transaction rollback on failure. Tool rows persist args hash + sanitized result in same transaction as session draft effect. Exact replay rechecks live authorization; changed args same call_id -> TOOL_CALL_CONFLICT. Proposed reply persists only through session port, no direct send/CRM side effect. qualification.save permits only service_interest, need_summary, preferred_contact_method and phone draft; never consent/status/evidence. crm.read_contact limited to Conversation contact and field-filtered projection. routing.request_human accepts reason code request_human only and ends execution; it is not an arbitrary route command.

Tenant lock → Conversation/registry → execution → principal capacity. Every callback/tool/result checks execution token/status, DB deadline, owner_revision, active principal/auth revision, policy ID/version/content digest and service authorization. Request context max20 current readable text messages, readable Contact fields, filtered draft, locale/timezone; no connection credentials. Runtime input is untrusted and does not control permissions. Published instruction keys are administrative mock prompts, no clinical advice.

Takeover/close cancels queued/running executions and tool rows in the same ownership/close transaction; external adapter.cancel is best effort after commit via worker cancellation sweep, retry bounded. Cancellation acknowledgments do not undo outbound sending. Late results discarded with sanitized audit and never overwrite new owner. principal.access_changed runtime consumer cancels executions by live authorization, not stale event revision. Completed results are delivered to Chatflow port within guarded transaction; saved draft remains when Human takes over. Full Human form/session UI remains SRC-020.

Timeout, capacity queue expiry, runtime/protocol/tool failure invokes session handoff and Human routing through live service actor read/assign allowlist. If service role was revoked, persist attention on execution and cancel without unauthorized owner mutation; human operator can take over. Human routing guarded by current execution owner/revision so stale failure cannot replace the new Human owner. Agent execution attention is consumed by later operations UI (SRC-022).

Runtime protocol v1 exact JSON Schema is `packages/contracts/schemas/agent-runtime.json`, generated TypeScript/schema exported from contracts; Ajv validates the private request/result boundary. This first mock protocol uses proposed_reply/tool_calls/handoff_reason/error_code, not provider summary/usage extensions. No OpenAPI execute path is added. Terminal start replay preserves original execution ID/status after current owner/auth checks; new execution requires running session. Worker keeps at most4 in-flight adapters without blocking intake/outbound ticks; shutdown drains them within their original deadline.

SRC-020 supplies actual session port in production worker: proposal is private node data, outbound created only by guarded successful completion; draft and validated/evidence stored separately. Session logical reference stays owning-port validated; execution/turn binding is checked at callback. V16 proposed_reply is never returned by session projection. Old runtime synthetic harness remains isolated regression only.
