# Native Chat Human need assessment candidate

SRC-109/T05, CHG-20261023-06. [Contract](../contracts/chat-need-candidate.md), current working tree on main, base21eaadd0e8d1e9163bfb7721390c2e6b385b1b42. Windows PowerShell, project Node24.21.0/pnpm10.33.0, native_identity_test43 and test_crm_chat_owner4. Main remains baseline; no DDL, runtime mount or provider activation.

Chat now owns Human assessment read/write, builtin/custom values, pin release, preserved proposal/history, local CAS, audit/event and legacy receipt replay. Native CRM metadata reservations/current Contact, finite Identity need-field policies and Sales outcome list run through authenticated owner HTTP with separate restricted credentials. Public candidate preserves native session/CSRF, canonical/threads aliases and ETag. Reads pin the actual current assessment version; mutation pins the caller's expected version and checks CAS only after successful receipt replay. Closed-session Human edits remain supported.

Commands use `. ./scripts/dev-shell.ps1`. Evidence below is in artifacts/chat-extraction/continuation-20261022; failed logs remain retained.

| Verification | Result / artifact |
|---|---|
| pnpm build:chat, repaired pnpm --filter @agentic-crm/chat build; pnpm --filter @agentic-crm/backend build | PASS need-chat-build-2.log, need-backend-build.log; first compile failure retained in need-chat-build.log |
| node scripts/identity-owner-native-test.mjs --focus="Chat need" --provision | 9groups PASS need-native-4.log; prior fixture/harness failures retained |
| node scripts/identity-owner-native-test.mjs --focus="Chat need" | 11groups PASS need-native-final.log; adds50-of51revision and101candidate overflow |
| pnpm exec vitest run services/core-baseline/tests/need-follow-up.test.ts services/core-baseline/tests/session-progress.test.ts packages/workload-transport/tests/owner-protocol.test.ts | 27PASS focused-need.log |
| node scripts/lint.mjs | PASS1005files lint-need.log |
| node scripts/check-chat-boundary.mjs --check | PASS0added boundary-need.log |
| node scripts/generate-chat-owner-contracts.mjs --check | PASS216operations609schemas generated-need-check.log |

Native coverage includes eight custom scalar types, default state, Human pin/release ordering/null deletion, retained proposals, hidden values/pins/proposal/history, immutable revisions and keys-only need.assessed v2, current field/record/Contact rights on replay, tenant/session/need identity, source visibility and can_link, actual CRM/Sales outage, metadata drain, local race, completed native logout, concurrent receipt replay, lost release ACK, legacy top-level thread_id adaptation, public session/CSRF/alias, closed-session editing, transport response above256KiB and explicit Sales overflow.

Fixtures persist in .local/chat-ownership/need-fixture.json with unique rounds. Existing synthetic principals/accounts and restricted metadata/Contact/Sales read users reused; SELECT sales_need_outcome added to the Sales read fixture credential. No rows reset or removed. Outcome read fixtures intentionally exercise Sales registry/context visibility; actual Lead/Deal link writer acceptance is separate under [outcome saga](../contracts/chat-need-outcome-candidate.md).

Exact need GET/POST composition deadline is10s; helper RPCs stay2s. Need metadata and assessment read replies allow8MiB for bounded histories; requests remain256KiB. No native enrichment provider is mounted. T05 remains IN_PROGRESS; outcome writer, generic hydration/global disable, T06 producers/consumers/metadata writer integration, T07 runtime, T08 parity and T09 cutover/restart/rollback remain required. D3 stays2/6 and local2/14.

Final composed verification2026-10-23:25native groups PASS in need-composed-native.log (assessment11, deferred-enrich2, outcome12); structured review need-composed-review.json. Builds PASS enrich-chat-build.log/enrich-backend-build.log; focused27 PASS focused-outcome.log; lint1010/boundary0added/generated220operations620schemas PASS in *outcome* logs. Classification/contribution13regression PASS classification-need-regression.log. Docs470Markdown/4250links before this final synchronization and scoped whitespace pass; no main/runtime activation. Prior pending notes above are superseded for this verified need slice.
