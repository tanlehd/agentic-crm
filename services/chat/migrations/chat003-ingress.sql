CREATE TABLE chat_ingress_contact_head (
  tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  contact_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (tenant_id,contact_id),
  CONSTRAINT ck_chat_ingress_contact_head_tenant CHECK (tenant_id NOT IN ('01900000-0000-7000-8000-000000000001','00000000-0000-0000-0000-000000000000',''))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Contact-key mutex for ingress and archive fencing';

CREATE TABLE chat_ingress_inbox (
  tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  connection_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  contact_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  identity_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  provider_event_id VARCHAR(255) NOT NULL,
  event_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  binding_json JSON NOT NULL,
  intake_json JSON NOT NULL,
  state VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  conversation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  message_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  duplicate TINYINT UNSIGNED NULL,
  error_code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL,
  version BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (tenant_id,id),
  UNIQUE KEY uq_chat_ingress_event (tenant_id,connection_id,provider_event_id),
  UNIQUE KEY uq_chat_ingress_connection_receipt (tenant_id,connection_id,id),
  KEY ix_chat_ingress_pending (tenant_id,state,created_at,id),
  CONSTRAINT ck_chat_ingress_inbox_tenant CHECK (tenant_id NOT IN ('01900000-0000-7000-8000-000000000001','00000000-0000-0000-0000-000000000000','')),
  CONSTRAINT ck_chat_ingress_inbox_state CHECK ((state='received' AND conversation_id IS NULL AND message_id IS NULL AND duplicate IS NULL AND error_code IS NULL) OR (state='processed' AND conversation_id IS NOT NULL AND message_id IS NOT NULL AND duplicate IS NOT NULL AND duplicate IN (0,1) AND error_code IS NULL) OR (state='failed' AND conversation_id IS NULL AND message_id IS NULL AND duplicate IS NULL AND error_code IS NOT NULL AND error_code IN ('CONTACT_BINDING_STALE','REVOKED','MESSAGE_PAYLOAD_CONFLICT'))),
  CONSTRAINT ck_chat_ingress_inbox_version CHECK (version>=1),
  CONSTRAINT ck_chat_ingress_inbox_json CHECK (JSON_TYPE(binding_json)='OBJECT' AND JSON_TYPE(intake_json)='OBJECT')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Immutable normalized ingress event and durable processing receipt';

CREATE TABLE chat_ingress_delivery (
  tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  connection_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_delivery_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  receipt_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  event_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (tenant_id,connection_id,source_delivery_id),
  KEY ix_chat_ingress_delivery_receipt (tenant_id,connection_id,receipt_id),
  CONSTRAINT ck_chat_ingress_delivery_tenant CHECK (tenant_id NOT IN ('01900000-0000-7000-8000-000000000001','00000000-0000-0000-0000-000000000000','')),
  CONSTRAINT fk_chat_ingress_delivery_receipt FOREIGN KEY (tenant_id,connection_id,receipt_id) REFERENCES chat_ingress_inbox(tenant_id,connection_id,id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Permanent source delivery alias without transcript';

CREATE TABLE chat_ingress_request (
  tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  connection_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  operation VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  request_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  receipt_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  request_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (tenant_id,connection_id,operation,request_id),
  KEY ix_chat_ingress_request_receipt (tenant_id,connection_id,receipt_id),
  CONSTRAINT ck_chat_ingress_request_tenant CHECK (tenant_id NOT IN ('01900000-0000-7000-8000-000000000001','00000000-0000-0000-0000-000000000000','')),
  CONSTRAINT ck_chat_ingress_request_operation CHECK (operation IN ('ingress-accept','ingress-read')),
  CONSTRAINT fk_chat_ingress_request_receipt FOREIGN KEY (tenant_id,connection_id,receipt_id) REFERENCES chat_ingress_inbox(tenant_id,connection_id,id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Immutable accept request digest and receipt';
