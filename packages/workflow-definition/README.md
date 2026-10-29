# Workflow Core foundation

Package classification: internal library, not a backend service. This pure validator/catalog now lives at `packages/workflow-definition` under [ADR-028 repository map](../../docs/architecture/repository-map.md), CHG-20261021-12. The workspace name remains `@agentic-crm/workflow-core` for command compatibility. The single Workflow runtime belongs to target `services/workflow`, with its editor in `apps/web`, per [ADR-027](../../docs/services/workflow.md).

SRC-065 implements a pure typed authoring validator and versioned node catalog. It consumes trusted canonical CRM metadata; it never persists, enrolls, executes, publishes or claims delivery. `validateAuthoringGraph` always returns `executable:false`, including structurally valid drafts. All node descriptors report execution unavailable until real adapters and runtime gates are implemented.

Native metadata producer: `GET /api/v1/automation/catalog` in CRM, using current Identity and field policies. See [contract](../../docs/contracts/workflow-catalog.md) and [architecture](../../docs/system/workflow-architecture.md). No service start command or database is created by this foundation. Legacy M2 engine remains unchanged.
