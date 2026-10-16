import type {Migration} from './migrations.js';
const id='CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
export const recordPagesMigration:Migration={version:32,name:'record_page_views',statements:[
  `CREATE TABLE record_page_view (
    tenant_id ${id} NOT NULL,id ${id} NOT NULL,object_type_id ${id} NOT NULL,
    surface VARCHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    view_key VARCHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    name VARCHAR(120) NOT NULL,priority SMALLINT UNSIGNED NOT NULL,layout JSON NOT NULL,
    version BIGINT UNSIGNED NOT NULL,created_at DATETIME(6) NOT NULL,updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY(tenant_id,id),UNIQUE KEY uq_record_page_key(tenant_id,object_type_id,surface,view_key),
    UNIQUE KEY uq_record_page_scope(tenant_id,id,object_type_id,surface),
    CONSTRAINT fk_record_page_type FOREIGN KEY(tenant_id,object_type_id) REFERENCES object_type(tenant_id,id),
    CONSTRAINT ck_record_page_surface CHECK(surface IN ('detail','preview')),
    CONSTRAINT ck_record_page_priority CHECK(priority<=999),CONSTRAINT ck_record_page_version CHECK(version>=1)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='CRM Core; record page presentation, never record authorization'`,
  `CREATE TABLE record_page_team (
    tenant_id ${id} NOT NULL,object_type_id ${id} NOT NULL,
    surface VARCHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    team_id ${id} NOT NULL COMMENT 'Identity logical reference; validated by application port',
    view_id ${id} NOT NULL,created_at DATETIME(6) NOT NULL,
    PRIMARY KEY(tenant_id,object_type_id,surface,team_id),KEY ix_record_page_team_view(tenant_id,view_id,object_type_id,surface),
    CONSTRAINT fk_record_page_team_view FOREIGN KEY(tenant_id,view_id,object_type_id,surface) REFERENCES record_page_view(tenant_id,id,object_type_id,surface)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='CRM Core; unique team presentation assignment per object and surface'`,
]};
