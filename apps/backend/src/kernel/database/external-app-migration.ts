import type {Migration} from './migrations.js';
const id='CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
export const externalAppMigration:Migration={version:37,name:'external_private_apps',statements:[
 `CREATE TABLE external_app (
 tenant_id ${id} NOT NULL,id ${id} NOT NULL,name VARCHAR(120) NOT NULL,description VARCHAR(1000) NOT NULL,
 grants JSON NOT NULL,status VARCHAR(16) NOT NULL DEFAULT 'active',token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
 token_expires_at DATETIME(6) NULL,version BIGINT UNSIGNED NOT NULL DEFAULT 1,
 quota_minute BIGINT UNSIGNED NOT NULL DEFAULT 0,quota_count INT UNSIGNED NOT NULL DEFAULT 0,
 created_at DATETIME(6) NOT NULL,updated_at DATETIME(6) NOT NULL,PRIMARY KEY(tenant_id,id),
 CONSTRAINT ck_external_app_status CHECK(status IN ('active','disabled','revoked')),
 CONSTRAINT ck_external_app_version CHECK(version>=1),
 CONSTRAINT ck_external_app_token CHECK((token_hash IS NULL AND token_expires_at IS NULL) OR (token_hash IS NOT NULL AND token_expires_at IS NOT NULL)),
 CONSTRAINT ck_external_app_tenant CHECK(tenant_id NOT IN ('01900000-0000-7000-8000-000000000001','00000000-0000-0000-0000-000000000000') AND tenant_id REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='Identity private app grants, credential verifier and durable quota; target crm_identity'`,
]};
