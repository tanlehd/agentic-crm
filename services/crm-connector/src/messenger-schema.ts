// Additive lineage2; schema1 SQL/checksum remains immutable.
export const messengerStatements = [
 `CREATE TABLE connector_meta_page (
 id CHAR(36) CHARACTER SET ascii PRIMARY KEY, tenant_id CHAR(36) CHARACTER SET ascii NOT NULL,
 app_id VARCHAR(32) CHARACTER SET ascii NOT NULL,page_id VARCHAR(32) CHARACTER SET ascii NOT NULL,
 status ENUM('active','disabled') NOT NULL DEFAULT 'active',
 UNIQUE KEY asset(app_id,page_id),UNIQUE KEY tenant_binding(tenant_id,id)) ENGINE=InnoDB`,
 `CREATE TABLE connector_meta_event (
 id CHAR(36) CHARACTER SET ascii PRIMARY KEY,tenant_id CHAR(36) CHARACTER SET ascii NOT NULL,
 binding_id CHAR(36) CHARACTER SET ascii NOT NULL,event_key CHAR(64) CHARACTER SET ascii NOT NULL,
 digest CHAR(64) CHARACTER SET ascii NOT NULL,normalized JSON NOT NULL,
 kind VARCHAR(32) CHARACTER SET ascii NOT NULL,stream ENUM('messaging','standby') NOT NULL,
 status ENUM('captured','attention') NOT NULL,created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY event_scope(tenant_id,binding_id,id), UNIQUE KEY event_key(tenant_id,binding_id,event_key),KEY work(status,created_at),
 FOREIGN KEY(tenant_id,binding_id) REFERENCES connector_meta_page(tenant_id,id),CHECK(JSON_TYPE(normalized)='OBJECT')) ENGINE=InnoDB`,
 `CREATE TABLE connector_meta_audit (
 id CHAR(36) CHARACTER SET ascii PRIMARY KEY,tenant_id CHAR(36) CHARACTER SET ascii NOT NULL,
 binding_id CHAR(36) CHARACTER SET ascii NOT NULL,event_id CHAR(36) CHARACTER SET ascii NOT NULL,
 action VARCHAR(32) CHARACTER SET ascii NOT NULL,created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 FOREIGN KEY(tenant_id,binding_id,event_id) REFERENCES connector_meta_event(tenant_id,binding_id,id)) ENGINE=InnoDB`,
];
