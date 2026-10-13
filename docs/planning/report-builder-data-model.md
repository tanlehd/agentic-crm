# Reporting platform — data sources, links and templates

**2026-10-10 / PLAN-022A:** [Kế hoạch module](report-builder.md), [semantic catalog](../data/reporting-semantic-model.md), [UX builder/dashboard](../ux/report-builder.md) và [acceptance](../quality/report-builder-acceptance.md) cụ thể hóa hướng dưới đây. Mock-first source sequence SRC-057…062 độc lập với Meta ingestion; connected integration SRC-049 chờ SRC-051/055. Product planning Ready; exact API/DDL/table templates/producer gates còn PLAN-022, không có runtime builder.

PLAN-021 / CHG-20261008-07,2026-10-08. User-approved architecture direction; exact builder/API/UI/source implementation remains Draft pending PLAN-022. Supersedes fixed-report interpretation of planned SRC-049 and PLAN-020. Existing organic report SRC-052/050 stays delivered baseline; no retroactive claim that a generic builder exists.

Reporting owns data-source registration, linked-object semantics, eligible dimensions/attribution fields, metric definitions, report builder, template definitions, execution, visualization and export. A template is a saved/versioned builder definition over the same sources and metrics; it does not require another Marketing-owned report/table/endpoint for every question.

Logical authoring flow: choose base source/object → select permitted linked objects → select dimensions/attribution fields and metrics → filters/time/grouping → visualization → save report or publish reusable template. Backend validates object/field ACL, relationship cardinality, grain, aggregate behavior and source coverage. No user-supplied arbitrary SQL or cross-service database access.

| Reporting logical concept | Responsibility |
|---|---|
| Data source / object descriptor | Source owner, key/grain, available fields, provenance, refresh watermark and permitted read transport |
| Linked-object descriptor | Join keys, tenant/provider/account scope, cardinality, optional/unresolved behavior and allowed aggregation path |
| Field descriptor | Type, meaning, role as ID/attribute/attribution/time/measure, null/coverage semantics, allowed filter/group/read operations |
| Metric definition | Base fields, aggregation/formula, grain/time basis, numerator/denominator, currency/unit, zero/null rules and version |
| Report/template version | Base source, links, fields/metrics, filters, grouping/time, chart/table config and authorized execution parameters |

Marketing supplies provider datasets and field descriptions; Reporting maps them into this semantic catalog and builds templates. Source semantics such as nonadditive reach or missing age-attribution remain intrinsic constraints, not a restriction to only three available reports. Detailed fields/DDL for Reporting entities require PLAN-022/table templates before source.

Marketing data ingestion can be verified independently of builder UI completion. Report builder acceptance includes two or more distinct templates using the same source descriptors/metric definitions, linked-object grain/ACL validation and no per-template Marketing code. Marketing acceptance checks upstream coverage, persisted fields/keys, sync/retry/history and descriptions instead of report screens.

## Example templates — PLAN-020, superseded in ownership by PLAN-021

Age and region Insights breakdowns remain required in the intended Insights ingestion scope, subject to supported API combinations/permissions. Lack of customer demographic evidence does not remove their value for delivery and engagement analysis. These are three example templates of the same report builder, not three separate reporting engines or fixed Marketing screens:

| Report | Dimensions / grain | Measures and question |
|---|---|---|
| Meta delivery and engagement | Ad + requested period + supported breakdown; age and region are separate datasets unless Meta explicitly supports their joint query | Impressions, defined clicks/link clicks, spend, CTR/CPC/CPM; which age group or region receives delivery, interacts, and at what cost? |
| CRM conversion funnel | Acquisition Session ad_id → Contact/Lead/Deal lineage; roll up Ad Set/Campaign | Sessions, distinct engaged Contacts, Leads, qualified Leads, Deals, won Deals/value, cohort conversion rates; which ad produces CRM outcomes? |
| Joined ad performance | Common Ad/account/period grain, rolled up through Meta hierarchy; use unbroken Insights totals | Spend/delivery beside CRM outcomes, cost per CRM Lead/won, won-value-to-spend where period/currency definitions are valid; which ads/campaigns merit resources? |

Meta-reported actions, if shown, retain their Meta labels and attribution settings. CRM columns are explicitly named CRM Leads/CRM won value. A Meta messaging action is not a canonical CRM acquisition session. Impressions measure exposure; clicks and cost ratios provide engagement indicators, not proof of customer intent.

CRM linkage is Session.source_ad_id → Lead.source_ad_id → Deal source. CTM referral provides ad_id when available; CRM segmentation creates sessions, including organic sessions without ad_id. Neither age nor customer region is provided by that source contract. Contact counts are distinct Contacts associated through the selected sessions, not a mutable acquisition-source property of Contact. The same Contact may return via Ad A and Ad B: count it once within each ad cohort, and recompute distinct totals across cohorts rather than summing Contact subtotals. New Contacts and returning Contacts require separately defined metrics.

CRM Leads/Deals/won value cannot be grouped by Meta age/region/placement/asset breakdown from ad_id alone. The breakdown view marks these columns unavailable or omits them; never show fabricated zeros or allocate outcomes proportionally to impressions/clicks/spend. Contact profile age/address and Ad Set targeting are not a substitute for the provider's delivery breakdown. No direct person-level join exists. User can switch to the CRM/ad-total view with ad/account/date filters preserved; the unavailable age/region filter is explicitly cleared and never silently applied to CRM metrics.

## Dataset and aggregation rules for these views

Keep unbroken Meta ad totals, each supported breakdown query, and CRM outcome facts separate. Logical Insights key includes tenant/provider/account/ad + period + query signature + breakdown tuple; signature retains API version, fields, attribution settings and timezone. Re-fetch revisions replace/select observations for reporting, not additive extra spend. Missing/suppressed/unsupported breakdown cells remain explicit unavailable/unknown; do not synthesize them by crossing separate age and region marginals.

Example: one Ad spends100 across age rows and the same100 across region rows, and produces4 CRM Leads/1 won Deal. The ad-total view shows spend100 and4 Leads/1 won. The age and region views each show their own provider measures; never sum their spend into200 or repeat4 Leads/1 won on every breakdown row. Use authoritative unbroken totals for the joined view; do not assume every breakdown sum equals totals when coverage differs. Recompute CTR=clicks/impressions, CPC=spend/clicks, CPM=1000*spend/impressions from aligned sums, with explicit click definition and null for zero denominator. Reach remains nonadditive.

Joined cost/outcome ratios require the existing activity/cohort time contract, account timezone, completeness/as_of and compatible currency. Spend on one date is not automatically the acquisition cost of Deals won that date. CRM conversion rates use distinct source cohorts, including sessions with no Leads. No breakdown-level CRM CPL/ROAS without corresponding outcome evidence. These requirements refine product design; exact DDL/endpoints/query combinations and Insights task dependency remain PLAN-011.

Acceptance additions: age and region sync fixtures plus unbroken totals; mixed/suppressed coverage; invalid joint breakdown combinations fail explicitly; reruns do not duplicate spend; age/region views contain no invented CRM counts;4 Leads/1 won remains4/1 in joined view despite multiple breakdown rows; repeated Contact across ads has correct distinct aggregate; report switching makes filter scope clear. Runtime NOT_RUN for this design change.
