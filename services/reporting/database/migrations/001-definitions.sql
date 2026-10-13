-- Reporting own schema. Each statement is independently checksummed by the operator.
CREATE TABLE report_catalog_version (
 tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 payload JSON NOT NULL, created_at DATETIME(6) NOT NULL,
 PRIMARY KEY (tenant_id,hash),
 CHECK (tenant_id REGEXP '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' AND tenant_id NOT IN ('00000000-0000-0000-0000-000000000000','01900000-0000-7000-8000-000000000001'))
) ENGINE=InnoDB COMMENT='Reporting immutable tenant semantic catalog snapshots';
CREATE TABLE report_definition (
 tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 owner_principal_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 name VARCHAR(160) NOT NULL,
 revision BIGINT UNSIGNED NOT NULL DEFAULT 1, latest_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
 archived BOOLEAN NOT NULL DEFAULT 0,
 created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
 PRIMARY KEY (tenant_id,id), KEY ix_report_owner (tenant_id,owner_principal_id,id),
 CHECK (tenant_id REGEXP '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' AND tenant_id NOT IN ('00000000-0000-0000-0000-000000000000','01900000-0000-7000-8000-000000000001')),
 CHECK (id REGEXP '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'),
 CHECK (owner_principal_id REGEXP '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'),
 CHECK (revision>=1 AND latest_version>=1 AND archived IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='Reporting private draft head and CAS revision';
CREATE TABLE report_version (
 tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 report_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 version BIGINT UNSIGNED NOT NULL, name VARCHAR(160) NOT NULL, definition JSON NOT NULL,
 catalog_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 created_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, created_at DATETIME(6) NOT NULL,
 PRIMARY KEY (tenant_id,report_id,version),
 CONSTRAINT fk_report_version_head FOREIGN KEY (tenant_id,report_id) REFERENCES report_definition(tenant_id,id),
 CONSTRAINT fk_report_version_catalog FOREIGN KEY (tenant_id,catalog_hash) REFERENCES report_catalog_version(tenant_id,hash),
 CHECK (version>=1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='Reporting immutable unvalidated draft edit snapshots';
CREATE TABLE report_command_receipt (
 tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 principal_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 command_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 report_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 result JSON NOT NULL, created_at DATETIME(6) NOT NULL,
 PRIMARY KEY (tenant_id,principal_id,command_id), KEY ix_report_receipt_head (tenant_id,report_id),
 CONSTRAINT fk_report_receipt_head FOREIGN KEY (tenant_id,report_id) REFERENCES report_definition(tenant_id,id)
) ENGINE=InnoDB COMMENT='Reporting immutable idempotency results, no automatic expiry';
CREATE TABLE report_audit_entry (
 tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 report_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 action VARCHAR(32) NOT NULL, revision BIGINT UNSIGNED NOT NULL, created_at DATETIME(6) NOT NULL,
 PRIMARY KEY (tenant_id,id), KEY ix_report_audit_head (tenant_id,report_id,created_at,id),
 CONSTRAINT fk_report_audit_head FOREIGN KEY (tenant_id,report_id) REFERENCES report_definition(tenant_id,id)
) ENGINE=InnoDB COMMENT='Reporting minimized append-only command audit';
CREATE TABLE report_outbox_event (
 tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 report_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 event_type VARCHAR(64) NOT NULL, aggregate_revision BIGINT UNSIGNED NOT NULL, created_at DATETIME(6) NOT NULL,
 PRIMARY KEY (tenant_id,id), UNIQUE KEY uq_report_outbox_revision (tenant_id,report_id,aggregate_revision),
 CONSTRAINT fk_report_outbox_head FOREIGN KEY (tenant_id,report_id) REFERENCES report_definition(tenant_id,id)
) ENGINE=InnoDB COMMENT='Reporting immutable event facts; relay not yet enabled';
