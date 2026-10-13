# Reporting query core — local verification

SRC-059 internal phase, 2026-10-12. [Contract](../contracts/reporting-query.md), [evidence](../tracking/details/SRC-059.md). This executes mock snapshots; no native query route, dashboard UI or connected datasource is enabled.

## Run the retained MySQL example

Use pinned Node24/pnpm from the repository root. Existing local MySQL on127.0.0.1:13306 and Reporting test schema2 are required; private configuration is .local/reporting-test.env. The retained G1 fixture comes from the [projection runbook](reporting-projections.md). Do not reset the database or recreate accounts. If this fixture is missing, provision/ingest explicitly following that runbook first.

```powershell
$env:PATH = (Join-Path (Get-Location) '.local/node-v24.21.0-win-x64') + ';' + $env:PATH
& .local/node-v24.21.0-win-x64/node.exe .local/tooling/node_modules/pnpm/bin/pnpm.cjs --filter @agentic-crm/reporting build
& .local/node-v24.21.0-win-x64/node.exe scripts/reporting-query-test.mjs
```

The harness reads the retained tenant/binding, loads its ready generation through ProjectionStore and runs QueryRunner using an internal synthetic authority port. It does not authenticate a native user or grant any role. Seven groups check cohort totals, pivot margins, separate provider profiles, scope/cache/revocation, tenant denial, CSV and fingerprints of every Reporting business table before/after. No database write is performed by this harness.

Outputs under ignored artifacts/reporting-query: mysql.json (test evidence), paid-by-ad.json (aggregate result), paid-by-ad.csv (quoted formula-safe CSV). Paid A and B each have2 Contacts/200USD won; grand total has3 distinct Contacts/400USD won. Base spend175 includes Ad C without a Session. Age and region spend100 each are separate datasets.

## Internal integration and limits

Import QueryRunner from services/reporting/src/query-runner.ts and supply trusted authorize and load ports. Identity must have an explicit tenant/principal and binding. Authorize returns current report.run, object/field/binding scopes, row-ID sets or all, revision and expiry. Recheck occurs before loading and before returning result/CSV, including cached hits. Never accept this authority structure in a browser request.

The loader returns an immutable ready ProjectionSnapshot from the own Reporting store, optionally pinned to generation. asOf must equal that manifest's observedThrough. The runner never edits a draft, activates a datasource or reads producer schemas. Partial non-base source scope fails closed. Extending a catalog metric/model also requires explicit ExecutionRegistry registration of its descriptor and typed operator; formula strings are never evaluated.

Bounds:10000 input rows,500 groups,5000 pivot metric cells,2MiB result,2 concurrent calls per tenant per runner instance,16 cached results. The3s deadline and AbortSignal checks are cooperative during synchronous execution; they do not impose network timeouts on asynchronous authorization/load ports or provide cross-process admission control. Native transport deadlines/cancellation and durable run lifecycle remain pending. Aggregate CSV only; no record drilldown/download endpoint yet.

Errors reject the run rather than returning partial/truncated totals. Query limits are appropriate for the mock dataset, not a production throughput claim. Chart rendering, worker queues, publish/templates, multi-widget dashboards and joined cost-per-CRM-outcome metrics still need subsequent scopes.
