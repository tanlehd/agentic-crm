-- Immutable connected metadata; operational observations remain request-local.
CREATE TABLE report_connected_catalog (
 tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 binding_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 catalog_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 catalog JSON NOT NULL,
 adapter_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 created_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id,binding_id,catalog_hash),
 CHECK(tenant_id REGEXP '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' AND tenant_id NOT IN ('01900000-0000-7000-8000-000000000001','00000000-0000-0000-0000-000000000000')),
 CHECK(catalog_hash REGEXP '^[0-9a-f]{64}$' AND adapter_id='native_operations_v1')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='Reporting immutable connected catalog metadata; no source observations';
ALTER TABLE dashboard_widget
 MODIFY generation_id CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
 ADD connected_catalog_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
 ADD CONSTRAINT dashboard_widget_catalog_fk FOREIGN KEY(tenant_id,binding_id,connected_catalog_hash) REFERENCES report_connected_catalog(tenant_id,binding_id,catalog_hash),
 ADD CONSTRAINT dashboard_widget_source_pin CHECK((generation_id IS NULL) <> (connected_catalog_hash IS NULL));
