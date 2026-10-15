# Acquisition sessions — scoped implementation contract

**Current cutover SRC-068 / CHG-20261013-10:** [Customer360/session contract](customer-360-session.md) supersedes the v1 lifecycle below. Active sessions now survive new referrals; forward28 records touchpoint membership and actual Sales context. Existing v1 rows and source snapshots remain historical facts. Stage/milestone tables/API from the [final ERD](../data/chat-sales-erd.md) remain a separate scope, not implemented here.

**Historical clarification CHG-20261013-07:** người dùng xác nhận referral/Ad mới khi session đang open phải giữ session đó. SRC-068 implements that replacement; acquisition_v1 lifecycle and evidence below describe the historical release, not the current writer.

PLAN-011B, CHG-20261008-04. Ready contract, implemented and locally verified in [SRC-053](../tracking/details/SRC-053.md). User confirmed organic segmentation: agent closes session; next inbound opens another; no idle timeout. Product parent: [session model](conversation-acquisition-session.md).

## Lifecycle and ordering v1

One active acquisition session per Conversation. Any new nonduplicate CTM referral attached to a new inbound message opens a session, even same ad_id. It closes the previous active session with reason new_referral, fences queued replies and stops old Chatflow/AI work; same provider message/event retry cannot create another session. Referral-only provider events are not supported by current mock ingress and remain adapter gate.

Organic inbound joins active session; if none, opens organic/unknown according to channel metadata. Agent uses existing Conversation close command to close active session atomically and stop queued/orchestration work. Next inbound reopens the same canonical Conversation, preserving history and owner. Pending is not session close. No auto session close on Deal won. A reopened Conversation clears closed_at.

Canonical thread lookup under existing identity lock: active Conversation if any, otherwise most recent nonarchived Conversation for that identity. Do not merge/reparent older historical Conversations/messages; they stay readable. New identities create one thread. Contact/connection must match validated identity. Archived thread never silently resurrected.

Ordering uses persisted processing sequence with provider occurred_at checks. Active session records opening occurred_at. An inbound whose occurred_at predates that opening gets unresolved_late membership and no new session/source mutation; its referral evidence remains in Connector touchpoint for future reconciliation. This explicit unresolved bucket does not count as a canonical session; no fabricated attribution. Late events do not automatically rewrite existing session/Lead. Future reconciliation requires a distinct contract. Equal timestamps follow durable arrival order. New event after close opens session; no historical membership backfill.

Outbound messages bind active session at intent creation (Human/AI paths), never at dispatch completion. If no active session (legacy thread), membership is unresolved_legacy. Sessions remain source immutable; fields are not writable through generic CRM metadata/import. Existing Chatflow qualification_session_id remains unchanged; session boundary cancels old orchestration, preventing its future Lead creation using a newer source.

## API and permissions

GET /conversations/:id/acquisition-sessions?limit=50&before_sequence=N: newest first, limit1..100, sequence cursor, data[] and next_before_sequence. Requires Conversation read and field read for contact_id/channel/channel_id/page_id/attribution; snapshot fields expose no transcript. Each row includes id, conversation_id, sequence, status, opening_reason, close_reason, opened_at/closed_at, opening_occurred_at, source snapshot, policy_version and version. Legacy without sessions returns empty, not fake organic sessions.

POST /leads adds optional conversation_session_id. Explicit session requires matching conversation_id, Contact and current tenant/Conversation/field ACL. Session may be closed; origin cannot be reparented. conversation_id-only compatibility resolves exactly one active session; if no session rows exist, use existing legacy Conversation source and null acquisition ref. If rows exist but none active, reject SESSION_SELECTION_REQUIRED; never silently choose last closed. Explicit unknown/cross-Conversation session returns NOT_FOUND. Manual Lead requires null/no session. New session origin stored as conversation_session_id on Lead and source_conversation_session_id in immutable shared Lead/Deal source fields. Deal from Lead copies the ref. Legacy sources never rewritten.

Existing transition endpoint closes current session and retains its durable key/version/ACL semantics. UI session picker shows source/status; create Lead sends selected session explicitly, close button is existing Conversation transition command with CAS. Existing timeline remains full thread; session list supplies boundaries. Detailed session-only timeline filtering is outside this scope; durable membership is persisted for subsequent reporting.

Events: acquisition_session.opened and acquisition_session.closed schema1, aggregate acquisition_session, payload contains session_id/conversation_id/status/source_classification/source_ad_id/sequence; no transcript. Atomic with message/close effect and audit. Existing message.received schema1 unchanged; downstream report consumes dedicated events/rebuild API. Source touchpoint is a logical Connector reference; no FK.

