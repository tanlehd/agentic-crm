# Routing reply facts candidate

SRC-109/T06, CHG-20261023-16, Codex2026-10-23. [Design](../contracts/chat-routing-facts.md). Chat-owned aggregate/fact API and Routing source adapter verified. Public Routing/report composition is still pending.

Chat checks current native Human reporting rights before reading session references. It returns immutable submitted-Human reply facts or actor aggregates, keeps historical team/actor/time, and rejects source drift under the read admission. Session parent locks serialize new contribution inserts through the Chat-local FK; immutable contribution grants remain SELECT/INSERT only. No DDL or grant expansion. The exact response has a2MiB budget; other protocol requests retain256KiB.

Evidence under `artifacts/chat-extraction/continuation-20261022`, Windows PowerShell/project Node24.21.0/pnpm10.33.0, retained synthetic schemas:

- `node scripts/identity-owner-native-test.mjs '--focus=Chat routing facts'`:11native groups PASS in `routing-facts-native-final.log`. Actual Identity/Chat HTTP called by Routing workload, historical/closed-session semantics, role/seat/field/tenant denial, missing-reference and query validation, source drift, concurrent append lock timeout, actual outage,5000fact success/5001overflow, aggregate5001replies,500/501actor groups, native logout before admission and before commit.
- Contracts/transport/backend/Chat builds PASS in `routing-facts-*-build.log`. Generated231operations/648schemas match in `routing-facts-generated-check.log`.
- Focused10tests/3files PASS in `routing-facts-focused-final.log`; scope includes adversarial source envelopes and the actual5000fact protocol size.
- Lint1039files/boundary0added/docs488Markdown4309links PASS in `routing-facts-lint.log`, `routing-facts-boundary.log`, `routing-facts-docs.log` before this final runbook and lock case.
- Dispatch regressions: directory12groups, capacity6groups, public configuration4groups PASS in `dispatch-directory-regression.log`, `dispatch-capacity-regression.log`, `dispatch-config-regression.log`.

Failed fixture setup, unnecessary locking clause and the initially undersized named-snapshot validator remain in numbered/debug logs. Only `routing-facts-native-final.log` is final acceptance. Overflow contributions and closed fixture sessions remain retained/reused. Fault hooks are coordinator boundaries; concurrency uses real MySQL session/FK locking. No deployed E2E claim.

T06 remains IN_PROGRESS; D3 remains2/6, local2/14. Next: native public Routing workload/config reads and reroute, then Workflow/Sales/CRM/Reporting/private-app/event/scanner integration. Main43/Chat4/Connector5 unchanged; no main restart/cutover/reset/commit/push. Existing dirty main/21eaadd0e8d1e9163bfb7721390c2e6b385b1b42 preserved. User authorization continues sequentially through T09 local cutover after gates.
