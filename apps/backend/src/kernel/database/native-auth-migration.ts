import type { Migration } from './migrations.js';
import { PLATFORM_TENANT_ID as system } from './system-scope.js';
const id = 'CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
const digest = 'CHAR(64) CHARACTER SET ascii COLLATE ascii_bin';
const engine = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs';
const scope = `tenant_id ${id} NOT NULL CHECK(tenant_id='${system}')`;
const accountFk = 'FOREIGN KEY(tenant_id,account_id) REFERENCES account(tenant_id,id)';
export const nativeAuthMigration: Migration = { version:23, name:'native_identity', statements:[
  `ALTER TABLE tenant ADD tenant_id ${id} NOT NULL DEFAULT (id), ADD kind VARCHAR(16) NOT NULL DEFAULT 'business', ADD UNIQUE(tenant_id,id), ADD CHECK(tenant_id=id), ADD CHECK(kind IN ('business','system')), ADD CHECK((kind='system' AND id='${system}') OR (kind='business' AND id<>'${system}'))`,
  `INSERT INTO tenant(id,tenant_id,kind,name,status,created_at,updated_at) VALUES ('${system}','${system}','system','Platform control plane','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,
  `ALTER TABLE account ADD tenant_id ${id} NOT NULL DEFAULT '${system}', ADD login_key VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NULL, ADD native_status VARCHAR(16) NOT NULL DEFAULT 'active', ADD security_revision BIGINT UNSIGNED NOT NULL DEFAULT 1, ADD UNIQUE(tenant_id,id), ADD UNIQUE(tenant_id,login_key), ADD CHECK(tenant_id='${system}'), ADD CHECK(native_status IN ('active','disabled')), ADD CHECK(security_revision>0)`,
  `CREATE TABLE account_credential(${scope},account_id ${id} NOT NULL,password_hash VARCHAR(255) CHARACTER SET ascii NOT NULL,version BIGINT UNSIGNED NOT NULL DEFAULT 1,changed_at BIGINT UNSIGNED NOT NULL,PRIMARY KEY(tenant_id,account_id),${accountFk},CHECK(version>0)) ${engine}`,
  `CREATE TABLE auth_session(${scope},token_hash ${digest} NOT NULL,account_id ${id} NOT NULL,security_revision BIGINT UNSIGNED NOT NULL,created_at BIGINT UNSIGNED NOT NULL,last_seen_at BIGINT UNSIGNED NOT NULL,absolute_expires_at BIGINT UNSIGNED NOT NULL,revoked_at BIGINT UNSIGNED NULL,PRIMARY KEY(tenant_id,token_hash),INDEX auth_session_account(tenant_id,account_id),INDEX auth_session_expiry(tenant_id,absolute_expires_at),${accountFk}) ${engine}`,
  `CREATE TABLE auth_challenge(${scope},token_hash ${digest} NOT NULL,browser_hash ${digest} NOT NULL,expires_at BIGINT UNSIGNED NOT NULL,PRIMARY KEY(tenant_id,token_hash),INDEX auth_challenge_expiry(tenant_id,expires_at)) ${engine}`,
  `CREATE TABLE auth_token(${scope},token_hash ${digest} NOT NULL,account_id ${id} NOT NULL,purpose VARCHAR(16) NOT NULL,security_revision BIGINT UNSIGNED NOT NULL,expires_at BIGINT UNSIGNED NOT NULL,consumed_at BIGINT UNSIGNED NULL,PRIMARY KEY(tenant_id,token_hash),INDEX auth_token_account(tenant_id,account_id),INDEX auth_token_expiry(tenant_id,expires_at),${accountFk},CHECK(purpose IN ('enrollment','reset'))) ${engine}`,
  `CREATE TABLE auth_attempt(${scope},bucket_hash ${digest} NOT NULL,window_start BIGINT UNSIGNED NOT NULL,attempts INT UNSIGNED NOT NULL,PRIMARY KEY(tenant_id,bucket_hash),INDEX auth_attempt_window(tenant_id,window_start)) ${engine}`,
  `CREATE TABLE system_audit_entry(${scope},id ${id} NOT NULL,account_id ${id} NULL,action VARCHAR(32) CHARACTER SET ascii NOT NULL,occurred_at BIGINT UNSIGNED NOT NULL,PRIMARY KEY(tenant_id,id),INDEX system_audit_account(tenant_id,account_id,occurred_at)) ${engine}`,
] };
