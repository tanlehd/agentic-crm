# Workflow CMS on the M2 engine — PLAN-024F

2026-10-13 · Ready · CHG-20261013-03. User prioritized a usable local Workflow menu. This is a scoped CMS for existing M2 APIs/storage, before distributed PLAN-024B…E. No new schema, metadata master, Kafka consumer or service extraction. Existing [M2 graph/authorization](workflow.md) remains authoritative; [shared CRM metadata](workflow-catalog.md) remains the future object-workflow contract.

## Navigation and editing

SRC-067 replaces the original SRC-066 list presentation with the [visual canvas contract](workflow-visual-builder.md): drag/connect/zoom/pan, palette, inspector, undo/redo and device-local positions. The original list described below is historical; inspector selectors retain keyboard access. API/graph/security semantics remain unchanged.

Automation → Workflows is discoverable for every signed-in workspace member. Without configure + automation.design/all show a permission explanation, without fetching definitions or enabling writes. Read-authorized users can open the separate Operations screen. No default grants. User subsequently explicitly approved a separate Workflow Admin role for alpha_admin in Clinic Alpha (design/publish/read/operate, all); preserve existing roles and all other accounts. Fix the client automation capability check to match native design/publish/operate configure/all checks.

List definitions with status, selected published version, explicit new workflow form and paginated results. Create requires name/key and an existing active service actor; starts disabled. Authoring uses a keyboard-accessible node list, entry/edge selectors, node insertion/removal, native fields for seven supported primitives and typed literal/reference controls. Trigger is conversation.created on an active mock_messenger connection only. Data/Kafka/email/notification nodes from the new architecture remain unavailable and are explained in the UI.

Loading an immutable saved snapshot permits editing a local copy; save always POSTs a new draft version. Never overwrite a published or saved graph. Persist/reopen graph and execution role exactly. Unsaved changes guard navigation/reload/tenant changes; changing tenant clears state and late responses. Show loading/empty/error/retry states; no fake catalog/record values. Reference deletion can leave unresolved edges/bindings which server validation rejects explicitly. Mobile layout stacks panels; no drag operation required.

Publishing requires automation.publish/all and explicit review of a saved clean draft. On an enabled definition publish immediately changes the version used by future enrollments; show that consequence before the action. Enable/disable requires design/all and If-Match from the opened definition. A stale conflict retains local graph, offers reload, and never automatically retries with a new revision. Publish and enable are separate actions; no auto-activation. Existing runs retain pinned versions. Real run inspection stays in Operations.

## Additive native API

All requests use native session, X-Tenant-Id, no-store and sanitized errors. Mutations retain Origin/CSRF and idempotency. Existing routes and graph shapes are unchanged.

- GET /api/v1/workflows/authoring: configure + automation.design/all. Return data containing active service actors (id/key/role_id/role_name), active teams (id/name/purpose), active mock connections (id/name/provider) and published Chatflow versions (id/name/number). Use owning Identity/Channels/Chatflow ports within approved monolith UoW, never credentials/role permission bodies. Each collection max200; overflow returns CATALOG_LIMIT_EXCEEDED, never truncation. This capability grants only reference labels, not administration or record access.
- GET /api/v1/workflows supports optional after UUID with limit1…100; additive next_cursor. GET /api/v1/workflows/:id returns one definition, same design authorization. Versions remain newest100 with visible limit notice; saved snapshots are immutable.
- POST /api/v1/workflows/validate accepts exactly {graph}; native mutation session/CSRF, design/all. Pure M2 validation only, returns data {valid:true,node_count}. No record writes or idempotency needed; INVALID_WORKFLOW_GRAPH=422. Successful validation does not prove reference eligibility or publish authority; publish rechecks those live.

## Data, compatibility and acceptance

Reuse workflow_definition/workflow_version/command_receipt/audit tables and existing owner ports. No migration or extraction; target Workflow API/Core schema ownership unchanged. No credentials in graph or UI; no change to CRM canonical models. M2 refs are typed trigger/output IDs, not arbitrary CRM properties.

SRC-066 acceptance: real native create/save/reopen, immutable earlier graph, validation of cycles/unreachable/missing refs, save retries with same key, publish/enable CAS conflict, live grant revoke, foreign tenant negatives, discovery no secrets, seven-node fields/typed refs, menu without design rights, actual browser desktop/mobile and local reload. Retain synthetic fixtures, never reset DB; Alpha role addition only after explicit user authorization, received in this session. Kafka/object-change/action-provider/distributed cutover tests remain NOT_RUN. Commands and evidence belong in SRC-066.
