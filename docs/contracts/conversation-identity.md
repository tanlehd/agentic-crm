# Conversation identity alignment

PLAN-036 / SRC-082 · CHG-20261016-05 · 2026-10-16. Status: Ready. User explicitly reverses the SRC-081 naming decision. Conversation is the persistent channel thread; session_id remains the handling episode. Need assessment, AI enrichment and recovery semantics are unchanged.

Canonical routes are /api/v1/conversations and canonical relationship keys are conversation_id. New workflow configurations and references use conversation_id / trigger.conversation_id. Existing /threads routes remain deprecated compatibility aliases with their original response shape. Existing conversation_session_id in older APIs remains unchanged. Arbitrary custom JSON and provider payloads are never renamed.

need.assessed and conversation.classification_changed newly emit schema_version 2 with conversation_id; existing v1 events are immutable. Workflow accepts need.assessed v1/thread_id and v2/conversation_id explicitly. Published graphs, run context, pending step input and action results remain stored unchanged; a narrowly scoped runtime adapter resolves either identity spelling. Reject ambiguous graph configs. New authoring emits canonical keys. Existing assessment idempotency route keys remain stable internally; old receipt data is adapted on response, not rewritten.

## Forward migration 34 (table-template review)

| Required item | Design |
|---|---|
| Task / acceptance | SRC-082; CI-01 canonical HTTP/UI/contracts, CI-02 old workflow/event/receipt compatibility, CI-03 retained data migration |
| Tables / target / writer | session_contribution, need_assessment, need_follow_up → crm_chat / Chat; sales_need_outcome → crm_sales / Sales |
| Physical / scope | Existing monolith pending extraction; business tenant_id NOT NULL from authenticated TenantContext, unchanged |
| Meaning / source | Existing contribution ledger, need effective state, recovery receipt and Sales outcome ledger; no new entities |
| Columns | Rename thread_id to conversation_id, same CHAR(36) ASCII binary NOT NULL values; all other columns unchanged |
| Keys / references | Existing tenant keys/FKs/indexes preserved; logical Conversation references retain same IDs; no new remote FK/SQL |
| Queries / indexes | Existing exact tenant/need/session reads; existing contribution tenant/thread/session index follows renamed column; cardinality unchanged |
| Rights / grants | Existing application/field ACL and DML grants unchanged; migration role alone executes DDL |
| Concurrency / audit | Existing CAS, locks, idempotency and outbox retained; immutable JSON is not transformed |
| PII / retention | No new data or transcript; existing retention and backup policy |
| Migration | Stop local API/worker writers, backup, normalize only the renamed top-level column for full-row preservation hashes, apply forward34, repeat no-op, start new binaries; never edit applied31/33 |
| Compatibility / rollback | Coordinated local cutover, no rolling old/new binaries; old binary cannot run on34. Failure leaves writers stopped for operator inspection/forward repair; no destructive reset |
| Fixtures / evidence | Retained Alpha/Beta in native_seed_test and local agentic_crm; unit/native/browser/build/static evidence in SRC-082, initially NOT_RUN |

This supersedes current naming statements in the need follow-up contract. Historical task evidence and provider-specific thread_id are retained as history/external contracts.
