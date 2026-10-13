# Durable mock report runs — local runbook

SRC-059 lifecycle slice, 2026-10-12. [Contract/table dictionary](../contracts/reporting-runs.md) · [OpenAPI](../contracts/reporting-runs.openapi.json) · [Evidence](../tracking/details/SRC-059.md). Native run APIs use existing session/Identity and complete-mock source policy. Execution is caller-driven; no worker/scheduler starts automatically.

## Provision and verify

Use the pinned Node24 runtime. Local/test Reporting requires forward003 after001/002; the existing [database operator](reporting-storage.md) backs up, checks old checksums, applies missing statements and checks all old table fingerprints. Do not edit applied migrations, reset databases or delete volumes. Runtime can update the run head but cannot mutate/delete its event history. CRM schema remains27.

```powershell
$env:PATH = (Join-Path (Get-Location) '.local/node-v24.21.0-win-x64') + ';' + $env:PATH
& .local/node-v24.21.0-win-x64/node.exe .local/tooling/node_modules/pnpm/bin/pnpm.cjs --filter @agentic-crm/reporting --filter @agentic-crm/backend build
& .local/node-v24.21.0-win-x64/node.exe scripts/reporting-db.mjs --test
& .local/node-v24.21.0-win-x64/node.exe scripts/reporting-runs-test.mjs
& .local/node-v24.21.0-win-x64/node.exe scripts/reporting-query-native-test.mjs --runs
```

MySQL harness requires retained .local/reporting-projection-fixture.json; native harness reuses .local/reporting-native-fixture.json and .local/reporting-query-native-fixture.json. See the [mock source](reporting-projections.md) and [native preview](reporting-query-api.md) runbooks if those fixtures have not been provisioned. Tests reuse tenant/user/password and retain run records. Native fixture permissions/seat are restored in finally; auth revision advances. Race/recovery cases change only their synthetic run timestamps/executor marker with the test operator. No app process is restarted by these scripts; temporary HTTP listeners close.

Evidence: artifacts/reporting-runs/mysql.json (13 lifecycle groups),native.json (12 native groups, including8 existing preview groups and4 run groups),unit.json. Migration backups/evidence live under artifacts/reporting-database. All private env/fixtures/artifacts remain ignored by Git. Runtime credential and admission signing key stay outside source/logs.

## Native lifecycle

Configure the existing Reporting bridge/private service and explicitly provision tenant mock binding/grants from the native preview runbook. New routes are registered in source; already-running API/Reporting processes need the normal service-manager restart before using them. This slice does not activate a default datasource or change local roles.

1. POST /api/v1/reporting/runs with {definition,generation?} and Idempotency-Key UUID. Native cookie/Origin/CSRF/X-Tenant-Id required. Response is queued metadata; keep its id. Same key/request returns the same current run, even if active snapshot changed. Changed request gives409.
2. POST /api/v1/reporting/runs/:id/execute with {} and current session/CSRF. It claims a15s lease, computes outside SQL transaction, then stores aggregate and state. It returns metadata, not the result body. A running valid lease gives409 RUN_BUSY. After a crashed process/expired lease, call execute again with fresh authorization; old attempt cannot publish.
3. GET /api/v1/reporting/runs/:id for status, then GET /:id/result when completed. Add ?format=csv for an aggregate attachment with current export grant. Every read requires current native run/source permission and exact owner principal; sharing/all-scope run grants do not bypass ownership.
4. POST /:id/cancel with {} cancels queued/running state. Repeated cancellation is idempotent. It fences result publication; it does not promise to stop synchronous CPU work immediately. Cancel after completed/failed gives409. Execute on a terminal run returns its status without rerunning. Failed run retry requires a new key.

Results survive Reporting pool/process restarts through MySQL and remain pinned to snapshot and executor version. No stored token or grant authorizes subsequent reads. Revocation before public response delivery can deny the response after a durable operation committed; reconcile by same create key or status lookup after reauthorization. No cross-service transaction is implied.

Owner-visible lifetime is24h; expired run returns410, including idempotency replay. Synthetic rows/events are physically retained until a future explicit purge policy/operator is implemented; no background purge or key reuse. Run metadata includes snapshot,attempt,version and sanitized failure code. Status exposes no definition or result. Missing/foreign owner/tenant gives404; result before completed gives409. New executor versions must be explicitly supported; no silent upgrade of old definitions.

Existing ephemeral POST /reporting/query remains available and does not create a run. Durable runs do not publish saved drafts, provide record drilldown or imply a production worker. Remaining SRC-059: authorized drilldown/event-role Team/Agent/cross-family cost metrics and acceptance gaps; dashboard UI follows later.
