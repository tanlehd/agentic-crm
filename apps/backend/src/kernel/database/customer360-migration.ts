import type { Migration } from './migrations.js';
const id='CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
const engine='ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs';
export const customer360Migration:Migration={version:28,name:'customer360_session_context',statements:[
 `CREATE TABLE session_touchpoint (
 tenant_id ${id} NOT NULL,touchpoint_id ${id} NOT NULL,session_id ${id} NOT NULL,conversation_id ${id} NOT NULL,
 occurred_at DATETIME(6) NOT NULL,recorded_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id,touchpoint_id),INDEX ix_session_touchpoint(tenant_id,session_id,touchpoint_id),
 CONSTRAINT fk_session_touchpoint_session FOREIGN KEY(tenant_id,session_id,conversation_id) REFERENCES conversation_acquisition_session(tenant_id,id,conversation_id)
 ) ${engine} COMMENT='Chat; immutable observed referral membership, not attribution policy'`,
 `CREATE TABLE sales_session_context (
 tenant_id ${id} NOT NULL,id ${id} NOT NULL,record_id ${id} NOT NULL,conversation_id ${id} NOT NULL,session_id ${id} NOT NULL,actor_id ${id} NOT NULL,
 kind VARCHAR(16) NOT NULL CHECK(kind IN ('created','follow_up','closing')),recorded_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id,id),UNIQUE KEY uq_sales_session_context(tenant_id,record_id,session_id,kind),INDEX ix_sales_context_session(tenant_id,session_id,record_id)
 ) ${engine} COMMENT='Sales; immutable actual session context, separate from primary source'`,
 `CREATE TABLE lead_merge (
 tenant_id ${id} NOT NULL,source_id ${id} NOT NULL,target_id ${id} NOT NULL,actor_id ${id} NOT NULL,
 source_version BIGINT UNSIGNED NOT NULL CHECK(source_version>=1),target_version BIGINT UNSIGNED NOT NULL CHECK(target_version>=1),
 reason VARCHAR(1000) NOT NULL,recorded_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id,source_id),INDEX ix_lead_merge_target(tenant_id,target_id,source_id),CONSTRAINT ck_lead_merge_distinct CHECK(source_id<>target_id)
 ) ${engine} COMMENT='Sales; duplicate consolidation journal, original Lead and Deal lineage retained'`,
]};
