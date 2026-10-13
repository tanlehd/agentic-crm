# Marketing storage and sync profiles — PLAN-011C

**Current implementation — SRC-054, 2026-10-08:** database v1 now exists in independent `crm_marketing` (22 business tables + system journal, 105 provider fields). [Database contract](../contracts/marketing-database.md) and [physical dictionary](../data/marketing-physical-dictionary.md) supersede the earlier proposed-DDL status below. Periodic backend/Meta ingestion is deferred to SRC-051/SRC-055; Reporting remains separate.

CHG-20261008-08,2026-10-08. Scope complete as a data design for review:105 source-traced descriptors, common storage metadata, entity relationships and three Insights profiles. Not an applied migration or complete service implementation contract. Credential/auth/API/grants/physical extraction/table-template verification remain PLAN-011 before SRC-051. [Field dictionary](marketing-storage-dictionary.md), [JSON dictionary](marketing-storage-dictionary.json), [official sources](../references/meta/marketing-dossier.md).

## Owning storage and relationships

All proposed entities live in service-owned crm_marketing; current schema26 contains none of these Marketing tables. Do not add them silently to shared monolith migrations. Physical extraction/provisioning and forward journal are part of the implementation gate. Every application table has business tenant_id CHAR(36) ascii binary NOT NULL; no default/system-tenant fallback. Identity/Connector/CRM/Chat/Sales references are logical, never cross-service FK.

| Current object table | Local unique key beyond tenant/provider | Required local relationships / unresolved policy |
|---|---|---|
| marketing_account | provider_node_id; external_account_id when known | Tenant-local binding supplies local account UUID; same external account allowed in other tenants; verify act_ node versus account_id rather than numeric conversion |
| marketing_campaign | account_id + external_campaign_id | Required account UUID; provider external_account_id consistency check |
| marketing_ad_set | account_id + external_adset_id | External Campaign ID retained; nullable resolved campaign UUID until parent hydrated |
| marketing_ad | account_id + external_ad_id | Ad Set/Campaign IDs retained; nullable resolved parent/creative UUIDs; verify parent hierarchy, surface mismatch |
| marketing_creative | account_id + external_creative_id | Account-scoped library; no one-to-one uniqueness with Ad/Post |
| marketing_audience_reference | account_id + external_audience_id | Metadata only; no Contact membership inference or member list ingestion |

All object tables additionally have id CHAR36 PK with tenant, provider VARCHAR32 (meta), account_id CHAR36 (except account itself), version BIGINT UNSIGNED, latest_observation_id CHAR36, created_at/updated_at/last_seen_at UTC DATETIME6, availability VARCHAR32 and field_coverage JSON. Field dictionary columns are provider fields; local account_id UUID is separate from external_account_id string. Availability distinguishes available, restricted, unavailable, provider_deleted; missing from an incomplete list does not imply deleted. Provider fields remain read-only in business APIs.

Index intent: tenant/account/external ID natural lookup; tenant/account/updated_at/id cursor; tenant/account/parent ID lookups. Final index lengths/EXPLAIN and full templates must be verified before DDL. Provider names are display text. Identifiers use ASCII binary; human content uses utf8mb4. Keep unknown provider enum strings, never reject new statuses solely because labels are unknown.

## History, structured fields and references

marketing_object_observation stores tenant/id, account_id, object_type, external_object_id, observation sequence, sync_run_id, fetched_at, payload_hash, mapping_version, api_version, field_coverage and selected_payload JSON. Store explicit external Campaign/Ad Set/Creative parent IDs where applicable for history lookup, not only hidden JSON. Selected payload excludes credentials and unselected personal data. Current typed object rows are projections of the accepted observation; they are not independent editable truths. New observation revision only on selected content/coverage change; last_seen_at may update without a revision. Never backdate first observation as full provider history.

