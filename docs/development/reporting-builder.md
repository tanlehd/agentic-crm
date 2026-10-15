# Early mock Report Builder — SRC-064

**Current UI:** [Dashboard/Reports workspace](dashboard-workspace.md) replaces the mixed entry point: Reports opens library → viewer → editor, Dashboard has home/template/canvas with saved-report refs. Legacy embedded builder remains compatible with old drafts; the instructions below describe the earlier slice.

[Scoped contract](../contracts/reporting-authoring.md) · [Discovery OpenAPI](../contracts/reporting-authoring.openapi.json) · [Query API](reporting-query-api.md) · [Draft storage](reporting-storage.md).

Open http://localhost:18080/?reporting=1 and choose Report Builder in the CRM shell. Current slice offers descriptor-based datasource/model/related objects, metrics, dimensions/X/series, typed AND filters, time window/bucket/timezone/currency, table/KPI/bar/line/pivot, explicit preview, private draft save/reopen/CAS conflict handling and aggregate CSV. A draft is unvalidated private metadata, not a published report. The UI shows mock provenance and active snapshot metadata; a saved draft requires a fresh authorized preview. Missing source coverage/permissions produce an explicit unavailable state.

Run `node scripts/reporting-local-runtime.mjs` with pinned Node to wire the existing local Reporting runtime env to API; this writes private .local configuration only, not roles/accounts/data/schema. Start `node scripts/local.mjs run reporting`, then restart the API through the local monitor to load its new bridge settings. Reporting listens on127.0.0.1:3004; GET /internal/v1/reporting/health/ready checks its own DB. The monitor registry now supports Reporting; already-running monitor instances need a controlled restart before showing newly registered units. Do not launch a duplicate listener. No migration or seed is part of normal startup.

## Explicit local activation decision

CHG-20261014-03 supersedes the earlier permission question. The user explicitly requires alpha_admin to be super admin. [Tenant super-admin policy](../contracts/tenant-super-admin.md) derives full tenant-scoped access from active Human + admin seat + tenant_admin role; ordinary admin-seat users still need explicit grants. No separate Reporting role was added to Alpha.

Actual Alpha discovery, two saved inbox dashboards / 11 widgets, edit/reopen/run, CSV and desktop/mobile checks PASS. [Runbook](inbox-demo-dashboards.md) and [evidence](../tracking/details/SRC-070.md). API/worker and Reporting are running the local built code. Synthetic sources remain labelled MOCK; connected ingestion is separate.

## Verification

`node scripts/reporting-query-native-test.mjs --runs --browser` verifies native query/run/discovery then launches a headless Chrome UI session. Browser-only request routing connects Reporting actions to the retained isolated native test fixture and its real HTTP services/MySQL. Shell context and CSRF are replaced only within that test browser context. This does not grant Alpha access and is not evidence of normal local Alpha end-to-end activation. Tests temporarily configure the existing test role and restore its prior permissions/seat in finally, retain synthetic drafts, close listeners/sessions and do not reset databases.

Artifacts: artifacts/reporting-ui/browser.json, desktop.png, pivot.png, mobile.png, report.csv and unit.json; native groups in artifacts/reporting-runs/native.json. Desktop/mobile screenshots inspected. 800px effective viewport checks reflow equivalent to a1600px viewport at200%; browser zoom itself is not claimed. Full keyboard/a11y audit, published templates, dashboard, drilldown, advanced Team/Agent/spend-to-outcome semantics, connected/live Meta and production capacity remain outside this slice.

## Field summaries (2026-10-12)

See [comparison/semantics](../contracts/reporting-measures.md). Choose Datasource/Data model, related dimensions, then Chỉ số → Tổng hợp theo field → Field cần đo → Phép tổng hợp → Thêm chỉ số. The selected card can switch available aggregation, reorder or remove a measure. Công thức KPI shows registered ratio inputs; it does not accept freeform expressions. Legacy discovery without measureOptions uses KPI có sẵn.

Summary catalog extends only newly built synthetic generations; historical generations remain immutable and retain their26original measures. Build Reporting, restart the authorized local service when activating, and ingest a new mock snapshot through existing tooling for the intended authorized tenant to expose71metrics. This session built code and tested in isolated retained fixture; main Reporting was subsequently reloaded and Alpha activation completed under CHG-20261014-03.

Validation command: node scripts/reporting-query-native-test.mjs --runs --browser. Includes9measure cases and14existing UI cases, represented as15top-level groups. Artifacts/reporting-measures contains configuration.png, selected-measures.png, result.png, mobile.png, summaries.csv, browser.json and unit.json. Actual saved fixture id lives in browser.json.

## Common visuals and quick-start presets — 2026-10-12

In Configuration, open **Mẫu hiển thị thông dụng** after choosing a datasource/model. Ten presets configure table, KPI, column, horizontal bar, stacked column, line trend, area trend, pie, donut and pivot. They replace grouping/metrics/display and retain source/filters/window. Choose **Kiểu hiển thị** to change only the renderer; validation explains any required X/series/measure changes. Select day/week/month under Bucket for trend.

Pie/donut/stacked require one SUM/COUNT measure; exact table fallback explains missing/negative/nonadditive/unsafe partitions. Charts retain currency and exact table values. Discovery capabilities gate new types so old services still offer their five existing visuals. Restarting/upgrading the Reporting service is required to load the new validator/discovery; the original isolated validation was followed by actual Alpha activation under CHG-20261014-03. [Inventory and limitations](../contracts/reporting-visualizations.md).


## 50-inbox dashboards — 2026-10-14

SRC-070 adds bounded private multi-widget composition and two concrete [inbox demo dashboards](inbox-demo-dashboards.md). Native CRM case and immutable synthetic snapshot are prepared; isolated dashboard persistence/browser tests pass. Actual Alpha activation is verified under the tenant-super-admin policy above. Full dashboard filters/comparison/sharing and live sources remain separate.
