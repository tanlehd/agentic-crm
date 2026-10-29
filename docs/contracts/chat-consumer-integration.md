# Chat consumer integration

SRC-109/T06, CHG-20261023-12, Codex2026-10-23, Ready technical refinement within [T06](../planning/chat-extraction/06-consumers.md). Dependency [T05 acceptance](../quality/t05-human-acceptance.md) complete. One active implementation task; D3-03 remains unachieved until Chat-owned Human/shared-safety boundaries and required compatibility pass under [ADR-029](../governance/service-delivery-scope.md); downstream business integration has its own owner.

## CRM metadata writer barrier

CRM owns property definitions and schema revisions. Chat reserves immutable metadata through NativeCrmOwnerMetadata. Existing CrmRecords property create/label-update changes schema_version without checking that reservation; it must use the same gate when composing the extracted runtime. Supported Conversation-session/need metadata behavior and existing unsupported generic Conversation property creation remain unchanged.

Before closing a gate, the writer performs current native schema authority and record-route validation in its own CRM transaction. A committed same-key receipt replays under current field policy without reopening or redraining anything. A stable barrier UUID binds tenant, principal, route, key, body and expected version. Gate creation may initialize an absent gate from actual CRM metadata; it never fabricates a definition or revision.

Drain runs outside SQL: close gate, request terminal Chat proof for held reservations, release only proven terminal holds. Outage leaves the gate closing, with the same stable barrier available on retry. A bounded drain may return pending; the mutation cannot proceed until no held reservations remain. No HTTP call runs inside the metadata mutation transaction.

The final CRM transaction reauthorizes normally and checks receipt/CAS. It locks the gate, checks the exact barrier and zero holds, applies the existing property writer, increments the schema revision, and reopens at that exact revision in the same commit as the public receipt/audit. A failed local mutation can cancel its own closing barrier; it cannot reopen another barrier or release an unknown Chat effect. A lost commit ACK resolves through the original receipt.

Concurrent same-key drain can observe its gate already reopened by the winning writer. The internal result is then `reopened`, not `drained`; the final transaction may only replay an existing matching receipt and must reject an absent receipt. Holds admitted after reopening do not block that immutable replay. A newly closing same-key drain that encounters a committed receipt reopens atomically with replay and does not increment schema again.

The adapter is explicitly injected into candidate composition. Baseline operation remains until the single-writer switch; T07 must mount the adapter, and T09 must fence every old unfenced path. This sub-scope alone does not prove that main metadata writers are switched. No DDL, historical migration edit, cross-service SQL or new business capability is introduced.

Source audit also found ObjectPlatform.save increments schema_version for standard-object workspace presentation settings. It must use the same barrier/receipt transaction even though standard labels/enablement are protected. The M1 property seed writes only its two custom objects; startup/bootstrap writers still belong to the complete T06/T09 inventory. Neither presentation writes nor seeding may serve as an unfenced back door for the three Chat metadata objects.

Acceptance: native existing CRM public writer with native Identity actor and real Chat recovery HTTP; held classification/need metadata drain, abort-vs-commit ordering, new/rename revision, current schema/field denial, same-key/conflicting-body/CAS, outage/retry, rollback and exact receipt replay. Existing metadata/read/custom-value contracts remain compatible.

## Remaining T06 gates

CHG-20261023-19 supersedes the blanket integration gate. Classify the22pending operations in `artifacts/chat-extraction/continuation-20261022/t05-handler-review.json` using the [owner split and backlog](../planning/chat-extraction/consumer-handoff.md). Complete Chat-owned domain endpoints/events, durable relay/replay/inbox/local scanners, required public-command compatibility and exact old Chat writer inventory. Routing work/views/reroute, Workflow need/follow-up orchestration, Sales context/merge, Reporting source extraction/adapters/projections/snapshots/facts/registry/composite/drilldown and generic CRM/private-app features belong to their owners; they are not prerequisites for D3-03. Shared retained execution safety remains required; AI execution is deferred and retired Chatflow stays removed. Refine only the concrete Chat boundary before dependent code, without claiming D3-03 from a single adapter.
