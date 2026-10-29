# Chatflow retirement

CHG-20261021-08 supersedes the earlier retention/adapter plan. User explicitly requested deletion of legacy code and data after choosing one Workflow service in ADR-027.

- Standalone module, engine, routes, UI panel, schemas and generated clients are removed. Old endpoints return 404.
- Baseline forward43 drops the five Chatflow tables and Lead/outbound references. Chat owner forward4 removes its obsolete outbound reference and delivery metadata. Business records and delivery result history remain.
- Definitions using retired actions are disabled; active dependent runs/steps/waits are cancelled with CHATFLOW_RETIRED. Historical Workflow graphs/actions and audit remain readable, with no replay or automatic translation.
- New graphs reject retired primitives/events. Conversational actions in the unified Workflow engine remain unimplemented until their task is accepted; removal is not feature parity.
- Historical migrations, frozen extraction snapshots and prior test evidence remain immutable. They do not define an active service or a new development dependency.

[Removal design and evidence](../data/chatflow-retirement.md) · [Current Workflow](workflow-orchestration.md) · [Tracker](../tracking/tasks.md).
