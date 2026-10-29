import type {Migration} from './migrations.js';
const id='CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
export const chatOutboundMigration:Migration={version:42,name:'durable_human_outbound_job',statements:[
 `ALTER TABLE outbound_intent DROP CHECK outbound_intent_chk_4, ADD CONSTRAINT ck_outbound_intent_dispatch_status CHECK(status IN ('queued','sending','sent','failed','unknown','cancelled','remote_queued','remote_sending','remote_unknown'))`,
 `CREATE TABLE chat_outbound_job (
 tenant_id ${id} NOT NULL,intent_id ${id} NOT NULL,conversation_id ${id} NOT NULL,
 attempt_id ${id} NOT NULL,delegation_id ${id} NOT NULL,principal_id ${id} NOT NULL,
 binding_json JSON NOT NULL,resource_json JSON NOT NULL,
 phase VARCHAR(16) NOT NULL DEFAULT 'issue',status VARCHAR(16) NOT NULL DEFAULT 'pending',
 grant_id ${id} NULL,claim_id ${id} NULL,lease_token ${id} NULL,lease_until DATETIME(6) NULL,
 next_attempt_at DATETIME(6) NOT NULL,failures INT UNSIGNED NOT NULL DEFAULT 0,
 version BIGINT UNSIGNED NOT NULL DEFAULT 1,last_error VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
 created_at DATETIME(6) NOT NULL,updated_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id,intent_id),UNIQUE KEY uq_chat_outbound_attempt(tenant_id,attempt_id),
 CONSTRAINT fk_chat_outbound_intent FOREIGN KEY(tenant_id,intent_id,conversation_id) REFERENCES outbound_intent(tenant_id,id,conversation_id),
 CONSTRAINT ck_chat_outbound_phase CHECK(phase IN ('issue','payload','prepare','claim','begin','deliver')),
 CONSTRAINT ck_chat_outbound_state CHECK(status IN ('pending','done','attention')),
 CONSTRAINT ck_chat_outbound_version CHECK(version>=1),
 CONSTRAINT ck_chat_outbound_lease CHECK((lease_token IS NULL AND lease_until IS NULL) OR (lease_token IS NOT NULL AND lease_until IS NOT NULL)),
 CONSTRAINT ck_chat_outbound_binding CHECK(JSON_TYPE(binding_json)='OBJECT' AND OCTET_LENGTH(binding_json)<=8192),
 CONSTRAINT ck_chat_outbound_resource CHECK(JSON_TYPE(resource_json)='OBJECT' AND OCTET_LENGTH(resource_json)<=8192),
 INDEX ix_chat_outbound_due(status,next_attempt_at,tenant_id,intent_id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='Chat; durable Human outbound phase and lease, no session secrets'`,
]};
