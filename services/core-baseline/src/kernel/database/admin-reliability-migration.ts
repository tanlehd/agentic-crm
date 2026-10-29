import type { Migration } from './migrations.js';
const id='CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
const ascii=(n:number)=>`VARCHAR(${n}) CHARACTER SET ascii COLLATE ascii_bin`;
const actor=`actor_kind ${ascii(32)} NOT NULL CHECK (actor_kind IN ('human','ai','service','system')), actor_id ${id} NOT NULL`;
const base=`id ${id} PRIMARY KEY, tenant_id ${id} NOT NULL`;
const end='UNIQUE (tenant_id,id), FOREIGN KEY (tenant_id) REFERENCES tenant(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs';
export const adminReliabilityMigration: Migration = {version:3,name:'admin_transaction_storage',statements:[
  `CREATE TABLE idempotency_record (${base}, ${actor}, route_key ${ascii(512)} NOT NULL, \`key\` ${ascii(128)} NOT NULL, request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, status ${ascii(32)} NOT NULL CHECK (status IN ('pending','completed')), response_status INT NULL, response_body JSON NULL, created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL, UNIQUE (tenant_id,actor_kind,actor_id,route_key,\`key\`), ${end}`,
  `CREATE TABLE audit_entry (${base}, ${actor}, action ${ascii(128)} NOT NULL, resource_type ${ascii(64)} NOT NULL, resource_id ${id} NULL, outcome ${ascii(32)} NOT NULL CHECK (outcome IN ('accepted','denied')), changed_fields JSON NOT NULL, reason TEXT NULL, correlation_id ${ascii(128)} NOT NULL, occurred_at DATETIME(6) NOT NULL, created_at DATETIME(6) NOT NULL, ${end}`,
  `CREATE TABLE outbox_event (${base}, event_type ${ascii(128)} NOT NULL, schema_version BIGINT UNSIGNED NOT NULL DEFAULT 1, aggregate_type ${ascii(64)} NOT NULL, aggregate_id ${id} NOT NULL, aggregate_version BIGINT UNSIGNED NOT NULL, payload JSON NOT NULL, correlation_id ${ascii(128)} NOT NULL, causation_id ${ascii(128)} NULL, ${actor}, occurred_at DATETIME(6) NOT NULL, created_at DATETIME(6) NOT NULL, status ${ascii(32)} NOT NULL CHECK (status IN ('pending','processing','dispatched','failed')), attempts BIGINT UNSIGNED NOT NULL DEFAULT 0, next_attempt_at DATETIME(6) NULL, lease_until DATETIME(6) NULL, fencing_token BIGINT UNSIGNED NOT NULL DEFAULT 0, INDEX ix_outbox_ready(status,next_attempt_at), ${end}`,
]};
