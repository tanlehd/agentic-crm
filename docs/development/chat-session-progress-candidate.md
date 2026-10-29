# Native Chat session process and progress

SRC-109/T05, CHG-20261023-03, Codex2026-10-23. [Boundary](../contracts/chat-session-progress-candidate.md). Four candidate public/native operations now execute on Chat-owned storage. Main routing remains baseline; this does not complete T05.

Native9 groups PASS in artifacts/chat-extraction/continuation-20261022/session-native-final.log; initial8group result is session-native-2.log. Actual owner HTTP/Identity/CRM checks cover no coverage, current process/config rights, immutable version pins, partial enrollment, concurrent same-key stage writes, CAS and revoked replay, need/evidence/message-session checks, chained corrections, Contact/field/tenant denial and real CRM listener outage. Closed-session stage/need deny while post-close review/correction retains historical owner snapshots; local resource changes and completed native logout stop stale delivery/effects. Public native session/CSRF/ETag/query handling, reserved process key422 compatibility and an imported legacy receipt are verified without another historical effect.

Builds: session-chat-build-2.log and session-backend-build-final.log PASS. The first Chat build found TypeScript inference on SQL result spreads; explicit string revision mapping fixes it. The first native attempt used a non-contract close_reason in the fixture; replaced with existing agent_closed. Failed logs remain retained. New candidate errors preserve existing public codes; the read/command owner protocol distinguishes its existing409 INVALID_TRANSITION from the progress public422 variant.

No new DDL, migration, schema reset or main mutation. Native fixture .local/chat-ownership/session-progress-fixture.json retains test rounds, process versions, needs, evidence, commands and receipts under the existing synthetic tenant/account. It uses Chat test_crm_chat_owner4 and CRM native_identity_test43 with existing restricted t05_crm_detail_test grants; foreign Chat/Contact/auth SQL denial is tested. Role, seat and field-policy mutations restore their prior values. Candidate listeners close after tests. Evidence refers to the dirty working tree on main/21eaadd0e8d1e9163bfb7721390c2e6b385b1b42, not a new commit.

```powershell
. ./scripts/dev-shell.ps1
pnpm build:chat
pnpm --filter @agentic-crm/backend build
node scripts/identity-owner-native-test.mjs --focus="Chat session"
```

T05 remaining: classification/contribution hydration, need assessment/outcome, session funnel, generic hydration and global disable composition. T06 retains operational event relay, external consumers and old-writer removal. Native process/progress completion is not standalone Chat packaging or extraction acceptance.
