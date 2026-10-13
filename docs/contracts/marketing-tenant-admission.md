# Shared Ad Account and Page-gated tenant ingestion

PLAN-023 / CHG-20261008-09,2026-10-08. User-approved data ownership rule. Refines PLAN-011C source design before implementation; no schema applied or live sync claimed.

## Account access is separate from tenant data ownership

Every Marketing application table, including account, binding, sync run, observation, links and metrics, has tenant_id NOT NULL. tenant_id is the tenant whose authorized sync owns the stored replica; the worker gets it from authenticated binding/job context, never from arbitrary provider payload.

A real Meta Ad Account may serve several CRM tenants (agency operation or independent wallet ownership). Do not impose global uniqueness on external_account_id or equate Meta Business/account ownership with CRM tenant ownership. Use a tenant-local marketing_account replica and binding: unique tenant/provider/external_account_id; the same external ID is permitted under tenants A and B with different local UUIDs. This models logical account sharing without a global row readable across tenants or a nullable tenant exception. One active binding/writer per tenant/provider/account remains; A disconnecting/revoking its binding does not disable B's binding. Credentials are independently authorized logical references, not shared merely because external account IDs match.

The shared provider account replica may expose authorized account identity/currency/timezone and configured account limits with scope=provider_account. It never provides an account-wide spend total as tenant spend. Admission of child objects requires the Page rule below, even when account credentials can read the whole agency account.

## Authoritative Page admission

For sync context tenant T:

1. Read an Ad and its linked Creative; resolve the Creative's Facebook Page using typed evidence. Prefer explicit object_story_spec.page_id; an actor_id must be verified as a Page, not assumed. For existing-post creatives without explicit Page, obtain verified Post→Page evidence through the owning provider adapter. Conflicting sources are unresolved, not chosen by convenience. Provider endpoint support remains an exact API gate.
2. Ask the existing Channels/target Connector Page authority whether that Page belongs to T, using its binding namespace and revision. Existing unique(app_id,page_id) remains intact. A bare Page ID with ambiguous app/binding ownership cannot be accepted. Marketing Page REF metadata is not its own ownership authority; never auto-claim a Page because it appears in an Ad Account.
3. If the resolved tenant equals T and the binding is valid, admit the Ad. Store tenant_id=T and Page admission evidence. Never set tenant_id to a different tenant returned by lookup or dispatch a write to that tenant from T's job.
4. If ownership belongs elsewhere, skip the Ad for T. If Page is absent, ambiguous, unbound or ownership service unavailable, do not admit yet; classify unresolved/deferred and retry when evidence becomes available. Instagram-only creatives without authoritative Facebook Page evidence are outside this Page-based admission path until a separate explicit rule is designed.
5. Recheck binding revision and writer fence before committing. Admission evidence is revisioned; no cached account grant alone bypasses a changed/revoked Page binding. The exact versioned validation protocol belongs to PLAN-011 before runtime implementation.

Admissible is account-access AND matching Page-tenant authority. Page authority must not expose another tenant's identity to end-user sync status. Mismatch counts and sanitized reason are sufficient. No credentials or foreign ad/content payloads in logs, observations, outbox or report projections. Discovery response may be inspected transiently to decide admission; only bounded sanitized retry state is retained for unresolved objects, governed by integration ACL. Foreign skip advances the scan checkpoint; it is not a failed page endlessly retried.

## What is saved after admission

| Object/data | Tenant write rule |
|---|---|
| Ad / Creative / Post / Page references | Persist only for admitted Ads and their necessary related metadata. No wholesale creative library or unrelated Page metadata ingestion |
| Campaign / Ad Set | Persist a tenant-local parent replica only when referenced by an admitted Ad. Parent itself has no authoritative customer Page; do not assign all children based on its first admitted Ad |
| Targeting / audience references | Persist only configuration/references needed by an admitted Ad's parent chain; no unrelated account-wide audience-library import |
| Base and age/region Insights | Query at level=ad and admit each ad_id through the same verified mapping; inherit tenant/Page admission context. If API returns extra rows, filter again before storage |
| Metadata/history/events | Apply the same admission rule before writing selected payload, projections or durable source event; skip must not leave a foreign payload in a history table |
| CRM source lookup | Resolve only admitted tenant-local Ad replicas with relevant Page evidence. Existing immutable Session/Lead/Deal source is never rewritten during sync |

