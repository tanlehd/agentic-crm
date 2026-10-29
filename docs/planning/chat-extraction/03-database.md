# T03 — Database, grants và retained migration

Thuộc SRC-109 / PLAN-057. Dependency **T02 DONE và D3-01 đạt**. [Quy tắc chung](../chat-extraction-execution.md), [tracker](../../tracking/tasks.md), [handoff](../../tracking/chat-extraction-handoff.md).

## Đọc và triển khai

Đọc exact dictionary/templates/manifest của T02, [database guideline](../../data/database-guidelines.md), [schema catalog](../../data/schema-catalog.md) và [D3 gates](../../contracts/chat-extraction-runtime.md). Dùng contract đã chốt; discrepancy phải sửa design trước code liên quan.

1. Tạo schema/migration lineage Chat và restricted credentials theo catalog, có retained test environment riêng. Không chạy domain writers trên bản copy main khi main vẫn authority.
2. Implement immutable migrations, status/no-op và provisioning tách khỏi runtime. Mọi bảng có tenant_id NOT NULL kể cả journal; explicit system scope đúng design.
3. Implement backfill/resume/reconcile theo exact row partitions T02. Source operator có read-only access; Chat runtime chỉ own database. Snapshot phải nhất quán; ghi schema/watermark/source fingerprint và không xuất transcript/secret ra evidence.
4. Thực hiện migration và interruption/resume trên fixture đã có dữ liệu. Kiểm tenant/count/hash/UUID/version/custom values/history/FK logical refs; kiểm migrations cũ không đổi checksum.
5. Native test runtime role bị từ chối cross-database SQL, wrong-tenant và DDL. Implement/verify data recovery primitives của T02 trên retained fixture; main cutover giữ ở T09.

## Tiêu chí hoàn tất

- Own database có dữ liệu hợp lệ theo manifest và migrations chạy lại không làm đổi dữ liệu/journal cũ.
- Backfill interruption/resume không nhân bản/mất rows; unresolved executable partition/ref dẫn NO_GO rõ ràng.
- Native persistence/grants/preservation checks đạt bằng SQL thực, không chỉ mocked repository.
- Có lệnh thực tế/script/runbook và artifact cho T04; không đoán package/scripts chưa được tạo. Chỉ chạy preservation trên final migration candidate, rerun khi candidate đổi.

Gate D3-02 có thể đạt, lũy kế2/6; local vẫn2/17. Handoff ghi DB/schema/journal/fixture/watermark/grant refs không chứa mật khẩu, process nào còn chạy và việc chưa áp dụng ở main. Dừng sau T03; không chuyển traffic hay tự commit.
