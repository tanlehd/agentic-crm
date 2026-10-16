# Customer 360 và inbox session — Ready, SRC-068

**Implemented additive slice SRC-078 / 2026-10-16:** [Thread / Conversation exact contract](thread-conversation-implementation.md), PLAN-033A DONE. Thread legacy IDs/API remain stable; Conversation episode has optional custom fields and stage, event-time ownership/contributor history, and Related Lead/Deal actions with current permissions. Cross-team transfer preserves the episode; Ticket and connected Reporting remain gated. Physical forward31 stays in the baseline monolith; service extraction rules below remain unchanged.

2026-10-13, CHG-20261013-10. User approved implementation after [final ERD](../data/chat-sales-erd.md). This exact slice replaces referral-driven session splitting and implements agent intake/continuation, direct Deal context and explicit duplicate Lead consolidation. Configurable session stages/milestone evidence are a separate subsequent slice; no funnel reporting completion is implied by this delivery.

## Behavior and compatibility

- An active session survives every new referral. Opening source, sequence and existing queued reply/AI/Chatflow remain unchanged. Each referral receives an immutable session touchpoint link. Actual agent close still cancels pending work; next inbound opens a new session. Existing v1 sessions/closed boundaries/source snapshots are not rewritten. New sessions use `inbox_v2`; an already active v1 session uses the new handling rule after cutover but retains its historical opening policy.
- Late inbound before the current opening boundary remains unresolved. With no active session, an inbound at/before the last closed boundary must not reopen the thread or create a session. The message/touchpoint remains available for reconciliation; no guessed cohort.
- Customer 360 lists authorized Leads and Deals for the Contact, with pagination. Open Lead statuses: new, qualifying, qualified, handed_off, accepted; open Deal stages: open, qualified, proposal. History is explicit and does not imply every linked record is open. Selection is session-local UI state and never assigns ownership.
- Continue creates a durable session→record `follow_up` fact. It does not edit qualification, stage, owner, amount or primary source. Multiple different records may be linked to one session.
- Creating a Lead from a session records `created` context in the same transaction. Direct Deal may carry conversation_id/conversation_session_id and uses the validated session origin. Deal from Lead inherits Lead primary origin, while an explicitly selected current session becomes the separate `created` fact. Won update may provide current session context, producing `closing`; revenue stays exclusively on Deal.
- Existing create calls without context remain valid. Historical closed-session Lead creation remains valid but is identified as explicit historical context. Follow-up and closing require an active session. No synthetic backfill of historical create/closing context.

## API, authorization and concurrency

Native cookie/CSRF/X-Tenant-Id and current live seat/object/field rights apply. New mutations require Idempotency-Key and quoted If-Match on the Sales record. Session writer uses the existing Chat application port in the monolith UoW; extraction requires versioned API/saga, never cross-service SQL/FK.

- `POST /api/v1/sales/records/:id/session-context` body `{conversation_id, conversation_session_id}`; Sales record version CAS; current Conversation read+update, Contact read, Lead qualify or Deal update, and readable contact_id/status or stage. Session must belong to Conversation/Contact and be active. Receipt returns only IDs/kind/record version; replay rechecks current ACL before returning the receipt. Repeated same link is idempotent and does not bump version twice.
- `GET /api/v1/sales/records/:id/session-context` returns newest 50, optional `before_id` UUID keyset ordered by UUID. Current Sales and Contact read plus per-linked Conversation read/field ACL filter; inaccessible contexts are omitted. Historical entries are append-only.
- `POST /api/v1/leads/:id/merge-preview` body `{target_id}` is read-only, returns redacted source/target and versions. Source is the duplicate to archive; target remains canonical.
- `POST /api/v1/leads/:id/merge` body `{target_id,target_version,reason}`; source If-Match + target CAS, same Contact, both readable and qualify+archive rights on source, qualify rights on target. Preview is advisory; commit repeats all checks. Current field permissions require source/target contact_id,status,qualification,source fields read. Reason nonempty max1000. No active qualification session, pending handoff, archived/disqualified record, self merge or merge chains. An existing canonical target with incoming merges cannot become a source; multiple independent sources may consolidate into one target.
- Consolidation archives only the duplicate registry and appends journal+audit. Retain source qualification/source snapshot/owner, Deal.lead_id, Deal source and every historical context. Target fields/owner remain unchanged. Source detail remains readable subject to ACL, with canonical target reference. UI labels this as retaining target data, provides history access; no invisible data overwrite or Deal reparenting. New Deal creation locks the referenced Lead and rejects archived source.
- Locks: native authorization → Conversation when context is involved → Sales record; merge locks sorted Lead IDs. Existing records create flow may lock Contact; deadlocks propagate for safe transaction retry with the same command key. Every command effect/receipt/audit is atomic. Current ACL checked on replay. No permission escalation or role mutation is included.

