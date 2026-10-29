# Chat-owned outbound candidate

CHG-20261022-02, SRC-109/T05 IN_PROGRESS, Codex 2026-10-22. [Contract](../contracts/chat-outbound-candidate.md). User authorized continuation through T09 in dependency order. This candidate does not complete T05 or activate main Chat routing. D3 remains 2/6 and local delivery 2/14.

Chat schema4 now owns Human submit, intent/message/job/receipt, claim/result, coordinator and workspace/activity/session effects. Identity supplies fresh admission and dispatch authority over authenticated HTTP; Connector supplies current bindings and durable synthetic delivery. Public candidate BFF verifies native session, Origin and CSRF before enrollment. Every local effect and worker phase mutation uses the Chat writer epoch. No baseline domain import, cross-service SQL or DDL was added.

## Executed verification

Environment: Windows PowerShell, Node24.21.0/pnpm10.33.0, retained native_identity_test43, test_crm_chat_owner4 and native_connector_test5; restricted owning-service credentials. Branch main at HEAD21eaadd0e8d1e9163bfb7721390c2e6b385b1b42 plus existing dirty working tree. Artifacts: artifacts/chat-extraction/continuation-20261022.

| Command | Actual result / log |
|---|---|
| pnpm build:chat | PASS, chat-http-build.log |
| pnpm --filter @agentic-crm/backend build | PASS, backend-bff-build.log |
| node scripts/identity-owner-native-test.mjs --focus="Chat outbound" | PASS9 groups, outbound-native-final.log |
| Same command after recovery extension | PASS12 groups, outbound-native-recovery-final.log; loss of consume ACK, native logout before consume, crash boundary→unknown→late sent proof |
| node scripts/identity-owner-native-test.mjs --focus="Chat messaging" | PASS6 groups, history-regression.log |
| node --test scripts/tests/workload-http.test.mjs scripts/tests/chat-owner-contract.test.mjs scripts/tests/dispatch-contract.test.mjs | PASS54 tests, focused.log |
| node scripts/check-chat-boundary.mjs --check | PASS273 edges, zero added/10 removed, boundary.log |
| node scripts/lint.mjs | PASS953 files at that revision, lint.log; later test edits require final verification |

Native groups cover atomic submit, reauthorized replay/payload conflict, owner/Contact/tenant/connection negatives, current text denial, writer epoch, concurrent public key, settlement ACK loss, real public session/CSRF delivery, and lost Connector begin ACK followed by a new coordinator instance recovering the same receipt. The repository unknown→late-sent group uses injected remote proof callbacks with real Chat MySQL. Additional composed recovery uses actual Identity/Chat/Connector HTTP: lost consume ACK and native logout preserve unknown without reaching started; a test crash boundary uses native Connector begin/start/take primitives and actual Identity consume, loses local result persistence after one synthetic send, waits the original deadline, and recovers unknown through HTTP. Matching late native Connector proof then delivers sent exactly once; wrong fence fails. This is synthetic fault injection, not an OS process-kill test or real provider. Submitted fixture jobs are retained; no persistent candidate worker scans them. T09 must reconcile its own target dataset.

## Existing D2 runtime repair

OPS-20261022-01 CLOSED for the observed startup mismatch. Existing backend image agentic-crm-backend:repo-relocation-check contains manifest43. Executed human-outbound-rollout.mjs --http-local with that image and unchanged agentic-crm-connector:t04-http; private readiness passed. human-outbound-local-test.mjs passed public synthetic send to sent. human-outbound-rollout.mjs --restart passed readiness. Logs: d2-repair.log, d2-public-send.log/json, d2-restart.log. Retained keys/config/data preserved, no migration or reset. D2 still uses baseline Chat storage; this repair is not extraction evidence.

## Remaining delivery

T05 still requires composed revoke/crash/unknown recovery, connection-disable compatibility, workspace/inbox/tags/snippets/snooze/notes, detail/queue/session/classification/need/progress and generic hydration/capability lineage. Then T06 consumers and old writers, T07 standalone runtime, T08 parity, T09 local single-writer cutover/restart/post-write rollback/reapply. Native AI remains deferred; retired Chatflow remains removed. No commit/push or production deployment.
