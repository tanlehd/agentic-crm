# SRC-024 M2 fault regression

Status: Ready for implementation; execution status/evidence follows [task tracker](../tracking/tasks.md). Dependency SRC-023 DONE. CHG-20261006-01 is test infrastructure only; no schema/API/event migration.

Run `pnpm test:integration` in disposable Compose MySQL/Redis. Redis has no host port or persistent volume; TCP interruption is test-local, never preview. Node child processes run compiled backend application services, report a committed boundary over IPC, then receive SIGKILL. Lease timestamps are explicitly expired by test SQL to avoid a60s wait; this is deterministic fault injection, not wall-clock lease evidence. Restart uses a new process/connection and the persisted action/inbox state.

| AC / scope | Assertions and existing regression |
|---|---|
| AC-01/02/12 | Identity, registry, properties, CRM, runtime, Sales and intake negative ACL/replay/tenant tests; sanitized audit/events and transaction rollback |
| AC-05/17 | Real Redis TCP disconnect makes AuthService/HTTP return503; recovery returns200, loss of the synthetic session requires login401; bearer HTTP intake ACK remains durable; replay and processing recover exactly once after reconnection. Worker M2 polls MySQL directly; no BullMQ queue transport claimed |
| AC-08/17 | SIGKILL after actual assignment action commit and before step finish; new process replays stable key, preserves pinned version and one ownership effect; stale worker fence rejected |
| AC-08/17 | SIGKILL after Workflow starter consumer commit and before outbox finish; new process dispatches same event, one run/inbox, stale relay rejected |
| AC-06/07/18 | Existing queued cancellation, late runtime rejection, live revocation; additional process kill after mock provider receipt while sending, takeover, unknown recovery and explicit reconciliation without resend |
| AC-09/15 | Healthcare actual service fixture; concurrent intake/session qualification/Sales acceptance with one winner |
| AC-16 | Early message/child result and missed signal; concurrent timer/event with exactly one terminal transition |

Run the full suite rather than filtering new tests: existing case groups intentionally share their setup. `pnpm test:healthcare` remains an isolated walkthrough. Canonical verify covers unit/contracts/tooling/build. OIDC exchange/account resolution is a synthetic fixture; Redis session service and HTTP error handling are real. Release images, upgrade smoke, browser demo and full M2 release approval remain SRC-025; Meta/LLM integrations remain M3.
