# Channels ingress touchpoint ledger

Filled [table template](../templates/database-table.md), CHG-20261021-02, SRC-109/T05 CO-01. [Saga](../contracts/chat-referral-saga.md), [catalog](schema-catalog.md), [guideline](database-guidelines.md).

| Item | Decision |
|---|---|
| Table / target / physical | channel_ingress_touchpoint in crm_connector; isolated retained native_identity_test candidate alongside Channels reference ledger. Main/legacy unchanged |
| Writer / aggregate | Native Channels only, local prepare/finalize transaction |
| Meaning / type | Immutable command-scoped evidence and durable receipt; only bound rows are observations; other states recovery/audit |
| Scope | Business workload tenant; reject system/zero; tenant_id CHAR(36) ASCII binary NOT NULL no default |
| Columns | id,command_id,receipt_id,connection_id,contact_id,identity_id CHAR(36) NOT NULL; binding_digest,provider_message_digest CHAR(64) ASCII NOT NULL; evidence JSON OBJECT NOT NULL exact pin plus Page; state VARCHAR(16) prepared/bound/discarded/cancelled NOT NULL; conversation_id,message_id,session_id nullable CHAR(36); terminal_digest nullable CHAR(64); version BIGINT UNSIGNED NOT NULL default1; created_at/updated_at UTC DATETIME(6) NOT NULL |
| Keys / constraints | PK tenant,id; UNIQUE tenant,command; index tenant,connection,state,id; index tenant,conversation,id. Positive version/state CHECK; digest iff terminal; bound requires Message/Conversation, other states no effect IDs. No remote FK |
| Remote refs | Native Chat proof/result and current native Identity admission before prepare; own held connection/current actor locks; outage fails closed |
| Query / indexes | tenant+id/command equality; recovery state/id keyset max100; bound history tenant+conversation+id; native EXPLAIN required |
| Rights | Chat workload, current integration.deliver/all admission; no public endpoint |
| Concurrency | Unique command/candidate, row locks; terminal insert fences delayed prepare; terminal immutable, no timeout cancellation |
| Audit / outbox | Immutable evidence/terminal digest row is saga audit/receipt; Chat Message/session audit/outbox atomic. No standalone Channels publisher in candidate |
| PII / retention | No body/subject/token; opaque refs protected; retain all states/history; no delete endpoint |
| Grants | Separate Channels runtime SELECT,INSERT,UPDATE only; operator DDL, no runtime DELETE/DDL/foreign SQL |
| Migration | Immutable additive channels001-touchpoint.sql/SHA256; explicit retained test provision, SHOW CREATE pin on reuse; no baseline043/Chat004/main edit/reset |
| Compatibility / rollback | Optional binding/proof, two private operations; disable caller/recover commands, retain ledger, no destructive rollback |
| Fixtures | Retained two tenants/own credentials, per-run provider IDs, preserve old rows, scope/ACK/dedup/rollback negatives |
| Evidence | NOT_RUN at design; actual SRC-109 and artifacts/chat-extraction/t05/referral-* |
