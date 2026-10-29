# Microservices extraction roadmap

Current2026-10-22: use [fresh service progress](../tracking/service-progress.md). Catalog14 under ADR-027; Reporting/Connector have local delivery evidence, D1 5/5 and D2 6/6 historically accepted, D3 2/6 with T05 IN_PROGRESS; D4 not scoped. D2 worker currently fails startup (image manifest42/database journal43), tracked OPS-20261022-01. Older dated “next” notes below are history, not execution instructions. Chatflow retirement is complete; no legacy adapter/drain prerequisite remains.

ADR-027 /2026-10-21: current target has one Workflow service/schema crm_workflow for all business flows. Chatflow service/module and separate Workflow API/Core service targets are removed. Legacy modules/runs/graphs are migrated/drained according to [Workflow plan](workflow-platform.md), not independently extracted. Historical catalog/deployment counts below do not assert new runtime progress.


Current D3 execution: [PLAN-057 nine-thread plan](chat-extraction-execution.md) scopes remaining SRC-109 through own DB/boundaries/runtime/parity/local cutover. D1/D2 already DONE; T01/T02 design DONE, D3-01 1/6; next user-selected T03 owning database, then sequential dependencies. This plan does not restart D2 or create nine separate extraction tasks; no increase beyond2/17 until Chat cutover is verified.

SRC-107/PLAN-056 D1 completed5/5: native local Connector ingress active, retained recovery/rollback, own image/schema5. [Evidence](../tracking/details/SRC-107.md); local2/17, packaged2/17. Next D2 Human outbound composition needs exact trust/bootstrap/owning HTTP scope, then D3 physical Chat; no new helper-task chain or premature Draft extraction.

**Kế hoạch thực thi hiện hành 2026-10-18:** [PLAN-056 delivery reset](service-delivery-reset.md) ưu tiên khép Connector ingress local trước outbound/Chat extraction.17catalog boundaries không phải17deployments bắt buộc ngay. Các migration/ownership/security gates bên dưới vẫn giữ; inner-loop test chọn theo [policy](../development/testing-policy.md).

PLAN-006H/SRC-095 [registry/control kit](../development/chat-control.md) completes the scoped read/reference/cancellation/recovery machine boundary. Next PLAN-007C designs isolated dispatch/exchange/control ledgers for native adapters, without moving real legacy records. Parent PLAN-006/007B still gate full public mutation/routing/Sales/Workflow feature parity, registry/history migration and traffic cutover. This scope split is CHG-20261018-10, not a claim that all Chat extraction contracts are complete.

PLAN-006G/SRC-094: [exchange kit](../development/chat-exchange.md) now covers payload staging, normalized ingress, cancel proof/read and receipt replay as schemas/reference scenarios. PLAN-006H remains for exact local registry/current-reference ports, AI/Chatflow cancellation and broker/recovery compatibility, then PLAN-007B physical manifests/grants/reconciliation. These contracts do not deploy remote adapters or change current traffic.

PLAN-006F/SRC-093: [dispatch v1 contract kit](../development/dispatch-contract.md) completes scoped schema/reference-model preparation. Independent authority admission and lost-ACK/unknown semantics are explicit. Remaining PLAN-006 inbound/cancel/payload/read/broker compatibility and PLAN-007B durable ledgers/table manifests precede remote adapter source and full Chat cutover; no deployed grant server implied.

2026-10-18 PLAN-006E/SRC-092: [Chat extraction map and dependency guard](../architecture/chat-extraction.md) completes the scoped source-boundary review; [contract](../contracts/chat-extraction-boundary.md) distinguishes authority semantics from unimplemented remote protocols. PLAN-006F exact native delegation/dispatch grant/consume/revoke is the next gate. Full PLAN-006/007B remain incomplete; no physical Chat source/cutover promoted by the guard.

ADR-023/PLAN-055 supersedes broad simultaneous physical extraction framing: common CRM metadata/Identity policy + staged deployment groups. Reporting→Connector/Chat→Workflow/AI priority; Marketing is separate backlog. [RO-01…06](../contracts/phased-service-rollout.md) scopes SRC-091 operational rollout, not full PLAN-006/007B completion. Platform CRM/Sales remains grouped until transaction/registry/saga proof; no cross-service SQL exception.

**2026-10-18 audit / PLAN-054:** [current and target diagrams](../system/deployment-topology.md) supersede old runtime snapshots below. Connector independent ingress source/package is DONE but main traffic remains monolith. Reporting own HTTP/schema is implemented; SRC-090 adds independent container packaging and acceptance. Marketing has own storage but no daemon; Workflow Core is a library. This closes neither PLAN-006 nor PLAN-007B. Packaging-first order and exact gates are in the audit; [runbook](../development/reporting-container.md).

PLAN-005 direction accepted; SRC-028 independent HTTP ingress prerequisite implemented/tested, no ownership cutover. No source task READY from this roadmap alone. SRC-001…027 DONE evidence remains monolith/mock; existing PLAN-004 provider/media design must conform ADR-017 before further source implementation.

## Sequenced gates

| Gate | Dependency | Deliverable / exit criteria | Readiness |
|---|---|---|---|
| PLAN-005 | SRC-027 | Catalog, authority boundaries, cross-service rules and roadmap | This doc-only task; status tracker |
| PLAN-006 | PLAN-005 | Exact first-slice RPC/event schemas; Identity delegation/revoke, Chat owner/dispatch fence; ingestion saga; local record decomposition; broker retention/HA/deadlines/DLQ (Workflow Kafka scoped to PLAN-024B); per-service schema/migration/grants and test plan | Design can start after005; extraction code not Ready |
| MS foundation source task (ID assigned after006) | PLAN-006 exact scopes Ready | Service workspace/build boundaries, contract CI, isolated DB/users, authenticated transport, broker outbox/inbox/receipts, tracing and fault harness | TODO, no empty service scaffold counted as features |
| Connector extraction | Foundation + ingestion contracts + binding auth | Independent Connector mock ingress/API/worker → compatibility Chat/CRM API adapter in monolith; lost ACK/dedup/backlog/tenant cases; no shared database access from new service | TODO; Facebook real adapter separate gate |
| Chat extraction | Connector + registry/owner/dispatch gate | Own Chat DB/ownership/intent, APIs read/send/takeover, refs to CRM/Identity, migrated message history, clients compatibility | TODO; hard gate anti-double-send/revocation |
| Media service + Facebook adapter | Chat binding + media/security + vendor exact contracts | Media authenticated resolver and actual vendor signature/parser/receipt/media, synthetic fixtures then eligible sandbox | TODO; provider gaps remain |
| AI Runtime / Routing extraction | Chat/Identity auth fences + provisioning/reservation contracts | Lifecycle/config/knowledge/test platform, isolated execution/tools, owner proposal CAS, hosted vs CRM-managed proofs | TODO; Meta G-04/05/08 block their subscopes only |
| CRM / Sales / automation extraction | Record ownership and saga receipts | Split metadata/catalog, share/handoff and qualification sagas, pinned old runs drain/recovery, Workflow own DB | TODO; may be staged per contract, not one big bang |
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

## ADR-021 schema naming và native Identity

[Schema catalog](../data/schema-catalog.md) là chuẩn tên/phạm vi database cho extraction; [table inventory](../data/table-placement-inventory.md) chỉ rõ bảng cần partition. Mọi application table có tenant_id NOT NULL, system scope explicit. [Native Identity plan](native-identity-data-plan.md) bỏ Keycloak khỏi target, cho phép native auth additive trong monolith trước Identity extraction. Không rename/move physical tables khi cross-module transactions chưa được thay bằng scoped API/saga.