## Filled table designs (database-table template)

Common: SRC-068, business tenant from authenticated TenantContext; tenant_id CHAR(36) ASCII binary NOT NULL, all internal IDs same type; UTC DATETIME(6), utf8mb4_0900_as_cs. Current physical monolith pending service extraction. Runtime existing monolith DML, migration role DDL; no cross-service FK. Tables have owner comments. Immutable facts retained with parent business history; no cascade/purge endpoint. No transcript, credentials or monetary copies. Reusable native_seed_test Alpha/Beta synthetic users; evidence initially NOT_RUN.

| Template item | session_touchpoint | sales_session_context | lead_merge |
|---|---|---|---|
| Target schema / writer / aggregate | crm_chat / Chat intake / session | crm_sales / Sales command / Lead or Deal | crm_sales / Lead merge command / source+target |
| Meaning / type | Immutable observed referral membership; not attribution policy | Immutable interaction context; not primary origin or revenue | Immutable duplicate→canonical link; not destructive rewrite |
| Columns | tenant_id, touchpoint_id, session_id, conversation_id IDs NOT NULL; occurred_at, recorded_at DATETIME NOT NULL | tenant_id,id,record_id,conversation_id,session_id,actor_id IDs NOT NULL; kind VARCHAR(16) NOT NULL CHECK created/follow_up/closing; recorded_at DATETIME NOT NULL | tenant_id,source_id,target_id,actor_id IDs NOT NULL; source_version,target_version BIGINT UNSIGNED NOT NULL; reason VARCHAR(1000) NOT NULL; recorded_at DATETIME NOT NULL |
| Keys / constraints | PK tenant,touchpoint; index tenant,session,touchpoint; same Chat FK tenant,session,conversation to session | PK tenant,id; UNIQUE tenant,record,session,kind; index tenant,session,record; no external FK | PK tenant,source; index tenant,target,source; CHECK source<>target, positive versions; same Sales logical IDs verified under locks |
| Remote refs | Connector touchpoint is accepted typed intake input, no remote FK; unavailable prevents input acceptance | Chat port verifies session/contact/ACL; CRM registry verifies record/Contact; fail closed, no guessed links | CRM registry archive/version through monolith application layer, split with owner after extraction |
| Query / pagination | tenant+session counts/list; one row per provider touchpoint | tenant+record+id keyset limit50; tenant+session+record; no arbitrary SQL | tenant+source canonical lookup; tenant+target incoming history, limit50 |
| Rights | existing Conversation attribution read | Sales + Contact + Conversation current rights above; field deny blocks correlation | explicit Lead archive+qualify and field checks above |
| Concurrent writes | caller locks Conversation, unique provider dedup | caller locks Conversation and Sales, unique context semantic key | sorted source/target locks, both versions, source uniqueness, no chains |
| Audit/outbox | existing intake/session audit; link fact in same transaction | existing create/won event remains, context audit atomic; no new external event claim | merge audit atomic, journal provides complete source/target/version evidence; no new external event claim |
| PII / retention | opaque IDs/times only, retain with session | opaque IDs/times only, retain with Sales | agent reason may contain business text; max1000, authorized detail only, retain with Sales |
| Migration | forward28 CREATE; no historical guessed memberships | forward28 CREATE; new operations only | forward28 CREATE; no retroactive merges |
| Compatibility / rollback | old sessions retained; coordinated API/worker cutover needed, old binary would split again | additive; old binaries ignore links; retain tables on rollback | new writes require upgraded clients; never restore old binary to accept archived Lead without guard |
| Verification | multi-Ad/same-Ad dedup, late inbound/close race, queued reply preservation | same-contact/tenant/ACL, source invariant, CAS/replay, direct Deal and later create context | preview/commit, stale both versions, revoked rights, active handoff/Chatflow, origin/Deal preservation, self/chain rejection |

## Acceptance

1. Ad A → S1 → Lead L1; Ad B retains S1/source A, appends touch B, retains pending work.
2. Close S1 → next qualifying inbound S2; continue L1 adds context without source/owner change. Multiple needs can be linked.
3. Deal from L1 in S2 inherits origin S1 but create context S2; direct Deal in S2 uses S2 origin; won in S3 records closing S3 with one Deal amount.
4. Duplicate merge preview/commit preserves source detail, existing Deal references/origin and target fields. Archived source cannot accept new mutation/Deal.
5. Stale CAS, spoofed session/contact, cross tenant, field deny, revoked permission and replay cannot bypass checks. No new Alpha permissions are granted implicitly.
6. Panel has loading/error/empty/permission states, page controls, explicit active record, separate merge preview and desktop/mobile fit.

Evidence: [SRC-068](../tracking/details/SRC-068.md). Configuration of session stages, milestone evidence/corrections and connected funnel queries retain the exact follow-up gate in the final ERD; do not count the context ledger as implementation of those features.
