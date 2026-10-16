# Record detail / preview pages — PLAN-034 / SRC-080

2026-10-16 · Ready bounded implementation · CHG-20261016-03. User requested two independently configurable pages and explicitly chose Default plus team views. Dependencies SRC-074/078/079 DONE. [UX](../ux/record-pages.md). This replaces the Forms & views tab, not stored create-form/list-view semantics. Existing form/view APIs and data stay compatible; a secondary legacy editor remains reachable from Setup.

## Scope and ownership

CRM Core owns page presentation metadata in the existing monolith (target crm_core). Detail renders a record with fixed identity/actions plus left, center tab and right card regions. Preview is a compact card stack used by Contact in Inbox and a preview action in CRM records. Config never grants access or overrides record/field/business-command authority. Supported generic record adapters: custom, Contact, Company, Activity, Lead and Deal. Thread/Conversation/Ticket keep their domain screens; unsupported layout consumer explicitly unavailable. Inbox thread/session/qualification/ownership panels remain outside Contact layout, so hiding Contact cards cannot hide thread controls.

Cards: property list (ordered max50 fields), activities (related CRM Activity, no synthetic timeline), association (registered association or Contact→Lead/Deal owner query). Association card has ordered max5 fields; native generic links show only records readable by current user. Filter/sort for owner-query cards uses existing supported query fields (eq, one filter; asc/desc); unsupported generic-link filtering is not advertised. Limit5/10/20, no fabricated total. Activity display is latest authorized subset with explicit bounded semantics. No attachments/AI insights/Ticket mock cards. Library derives choices from existing metadata/capability.

## Persisted JSON and resolution

Layout schema_version1: `{left:Card[],tabs:[{id,title,cards:Card[]}],right:Card[]}`. Card `{id,title,kind:'properties'|'activities'|'association',fields:string[],relation:string|null,limit:5|10|20,filter:null|{field,value},sort:null|{field,direction:'asc'|'desc'}}`. IDs bounded API-key syntax; title1…120; max30 cards/page,6tabs,50fields/property card,5fields/association card; serialized layout≤64KiB. Preview only left cards, empty tabs/right. Detail1…6tabs. Stable keys, no HTML/SQL/code or record values in definitions. Empty card stack allowed; header/actions remain fixed. Cards may repeat fields, IDs unique globally.

Each object/surface has one virtual Default view (version0, not persisted until saved); later CAS versions≥1. Named team views have1…20 active team IDs and priority0…999 (lower wins). Assignment unique per object+surface+team; conflict409 and no auto-reassignment. Current viewer active membership, not record owner/team, chooses eligible view by priority then immutable view key; otherwise Default. Archived team never participates. Team assignment is presentation only. Removing assignments/deleting views is explicit; deletion of Default disallowed. Keep team view inactive by assigning a different team or deleting view; no business record deletion.

## Native routes

Machine contracts: [OpenAPI](record-pages.openapi.json); `packages/contracts/schemas/record-page-input.json`, `record-page-library.json`, `record-page-resolved.json`, generated and checked by `scripts/generate-record-pages-contracts.mjs`. Runtime adds global card/ID limits and surface-specific region rules. Owner-query filter values validate against canonical field types/options before save. Registered relation targets must have an implemented record-read adapter; unsupported domain screens cannot be configured as generic cards.

Session/tenant/CSRF/idempotency/no-store conventions retained. `:surface` is detail|preview; `:view` default or UUID. GET `/object-types/:key/record-pages/:surface` lists views and active team choices for schema.read; team choices/views require Identity team.read. Each view `{key,name,team_ids,priority,version,updated_at,layout,editable}`. GET `/objects/:key/record-page/:surface` resolves viewer layout with object read capability (no schema grant needed); returns filtered metadata, no records. PUT `/object-types/:key/record-pages/:surface/:view` body `{name,team_ids,priority,layout}` requires schema.read/update; team assignment additionally team.read and active same-tenant IDs through Identity application port. Mandatory If-Match quoted0 for create/virtual Default, ≥1 for update; status200, strict shape, unknown400, invalid422, stale/assignment409, missing428. POST same path with `/remove` requires version, idempotency and schema.update; team.read for team view; default422. Audit/receipt atomic, including deletes. Current rights rechecked before replay. Admin layout redaction marks editable=false to prevent accidental overwriting invisible fields.

