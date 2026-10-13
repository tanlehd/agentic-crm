# Marketing database — PLAN-011D / SRC-054

Status: Ready for database-only implementation, 2026-10-08. Dependencies PLAN-023 and SRC-053 DONE. User explicitly separates data implementation from periodic backend synchronization. [Storage fields](../data/marketing-storage-dictionary.md), [admission](marketing-tenant-admission.md), [guidelines](../data/database-guidelines.md).

## Filled table design — common contract

This section applies to every table in the inventory below; per-table differences override it. Column-level physical definitions are recorded in the checked-in SQL migration and generated physical dictionary before deployment.

| Template item | Decision |
|---|---|
| Requirement / acceptance | SRC-054; MKT-DATA-01 in acceptance. Database and operator tools only; no Meta calls, scheduler, service/API or report builder |
| Schema / physical current / writer | New independent `crm_marketing`, Marketing sole writer. No monolith extraction/data move; CRM remains version26 |
| Aggregate / data kind | Provider replicas, accepted immutable observations and their rebuildable projections; local bindings/runs are control state |
| Scope | All business tables require explicit nonzero UUID tenant, reject registered system tenant. Journal alone system scope `01900000-0000-7000-8000-000000000001` |
| Columns | UUID CHAR36 ascii_bin, opaque provider IDs VARCHAR255 ascii_bin; UTC DATETIME6; typed provider fields exactly from105-field dictionary; JSON selected structures <=1MiB each, never tokens/raw foreign payloads; nullable means unresolved/not returned and requires coverage |
| Keys / constraints | PK tenant/id; account children also UNIQUE tenant/account/id; account-scoped local references include tenant/account. No cross-schema FK, view, trigger or SQL |
| Remote references | Page binding namespace/ref/revision are logical Connector evidence; verify through future versioned authority API. No secret or credential material. Identity tenant validation is operator/producer responsibility |
| Query / indexes | Tenant/account/external ID equality; account updated_at/id cursor; parent FKs; Insights grain/revision lookup. EXPLAIN in persistent synthetic test, no performance claim at production cardinality |
| Rights | No application endpoint in this slice. Private local operator only; future service must enforce TenantContext and resource/field ACL. DML credentials do not confer business authorization |
| Concurrency | Named migration lock; checksum journal per DDL step because MySQL DDL auto-commits. Future writers use version CAS/fencing and same-schema transaction; not implemented here |
| Audit / events | Object/metric observations immutable history. No outbox until versioned producer event contract Ready; no runtime effects emitted by this slice |
| PII / retention | Ad content/config only; no contact members or chat transcripts. No automatic purge/TTL; production retention/redaction gate belongs to sync design. No cascading deletes |
| Grants | Dedicated migration operator own schema only; future runtime DML on mutable tables, SELECT/INSERT only history, no journal/DDL. Reporting has no grants. Local provision records dedicated credentials privately |
| Migration | Additive independent lineage version1; journal system scope; step checksums and lock. Existing unknown tables fail closed; no IF NOT EXISTS masking partial incompatible tables |
| Compatibility / rollback | CRM binaries unchanged; data DB dormant. Roll back by stopping use; retain schema/data, forward fix. Never drop/reset to recover; interrupted unjournaled DDL requires operator inspection |
| Fixtures | Persistent `test_crm_marketing`, run-specific A/B UUIDs and shared external account; preserve all prior rows. Local crm_marketing remains empty except journal |
| Evidence | NOT_RUN until SRC-054 evidence; real MySQL tenant/account negatives, admission requiredness, revision/grain, exact decimal, migration rerun, grants, preservation |

## Table inventory and individual semantics

Every row inherits the complete template above. Mutable rows have version>=1, created_at/updated_at; immutable rows have fetched_at/created_at and revision instead. IDs remain opaque. Foreign-key deletion is RESTRICT.

