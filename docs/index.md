# Bản đồ tài liệu

**Điểm vào theo sản phẩm:** [Nhóm tính năng theo mục tiêu và người sử dụng](product/capability-map.md). Dùng cùng trục cho giới thiệu tính năng, UX, hướng dẫn, demo và presentation; các nhóm tài liệu kỹ thuật bên dưới phục vụ truy vết.

[Thread / Conversation implementation](development/thread-conversation.md) — SRC-078 /2026-10-16: stage + classification per episode, history across team transfer, Related Lead/Deal actions. [Exact gate](contracts/thread-conversation-implementation.md) · [Evidence](tracking/details/SRC-078.md). Ticket/connected Reporting remain gated.

[Intercom / nhiều lượt trao đổi / hồ sơ nghiệp vụ xuyên phiên](references/intercom-multiple-interaction-rounds.md) — PLAN-032 research2026-10-15; logical model và khuyến nghị, không đổi Ready contracts.

[HubSpot Conversation / Ticket stages / Help Desk fields](references/hubspot-conversation-stage-fields.md) — PLAN-031 research2026-10-15; stage trong workspace thuộc Ticket, chưa là Ready contract.

[HubSpot Ticket–Conversation ERD / close–reopen / threading / merge](references/hubspot-ticket-conversation-lifecycle.md) — phân biệt Inbox legacy, Help Desk và giới hạn kiểm chứng Facebook.

[Salesforce MessagingSession / Email-to-Case / fields theo stage](references/salesforce-session-stage-fields.md) — PLAN-030 research2026-10-15; phân biệt object values, Path, layout/visibility và validation; chưa là Ready contract.

[Contact versus Session custom fields / Facebook attribution](references/conversation-session-fields-attribution.md) — PLAN-029, nghiên cứu2026-10-15 từ respond.io, Chatwoot và Meta; khuyến nghị phạm vi, chưa là contract Ready hoặc implementation.

[No-code Object Platform PLAN-028](planning/no-code-object-platform.md) — [UX](ux/object-properties-workspace.md), [entity model](data/no-code-entity-model.md), [contract direction](contracts/no-code-object-platform.md), [acceptance](quality/no-code-object-platform-acceptance.md), [Salesforce research](references/salesforce-object-platform.md). Product plan2026-10-15; bounded SRC-073/074 đã có [runtime hướng dẫn](development/object-platform.md) và [evidence](tracking/details/SRC-074.md), lifecycle/connected consumers còn gate.

[Dashboard/Reports redesign PLAN-027](planning/dashboard-workspace.md) — feature/flow, [component và screen](ux/dashboard-workspace.md), [data/table design](data/dashboard-workspace.md), [API](contracts/dashboard-workspace.md), [acceptance](quality/dashboard-workspace-acceptance.md). 2026-10-14: design for review only; user explicitly requests review before code. Không thay runtime hoặc đóng generic Reporting gates.

[ERD cuối Chat → Session → Stage/Touchpoint → Lead/Deal](data/chat-sales-erd.md), CHG-20261013-08: logical design accepted2026-10-13; exact DDL/API/runtime replacement chưa Ready/implemented.

Chuẩn thiết kế mới ADR-021: [schema catalog](data/schema-catalog.md), [database guideline](data/database-guidelines.md), [table placement inventory](data/table-placement-inventory.md), [table design template](templates/database-table.md), [native auth](contracts/native-auth.md), [transition plan](planning/native-identity-data-plan.md), [research](references/crm-database-patterns.md). Các mục OIDC/Keycloak implemented bên dưới mô tả baseline, không phải target được tiếp tục mở rộng.


Kiến trúc đích hiện tại theo ADR-017: [enterprise service catalog](services/README.md), [architecture](system/architecture.md), [data ownership](data/service-ownership.md), [contracts](contracts/service-boundaries.md), [migration plan](planning/microservices-migration.md). Mỗi service có scope/internal architecture/data model/interfaces/operations/extraction gates. [Monolith baseline](system/monolith-baseline.md) giữ để đối chiếu source hiện tại.

Ngày baseline: 2026-10-02. Trạng thái phản ánh độ sâu thiết kế, không phản ánh tính năng đã chạy.

