# Thread / Conversation — implementation contract

PLAN-033A · CHG-20261016-01 · 2026-10-16. Exact additive implementation of the [approved product model](thread-conversation-product.md). Ready: document validation completed before source; implemented acceptance in [SRC-078](../tracking/details/SRC-078.md).

## Compatibility and authority

Existing `/api/v1/conversations`, object key `conversation`, IDs and bindings continue to mean Thread. UI calls it Thread; legacy `pending` maps to open plus pending handling overlay. No administrative reopen or outbound-created episode is added. Existing close/inbound guards remain authoritative. Stage/process pins retain existing APIs.

New metadata key `conversation_session` has display label Conversation (lượt trao đổi). It is a standard metadata-only object, without generic record CRUD, workflow actions, reporting datasource or associations. Definitions use CRM property_definition and field_policy. Chat owns values through an explicit episode API. Metadata gets installed for existing registered Thread tenants and fixture bootstrap. A custom object already using this reserved key fails upgrade for operator resolution rather than being repurposed.

Active owner/team is the existing Thread registry authority under the same assignment fence; there are never two independently writable owners. Each handling event snapshots owner/team/revision, and closure snapshots the final owner. Closed episodes read their last snapshot, never today's Thread owner. Old episodes lacking a snapshot return unknown. Transfers retain episode/stage/source/values and cancel queued work through existing routing. Historical evidence uses current Thread/Contact ACL. Actor is the actual performer; handling_team_id means the assigned handling team, not proof of the actor's membership. No inferred team membership or labor duration.

## Fields and commands

`GET /api/v1/conversations/:thread/sessions/:episode/classification` returns version (0 when absent), lifecycle status, can_edit, definitions with can_write and values filtered by conversation_session field read policies. `POST` accepts only `{values:{key:value|null}}`, requires Idempotency-Key and If-Match of this classification version. Thread read/update + text read/write and current Contact access are required; each patched field requires read and write. Mutation requires active episode; empty patch, unknown fields and invalid values fail. CAS serializes with close/transfer under Thread lock. Replay rechecks current permissions and field rights before returning the original response. Replayed successful commands may return after closure but cannot write again.

Types reuse canonical validators. This release permits optional, unindexed classification fields only, no defaults; required/default/query/index activation needs its own gate. Max 100 definitions, max 64 KiB serialized values. Definitions retain immutable key/type/options; existing label-only rename remains supported. New episodes start empty; no Contact copy/carry-forward. No custom property may replace stage/owner/source/lifecycle. UI renders each supported type and preserves drafts through a version conflict until explicit reload.

`GET .../contributions?before_revision=N` returns newest 50 append-only handling facts, next cursor and explicit full/partial/none coverage. Events include opened, closed, assignment, outbound_submitted, note, stage/evidence and classification changes. Source IDs/revisions make retries unique. Outbound actor is captured at submission; it does not imply delivery. Existing message receipt/status remains authoritative. Notes and Sales contexts expose source references only after current source ACL; no body/transcript duplicated. Sales-owned outcome context remains the authoritative created/follow_up/closing history. Chat records only its source reference and role with actor/time, rechecking Sales read permission on history access. It is not copied into a reporting revenue aggregate.

New fields are not exposed by legacy Thread APIs, exports or reporting; no silent metadata consumer remap. New event `conversation.classification_changed` v1 carries only thread_id/session_id/version/changed_keys, atomically with audit and values, never field contents. Contribution ledger is a local Chat read model; distributed projection/credit metrics are not activated.

## Filled table designs

Both tables use target crm_chat, physical current monolith until ADR-017 extraction. Business TenantContext only, tenant_id NOT NULL; no Identity/Core/Sales FK. Chat application port is the only writer, with existing baseline UoW. No new cross-service database access. Tests use retained Alpha/Beta synthetic fixtures.

| Template item | session_classification | session_contribution |
|---|---|---|
| Task / AC | SRC-078, TC-02/04/07/09 | SRC-078, TC-04/06/07/08/09 |
| Meaning / kind | Current episode custom values, source of truth | Immutable handling evidence; not work-time or revenue credit |
| Columns | tenant_id/session_id CHAR36 ASCII NOT NULL; values_json JSON NOT NULL; version BIGINT UNSIGNED default1; created_at/updated_at DATETIME(6) UTC NOT NULL | tenant_id/session_id/id/thread_id CHAR36 NOT NULL; revision BIGINT UNSIGNED NOT NULL; kind VARCHAR32 NOT NULL; source_id CHAR36 NOT NULL; source_revision VARCHAR20 NOT NULL; actor_kind VARCHAR16 and actor_id CHAR36 nullable; owner_id/team_id CHAR36 nullable; owner_revision BIGINT UNSIGNED NOT NULL (0 = historical unknown); payload JSON NOT NULL; recorded_at DATETIME(6) UTC NOT NULL |
| Keys / constraints | PK tenant/session; FK to same-tenant Chat acquisition session; version>=1 | PK tenant/session/revision; unique tenant/session/kind/source_id/source_revision; FK to same-tenant Chat episode; revision>=1; index tenant/thread/session |
| Remote references | Property key via canonical Core metadata port; unavailable fails closed | Owner/team/actor logical Identity refs; source refs validated at read; unavailable/forbidden source facts suppressed |
| Queries / bound | One point read; <=100 fields /64KiB | Episode revision keyset, 51 rows/page; no cross-tenant aggregate |
| Permissions | Thread/Contact current ACL + per-field read/write | Thread/Contact current ACL, note source ACL, field changes redacted by current field policies |
| Concurrent writes | Tenant auth lock → Thread registry lock → values CAS | Same Thread fence; MAX(revision)+1 inside fence; unique source dedup; immutable append |
| Audit / event | Atomic minimized audit + classification_changed v1 | Source command retains existing audit/outbox; no fabricated old actors |
| Privacy / retention | Classification only; no secrets/transcripts. Retain with episode until approved retention/purge | Same episode retention; immutable, no cascade delete; historical field values subject to live read ACL |
| Grants | Runtime SELECT/INSERT/UPDATE | Runtime SELECT/INSERT only |
| Migration / backfill | Forward31 create empty; no inherited values | Forward31 create empty; new opened event gives full coverage, first subsequent action partial; no guessed backfill |
| Compatibility / rollback | Additive; old binaries ignore new tables; forward repair only | Old writers create coverage gaps; do not claim full evidence after binary rollback; no destructive rollback |
| Evidence | See SRC-078 evidence | EXPLAIN/tenant negative/CAS/replay/transfer/closure checked in SRC-078 |

## UI and acceptance

Object & Properties enables definition creation for Conversation, while generic Workspace/Flow/Reporting stays unavailable. Inbox shows Conversation selector, stage, classification and handling history; Related objects sits below Contact and exposes existing Lead/Deal forms by permission. Ticket creation stays absent because runtime capability is absent. Transfer panel allows selecting a destination team and an eligible agent or team queue, without create-outcome permission. Assignment response/history remain wire compatible; target discovery accepts optional team_id and validates selected team.

Acceptance: two episode values isolated; null removal/type/field deny/replay revoke; two tenants; close/field and transfer/field races; active snapshot survives A→B/team→A; old history unknown; later membership does not rewrite snapshot; new ad retains episode; close/new inbound resets fields; source IDs unchanged; Lead/Deal creation/continue remains independent. Required checks: builds/types/unit, retained MySQL/native commands, browser flow and preserved local forward upgrade. Ticket and distributed Reporting remain outside existing approved runtime capability.
