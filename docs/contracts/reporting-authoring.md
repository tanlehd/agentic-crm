# Bounded mock report authoring — PLAN-022H / SRC-064

2026-10-12 · CHG-20261012-06 · Ready for this slice. User accepted an early usable UI over delivered query/draft APIs. Full SRC-059 remains incomplete and is requeued READY with evidence retained. SRC-064 depends on DONE SRC-057/058/063 and PLAN-022F/G/H; full SRC-060 additionally depends on SRC-064 and SRC-059.

## Scope and compatibility

Native Next.js Reporting entry: source/model, safe related objects, dimensions/X/series, up to8 versioned metrics, flat typed AND filters, time window/timezone, table/KPI/bar/horizontal_bar/stacked_bar/line/area/pie/donut/pivot, explicit preview, private draft create/open/update, aggregate CSV. Unsupported capabilities are not offered. Quick-start presets are local configuration helpers. No publish/reusable template library/dashboard/drilldown/advanced KPI claims. Existing definitions/query/runs remain compatible. No tables, migration, producer SQL, background execution or default role grants.

## Discovery contract

GET /api/v1/reporting/authoring (only optional after UUID) requires current native session, X-Tenant-Id membership, report_definition/run/all and report_mock_source/read/all. Backend uses existing query authority with exact signed body `{kind:"authoring"}` at POST /internal/v1/reporting/authoring. Query audience is intentionally reused only for this read-only metadata operation; body/path schema isolation prohibits running a query through discovery. Existing expiry, body hash,5s lifetime and current Identity/session delivery checks apply. No cookies/origin/tenant headers on private transport. Empty bindings yields200 with sources:[], never automatic synthetic activation.

Response envelope data:{environment:"mock",sources:[{id,generation,historyFrom,observedThrough,catalog,availableFields}],capabilities:{visualizations:["table","kpi","bar","horizontal_bar","stacked_bar","line","area","pie","donut","pivot"],filterOperators:["eq","in","gte","lte","is_null"],maxDimensions:4,maxMetrics:8,maxRelations:5},next_after:string|null}. Optional GET after UUID pages50 sources ordered by binding ID. Tenant-scoped Reporting queries only ready synthetic_g1_v1 generations; catalog comes from immutable manifest, no raw observations/credentials/transcripts. Validate manifest and admission before delivery. 4MiB response bound, dependency errors sanitized. Metadata is authorized by the explicit complete-synthetic grant, not inferred from CRM field rights.

## UX and wire mapping

Library and builder share existing CRM shell. Three regions: source/related fields, configuration, preview. Native labeled controls provide keyboard operation without drag. Responsive columns collapse under1100px, tables scroll within their panel. Mock provenance, exact snapshot window and null vs zero always visible. Initial state has no fabricated results. API failure preserves draft and shows retry; empty source explains setup requirement. Form changes immediately invalidate result; requests abort and use sequence fencing so late results cannot overwrite newer configuration. Tenant-keyed component unmount clears local state; no localStorage of report data. Unsaved guard covers navigation/reload.

Source/model reset dependent selections explicitly; relations offered only for reachable many_to_one paths from selected model, maximum5. Field/metric choices derived from descriptors/coverage, not hardcoded source IDs. Server compiler remains authority. Money requires currency; chart series require compatible same-unit measures; mixed-unit selection uses table/pivot. Early UI configures up to3 row dimensions and1 column dimension (full2-column editor remains SRC-060). Saved drafts using a wider pivot are rejected for editing explicitly rather than silently rewritten. Pivot rows/columns partition selected dimensions and use server cells/margins/totals. Null is rendered as an em dash. Accessible data table always accompanies chart. Saved definitions retain all their content; unsupported saved shapes show an explicit error rather than silent coercion.

Preview uses POST /reporting/query and pins selected generation; CSV uses same definition+generation with format csv and a fresh CSRF token. Saving uses existing definition endpoints, stable idempotency key for retry, If-Match revision for updates. Save is private/unvalidated metadata, never publish. Conflict preserves local edit with explicit reload or save-as-copy. Library pagination follows next_after; loading another draft requires dirty confirmation. No automatic preview on edits.

## Acceptance

Real native session through both services: source discovery tenant/permission negatives, golden acquisition and marketing previews, table/bar/line/pivot/KPI, save/reopen/version conflict, CSV download, stale response fencing, mobile/keyboard and tenant reset. Inspect desktop/mobile screenshots; no horizontal page overflow at320px. Existing native query/run/draft regressions remain valid. Isolated retained synthetic test identity and local binding may be provisioned explicitly; never modify standard roles/passwords or reset data. Local Reporting daemon activation is separate from production integration. Full RB-11…16 remain open outside this sub-scope.

## Field summaries extension — 2026-10-12

CHG-20261012-07: [bounded Ready contract](reporting-measures.md) adds field/aggregation authoring and registered COUNT/AVG/MIN/MAX on existing numeric populations. Distinct, missing-data policy, formula dependencies and recomputed totals are explicit. Existing26 descriptors remain unchanged; no schema migration, freeform formula editor or new source grain.

## Common visualization extension — 2026-10-12

CHG-20261012-08: [Ready scoped contract](../contracts/reporting-visualizations.md) adds horizontal bar, stacked bar, area, pie/donut and descriptor-driven quick-start presets to SRC-064. Trend uses temporal line/area, composition requires additive measures and complete nonnegative partitions, exact table remains available. Existing definitions stay compatible; no database migration. Published reusable templates/dashboard/period comparison remain separate.
