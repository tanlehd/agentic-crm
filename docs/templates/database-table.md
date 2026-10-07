# Table design template

Copy vào design của task, điền hết trước migration. Theo [guideline](../data/database-guidelines.md), [catalog](../data/schema-catalog.md). Đây là mẫu review, không tự tạo table.

| Mục bắt buộc | Nội dung cần điền |
|---|---|
| Task / requirement / acceptance | ID và liên kết |
| Tên table / schema đích | Lowercase; target owner trong catalog |
| Physical current | Monolith hay extracted; lý do chưa move nếu có |
| Service writer / aggregate | Ai được mutate, transaction nào chứa effect |
| Ý nghĩa / không thuộc phạm vi | Một câu về sự thật bảng lưu; không chỉ tên UI |
| Loại dữ liệu | Source of truth / immutable ledger / rebuildable projection |
| Scope | business hoặc system; nguồn TenantContext, chặn wrong-scope |
| Cột | type/length/null/default/unit/meaning, tenant_id NOT NULL |
| Keys / constraints | PK, tenant natural uniqueness, FK same-tenant, CHECK |
| Remote references | Owning API/event/version, unavailable/reconcile behavior |
| Query patterns / indexes | SQL shape, pagination, EXPLAIN và expected cardinality |
| Quyền | resource.action, own/team/all, field deny, live revision |
| Concurrent writes | CAS/version, idempotency, lock order, retry/fence |
| Audit / outbox | Atomic effect + event, minimization, tenant routing |
| PII / secret / retention | Hash/encryption, key owner, archive/purge/restore |
| DB grants | Runtime DML, credential reader, migration role |
| Migration | Expand/backfill/checkpoint/validation/cutover; no reset |
| Compatibility / rollback | Old/new binary/schema, forward fix, reconciliation |
| Test fixtures | Reusable test tenant/user; preexisting data and two tenants |
| Evidence | Commands/environment/artifacts; NOT_RUN đến khi chạy thật |

Ví dụ tối thiểu **tham khảo shape, không phải migration được áp dụng**:

```sql
CREATE TABLE crm_core.contact_label (
  tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  label_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  version BIGINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (tenant_id,id),
  UNIQUE KEY uq_contact_label_key (tenant_id,label_key),
  CONSTRAINT ck_contact_label_version CHECK (version >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs
  COMMENT='CRM Core; business tenant label catalog';
```

Link table sẽ có `(tenant_id,contact_id,label_id)` và FK tới Contact/label cùng tenant trong Core; không FK sang Identity tenant hoặc Chat. Actual Contact PK baseline là record_id, task phải dùng đúng schema/version, không copy ví dụ thành FK(id) sai. Không tự triển khai feature label chỉ vì template có ví dụ.
