# T05 Human candidate acceptance

**Phạm vi hiện hành CHG-20261023-19:** [Owner split](../planning/chat-extraction/consumer-handoff.md) thay các yêu cầu downstream business trong danh sách T06 bên dưới. Danh sách đó là inventory handoff lịch sử khi đóng T05, không yêu cầu Chat hoàn thiện nghiệp vụ Routing/Workflow/Sales/Reporting. Chat-owned endpoints/producer/local consumers và required compatibility vẫn bắt buộc; evidence T05 không đổi.

SRC-109/T05, Codex2026-10-23. Candidate implementation review; main remains baseline. T06–T09 and D3-03…06 are separate gates. [Human-first scope](../planning/human-first-omni-crm.md), [T05 plan](../planning/chat-extraction/05-messaging-workspace.md).

| T05 requirement | Candidate handlers and evidence |
|---|---|
| Owner references; organic/referral ingress, dedup/message/session | Chat ingress/denial/referral, CRM metadata/Contact/mapping, Channels connection/evidence. [Ingress](../development/chat-ingress-processor.md), [referral](../development/chat-referral-saga.md), [denials](../development/chat-ingress-denials.md); native14/21/28groups in their recorded scopes |
| History/detail/queue/Page filters and legacy lists | Chat history/detail/workspace-query, native Identity, CRM Contact and Channels metadata. [Queue](../development/chat-queue-candidate.md), [catalog](../development/chat-catalog-candidate.md); history6, detail8, queue11, legacy collections7native groups |
| Human outbound and recovery | Chat outbound-submit/job/claim/result/coordinator with native D2 Identity and Connector. [Outbound](../development/chat-outbound-candidate.md):12native groups including lost consume ACK, logout and unknown→matching sent proof |
| Workspace/catalog/notes/activity | Chat workspace-state/catalog/inbox/activity, CRM note saga and owning source notifications. [Workspace](../development/chat-workspace-candidate.md), [notes](../development/chat-notes-candidate.md), [activity](../development/chat-activity-candidate.md):11workspace,10catalog,9inbox,8note-read/13note-write,10feed/5notification groups |
| Session/classification/progress/contribution/need/funnel | Chat session-progress/classification/contributions/need-assessment/need-outcome/session-funnel; native CRM metadata and Sales outcome saga. [Session](../development/chat-session-progress-candidate.md), [classification](../development/chat-classification-candidate.md), [need](../development/chat-need-outcome-candidate.md), [funnel](../development/chat-session-funnel-candidate.md):9session,9classification/4history,25composed need,6funnel groups |
| Generic hydration, lifecycle and global disable | Chat generic-record/custom-values and transition, Channels status plus Connector dispatch barrier. [Records](../development/chat-record-candidate.md):16native groups; [lifecycle](../development/chat-transition-candidate.md):12native+8detail regression; [disable](../development/chat-connection-disable.md):17native+12outbound regression |
| Own lineage and truthful capability advertisement | Chat runtime-lineage/capabilities;2focused/4native groups. Flags depend on actual mounted handlers/backfill, never a copied baseline migration journal. Main is not mounted |

Counts are suite-specific evidence, not additive product coverage or an extraction percentage. Each runbook identifies exact logs, constraints and historical versus current source runs. No real provider or deployed E2E is claimed here.

## Handler and downstream review

`artifacts/chat-extraction/continuation-20261022/t05-handler-review.json` enumerates66candidate route registrations from actual factories, covering56public T05 operations. This is static registration evidence, not a server readiness assertion. The generic get/patch and private ingress/recovery operations are additional candidate registrations. Native business behavior evidence is the runbooks above.

The operation catalog retains27entries outside these factories:22T06 integrations,3AI-deferred operations, and2removed/unsupported legacy archive contracts. They are explicitly unresolved, not implemented stubs. Historical T05 handoff inventory (allocate per owner split above before treating any item as a D3-03 gate):

- Routing target/team directories, active-session/fact reads, work/attention/dispatch, capacity recovery and subscriptions. The directories require current Chat record rights plus Identity eligibility and Routing capacity; target UUID validation alone is not directory parity.
- Workflow read/recover need, assignment/follow-up, pending outcome fence, registry/control and source activity relay. Chatflow retirement remains final; no old orchestration service is recreated.
- Sales session-source/context/merge/contribution delivery, CRM catalog/associations/Contact-channel and generic collection consumers, CRM metadata writer barriers. Generic Conversation create/archive/standard-field PATCH remain unsupported as recorded by the baseline coreDomains review.
- Reporting snapshot/facts/drilldown and4private-app routes with current intersected grants. Native public session-funnel does not satisfy Reporting snapshot consumption.
- Operational event read/replay/delivery/ACK/recovery,8local Chat consumers and scanners, producer routing, baseline writer removal/fencing, source/DI/grant inventory.

AI context/inbound-next/prompt-submit remain AI-DEFERRED; cumulative control, retained executable AI state and stale-owner prevention remain required shared safety. `contact_channels_v1` remains false until the T06 CRM consumer is implemented. Routing/Workflow/Sales/Reporting/main runtime availability is not inferred from candidate source.

T07 must validate configured canonical object IDs against actual metadata, mount all approved factories, use gated Connector dispatch, and add independent API/worker/image/readiness. T09 must handle schema6 Connector compatibility, legacy cursor invalidation and main43 rollout compatibility, then perform the authorized restart/post-write rollback/reapply. No dependency or release gate is waived.
