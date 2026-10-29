// Forward4: guard all new staging/preparation/cancellation writers before traffic activation.
const id = 'CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
export const preparationStatements = [
 `CREATE TABLE connector_dispatch_guard (
 tenant_id ${id} NOT NULL, intent_id ${id} NOT NULL, attempt_id ${id} NOT NULL,
 conversation_id ${id} NOT NULL, crm_contact_id ${id} NOT NULL, connection_id ${id} NOT NULL,
 principal_id ${id} NOT NULL, delegation_id ${id} NOT NULL,
 actor_kind VARCHAR(5) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 owner_revision DECIMAL(20,0) NOT NULL, record_version DECIMAL(20,0) NOT NULL,
 payload_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 state VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 cancellation_id ${id} NULL, cancellation_reason VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL,
 version BIGINT UNSIGNED NOT NULL DEFAULT 1, created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id,intent_id), UNIQUE KEY uq_dispatch_guard_attempt(tenant_id,attempt_id),
 CONSTRAINT ck_dispatch_guard_actor CHECK(actor_kind IN ('human','ai')),
 CONSTRAINT ck_dispatch_guard_version CHECK(version>=1 AND owner_revision>0 AND record_version>0),
 CONSTRAINT ck_dispatch_guard_state CHECK(state IN ('staged','prepared','cancelled')),
 CONSTRAINT ck_dispatch_guard_cancel CHECK(
  (state='cancelled' AND cancellation_id IS NOT NULL AND cancellation_reason IS NOT NULL AND cancellation_reason IN ('owner_changed','conversation_closed','authorization_revoked')) OR
  (state<>'cancelled' AND cancellation_id IS NULL AND cancellation_reason IS NULL))
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='Connector; tenant intent preparation mutex and terminal cancellation tombstone'`,
 `CREATE TABLE connector_dispatch_request (
 tenant_id ${id} NOT NULL, request_id ${id} NOT NULL, intent_id ${id} NOT NULL,
 operation VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 request_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, created_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id,operation,request_id), KEY ix_dispatch_request_intent(tenant_id,intent_id),
 CONSTRAINT fk_dispatch_request_guard FOREIGN KEY(tenant_id,intent_id) REFERENCES connector_dispatch_guard(tenant_id,intent_id),
 CONSTRAINT ck_dispatch_request_operation CHECK(operation IN ('connector-prepare','connector-cancel'))
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='Connector; immutable Chat preparation and cancellation request receipts'`,
 `INSERT INTO connector_dispatch_guard
 (tenant_id,intent_id,attempt_id,conversation_id,crm_contact_id,connection_id,principal_id,delegation_id,actor_kind,owner_revision,record_version,payload_digest,state,version,created_at,updated_at)
 SELECT tenant_id,intent_id,attempt_id,conversation_id,crm_contact_id,connection_id,principal_id,delegation_id,actor_kind,owner_revision,record_version,payload_digest,'staged',1,created_at,created_at FROM connector_dispatch_payload`,
];
