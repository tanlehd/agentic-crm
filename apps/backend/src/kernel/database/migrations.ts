import { agentRuntimeMigration } from './agent-runtime-migration.js';
import { routingMigration } from './routing-migration.js';
import { intakeMigration } from './intake-migration.js';
import { conversationMigration } from './conversation-migration.js';
import { crmCoreMigration } from './crm-core-migration.js';
import { propertiesMigration } from './properties-migration.js';
import { registryMigration } from './registry-migration.js';
import { deliveryMigration } from './delivery-migration.js';
import { adminReliabilityMigration } from './admin-reliability-migration.js';
import { identityMigration } from './identity-migration.js';
import { createHash } from 'node:crypto';
export interface Migration { version: number; name: string; statements: readonly string[] }
const id = 'CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
const timestamps = 'created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL';
const engine = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs';
export const migrations: readonly Migration[] = [{
  version: 1, name: 'identity_foundation', statements: [
    `CREATE TABLE account (id ${id} PRIMARY KEY, issuer VARCHAR(512) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, subject VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, display_name VARCHAR(255) NOT NULL, email VARCHAR(254) NULL, ${timestamps}, CONSTRAINT uq_account_issuer_subject UNIQUE (issuer,subject)) ${engine}`,
    `CREATE TABLE tenant (id ${id} PRIMARY KEY, name VARCHAR(255) NOT NULL, status VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, timezone VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'Asia/Ho_Chi_Minh', locale VARCHAR(35) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'vi-VN', version BIGINT UNSIGNED NOT NULL DEFAULT 1, ${timestamps}, CONSTRAINT ck_tenant_status CHECK (status IN ('active','suspended')), CONSTRAINT ck_tenant_version CHECK (version >= 1)) ${engine}`,
  ],
}, identityMigration, adminReliabilityMigration, {
  version: 4, name: 'outbox_positive_versions', statements: [
    'ALTER TABLE outbox_event ADD CONSTRAINT ck_outbox_schema_version CHECK (schema_version >= 1), ADD CONSTRAINT ck_outbox_aggregate_version CHECK (aggregate_version >= 1)',
  ],
}, deliveryMigration, registryMigration, propertiesMigration, crmCoreMigration, conversationMigration, intakeMigration, routingMigration, agentRuntimeMigration];
export const checksum = (m: Migration) => createHash('sha256').update(JSON.stringify([m.version, m.name, m.statements])).digest('hex');