- `Draft`: blueprint hoặc còn quyết định cần chốt trước khi implement phạm vi đó.
- `Ready for implementation`: phần được ghi rõ đã có hành vi, dữ liệu, contract và acceptance scenario để triển khai.
- `Implemented`: chỉ được gắn sau khi có source, kiểm thử và bằng chứng nghiệm thu.

## UI/UX redesign UX-003

[UX hub](ux/README.md) · [Research](ux/research-app-shell.md) · [Guidelines](ux/guidelines.md) · [App shell](ux/app-shell.md) · [Inbox spec](ux/inbox-screen.md) · [Interactive mock](ux/mockups/inbox.html) · [Screen template](templates/ux-screen.md). Thiết kế trước Inbox; module Draft giữ gate riêng, không claim runtime từ mock.

## Điều hướng

| Nhóm | Tài liệu | Trạng thái / phạm vi |
|---|---|---|
| Product | [Vision](product/vision.md), [Glossary](product/glossary.md) | Ready for implementation: baseline thuật ngữ/phạm vi |
| Planning | [Roadmap](product/roadmap.md) | Ready for implementation: thứ tự milestone; chưa cam kết lịch |
| Build & tracking | [Build plan](planning/build-plan.md), [tasks](tracking/tasks.md), [checkpoint](tracking/checkpoint.md), [log](tracking/log.md) | Kế hoạch 25 task M1–M2; status source xem tracker |
| Docker | [Development & packaging](system/docker-development.md) | M1 images + Conversation backend, migration v10, auth và seed Alpha/Beta đã chạy |
| Governance | [Development](governance/development.md), [module template](templates/module-design.md) | Ready for implementation |
| Build governance | [Change control](governance/change-control.md), [task template](templates/task.md), [AGENTS](../AGENTS.md) | Cập nhật docs/evidence/checkpoint mỗi phiên |
| System | [Architecture](system/architecture.md), [Security & operations](system/security-operations.md) | Ready for implementation: M1–M2; scaling nâng cao là Draft |
| Data | [Model & ERD](data/model.md), [Dictionary](data/dictionary.md) | Ready for implementation: bảng M1–M2; bảng M4–M5 là Draft |
| Contract | [REST API](contracts/api.md), [Events](contracts/events.md), [Conversation DTO](contracts/conversation.md), [Mock intake](contracts/mock-intake.md), [Agent Runtime](contracts/agent-runtime.md) | Ready for implementation: mock slice M1–M2 |
| UX | [Workspaces](ux/workspaces.md), [Agent Chat rebuild](ux/agent-chat-workspace.md), [Workspace contract](contracts/agent-chat-workspace.md), [Data](data/agent-chat-workspace.md), [Build](planning/agent-chat-workspace.md) | UX-002/003 Ready design; backend SRC-032…034 DONE, UI/release còn SRC-035…037; provider capability gates riêng |
| Business | [Healthcare](business/healthcare.md), [First slice](business/first-slice.md) | Ready for implementation: fixtures và mock scenario; production integration là Draft |
| Quality | [Acceptance & traceability](quality/acceptance.md), [baseline validation](quality/validation.md) | M1–M2 local/mock gates PASS; release SRC-025, real provider M3 chưa chạy |
| Decisions | [ADRs](decisions/README.md) | Accepted: baseline thiết kế |
| References | [Nguồn tham khảo](references.md) | Tách đặc tính tham khảo khỏi quyết định tự thiết kế |

## Chạy source hiện tại

[Local runbook](development/local.md), [Verification/CI](development/verification.md), [SRC-002 evidence](tracking/details/SRC-002.md), [SRC-003 evidence](tracking/details/SRC-003.md). CRM/Admin M1 đã có implementation; xem [SRC-013 evidence](tracking/details/SRC-013.md).

## Thiết kế module

