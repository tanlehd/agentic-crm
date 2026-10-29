import type { Migration } from './migrations.js';
const id='CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
const opaque='VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin';
const engine="ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs";
const scope="CHECK (tenant_id NOT IN ('01900000-0000-7000-8000-000000000001','00000000-0000-0000-0000-000000000000') AND tenant_id REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')";
export const marketingAuthorityMigration:Migration={version:27,name:'marketing_authority',statements:[
 `CREATE TABLE channel_marketing_credential (
 tenant_id ${id} NOT NULL,id ${id} NOT NULL,app_id ${opaque} NOT NULL,external_account_id ${opaque} NOT NULL,
 token_ciphertext TEXT NOT NULL,key_id VARCHAR(64) NOT NULL,status VARCHAR(16) NOT NULL CHECK(status IN ('active','revoked','attention')),
 verified_at DATETIME(6) NOT NULL,version BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK(version>=1),created_at DATETIME(6) NOT NULL,updated_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id,id),UNIQUE KEY uq_marketing_credential_account(tenant_id,app_id,external_account_id),INDEX ix_marketing_credential_update(tenant_id,updated_at,id),${scope}
 ) ${engine} COMMENT='Channels account read credential; target crm_connector'`,
 `ALTER TABLE facebook_page ADD marketing_admission_state VARCHAR(16) NOT NULL DEFAULT 'enabled' CHECK(marketing_admission_state IN ('enabled','revoked')), ADD marketing_admission_version BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK(marketing_admission_version>=1)`,
 `CREATE TABLE channel_marketing_admission_receipt (
 tenant_id ${id} NOT NULL,id ${id} NOT NULL,operation_id ${id} NOT NULL,credential_id ${id} NOT NULL,credential_revision BIGINT UNSIGNED NOT NULL CHECK(credential_revision>0),
 page_connection_id ${id} NOT NULL,page_revision BIGINT UNSIGNED NOT NULL CHECK(page_revision>0),app_id ${opaque} NOT NULL,external_account_id ${opaque} NOT NULL,page_id ${opaque} NOT NULL,external_ad_id ${opaque} NOT NULL,
 run_id ${id} NOT NULL,fence BIGINT UNSIGNED NOT NULL CHECK(fence>0),payload_sha256 BINARY(32) NOT NULL,request_sha256 BINARY(32) NOT NULL,policy_version VARCHAR(32) NOT NULL,fetched_at DATETIME(6) NOT NULL,admitted_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id,id),UNIQUE KEY uq_marketing_admission_operation(tenant_id,operation_id),INDEX ix_marketing_admission_created(tenant_id,credential_id,admitted_at,id),
 FOREIGN KEY(tenant_id,credential_id) REFERENCES channel_marketing_credential(tenant_id,id),FOREIGN KEY(tenant_id,page_connection_id) REFERENCES facebook_page(tenant_id,connection_id),${scope}
 ) ${engine} COMMENT='Channels immutable Marketing admission decisions'
 `,
]};
