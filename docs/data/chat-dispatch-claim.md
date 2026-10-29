# Native Chat dispatch claim — PLAN-007C6

2026-10-18 / CHG-20261018-16. Ready scoped SRC-101. [Dispatch v1](../contracts/chat-dispatch-v1.md), [Identity ledger](identity-dispatch-ledger.md), [database guideline](database-guidelines.md), [Chat extraction](../contracts/chat-extraction-boundary.md). This gate implements the current Chat owner's claim transaction in the baseline monolith; not the full registry/control migration or Chat extraction.

## Native authority and single writer

Validate trusted Connector peer/tenant, strict ChatClaim DTO, then inspect the issued Identity grant and current mock connection using required owner ports outside SQL (2s timeout each). Identity reply is schema/correlation/grant checked; grant read itself binds request to Identity's immutable binding. Existing claim replay returns only its immutable receipt, after current workload admission, without requiring owner or issue TTL to still be current. It cannot authorize a second invocation.

Within READ COMMITTED lock tenant SHARE → Conversation's current crm_record partition SHARE → outbound_intent UPDATE, then reread any committed claim. SHARE blocks all registry writers and legacy exclusive dequeue, while the intent UPDATE serializes claim requests without granting Chat permission to mutate the shared CRM registry. No SQL to Identity session/role or Connector tables. Compare current nonarchived/open-or-pending Chat record owner/version/team/share set, contact and connection with the binding and Identity resource snapshot. Compare queued intent actor/kind/owner_revision/conversation, message queued/text/connection and SHA256 of canonical `{version:1,platform:mock_messenger,message:{type:text,text}}`. A mismatch fails with no change. AI remains gated until native Identity delegation exists.

On the first winning claim, create one immutable claim and request receipt; atomically change the existing intent/message queued→sending with dispatch_token=claim_id and sending_at, plus local audit. `sending` means admitted/in-flight, not confirmed provider I/O. Existing legacy dispatcher skips nonqueued intents, so only one path wins. Existing timeout may move sending→unknown after60s but never resends it. Late owner change/close cancels only queued work; an existing claim stays in flight. No main writer switched; new adapter is unregistered until authenticated result/transport gates. Only mock text scope. No result/ingress/control counter or full feature parity claim.

Private read validates current peer allowlist (Identity/Connector) and exact binding/claim ID, returns the stored stable claim and resource snapshot through a local application port. It does not join live owner state or return content/session/credentials. Transport must supply authenticated current workload+business tenant context; the repository's peer string is not authentication. No HTTP endpoint in this task.

## Filled table templates

Both tables owner Chat, target crm_chat, physical baseline agentic_crm; tests native_identity_test. Existing Conversation registry partition and intents remain in the same baseline transaction; separate DB needs full migration gate. Scope business tenant_id CHAR36 ascii_bin NOT NULL with CHECK excluding system tenant. IDs CHAR36 ascii_bin, digest CHAR64 ascii_bin, timestamps DATETIME6 UTC. No remote/cross-owner FK. Migration39 additive, prior1…38 immutable. Baseline crm_record/record_team_access reads refer only to Chat-owned rows, not another service database.

| Required item | chat_dispatch_claim | chat_claim_request |
|---|---|---|
| Task / acceptance | SRC-101 CCL-01…07 | SRC-101 CCL-01…07 |
| Meaning / type | Immutable first owner admission; also transition evidence | Immutable successful request digest |
| Columns | tenant_id,intent_id,attempt_id,claim_id,grant_id,conversation_id,binding_json/resource_json JSON objects,created_at; all NOT NULL/no defaults | tenant_id,request_id,intent_id,request_digest,created_at; all NOT NULL/no defaults |
| Keys / constraints | PK tenant+intent; UNIQUE tenant+attempt,tenant+claim; same-tenant FK intent+conversation to outbound_intent; JSON object CHECK | PK tenant+request; FK tenant+intent to claim |
| Remote refs | Identity grant and Connector attempt are logical only; validated owner ports before SQL | Request IDs from trusted Connector context |
| Queries / index | Exact tenant+intent/claim; immutable proof read | Exact PK; point EXPLAIN |
| Permissions | Current workload/tenant admission plus native Chat owner CAS and Identity grant | Same gate as claim; current peer on replay |
| Writes / concurrency | Shared existing registry lock and queued intent CAS, one attempt forever | Duplicate digest mismatch409; same request never reclaims |
| Audit / outbox | Claim+intent/message+local audit atomic; no new broker event or publisher in this slice | Same local transaction |
| PII / retention | IDs/minimized resource snapshot only; no text; retain intent lifetime and restore horizon, no purge | Digests only, retain with claim |
| DB grants | SELECT,INSERT; no UPDATE/DELETE/DDL | SELECT,INSERT |
| Migration | Forward39 create, no backfill/moving current rows | Same |
| Compatibility / rollback | Old dispatcher sees sending/unknown and cannot dequeue claimed work; do not reset queued or drop claims; disable adapter/forward repair | Historical tombstone retained |
| Fixtures / evidence | Retained synthetic native Chat aggregate; real owner/version/state rows, injected owner lookup adapters; native tests NOT_RUN until source | Duplicate/race/rollback/foreign tenant/SQL grant tests |

The narrow test Chat role may SELECT tenant/crm_record/record_team_access/conversation/intent/message, UPDATE only intent/message, INSERT audit_entry and SELECT/INSERT new ledgers. Registry locking uses SELECT FOR SHARE, never permission to mutate CRM-wide records. Initial native verification found FOR UPDATE requires additional MySQL privileges; reviewed the SHARE→intent UPDATE order before changing code instead of granting registry mutation. Runtime provisioning makes new claim tables append-only. Migration operator is separate. Native tests use synthetic shared monolith rows and do not assert independent database isolation yet.

## CCL-01…07

1. Populated38→39 and no-op preserve rows/journal; two new tables tenant constrained; ordinary runtime grants append-only.
2. Current owner/version/contact/connection/queued intent/message/payload checks; valid native claim atomically marks sending and returns stable proof.
3. Concurrent claims and legacy dequeue compete for queued state, one winner; takeover/close before denies, after claim preserves stable receipt; no retry/rearm.
4. Binding/request conflict, foreign tenant/peer, invalid/expired grant, owner-port timeout deny with no state change; replay after TTL stays historical only.
5. Lost commit ACK/new instance read; audit failure rolls back claim/request/message/intent; narrow grants and EXPLAIN.
6. Native Identity grant→Chat claim→Identity consume round trip using real owning repositories and injected local transport; no fake Chat claim proof in this round trip. No provider or mTLS evidence.
7. Build/native/unit/static boundary review and docs/evidence/progress; packages2/17, active local1/17 unchanged until cutover.

Dependency inventory review: new Chat file may import only contracts/Ajv/node crypto plus kernel UoW/reliability/system-scope. No new direct imports of Identity/CRM/Channels domain implementations. Record the exact additions before explicitly updating baseline. Existing transitive monolith dependencies remain visible and are not authorized in a future services/chat package.
