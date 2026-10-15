import type { Migration } from './migrations.js';
const id='CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
export const objectWorkspaceMigration:Migration={version:30,name:'object_workspace_config',statements:[
  `CREATE TABLE object_workspace_config (
    tenant_id ${id} NOT NULL, object_type_id ${id} NOT NULL,
    plural_label VARCHAR(255) NOT NULL, description VARCHAR(1000) NOT NULL,
    display_property_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
    enabled BOOLEAN NOT NULL, position SMALLINT UNSIGNED NOT NULL,
    created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY(tenant_id,object_type_id),
    CONSTRAINT fk_object_workspace_type FOREIGN KEY(tenant_id,object_type_id) REFERENCES object_type(tenant_id,id),
    CONSTRAINT ck_object_workspace_enabled CHECK(enabled IN (0,1)),
    CONSTRAINT ck_object_workspace_position CHECK(position<=999)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='CRM Core; object presentation and workspace placement, not access policy'`,
]};
