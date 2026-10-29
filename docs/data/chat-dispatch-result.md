# Chat native result application — PLAN-007C8

2026-10-18 / CHG-20261018-18. Ready SRC-103 after SRC-102. [Dispatch](../contracts/chat-dispatch-v1.md), [claim](chat-dispatch-claim.md), [integration acceptance](../quality/native-dispatch-integration.md), [database rules](database-guidelines.md).

Scope: apply Connector's durable sent/unknown evidence to a previously claimed Chat intent/message. Inspect Connector's owning receipt outside SQL with2s timeout, validate strict schema, request correlation and receipt_id=attempt_id. This proof is an injected owner port until authenticated transport exists; no body/header impersonation. Only trusted Connector peer/current business tenant. Current original Human permissions/owner need not remain active to accept cleanup of admitted work.

Lock tenant SHARE→Chat registry partition SHARE→intent UPDATE. Exact immutable claim binding and dispatch_token=claim_id must agree. Accept sending→unknown/sent or unknown→sent; sent cannot downgrade/change provider ID. Sender retry/rearm is never performed. A replay/new request that reports the same state adds at most its request tombstone, never another audit/event. An unknown notice arriving after Chat sent returns sent if current Connector proof is unknown or sent with the same provider ID; no downgrade. Unclaimed/queued/cancelled/failed intents reject. Late positive evidence after takeover/close/archive can update the original message; no new owner/session/dispatch.

State, message, result request, local audit, existing message.sent/message.delivery_failed outbox event and sent coverage update commit together. Causal reply coverage uses existing prepared conversation_workspace/message_workspace; it does not infer answered messages from timestamps or current owners. Add an own-Chat prepared-coverage entrypoint that fails closed if required rows/schema are missing; the existing legacy workspaceSent retains its backfill behavior. No CRM Activity backfill or remote metadata SQL in result handling. Existing in-flight events remain versioned1 and current registry aggregate version, like legacy dispatcher. Broker delivery/automatic result retry loop is not implemented here.

## Filled database table template

| Item | chat_result_request |
|---|---|
| Task / requirement / acceptance | SRC-103 CRR-01…07, dispatch v1 terminal result/replay |
| Owner / target / current | Chat; crm_chat target; agentic_crm baseline, native_identity_test retained tests |
| Meaning / type | Immutable successful Connector result-request digest; lifecycle authority remains outbound_intent/message |
| Scope | Business tenant_id CHAR36 ascii_bin NOT NULL, explicit system-tenant exclusion CHECK; no default |
| Columns | request_id,intent_id CHAR36 ascii_bin NOT NULL; request_digest CHAR64 ascii_bin NOT NULL; created_at DATETIME6 UTC NOT NULL; no defaults |
| Keys / constraints | PK tenant+request_id; FK tenant+intent to chat_dispatch_claim, no remote FK |
| Remote references | Connector receipt checked at owner using exact bound read before SQL; outage rejects without effect |
| Query / indexes | Exact tenant+request point lookup; no scan/pagination; EXPLAIN proof |
| Rights | Current authenticated Connector workload/tenant context, no former-sender impersonation |
| Concurrency | Native registry/intent locks; body digest conflict409; state/request/event atomic; no retry of external effect |
| Audit/outbox | Existing audit_entry/outbox_event append with state change; duplicate does not duplicate events |
| PII/retention | Digest/IDs only, no text/credentials; retain intent lifetime+restore horizon; no local purge |
| DB grants | SELECT,INSERT; no UPDATE/DELETE/DDL. Chat role also reads schema/prepared workspace and UPDATE conversation_workspace, INSERT outbox/audit, existing intent/message rights |
| Migration | Additive40; no old row/backfill/checksum change, no main DB upgrade |
| Compatibility/rollback | Existing binaries ignore table; do not remove replay tombstone or reset intent; disable adapter/forward fix |
| Test fixtures/evidence | Reuse native-dispatch synthetic fixtures, prepared coverage; preserve rows; CRR tests NOT_RUN until source |

## CRR-01…07

1. Actual populated39→40 and no-op preserve every existing row/journal; append-only/runtime scope checks.
2. Native three-owner success applies sent to Chat and emits one audit/message.sent event; prepared coverage exact, unread inbound after reply cutoff remains unanswered.
3. unknown→sent late evidence and sent monotonicity after takeover/close/archive, duplicates/concurrent requests one terminal effect.
4. Request/body/provider/claim/binding/foreign tenant/peer/proof mismatch denies; outage/timeout/missing workspace no partial commit.
5. Lost result ACK/new instance replay; event insertion failure rolls state/message/request/audit/coverage back; no automatic send.
6. Full native three-authority regression and unit/build/dependency/static/grants checks. New Chat imports limited to contracts/crypto/Ajv/kernel plus own workspace module; explicit boundary review.
7. Evidence/tracker/progress: packages2/17, active local1/17. Remote transport/result delivery worker/AI/physical extraction remain gated.