| ID | Module | Độ sâu hiện tại |
|---|---|---|
| MOD-01 | [Identity & Administration](modules/identity.md) | OIDC, membership/seat/role/team và local seed implemented SRC-006/007/009; Admin UI implemented SRC-013 |
| MOD-02 | [CRM & Object Platform](modules/crm.md) | Registry/association, properties/custom CRUD, Contact/Company/Activity và UI implemented SRC-010…013; advanced builder Draft |
| MOD-03 | [Channels & Acquisition](modules/channels.md) | Mock Messenger durable intake/identity/CTM implemented SRC-015; connector thật/Google Ads Draft |
| MOD-04 | [Conversation & Chat Workspace](modules/conversation.md) | Domain/API/notes/mock outbound SRC-014 và inbox UI SRC-016 implemented; routing/takeover SRC-017 implemented; session/Sales handoff SRC-020/021 |
| MOD-05 | [Lead/Opportunity & Sale Workspace](modules/sales.md) | Lead core/draft/qualification implemented SRC-012/013; queue/handoff/accept M2 implemented SRC-021/022; Deal/customer production Draft |
| MOD-06 | [Ticket System](modules/ticket.md) | Draft: blueprint M4 |
| MOD-07 | [Agent & Routing](modules/agents.md) | Routing/assignment/takeover implemented SRC-017; private mock runtime SRC-018 implemented; session integration SRC-020 |
| MOD-08 | [Workflow](modules/workflow.md) | Primitive M2 implemented SRC-019/020/021; [native metadata + Core validator](development/workflow-foundation.md) SRC-065 delivered; [Web/API/Core/Kafka plan](planning/workflow-platform.md) runtime/persistence/CMS gates remain |
| MOD-09 | [Chatflow](modules/chatflow.md) | SRC-020 DONE: qualification flow M2; visual builder Draft |
| MOD-10 | [Reporting & Dashboard](modules/reporting.md) | Semantic kernel/private drafts + [typed mock projections](development/reporting-projections.md) implemented SRC-063/057/058; [plan](planning/report-builder.md); remaining query/ACL/publish/UI gate PLAN-022 TODO |
| MOD-11 | [Audit & Operations](modules/operations.md) | Outbox/inbox, audit, replay foundation implemented SRC-008; operations M2 UI implemented SRC-022 |

Mọi mục `Ready` có phạm vi giới hạn như trên. Không suy diễn một file Ready thành toàn bộ roadmap của module đã sẵn sàng.

## Refinement khi bắt đầu source

[Auth transport](contracts/auth.md), [physical schema](data/physical-schema.md) và [toolchain manifest](../infra/toolchain.json) là baseline SRC-001. Exact image digest được khóa tại SRC-003 trước build image; không suy diễn metadata package pass thành runtime build pass.

SRC-021 Sales handoff/acceptance backend DONE; [exact contract](contracts/sales-handoff.md), [execution evidence](tracking/details/SRC-021.md). Preview nâng schema17 trong SRC-022.

SRC-022 Sales/Operations UI DONE: [workspace contract](contracts/workspaces-m2.md), [evidence](tracking/details/SRC-022.md). SRC-023 healthcare fixture/KPI DONE; SRC-024 fault/regression DONE ([matrix](quality/m2-fault-suite.md), [evidence](tracking/details/SRC-024.md)); SRC-025 local/mock M2 release gate DONE ([runbook](development/m2-release.md), [evidence](tracking/details/SRC-025.md)); native ARM64 và emulated AMD64.

## Thiết kế M3 sau release M2

[Provider plan](planning/m3-provider-plan.md) · [message envelope Draft](contracts/messaging-platforms.md) · [Meta docs dossier](references/meta/README.md). Định hướng provider/connector được user chấp thuận; contract production chưa Ready. PLAN-003 đã có [capability/source gap matrix](references/meta/capability-matrix.md); PLAN-004 tiếp tục exact contracts và source backlog, giữ live routing/tool gates còn mở. M2 đã PASS theo tracker; các mô tả theo từng task cũ không là trạng thái hiện hành.

ADR-019 / PLAN-006B: [Contact resolution, Connector cache and required Chat contact context](contracts/contact-resolution.md), accepted responsibility design; exact source gate pending.

- [Customer360 / session implementation](contracts/customer-360-session.md) · [Runbook](development/customer360.md) · [SRC-068 evidence](tracking/details/SRC-068.md).
- [Session stages, scoped evidence and connected funnel](contracts/session-progress.md) · [Runbook](development/session-progress.md) · [SRC-069 evidence](tracking/details/SRC-069.md).

- [50-inbox operations and advertising dashboards](contracts/inbox-demo-dashboards.md) · [Runbook](development/inbox-demo-dashboards.md) · [SRC-070 evidence](tracking/details/SRC-070.md) — Alpha Reporting activation pending.
