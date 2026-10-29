# D3 physical Chat extraction delivery — SRC-109

**Current scope CHG-20261023-19 / ADR-029:** [Service-owned acceptance](../governance/service-delivery-scope.md) and [consumer handoff](../planning/chat-extraction/consumer-handoff.md) narrow D3-03/05 to Chat APIs/producer/local consumers and required compatibility. Downstream business implementation is not a Chat gate. All six gates retain actual evidence, single writer, security and recovery requirements. D3-03 implementation evidence is now accepted at [T06](../quality/t06-chat-boundary-acceptance.md); D3-04 runtime is accepted at [T07](../quality/t07-chat-runtime-acceptance.md); current D3 is6/6 after [T09 main acceptance](../tracking/details/SRC-109.md#t09-legacy-retirement-and-main-cutover--2026-10-27).

**Delivery scope CHG-20261019-23:** [Human-first acceptance](../planning/human-first-omni-crm.md) scopes D3-03/05 to Human-required capabilities and shared safety. AI Runtime capacity/execution/composition is deferred, not required for base Human DONE. All six gates and retained-state/cutover invariants remain; wire contracts/schema are unchanged.

T01 contract portion completed in design2026-10-18: [owner v1](chat-owner-v1.md), [capability/consumer matrix](../architecture/chat-owner-consumers.md) and machine schemas. T02 [exact physical design](../architecture/chat-data-migration.md) completes templates/four-ledger partitions/backfill/rollback. D3-01 is satisfied in design; T03 native owning storage now completes D3-02. D3-03/04, T08 composed parity and T09 main cutover are accepted; D3 Human-first6/6.

2026-10-18 / CHG-20261018-27 C2. Dependency SRC-108 DONE; D1/D2 keep serving. One delivery task, not a chain of helper completions. Target remains ADR-017/021/023 and [Chat extraction boundary](chat-extraction-boundary.md). The initial D2 endpoints/worker were baseline processes; T09 now serves main through independent Chat API/worker and crm_chat.

## Ready scope now

Read-only source/schema audit and exact design: reconcile current283import entries, actual agentic_crm42 tables/FKs/indexes, ownership dictionary and every implemented Chat capability. Capture only metadata, no user data or secret values. Static SQL string references are candidate dependencies, not a complete ownership manifest; dynamic SQL/transitive application ports require manual review. No table copy, grant, migration, traffic switch or domain rewrite until its exact data/API/compatibility design is Ready and recorded in this task.

Chat parity covers message ingress/history/outbound, owner/team/ACL, Contact refs, acquisition/session/classification/needs/progress, workspace/inbox/read/snooze/tags/snippets/activity, Chat-owned facts/events/commands for Routing/Workflow/Reporting and Chat local consumers. Downstream orchestration/projections/reports are accepted by their owners; retain necessary compatibility for existing Chat commands. A send-only Chat container cannot close D3. Keep UI and public/API identifiers stable; no second owner or wildcard tenant. Partition generic registry/ownership/share rows by owning domain, replace remote reads through owner APIs/versioned projections; no cross-service SQL/FK/UoW.

## Acceptance gates

| Gate | Required evidence |
|---|---|
| D3-01 exact scope | Complete table/column/owner and incoming/outgoing FK manifest; capability/consumer matrix, immutable migration/reconciliation and rollback design; exact owner API/event/saga schemas, filled table templates. Static scan alone cannot pass |
| D3-02 owning database | Versioned Chat schema/grants and resumable retained backfill; counts/hashes/logical refs/tenant negatives; no remote FK or second writer |
| D3-03 owner boundaries | Chat APIs/producer/local consumers implemented with loss/replay/revoke semantics; compatible Identity/CRM/Connector/Routing/Sales endpoints required by existing Chat commands; exact old Chat writer removal/fence inventory. No Chat remote SQL/shared UoW; other-owner business features are separate |
| D3-04 independent runtime | Chat API/worker image starts without importing other domain implementations or remote SQL; explicit config/readiness/metrics and durable recovery |
| D3-05 composed parity | Chat-owned Human capabilities and required compatibility verified through actual runtime; durable producer boundary and Chat inbox/scanner recovery verified. Other-owner business E2E is separate, not a prerequisite; scoped regression and final Chat composition acceptance |
| D3-06 local cutover | Single-writer switch, reconciliation, main app traffic, restart/rollback/reapply and operator evidence; only then count Chat as package/local3/14 |

Current4/6: D3-01 design, D3-02 owning database, D3-03 owner boundaries and D3-04 independent runtime accepted. [T07 evidence](../quality/t07-chat-runtime-acceptance.md). T08 IN_PROGRESS; D3-05/06 pending; local2/14. No production/provider activation, data reset or parallel agents.

Read-only first pass completed: [working data manifest](../architecture/chat-data-extraction.md),42Chat files/45direct tables/22dynamic locations/195FK column entries against main42. These counts are audit evidence only; transitive ports and exact replacement schemas still required before D3-01 passes.

Continuation SRC-109: [machine ownership review](../architecture/chat-storage-review.json) covers127tables/1126columns, all22dynamic locations and75relevant actual FK constraints with row-sensitive overrides. [Capability/consumer matrix](../architecture/chat-consumer-matrix.md) maps16groups,19port boundaries and the complete current assignment/takeover transaction. T01/T02 now resolve four reliability partitions, owner protocols, target templates and backfill/recovery design; D3-01…04 are complete; D3-05/06 remain pending. This is source/data design evidence, not a newly extracted service.
