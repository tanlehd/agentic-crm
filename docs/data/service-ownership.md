# Data ownership — monolith to service databases

Current physical Chat authority (T09,2026-10-27): Conversation-owned registry/history/ledgers and Chat domain data are live in crm_chat4. Baseline agentic_crm46 retains historical copies under fenced old accounts; runtime has no Chat table or foreign-schema grants. Identity/CRM/Channels/Routing/Sales/Workflow compatibility remains owner-scoped baseline adapters. [Main cutover runbook](../development/chat-main-local-runtime.md).

[Service catalog](../services/README.md) mô tả responsibility; [schema catalog](schema-catalog.md) mô tả placement; [tracker](../tracking/tasks.md) và [topology](../system/deployment-topology.md) mô tả tiến độ/runtime. Bảng dưới là ownership, không tự yêu cầu tạo bảng hoặc state machine. Baseline dùng application ports/UoW trong một deploy group; service đã tách chỉ giao tiếp API/events.

CRM sở hữu Contact/mapping/metadata/note body; Chat sở hữu Message/episode/workspace và ingress receipts; Connector sở hữu connection/transport/referral evidence; Identity sở hữu current authority. Generic Contact archive phối hợp nhiều service đã bị loại khỏi scope; existing table/operation chỉ là [legacy compatibility](../contracts/legacy-record-archive.md).

| Current entities / tables | Target writer / authority | What other services retain |
|---|---|---|
| account, tenant, membership, principal, role, principal_role, team, team_member, service_actor | Identity | Tenant-bound principal/team refs and revisioned policy snapshots; active authorization via Identity |
| ai_agent, agent_policy | Split: identity/principal linkage Identity; provider config/policy/execution AI Runtime | Provisioning receipt and versioned logical agent ref; no two config masters |
| object_type, property_definition, form/view, custom_record, property_index_value, contact, company, activity | CRM Core | Metadata/Contact refs; authorized read API; notes are CRM Activity linked to Chat |
| crm_record, ownership_history, record_team_access | Partition by owning domain: CRM-owned records in CRM; Conversation in Chat; Lead/Deal in Sales; Ticket in Ticket | CRM external record_catalog/search projection with source service/version/watermark; not ownership authority |
| association_type, association | CRM metadata/link service in CRM Core | External refs service+resource+tenant, validated/reconciled; no cross-service cascade/FK |
| field_policy | Identity canonical authorization; CRM canonical property schema | Versioned enforcement snapshots in domain services, fail-closed live checks for critical actions |
| channel_connection, inbound_delivery, touchpoint, mock_outbound_receipt | CRM Connector (mock receipt test-only) | Chat bound connection refs; Sales/reporting attribution projections |
| contact_identity — canonical external identity→Contact mapping (target refinement ADR-019) | CRM Core | Connector caches crm_contact_id/crm_identity_id/mapping_revision; Chat validates logical refs |
| provider_profile_cache, contact_resolution_cache — target only | CRM Connector | Rebuildable observations/resolution hints; never Contact master or authorization |
| conversation, message, message_content, outbound_intent | Chat | Authorized text/JSON APIs and minimized message refs/events; no transcript copy by default |
| routing_cursor, routing_attention | Routing | Assignment proposals/attention projections; actual owner is domain service local state |
| agent_capacity_slot, agent_execution, tool_execution | AI Runtime | Execution status/lease refs; Routing capacity API, not direct row access |
| workflow_definition/version, activation, enrollment/run/step/wait/timer/action | Workflow — one service | Versioned owner commands/events; components share one Workflow-owned schema |
| lead, lead_handoff, deal, sales_session_context, sales_stage_event | Sales | Contact-share receipt, qualification result, CRM catalog projection |
| outbox_event, consumer_inbox, idempotency_record, audit_entry, schema_migration | One set per owning service, never shared writes | Operations aggregated immutable audit/status projection; migration lineage retained |
| media_asset/blob/rendition/extraction | Media — target only | Opaque media refs, authenticated retrieval; Chat applied extraction revision |
| ticket/SLA | Ticket — Draft | Authorized references, not generic DB access |
| report/dashboard/model/template/run/export | Reporting — implemented scoped own DB | Authorized source APIs/projections; never primary business authority |
| Marketing hierarchy/Creative/Insights/sync | Marketing | Tenant/provider-scoped replicas and freshness; credential authority stays Connector |

