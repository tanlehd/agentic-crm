-- T02 design v1, UNAPPLIED. No runtime invocation. Do not run against main.
-- MySQL 8.4; explicit operator schema/identity preflight required.
-- Future baseline044, only after adapter/row-reference validation; six subtype FKs deliberately retained.
ALTER TABLE agentic_crm.`activity` DROP FOREIGN KEY `activity_ibfk_1`;
ALTER TABLE agentic_crm.`agent_execution` DROP FOREIGN KEY `agent_execution_ibfk_1`;
ALTER TABLE agentic_crm.`association` DROP FOREIGN KEY `association_ibfk_2`;
ALTER TABLE agentic_crm.`association` DROP FOREIGN KEY `association_ibfk_3`;
ALTER TABLE agentic_crm.`chatflow_session` DROP FOREIGN KEY `chatflow_session_ibfk_3`;
ALTER TABLE agentic_crm.`chatflow_session` DROP FOREIGN KEY `chatflow_session_ibfk_6`;
ALTER TABLE agentic_crm.`chatflow_turn` DROP FOREIGN KEY `chatflow_turn_ibfk_2`;
ALTER TABLE agentic_crm.`consumer_inbox` DROP FOREIGN KEY `consumer_inbox_ibfk_1`;
ALTER TABLE agentic_crm.`inbound_delivery` DROP FOREIGN KEY `inbound_delivery_ibfk_2`;
ALTER TABLE agentic_crm.`inbound_delivery` DROP FOREIGN KEY `inbound_delivery_ibfk_3`;
ALTER TABLE agentic_crm.`lead` DROP FOREIGN KEY `lead_ibfk_3`;
ALTER TABLE agentic_crm.`mock_outbound_receipt` DROP FOREIGN KEY `mock_outbound_receipt_ibfk_1`;
ALTER TABLE agentic_crm.`routing_attention` DROP FOREIGN KEY `routing_attention_ibfk_1`;
ALTER TABLE agentic_crm.`touchpoint` DROP FOREIGN KEY `touchpoint_ibfk_4`;
