# Native Chat queue/sidebar acceptance

SRC-109/T05, CHG-20261022-02 continuation2026-10-23. [Contract](../contracts/chat-queue-candidate.md). Candidate routes only; no main mounting, T05 completion, image or cutover claim.

Chat owns queue/sidebar snapshots, exact counts, read cohorts, tags, inbox intersection, snooze/waiting semantics and signed pagination. Native Identity returns finite current policy decisions; CRM supplies redacted Contact summaries with independent Activity/Contact object configuration; Channels supplies retained labels/referral metadata. Batches are bounded at100, with resource decisions split at25 to retain the256KiB request bound even for200 shared teams per resource. No foreign SQL, baseline domain import or RPC while holding Chat SQL. Query text is persisted only as a digest in the command request; response bodies remain transient.

Commands on Windows PowerShell with project Node24.21.0/pnpm10.33.0:

```powershell
. ./scripts/dev-shell.ps1
pnpm build:chat
pnpm --filter @agentic-crm/backend build
node scripts/identity-owner-native-test.mjs --focus="Chat queue"
node scripts/identity-owner-native-test.mjs --focus="Chat detail"
node scripts/identity-owner-native-test.mjs --focus="Chat inbox"
node --test scripts/tests/workload-http.test.mjs scripts/tests/chat-owner-contract.test.mjs scripts/tests/dispatch-contract.test.mjs scripts/tests/chat-runtime-lineage.test.mjs
```

Evidence directory: artifacts/chat-extraction/continuation-20261022. Final queue-native-final.log has11 PASS groups: exact counts and pagination; own/shared/manager intersections; field and Contact/search denial; team membership and viewer fencing; malformed/expired/changed cursors; snooze/unread/disabled Page metadata; lazy cohort versus materialized marker; real CRM outage and stale Chat/CRM snapshots; completed native logout;100-row transport; public session/query/no-store. The100-row response includes4000-character synthetic previews and completes in1523ms in the final run. This is local synthetic evidence, not a production load guarantee.

Affected builds pass in queue-chat-build-final.log and queue-backend-build-final.log. Detail regression8 groups pass in detail-queue-regression.log. Focused57 tests pass in focused-queue.log, including a delayed HTTP query completing beyond two seconds while ordinary owner requests still time out. Boundary/lint/generated and Inbox regression logs carry their actual final results; the tracker records their completion.

Failures retained: fixture attempted to set generated channel_id (removed from inserts); older native fixtures lacked workspace/control rows; normalized tag binary keys needed canonical snapshot normalization; response omitted correlation_id; legacy public schema incorrectly allowed only null snooze and omitted snooze/wake; prefix composition exceeded universal2s timeout; public unauthenticated assertion expected400 instead of actual401. Final scoped read deadline is10s, helper RPC deadlines remain2s, response8MiB only for the queue/history allowlist, request256KiB unchanged. No diagnostic payload logging retained.

Only missing workspace projections in retained native fixtures were initialized, with unknown coverage explicitly unavailable. Missing control is tolerated for count-only rows and fails selected hydration closed. Synthetic105 Conversations/messages and two tags, inboxes, identities, command proofs and added lazy cohort remain reusable; existing projections/business data were not reset. Role, field, team, seat and connection test mutations are restored. No applied migration, database reset, credential rotation, commit/push or persistent service restart.

Remaining T05: activity/note saga and notification reconciliation, session/classification/process/need operations, generic hydration, full transport-disable composition, and other unmapped routes. Runtime canonical object mapping validation remains T07. Legacy cursor invalidation and post-write rollback/reapply remain T09. Continue T06–T09 sequentially only after prerequisite acceptance.

Legacy list and Channel options: list-native-final.log7groups PASS; queue-list-regression.log11groups PASS (100rows1797ms), history-list-regression.log6groups PASS. focused-list.log57, lint-list.log975files, boundary-list.log0added and generated-list.log193operations556schemas PASS. Affected builds list-chat-build.log/list-backend-build-final.log PASS. Signed legacy account/query position cursors, viewer access, default closed inclusion, field denial and disabled Channel metadata are preserved.
