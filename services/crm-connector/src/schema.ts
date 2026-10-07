import type { Pool } from 'mysql2/promise';
import { messengerStatements } from './messenger-schema.js';
import { hash } from './validation.js';
export const statements = [
 `CREATE TABLE connector_connection (
 id CHAR(36) CHARACTER SET ascii PRIMARY KEY, tenant_id CHAR(36) CHARACTER SET ascii NOT NULL,
 token_hash CHAR(64) CHARACTER SET ascii NOT NULL UNIQUE, remote_connection_id CHAR(36) CHARACTER SET ascii NOT NULL,
 remote_token_env VARCHAR(128) CHARACTER SET ascii NOT NULL, status ENUM('active','disabled') NOT NULL DEFAULT 'active',
 UNIQUE KEY tenant_connection(tenant_id,id)) ENGINE=InnoDB`,
 `CREATE TABLE connector_delivery (
 id CHAR(36) CHARACTER SET ascii PRIMARY KEY, tenant_id CHAR(36) CHARACTER SET ascii NOT NULL,
 connection_id CHAR(36) CHARACTER SET ascii NOT NULL, provider_event_id VARCHAR(255) COLLATE utf8mb4_0900_as_cs NOT NULL,
 payload_hash CHAR(64) CHARACTER SET ascii NOT NULL, payload JSON NOT NULL,
 status ENUM('queued','forwarded','completed','blocked','attention') NOT NULL DEFAULT 'queued',
 attempts INT UNSIGNED NOT NULL DEFAULT 0, errors INT UNSIGNED NOT NULL DEFAULT 0,
 lease_until DATETIME(6), next_attempt_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 fencing_token BIGINT UNSIGNED NOT NULL DEFAULT 0, remote_delivery_id CHAR(36) CHARACTER SET ascii,
 error_code VARCHAR(64) CHARACTER SET ascii, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY delivery_scope(tenant_id,connection_id,id), UNIQUE KEY event_key(tenant_id,connection_id,provider_event_id), KEY work(status,next_attempt_at,lease_until),
 FOREIGN KEY(tenant_id,connection_id) REFERENCES connector_connection(tenant_id,id),
 CHECK(JSON_TYPE(payload)='OBJECT')) ENGINE=InnoDB`,
 `CREATE TABLE connector_audit (
 id CHAR(36) CHARACTER SET ascii PRIMARY KEY, tenant_id CHAR(36) CHARACTER SET ascii NOT NULL,
 connection_id CHAR(36) CHARACTER SET ascii NOT NULL, delivery_id CHAR(36) CHARACTER SET ascii NOT NULL,
 action VARCHAR(32) NOT NULL, status VARCHAR(32) NOT NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 FOREIGN KEY(tenant_id,connection_id,delivery_id) REFERENCES connector_delivery(tenant_id,connection_id,id),
 FOREIGN KEY(tenant_id,connection_id) REFERENCES connector_connection(tenant_id,id)) ENGINE=InnoDB`,
];
export const checksum=hash(statements.join('\n'));
export const migrations=[{version:1,name:'durable_ingress',checksum,statements},{version:2,name:'messenger_capture',checksum:hash(messengerStatements.join('\n')),statements:messengerStatements}];
function validateJournal(rows:any[],complete:boolean){
 if(rows.length>migrations.length||(complete&&rows.length!==migrations.length))throw new Error('CONNECTOR_SCHEMA_MISMATCH');
 for(let i=0;i<rows.length;i++){const expected=migrations[i]!,r=rows[i];if(r.version!==expected.version||r.name!==expected.name||r.checksum!==expected.checksum||r.state!=='applied')throw new Error('CONNECTOR_SCHEMA_MISMATCH');}
}
export async function ready(pool:Pool){
 const [rows]=await pool.query<any[]>('SELECT version,name,checksum,state FROM connector_schema_migration ORDER BY version');
 validateJournal(rows,true);
}
export async function migrate(pool:Pool){
 const c=await pool.getConnection();let locked=false;
 try {
  const [rows]=await c.query<any[]>("SELECT GET_LOCK(SHA2(CONCAT(DATABASE(),':connector:migrate'),256),10) acquired");
  if(Number(rows[0].acquired)!==1)throw new Error('MIGRATION_LOCK_UNAVAILABLE');locked=true;
  await c.query("CREATE TABLE IF NOT EXISTS connector_schema_migration (version INT PRIMARY KEY,name VARCHAR(128) NOT NULL,checksum CHAR(64) NOT NULL,state ENUM('applying','applied') NOT NULL) ENGINE=InnoDB");
  const [columns]=await c.query<any[]>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='connector_schema_migration' AND COLUMN_NAME='tenant_id'");
  if(!columns.length)await c.query("ALTER TABLE connector_schema_migration ADD tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '01900000-0000-7000-8000-000000000001', ADD CONSTRAINT ck_connector_journal_tenant CHECK(tenant_id='01900000-0000-7000-8000-000000000001')");
  const [journal]=await c.query<any[]>('SELECT * FROM connector_schema_migration ORDER BY version');validateJournal(journal,false);
  for(const migration of migrations.slice(journal.length)){
   await c.query("INSERT INTO connector_schema_migration(tenant_id,version,name,checksum,state) VALUES ('01900000-0000-7000-8000-000000000001',?,?,?,'applying')",[migration.version,migration.name,migration.checksum]);
   for(const sql of migration.statements)await c.query(sql);
   await c.query("UPDATE connector_schema_migration SET state='applied' WHERE version=?",[migration.version]);
  }
  return migrations.length-journal.length;
 }finally {if(locked)await c.query("SELECT RELEASE_LOCK(SHA2(CONCAT(DATABASE(),':connector:migrate'),256))");c.release();}
}