GET `/objects/:key/records/:id/page-activities` verifies parent record read, Activity read and relation-field visibility; bounded100 related candidates (overflow422), returns newest authorized max20 records through existing CrmRecords output (field filtering), no unauthorized count/cursor. CRM-owned query only. Sales related queries continue native `/leads`/`deals` with contact_id filter; generic association listing uses existing authorized API, then authorized target reads. No cross-service SQL or foreign implementation imports added.

## Filled table designs (both required by database-table template)

| Requirement | record_page_view | record_page_team |
|---|---|---|
| Task / AC | SRC-080; RP-01…08 below | Same |
| Target / physical / writer | crm_core; physical agentic_crm monolith until extraction; CRM local UoW | Same |
| Meaning / scope | Authoritative presentation, business TenantContext only; not access policy | Team-to-view presentation assignment, business tenant |
| Columns | tenant_id,id,object_type_id CHAR36 ascii_bin NOT NULL; surface VARCHAR8 ascii NOT NULL; view_key VARCHAR36 ascii NOT NULL; name VARCHAR120 NOT NULL; priority SMALLINT UNSIGNED NOT NULL; layout JSON NOT NULL; version BIGINT UNSIGNED NOT NULL; created_at/updated_at DATETIME6 NOT NULL UTC; no implicit defaults | tenant_id,object_type_id,team_id,view_id CHAR36 ascii_bin NOT NULL; surface VARCHAR8 NOT NULL; created_at DATETIME6 NOT NULL UTC; no implicit defaults |
| Keys/constraints | PK tenant+id; unique tenant+object+surface+view_key; unique tenant+id+object+surface for composite child FK; same-tenant object_type FK; surface detail/preview,priority≤999,version≥1 CHECK | PK tenant+object+surface+team_id; index tenant+view_id+object+surface; FK same CRM view tuple; no FK to Identity team |
| Remote refs | Object is local CRM metadata | team_id Identity logical ref validated via local application port in baseline; future extraction API; inactive/missing assignments ignored at resolution |
| Query/index | tenant+object+surface bounded101views, overflow422; exact view via unique key; no OFFSET | view assignment lookup, current team membership intersection; ≤20 per view |
| Authorization | schema.read/update; field denies and record read checked live; runtime resolve object read | additionally team.read for admin team view; viewer active team membership for resolve |
| Concurrency | tenant Identity authorization lock; view CAS; durable receipt; one UoW effect+audit+assignment | same lock/UoW; unique assignment prevents collision |
| Audit/outbox | Existing audit/receipt; event not introduced; catalog consumers read current version | same command; no duplicated event |
| PII/retention | Labels/config only, no record values/secrets; no arbitrary user JSON; retained until explicit view delete, default cannot delete; backups preserved | Logical team IDs; removed only when view assignments replaced/view explicitly removed |
| Runtime grants | SELECT/INSERT/UPDATE/DELETE own two config tables; migration DDL operator | Same |
| Migration | Forward32 creates two tables only; no updates to old data or migration checksums; virtual defaults preserve existing UX | Same |
| Compatibility/rollback | Old runtime ignores tables; old form/view preserved; forward fix, no down/reset; bootstrap grants inventory extended | Same |
| Fixtures/evidence | Retained native_identity_test + Alpha DEMO, foreign tenant/field deny/CAS/replay/team collisions/resolve; EXPLAIN and old-row fingerprints; executed results in [SRC-080](../tracking/details/SRC-080.md) | Same |

## Acceptance

RP-01: separate detail/preview defaults, save/reload independent. RP-02: named team view CRUD/assignment conflict and deterministic current-membership fallback. RP-03: card add/remove/rename/reorder/fields/regions/tabs/filter/sort, undo/redo, save/exit, dirty cancellation. RP-04: configured Contact preview appears in Inbox; configured detail in CRM and Mở Contact; actual fields/records, no fabricated data. RP-05: tenant/CSRF/role/field denial, replay after revoke, CAS409 draft retention. RP-06: immutable original form/view APIs/data, record edits and thread controls still work. RP-07: forward32 repeat0 and all old tables preserved; runtime least grants. RP-08: desktop/mobile320/390, keyboard alternative to dragging, empty/loading/error retry. Complete lifecycle/reporting/workflow gates remain separately tracked.
