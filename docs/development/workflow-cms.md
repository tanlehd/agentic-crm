# Workflow CMS local

ADR-027: one Workflow service owns business automation. CHG-20261021-08 removes legacy Chatflow code, routes and data; historical identifiers in evidence are not supported runtime APIs. Current removal scope is documented in the retirement contract.


CHG-20261016-04 / SRC-081: [Thread identity, need enrichment and recovery](../contracts/need-follow-up.md) supersedes earlier exclusions for this bounded scope. Current canonical Chat APIs use conversation_id (SRC-082 / CHG-20261016-05); deprecated thread_id artifacts remain readable through scoped compatibility. Need-scoped default/custom values, on-demand provider protocol, Human pins and read_need/recover_need workflow actions are implemented separately from general autonomous Agent Runtime or live channel delivery. See task evidence for actual validation.

SRC-066 · 2026-10-13. Open [Workflows](http://localhost:18080/?workflows), select Clinic Alpha, then Automation → Workflows. Native API on3001 has been reloaded; Next.js dev on18080 serves the new UI. User explicitly approved a separate Workflow Admin role for alpha_admin: automation.design/publish/read/operate, scope all. Prior roles and all other accounts remain unchanged. No workflow was enabled in Alpha by this release.

## Use

1. Create a Workflow with name, stable key and an existing active service actor. It starts disabled.
2. Select the conversation channel and actor's execution role. The visual canvas shows trigger and connected steps. Click a palette item to insert before the selected node, or drag it into empty canvas and wire it yourself. Drag an output port to an input port to replace its edge; condition has True/False, wait has result/timeout. Select an edge and choose Remove connection. Click a node to configure it in the inspector; entry and edge selectors are a keyboard alternative.
3. Check the graph, then Save new version. Reopen a saved version to edit a local copy. Saving adds a new immutable draft snapshot.
4. Review and publish the saved draft. Publish on an enabled definition changes future enrollments immediately; existing runs retain their version. Enable is a separate action on the published version. Dirty changes must be saved/reloaded first.
5. Operations shows actual runs under current Conversation/Automation read rights. Disable stops new enrollment, not current runs. A CAS conflict retains local edits and requires explicit reload.

Seven M2 nodes: assign_owner, start_chatflow, wait_event, condition, request_lead_handoff, wait_timer, end. Trigger remains conversation.created on active mock_messenger. Actor permissions, Chatflow published state and referenced teams are rechecked on publish. A designer's grant does not give the runtime actor new business permissions. Local discovery currently has actors/teams/connection but no published Chatflow; unavailable references are never fabricated.

Canvas supports node drag, background pan, zoom controls/minimap, Fit, deterministic Arrange and graph Undo/Redo (up to60 edits). Self/cyclic canvas connections are rejected; incomplete drafts remain editable and authoritative server validation rejects invalid saved graphs. Positions are device-local in this browser tab, scoped by tenant/definition/version; new versions inherit positions. Another browser/session starts with auto-layout. No business data or layout fields are added to persisted executable graph. Mobile stacks palette, canvas and inspector; use Fit after resizing.

This is an integrated Web screen on the existing backend, not independent Workflow Web/API/Core deployment. The CRM catalog and eleven-node validator from SRC-065 are separate foundations; generic CRM updates, Kafka, email/notification adapters and distributed runtime remain pending under PLAN-024B…E.

## Runtime and checks

Use the existing [service manager](service-manager.md), preserve local env and DB. No migration required. Existing M2 storage and commands remain unchanged; [additive APIs](../contracts/workflow-cms-m2.md) provide discovery, graph validation, definition read and pagination. Generated OpenAPI/types come from workflow.json and scripts/generate-contracts.mjs.

Pinned Node24 and local pnpm:

```powershell
$env:PATH = "$PWD\.local\node-v24.21.0-win-x64;$env:PATH"
node .local/tooling/node_modules/pnpm/bin/pnpm.cjs --filter @agentic-crm/backend build
node scripts/workflow-cms-native-test.mjs --browser
```

Native/browser harness requires the retained native_identity_test and reporting-native account fixture plus the running web. It temporarily changes only isolated test rights, restores them in finally, retains records/versions, and closes temporary listeners. Browser transports Workflow/context requests to the real isolated native API; production-like Alpha verification uses the actual local API without interception. Tokens/passwords remain in ignored .local files, never evidence.

Optional NEXT_BUILD_DIR chooses a separate Next.js output directory, default .next unchanged. Windows existing .next cache can reject unlink even when web is stopped; production build was verified with NEXT_BUILD_DIR=.next-workflow-build. Generated next-env.d.ts/tsconfig changes from this verification were restored to their pre-test content. Do not delete/reset caches or DB as a startup step.

[Original CMS evidence](../tracking/details/SRC-066.md) · [Visual builder evidence](../tracking/details/SRC-067.md). No commit/push or remote deployment performed.
