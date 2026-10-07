# Checkpoint — điểm tiếp tục

Updated 2026-10-07, S-20261007-01. User requests commit/push of current changes and explicitly stops further Docker validation; user will rebuild the local runtime later. SRC-034 remains VERIFYING, not DONE. SRC-032/033 and ENV-002 DONE. [Tracker](tasks.md) · [SRC-034 evidence](details/SRC-034.md).

## Current delivery

SRC-034 implements schema22 durable snooze, deadline CAS worker, effective queue reads, source-authorized activity projection, historical backfill, CRM/Workflow/Chatflow outbox notifications and strict additive contracts. Snooze preserves ownership/read markers/automation semantics. UI and full release remain SRC-036/037; SRC-035 has not been claimed.

Final source Windows checks run directly with Node24.21.0/pnpm10.33.0: lint, docs,23 schemas, generated contracts,7 tooling tests,104 unit tests, full build and typecheck PASS. API smoke initially timed out, then PASS after the hung Docker processes stopped (artifacts/SRC-034/host-smoke-recovered.txt). The canonical Windows wrapper failed to spawn pnpm.cmd; these are individual gate results, not a final canonical runner PASS.

Earlier full MySQL run:217/222 PASS,5 FAIL; fixture cleanup, expired-deadline boolean and unbound Workflow notification fixes are in source. Final regression was interrupted by Docker500 errors and5s timeouts, including migration interruption causing downstream failures. Final MySQL acceptance remains pending. An earlier Linux canonical9/9 PASS predates the last runtime fixes. No test result is inferred from the user's decision to defer validation.

## Workspace and environment

Branch main, parent696dec1. User authorized commit/push of all current SRC-034 source/tests/contracts/docs. Delivery reference is the commit containing this checkpoint; no invented hash. Private .env, dependencies, backups and artifacts remain excluded. No source changes outside this task were present at claim.

Development database was last migrated to schema21 in ENV-002; schema22 has not been applied to it. Docker recovery was explicitly approved, but failed after daemon500/hung commands. Desktop startup then reported inaccessible temporary sockets, first Docker/run/dockerInference and subsequently docker-secrets-engine/engine.sock. The old runtime-only directory was preserved at C:/Users/TanLe/AppData/Local/Docker/run-src034-recovery-20261007 and a fresh run directory created. No volume reset/deletion, secret-engine file modification or database migration occurred. Current service health and test-container cleanup are unverified after failed restart; earlier seven-service healthy status is historical. Do not claim the local app is currently available. No further Docker recovery/validation is requested in this session.

Artifacts and recovery scripts are local/ignored under artifacts/SRC-034. Full attempt integration-final.txt and host-summary.json preserve failures; host-smoke-recovered.txt records the successful later smoke. Source archive source-recovered.tar.gz and SHA-256 are prepared for a future test run, not evidence that it passed.

## Next action

After the user rebuilds local runtime, finish SRC-034 MySQL regression and required release evidence before marking DONE or starting dependent SRC-035. Use disposable test data; preserve development volumes and follow the schema22 upgrade runbook. UI/browser and full upgrade/rollback release gates remain SRC-036/037. No agents or scheduled work were started.
