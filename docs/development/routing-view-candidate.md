# Native Routing workload/config read candidate

SRC-109/T06, CHG-20261023-17, Codex2026-10-23. [Design](../contracts/routing-view-candidate.md). Public admin/mine candidate verified; reroute and main mounting remain pending.

Routing keeps its profile/work/queue/performance snapshot and read journal. Identity admits the native Human and owns current visibility predicates, field masks and available/directory values. Chat verifies current Conversation visibility and reply aggregates; Channels supplies connection options. Owner calls run outside Routing SQL. Root recovery prevents disclosure after completed logout, checks local/source drift and cannot abort configuration commands. Read snapshots never create allocation effects or change capacity gate state.

Evidence under `artifacts/chat-extraction/continuation-20261022`, Windows PowerShell/project Node24.21.0/pnpm10.33.0, retained synthetic Identity/Chat/Channels/Routing schemas:

- `node scripts/identity-owner-native-test.mjs '--focus=Chat routing sync' --with-view`:24native groups PASS in `routing-view-native-final.log` (11source/reconciliation +13public view groups). Actual public native cookie/header/query surface, admin/mine DTOs, historical replies, stale allocation visibility, role/seat/field denial, current target availability, source/config drift, actual Channels outage, current role revoke and completed logout.
- Real500work response completed in1825ms;501fails explicitly. Read/configuration proof isolation verified in both directions, committed late abort remains committed, closing capacity gate permits reads without changing state.
- Contracts/transport/Chat builds PASS in `routing-view-contract-build.log`, `routing-view-transport-build.log`, `routing-view-chat-build.log`; final backend build `routing-view-backend-final.log`. Initial TypeScript failures are retained in numbered build logs.
- Focused13tests/4files PASS in `routing-view-focused-final.log`; the initial focused log contains an invalid test admission fixture and is not acceptance.
- Generated235operations/663schemas match in `routing-view-generated-check.log`. Lint1045files/boundary0added/docs490Markdown4314links PASS in `routing-view-lint.log`, `routing-view-boundary.log`, `routing-view-docs.log` before the final focused file and this runbook.
- Reply-fact regression11native groups PASS after the new policy/routes and local helper reuse in `routing-view-facts-regression.log`.

`routing-view-native-1.log` passed the original21groups. The final suite adds target availability, current role revoke and500/501work bounds, and strengthens recovery isolation. Synthetic overflow work rows remain completed with an old cutoff; matching Chat sessions are retained under their unconfigured connection. Existing historical sessions/allocations/contributions are preserved. Runtime credentials remain owner scoped; native tests verify Routing cannot read Chat contributions and Channels cannot read native sessions.

No DDL, main runtime restart, cutover, reset, commit or push. Main43/Chat4/Connector5 unchanged; working tree main/21eaadd0e8d1e9163bfb7721390c2e6b385b1b42 remains dirty. T06 IN_PROGRESS, D3 remains2/6/local2/14. Next single integration: public reroute saga preserving work version/queue pin, receipt replay and failed-transfer ownership. Remaining Workflow/Sales/CRM/Reporting/private-app/event/scanner scope still precedes T07–T09 under existing authorization.
