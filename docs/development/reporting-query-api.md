# Native mock query — local runbook

SRC-059 second phase, 2026-10-12. [Contract](../contracts/reporting-query-api.md) · [OpenAPI](../contracts/reporting-query.openapi.json) · [Evidence](../tracking/details/SRC-059.md). Native preview/CSV now uses Identity and own Reporting snapshots. Connected source policy, persistent runs, drilldown and UI remain pending.

## Verify with retained fixtures

Requires existing local MySQL13306, Reporting schema2 and the retained native account from the [draft runbook](reporting-storage.md). Private env files .local/native-auth-test.env and .local/reporting-test.env must already exist; never reset/reseed accounts to run this test. The harness reads .local/reporting-native-fixture.json and retains its own binding ID in .local/reporting-query-native-fixture.json. No passwords are changed.

```powershell
$env:PATH = (Join-Path (Get-Location) '.local/node-v24.21.0-win-x64') + ';' + $env:PATH
& .local/node-v24.21.0-win-x64/node.exe .local/tooling/node_modules/pnpm/bin/pnpm.cjs --filter @agentic-crm/reporting --filter @agentic-crm/backend build
& .local/node-v24.21.0-win-x64/node.exe scripts/reporting-query-native-test.mjs
```

The harness starts temporary loopback NestJS listeners, logs in through NativeAuthService using the existing synthetic credential, explicitly ingests the idempotent G1 snapshot for that native tenant, then calls the real public/private HTTP controllers and MySQL. It temporarily edits only that isolated test role/seat under the Identity tenant lock, bumps authorization revision, and restores the original role/seat in finally. Existing app processes are not restarted; temporary listeners/pools close. Success writes artifacts/reporting-query/native.json with eight test groups. No token/password/transcript is written to evidence.

## Native API use

Configure backend REPORTING_SERVICE_URL and REPORTING_ADMISSION_KEY and the matching private Reporting key using the existing storage runbook. Source registration alone does not restart running apps. Explicitly ingest a synthetic binding for the intended tenant using the [projection operator](reporting-projections.md); no default tenant, datasource or production grants are activated.

Reviewed role grants, all requiring the read seat capability:

| Resource | Action | Scope | Enables |
|---|---|---|---|
| report_definition | run | all | Ephemeral report preview |
| report_mock_source | read | all | All rows/fields in every tenant-owned synthetic_g1_v1 binding, including catalog extensions |
| report_definition | export | all | Additional permission for aggregate CSV |

All-scope here is within the selected tenant. Own/team grants are insufficient for complete mock fixtures; they never reinterpret synthetic owner IDs as native users. Draft read/design grants do not grant source access. Do not use this policy for connected CRM or Marketing data. Provision role changes through the existing Identity authorization workflow, with the tenant lock and revision update; no default roles are modified by this module.

POST /api/v1/reporting/query with native crm_session cookie, Origin, X-CSRF-Token, X-Tenant-Id and application/json. Body is {definition,generation?,format?}; use the existing schema1 semantic definition, a durable binding UUID, optional immutable snapshot hash and json or csv. Do not send access, tenant, limits or SQL in the body. asOf must equal the selected snapshot observedThrough; definition is validated before execution, and saving a draft alone does not validate it.

JSON returns {data,meta}; data includes mock provenance, snapshot/catalog fingerprints, grouped rows, totals and optional pivot margins. CSV is a no-store attachment named report.csv containing aggregate rows only. Both recheck live Identity grants/revision and native session before release. Query calls never edit the draft/version or source data.

403 means insufficient grant, invalid Origin/CSRF, or stale authorization; a missing cookie also fails the existing CSRF guard with403. A revoked/expired valid-shaped session gives401. Missing foreign binding/generation gives404 without disclosing ownership. Private service assertion errors are sanitized. Reauthenticate/re-authorize before retrying; repeated preview is safe because there is no durable mutation.429 means the per-instance tenant concurrency bound is reached. No persistent run ID/cancel/download endpoint exists yet.

Limits remain bounded mock execution:96KiB serialized/private request, public parser100KiB, definition64KiB/depth12, input10000rows,500groups,5000pivot metric cells,2MiB aggregate,4MiB private response wrapper,2 concurrent requests per tenant per service instance and16 cached results. Private assertion lifetime5s, BFF fetch timeout4.5s, cooperative execution3s. BFF abort is not a durable distributed cancellation protocol. Production/multi-instance capacity and connected rights are unverified.
