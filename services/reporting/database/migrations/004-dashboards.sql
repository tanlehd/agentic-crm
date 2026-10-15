-- Reporting-owned dashboard aggregates; forward-only. Business tenant keys throughout.
CREATE TABLE dashboard_definition (
 tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 owner_principal_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 name VARCHAR(160) NOT NULL,
 revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
 latest_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
 archived BOOLEAN NOT NULL DEFAULT 0,
 legacy_report_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 legacy_report_version BIGINT UNSIGNED NULL,
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id,id),
 UNIQUE KEY dashboard_legacy(tenant_id,legacy_report_id,legacy_report_version),
 KEY dashboard_all_list(tenant_id,archived,updated_at,id),
 KEY dashboard_own_list(tenant_id,owner_principal_id,archived,updated_at,id),
 CONSTRAINT dashboard_legacy_fk FOREIGN KEY(tenant_id,legacy_report_id,legacy_report_version) REFERENCES report_version(tenant_id,report_id,version),
 CHECK(tenant_id REGEXP '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' AND tenant_id NOT IN ('01900000-0000-7000-8000-000000000001','00000000-0000-0000-0000-000000000000')),
 CHECK(revision>=1 AND latest_version>=1 AND archived IN (0,1)),
 CHECK((legacy_report_id IS NULL)=(legacy_report_version IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='Reporting business dashboard head; private ownership and CAS';
CREATE TABLE dashboard_version (
 tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 dashboard_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 version BIGINT UNSIGNED NOT NULL,
 schema_version SMALLINT UNSIGNED NOT NULL,
 name VARCHAR(160) NOT NULL,
 description VARCHAR(4000) NOT NULL,
 template_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
 template_version INT UNSIGNED NULL,
 template_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
 created_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 created_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id,dashboard_id,version),
 CONSTRAINT dashboard_version_head_fk FOREIGN KEY(tenant_id,dashboard_id) REFERENCES dashboard_definition(tenant_id,id),
 CHECK(version>=1 AND schema_version=1),
 CHECK((template_key IS NULL AND template_version IS NULL AND template_hash IS NULL) OR (template_key IS NOT NULL AND template_version>=1 AND template_hash IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='Reporting immutable dashboard content version';
CREATE TABLE dashboard_widget (
 tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 dashboard_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 dashboard_version BIGINT UNSIGNED NOT NULL,
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 report_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 report_version BIGINT UNSIGNED NOT NULL,
 binding_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 generation_id CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 title_override VARCHAR(160) NULL,
 note VARCHAR(2000) NOT NULL,
 grid_x SMALLINT UNSIGNED NOT NULL,
 grid_y SMALLINT UNSIGNED NOT NULL,
 grid_w SMALLINT UNSIGNED NOT NULL,
 grid_h SMALLINT UNSIGNED NOT NULL,
 PRIMARY KEY(tenant_id,dashboard_id,dashboard_version,id),
 KEY dashboard_report_usage(tenant_id,report_id,dashboard_id,dashboard_version),
 CONSTRAINT dashboard_widget_parent_fk FOREIGN KEY(tenant_id,dashboard_id,dashboard_version) REFERENCES dashboard_version(tenant_id,dashboard_id,version),
 CONSTRAINT dashboard_widget_report_fk FOREIGN KEY(tenant_id,report_id,report_version) REFERENCES report_version(tenant_id,report_id,version),
 CONSTRAINT dashboard_widget_generation_fk FOREIGN KEY(tenant_id,binding_id,generation_id) REFERENCES report_projection_generation(tenant_id,binding_id,id),
 CHECK(grid_x<=11 AND grid_y<=119 AND grid_w IN(4,6,12) AND grid_h BETWEEN 3 AND 10 AND grid_x+grid_w<=12 AND grid_y+grid_h<=120)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='Reporting immutable placement; typed report version and snapshot refs';
CREATE TABLE dashboard_command_receipt (
 tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 principal_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 command_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 dashboard_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 result JSON NOT NULL,
 created_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id,principal_id,command_id),
 KEY dashboard_receipt_inspect(tenant_id,dashboard_id,created_at,command_id),
 CONSTRAINT dashboard_receipt_head_fk FOREIGN KEY(tenant_id,dashboard_id) REFERENCES dashboard_definition(tenant_id,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='Reporting immutable dashboard command replay result; no query data';
CREATE TABLE dashboard_audit_entry (
 tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 dashboard_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 action VARCHAR(32) NOT NULL,
 revision BIGINT UNSIGNED NOT NULL,
 created_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id,id),
 UNIQUE KEY dashboard_audit_revision(tenant_id,dashboard_id,revision),
 KEY dashboard_audit_inspect(tenant_id,dashboard_id,created_at,id),
 CONSTRAINT dashboard_audit_head_fk FOREIGN KEY(tenant_id,dashboard_id) REFERENCES dashboard_definition(tenant_id,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='Reporting append-only minimized dashboard audit';
CREATE TABLE dashboard_outbox_event (
 tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 dashboard_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 event_type VARCHAR(64) NOT NULL,
 aggregate_revision BIGINT UNSIGNED NOT NULL,
 created_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id,id),
 UNIQUE KEY dashboard_outbox_revision(tenant_id,dashboard_id,aggregate_revision),
 KEY dashboard_outbox_order(tenant_id,created_at,id),
 CONSTRAINT dashboard_outbox_head_fk FOREIGN KEY(tenant_id,dashboard_id) REFERENCES dashboard_definition(tenant_id,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='Reporting immutable dashboard event facts; no relay implied';
