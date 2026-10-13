# Report field summaries — SRC-064

2026-10-12 · CHG-20261012-07 · Ready bounded extension of [authoring](reporting-authoring.md). Codex owns SRC-064 IN_PROGRESS; no second task claimed.

## Comparison and decision

Reviewed official documentation on 2026-10-12:

- [Salesforce report formats](https://trailhead.salesforce.com/content/learn/modules/lex_implementation_reports_dashboards/lex_implementation_reports_dashboards_report_formats): report type determines available objects/fields; grouping creates summary/matrix reports.
- [Salesforce formulas](https://help.salesforce.com/s/articleView?id=analytics.reports_formulas_overview.htm&language=en_US&type=5): numeric summaries SUM/AVG/MIN/MAX differ from row-level and summary formulas.
- [Salesforce summary formula walkthrough](https://trailhead.salesforce.com/content/learn/projects/create-reports-and-dashboards-for-sales-and-marketing-managers/use-summary-formulas-in-your-reports): formulas operate on summarized values at configured grouping levels.
- [HubSpot custom builder](https://knowledge.hubspot.com/reports/understand-the-custom-report-builder): primary/related sources, dimensions versus measures, aggregation on numeric fields and distinct counts.

| Thành phần | Salesforce | HubSpot | Quyết định cho CRM |
|---|---|---|---|
| Chọn nguồn | Report type xác định objects/fields | Primary source và related sources | Datasource → versioned model → quan hệ an toàn; hiện rõ base grain |
| Field → measure | Summarize numeric column | Dimension không aggregate; measure có aggregate | Field → phép tổng hợp khả dụng; versioned metric ref lưu trong draft |
| Phép tính | SUM, AVG, MIN, MAX; phân biệt row count và unique count | Distinct count, numeric summaries | COUNT non-null, COUNT DISTINCT, SUM, AVG, MIN, MAX, P95 theo field được đăng ký |
| Công thức | Row-level và summary formula là hai lớp riêng | Formula field tính theo từng dòng | Bản này dùng summary KPI đăng ký sẵn; editor tự nhập còn chưa có |
| Group/chart | Summary/matrix groups và chart | X/breakdown dimensions, Y measures | Group by/X/series hoặc pivot; tổng tính lại từ facts |

[HubSpot formula fields](https://knowledge.hubspot.com/reports/create-formula-fields-in-the-custom-report-builder) xác nhận công thức theo từng dòng, khác với tỷ lệ trên các tổng. Ví dụ conversion dùng COUNT DISTINCT(session có Lead) / COUNT DISTINCT(session), không dùng số Lead / số session vì một session có thể có nhiều Lead.

Existing checkbox-only metric selection obscures input field, population and calculation. Replace it with source/model/related objects → field + aggregation OR registered summary formula → dimensions/X/series → visualization. Do not apply SUM to an already aggregated rate. Show selected measure cards, formula dependencies, unit, population and null behavior. Native labeled controls, removal and ordering; max8 measures remains.

## Compatible execution extension

Keep catalogV1 and all26 existing metric descriptors unchanged. New synthetic snapshots append immutable v1 summary descriptors in summary-catalog.ts: COUNT(non-null), AVG, MIN, MAX for session.first_response_seconds, won deal.amount and impressions/clicks/spend in each marketing profile. Existing SUM, COUNT DISTINCT and P95 remain available; add SUM for responded latency. No reach sum, no mixing demographic profiles or source grains, no arbitrary SQL/expression evaluation. Existing definitions remain schemaVersion1 with versioned metric refs; no new request syntax or schema migration.

New count/avg/min/max and latency sum ignore nulls; COUNT counts non-null observations, distinct counts unique values. Empty count/sum =0; empty avg/min/max =null. Existing monetary/provider SUM deliberately propagates missing input with INCOMPLETE_METRIC_INPUT; retain this stricter completeness semantics. Expose the distinction. New summary values use exact rational arithmetic; AVG retains6 decimals even on count-unit inputs. Child records deduplicate by record ID, not by amount: two100USD won Deals sum to200, count2. Won collection uses primary session attribution, stage won and closed_at<=asOf. Monetary outputs require exact currency. COUNT has count unit and counts non-null observations independently of currency; it does not sum money. Grand/pivot totals recompute on underlying facts, so AVG is weighted by observations, never average of displayed group averages. Ratios use aggregate numerator/denominator; zero denominator=null.

Discovery adds optional per-source measureOptions metadata derived from registered execution operators whose descriptor hashes match the snapshot. Each entry: metric ref, model ref key, field (aggregate only), operation, population description, nullPolicy. Ratio entries additionally reference numerator/denominator and multiplier. Filter unsupported/absent input dependencies; compiler/current authority remain final. Older discovery without metadata supports registered KPI selection only, with explicit explanation. New snapshot is required for additional measures; historical manifests/durable runs/catalog hashes stay intact.

## Acceptance and remaining scope

Verify COUNT vs DISTINCT, exact AVG/min/max, two equal-value Deals, null/empty populations, currency/ACL negatives, weighted group/pivot totals, old-catalog execution, registry hash/coverage filtering. Browser must select field+aggregation, add/remove/reorder, preview SUM vs AVG, save/reopen and export matching refs, show registered ratio dependencies and mobile320px. Capture revised configuration/result using isolated native fixture; no persistent Alpha grants. Freeform row-level/summary formula editor, new object grains, dashboards, drilldown and connected sources remain outside this slice.
