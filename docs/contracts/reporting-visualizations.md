# Common report visualizations — SRC-064

2026-10-12 · CHG-20261012-08 · Ready. User requested audit and implementation of missing common visuals/templates. Owner Codex 2026-10-12; SRC-064 remains the only IN_PROGRESS implementation task with its existing DONE dependencies.

## Audit and bounded scope

Existing: table, single KPI, vertical grouped bar, temporal line, pivot. Add horizontal_bar, stacked_bar, area, pie and donut. Trend means line/area over the selected model's time field with day/week/month buckets; it does not imply previous-period comparison. Add descriptor-driven quick-start presets for all ten displays using the current source/model/filters/time. These configure private drafts only; reusable published/business templates and dashboards remain SRC-060/061.

| Common display | Status in this slice | Use |
|---|---|---|
| Table / pivot | Existing + quick-start preset | Details and cross-tab with server totals |
| KPI card | Existing + quick-start preset | One aggregate, no grouping |
| Column / horizontal bar | Column existing; horizontal added | Compare categories, signed values supported |
| Stacked column | Added | One additive metric across X and series |
| Line / area trend | Line existing; area added | Daily, weekly or monthly temporal buckets |
| Pie / donut | Added | Complete nonnegative partition, max12 groups |
| Previous-period KPI delta / gauge | Not in this slice | Needs comparison window / target contract |
| Funnel | Not in this slice | Needs explicit ordered-stage/cohort semantics; not arbitrary grouped bars |
| Scatter / heatmap / combo / 100% stacked | Not in this slice | Separate multi-axis/color/normalization encodings |

The selector and presets use server-advertised capabilities; an older server continues offering its original five types. Updating source/build alone does not reload a running Reporting process. New client preserves unsupported saved shapes with an explicit unsupported-capability error.

## Compatible definition extension

schemaVersion1 retains existing shapes and semantics. New chart types use the existing `{type,x,y,series?}` shape. All axes must consume exactly the selected dimensions and metrics. Area, like line, requires temporal X. Pie/donut require one dimension, one SUM/COUNT metric and no series. Stacked bars require one SUM/COUNT metric and a series dimension. AVG, distinct counts, rates and percentiles cannot be represented as additive parts. No database migration or historical snapshot/descriptor changes. Deploy Reporting validation before clients create new types; old clients reject unsupported drafts explicitly. Existing definition execution and aggregation are unchanged, so the existing executor pin remains valid; new types only add validation/encoding support.

All charts retain an exact accessible table and recomputed backend totals. Render numeric geometry only within finite safe-number limits, same units, <=80 rows; pie/donut <=12 slices. Missing/negative composition values, all-zero pie, warnings or parts not matching recomputed totals cause an explanatory table fallback; no invented zero or Other. Stacks require every series/category cell present and nonnegative. Existing grouped bars support signed values. Temporal charts sort by X and break paths at missing/null cells; calendar buckets absent from the result break paths as well. Monetary labels retain currency. Pie percentages explicitly describe the displayed partition. No implicit top-N, interpolation or resumming distinct totals.

Presets select compatible reachable dimensions and registered metrics from discovery, never hardcode source IDs. Explain that presets replace groups/metrics/display while preserving filters/time/source. Disable unavailable presets with reason; never erase filters to force compatibility. Preview remains explicit and invalidates on changes. Keyboard/native buttons and 320px reflow required.

## Acceptance

Compiler positive/negative cases for every new type, temporal and additive constraints; UI preset/shape roundtrip; signed/null/empty/large/mixed-unit/composition mismatch rendering; actual native preview/save/reopen/CSV plus desktop/mobile screenshots using retained isolated fixture. Alpha role activation remains a separate pending approval; no grants, resets, background work or connected-source claims.
