# Reporting semantic kernel v1 — PLAN-022B / SRC-063

2026-10-10, CHG-20261010-02. **Ready scoped implementation**: pure TypeScript catalog + strict definition validator/compiler, before persistence/HTTP/query execution. Parent [plan](../planning/report-builder.md), [semantics](../data/reporting-semantic-model.md), [acceptance](../quality/report-builder-acceptance.md). No tables, migrations or external API introduced; database-table template not applicable to this slice. PLAN-022 remains open for storage/native BFF/producer contracts and UI review.

## Scope and interfaces

Package `services/reporting`, exports `createRegistry`, `visibleCatalog`, `compileDefinition`, built-in `catalogV1`. Inputs are JSON-compatible descriptors/definition and **trusted server-created** `AccessContext`: tenantId, principalId, authRevision, scopeFingerprint, permissions, readable object/field IDs, allowed binding IDs. Binding includes tenantId, environment, supported model versions, available fields, snapshot revision. Client never supplies access context through definition. This library does not authenticate a caller, query rows or authorize a future result; HTTP adapter must resolve current native rights and recheck before execution/delivery.

Registry compiled from trusted deployment descriptors: objects with key/grain/owner; fields with type/group/filter/unit/permission dependencies; relations with cardinality/from/to; metrics with formula/inputs/dimensions/models/unit/version/time; models with base object/time field/allowed graph and time mode. Reject duplicate IDs, dangling refs, incompatible object field names, missing model/metric versions and metric dependency cycles. Registry immutable to callers through snapshots; extend by constructing a new registry, never mutating a published version.

Built-in model IDs v1: `acquisition`, `marketing_base`, `marketing_age`, `marketing_region`. Acquisition Session is canonical base; Marketing models use separate Insights fact profiles. Catalog contains Conversation/Session/Channel/Contact/Lead/Deal/Team/Agent and Account/Campaign/Ad Set/Ad/Creative/Page/Post/Media refs. This is semantic coverage, not connected producer coverage. All built-in sample bindings are created by tests, never activated as production defaults.

## Definition schema v1

Strict JSON Schema resides at `services/reporting/src/definition-schema.ts`, compiled with Ajv; no additional properties/coercion/defaults. Root: schemaVersion=1, model{id,version}, bindingId, relations[], dimensions[], metrics[{id,version}], filters[], time{mode,from,to,asOf,timezone,bucket}, visualization, optional currency. Version pins required. Tenant/access/SQL/expression fields not accepted. Limits: serialized body64KiB, depth12, selected relations5 (up to6 objects), dimensions4, metrics8, filters20. Strings/arrays bounded; unknown operators rejected.

Time mode `acquisition_cohort|activity`; UTC timestamps use RFC3339 Z, actual calendar validity checked; from<to and asOf>=to. IANA timezone validated by Intl. Bucket `day|week|month`; week Monday (executor later). First slice requires complete period at asOf; partial active periods deferred. Descriptor `periodBasis=event|utc_day` selects temporal validation, not a hard-coded model name. Built-in Marketing daily time windows must UTC-midnight in UTC for this kernel slice; connected account-timezone buckets require PLAN-022 adapter metadata. Never silently rebucket provider daily cost.

Filters: flat AND leaves only, `eq|in|gte|lte|is_null`; typed operands, max50 in values. Decimal and money inputs use canonical decimal strings, no floating money. gte/lte only ordered types. Filter fields must be selected-model reachable through safe to-one relations and explicitly filterable. Nested OR, relationship EXISTS, raw detail columns, user formulas and arbitrary row-level Lead/Deal filters deferred; reject instead of ignoring. Metrics may internally use child facts via declared dependencies, not user-selected raw 1:N joins.

Visualization supported: table, KPI, bar, line, pivot. Table has no encoding props; KPI exactly1 metric and0 dimensions. Bar/line: x selected dimension, y selected metrics (unique), optional series selected dimension different from x; every selected field consumed, line x temporal. Pivot rows<=3, columns<=2, nonoverlapping, union=selected dimensions; values=selected metrics. Chart-only keys invalid for other visual types. CHG-20261012-08 additively extends this encoding to horizontal_bar/stacked_bar/area/pie/donut under [common visualization contract](reporting-visualizations.md); other planned charts remain unavailable.

## Compile safety

Return discriminated result `{ok:false,issues:[{code,path}]}` or `{ok:true,plan}`. Errors contain no hidden values/descriptors/SQL. No exception for invalid user JSON. Catalog registration errors may throw during trusted startup. Successful plan is **semantic validation only**, not executable SQL or evidence of producer completeness.

Validate tenant/binding match (business UUID, explicit system tenant rejected), report.design permission, trusted auth revision and scope fingerprint, model/version/binding capabilities; field access on dimensions/filter/time/relationship keys and every transitive metric input. Selected graph must be rooted at base, connected, directed to-one without duplicate target/ambiguous join; to-many selections are rejected. Unknown or denied lookup returns generic REFERENCE_UNAVAILABLE. Field availability from binding enforced including metric inputs. No descriptor displayed if it leaks denied dependencies.

Each metric explicitly lists allowed models/dimensions; therefore spend cannot group by agent, acquisition conversion cannot group by age/region/media, reach cannot be summed, and rates cannot silently change denominator using child-row filter. Monetary metric requires definition currency; plan partitions facts by metric grain for future preaggregation. No FX/SQL execution/ratio evaluation/cache implemented here. Totals strategy `recompute`, zero denominator `null`, pinned versions preserved. Plan fingerprint covers canonical definition + catalog fingerprint + tenant/principal/auth/scope + binding environment/revision; not a reusable authorization token.

## Acceptance and compatibility

SRC-063 kernel tests: catalog integrity/version/extension; same query across tenants/scopes/bindings has distinct fingerprint; denied time/filter/relationship/transitive metric input; model/profile mismatch; invalid money/date/timezone/schema/limits; graph ambiguity/to-many fan-out; correct chart/pivot encoding; source unavailable; mutation of returned catalog cannot alter later validation. Synthetic test contexts only, no DB resets/secrets/transcripts.

RB-01/03/05/06/09/10/12/15 only **static semantic sub-scope**; runtime counts/cohorts/row ACL/HTTP/revocation/data preservation/UI remain pending. Additive internal package; no existing OpenAPI route/generated client changes. Future incompatible definition or descriptor changes require version increment, not mutation of v1 semantics.

## Common visualization extension — 2026-10-12

CHG-20261012-08: [Ready scoped contract](../contracts/reporting-visualizations.md) adds horizontal bar, stacked bar, area, pie/donut and descriptor-driven quick-start presets to SRC-064. Trend uses temporal line/area, composition requires additive measures and complete nonnegative partitions, exact table remains available. Existing definitions stay compatible; no database migration. Published reusable templates/dashboard/period comparison remain separate.
