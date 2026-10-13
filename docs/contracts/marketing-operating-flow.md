# Marketing operating flow — Meta-native dimensions

PLAN-019 / CHG-20261008-05,2026-10-08. User-approved product design; supersedes proposed CRM strategic taxonomy in PLAN-014/015. Exact physical/API/Insights implementation remains PLAN-011, not Ready by this document alone.

## Who operates where

Marketing creates campaigns, ad sets, audiences, ads and creative content in Meta Ads Manager. Their existing Meta structure is the reporting structure. No extra CRM taxonomy setup, tag assignment, AI content classification or manual ad grouping is required. CRM users connect authorized Ad Accounts, inspect sync status and read joined performance reports. Sales works Conversations/Sessions, Lead qualification and Deal outcomes.

| Step | Operator / authority | Data produced |
|---|---|---|
| Configure and run advertising | Marketer in Meta | Account → Campaign → Ad Set → Ad, Creative/Post, permitted targeting metadata |
| Connect account | Authorized CRM administrator | Account binding and credential reference; no copied token in business objects |
| Sync metadata and Insights | Marketing integration workers | Provider replicas, observed history, sync status; Insights delivery/cost/actions with query settings and freshness |
| Customer enters CTM conversation | Connector/Chat | Session with immutable referral ad_id, Page/channel; missing referral stays organic/unknown under existing policy |
| Create Lead from selected session | Sales agent or authorized workflow | Server-captured source_ad_id and session lineage, not an agent-entered ad selector |
| Advance Deal to won | Sales | Lead-linked Deal, stage, won value/currency and outcome timestamps; copied immutable ad source |
| Read performance | Marketer in CRM report | Meta hierarchy and Insights next to CRM sessions/leads/qualified/deals/won counts and won value |

Ad Account/Page/Instagram identities retain existing ownership. Multiple ads can reuse a creative/post. Link changes are observations only when returned by Meta; do not require routine ad creative mutation to justify history. Marketers can create a new Ad for new content; each ad_id keeps independent CRM outcomes.

## Grouping and attribution mean different things

Base grouping uses Meta Account/Campaign/Ad Set/Ad IDs. Creative/Post, objective, CTA and targeting configuration are provider metadata when readable. Show content preview and configured targeting so a marketer can interpret message/audience performance. Do not manufacture semantic labels such as message_angle or prospecting from names. Display names are labels, never join keys.

Meta attribution settings/windows govern Meta-reported actions. They are retained with each Insights query/dataset; they do not automatically give CRM an individual click/view history. CRM source linkage uses the observed referral ad_id of the selected acquisition session. Present Meta actions and CRM outcomes as separately named measures; do not rename Meta actions as CRM Leads or claim both attribution models are identical.

Supported Insights breakdowns (for example placement, age/gender or assets) are aggregate provider dimensions. An ad_id-only CRM source can join at Ad and roll up Ad Set/Campaign; it cannot assign a won Deal to one of that Ad's demographic/placement/asset rows. Such views may show Meta measures, but CRM conversion measures at that finer grain remain unavailable without corresponding evidence. Targeting configuration is not the actual demographic identity of a converted customer.

## Supplying lineage to Reporting

Reporting receives versioned Marketing/Sales/Chat API/events into its own projections; no cross-service SQL/FK. Resolve tenant + provider + ad_id within the tenant's authorized accounts, retaining resolved account_id and hierarchy revision. Unresolved/ambiguous IDs remain visible; never infer campaign from declared source or another tenant. Late metadata resolution enriches the report projection, not Lead/Deal snapshots.

Metric formulas, cohort/time policies, join aggregation and templates belong to the [Reporting builder design](../planning/report-builder-data-model.md). Marketing supplies source grain, keys, timestamps, units and coverage so Reporting can validate these operations.

Lead created manually without evidenced ad source remains manual/unattributed. Organic remains reported by Page. Editable declared_source is independent and cannot supply the ad join key.

## Data design change and delivery gates

Remove TAXONOMY_DIMENSION, TAXONOMY_VALUE and LABEL_ASSIGNMENT from active Marketing ERD and scope. No replacement custom classification table/UI is needed. Provider fields remain read-only replicas. Keep ACCOUNT_BINDING, SYNC_RUN, OBJECT_OBSERVATION and relevant provider metadata projections for retries, freshness, coverage and observed configuration history.

SRC-051 retains hierarchy/metadata sync. PLAN-011 must explicitly scope an Insights ingestion deliverable and its dependency before the complete joined Insights report can be marked DONE; metadata-only sync is not Insights integration. SRC-049 is Reporting-owned builder/template integration, gated by its own design; Marketing provides datasets and descriptors. Sending conversion events back to Meta (Conversions API), ad editing and automatic budget changes are separate capabilities, not implied by reading/joining Insights.

Marketing acceptance: fields match provider evidence, account/tenant keys and linked references are preserved, base/breakdown datasets remain distinct, missing/restricted data retains coverage, sync resumes/deduplicates and descriptions expose grain/units/time/aggregation constraints. Report/template acceptance belongs to Reporting. Design-only; no runtime change.

PLAN-021 / CHG-20261008-07: current Marketing deliverable is [source data catalog](../data/marketing-source-catalog.md): what to fetch, where to store, fields/relationships and meaning. Report families previously listed here moved to Reporting as example templates. No Marketing-owned fixed report screens.

PLAN-023: [Page-gated tenant admission](marketing-tenant-admission.md) separates agency account access from CRM tenant ownership. Same account may be connected by A/B; each sync saves only its own Page Ads and required parent/configuration/Insights. Source lookups must use admitted tenant-local replicas, not all Ads the credential can read.
