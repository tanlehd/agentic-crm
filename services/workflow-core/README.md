# Workflow Core foundation

SRC-065 implements a pure typed authoring validator and versioned node catalog. It consumes trusted canonical CRM metadata; it never persists, enrolls, executes, publishes or claims delivery. `validateAuthoringGraph` always returns `executable:false`, including structurally valid drafts. All node descriptors report execution unavailable until real adapters and runtime gates are implemented.

Native metadata producer: `GET /api/v1/automation/catalog` in CRM, using current Identity and field policies. See [contract](../../docs/contracts/workflow-catalog.md) and [architecture](../../docs/system/workflow-architecture.md). No service start command or database is created by this foundation. Legacy M2 engine remains unchanged.
