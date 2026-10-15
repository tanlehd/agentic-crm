# Workflow API — authoring và CMS control

PLAN-028C target: [custom-object bindings/usage/publish](../contracts/no-code-object-platform.md) pin canonical schema manifests, explicit re-entry/criteria/actions và dependency impact. No metadata master fork; PLAN-024C/E activation/versioning gates vẫn bắt buộc. Design-only.

SRC-066 exposes [additive native M2 CMS routes](../contracts/workflow-cms-m2.md) in the baseline backend (discovery, validation, definition read/pagination); existing version/publish/enable commands reused. Independent Workflow API/schema extraction below is still proposed.

PLAN-024 / ADR-022, 2026-10-13. Architecture Ready; exact OpenAPI/auth/table templates thuộc PLAN-024C. Proposed deploy unit `workflow-api`, NestJS/TypeScript; target schema `crm_workflow` chỉ cho definition/control data. Baseline monolith chưa extraction.

## Trách nhiệm và ownership

Sole writer của workflow definition/draft/immutable version, graph/canonical binding manifest, publish request, audit/receipt/outbox của CMS. Metadata nguồn CRM Base; node capability nguồn Core. API composition trả UI-friendly descriptors nhưng không có object/property master riêng. Native Identity kiểm automation.design/publish/operate/read theo exact policy cần bổ sung; không mặc định cấp role cho tenant.

Runtime state thuộc Core. API không claim run, không sửa timer/receipt của Core, không truy cập crm_workflow_core. Service actor là logical Identity ref, được Core/owner kiểm live, không persist session/token vào graph. Read graph/run metadata không cấp quyền record data; compound views chỉ hydrate refs đã authorize.

## Contract direction

Public CMS operations: definition list/create, draft load/save, metadata/node discovery, validate, simulate, version publish, deployment enable/disable/status, run search/detail/cancel proxy. Mutation idempotency + digest, If-Match/CAS và audit; collections bounded/cursor tenant/user/filter-bound. Exact paths/errors/scopes/schema generation ở PLAN-024C, legacy M2 routes giữ nguyên.

Publish saga dùng Core install/activate/status theo [architecture](../system/workflow-architecture.md). API sở hữu requested state; Core sở hữu effective deployment generation. UI active chỉ khi Core xác nhận receipt/generation. Retry mất ACK cùng operation key; không shared transaction. Activation failures có lý do sanitized, old active version không bị thay nếu CAS/install fail.

## Data, vận hành và gate

Local transaction CMS state+audit+outbox/receipt; per-table tenant_id NOT NULL. Physical DDL, retention, lineage, grants và backfill phải điền [template](../templates/database-table.md) ở PLAN-024C; logical map ở [metadata](../data/workflow-metadata.md). Không SQL/FK tới Core/CRM/Identity. Stateless API scale riêng, outbox relay retry/reconcile; log operation/version refs không payload nhạy cảm.

Readiness phân biệt DB, Identity/catalog/Core unavailable; không trả publish success giả. Gate: live ACL/tenant negatives, conflicting edits/publish generation, same key different body, permission revoked during publish, lost ACK/Core outage, legacy compatibility và data-preserving upgrade. [WF-02/03/13/14/15](../quality/workflow-platform-acceptance.md) NOT_RUN cho service mới.
