# Roadmap và backlog

Status: Ready for implementation — thứ tự và gate; không cam kết ngày.

| Milestone | Đầu ra | Gate hoàn tất |
|---|---|---|
| M0 — Documentation baseline | Bộ tài liệu hiện tại, ERD, contracts, ADR, fixtures | Link hợp lệ, traceability REQ→design→AC, không lẫn Draft với Ready |
| M1 — Foundation | Tenant/OIDC, seat/role/team, registry, Contact/Lead, custom object, audit/outbox | AC-01…04, AC-12, AC-14; migration từ DB trống; hai tenant |
| M2 — Mock vertical slice | Mock Messenger, inbox, routing, Workflow/Chatflow, mock AI, Lead acceptance | AC-05…09, AC-15…18; restart/retry và handoff end-to-end |
| M3 — Real integrations | CRM Connectors/routing thật, AI Agent provider setup (Meta Business Agent case study), message đa nền tảng và theo dõi hiệu suất | Spec connector/provider được nâng Ready; sandbox credential, signature, rate limit, outbound reconciliation được kiểm thử |
| M4 — Revenue & service | Deal/customer, Appointment, Google Ads lead form, Ticket | Hoàn thiện thiết kế module Draft; AC-03 phần Deal, AC-10, AC-13 |
| M5 — Configurable platform | Visual workflow/chatflow, form/view builder, custom reports, template ngành | Version/migration metadata, reporting ACL, fan-out join và publish validation; AC-04 nâng cao, AC-11 |

## Backlog triển khai theo dependency

| ID | Việc | Dependency | Thiết kế tham chiếu |
|---|---|---|---|
| B-01 | Workspace source, CI, MySQL/Redis local, migration framework | M0 | [Architecture](../system/architecture.md) |
| B-02 | Tenant context + OIDC + membership + permission evaluation | B-01 | [Identity](../modules/identity.md) |
| B-03 | Record registry, metadata, Contact, custom record, association | B-02 | [CRM](../modules/crm.md) |
| B-04 | Audit, outbox, consumer inbox, idempotency | B-02 | [Operations](../modules/operations.md) |
| B-05 | Channel normalization + mock intake + identity resolution | B-03, B-04 | [Channels](../modules/channels.md) |
| B-06 | Conversation, Message, owner CAS, inbox UI | B-05 | [Conversation](../modules/conversation.md) |
| B-07 | Agent policy, routing, mock runtime, handoff | B-06 | [Agents](../modules/agents.md) |
| B-08 | Workflow/Chatflow definitions, durable runs, wait/resume | B-04, B-07 | [Workflow](../modules/workflow.md), [Chatflow](../modules/chatflow.md) |
| B-09 | Qualify Lead, Sale handoff/acceptance UI | B-03, B-08 | [Sales](../modules/sales.md) |
| B-10 | Full mock fixture replay + failure injection | B-09 | [Acceptance](../quality/acceptance.md) |

Lựa chọn implementation đã được cụ thể hóa ở [build plan](../planning/build-plan.md) và ADR-011/012: TypeORM/mysql2, Tailwind/shadcn, Keycloak dev, portable verification và GitHub Actions adapter. Exact versions và auth/physical schema refinement được khóa ở SRC-001 trước scaffold. Không thay đổi MySQL, ranh giới module hoặc invariant dữ liệu theo lựa chọn thư viện.

Theo dõi thực thi nhiều ngày bằng [tracker 25 task](../tracking/tasks.md), [checkpoint](../tracking/checkpoint.md) và [execution log](../tracking/log.md). B-01…B-10 giữ vai trò roadmap tổng thể; trạng thái chi tiết chỉ ghi trong tracker, không duy trì hai bảng status độc lập.

## Trước khi mở rộng

- M3: theo [provider plan](../planning/m3-provider-plan.md): lưu provider docs local, kiểm capability/eligibility/version, chốt Agent setup và CRM Connector/routing/message contracts. Messenger routing và WhatsApp Agent thread control kiểm riêng; không dùng mock contract như payload provider thật.
- M4: chốt vòng đời Deal/reopen/customer, SLA calendar, Google Ads consent/attribution và appointment conflict trong thiết kế chi tiết trước code.
- M5: chốt giới hạn graph/report, publish/migration, cache và report execution budget trước xây builder.

Mỗi milestone có thể chia nhiều PR nhỏ; một PR phải trỏ requirement, design và scenario. Không cần triển khai microservice hoặc warehouse để hoàn tất M1–M2.
