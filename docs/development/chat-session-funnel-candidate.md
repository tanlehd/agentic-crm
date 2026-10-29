# Native Chat session funnel

SRC-109/T05, CHG-20261023-05, Codex2026-10-23. [Boundary](../contracts/chat-session-funnel-candidate.md). GET session-funnel candidate reads Chat-owned session/process/facts and native Identity/CRM Contact decisions. Main routing remains baseline; Reporting consumers and operational delivery remain T06–T09.

Evidence artifacts/chat-extraction/continuation-20261022/funnel-native-2.log:6native groups PASS. Real owner HTTP/MySQL verifies same-need ordered prefixes and per-session dedup, all four coverage categories, committed cutoff and late correction without changing old as_of, zero denominators, current Conversation/Contact/mandatory field/tenant rights, active Contact status, strict93day windows/future cutoff, public native session/query, source outage, changed local snapshot and completed native logout. Retained2001session and20001fact fixtures both reject QUERY_TOO_LARGE rather than truncate. Foreign Chat/CRM table reads are denied.

Builds funnel-chat-build-2.log and funnel-backend-build.log PASS. Initial SQL spread inference was replaced with explicit typed cohort columns; the first fixture omitted required Conversation.closed_at and was corrected. Failed logs and partial fixture rows remain retained. focused-funnel.log32tests PASS, including the same correction/order golden cases against baseline and Chat reducers. lint-funnel.log1003files PASS; boundary-funnel.log0added PASS; generated-funnel.log212operations601schemas generated. No DDL/schema reset/main mutation or deployment.

.local/chat-ownership/session-funnel-fixture.json retains each synthetic round and unique cohort time. Closed sessions, process pins, need/fact rows and over-limit cohorts stay available; fixtures use the existing native_identity_test43/test_crm_chat_owner4 and restricted CRM Contact read credential. Temporary role/field/archive mutations restore; registry versions advance monotonically. Candidate listeners close after tests. Evidence is dirty main/21eaadd0e8d1e9163bfb7721390c2e6b385b1b42, not a new commit.

```powershell
. ./scripts/dev-shell.ps1
pnpm build:chat
pnpm --filter @agentic-crm/backend build
node scripts/identity-owner-native-test.mjs --focus="Chat funnel"
```

Remaining T05: Human need assessment/outcome with preserved AI-deferred controls, generic hydration and global disable composition. T06 consumer/writer removal, T07 runtime, T08 composed parity and T09 single-writer/restart/post-write rollback/reapply remain required. D3 stays2/6, local2/14.
