# Conversation identity alignment

PLAN-036 / SRC-082 · CHG-20261016-05 · 2026-10-16. Status: Ready for the existing wire contract. This file describes implemented names: conversation_id identifies the persistent channel stream; session_id identifies the handling episode. CHG-20261030-02 introduced product names Conversation Channel and Conversation; CHG-20261030-03 clarifies that session mapping is provisional inventory, not a sufficient target model for needs spanning interactions/channels. See [product model and compatibility gate](conversation-channel-model.md). Need assessment, AI enrichment and current runtime semantics are unchanged.

Canonical routes are /api/v1/conversations and canonical relationship keys are conversation_id. New workflow configurations and references use conversation_id / trigger.conversation_id. Existing /threads routes remain deprecated compatibility aliases with their original response shape. Existing conversation_session_id in older APIs remains unchanged. Arbitrary custom JSON and provider payloads are never renamed.

CHG-20261030-02 supersedes the product labels from CHG-20261029-04: **Conversation Channel** is the persistent customer/channel communication; **Conversation** is the business intake. See the [canonical glossary](../product/glossary.md). Existing conversation_id must not be reinterpreted as the new business Conversation ID without a versioned migration contract; current session IDs remain the episode mapping. No runtime ID, route, receipt, boundary or owner authority is changed here.

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
