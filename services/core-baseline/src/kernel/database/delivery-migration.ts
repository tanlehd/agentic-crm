import type { Migration } from './migrations.js';
export const deliveryMigration: Migration = {version:5,name:'delivery_inbox_and_receipt_expiry',statements:[
  `CREATE TABLE consumer_inbox (
    tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    consumer_name VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    event_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    status VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    processed_at DATETIME(6) NULL,
    PRIMARY KEY(tenant_id,consumer_name,event_id),
    FOREIGN KEY(tenant_id,event_id) REFERENCES outbox_event(tenant_id,id),
    CHECK ((status='processing' AND processed_at IS NULL) OR (status='completed' AND processed_at IS NOT NULL))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs`,
  'ALTER TABLE idempotency_record ADD expires_at DATETIME(6) NULL, ADD INDEX ix_receipt_expiry(expires_at)',
  "UPDATE idempotency_record SET expires_at=TIMESTAMPADD(DAY,7,updated_at) WHERE status='completed'",
  'ALTER TABLE outbox_event ADD INDEX ix_outbox_lease(status,lease_until)',
]};
