# Native Human reroute candidate

SRC-109/T06, CHG-20261023-18, Codex2026-10-23. [Design](../contracts/routing-reroute-candidate.md). Candidate sub-scope verified28native groups; operational worker wiring remains T06. T06 is not DONE and no main route/runtime is mounted.

Routing owns the immutable public job and its response. Chat owns assignment, owner/session CAS, activity/contribution and cancellation effects. Capacity reserves the exact work/version/latest queue without changing queue history first. Confirmation appends the selected visit, applies allocation and saves the actual public work version in one Routing transaction. Same-owner reroute retains the original allocation/team facts. An older confirmation cannot revive a newer owner or closed head.

The public adapter rechecks native session, CSRF and current configuration authority on every request, including replay. Prepared retries keep the original Identity delegation and child binding. Only authenticated terminal proof permits confirmation or release. The binding digest excludes dependency receipts added by recovery; immutable actor/resource/target/work/queue data remain pinned. Public capacity/profile/skill failures retain their separate legacy codes. Legacy receipt import is represented by an exact synthetic fixture; the fenced actual importer remains T09.

Source: `services/chat/src/routing-reroute.ts`, `packages/workload-transport/src/routing-reroute.ts`, `services/core-baseline/src/modules/agents/owner-reroute*.ts` and the existing `owner-capacity.ts`. The application port requires its public authority preflight; the candidate BFF supplies it. No DDL or historical migration change.

Verification environment: Windows PowerShell, project Node24.21.0/pnpm10.33.0, retained native MySQL/Chat schemas, restricted per-owner pools and native authenticated workload HTTP. Synthetic rows/history are retained. Suites sharing fixtures run sequentially.

- `node scripts/identity-owner-native-test.mjs '--focus=Chat routing sync' --with-reroute`: final28groups PASS in `artifacts/chat-extraction/continuation-20261022/reroute-native-5.log` (11source/reconciliation +17reroute), including late confirmation, current target/field rights and work/Chat CAS races.
- Focused reroute/journal, public-view and dispatch tests:10PASS/3files in `reroute-focused-complete.log`; includes terminal dependency receipts and altered immutable pins.
- Affected contracts/transport/Chat/backend builds ran; final backend/transport rebuild logs are `reroute-backend-final.log` and `reroute-transport-final.log`.
- Sequential native regressions: `node scripts/routing-owner-native-test.mjs`6groups PASS (`reroute-capacity-regression.log`); `--focus=Routing config`4groups PASS (`reroute-config-regression.log`); `--focus=Chat routing sync --with-dispatch`22groups PASS (`reroute-dispatch-regression-3.log`).
- Generated contract check237operations/668schemas PASS (`reroute-generated-check.log`).
- AST lint1053files and boundary0added PASS: `reroute-lint.log`, `reroute-boundary.log`.

Failed attempts are retained. Initial confirmation compared the entire terminal binding including appended dependencies and rejected a valid proof. The fix compares the immutable core digest. A retained reservation then exposed an incomplete synthetic stale snapshot; recovery now settles prior reroute holds using real terminal proof before reusing this test scope. Dispatch regression also found that a global fault injector could hit an unrelated retained job. It now targets the selected synthetic Conversation; stale replay snapshots include every known work session. Prior interrupted suite sessions receive their normal close teardown, retaining history. No forced capacity release or fixture reset.

Main remains baseline43/Chat4/Connector5; no main restart, cutover, commit or push. T07 packages/mounts the candidate after T06, T08 proves composed parity, T09 performs the authorized local cutover/rollback/reapply after all gates. Remaining operational scanners, other consumers and writer fencing remain tracked in [T06](../planning/chat-extraction/06-consumers.md).
