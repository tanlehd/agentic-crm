CREATE TABLE marketing_sync_schedule (
 tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 account_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 binding_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 profile VARCHAR(64) NOT NULL CHECK(profile='object_metadata_v1'),
 enabled BOOLEAN NOT NULL DEFAULT 0 CHECK(enabled IN(0,1)),
 state VARCHAR(16) NOT NULL CHECK(state IN('idle','running','retry','attention','paused')),
 interval_seconds INT UNSIGNED NOT NULL DEFAULT 21600 CHECK(interval_seconds BETWEEN 900 AND 604800),
 next_due_at DATETIME(6) NOT NULL,
 active_run_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 lease_owner CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 lease_until DATETIME(6) NULL,
 fence BIGINT UNSIGNED NOT NULL DEFAULT 0,
 consecutive_errors INT UNSIGNED NOT NULL DEFAULT 0,
 last_success_at DATETIME(6) NULL,error_code VARCHAR(64) NULL,
 version BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK(version>=1),created_at DATETIME(6) NOT NULL,updated_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id,id),UNIQUE(tenant_id,account_id,profile),UNIQUE(tenant_id,account_id,id),
 FOREIGN KEY(tenant_id,account_id) REFERENCES marketing_account(tenant_id,id),
 FOREIGN KEY(tenant_id,account_id,binding_id) REFERENCES marketing_account_binding(tenant_id,account_id,id),
 FOREIGN KEY(tenant_id,account_id,active_run_id) REFERENCES marketing_sync_run(tenant_id,account_id,id),
 CHECK((lease_owner IS NULL)=(lease_until IS NULL)),CHECK(state<>'running' OR active_run_id IS NOT NULL),
 CHECK(tenant_id REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND tenant_id NOT IN('01900000-0000-7000-8000-000000000001','00000000-0000-0000-0000-000000000000')),
 INDEX ix_marketing_dispatch(enabled,state,next_due_at,tenant_id,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='Marketing durable account/profile scheduler';

CREATE TABLE marketing_operation_receipt (
 tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 action VARCHAR(64) NOT NULL,target_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 request_sha256 BINARY(32) NOT NULL,http_status SMALLINT UNSIGNED NOT NULL,
 response_json JSON NOT NULL CHECK(JSON_STORAGE_SIZE(response_json)<=65536),created_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id,id),INDEX(tenant_id,created_at,id),
 CHECK(tenant_id NOT IN('01900000-0000-7000-8000-000000000001','00000000-0000-0000-0000-000000000000'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='Marketing immutable management receipts';

CREATE TABLE marketing_change_clock (
 tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 last_sequence BIGINT UNSIGNED NOT NULL DEFAULT 0,version BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK(version>=1),
 created_at DATETIME(6) NOT NULL,updated_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id),CHECK(tenant_id NOT IN('01900000-0000-7000-8000-000000000001','00000000-0000-0000-0000-000000000000'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='Marketing per-tenant committed change clock';

CREATE TABLE marketing_change_event (
 tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 sequence BIGINT UNSIGNED NOT NULL CHECK(sequence>0),account_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 object_type VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 external_object_id VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 observation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,revision BIGINT UNSIGNED NOT NULL CHECK(revision>0),
 event_type VARCHAR(64) NOT NULL CHECK(event_type='marketing.object.observed.v1'),
 payload JSON NOT NULL CHECK(JSON_STORAGE_SIZE(payload)<=65536),created_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id,id),UNIQUE(tenant_id,sequence),UNIQUE(tenant_id,account_id,observation_id,event_type),
 FOREIGN KEY(tenant_id) REFERENCES marketing_change_clock(tenant_id),
 FOREIGN KEY(tenant_id,account_id) REFERENCES marketing_account(tenant_id,id),
 FOREIGN KEY(tenant_id,account_id,observation_id) REFERENCES marketing_object_observation(tenant_id,account_id,id),
 INDEX ix_marketing_snapshot(tenant_id,account_id,object_type,external_object_id,sequence)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='Marketing immutable commit-ordered metadata change stream';

ALTER TABLE marketing_sync_run ADD error_code VARCHAR(64) NULL,ADD completed_at DATETIME(6) NULL;

ALTER TABLE marketing_object_observation ADD admission_receipt_ref CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 ADD admission_request_sha256 BINARY(32) NULL,ADD admission_authority VARCHAR(64) NULL,
 ADD CHECK((admission_receipt_ref IS NULL AND admission_request_sha256 IS NULL AND admission_authority IS NULL) OR (admission_receipt_ref IS NOT NULL AND admission_request_sha256 IS NOT NULL AND admission_authority IS NOT NULL));
