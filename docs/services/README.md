# Enterprise service catalog

SRC-065: [Workflow Core](workflow-core.md) now has a pure typed authoring kernel and [native canonical CRM discovery](../development/workflow-foundation.md). No separate runtime/server/database yet; Workflow Web/API remain target. Source readiness and delivery evidence are distinct from service architecture rows.

SRC-057/058 scoped additions: [Reporting](reporting.md) has independent private draft HTTP/MySQL/native BFF and typed internal mock snapshot projections, verified locally. Query/connected producers/worker/production deployment remain pending; [draft runbook](../development/reporting-storage.md), [mock runbook](../development/reporting-projections.md).

Chuẩn placement bổ sung ADR-021: [schema catalog](../data/schema-catalog.md) / [DB guideline](../data/database-guidelines.md). Mỗi service descriptor phải dùng schema owner này khi thiết kế bảng mới. Identity đích tự quản auth/quyền trong MySQL; Keycloak chỉ là runtime legacy chờ native cutover.

PLAN-005 / ADR-017. Target microservices accepted by user2026-10-06; business source baseline vẫn modular monolith API+worker, schema18 (preview schema17); SRC-028 đã thêm independent Connector HTTP ingress/private schema1, chưa cutover. Mỗi service có scope, kiến trúc nội bộ, model/authority, API/events, consistency, vận hành, extraction và acceptance. Business module không đồng nghĩa mỗi bảng hoặc mỗi worker là một service.

| Service / tài liệu | Deploy boundary đích | Trách nhiệm chính |
|---|---|---|
| [Identity & Access](identity.md) | `identity` | Tenant/account, membership, Human/AI principal, team/seat/roles, field policy và authorization revisions |
| [CRM Core & Metadata](crm.md) | `crm` | Contact/identity resolution/custom record/metadata authority |
| [CRM Connector / Messaging Platforms](crm-connector.md) | `crm-connector` | Webhook/transport, provider enrichment và resolution/profile caches |
| [Chat / Conversation Server](chat.md) | `chat` | Conversation/message/owner authority |
| [Sales](sales.md) | `sales` | Lead/draft/qualification, handoff/acceptance; Deal/Customer transitions thuộc future M4 |
| [AI Runtime Platform](ai-runtime.md) | `ai-runtime` | AI platform lifecycle/execution authority |
| [Routing & Allocation](routing.md) | `routing` | Eligibility/capability matching, round-robin/capacity reservation, assignment proposals và attention queues |
| [Workflow Web](workflow-web.md) | `workflow-web` | CMS canvas/configuration và run UI; stateless, target PLAN-024 |
| [Workflow API](workflow-api.md) | `workflow-api` | Definition/draft/version/publish/control saga trong crm_workflow; target PLAN-024 |
| [Workflow Core](workflow-core.md) | `workflow-core` | Kafka enrollment, versioned durable execution/run/step/wait/receipts trong crm_workflow_core; target PLAN-024 |
| [Chatflow Orchestrator](chatflow.md) | `chatflow` | Versioned conversational graphs, session/turn, collected variables/drafts/provenance, Human pause/complete và Runtime coordination |
| [Media & Content Processing](media.md) | `media` | Private media references/binary lifecycle, authorized download/preview, scan/transcode và OCR/transcription adapters |
| [Ticket / Service Desk](ticket.md) | `ticket` | Ticket intake/state/SLA/assignment/escalation và service resolution |
| [Reporting & Analytics](reporting.md) | `reporting` | Event-derived read models, metrics/report definitions, query execution và controlled export |
| [Operations & Audit](operations.md) | `operations` | Cross-service operational views, audit aggregation, DLQ/replay requests, incident traces và health dashboards |
| [API Gateway & Workspace BFF](gateway.md) | `gateway` | TLS/routing/session integration, request context, workspace read composition, throttling và compatibility routes |

[Kiến trúc tổng thể](../system/architecture.md) · [Contract liên service](../contracts/service-boundaries.md) · [Data ownership](../data/service-ownership.md) · [Migration roadmap](../planning/microservices-migration.md).

Connector nhận Facebook webhook; Chat là chatserver. Media xử lý binary/extraction; AI Runtime quản lý provider Agent. Routing đề xuất phân công, owning service thực hiện owner CAS. Workflow và Chatflow giữ durable orchestration riêng. Gateway không làm authority nghiệp vụ. Ticket/Reporting vẫn domain Draft, không tự tạo production module chỉ vì có catalog.

## Marketing addition — CHG-20261007-13

[Marketing](marketing.md) owns Facebook Ad Account/Campaign/Ad Set/Ad synchronization and hierarchy in crm_marketing. Product ownership accepted; exact contracts PLAN-011 and source SRC-051 pending. Reporting consumes API/events/projections, never cross-service SQL.

[External API facade](external-api.md): private app transport in the baseline monolith; Identity-owned credentials, owner-service reads; no new independent deployment.
