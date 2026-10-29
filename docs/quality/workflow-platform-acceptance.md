# Unified Workflow acceptance

ADR-027 / CHG-20261021-07. Architecture is accepted; runtime scenarios below are NOT_RUN for the unified service. Historical SRC-019/020/065/066/067/081 results remain valid for their tested baseline, not automatic PASS here.

## Target scenarios

| ID | Scenario | Required result |
|---|---|---|
| WF-U01 | CRM/custom object, Lead/Deal, Ticket, Identity User/team and Conversation capabilities | Correct owner/schema/rights; unavailable adapters are explicit, no fake generic update; secrets absent |
| WF-U02 | One definition/node catalog for data, routing, conversational and follow-up flows | Same version/run/step/wait/receipt model; no standalone Chatflow engine or cross-service Workflow publish saga |
| WF-U03 | Duplicate/reordered/lost source event, event gap and activation boundary | One enrollment according to rule/version; stable event/action identity; reconcile unknown and prevent causal loops |
| WF-U04 | Conversation change triggers routing | Workflow selects business rule; Routing reserves candidate/capacity; owner CAS commits once; stale/revoked result cannot win |
| WF-U05 | User/team availability changes during routing | Current Identity rights/eligibility checked; no password/token payload or automatic privilege escalation; owner safety independent of Workflow lag |
| WF-U06 | Conversational collection and Human resume | Exact run/resource/message binding; event-before-wait safe; duplicate response once; consent from real evidence, not AI draft |
| WF-U07 | Lead/Deal/Ticket action after wait/retry | Named owner command validates fields/state/current rights; unsupported action cannot publish as executable; no cross-service SQL |
| WF-U08 | Lost ACK/unknown send or Sales effect, crash/restart | Reconcile same operation/receipt; no second prompt/send/Lead; explicit partial/attention; no fake rollback |
| WF-U09 | Owner change/close/revoke before delayed execution | Owner rejects stale effects before Workflow receives notification; cancellation cannot undo sent/committed outcome |
| WF-U10 | Publish new version, disable or cancel | Local Workflow activation generation; runs keep pinned version; disable stops enrollment, cancel affects selected run |
| WF-U11 | Retired automation boundary | Reject removed primitives; dependent old runs cancel explicitly; business records, Workflow receipts and audit remain; no prompt replay |
| WF-U12 | Source/data retirement | Forward migration removes Chatflow storage/dependencies; old binary cannot restart its runner; forward fix only after irreversible retirement |
| WF-U13 | Workflow outage, owner writes continue | Owners commit state/outbox safely; replay catches up; unrelated direct Human operations do not wait on Workflow |
| WF-U14 | Editor/API/run inspection | One catalog/editor, current rights/tenant isolation, version conflicts, sanitized execution status and real unavailable capabilities |

## Historical acceptance references

WF-01…15 in completed task evidence refer to pre-unification metadata/engine/CMS slices. Preserve their logs/results. Current implementation tasks map applicable cases to WF-U01…14 and report actual coverage; removed legacy schemas are historical evidence, not a requirement for another service/schema.

[Contract](../contracts/workflow-orchestration.md), [plan](../planning/workflow-platform.md), [legacy compatibility](../contracts/legacy-chatflow.md), [service](../services/workflow.md).