PLAN-022A: [Reporting semantic model](reporting-semantic-model.md) bổ sung source/model/attribute/relation/metric registry và dashboard/template versions thuộc Reporting; canonical CRM/Chat/Sales/Marketing/Identity ownership không đổi. Post/provider-media là Marketing references, khác Media service blob/Chat attachment. Historical agent/team dimensions không phải authorization authority. Producer adapters dùng versioned APIs/events, không cross-schema SQL hoặc shared UoW.

Exact source names and columns remain [physical schema](physical-schema.md)/[dictionary](dictionary.md); logical target fields are in each [service document](../services/README.md). A row in this matrix does not assert a Draft table already exists.

## Registry decomposition is a required gate

ADR-027: Workflow owns definition và execution trong một schema crm_workflow. Conversational collection/qualification là steps/templates của cùng engine. CRM giữ canonical metadata; Identity giữ User/team descriptors; business owners phát change events và thực hiện commands. Legacy Chatflow storage đã được gỡ bằng forward43; không còn target owner khác.

Current crm_record stores version/owner for Conversation and Lead; subtype+registry+audit mutate in one UoW. Merely moving folders/containerizing modules would leave a distributed shared database monolith. Target domain services create local record metadata/version/owner/share/history along with their aggregate. CRM metadata templates are read/config APIs; CRM record catalog becomes a projection for generic navigation/search. Generic mutation APIs route by resource authority; cannot PATCH external owners using CRM generic registry.

Migration preserves resource UUID and current owner/version exactly, backfills local metadata before single-writer switch, verifies counts/hash/tenant/reference invariants, then enables domain writer and catalog events. Old UoW/SQL paths disabled for transferred resources. Cross-service references have logical integrity checks/reconciliation; no physical FK claims. Relationship changes use the owning command contract; add a saga only when a concrete multi-owner effect requires it; unavailable reference displayed as unresolved, never auto reassigned to another tenant/contact.

## Data lifecycle and restore

No cross-service distributed backup transaction promised. Backup checkpoints include service schema version, event offsets, snapshot time and saga/receipt state. Restore uses replay/reconciliation plus business invariant checks; event retention and source snapshots must span recovery requirements. Raw webhook/binary/text retention and redaction scoped by service; delete request tracks completion receipts across affected services without deleting legal audit/idempotency tombstones blindly. Exact policy/RPO/RTO requires governance/deployment gate before production.


SRC-028 implemented private connector schema1 owns ingress binding/delivery/audit only; downstream monolith remains authority for identity resolution/Contact/Chat. [Exact model](../contracts/connector-bridge.md). No cross-db FK or ownership cutover.

PLAN-004C adds Connector-owned Page bindings, normalized provider event capture and audit; [schema2](../contracts/messenger-ingress.md). No write authority transfer to Chat or CRM.

ADR-019 / PLAN-006B: [exact responsibility and semantic contract](../contracts/contact-resolution.md). Physical monolith contact_identity remains unchanged until extraction; canonical target authority is CRM Core. Both directions of new Chat message contracts require crm_contact_id.

PLAN-006C: Chat and Connector each own disposable identity-resolution caches, loaded from canonical CRM DB through the CRM read port/API. Cache absence is not canonical identity absence; no new direct SQL ownership.

## Current implementation references

CRM owns Contact resolution/note/metadata; Chat owns acquisition/message membership/progress/need and workspace; Sales owns session context/merge/outcomes; Connector owns transport/referral; Marketing owns provider replicas; Reporting owns models/results. Exact applied fields and compatibility are linked from each [service document](../services/README.md). Implementation evidence stays in the tracker, not a second chronology in this ownership map.
