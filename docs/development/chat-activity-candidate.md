# Native Chat Activity acceptance

SRC-109/T05, CHG-20261023-02, Codex2026-10-23. [Boundary](../contracts/chat-activity-candidate.md). Chat owns index/cursor/message hydration; CRM and Workflow own source reads. This is a candidate composition, with no main mount or T05 completion.

Feed10 native groups PASS in artifacts/chat-extraction/continuation-20261022/activity-native-3.log and activity-native-repeat.log. Covers seven item kinds, live message status and rich reply resolution, encrypted backward/forward pagination, independent Activity ACL/body policy and automation rights, text/tag denial, Workflow trigger projection, actual CRM/Workflow/Channels listener outage, pending/failed source freshness, backfilling, malformed/expired/legacy-binding cursors, tenant and current Conversation snapshot fences, completed native logout and public native session/query handling. The retained bulk case scans2000 hidden references, resumes across the remaining hidden reference and returns100 messages of4000characters. The100-message reply completed in1757ms initially and1455ms on repeat; these are local synthetic timings, not a production capacity claim.

Notes read8/write13 regression PASS in notes-activity-regression.log, including native logout barriers/lost ACK recovery. Feed builds pass in activity-chat-build-3.log/activity-backend-build-4.log. Focused39 contract/ingress/lineage tests PASS in focused-activity.log; foundation lint991files PASS and boundary0added PASS. Notification builds pass in activity-notifications-chat-build.log/activity-notifications-backend-build-2.log; generated201operations/575schemas match in generated-activity-final.log.

Notification5 plus feed10 native groups PASS in activity-notifications-native.log. Concurrent duplicates produce one reference; a discarded response is recovered through durable status/retry. Ordered gaps remain pending until the predecessor is applied; later delivery with an older source revision cannot overwrite a newer reference. Actual CRM listener outage retains pending inbox rows; archived source references remain verifiable. Wrong workload/tenant/aggregate bindings fail; changed content and stream sequence collisions quarantine without replacing the original envelope or undoing effects. Workflow Contact/connection and definition-version mismatches produce no reference. Source outage/retry is a real native HTTP test; the discarded-response case does not simulate an OS kill or physical network packet loss. Full operational relay/replay remains T06.

History6 regression PASS in history-activity-regression.log after the shared BFF extension. Docs/link/DAG validation PASS461Markdown/4195links in docs-activity.log. Workspace remains dirty on main/21eaadd0e8d1e9163bfb7721390c2e6b385b1b42 with earlier changes retained; evidence refers to working-tree files, not a new commit. Candidate test listeners close after each run. No production process, local main mount, commit/push, reset, volume deletion or schedule was performed. T05 stays active; next session/process/progress/classification/need and generic hydration/global disable precede T06–T09.

Retained private fixture: .local/chat-ownership/activity-fixture.json; exact service keys/cursor key stay private. Chat uses test_crm_chat_owner4; source owners use native_identity_test43 with the previously reviewed note candidate receipt/FK changes. Dedicated CRM Activity credentials read only Activity/registry/object_type/shares/outbox; Workflow credentials read only workflow_run/outbox. Foreign Chat, CRM and auth-session SQL is denied in native tests. No new table, historical migration, main database or frozen T03 snapshot is changed. Synthetic messages/notes/runs/events remain retained; temporary roles/field policies/status mutations are restored.

```powershell
. ./scripts/dev-shell.ps1
pnpm build:chat
pnpm --filter @agentic-crm/backend build
node scripts/identity-owner-native-test.mjs --focus="Chat activity" --provision
node scripts/identity-owner-native-test.mjs --focus="Chat activity" --with-notifications
```

First-time --provision creates restricted source read users only. Source bindings and notification tests use authenticated local owner HTTP with current Identity workload registry. Synthetic notifications exercise the native consumer and owning binding APIs; scheduled producer relay/replay, generic CRM update/archive producer switch and removal of old baseline consumers remain T06. Do not infer operational event delivery from handler acceptance.

Failed attempts retained: missing ownerDigest import, missing typed SQL payload values in notification binding adapters, and synthetic live-status test initially attempting an outbound status on an inbound row / unsupported remote_sent intent status. The fixture now creates a valid sent outbound intent for the temporary status check and restores the original inbound message. These failures are not marked PASS.
