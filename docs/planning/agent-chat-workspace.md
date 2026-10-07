# Agent Chat workspace — kế hoạch build theo UX-002

Status: Ready scoped design; SRC-032/033/034 DONE backend (SRC-038 final regression); trạng thái source theo tracker. [UX](../ux/agent-chat-workspace.md), [contract](../contracts/agent-chat-workspace.md), [data model](../data/agent-chat-workspace.md). CHG-20261006-19 bổ sung product flow phù hợp ảnh theo chỉ đạo người dùng, không đợi toàn bộ provider M3 hoàn tất để xây nội bộ Chat.

| Task | Deliverable | Dependency | Gate |
|---|---|---|---|
| SRC-032 | Sidecars/sequence/coverage/read markers, queue server search/sort/sidebar metrics, capabilities | UX-002; SRC-031 | Forward migrations + exact JSON Schema/OpenAPI/generated client; backfill/catch-up; UX-CHAT-13/14/15/19/22 |
| SRC-033 | Personal/shared inbox, conversation tags, snippets catalog và permissions | SRC-032 | Migrations/strict DTO/events; share/revoke/transfer, quota/ACL/concurrency; UX-CHAT-16/17/21 |
| SRC-034 | Durable snooze + activity feed, CRM note/Workflow/Chatflow notifications | SRC-033 | Producer outbox + consumer dedup/source ACL, worker CAS/restart/Redis outage, legacy writers regression; UX-CHAT-18/20/22 |
| SRC-035 | CRM address/language metadata và contact channel identities/navigation APIs | SRC-034 | Exact schema/property seed, field ACL/Contact+Conversation scope, no secret/identity leak; UX-CHAT-21 |
| SRC-036 | Rebuild app shell/grouped nav và Inbox theo UX-003, tích hợp UX-002 contracts | SRC-035; UX-004 | UX-APP-01…08 + UX-CHAT-01…22; tenant/error/draft/keyboard/responsive; không dummy controls hoặc search toàn CRM chưa có contract |
| SRC-037 | Upgrade/restart/regression và release gate workspace | SRC-036 | Existing data preserved, rollout watermark/flags, no unknown resend, rollback drill và synthetic demo; không live Meta claim |

Đây là backlog tuần tự, không tạo agent/lịch nền và không tự claim source. Tracker là status authority. Exact machine schema/DDL là deliverable đầu mỗi source task, phải khớp thiết kế và được kiểm trước code phụ thuộc; không rewrite old schema/event. Task có gap nghiệp vụ phải change trước khi code, không tự đổi metric semantics.

Mỗi task cần command/result/artifact + docs/checkpoint cùng phiên; draft implementation không được gọi DONE. Provider media/receipts/call/control/AI rewrite và full M3 ingress vẫn là workstream riêng; nếu chưa có capability, không tính vào gate workspace nội bộ. Release chỉ local/mock cho những transport đang có.

## UX-003 shell integration — 2026-10-07

[Shell](../ux/app-shell.md), [Inbox](../ux/inbox-screen.md), [guideline](../ux/guidelines.md) và mock thay app rail56 của UX-001. SRC-036 cần UX-004 DONE cùng SRC-035; một implementation task active. Scope shell đầu tiên: nav có quyền, header, search công cụ, drawer/form launcher Contact/Lead trên form hiện có. Search CRM đa object/profile edit và Deals/Marketing/Reporting production cần scoped design riêng; không tự mở rộng module Draft. UX-APP-01…08 và UX-CHAT-01…22 đi vào SRC-036; release SRC-037 vẫn riêng.

## SRC-039 scoped presentation implementation

CHG-20261007-06: user requested implementation of approved no-tab layout. SRC-039 can deliver header/nav + existing CRM forms + API-backed Inbox queue/detail/composer/context independently after SRC-034/SRC-038/UX-004. No schema/API change. Missing Contact metadata/channel navigation remains SRC-035; full saved-inbox lifecycle/share/tag management/activity/read-marker integration and workspace release remain SRC-036/037 unless specifically evidenced. Hide capability-unavailable controls, do not fabricate metrics or backend behavior. This split does not mark SRC-036 DONE or remove its acceptance gates.

## Conversation suggestions and orchestration — PLAN-008 (after framework gates)

[UX-005 product scope](../ux/agent-assist-response.md) splits the use case into two independently scoped parts:

1. Conversation assessment/Next action attributes and a narrowly authorized update action, independent of AI. Exact persistence/schema/API/ACL/migration and rule-only tests first.
2. Workflow/Chatflow triggers, conditions and result application. Fixed rules or a configured skill/permission-limited Agent Assist produce input for the same action. Assist proposes only; no direct CRM writes or public replies. Orchestrator service actor performs the authorized update of suggestion fields.

PLAN-008 remains TODO for exact contracts, including false-vs-no-reply distinction, provenance, revision fences, idempotency and action registration. Part1 must not depend on a provider adapter; Part2 must not activate unavailable triggers/actions or inherit owner-agent write tools. Source tasks are scoped after the exact design gate, no implicit expansion of M2 runtime.

UX-006 refinement: Part1 stores one nullable typed next_action; no independent need_response target flag. Catalog starts response/create_lead/create_ticket/close_chat. PLAN-008 includes client mapping and legacy boolean compatibility, distinguishes sent evidence from suggestions, and preserves rule-only operation. [Catalog](../ux/agent-assist-response.md).

CHG-20261007-11 supersedes earlier immediate PLAN-008 priority: complete Workflow → Chatflow → AI Agent frameworks first (PLAN-009/SRC-042/043/044). PLAN-008 only then defines integration into Chat. [Sequence and gates](automation-frameworks.md). Do not begin Next action Chat integration before these dependencies are DONE.
