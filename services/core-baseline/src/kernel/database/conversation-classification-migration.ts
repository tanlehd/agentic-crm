import type { Migration } from './migrations.js';
const id='CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
const engine='ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs';
export const conversationClassificationMigration:Migration={version:31,name:'conversation_classification_contribution',statements:[
 `CREATE TABLE session_classification (
 tenant_id ${id} NOT NULL,session_id ${id} NOT NULL,values_json JSON NOT NULL,
 version BIGINT UNSIGNED NOT NULL DEFAULT 1,created_at DATETIME(6) NOT NULL,updated_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id,session_id),CONSTRAINT ck_session_classification_version CHECK(version>=1),
 CONSTRAINT fk_session_classification_session FOREIGN KEY(tenant_id,session_id) REFERENCES conversation_acquisition_session(tenant_id,id)
 ) ${engine} COMMENT='Chat; episode classification values, never Contact master'`,
 `CREATE TABLE session_contribution (
 tenant_id ${id} NOT NULL,session_id ${id} NOT NULL,id ${id} NOT NULL,thread_id ${id} NOT NULL,
 revision BIGINT UNSIGNED NOT NULL,kind VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 source_id ${id} NOT NULL,source_revision VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_kind VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NULL,actor_id ${id} NULL,
 owner_id ${id} NULL,team_id ${id} NULL,owner_revision BIGINT UNSIGNED NOT NULL,
 payload JSON NOT NULL,recorded_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id,session_id,revision),UNIQUE KEY uq_session_contribution_source(tenant_id,session_id,kind,source_id,source_revision),
 KEY ix_session_contribution_thread(tenant_id,thread_id,session_id),
 CONSTRAINT ck_session_contribution_revision CHECK(revision>=1),
 CONSTRAINT fk_session_contribution_session FOREIGN KEY(tenant_id,session_id) REFERENCES conversation_acquisition_session(tenant_id,id)
 ) ${engine} COMMENT='Chat; immutable handling facts, assignment time is not work time'`,
 // A conflicting pre-existing key must fail, not silently change its meaning.
 "INSERT INTO object_type(id,tenant_id,`key`,label,kind,created_at,updated_at) SELECT UUID(),tenant_id,'conversation_session','Conversation (lượt trao đổi)','standard',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6) FROM object_type WHERE `key`='conversation'",
]};
