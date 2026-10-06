# Data ownership — monolith to service databases

ADR-017 / PLAN-005. Target logical ownership below; current dictionary/ERD/physical schema describe monolith through18. Existing composite FK/UoW invariant still enforced there. Extraction requires new schemas/migrations, not editing applied history. Shared MySQL engine is allowed locally, shared database credentials/tables across services are not target architecture.

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
| workflow_definition/version/run/step_run/wait/action/trigger_selection | Workflow | Run/action refs, completion events |
| chatflow_definition/version/session/node_run/turn | Chatflow | Session/Lead/message logical refs and typed result receipts |
| lead, lead_handoff | Sales | Contact-share receipt, qualification result, CRM catalog projection |
| outbox_event, consumer_inbox, idempotency_record, audit_entry, schema_migration | One set per owning service, never shared writes | Operations aggregated immutable audit/status projection; migration lineage retained |
| media_asset/blob/rendition/extraction | Media — target only | Opaque media refs, authenticated retrieval; Chat applied extraction revision |
| ticket/SLA, report definitions/projections/export | Ticket / Reporting — target Draft | Minimized authorized references, not generic DB access |

Exact source names and columns remain [physical schema](physical-schema.md)/[dictionary](dictionary.md); logical target fields are in each [service document](../services/README.md). A row in this matrix does not assert a Draft table already exists.

## Registry decomposition is a required gate

Current crm_record stores version/owner for Conversation and Lead; subtype+registry+audit mutate in one UoW. Merely moving folders/containerizing modules would leave a distributed shared database monolith. Target domain services create local record metadata/version/owner/share/history along with their aggregate. CRM metadata templates are read/config APIs; CRM record catalog becomes a projection for generic navigation/search. Generic mutation APIs route by resource authority; cannot PATCH external owners using CRM generic registry.

Migration preserves resource UUID and current owner/version exactly, backfills local metadata before single-writer switch, verifies counts/hash/tenant/reference invariants, then enables domain writer and catalog events. Old UoW/SQL paths disabled for transferred resources. Cross-service references have logical integrity checks/reconciliation; no physical FK claims. Relationship changes/deletion require contract/saga; unavailable reference displayed as unresolved, never auto reassigned to another tenant/contact.

## Data lifecycle and restore

No cross-service distributed backup transaction promised. Backup checkpoints include service schema version, event offsets, snapshot time and saga/receipt state. Restore uses replay/reconciliation plus business invariant checks; event retention and source snapshots must span recovery requirements. Raw webhook/binary/text retention and redaction scoped by service; delete request tracks completion receipts across affected services without deleting legal audit/idempotency tombstones blindly. Exact policy/RPO/RTO requires governance/deployment gate before production.


SRC-028 implemented private connector schema1 owns ingress binding/delivery/audit only; downstream monolith remains authority for identity resolution/Contact/Chat. [Exact model](../contracts/connector-bridge.md). No cross-db FK or ownership cutover.

PLAN-004C adds Connector-owned Page bindings, normalized provider event capture and audit; [schema2](../contracts/messenger-ingress.md). No write authority transfer to Chat or CRM.

ADR-019 / PLAN-006B: [exact responsibility and semantic contract](../contracts/contact-resolution.md). Physical monolith contact_identity remains unchanged until extraction; canonical target authority is CRM Core. Both directions of new Chat message contracts require crm_contact_id.

PLAN-006C: Chat and Connector each own disposable identity-resolution caches, loaded from canonical CRM DB through the CRM read port/API. Cache absence is not canonical identity absence; no new direct SQL ownership.

## SRC-030 scoped implementation

SRC-030 moves lookup/create SQL behind CRM ContactIdentities application port in the baseline monolith. Connector uses authenticated HTTP, never CRM SQL. Cache entries are disposable; canonical mapping remains in CRM DB. Physical service database extraction remains pending. See [compatibility contract](../contracts/contact-resolution-local.md).

## SRC-031 Facebook configuration and channel dimensions

[Exact OAuth/Page/schema19 contract](../contracts/facebook-configuration.md) and [operator runbook](../development/facebook-configuration.md) define Admin→Channels→Facebook, session/state-bound OAuth, encrypted DB Page credentials and manual verified token replacement. Baseline Channels remains sole writer of catalog/credentials; independent Connector capture is unchanged until API-based extraction/provisioning. Conversation channel and generated channel_id retain existing connection IDs, with Page metadata and tenant/field-authorized filters/options. Messaging activation and real sandbox acceptance remain separate.

## UX-002 — Workspace ownership extension

Chat sở hữu read state/unread sequence, response coverage, queue metrics query, saved inbox/share, conversation tag catalog/links, snippets, snooze/deadline worker và activity reference projection theo [data design](agent-chat-workspace.md). Shared inbox không grant Conversation ACL. CRM sở hữu Contact address/language/identities và Activity note body; Workflow/Chatflow sở hữu source run states. Chỉ trao đổi versioned ports/API/events, không shared SQL/UoW giữa services. Thiết kế Ready, migration/source TODO.
