# Reporting mock datasource — local runbook

SRC-058 / PLAN-022D. [Exact contract/table templates](../contracts/reporting-projections.md), [evidence](../tracking/details/SRC-058.md), [draft/API runbook](reporting-storage.md). Synthetic-only internal ports; no public raw-data endpoint or production producer integration. Schema2 adds five tables to existing Reporting schema1, now11 business tables+system journal.

## Build, upgrade and verify

Use repository-pinned Node24.21.0 and pnpm10.33.0; Windows paths `.local/node-v24.21.0-win-x64/node.exe`, `.local/tooling/node_modules/pnpm/bin/pnpm.cjs`. Node directory must be in PATH for pnpm subprocesses.

```powershell
pnpm --filter @agentic-crm/reporting build
node scripts/reporting-db.mjs --test
node scripts/reporting-projections-test.mjs
node scripts/reporting-storage-test.mjs
node scripts/reporting-native-test.mjs
node scripts/reporting-db.mjs
```

Provision script restricts localhost13306 and exact local/test schemas, backs up and fingerprints preexisting rows, checks immutable001 journal, applies forward002 and requires rerun0. Never edit applied001/002 or reset DB/Redis/volumes. Credentials remain ignored in .local/reporting[-test].env. Runtime can update binding/generation checkpoints but only SELECT/INSERT on observations/pages/activation audit; no DELETE,DDL,journal/other schema access.

To reuse the retained test binding without creating another fixture:

```powershell
$fixture = Get-Content .local/reporting-projection-fixture.json -Raw | ConvertFrom-Json
node scripts/reporting-mock.mjs --test --tenant $fixture.tenantA --binding $fixture.binding
```

Both tenant and binding are mandatory; no implicit default. The file is created by the test harness and reused; it contains synthetic tenant/binding IDs only. Local operator can omit --test and supply an explicitly chosen authorized local tenant/binding. This session populated test bindings only; crm_reporting local has schema2 but no automatic mock tenant registration, native role grants or default datasource. Do not point test fixtures at production. No daemon/service startup or schedule is created.

## What is available

synthetic_g1_v1 describes25 objects/120 fields: all19 kernel objects/85 fields plus message, assignment, team_membership, creative_media_link, lead_event and deal_event. Four model versions retained. G1 canonical86 rows include5 sessions,4 threads,4 Contacts,4 Leads,3 won Deals,3 Ads (C has spend but no session),separate base/age/region observations and two Media links. Repeated/lower source revision and obsolete Post tombstone remain in the immutable ledger; canonical rows exclude the tombstone and select highest revision. Money is decimal string. Fields and complete catalog are pinned in the stored manifest; environment=mock cannot be relabeled connected.

ProjectionStore internal APIs begin/append/activate/read accept a trusted server context. SnapshotAdapter has describe/page, explicit hash-bound page cursor and coverage. Descriptor validation rejects unknown fields/types; the extension test adds a custom numeric attribute/object without modifying storage. ImmutableSnapshotAdapter optionally takes explicit historyFrom/observedThrough; defaults match G1. A future adapter/model must register its own reviewed context/version and descriptor coverage; connected sources still require their producer contracts and current source ACL.

Pages commit with durable receipts/checkpoint; reconnect reruns from next_page. While a generation builds, read uses previous ready generation. Activation is CAS against captured binding revision; one of competing builds wins, stale activation conflicts. Read can pin old ready snapshot; staging is denied. No deletion or in-place rebuild of active data. After a failed page, retry exact page; conflicting same source id/revision requires correcting the producer input in a new snapshot, not overwriting ledger rows. Preserve incomplete generations for investigation.

This is a dataset/preparation layer. It does not run report metrics, automatically join profiles, infer missing attribution or grant row/field access. SRC-059 must validate current native rights, choose generation/coverage/as-of and execute correct grain-aware query semantics before returning results. Old draft save API remains unvalidated/nonexecutable.

## Evidence and recovery

artifacts/reporting-projections contains mysql.json, unit.json and CLI snapshot summaries; artifacts/reporting-database contains upgrade JSON/backups. Tests retain all fixtures, run reconnect/checkpoint/duplicate/CAS/rollback/isolation/privilege/extension and warm preservation checks. G1 sums are independently checked raw fixture values, not proof of report query execution.

Rollback by stopping operator ingestion and retaining the last ready generation; no destructive schema downgrade. Rebuild produces a new manifest/content hash and switches atomically after verification. Production restore drill, public query/native source ACL, CSV/drilldown/chart/pivot/UI/live Meta remain later gates.
