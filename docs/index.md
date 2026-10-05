# Bản đồ tài liệu

Ngày baseline: 2026-10-02. Trạng thái phản ánh độ sâu thiết kế, không phản ánh tính năng đã chạy.

- `Draft`: blueprint hoặc còn quyết định cần chốt trước khi implement phạm vi đó.
- `Ready for implementation`: phần được ghi rõ đã có hành vi, dữ liệu, contract và acceptance scenario để triển khai.
- `Implemented`: chỉ được gắn sau khi có source, kiểm thử và bằng chứng nghiệm thu.

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
| UX | [Workspaces](ux/workspaces.md) | Ready for implementation: wireframe/hành vi M2; các workspace nâng cao là Draft |
| Business | [Healthcare](business/healthcare.md), [First slice](business/first-slice.md) | Ready for implementation: fixtures và mock scenario; production integration là Draft |
| Quality | [Acceptance & traceability](quality/acceptance.md), [baseline validation](quality/validation.md) | M1 có unit/MySQL/browser evidence; M2 SRC-014/015 có MySQL và HTTP-worker evidence; full slice chưa chạy |
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
| MOD-05 | [Lead/Opportunity & Sale Workspace](modules/sales.md) | Lead core/draft/qualification implemented SRC-012/013; queue/handoff/accept M2 Ready; Deal/customer production Draft |
| MOD-06 | [Ticket System](modules/ticket.md) | Draft: blueprint M4 |
| MOD-07 | [Agent & Routing](modules/agents.md) | Routing/assignment/takeover implemented SRC-017; mock runtime SRC-018 Ready |
| MOD-08 | [Workflow](modules/workflow.md) | Ready for implementation: fixed primitive graph M2; visual builder Draft |
| MOD-09 | [Chatflow](modules/chatflow.md) | Ready for implementation: qualification flow M2; visual builder Draft |
| MOD-10 | [Reporting & Dashboard](modules/reporting.md) | Ready for implementation: KPI semantics; report builder/API Draft |
| MOD-11 | [Audit & Operations](modules/operations.md) | Outbox/inbox, audit, replay foundation implemented SRC-008; operations M2 tiếp tục |

Mọi mục `Ready` có phạm vi giới hạn như trên. Không suy diễn một file Ready thành toàn bộ roadmap của module đã sẵn sàng.

## Refinement khi bắt đầu source

[Auth transport](contracts/auth.md), [physical schema](data/physical-schema.md) và [toolchain manifest](../infra/toolchain.json) là baseline SRC-001. Exact image digest được khóa tại SRC-003 trước build image; không suy diễn metadata package pass thành runtime build pass.
