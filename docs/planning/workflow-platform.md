# Workflow unification and implementation plan

ADR-027 / CHG-20261021-07, user-authorized2026-10-21. One Workflow service defines all business automation, including CRM/custom objects, Ticket, Lead, Deal, User/team and Chat Conversation. Chatflow service/module and separate Workflow API/Core service schemas are removed from target architecture. API/engine/worker/editor are components of this same service.

[Architecture](../system/workflow-architecture.md) · [Orchestration contract](../contracts/workflow-orchestration.md) · [Service responsibility](../services/workflow.md) · [Compatibility inventory](../contracts/legacy-chatflow.md).

## Existing evidence and gaps

SRC-019 is the baseline primitive engine; SRC-020 conversational engine is removed by CHG-20261021-08. SRC-065 delivers metadata/validation library; SRC-066/067 deliver baseline CMS/canvas; SRC-081 contains need/follow-up behavior. These parts are reusable, not proof that the unified service exists. Current source task remains SRC-109/T05; no parallel source task or runtime deployment is started by this architecture update.

## Scoped work

| Task | Current meaning after ADR-027 | Output |
|---|---|---|
| PLAN-024A / SRC-065 | Completed catalog/validator slice retained | Keep v1 compatibility; add User/Ticket/owner capabilities only through versioned extension |
| PLAN-024B | Owner change events, enrollment and replay | Actual producer coverage for CRM, Sales, Chat, Identity and Ticket when available; tenant/sequence/causation/current rights; existing Kafka direction |
| PLAN-024C | One Workflow API/control/storage contract | One crm_workflow owner/journal; local publish/activation, component auth, retained schema/graph/receipt mapping; no API→Core installation saga |
| PLAN-024D | Unified node/action/wait execution | Data/transition/routing/message/Human task/AI/qualification nodes using owner APIs; same run model |
| PLAN-024E | Editor and migration/cutover | One catalog/editor, per-flow single starter, supported-version compatibility, rollback/read compatibility and operator controls |
| PLAN-009 | Baseline Workflow/AI integration gap review | Consolidate orchestration, distinguish AI execution; no second Chatflow framework |
| SRC-042 | Unified Workflow foundation on existing engine/library | Implement only scoped Ready adapters/persistence/enrollment |
| SRC-043 | Implement conversational actions inside Workflow | Common waits, message evidence and Human tasks; Chatflow retirement is handled by CHG-20261021-08, not a dependency to rebuild |
| SRC-076 | Business automation on owner APIs | Reuse unified runtime; no independent custom-object/chat engine |

Existing task dependencies and evidence remain in [tracker](../tracking/tasks.md). Rename scope does not mark source work DONE or start all tasks. No business approval remains pending for the one-service decision; exact source/DDL/API validation is implementation work.

## Implementation order

1. Review supported graph capabilities, routing starters and effect receipts. Declare unsupported capabilities and the per-flow activation owner.
2. Extend shared owner descriptors and events for concrete supported operations. User/team stays Identity-owned; never expose secrets or enable privilege-changing actions from event presence alone.
3. Implement one Workflow authoring/execution schema/lineage and local activation. Reuse existing validation/runtime pieces; no unnecessary install handshake between same-owner components.
4. Add common conversational wait/message/Human input/qualification nodes and routing action adapters. Keep Chat/Identity owner safety at effect even when events are delayed.
5. Preserve action keys and terminal receipts, disable duplicate business starters, then enable unified enrollment after retained synthetic acceptance.
6. Maintain the approved retirement boundary: no standalone conversational engine, old route adapter or second automation schema. Historical migrations/evidence stay immutable.

## Delivery boundaries

Chat extraction T05 continues send/workspace work; T06 consumer integration targets one Workflow owner. Chatflow operations and clients are removed; unsupported automation must fail explicitly. Human-first scope remains; AI actions can be unavailable without blocking Human data/routing flows. Ticket/provider adapters can be unavailable until their owners expose them.

Architecture acceptance is documentation consistency. Runtime acceptance requires actual common engine, owner APIs, single starter, recovery and retained data proof in [WF-U scenarios](../quality/workflow-platform-acceptance.md). No source/runtime migration is claimed in CHG-20261021-07.
