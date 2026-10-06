# MOD-09 — Chatflow

> Kiến trúc đích microservice theo ADR-017: [Chatflow Orchestrator](../services/chatflow.md). Nội dung implementation/UoW/FK dưới đây mô tả baseline monolith; không áp dụng transaction xuyên service. Service extraction chưa triển khai.
Status: Ready for implementation qualification M2; visual builder Draft M5. Requirements: REQ-07, REQ-08, REQ-09.

## Mục tiêu và phạm vi

Quản lý các bước đối thoại và qualification trong một Conversation, có thể gọi mock AI nhưng business rule do backend kiểm tra. Workflow gọi Chatflow và nhận outcome, không tự xử lý từng tin nhắn.

## Actor và quyền

Designer/publisher theo automation permissions. AI turn dùng owner principal, Human takeover chuyển session sang paused_human. Deterministic CRM nodes dùng service actor của parent với allowlist và record binding, không cho runtime chọn arbitrary target record.

## Use case và state machine

Session `running ↔ waiting_message`, có thể `paused_human`, kết thúc `completed|failed|cancelled`. Chỉ một active session (running/waiting_message/paused_human) mỗi Conversation. Start cùng workflow action key trả session cũ. Start mới trong Conversation đang active trả conflict.

Graph `{entry_node,nodes:[{key,type,config,next?}]}` acyclic tối đa 30 nodes, mỗi node được chạy một lần; collect node có thể chờ nhiều tin cho chính field đó với tối đa 3 lần invalid rồi handoff. Không tự restart toàn graph khi có message.

| Node | Config / hành vi M2 |
|---|---|
| send_prompt | template text + declared variable refs; tạo send intent theo session:node:prompt_attempt |
| collect | variable_key, value_type(string/boolean/enum), required, choices?, prompt; wait message, validate kiểu; câu trả lời boolean chấp nhận yes/no/đồng ý/không đồng ý, không đoán consent |
| invoke_agent | instruction key, allowed_tools subset; timeout/max_calls theo policy; backend validate result |
| validate_qualification | kiểm tra các trường qualification bắt buộc, branch valid/invalid |
| upsert_lead | contact/conversation/session cố định; save draft rồi qualify khi hợp lệ; một Lead/session |
| request_human | reason,target_chat_team; pause session, route Human hoặc queue |
| end | outcome qualified/disqualified/needs_attention; lead_id nếu có |

M2 template ngành có field `service_interest`, `need_summary`, `preferred_contact_method`, `phone` nếu chọn phone và explicit `contact_permission`. Consent=false kết thúc disqualified, không ép đồng ý hay gửi marketing tiếp. Có thể lưu Lead disqualified nếu đã tạo draft; nếu chưa tạo thì không cần tạo Lead.

## Thuật toán message và handoff

Session khi start kiểm tra owner: AI phù hợp thì chạy; Human/unassigned thì paused_human và hiển thị form, không tự gửi dưới danh tính service actor. Khi waiting_message, claim message inbound chưa có chatflow_turn theo received_at/id; message mở Conversation là input đầu tiên, không bị bỏ qua. Mỗi lượt serialize bằng session row lock/version.

AI trích xuất nhu cầu chỉ thành draft; explicit consent chỉ từ khách chọn/nhắn xác nhận hoặc Human ghi nhận có evidence. Khách hỏi ngoài khả năng/timeout/3 invalid turns → request_human. Human takeover không làm session mất dữ liệu.

Human owner hoàn tất form bằng `POST /chatflow-sessions/{id}/complete-qualification`, input qualification + consent_message_id. Backend kiểm tra message thuộc Conversation, form đủ điều kiện, quyền lead.qualify và owner_revision; upsert Lead, qualified và session completed atomic, phát chatflow.completed cho parent. Conversation vẫn do Human giữ.

## Entity và invariant

Session pin version, owner_revision tại mỗi execution; turns dedup session+message. Variables typed theo node schema; thay version không đổi session đang chạy. Run/turn/node outcome persist trong chatflow_node_run trước dispatch tiếp; lease/fencing theo Workflow; outbound prompt idempotency giữ qua restart. `active_conversation_key` giữ cả khi paused_human và chỉ null khi terminal.

Close Conversation hoặc cancel parent → cancel session, queued prompts và pending executions. Human completion cần active paused_human session; hoàn tất lại với cùng key trả kết quả cũ, key khác sau terminal trả conflict.

## API và event

[Exact Chatflow contract](../contracts/chatflow.md), [Automation API](../contracts/api.md), [Agent contract](../contracts/agent-runtime.md); consume message.received/record.assigned/principal.access_changed; emit chatflow.completed/handoff_required/execution.failed. message.received đến trước start không mất vì đọc message store.

## UI

Qualification panel hiển thị field provenance/draft/validated, consent evidence, owner mode và lỗi field. Human có CTA hoàn tất/bàn giao khi đủ điều kiện; chưa đủ thì giữ form, không tạo success giả. Transcript không bị chỉnh sửa để phản ánh form.

## Failure handling

Không giải mã output LLM thành tool command khi schema sai. Timeout/forbidden/owner stale cancel AI, giữ draft và chuyển Human. Double message delivery không advance hai lần. Worker restart tiếp tục node đã persist, không gửi lại prompt đã sent.

## Acceptance và dependency

[AC-07, AC-08, AC-09, AC-16, AC-18](../quality/acceptance.md); phụ thuộc Conversation, Agents, Sales, Workflow wait interface và Operations.

## Mở rộng còn Draft

Multimodal, knowledge retrieval, intent branching mở, localization authoring, reusable subflows và experimentation; mọi node mới cần schema/tool permission trước builder UI.

## SRC-020 source implementation

Definition/version/publish/read API and inbox Human panel use exact [contract](../contracts/chatflow.md). V14–v16 add session/node/turn, nullable-FK guard and private runtime proposal. Worker polls MySQL with60s fenced claims; each node commits effects and progress atomically. Actual Workflow child and Runtime session ports are composed in API/worker; Sales handoff remains unavailable until SRC-021. Takeover/close hooks pause/cancel atomically, preserving draft/validated provenance. Qualification is single Lead/session with bound evidence and current Human owner/CAS guards. Acceptance and browser/preview verification status follow [SRC-020 evidence](../tracking/details/SRC-020.md).
