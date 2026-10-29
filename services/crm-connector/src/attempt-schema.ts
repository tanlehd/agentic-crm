const id='CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
export const attemptStatements=[
 `ALTER TABLE connector_dispatch_guard
 DROP CHECK ck_dispatch_guard_state,
 ADD grant_id ${id} NULL, ADD claim_id ${id} NULL, ADD fence_id ${id} NULL,
 ADD deadline_at DATETIME(6) NULL, ADD provider_message_id VARCHAR(255) COLLATE utf8mb4_0900_as_cs NULL,
 ADD CONSTRAINT ck_dispatch_guard_state CHECK(state IN ('staged','prepared','cancelled','admitting','started','unknown','sent')),
 ADD CONSTRAINT ck_dispatch_guard_lifecycle CHECK(
 (state IN ('staged','prepared','cancelled') AND grant_id IS NULL AND claim_id IS NULL AND fence_id IS NULL AND deadline_at IS NULL) OR
 (state IN ('admitting','started','unknown','sent') AND grant_id IS NOT NULL AND claim_id IS NOT NULL AND fence_id IS NOT NULL AND deadline_at IS NOT NULL)),
 ADD CONSTRAINT ck_dispatch_guard_provider CHECK((state='sent' AND provider_message_id IS NOT NULL) OR (state<>'sent' AND provider_message_id IS NULL)),
 ADD KEY ix_dispatch_guard_recovery(tenant_id,state,deadline_at,intent_id)`,
 `ALTER TABLE connector_dispatch_request DROP CHECK ck_dispatch_request_operation,
 ADD CONSTRAINT ck_dispatch_request_operation CHECK(operation IN ('connector-prepare','connector-cancel','connector-begin','attempt-result'))`,
 `CREATE TABLE connector_attempt_event (
 tenant_id ${id} NOT NULL, intent_id ${id} NOT NULL, version BIGINT UNSIGNED NOT NULL,
 state VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, fence_id ${id} NOT NULL,
 provider_message_id VARCHAR(255) COLLATE utf8mb4_0900_as_cs NULL, created_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id,intent_id,version),
 CONSTRAINT fk_attempt_event_guard FOREIGN KEY(tenant_id,intent_id) REFERENCES connector_dispatch_guard(tenant_id,intent_id),
 CONSTRAINT ck_attempt_event_version CHECK(version>=1),
 CONSTRAINT ck_attempt_event_state CHECK(state IN ('admitting','started','unknown','sent')),
 CONSTRAINT ck_attempt_event_provider CHECK((state='sent' AND provider_message_id IS NOT NULL) OR (state<>'sent' AND provider_message_id IS NULL))
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='Connector; append-only tenant attempt state and fence audit, never send authority'`,
];