Complex provider structures (targeting, object_story_spec, asset_feed, attribution_spec, promoted_object) retain selected structured JSON with documented paths/size validation. Marketing projections expose queryable relationships via typed rows: targeting revision to included/excluded audience refs; creative revision to Page/Instagram actor refs and Post/Media refs; content variants preserve kind/provider_path/asset_ref/text/observation_id. These projected rows are tied to the same observation and rebuilt, not separately edited. Source field mapping already defines selected nested paths; exact nested JSON validation/limits must pass PLAN-011 before source.

Page/Instagram/Post/Media refs first preserve observed external IDs from Creative. They need tenant-scoped identity keys and nullable local resolution; do not assert ownership by Ad Account. Names/usernames/media details and current Page–Instagram link hydration require additional verified read endpoints and permission coverage; not fabricated from103-field selection. Connector retains messaging identity and credential authority. Ad→Creative observed changes are stored only if provider evidence changes; changing ad content is not assumed to always retain the Ad ID.

## Insights storage grain

marketing_insight_observation holds the15 selected Insights fields plus nullable age and region in the [dictionary](marketing-storage-dictionary.md). Common columns: tenant/id/account UUID/provider, dataset_profile VARCHAR32, query_signature BINARY32, breakdown_signature BINARY32, revision BIGINT UNSIGNED, sync_run_id, fetched_at UTC, api_version, mapping_version, account_timezone VARCHAR255, requested_settings JSON, resolved_settings JSON, field_coverage JSON, completeness VARCHAR32 and selected_payload JSON. Required external_ad_id and period dates identify a valid level=ad row; malformed rows are quarantined rather than stored under null keys. Provider date_stop remains inclusive; expose normalized period boundaries as separately documented values if required by consumers.

Natural grain: tenant + account + external_ad_id + date_start + date_stop + query_signature + breakdown_signature. Preserve full canonical signatures alongside hashes and verify equality on collision. Signature includes level, selected fields, filters, breakdowns/action_breakdowns, time_increment, requested attribution settings, timezone and API version. Breakdown tuple uses a canonical representation, distinguishing not_requested, missing/suppressed and actual provider values; not a NULL-based unique key. Current revision pointer or equivalent selection must return only one accepted revision per grain. Two query profiles are not additive copies of spend.

Provider counts use DECIMAL(30,0), spend DECIMAL(30,6) with account_currency, exposed as decimal strings; overflow/extra precision is a validation failure, not truncation. Raw selected value remains available in sanitized reconciliation evidence. Metadata budget *_raw uses account minor units; Insights spend uses currency major units. JSON actions/action_values preserve action_type and returned window keys exactly. A Marketing-owned child projection marketing_insight_action stores tenant/observation/action_type/window_key/metric_kind/value DECIMAL(30,6); unique on those keys, no summing windows or action types blindly. value and window-specific fields are distinct entries. These are Meta measures, never renamed CRM metrics.

## Fetch profiles, not report templates

| Profile | Requested scope | Payload selection / storage |
|---|---|---|
| object_metadata_v1 | Authorized account and selected Campaign/Ad Set/Ad/Creative/Audience references | Selected103-field catalog excluding Insights fields; explicit fields list, no whole account dump |
| insight_ad_daily_v1 | Account Insights, level=ad, time_increment=1, no breakdown | IDs, account_currency, date_start/date_stop, impressions, clicks, inline_link_clicks, reach, spend; actions/action_values/attribution_setting fetched only in a validated compatible profile |
| insight_ad_age_daily_v1 | Same base scope, breakdowns=[age] | Core delivery/engagement/spend fields plus age; action metrics are not required for this breakdown profile |
| insight_ad_region_daily_v1 | Same base scope, breakdowns=[region] | Core delivery/engagement/spend fields plus region; independent of age dataset |

Graph paths are proposed read routes /act_{account}/campaigns, /adsets, /ads, /adcreatives, /insights and authorized object-by-ID hydration. Verify each exact field/edge/API pin in PLAN-011 against saved docs and live eligibility. Version v25.0 is the documentation candidate, not a runtime pin. Do not inherit Messenger v26.0 automatically. ads_read/account access and any additional asset/Business permissions must be verified in the auth design; no claim of approved app permissions.

