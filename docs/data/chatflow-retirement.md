# Chatflow retirement — CHG-20261021-08

Implemented and verified, Codex 2026-10-21. [Execution evidence](../development/chatflow-retirement.md). User explicitly requested removal of legacy Chatflow code and data after ADR-027. This supersedes the adapter/drain prerequisite in the earlier compatibility plan. Work is a cleanup sub-scope of active SRC-109/T05; no parallel task or T06 activation.

Remove the standalone module, routes, worker, authoring options, qualification panel and generated API. Workflow keeps its existing supported routing, timer, condition, need and Lead handoff actions. Reject retired graph primitives; do not invent replacement conversational execution or report parity. Manual Lead qualification and Chat remain available.

## Removal design (database table template)

| Required item | Decision |
|---|---|
| Requirement / acceptance | User-requested retirement; no live Chatflow runtime/table; unaffected business rows preserved; Workflow rejects retired nodes; build/contracts/regressions pass |
| Tables / schema / current physical | Five legacy `chatflow_*` tables in baseline `agentic_crm`; retained native test schema used for rehearsal. No new schema/table. Frozen extraction snapshots are historical evidence, not live runtime |
| Owner / aggregate / scope | Retired automation owner; business tenant rows. Migration operator acts on the selected local schema only |
| Meaning / data type | Delete legacy definitions, versions, sessions, node runs and turns. Preserve Contact, Lead, Deal, Conversation, Message, users and unrelated Workflow records |
| Columns / keys / constraints | Detach Lead qualification reference and outbound session reference before dropping tables; remove cycle FK; do not disable FK checks. Existing tenant constraints on retained data remain |
| Remote references | No cross-service SQL; separate Chat-owned cleanup applies only to its local projection/delivery metadata |
| Query / indexes | Offline bounded maintenance per local schema; inventory counts/FKs before mutation. No runtime query/index added; EXPLAIN not applicable to DDL |
| Permissions / grants | Migration operator only. Retire Chatflow workload authorization; no new service principal |
| Concurrency / idempotency | Stop affected local writers before migration; journal and checksums retained. DDL failure requires explicit forward repair, no blind retry |
| Workflow effects | Disable definitions with retired nodes and cancel their active runs/steps/waits with explicit retirement reason. Preserve immutable graph/action history; never rewrite old graphs into new semantics |
| Audit / outbox / PII | Preserve business/audit evidence and delivery result receipts; remove obsolete Chatflow projections/notifications. Pending legacy automation deliveries must not retry forever |
| Retention / rollback | Authorized irreversible Chatflow data deletion. Old Chatflow binary cannot run against new schema; use forward fix. No automatic restore/replay of prompts |
| Migration | Forward migration after 42; historical migrations unchanged. No reset, volume deletion or tenant purge |
| Fixtures | Reuse retained native test DB; verify tenant-scoped unaffected business data and retry behavior |
| Evidence | `artifacts/chatflow-retirement`; main43/native43/Chat4 applied; business hashes preserved; 53 native cases, 7 migration groups/repeat, 462 unit and 62 script cases PASS |

## Compatibility

Old `/chatflows` and `/chatflow-sessions` routes are removed (404). New authoring exposes only supported Workflow nodes; `start_chatflow` and `chatflow.completed` graphs fail validation. Existing completed business effects remain. Historical migration files and old evidence may mention Chatflow; they are not an active service contract.
