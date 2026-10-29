/** Forward6 only; migrations1–5 remain immutable. */
export const connectionStatusStatements=[`CREATE TABLE connector_connection_barrier (
 tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 barrier_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 connection_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 state VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 version BIGINT UNSIGNED NOT NULL DEFAULT 1,
 disabled_at DATETIME(6) NOT NULL, enabled_at DATETIME(6) NULL, updated_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id,barrier_id),
 KEY ix_connector_barrier_connection(tenant_id,connection_id,state,barrier_id),
 CONSTRAINT ck_connector_barrier_tenant CHECK(tenant_id<>'' AND tenant_id<>'00000000-0000-0000-0000-000000000000' AND tenant_id<>'01900000-0000-7000-8000-000000000001'),
 CONSTRAINT ck_connector_barrier_version CHECK(version>=1),
 CONSTRAINT ck_connector_barrier_state CHECK((state='disabled' AND enabled_at IS NULL) OR (state='enabled' AND enabled_at IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='Connector business scope; permanent connection disable and enable receipts'`];
