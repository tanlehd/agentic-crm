# Native Human dispatch candidate

SRC-109/T06, CHG-20261023-15, Codex2026-10-23. [Design](../contracts/chat-routing-dispatch.md). Candidate verified; main scheduler/runtime mounting remains T07/T09.

Routing obtains an advisory current Human proposal from Chat and stores one immutable dispatch job per work item before HTTP. The exact child binding pins work, queue entry and queue version. Existing ChatOwnership performs the actual Identity admission, Routing capacity reservation and final Chat CAS, with history, activity, contribution and control effects. Automatic reason remains `human_routing`. Lost ACK retries the saved request. Permanent denial uses authenticated terminal proof; a committed assignment is never reversed. Configuration recovery cannot abort a dispatch journal.

No DDL, main schedule or cross-service SQL was introduced. Late reservations still require the capacity sweeper and late Identity admissions require policy drain; their operational mounting is remaining T06/T07 scope. AI execution remains deferred.

Evidence in `artifacts/chat-extraction/continuation-20261022`, Windows PowerShell/project Node24.21.0/pnpm10.33.0, retained synthetic schemas:

- `node scripts/identity-owner-native-test.mjs '--focus=Chat routing sync' --with-dispatch`:22native groups PASS in `dispatch-native-final.log` (11source/reconciliation plus11dispatch). Dispatch uses actual full ChatOwnership owner HTTP, least-load selection, concurrent workers, lost before/after commit ACK, abort-before-prepare, capacity/skill/availability denial, queue/permission/service revoke races, exact entry pin and lost confirmation recovery.
- Contracts/transport/backend/Chat builds PASS in `dispatch-contract-build.log`, `dispatch-transport-build.log`, `dispatch-backend-build.log`, `dispatch-chat-build.log`.
- Focused11tests/4files PASS in `dispatch-focused.log`; generated230operations/644schemas match in `dispatch-generated-check.log`.
- Lint1035files, boundary0added, docs486Markdown/4303links PASS in `dispatch-lint.log`, `dispatch-boundary.log`, `dispatch-docs.log` before this evidence entry.

The source-only reservation test retains its synthetic Chat commit callback, as documented in the [source reconciliation evidence](chat-routing-reconciliation-candidate.md). Full dispatch tests exercise the business assignment saga. Fault injection is at coordinator boundaries, not an OS-crash/deployed E2E claim. Synthetic sessions/history remain retained; test cleanup closes sessions and reconciles allocations.

T06 remains IN_PROGRESS; public Routing work/facts/reroute and Workflow/Sales/CRM/Reporting/private-app/event/scanner integrations remain required. D3 remains2/6, local2/14. Main43/Chat4/Connector5 unchanged; no main restart/cutover/reset/commit/push. Working tree main/21eaadd0e8d1e9163bfb7721390c2e6b385b1b42 is dirty with prior work preserved. Existing authorization continues through T09 local cutover and recovery after all gates.
