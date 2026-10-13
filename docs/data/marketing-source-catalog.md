# Marketing source data catalog — provider input to report builder

**Current implementation — SRC-054, 2026-10-08:** database v1 now exists in independent `crm_marketing` (22 business tables + system journal, 105 provider fields). [Database contract](../contracts/marketing-database.md) and [physical dictionary](../data/marketing-physical-dictionary.md) supersede the earlier proposed-DDL status below. Periodic backend/Meta ingestion is deferred to SRC-051/SRC-055; Reporting remains separate.

PLAN-021 / CHG-20261008-07,2026-10-08. Scope: data fetched from Meta Marketing API, owning storage, object relationships and field meanings. Existing [selected fields](marketing-field-selection.json) and [field-by-field operational mapping](marketing-field-mapping.md) remain the provider evidence; this catalog organizes delivery and ownership. Logical storage names below are design targets, not created tables or Ready DDL. PLAN-011 must resolve exact endpoint/version/permission/query compatibility and physical table templates.

| Source object / dataset | Fetch and describe | Logical destination / owner | Keys and links |
|---|---|---|---|
| Ad Account | Provider IDs, name/status, currency/timezone, selected Business/budget context | marketing_account in crm_marketing | tenant/provider/account replica; same external account may connect many tenants; parent of admitted campaign replicas |
| Campaign | ID/account/name, objective, configured/effective status, selected budgets/bid strategy/times | marketing_campaign in crm_marketing | Parent of tenant-admitted Ads; provider campaign may span tenants |
| Ad Set | ID/campaign, name/status, optimization/billing/destination, budget/schedule and permitted targeting | marketing_ad_set and targeting observations in crm_marketing | Parent of tenant-admitted Ads; shared configuration, filtered children |
| Ad | ID/adset/account, name/status, creative reference and provider timestamps | marketing_ad in crm_marketing | Ad Set→Ad; Ad→Creative observed reference |
| Creative / content / identities | Selected content/body/title/CTA/assets, Page/Instagram and Post/Media IDs; hydrate optional metadata only with verified endpoint rights | marketing_creative and content/identity refs in crm_marketing | Many ads may reuse Creative/Post; messaging credential owner stays Connector |
| Targeting / audience metadata | Selected configuration and audience references, observed revision/coverage | targeting_revision and audience metadata in crm_marketing | Ad Set configuration; not actual CRM customer demographics |
| Base Ads Insights | ad/account IDs, date_start/date_stop, impressions, defined clicks/link clicks, spend, reach, allowed actions/action_values and query attribution settings | marketing_insight_observation, unbroken dataset in crm_marketing | Ad + period + query signature; preserve currency/timezone |
| Breakdown Ads Insights | Supported age, region and other explicitly selected breakdowns with compatible provider measures | marketing_insight_observation, separate query-signature/breakdown datasets in crm_marketing | Ad + period + breakdown tuple + query signature; separate age/region marginals do not imply joint cells |
| Sync operations/history | Binding ref, run status/checkpoint, API/mapping version, observed_at, payload hash/revision, selected fields and coverage | account_binding/sync_run/object_observation in crm_marketing | Provider evidence/freshness; credentials referenced, not copied into business/report datasets |

Fields above summarize the103 selected provider fields; they do not replace exact field rows or invent additional supported API capabilities. Dataset separation need not imply one physical table per report or breakdown; the physical design must preserve the logical grain.

## Existing CRM source objects supplied independently

Contact remains crm_core. Conversation/Conversation Session and immutable referral evidence remain Chat/Connector-owned. Lead/Deal and stage/value/currency remain crm_sales. Session.source_ad_id → Lead.source_ad_id → Deal source supplies logical linkage to Marketing Ad. No Meta age/region per customer is implied. Contact joins via session/Lead relationships, not a single mutable ad source on Contact. CRM source descriptors belong to their producers; Marketing never copies CRM outcomes into provider fact rows.

Reporting receives versioned APIs/events/projections with tenant/account scope; its catalog describes supported links. Provider metric observations are stored by Marketing; calculated CRM conversion rates, cost formulas, aggregation and templates are owned by Reporting. No cross-service SQL/FK and no Marketing write into Lead source during late hierarchy resolution.

## Required description for each persisted/exported field

For every field the final dictionary records: source object and exact API field/path; owning schema/entity/column; data type/precision; business meaning; unit/currency; null/missing/unsupported meanings; provider versus observed timestamp; ID/reference target and cardinality; role (ID, attribute, attribution, time or base metric); grain and query/breakdown context; provider mutability/history/revision; permission/coverage and source evidence link. For metrics also describe valid aggregation (additive, distinct/nonadditive or ratio inputs); formulas and allowed report uses are registered by Reporting.

Example: spend is provider decimal currency for the requested ad/period/query dataset, not budget; age/region are aggregate breakdown dimensions, not Contact properties; source_ad_id is immutable referral evidence used as a logical link; impressions can be summed only across compatible nonoverlapping grains; reach is not additive; absent metrics are not zero. Labels/names are display fields, opaque IDs are join keys.

Acceptance for Marketing: exact selected-field traces, tenant-isolated storage/relationships, base and age/region query coverage, pagination/retry/revision dedup, timestamp/unit/nullable semantics and complete field descriptions. Generic report authoring/templates are separate Reporting acceptance. No implementation or migration is performed by this catalog.

PLAN-011C adds the [105-field storage dictionary](marketing-storage-dictionary.md), [machine-readable descriptors](marketing-storage-dictionary.json) and [storage/sync profiles](marketing-storage-design.md). These specify provider path → proposed table/column/type/unit/meaning, common keys, age/region datasets and coverage; not applied DDL or live capability evidence. Broader auth/API/table-template gates remain PLAN-011.

PLAN-023 / CHG-20261008-09: [Shared account and Page tenant admission](../contracts/marketing-tenant-admission.md). All tables retain tenant_id NOT NULL. The same external Ad Account may have independent tenant-local replicas/bindings. Ads/related metadata/Insights are admitted only when Creative Page resolves to the sync tenant; foreign Ads skip, unresolved defer. Parent configuration can be shared; children and ad-level Insights remain tenant-filtered. No cross-tenant payload/history persistence or campaign/account aggregate metric substitution.

PLAN-011E / CHG-20261008-11: [Ready metadata backend contract](../contracts/marketing-metadata-sync.md), [control-table templates](../contracts/marketing-sync-tables.md), [implementation sequence](../planning/marketing-backend.md). Channels retains current credential/Page authority; SRC-056 implements its versioned ports before SRC-051 periodic metadata worker. Database v1 remains the only applied Marketing implementation; Insights/live Meta remain separate.
