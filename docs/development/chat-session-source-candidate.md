# Chat session source candidate

SRC-109/T06, CHG-20261023-24, Codex2026-10-23. [Contract](../contracts/chat-session-source.md). Chat session-source supports native Human and service reads for authenticated Sales/Workflow peers, exact Contact/session/current rights, historical attribution and no-history Connector fallback. It does not link Sales records, run Workflow or authorize a later mutation.

Compatibility adds connector/source-channel-read (Chat-only) and permits zero session_revision only for absent session in OwnerSessionSource. Existing Connector detail routes and public Chat APIs are unchanged. No schema/table/migration change. Native source fixtures remain retained, including the failed setup's unattached synthetic registry record; no cleanup deletes business history.

Commands ran on Windows PowerShell with `. ./scripts/dev-shell.ps1`, Node24.21.0/pnpm10.33.0; retained native_identity_test43/test_crm_chat_owner4. Evidence: artifacts/chat-extraction/t06-delivery.

| Command | Result / log |
|---|---|
| node scripts/generate-chat-owner-contracts.mjs | Generated238operations; session-source-generate.log |
| pnpm build:chat | PASS session-source-chat-build-2.log |
| pnpm --filter @agentic-crm/backend build | PASS session-source-backend-build.log |
| node scripts/identity-owner-native-test.mjs '--focus=Chat need' --with-source --source-only --with-session-source | 8native groups PASS session-source-native-final.log |
| pnpm exec vitest run packages/workload-transport/tests/owner-protocol.test.ts services/core-baseline/tests/need-follow-up.test.ts | 10tests/2files PASS source-focused.log |
| node scripts/identity-owner-native-test.mjs '--focus=Chat need' | 13Human assessment/deferred-enrich regression groups PASS need-source-human-regression.log; before the later session-source additions |
| node scripts/identity-owner-native-test.mjs '--focus=Chat need' --with-source --source-only | 8read-need regression groups PASS need-source-after-session-regression.log after the shared authority changes |
| node scripts/lint.mjs | PASS1065files source-lint-final.log |
| node scripts/generate-chat-owner-contracts.mjs --check | PASS238operations/670schemas source-contracts-final.log |
| node scripts/check-chat-boundary.mjs --check | PASS273edges/0added/10removed source-boundary-final.log |
| node scripts/check-docs.mjs | PASS503Markdown/4430links/109acyclic tasks source-docs-final.log |

Working-tree evidence uses source-working-tree-manifest.json and source-session.diff in the same directory; these are actual file hashes/diff, not a new commit or deployment record. Scoped whitespace evidence is source-whitespace-final.log.

Native checks use actual restricted Chat/Identity/CRM/Connector HTTP and MySQL. Coverage: exact closed session attribution, Human/service rights, active selection and historical ambiguity, no-history fallback without creating a session, earliest bound Connector evidence with pending rows excluded, tenant/peer/Contact/session mismatch, five source field denials, record/Contact/actor denial, actual CRM/Connector outages, local session race, completed native role barrier aborting disclosure and terminal admission recovery after synthetic settlement failure. Bound-source rows are explicit synthetic source fixtures; this is source-read acceptance, not a provider ingestion test. No runtime process-kill or main cutover is claimed.

Failed build session-source-chat-build.log exposed missing generated type export, typed SQL row fields and two existing public-domain error mappings; these are fixed. Failed session-source-native.log collided with the Conversation identity uniqueness constraint in fixture setup; fixed by retaining a separate synthetic identity. The6group -2 run is superseded by final8groups. No permission or storage invariant was weakened.

T06 remains IN_PROGRESS, D3 2/6/local2/14. Main services were not restarted or freshly health-probed. T07 runtime, T08 composed parity and T09 minimal local cutover remain gated by remaining Chat boundaries and writer-fence review.
