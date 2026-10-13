# Local Marketing database operations

SRC-054 delivered v1 storage; SRC-051 has added scheduler/change-store foundations and forward schema2/3. [Contract and table templates](../contracts/marketing-database.md), [400-column physical dictionary](../data/marketing-physical-dictionary.md), [source field meanings](../data/marketing-storage-dictionary.md).

Prerequisites: existing local MySQL container `agentic-crm-mysql-1`, port13306 and registered platform system tenant in CRM Identity. The private local operator verifies registration before provisioning. No CRM service stop/start is required: this adds a separate database and never changes CRM tables, credentials or migration journal.

Run from repository root using pinned Node24:

```powershell
.local/node-v24.21.0-win-x64/node.exe scripts/marketing-db.mjs --test
.local/node-v24.21.0-win-x64/node.exe scripts/marketing-db-test.mjs
.local/node-v24.21.0-win-x64/node.exe scripts/marketing-db-dictionary.mjs --check
.local/node-v24.21.0-win-x64/node.exe scripts/marketing-db.mjs
```

`--test` provisions persistent `test_crm_marketing`; otherwise `crm_marketing`. Both are explicitly allowlisted localhost targets. Generated operator/runtime credentials live only in ignored `.local/marketing[-test].env`; provisioning reuses them without rotation. Script reads container root credentials internally; never prints them. Separate operator grants only its own schema; runtime has no DDL/journal/cross-service permissions, append-only SELECT/INSERT for observations and projections. No Reporting grant. Runtime user is reserved for later backend, not attached to a running service.

Every rerun backs up existing Marketing schema to ignored `artifacts/marketing-database/*.sql` before migration, fingerprints every preexisting business table using its original columns and checks no row changed after additive migrations. Protect backups like source data; do not check them into Git. JSON evidence contains counts and backup paths only. Test inserts synthetic run-specific A/B records and retains previous fixtures. No reset/drop/delete or password change occurs. A schema backup is not a guarantee of cross-service recovery consistency.

The immutable [v1 SQL](../../services/marketing/database/migrations/001-storage.sql) has23 DDL steps, creating22 business tables plus one subsequent FK; runner separately bootstraps the system-scoped journal. SQL delimiter is semicolon at end of line, not semicolon inside a string. Named lock serializes migration runners; ordered step checksums detect modified history. Unknown version, missing/reordered steps or checksum drift fails closed. MySQL auto-commits DDL: a crash after DDL but before journaling may leave an unjournaled table. Stop, inspect actual `SHOW CREATE TABLE` and backup, and reconcile explicitly; the runner must not silently drop/adopt it. New changes require a forward version plus runner registration and new verification; never regenerate deployed v1 with changed fields.

`marketing-schema-v1.mjs` is an authoring/check tool: once the SQL file exists it asserts byte equality rather than overwriting it. It may need retirement when future dictionary versions change; historical migration bytes remain fixed. `marketing-db-dictionary.mjs` reads persistent test schema metadata; no provider data is exported. `--check` compares generated text for drift.

Rollback: stop future consumer use and retain the database; fix forward. No service currently reads these tables. Actual Meta authorization, Page validation/skip/defer, ingestion minimization, query signature construction/collision handling, fencing/CAS, periodic reconciliation, retention and publish/read APIs remain PLAN-011/SRC-051/SRC-055. DB constraints require evidence fields and local references; they cannot verify live Page ownership or authenticate a TenantContext. Observation projections must additionally validate semantic object type/identity and parent chain in that backend transaction.

Current local/test version3: v1 has23 immutable steps, v2 adds6 control steps, v3 adds2 UUID constraints without rewriting applied v2. Total31 steps;26 business tables plus journal. Migration manifests validate step counts and allowed DDL prefixes before application. Runtime receipts/change events are SELECT/INSERT only. New source repository tests: `scripts/marketing-scheduler-test.mjs` and `scripts/marketing-changes-test.mjs`; build `services/marketing` first. Tests require the dedicated persistent test schema, retain fixtures and pause only schedules created by that test invocation. No periodic worker entrypoint is available yet; see [SRC-051](../tracking/details/SRC-051.md).
