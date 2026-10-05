import type { Migration } from './migrations.js';
const id='CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
const engine='ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs';
export const routingMigration:Migration={version:11,name:'routing_capacity',statements:[
  `CREATE TABLE routing_cursor (tenant_id ${id} NOT NULL,team_id ${id} NOT NULL,capability_key VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL CHECK (capability_key IN ('chat','sales')),last_principal_id ${id} NULL,PRIMARY KEY(tenant_id,team_id,capability_key),FOREIGN KEY(tenant_id,team_id) REFERENCES team(tenant_id,id),FOREIGN KEY(tenant_id,last_principal_id) REFERENCES principal(tenant_id,id)) ${engine}`,
  `CREATE TABLE agent_capacity_slot (tenant_id ${id} NOT NULL,execution_id ${id} NOT NULL,principal_id ${id} NOT NULL,expires_at DATETIME(6) NOT NULL,released_at DATETIME(6) NULL,PRIMARY KEY(tenant_id,execution_id),INDEX ix_capacity(tenant_id,principal_id,released_at,expires_at),FOREIGN KEY(tenant_id,principal_id) REFERENCES principal(tenant_id,id)) ${engine}`,
  `CREATE TABLE routing_attention (tenant_id ${id} NOT NULL,record_id ${id} NOT NULL,reason VARCHAR(32) NOT NULL CHECK(reason IN ('no_eligible_principal','owner_ineligible')),active TINYINT UNSIGNED NOT NULL CHECK(active IN (0,1)),updated_at DATETIME(6) NOT NULL,PRIMARY KEY(tenant_id,record_id),FOREIGN KEY(tenant_id,record_id) REFERENCES crm_record(tenant_id,id)) ${engine}`,
]};
