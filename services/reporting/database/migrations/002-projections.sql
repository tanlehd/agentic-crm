-- Reporting synthetic snapshot generations; additive to immutable migration001.
CREATE TABLE report_source_binding (
 tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 adapter_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 environment VARCHAR(16) NOT NULL,
 active_generation CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
 revision BIGINT UNSIGNED NOT NULL DEFAULT 0,
 created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
 PRIMARY KEY (tenant_id,id),
 CHECK (tenant_id REGEXP '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' AND tenant_id NOT IN ('00000000-0000-0000-0000-000000000000','01900000-0000-7000-8000-000000000001')),
 CHECK (id REGEXP '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' AND id<>'00000000-0000-0000-0000-000000000000'),
 CHECK (environment='mock')
) ENGINE=InnoDB COMMENT='Reporting explicit synthetic binding and active immutable generation';
CREATE TABLE report_projection_generation (
 tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 binding_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 id CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 manifest JSON NOT NULL, base_revision BIGINT UNSIGNED NOT NULL,
 state VARCHAR(16) NOT NULL, next_page INT UNSIGNED NOT NULL DEFAULT 0,
 received_count INT UNSIGNED NOT NULL DEFAULT 0, created_at DATETIME(6) NOT NULL,
 PRIMARY KEY (tenant_id,binding_id,id),
 FOREIGN KEY (tenant_id,binding_id) REFERENCES report_source_binding(tenant_id,id),
 CHECK (state IN ('building','ready') AND next_page<=200 AND received_count<=10000)
) ENGINE=InnoDB COMMENT='Reporting immutable snapshot manifest and durable page checkpoint';
CREATE TABLE report_projection_page (
 tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 binding_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 generation_id CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 page_number INT UNSIGNED NOT NULL, payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 record_count INT UNSIGNED NOT NULL, created_at DATETIME(6) NOT NULL,
 PRIMARY KEY (tenant_id,binding_id,generation_id,page_number),
 FOREIGN KEY (tenant_id,binding_id,generation_id) REFERENCES report_projection_generation(tenant_id,binding_id,id),
 CHECK (page_number<200 AND record_count<=100)
) ENGINE=InnoDB COMMENT='Reporting immutable page receipt for lost acknowledgement recovery';
CREATE TABLE report_projection_observation (
 tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 binding_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 generation_id CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 object_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 source_id VARCHAR(120) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 source_revision BIGINT UNSIGNED NOT NULL,
 deleted BOOLEAN NOT NULL, observed_at DATETIME(6) NOT NULL,
 payload JSON NOT NULL, payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 PRIMARY KEY (tenant_id,binding_id,generation_id,object_key,source_id,source_revision),
 FOREIGN KEY (tenant_id,binding_id,generation_id) REFERENCES report_projection_generation(tenant_id,binding_id,id),
 CHECK (source_revision>=1 AND deleted IN (0,1))
) ENGINE=InnoDB COMMENT='Reporting immutable typed source revisions; tombstones prevent late resurrection';
CREATE TABLE report_projection_activation (
 tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 binding_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision BIGINT UNSIGNED NOT NULL,
 generation_id CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 created_at DATETIME(6) NOT NULL,
 PRIMARY KEY (tenant_id,binding_id,revision),
 FOREIGN KEY (tenant_id,binding_id,generation_id) REFERENCES report_projection_generation(tenant_id,binding_id,id),
 CHECK (revision>=1)
) ENGINE=InnoDB COMMENT='Reporting minimized atomic generation activation audit';
