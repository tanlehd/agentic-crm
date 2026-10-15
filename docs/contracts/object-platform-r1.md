# Object Platform R1 implementation contract — PLAN-028A

2026-10-15, CHG-20261015-03. Ready for bounded source after contract checks. User requested Code following PLAN-028. First delivery is canonical object catalog + persisted workspace settings + Object & Properties/ERD + native generic records. Lifecycle mutation, reverse-label editing, unlink, cross-consumer dependency index and backfill remain unimplemented follow-up scope of PLAN-028E; no complete R1 or full PLAN-028 claim from this slice. Existing key/type/cardinality immutable guards are retained. [Plan](../planning/no-code-object-platform.md).

## API

All routes native `/api/v1`, no-store, same session/tenant/CSRF/idempotency conventions as CRM. GET `/crm/object-catalog` requires schema.read/configure; reuses Workflow canonical object/property/relation projector, but no automation grant. Response `{data:{schema_version:1,tenant_id,principal_id,authorization_revision,revision,objects,relations},meta:{correlation_id}}`. Objects have existing Workflow descriptor plus `workspace` and `extensions_supported` (custom, Contact, Company, Activity, Lead only); unsupported Deal/Conversation/Ticket extension metadata creation returns422 OBJECT_NOT_IMPLEMENTED. Existing unsupported definitions remain readable, never deleted. No record values/defaults in catalog. Limit100 visible objects/200 fields/500 relations and scan limits inherited; overflow422. Standard fields are registered owner metadata. Generic business command bypass stays rejected.

GET `/crm/workspace-objects` requires native read capability; returns `{data:[{id,key,label,kind,version,display_property_key,position}],meta:{correlation_id}}` only enabled custom objects with current scoped read grant. Field-denied display key returns null. Max100 entries, overflow422; menu presence is not record authority. Does not require schema/automation grants or return metadata of hidden objects. Existing More/CRM entry remains compatible.

PUT `/object-types/:key/workspace` requires schema.read + schema.update/configure. Exact body `{label,plural_label,description,display_property_key,enabled,position}`; labels trimmed1…255, description≤1000, display nullable existing readable custom scalar string/enum property on this object, enabled boolean, position integer0…999. Only custom objects can enable workspace or choose display property; standard labels immutable, presentation may store description/plural label but no new domain CRUD. If-Match is **object_type.version**, mandatory428, stale409; input invalid422, unknown key400, nonexistent404. Return `{data:{object_type_id,version,workspace},meta}` where workspace is `{plural_label,description,display_property_key,enabled,position}`. Label changes update object_type; config/type version/schema_version+1 and audit+receipt atomic. No default grant creation. Replay rechecks schema and current field rights before returning prior response. Successful retry keeps IDs/version. Body values never logged in audit.

Schema creation/extension guard: only custom + Contact/Company/Activity/Lead currently support persisted custom values; Deal/Conversation/Ticket show disabled create-field with reason. Index/required/type changes remain M1 rejection rules. Workspace disable hides menu only, no record archive/delete. Default settings: disabled, position100, empty description, plural_label=object label, display=null. Existing data sees these defaults without rows/backfill. Create custom object then configure is explicit two-step operation; UI retains created object if second save fails.

## Physical design — object_workspace_config

SRC-074 integration addition: GET `/api/v1/crm/association-catalog` returns `{data:[relation descriptor],meta:{correlation_id}}`, reusing canonical relation IDs/key/label/version/source_object_type_id/target_object_type_id/cardinality. Requires native read capability and association.read grant; each endpoint object must have a current read grant (own/team/all accepted for discovery; actual record access remains independently enforced). Only nonarchived endpoints in the current tenant; no record IDs/values. Scan max5000, result max500, explicit422 on overflow. No schema/automation permission. Anonymous401, foreign tenant403, missing association grant403; revoked endpoint grant removes relation. Used by agent record link picker; no mutation permissions added.

| Table template requirement | Design |
|---|---|
| Task / AC | SRC-073 bounded catalog/config; OP-01/02/03 baseline guard/05/06/07/08 rename-only |
| Schema / owner / aggregate | CRM Core; target crm_core. Physical baseline agentic_crm until extraction; single CRM writer via local ports |
| Meaning / state | Authoritative tenant object presentation and menu placement; not record ACL, schema lifecycle or consumer readiness |
| Scope | business; tenant from native TenantContext, no system tenant/default |
| Columns | tenant_id,object_type_id CHAR36 ascii_bin NOT NULL; plural_label VARCHAR255 NOT NULL; description VARCHAR1000 NOT NULL; display_property_key VARCHAR64 ascii_bin NULL; enabled BOOLEAN NOT NULL; position SMALLINT UNSIGNED NOT NULL; created_at/updated_at DATETIME6 NOT NULL. No implicit defaults; full values supplied by command |
| Keys / constraints | PK(tenant_id,object_type_id); same-tenant FK to object_type(tenant_id,id), no cascade; CHECK enabled in0/1 and position≤999 |
| Remote refs | None. Display key validated against local property_definition under tenant lock; immutable key baseline |
| Query/index | Tenant catalog join by PK; workspace join/filter enabled, sort position/label/id; bounded100. No index on low-cardinality enabled alone |
| Version/concurrency | Authoritative CAS object_type.version; no duplicate config version. Tenant exclusive mutation lock serializes with schema/ACL; same local UoW |
| Authorization | schema.read/update configure for write; read menu only read seat+object read grant; display property current field read enforced |
| Audit/outbox | Existing atomic audit_entry + idempotency_receipt; changed names only. No new event producer/capability advertised; consumer discovery pulls current catalog |
| Retention/security | Config text only, UI instructs no sensitive data; no record values/tokens. Retain while object exists; no delete endpoint in slice |
| Grants | Existing CRM runtime explicit table SELECT/INSERT/UPDATE provisioning; app exposes no delete. Migration operator DDL only |
| Migration | Forward30 CREATE only, histories1…29 unchanged. No data update/backfill. local/test apply after preservation snapshot; repeat applies0 |
| Compatibility/rollback | M1 strict wire unchanged; new endpoints additive. Old clients ignore table, old runtime can read retained data; forward fix for deployment failure, no destructive down |
| Tests/evidence | Retained isolated native fixture, no DB reset; CAS/replay/revoke/foreign tenant/disabled/field deny, old record fingerprints and migration-repeat checks; evidence at SRC-073 |

## UI and delivery

Settings navigation label Object & Properties. Search/filter standard/custom; object tabs Properties, Associations, Forms & views, Workspace; native API-backed create and editing. Standard fields shown read-only according to owner descriptors, unsupported objects explicitly unavailable. ERD uses bounded catalog as nodes/edges with 1/1:N/N:N direction, search/focus/zoom and keyboard relationship table; no editing schema by dragging. Workspace custom nav uses enabled objects only, existing Records renderer/CRUD and query ACL. Request caches tenant keyed; object settings remount per object, stale409 retains input. Report/Flow readiness is visible as unavailable until their tasks deliver; UI cannot activate them. Native and browser evidence required before source completion. Executed sub-scope and remaining NOT_RUN scenarios are recorded in [SRC-074 evidence](../tracking/details/SRC-074.md).
