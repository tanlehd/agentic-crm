# Microservices extraction roadmap

PLAN-005 direction accepted; SRC-028 independent HTTP ingress prerequisite implemented/tested, no ownership cutover. No source task READY from this roadmap alone. SRC-001…027 DONE evidence remains monolith/mock; existing PLAN-004 provider/media design must conform ADR-017 before further source implementation.

## Sequenced gates

| Gate | Dependency | Deliverable / exit criteria | Readiness |
|---|---|---|---|
| PLAN-005 | SRC-027 | Catalog, authority boundaries, cross-service rules and roadmap | This doc-only task; status tracker |
| PLAN-006 | PLAN-005 | Exact first-slice RPC/event schemas; Identity delegation/revoke, Chat owner/dispatch fence; ingestion saga; local record decomposition; JetStream retention/HA/deadlines/DLQ; per-service schema/migration/grants and test plan | Design can start after005; extraction code not Ready |
| MS foundation source task (ID assigned after006) | PLAN-006 exact scopes Ready | Service workspace/build boundaries, contract CI, isolated DB/users, authenticated transport, broker outbox/inbox/receipts, tracing and fault harness | TODO, no empty service scaffold counted as features |
| Connector extraction | Foundation + ingestion contracts + binding auth | Independent Connector mock ingress/API/worker → compatibility Chat/CRM API adapter in monolith; lost ACK/dedup/backlog/tenant cases; no shared database access from new service | TODO; Facebook real adapter separate gate |
| Chat extraction | Connector + registry/owner/dispatch gate | Own Chat DB/ownership/intent, APIs read/send/takeover, refs to CRM/Identity, migrated message history, clients compatibility | TODO; hard gate anti-double-send/revocation |
| Media service + Facebook adapter | Chat binding + media/security + vendor exact contracts | Media authenticated resolver and actual vendor signature/parser/receipt/media, synthetic fixtures then eligible sandbox | TODO; provider gaps remain |
| AI Runtime / Routing extraction | Chat/Identity auth fences + provisioning/reservation contracts | Lifecycle/config/knowledge/test platform, isolated execution/tools, owner proposal CAS, hosted vs CRM-managed proofs | TODO; Meta G-04/05/08 block their subscopes only |
| CRM / Sales / automation extraction | Record ownership and saga receipts | Split metadata/catalog, share/handoff and qualification sagas, pinned old runs drain/recovery, Workflow/Chatflow own DB | TODO; may be staged per contract, not one big bang |
| Operations/Reporting; Ticket and other M4/M5 | Domain events + policy + domain Ready | Projection rebuild/ACL/freshness, domain-specific acceptance and independent operations | TODO/Draft |

An adapter exposing monolith application ports over authenticated API is a transitional boundary, not evidence the domain service is independently deployed. Identity may initially remain behind monolith API while preserving authority; no service may reach its SQL tables directly. Physical Identity extraction follows exact policy/session migration proof; no circular dependency on all services being extracted first.

## Per-service cutover checklist

1. Freeze boundary and owning tables/aggregates; document existing cross-module SQL/UoW/FK and replace with local authority plus explicit remote receipts. Exact versioned request/response/event fixture + negative auth tests before source.
2. Deploy new empty private schema/migration journal; record lineage to monolith1–18 and subsequent migrations. Copy snapshot preserving UUID/tenant/version, then replay owner outbox/CDC with watermarks; CDC requires explicit reviewed mechanism. Do not turn on two writers.
3. Shadow read/compare data, API contract/ACL and business invariants. Shadow workers cannot send/provider mutate/qualify. Diff/lag thresholds and rollback trigger explicit before cutover.
4. Fence writes per transferred tenant/resource scope; drain active requests/leases/intents, confirm snapshot watermark and pending saga ownership. Switch gateway/routes and single writer ownership; old write path must reject transferred resources. Record cutover epoch so stale workers/commands cannot write.
5. Keep compatibility events/APIs for pinned old runs. Observe duplicate/late receipt/revocation/routing cases. Remove old reads only after acceptance; schema contraction much later, never erase journal/history for a clean start.
6. Rollback before new writes can route back to old writer only under fence. After new writes, reverse replication/reconciliation proof required; otherwise forward fix/read-only recovery. Never switch traffic back and silently lose messages/ownership/consent.

## Required evidence and deployment readiness

Fresh install +18→new target upgrade, old history hash/IDs preserved, exact row/table ownership coverage, DB negative grants, no cross-service joins/imports, event compat, tenant isolation, race/duplicate/out-of-order, unknown provider send, owner/auth revoked, broker/downstream outages, retry/DLQ replay, restore/PITR, bounded backlog under load and old-run completion. New service source task includes build artifacts, container configs, runbook, owners, alert/SLO targets and tests actually run. No deployment/commit/push implied by PLAN-005 docs.

Current preview services continue unchanged. Before implementing pending media/Meta work, update PLAN-004 subscopes to these boundaries; no need user reapproval of the microservice direction already explicitly requested.


ADR-018 adds scoped PLAN-006A→SRC-028 before general broker foundation: independent durable HTTP ingress bridge to compatibility receiver. No transfer of Chat/CRM authority or preview cutover, no JetStream claim. Remaining PLAN-006 not completed by this slice.

ADR-019 changes target ownership before extraction: canonical contact_identity belongs to CRM, Connector only caches resolution/profile. [Contract](../contracts/contact-resolution.md). Ingestion gate must include provider enrichment/cache behavior, CRM resolve/validation receipts, required crm_contact_id on both directions, legacy mapping backfill and new schema version. PLAN-006B is responsibility design only; not full PLAN-006 DONE.
