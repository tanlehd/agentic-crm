# Table placement inventory — baseline source22

PLAN-007,2026-10-07. Read compiled migration metadata built/verified during ENV-003 from current source, without executing SQL. Historical inventory captured at21; SRC-038 local DB now23. Every monolith CREATE TABLE in versions1–22 mapped below; journals and independent Connector added explicitly. Not a production information_schema audit. Target scope follows [catalog](schema-catalog.md) and [guideline](database-guidelines.md).

| Current table in agentic_crm | Created version | Target schema / split | tenant_id column in baseline DDL |
|---|---|---|---|
| account | 1 | crm_identity | present after SRC-038 retrofit |
| activity | 8 | crm_core | present |
| agent_capacity_slot | 11 | crm_ai | present |
| agent_execution | 12 | crm_ai | present |
| agent_policy | 2 | partition Identity / AI | present |
| ai_agent | 2 | partition Identity / AI | present |
| association | 6 | crm_core | present |
| association_type | 6 | crm_core | present |
| audit_entry | 3 | per owning service | present |
| channel_connection | 9 | crm_connector | present |
| chat_inbox | 21 | crm_chat | present |
| chat_inbox_share | 21 | crm_chat | present |
| chat_read_rollout_conversation | 20 | crm_chat | present |
| chat_read_rollout_principal | 20 | crm_chat | present |
| chat_snippet | 21 | crm_chat | present |
| chat_workspace_rollout | 22 | crm_chat | present |
| chatflow_definition | 14 | crm_chatflow | present |
| chatflow_node_run | 14 | crm_chatflow | present |
| chatflow_session | 14 | crm_chatflow | present |
| chatflow_turn | 14 | crm_chatflow | present |
| chatflow_version | 14 | crm_chatflow | present |
| company | 8 | crm_core | present |
| consumer_inbox | 5 | per owning service | present |
| contact | 8 | crm_core | present |
| contact_identity | 9 | crm_core | present |
| conversation | 9 | crm_chat | present |
| conversation_activity | 22 | crm_chat | present |
| conversation_activity_counter | 22 | crm_chat | present |
| conversation_read_state | 20 | crm_chat | present |
| conversation_snooze | 22 | crm_chat | present |
| conversation_tag | 21 | crm_chat | present |
| conversation_tag_link | 21 | crm_chat | present |
| conversation_workspace | 20 | crm_chat | present |
| crm_record | 6 | partition by aggregate owner | present |
| custom_record | 7 | crm_core | present |
| facebook_oauth_attempt | 19 | crm_connector | present |
| facebook_page | 19 | crm_connector | present |
| field_policy | 6 | crm_identity | present |
| form_definition | 7 | crm_core | present |
| idempotency_record | 3 | per owning service | present |
| inbound_delivery | 10 | crm_connector | present |
| lead | 8 | crm_sales | present |
| lead_handoff | 17 | crm_sales | present |
| membership | 2 | crm_identity | present |
| message | 9 | crm_chat | present |
| message_content | 18 | crm_chat | present |
| message_workspace | 20 | crm_chat | present |
| mock_outbound_receipt | 9 | crm_connector | present |
| object_type | 6 | crm_core | present |
| outbound_intent | 9 | crm_chat | present |
| outbox_event | 3 | per owning service | present |
| ownership_history | 6 | partition by aggregate owner | present |
| principal | 2 | crm_identity | present |
| principal_role | 2 | crm_identity | present |
| property_definition | 7 | crm_core | present |
| property_index_value | 7 | crm_core | present |
| record_team_access | 6 | partition by aggregate owner | present |
| role | 2 | crm_identity | present |
| routing_attention | 11 | crm_routing | present |
| routing_cursor | 11 | crm_routing | present |
| service_actor | 2 | crm_identity | present |
| team | 2 | crm_identity | present |
| team_member | 2 | crm_identity | present |
| tenant | 1 | crm_identity | MISSING — retrofit required |
| tool_execution | 12 | crm_ai | present |
| touchpoint | 10 | crm_connector | present |
| view_definition | 7 | crm_core | present |
| workflow_action | 13 | crm_workflow | present |
| workflow_definition | 13 | crm_workflow | present |
| workflow_run | 13 | crm_workflow | present |
| workflow_step_run | 13 | crm_workflow | present |
| workflow_trigger_selection | 13 | crm_workflow | present |
| workflow_version | 13 | crm_workflow | present |
| workflow_wait | 13 | crm_workflow | present |
| schema_migration | runner bootstrap | per owning service, system scope | present after SRC-038 runner upgrade |

## Independent Connector

| Current table | Target | Baseline tenant column |
|---|---|---|
| connector_connection | crm_connector | present |
| connector_delivery | crm_connector | present |
| connector_audit | crm_connector | present |
| connector_meta_page | crm_connector | present |
| connector_meta_event | crm_connector | present |
| connector_meta_audit | crm_connector | present |
| connector_schema_migration | crm_connector | MISSING — runner upgrade required |

SRC-038 account/journals gained fixed system tenant_id; tenant root gained self tenant_id. Native tables account_credential, auth_session, auth_challenge, auth_token, auth_attempt, system_audit_entry (version23) all belong to crm_identity, system scope. Runtime inventory81 monolith and7 Connector tables verified NOT NULL. Presence alone does not prove NOT NULL, keys or repository isolation: physical constraint/grants/runtime verification remains retrofit acceptance.

Split tables cannot be assigned by name alone: crm_record/ownership/share by resource authority, ai_agent/agent_policy by principal vs runtime config, audit/outbox/inbox/idempotency by producing service. property_index_value remains Core for CRM-owned records; external aggregate values/projections split to owner on extraction. Cross-service associations need logical refs instead of current shared registry FKs. No rows were moved.