| Table | Aggregate / purpose | Keys, relationships and query overrides |
|---|---|---|
| schema_migration | System immutable DDL journal | tenant/version/step PK; checksum; only registered platform tenant; migration operator only |
| marketing_account | Tenant-local shared account replica | tenant/provider_node_id and tenant/external_account_id unique; same external account permitted in other tenants |
| marketing_account_binding | Account authorization history, remote credential reference | account FK; unique active account via nullable generated active key; disabled bindings retained; no credential owner assumption |
| marketing_sync_run | Future bounded ingestion run/checkpoint | account/binding FK; profile/status/fence/cursor and nonnegative counters; no foreign payload in cursor |
| marketing_facebook_page_ref | Observed Page identity | tenant/external_page_id unique; projection, never ownership authority |
| marketing_instagram_account_ref | Observed Instagram identity | tenant/external_instagram_id unique; nullable display metadata hydration is later |
| marketing_facebook_post_ref | Observed Post identity | tenant/external_post_id unique; nullable same-tenant Page FK |
| marketing_instagram_media_ref | Observed media identity | tenant/external_media_id unique; nullable same-tenant Instagram FK |
| marketing_page_instagram_link | Immutable observed Page/Instagram relationship | Page/Instagram FKs, observed_at and evidence reference; no ownership inference |
| marketing_object_observation | Selected immutable object revision | account/type/external ID/revision unique; run FK; typed parent IDs; coverage/hash/payload; accepted Ad observations require full admission evidence |
| marketing_campaign | Current shared parent configuration | account/external_campaign_id unique; latest observation FK with matching type/external ID |
| marketing_ad_set | Current shared parent configuration / targeting | account/external_adset_id unique; nullable Campaign FK plus external provider parent ID |
| marketing_creative | Current creative content/config | account/external_creative_id unique; latest observation required; variants/story JSON are selected structures |
| marketing_audience_reference | Metadata-only audience | account/external_audience_id unique; no audience member data |
| marketing_ad | Current admitted Ad | account/external_ad_id unique; nullable resolved Campaign/Ad Set/Creative FKs, required Page admission evidence + accepted observation |
| marketing_creative_revision | Typed projection of creative observation | unique observation; Page/Instagram/Post/Media nullable FKs; source IDs remain in selected payload/current fields |
| marketing_content_variant | Content variant projection | creative revision FK; provider_path, kind, asset ref/text; no winning-asset inference |
| marketing_targeting_revision | Typed projection of Ad Set observation | unique observation; selected targeting JSON and same-account Ad Set FK |
| marketing_targeting_audience_ref | Included/excluded audience projection | targeting revision/audience FKs same tenant/account; unique revision/audience/relation |
| marketing_ad_creative_binding | Immutable observed relationship | Ad/Creative/observation FKs; unique Ad observation; preserves provider evidence, does not assume every edit retains Ad ID |
| marketing_insight_grain | Stable query/breakdown/period identity | tenant/account/ad/dates/query hash/breakdown hash unique; canonical strings retained; profile base/age/region and account timezone; current selection uses max accepted revision |
| marketing_insight_observation | Immutable accepted metric revision | grain/revision unique; same-account Ad observation+Page evidence;105-field selection's17 Insights columns; required provider dates/ad; CHECK matching grain via composite FK |
| marketing_insight_action | Normalized Meta action/window value | observation/action_type/window_key/metric_kind unique; DECIMAL30,6; windows/actions not blindly additive |

Account latest observation is nullable for bootstrap; other current provider objects require an observation. Observations may precede current rows in one Marketing transaction. Revision projection foreign keys enforce object type and external identity where supplied. Parent-chain consistency and canonical hash equality require producer validation in the later backend; DB scope does not assert those checks are running.

Insights grain uses required canonical text and SHA256 hashes. Hash collisions must fail producer equality checks, never merge cells; checks of hash versus canonical stored bytes are implemented in DDL. Base/age/region are distinct queries; absent/suppressed breakdown values must be encoded explicitly in canonical text. Highest committed revision is the accepted current observation; rejected/deferred data never enters observation tables. No CRM contact/lead/deal conversion fields on breakdown tables. DATE stop is inclusive, money decimal major units, budget *_raw minor units. Future ingestion rejects excess decimal precision before SQL coercion.

## Subsequent backend plan

PLAN-011 completes auth/credential owner, live API field/query matrix, Page validation protocol, JSON minimization, retention and versioned lookup/events. SRC-051 then implements metadata sync with explicit periodic cadence, reconciliation, lease/fence, retry/checkpoint and Page skip/defer. SRC-055 implements base/age/region Insights sync after metadata admission. Reporting remains PLAN-022 → SRC-049. None is fulfilled by database existence.