Campaign/Ad Set may contain Ads for several Pages/tenants. The same provider parent ID can therefore have a replica in A and B. A's children list is a tenant-filtered subset, not a statement that the whole campaign belongs to A. Keep object_scope=shared_parent_configuration / children_scope=tenant_admitted in source descriptions. Campaign budget or learning-stage configuration is provider-parent context; it is not tenant-allocated budget/performance. Reporting may group accepted ad-level metrics by this parent, but never join account/campaign aggregate Insights into tenant-only data. Account-wide balances/spend remain outside existing selection.

Each Insights row is admitted by ad_id→Creative→Page, not by an assumed Page field on Insights. Cache only verified versioned mappings, never map missing Ads using Page of another Ad or account. Query-level filtering by admitted ad IDs is an optimization after provider support is verified; always validate each returned row. Missing mapping defers that row, without writing it into a default tenant or zero-filled dataset.

## Data fields added to the design

These are CRM control fields, not additions to the105 Meta provider-field list:

- tenant_id CHAR36 NOT NULL on every table; sync_run.tenant_id identifies the initiating/owning tenant.
- Ad/current and accepted observations: admission_page_id VARCHAR255, page_binding_ref CHAR36, page_binding_namespace VARCHAR255, page_binding_revision VARCHAR255, admission_policy_version VARCHAR32, admitted_at DATETIME6 UTC, ownership_checked_at DATETIME6 UTC. Accepted Ad observations require these values; types/protocol limits must be finalized with the Page authority in PLAN-011.
- Accepted Insights: reference the accepted Ad observation/admission revision and preserve admission_page_id for lineage. Keys remain tenant/account/ad/period/query/breakdown/revision; no foreign FK to Connector.
- Sync runs: counters scanned_ads, admitted_ads, skipped_page_mismatch, unresolved_page, deferred_insight_rows; nonnegative BIGINT. No customer-visible list of foreign tenant IDs or foreign ad details.
- Parent source descriptor: object_scope and children_scope as above. Identity keys and FK relationships are always tenant-bound; provider IDs may repeat between tenants.

If ownership changes, stop future admission under the old binding and preserve prior tenant-bound records according to retention/access policy. Do not move or relabel historical observations/CRM outcomes between tenants. Historical backfill must validate evidence for the requested period; current Page ownership is not proof for all past dates. If an Insights period spans ambiguous ownership or Creative/Page changes, defer it or fetch supported narrower periods with evidence; do not allocate by guess. Explicit transfer/reconciliation is a future gated operation.

## Acceptance fixtures and gate

Use one external account X authorized by synthetic tenants A and B: Ad1→PageA→A, Ad2→PageB→B, Ad3→unknown Page, plus shared Campaign/Ad Set. A persists only Ad1 and required parents/Creative/Insights; B only Ad2. Neither has the other's raw observation/payload/event. Same parent external IDs exist in both tenant replicas without FK crossover. Account disconnect in A leaves B intact. Include post-backed Page resolution, conflicting/absent Page, authority outage/revision change, retry/fence, extra Insights rows, missing ad mapping, mixed ownership history, skip checkpoint progress and base/age/region metrics. No campaign-total leakage or artificial zeros.

This task updates data design and source admission constraints only. Exact SQL/table templates, provider Page-resolution endpoints, authorization protocol, migrations and runtime tests remain PLAN-011/SRC-051 and the explicit Insights ingestion task. Reporting builder remains independently owned by Reporting.

PLAN-011E now defines [exact metadata admission](marketing-metadata-sync.md): typed Creative Page evidence, immutable authority grant receipt serialized against revoke, then fenced local Marketing persistence. Page ownership authority remains Channels until extraction. Historical accepted receipts survive revoke; new grants do not. This refines the precommit check without claiming distributed SQL atomicity.
