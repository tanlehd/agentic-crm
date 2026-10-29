# Chat detail, readiness and connection-status candidate evidence

CHG-20261022-02, SRC-109/T05 IN_PROGRESS, Codex2026-10-22. [Detail contract](../contracts/chat-detail-candidate.md), [runtime lineage](../contracts/chat-runtime-capabilities.md), [Channels status contract](../contracts/chat-ingress-references.md#scoped-connection-status-writer--chg-20261022-02). Candidates are not mounted in main. D3 remains2/6, local delivery2/14.

Detail now composes Chat-owned Conversation/Message/coverage with current native Identity decisions, CRM-owned Contact summary and Channels-owned labels/referral evidence. All owning calls use real authenticated HTTP and separately restricted SQL credentials in retained native_identity_test43/test_crm_chat_owner4. Contact fields/ownership are revalidated in CRM; Chat revalidates its own record before returning. No Contact content, response body or message transcript is stored in the detail command proof. Canonical Contact/Activity field-object IDs are fixture-configured in Identity; T07 bootstrap must validate runtime metadata configuration before mounting this path.

Source: services/chat/src/detail.ts, runtime-lineage.ts, capabilities.ts; baseline modules/crm/owner-contact-summary.ts, channels/owner-detail.ts, channels/owner-status.ts, Identity owner authority/admission/HTTP, gateway/chat-history-bff.ts and chat-catalog-bff.ts. No new database table or historical migration modification. Channels status operator has only owning reference-ledger DML, connection SELECT/UPDATE(status) and audit INSERT; the reference reader still cannot change status or credentials.

Evidence root: artifacts/chat-extraction/continuation-20261022. Environment Windows PowerShell, project Node24.21.0/pnpm10.33.0, dirty main HEAD21eaadd0e8d1e9163bfb7721390c2e6b385b1b42; no commit/push, DB reset, volume deletion or main Chat rollout.

| Executed command | Actual evidence |
|---|---|
| node scripts/generate-chat-owner-contracts.mjs | PASS189operations/545schemas, detail-generate.log |
| pnpm build:chat | PASS detail-chat-build.log; first run found missing generated type barrel exports, fixed |
| pnpm --filter @agentic-crm/backend build | PASS detail-backend-build-final.log |
| node scripts/identity-owner-native-test.mjs --focus="Chat detail" | PASS8groups, detail-native-final.log; prior7groups detail-native-second.log |
| node scripts/identity-owner-native-test.mjs --focus="Chat messaging" | PASS6groups, history-detail-regression.log |
| node --test scripts/tests/chat-runtime-lineage.test.mjs | PASS2cases, capabilities-focused.log |
| node scripts/identity-owner-native-test.mjs --focus="Chat capabilities" | PASS4groups, capabilities-native.log |
| node scripts/identity-owner-native-test.mjs --focus="Chat references" --with-status --provision | PASS11groups (8reference +3status), channel-status-native.log |
| node scripts/check-chat-boundary.mjs --check | PASS, boundary-detail.log; no added cross-owner imports |
| node scripts/lint.mjs | PASS972JS/TS, lint-detail.log |

Detail native checks include current Contact denial, independent Contact/text/attribution/channel/Activity-body field rights, viewer seat, own/tenant/service negatives, causal coverage/closed actions, disabled-channel history, retained finalized referral projection, actual CRM HTTP outage, stale Chat/CRM snapshots, completed native logout during hydration and public native session/no-store/query validation. The referral check reads previously finalized native Channels evidence; it does not fabricate a provider send.

Readiness native tests validate actual own lineage4 and least privileges, temporarily corrupt then restore a retained test journal checksum to prove fail-closed behavior, exercise native Human seat/tenant/writer fences and public capability reads. This isolated composition deliberately mounts no business handlers; all features are correctly false. Pure checks cover missing routes, incomplete backfill/disabled rollout and wrong/partial/extra journal rows. This is not evidence that queue/activity runtime is ready.

Status native tests stop the actual temporary Chat proof HTTP server, retain closing barrier/status and recover after restart; repeated disable creates one audit, re-enable requires the matching barrier, stale disable cannot close the re-enabled connection, and a winning Chat terminal commit survives drain. The terminal-commit fixture is a command proof without Message effects. The Channels ingress reference/status race is covered; global D2 transport disable still requires composition with Connector's separate attempt/connection authority.

Failed detail setup (detail-native.log) lacked mandatory conversation_workspace.last_message_at. Corrected without DDL, preserving retained data. That early failure left two temporary synthetic role grants; restore-detail-setup-role.mjs verified the exact7-grant shape and removed only those2grants. Role mutation now occurs inside the protected test phase and final runs restore roles/field policy/seat/channel/lifecycle. Synthetic snapshot-version increments and rows are retained, not reset.

Continue T05 queue/sidebar, activity/CRM-note saga, session/classification/process/need operations, generic hydration and global disable composition. T06 consumer wiring → T07 standalone runtime/image → T08 Human parity → T09 local single-writer cutover/post-write rollback/reapply remain mandatory under existing user authorization. No gate is waived by these component results.
