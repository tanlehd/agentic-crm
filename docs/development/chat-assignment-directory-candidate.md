# Chat assignment directory candidate

SRC-109/T06, CHG-20261023-13, Codex2026-10-23. [Contract](../contracts/chat-assignment-directory.md). Native candidate complete; main mount remains T07/T09.

Public assignment-targets and assignment-teams retain their existing response DTOs and native session/query validation. Chat prepares a fresh current read admission and commits against its resource CAS. Identity checks record read plus assign-or-takeover, discovers bounded Human/AI IDs and evaluates Human seat/role/team/availability/text permissions with batched own-table queries. AI entries remain ineligible `policy`. Routing independently fetches the admitted directory and calculates profile load from allocated plus reserved sessions; current owner retains the capacity exception. Chat requires matching directory digests and a fresh Identity reread before disclosure. Actual assignment still uses the existing reservation saga.

No DDL, cross-service SQL, main mount or policy cache was introduced. Two additive private operations preserve existing requests. Directory composition has a10s deadline; existing individual recovery hops retain their budgets. Advisory eligibility never guarantees a later reservation. The current source has explicit200candidate/team bounds, no silent truncation.

Validation on Windows PowerShell/project Node24.21.0/pnpm10.33.0 with retained native Identity/Chat/Routing schemas:

- `node scripts/identity-owner-native-test.mjs '--focus=Chat directory'`:12groups PASS in `artifacts/chat-extraction/continuation-20261022/directory-native-final.log`. Real owner HTTP and native session, wrong tenant/team, Human permissions, reserved capacity/current-owner exception, resource/source drift, actual Routing outage, capacity gate, strict public query,201overflow/200candidate success and completed logout.
- Contracts/backend/Chat builds PASS: `directory-contract-build-2.log`, `directory-backend-build-2.log`, `directory-chat-build-2.log`; transport final build `directory-transport-build.log`.
- Lint1027files, boundary0added and docs482/4293links PASS: `directory-lint.log`, `directory-boundary.log`, `directory-docs.log` (before this final evidence entry).

`directory-native-1.log` passed the original10groups. `directory-native-2.log` retained a failed synthetic membership enum setup; its10completed groups are not the final result. Candidate overflow fixtures are retained and reused, with suspended memberships and their dedicated team disabled outside the test. Fault probes wrap the coordinator boundaries while owner calls remain real HTTP; this is not deployed E2E/OS-crash evidence.

Main43/Chat4/Connector5 unchanged; no main restart, cutover, reset, commit or push. Working tree main/21eaadd0e8d1e9163bfb7721390c2e6b385b1b42 remains dirty with existing work preserved. T06 IN_PROGRESS, D3 remains2/6 and local2/14. Routing work/facts/reconciliation/dispatch, Workflow, CRM/Sales/Reporting/private apps and event/scanner integration remain required before T07–T09.
