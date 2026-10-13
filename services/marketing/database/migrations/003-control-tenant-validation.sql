-- Forward validation for control rows; do not rewrite journaled version2 statements.
ALTER TABLE marketing_operation_receipt ADD CONSTRAINT ck_marketing_receipt_tenant_uuid CHECK (tenant_id REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

ALTER TABLE marketing_change_clock ADD CONSTRAINT ck_marketing_clock_tenant_uuid CHECK (tenant_id REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
