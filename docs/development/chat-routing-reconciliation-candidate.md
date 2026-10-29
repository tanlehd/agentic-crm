# Routing reconciliation candidate

SRC-109/T06, CHG-20261023-14, Codex2026-10-23. [Design](../contracts/chat-routing-reconciliation.md). Source/work reconciliation candidate verified; automatic dispatch, public work/facts and runtime worker mounting remain pending.

Chat provides complete bounded active/known session snapshots under fresh registered-service admission and final snapshot CAS. Routing reads current profiles/queues/known work, exits SQL for owner HTTP, then verifies unchanged local inputs under its own capacity gate. Source absence cannot close work; pending capacity reservations are left for terminal proof. Source-reconciled heads have null reservation_id, compare owner revision and never revive completed work. Transfers retain prior allocation history and repeats do not duplicate allocations, queue entries or attempts.

No DDL/main mount/cross-service SQL. The additive `routing-sync-snapshot` has scoped1MiB response and10s composition bounds. At most500active plus500known sessions are returned; fields contain no Contact/transcript body. Existing public Routing APIs and assignment protocol remain unchanged.

Evidence in `artifacts/chat-extraction/continuation-20261022` on Windows PowerShell/project Node24.21.0/pnpm10.33.0 with retained synthetic schemas:

- `node scripts/identity-owner-native-test.mjs '--focus=Chat routing sync'`:11native groups PASS in `routing-sync-native-final.log`. Native Identity/Chat/Routing credentials and HTTP; service/field/tenant denial, source CAS, SQL rollback after work insert, repeat, configuration drift, missing source, transfer/stale replay, pending reservation then actual terminal-proof confirmation, monotonic closed work, real source outage, capacity gate and501overflow/500complete response.
- Contracts/transport/backend/Chat builds PASS in `routing-sync-*-build.log`.
- Lint1030files, boundary0added and docs484/4298links PASS in `routing-sync-lint.log`, `routing-sync-boundary.log`, `routing-sync-docs.log` before this evidence entry.
- Directory focused8contract/Routing tests PASS in `directory-focused-final.log`; generated directory227operations/635schemas matched before this added source operation. The first focused command used nonexistent test paths and found no tests; only the final file counts are evidence.

The reservation test uses a synthetic Chat commit callback to change fixture ownership, with actual Identity admission and native Routing reserve/confirm and terminal-proof HTTP. Full business assignment effects remain the existing T04 acceptance, not a new E2E claim. SQL failure is injected at the driver boundary to verify actual transaction rollback. Overflow sessions are retained under a dedicated unconfigured connection; repeated runs reuse them. Three per-run lifecycle fixtures remain closed with history retained after verification.

T06 IN_PROGRESS; D3 2/6/local2/14. Main43/Chat4/Connector5 unchanged; no main restart, migration/reset, cutover, commit or push. Working tree main/21eaadd0e8d1e9163bfb7721390c2e6b385b1b42 remains dirty with prior work preserved. Continue Routing dispatch/public work/facts and the remaining consumer integrations before T07–T09.