## Table template — conversation_acquisition_session

| Required item | Decision |
|---|---|
| Task/AC | SRC-053 / CRM-BASE-10 |
| Schema/physical/owner | target crm_chat; current agentic_crm baseline; Chat writer within conversation UoW |
| Meaning/type/scope | Durable acquisition episode/source snapshot, business tenant only |
| Columns | tenant_id/id/conversation_id CHAR36 ascii binary NOT NULL; sequence/version unsigned BIGINT≥1; status VARCHAR16 active/closed; opening_reason VARCHAR32 first_inbound/new_referral/after_close; close_reason nullable VARCHAR32 agent_closed/new_referral; opened_at/opening_occurred_at DATETIME6 NOT NULL; closed_at nullable; source_classification VARCHAR16 organic/paid/unknown; source_channel VARCHAR32 nullable; source_page_id/source_ad_id/source_campaign_id VARCHAR255 ascii nullable; source_connection_id/source_touchpoint_id CHAR36 nullable logical refs; policy_version VARCHAR32 NOT NULL explicit acquisition_v1 |
| Keys/constraints | PK tenant,id; unique tenant,conversation,sequence; unique tenant,id,conversation; generated active_conversation_key for active rows with unique tenant,key; FK tenant,conversation to Chat Conversation; active iff closed_at null |
| Remote refs | Contact via Conversation application port; Connector source refs validated at intake; no new cross-owner FKs |
| Query/index | Conversation sequence descending; source ad/date reporting via service API; active unique lookup |
| Rights | Conversation read/update and field denies; Sales independently validates Contact and Lead permissions |
| Concurrent writes | Existing identity lock for inbound; Conversation registry lock for transitions; active unique constraint; sequence allocated under lock; command/provider dedup |
| Audit/outbox | Source/session transition events and audit in same transaction |
| PII/retention | No transcript/token; retain session with conversation history, no cascading erase |
| Grants | Existing baseline runtime DML; migration role DDL; target separate Chat grants on extraction |
| Migration/compatibility | Forward26; no historical split/backfill; mixed old/new writers unsupported, quiesce API/worker before migration/restart |
| Rollback | Preserve new rows; forward fix or stop new writes; no historical migration edit/drop |
| Tests/evidence | Persistent synthetic two tenants, dedup/referral/close/reopen/legacy/ACL; PASS scoped source verification; see SRC-053 evidence |

## Table template — message_acquisition_membership

Same scope/owner/retention/grants/rollout as session table; one authoritative Chat membership per message. Columns tenant_id/message_id/conversation_id CHAR36 NOT NULL, session_id CHAR36 nullable, resolution VARCHAR32 assigned/unresolved_late/unresolved_legacy, created_at DATETIME6 NOT NULL. PK tenant,message_id; FK tenant,message_id to Chat message, tenant,session_id,conversation_id to session; CHECK assigned iff session_id nonnull. Conversation consistency with message validated by Chat write port (no new duplicate physical message index required). Index tenant,session_id,message_id for future session timeline. Append at message creation, no overwrite API. No source snapshot duplicated in membership; late evidence stays Connector-owned. Test cross-thread membership denial, same-message retry and outbound boundary fencing.

## Existing table additions

Sales-owned lead: nullable conversation_session_id and source_conversation_session_id CHAR36 logical Chat refs; deal: nullable source_conversation_session_id CHAR36. Baseline monolith, target crm_sales. No FK to Chat; Lead service validates through port, read/filter governed by field ACL and refs reserved against generic custom shadow. Index tenant,conversation_session_id on lead for authorized report/rebuild; no uniqueness (multiple needs per session). Immutable source ref on Deal uses same source pipeline. Existing rows null; no reinterpretation of qualification_session_id. Same source ACL/CAS/audit/grants/retention as existing organic contract; manual null preserved. Forward migration/no data reset. Tests lineage, spoof/edit, tenant mismatch and retries.

## Release gates

Migration/no-op preservation; same thread AdA/S1 and AdB/S2 Lead/Deal source; same-ad distinct events; duplicate/late/unresolved; organic explicit close/reopen; queued/AI old work fenced; manual/legacy path; all ACL; browser selection→Lead→Deal won; backend/web types/contracts/schema/unit/MySQL regression and restart. Local upgrades require existing backup/preservation runbook. Marketing/real Meta adapter, late-event reconciliation and full session conversion report remain subsequent scopes.
