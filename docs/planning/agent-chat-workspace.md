# Agent Chat workspace — kế hoạch build theo UX-002

Status: Ready scoped design; SRC-032/033 DONE; SRC-034 tiếp theo; trạng thái source theo tracker. [UX](../ux/agent-chat-workspace.md), [contract](../contracts/agent-chat-workspace.md), [data model](../data/agent-chat-workspace.md). CHG-20261006-19 bổ sung product flow phù hợp ảnh theo chỉ đạo người dùng, không đợi toàn bộ provider M3 hoàn tất để xây nội bộ Chat.

| Task | Deliverable | Dependency | Gate |
|---|---|---|---|
| SRC-032 | Sidecars/sequence/coverage/read markers, queue server search/sort/sidebar metrics, capabilities | UX-002; SRC-031 | Forward migrations + exact JSON Schema/OpenAPI/generated client; backfill/catch-up; UX-CHAT-13/14/15/19/22 |
| SRC-033 | Personal/shared inbox, conversation tags, snippets catalog và permissions | SRC-032 | Migrations/strict DTO/events; share/revoke/transfer, quota/ACL/concurrency; UX-CHAT-16/17/21 |
| SRC-034 | Durable snooze + activity feed, CRM note/Workflow/Chatflow notifications | SRC-033 | Producer outbox + consumer dedup/source ACL, worker CAS/restart/Redis outage, legacy writers regression; UX-CHAT-18/20/22 |
| SRC-035 | CRM address/language metadata và contact channel identities/navigation APIs | SRC-034 | Exact schema/property seed, field ACL/Contact+Conversation scope, no secret/identity leak; UX-CHAT-21 |
| SRC-036 | Rebuild Agent Chat UI theo sample và tích hợp contracts mới | SRC-035 | UX-CHAT-01…22 browser/data tests; tenant/error/keyboard/responsive; không dummy controls |
| SRC-037 | Upgrade/restart/regression và release gate workspace | SRC-036 | Existing data preserved, rollout watermark/flags, no unknown resend, rollback drill và synthetic demo; không live Meta claim |

Đây là backlog tuần tự, không tạo agent/lịch nền và không tự claim source. Tracker là status authority. Exact machine schema/DDL là deliverable đầu mỗi source task, phải khớp thiết kế và được kiểm trước code phụ thuộc; không rewrite old schema/event. Task có gap nghiệp vụ phải change trước khi code, không tự đổi metric semantics.

Mỗi task cần command/result/artifact + docs/checkpoint cùng phiên; draft implementation không được gọi DONE. Provider media/receipts/call/control/AI rewrite và full M3 ingress vẫn là workstream riêng; nếu chưa có capability, không tính vào gate workspace nội bộ. Release chỉ local/mock cho những transport đang có.
