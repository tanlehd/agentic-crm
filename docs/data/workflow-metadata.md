# Workflow metadata and ownership

ADR-027: one Workflow service owns authoring/execution metadata and runtime state in target crm_workflow. No separate Workflow API/Core schemas or Chatflow schema are required. This is a logical ownership update, not DDL or applied migration.

| Data | Owner | Workflow use |
|---|---|---|
| CRM/custom object, property and association definitions | CRM | Versioned descriptors and authorized query/command references |
| Lead/Deal fields and business commands | Sales | Stage/outcome/source context and named actions |
| Conversation/message/episode fields and commands | Chat | Routing/context/send/wait references; no canonical transcript replica |
| Ticket descriptors and commands | Ticket | Available actions only after adapter exists |
| User/principal/team business descriptors | Identity | Permitted changes and admin actions; never credential/session secrets |
| Definition/draft/version/binding manifest | Workflow | One canonical authoring authority |
| Activation/enrollment/run/step/wait/timer | Workflow | One execution authority; run pins version |
| Variables/Human task/provenance/action receipt | Workflow | Shared across conversational and other business flows |
| Capacity/candidate/allocation reservation | Routing | Request/receipt reference, not a duplicated allocation table |

API/engine/worker components share the same Workflow ownership, not foreign-service SQL. Runtime grants can be narrowed by component while migrations/lineage remain owned by Workflow. No table is created solely because it appears in this logical map; actual migration must use database templates and retain old data.

## Existing and future catalog

[SRC-065 catalog v1](../contracts/workflow-catalog.md) is delivered metadata/validation only. It does not yet expose every User/Ticket/action/event surface above. Extend discovery with versioned owner descriptors/capabilities before enabling dependent flows; do not reinterpret old strict payloads or return fake executable=true.

Metadata only proves structure, never data access. Field read/filter/write permissions are separate; null/absent/forbidden remain distinct. Typed collections cannot silently become scalar targets. Binding refs use stable owner/object/property IDs; old labels are not business keys. Schema changes preserve published manifests or report precise incompatibility, without creating a universal archive lifecycle.

## State and compatibility

Workflow draft/publish/activation/run/wait states serve actual automation. CRM/Chat/Sales/Ticket/Identity retain their own state and CAS. Conversational collection does not create an additional service/module lifecycle. Legacy chatflow_* tables/wire and packages/workflow-definition package are inventoried in [compatibility](../contracts/legacy-chatflow.md); no implicit table or principal rename.
