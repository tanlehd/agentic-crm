# MOD-07 — Agent & Routing

> Kiến trúc đích microservice theo ADR-017: [AI Runtime Platform](../services/ai-runtime.md). Routing/allocation tách riêng ở [Routing Service](../services/routing.md). Nội dung implementation/UoW/FK dưới đây mô tả baseline monolith; không áp dụng transaction xuyên service. Service extraction chưa triển khai.
Status: Ready for implementation M2 rule-based routing/mock AI. Requirements: REQ-06, REQ-07.

## Mục tiêu và phạm vi

Phân công theo capability, team, availability và capacity; cùng một model owner cho Human/AI. Hiệu suất là telemetry phục vụ doanh nghiệp, chưa dùng adaptive routing hoặc model tự thay policy.

## Actor và quyền

Tenant admin cấu hình AI policy; supervisor assign/takeover; workflow service actor chạy route action trong allowlist. Owner phải là active principal, Human có seat phù hợp, AI có capability/role. Membership/team/policy mới nhất được kiểm tra trước assignment.

## Use case và state machine

Principal availability M2 là config available/unavailable. Human fixture mặc định available; không suy luận presence qua trình duyệt. AI eligible nếu available, active, đủ tool/role, dưới max_concurrency. Human capacity M2 unlimited; mở rộng capacity là M3.

Route primitive M2 nhận team_id, capability và preference `human|ai|any`. Lọc eligible rồi round-robin theo principal UUID ascending, tiếp sau last_principal_id trong routing_cursor. Lock cursor và target capacity rows để tránh vượt concurrency; lưu assignment/history cùng transaction. Không có eligible thì giữ owner NULL, team vẫn set, sinh attention; không chọn agent thiếu quyền.

AI capacity là số agent_execution running, không phải số Conversation sở hữu. Trước execute phải reserve slot atomic; hết slot thì queued tối đa 30 giây, quá hạn chuyển Human queue. Assignment không bảo đảm execution sẽ chạy ngay.

## Entity và invariant

Principal, team_member, agent_policy, routing_cursor và ownership_history theo dictionary. Owner/team update tăng owner_revision và version; mọi handoff có reason/actor/from/to. `record.assigned` làm downstream biết thay đổi nhưng việc chặn stale execution phải dựa DB revision.

Conversation takeover: transaction assign caller, pause active session, cancel queued send/tool intent; cancel external runtime best effort. Lead/Deal/Ticket owner không bị kéo theo. Handoff AI→Human queue đặt owner NULL hoặc selected Human và lưu reason.

## API và event

[Assignment/takeover](../contracts/api.md), [runtime contract](../contracts/agent-runtime.md). Policy M2 giới hạn 5 tool calls/turn, 30s execute, no arbitrary tools. Reply suggestions chỉ trở thành message qua authorized send intent.

## UI

Owner selector hiển thị Human/AI, team, capability và trạng thái; target không đủ điều kiện disabled kèm reason. Assignment history là timeline. Hiệu suất hiển thị theo volume, qualification, acceptance và latency; không coi số tin nhắn nhiều là conversion tốt.

## Failure handling

Stale owner kết quả runtime bị discard có audit. Runtime timeout/forbidden tool chuyển Human. In-flight outbound reconcile theo Channels, không bảo đảm hủy được tin đã dispatch. Disable principal làm owner record được đánh dấu cần phân công; không tự gán sang người bất kỳ.

## Acceptance và dependency

[AC-06, AC-07, AC-18](../quality/acceptance.md); phụ thuộc Identity, CRM ownership, Conversation, Operations.

## Mở rộng còn Draft

Routing theo hiệu suất cần metric window/minimum sample/cold start và policy giải thích được; cost budget theo tenant, knowledge/RAG, skill catalog và agent marketplace thiết kế ở milestone sau.

SRC-017 implementation binding: [routing contract](../contracts/routing.md), physical v11. Ownership cancellation/session callback is composed through UoW ports; runtime implemented SRC-018; production session engine remains SRC-020.

SRC-018: private validated runtime protocol, deterministic adapter, v12 execution/tool ledger, capacity/deadline fencing, live authorization and cancellation are implemented. Worker uses a fail-closed session port until SRC-020; durable synthetic session harness is test-only. Proposals never send directly; draft tools cannot set consent/status. [Evidence](../tracking/details/SRC-018.md).

## M3 — AI Agent providers (Draft)

User direction CHG-20261006-03: AI Runtime là platform; CRM có AI Agent setup chọn provider, Meta AI Agent (Meta Business Agent) làm case study. Provider lifecycle/config/knowledge/instructions/tools/test/telemetry tách khỏi messaging CRM Connector. Hỗ trợ thiết kế cả CRM-managed execution và provider-managed conversations; protocol mock M2 không là interface bắt buộc cho mọi provider. Owner Human/AI và CRM permission vẫn thuộc CRM; provider thread control cần observed/desired state và reconciliation riêng. Xem [M3 plan](../planning/m3-provider-plan.md) và [provider evidence/gaps](../references/meta/README.md). Phạm vi thiết kế production chưa Ready.

PLAN-003: [capability matrix](../references/meta/capability-matrix.md) bổ sung provider allowlist, config/eval versions và shared Business Manager budget semantics. Màn hình admin chỉ expose mutation đúng asset authority; không cho tenant admin sửa budget chung mặc định. Hosted tool gateway còn gate trusted callback binding; đầy đủ platform API không đồng nghĩa được cấp arbitrary CRM tool access.