Base and breakdown fields supported by a given account/version are tracked separately. Unsupported query combination becomes unavailable with a sanitized reason; no synthetic breakdown cells, no silent drop from requested profile, no zero fill. Additional age+gender, country, placement or asset profiles are extensions after explicit field/query coverage validation. Separate age and region marginals never manufacture an age×region table.

## Durable synchronization decisions

1. Binding identifies authorized tenant/account and remote credential reference. External account is shareable across tenants; each job retains its own tenant context. Resolve Creative Page through authoritative Page ownership before persisting any Ad-related object/history/Insight; mismatch skips, unresolved defers. One active sync writer per account/profile partition. Use lease/fencing and durable run/checkpoint; exact scheduling/backfill range belongs to configuration/API design, not an inferred customer retention period.
2. Fetch explicit fields and bounded pages outside DB transactions. Validate tenant/account/IDs/types/coverage before ingestion. Persist selected observations, current projections, progress and outbox atomically within Marketing; never advance cursor before data commit. Do not persist token-bearing next URLs; store sanitized pagination tokens/query state.
3. Admission filters apply before selected payload/history/outbox persistence; parent replicas are only for admitted Ads and shared provider config is explicitly labeled. Insights level=ad rows require an admitted mapping. Replaying a page or completed query is idempotent. Re-fetch can create a corrected metric revision; readers select the current accepted revision rather than sum fetches. Out-of-order workers cannot replace later accepted state after fence revocation.
4. Incremental updated_time is an optimization only. Periodic reconciliation is required because metadata budget changes may not update provider timestamps. Recent Insights periods need repeated fetch for delayed attribution/corrections; exact bounded window/cadence is explicit in PLAN-011 settings.
5. Incomplete pages or revoked permission preserve last-known data and mark freshness/coverage. Only authoritative deletion evidence creates a tombstone. Parent missing remains unresolved and queued for hydration. Reconnect changes binding history without replacing object identity or clearing outcomes.
6. Reporting consumes versioned source descriptors, snapshots/events and watermarks. Descriptor exposes object key/grain, field type/meaning/unit/coverage, relationship scope/cardinality and base metric aggregation properties. Reporting owns formulas, links between producers, template/query design and report UI.

## Remaining implementation gate, explicitly not completed here

PLAN-011 still must finalize native auth/credential owner and OAuth scopes, exact API version and supported field/edge matrix, migration/table templates for every support/projection table, grants/indexes/limits/retention, sync settings/API/events/read cursors/error contracts and account permission/field ACL. Insights ingestion needs an explicit source task/dependency, separate from metadata-only SRC-051; do not mark SRC-049 implemented by data design. No live API calls or new tables performed in this task.

Data-design evidence: regeneration checks all105 field descriptors against saved source rows and detects dictionary drift; documentation links/DAG checked separately. Future data-ingestion acceptance covers opaque IDs, missing/null, unit/precision, account mismatch, duplicate/revised insights, separate age/region totals, partial pagination, retry/fence/restart, unresolved parents and two-tenant isolation. Reuse synthetic users/data; no reset.

PLAN-023 / CHG-20261008-09: [Shared account and Page tenant admission](../contracts/marketing-tenant-admission.md). All tables retain tenant_id NOT NULL. The same external Ad Account may have independent tenant-local replicas/bindings. Ads/related metadata/Insights are admitted only when Creative Page resolves to the sync tenant; foreign Ads skip, unresolved defer. Parent configuration can be shared; children and ad-level Insights remain tenant-filtered. No cross-tenant payload/history persistence or campaign/account aggregate metric substitution.

PLAN-011E / CHG-20261008-11: [Ready metadata backend contract](../contracts/marketing-metadata-sync.md), [control-table templates](../contracts/marketing-sync-tables.md), [implementation sequence](../planning/marketing-backend.md). Channels retains current credential/Page authority; SRC-056 implements its versioned ports before SRC-051 periodic metadata worker. Database v1 remains the only applied Marketing implementation; Insights/live Meta remain separate.
