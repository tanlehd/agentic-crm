import type { Migration } from './migrations.js';
const id='CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
const external='VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin';
const engine='ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs';
export const acquisitionSessionMigration:Migration={version:26,name:'conversation_acquisition_sessions',statements:[
 `CREATE TABLE conversation_acquisition_session (
 tenant_id ${id} NOT NULL,id ${id} NOT NULL,conversation_id ${id} NOT NULL,
 sequence BIGINT UNSIGNED NOT NULL CHECK(sequence>=1),version BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK(version>=1),
 status VARCHAR(16) NOT NULL CHECK(status IN ('active','closed')),
 opening_reason VARCHAR(32) NOT NULL CHECK(opening_reason IN ('first_inbound','new_referral','after_close')),
 close_reason VARCHAR(32) NULL CHECK(close_reason IS NULL OR close_reason IN ('agent_closed','new_referral')),
 opened_at DATETIME(6) NOT NULL,opening_occurred_at DATETIME(6) NOT NULL,closed_at DATETIME(6) NULL,
 source_classification VARCHAR(16) NOT NULL CHECK(source_classification IN ('organic','paid','unknown')),
 source_channel VARCHAR(32) NULL,source_page_id ${external} NULL,source_ad_id ${external} NULL,source_campaign_id ${external} NULL,
 source_connection_id ${id} NULL,source_touchpoint_id ${id} NULL,policy_version VARCHAR(32) NOT NULL,
 active_conversation_key ${id} GENERATED ALWAYS AS (CASE WHEN status='active' THEN conversation_id ELSE NULL END) STORED,
 PRIMARY KEY(tenant_id,id),UNIQUE KEY uq_acquisition_sequence(tenant_id,conversation_id,sequence),
 UNIQUE KEY uq_acquisition_binding(tenant_id,id,conversation_id),UNIQUE KEY uq_acquisition_active(tenant_id,active_conversation_key),
 CONSTRAINT fk_acquisition_conversation FOREIGN KEY(tenant_id,conversation_id) REFERENCES conversation(tenant_id,record_id),
 CONSTRAINT ck_acquisition_closed CHECK((status='active' AND closed_at IS NULL AND close_reason IS NULL) OR (status='closed' AND closed_at IS NOT NULL AND close_reason IS NOT NULL))
 ) ${engine} COMMENT='Chat; durable acquisition session and immutable source'`,
 `CREATE TABLE message_acquisition_membership (
 tenant_id ${id} NOT NULL,message_id ${id} NOT NULL,conversation_id ${id} NOT NULL,session_id ${id} NULL,
 resolution VARCHAR(32) NOT NULL CHECK(resolution IN ('assigned','unresolved_late','unresolved_legacy')),created_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id,message_id),INDEX ix_acquisition_message(tenant_id,session_id,message_id),
 CONSTRAINT fk_acquisition_message FOREIGN KEY(tenant_id,message_id) REFERENCES message(tenant_id,id),
 CONSTRAINT fk_acquisition_member_session FOREIGN KEY(tenant_id,session_id,conversation_id) REFERENCES conversation_acquisition_session(tenant_id,id,conversation_id),
 CONSTRAINT ck_acquisition_member CHECK((resolution='assigned' AND session_id IS NOT NULL) OR (resolution<>'assigned' AND session_id IS NULL))
 ) ${engine} COMMENT='Chat; canonical session membership, unresolved is explicit'`,
 `ALTER TABLE \`lead\` ADD COLUMN conversation_session_id ${id} NULL, ADD COLUMN source_conversation_session_id ${id} NULL, ADD INDEX ix_lead_acquisition(tenant_id,conversation_session_id)`,
 `ALTER TABLE deal ADD COLUMN source_conversation_session_id ${id} NULL`,
]};
