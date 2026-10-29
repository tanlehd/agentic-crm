// Forward-only schema3. No changes to applied Connector1/2.
const id = 'CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL';
const digest = 'CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL';
export const payloadStatements = [
 `CREATE TABLE connector_dispatch_payload (
 tenant_id ${id}, intent_id ${id}, attempt_id ${id}, conversation_id ${id}, crm_contact_id ${id},
 connection_id ${id}, principal_id ${id}, delegation_id ${id}, grant_id ${id},
 actor_kind VARCHAR(5) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 owner_revision DECIMAL(20,0) NOT NULL, record_version DECIMAL(20,0) NOT NULL,
 payload_digest ${digest}, binding_digest ${digest}, payload JSON NOT NULL, created_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id,intent_id), UNIQUE KEY uq_dispatch_payload_attempt(tenant_id,attempt_id),
 CONSTRAINT ck_dispatch_payload_actor CHECK(actor_kind IN ('human','ai')),
 CONSTRAINT ck_dispatch_payload_revision CHECK(owner_revision>0 AND record_version>0),
 CONSTRAINT ck_dispatch_payload_body CHECK(JSON_TYPE(payload)='OBJECT' AND OCTET_LENGTH(CAST(payload AS CHAR CHARACTER SET utf8mb4))<=65536)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='Connector; immutable business tenant staged payload, no send permission'`,
 `CREATE TABLE connector_payload_request (
 tenant_id ${id}, request_id ${id}, intent_id ${id}, request_digest ${digest}, created_at DATETIME(6) NOT NULL,
 PRIMARY KEY(tenant_id,request_id), KEY ix_payload_request_intent(tenant_id,intent_id),
 CONSTRAINT fk_payload_request_intent FOREIGN KEY(tenant_id,intent_id) REFERENCES connector_dispatch_payload(tenant_id,intent_id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='Connector; immutable Chat payload-put request digest and receipt'
 `,
];
