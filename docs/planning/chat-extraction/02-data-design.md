# T02 — Schema, ledger partition và migration design

Thuộc SRC-109 / PLAN-057. Dependency **T01 DONE**. [Quy tắc chung](../chat-extraction-execution.md), [tracker](../../tracking/tasks.md), [handoff](../../tracking/chat-extraction-handoff.md). Chỉ design/DDL artifact chưa áp dụng; không main migration/copy/cutover.

## Đọc đúng phạm vi

[Source storage audit](../../architecture/chat-data-extraction.md), [review input](../../architecture/chat-storage-review.json), contracts T01, [schema catalog](../../data/schema-catalog.md), [guideline](../../data/database-guidelines.md), [table template](../../templates/database-table.md), [ownership](../../data/service-ownership.md), [D3 gate](../../contracts/chat-extraction-runtime.md).

## Công việc và đầu ra

1. Chốt target dictionary/DDL và điền đầy đủ table template cho36Chat source tables,8partitioned candidates, own journal và mọi ledger/projection mới thực sự cần theo T01. Không mặc định số target tables bằng45; giải thích gộp/bỏ/thêm theo semantics, không copy schema mù.
2. Chốt explicit row predicates cho audit_entry/idempotency_record/outbox_event/consumer_inbox, đối chiếu command/event/consumer T01. Giữ note/Sales outcome/generic assignment/legacy thread keys; unknown executable row phải dừng migration, không âm thầm bỏ. Historical archive được định nghĩa rõ quyền/retention/routing.
3. Registry/index/history/share chọn đúng same-tenant Conversation set, gồm archived rows; validate subtype mismatch. Duyệt75FK theo rows: remote references thay bằng hợp đồng kiểm/reconcile,6non-Chat subtype FKs giữ baseline; inbox không FK sang remote producer outbox.
4. Chốt grants riêng API/worker/migrator, registered system tenant, indexes theo query patterns, decimal/date/JSON/charset/checksum, retention/backup/restore. Không default tenant hoặc runtime DDL.
5. Viết algorithm retained backfill có snapshot/watermark/checkpoint/resume, tenant/count/hash/reference/version validation; explicit source/destination credentials và môi trường. Source read access chỉ dành migration operator, không runtime service.
6. Chốt fencing toàn bộ old writers, pending/in-flight message receipts và event consumers; phân biệt rollback trước/sau destination writes. Reverse replay/reconciliation phải mô tả cả side effects mới ở downstream owners; không chỉ copy ngược bảng Chat. Chọn strategy thực thi được và tiêu chí NO_GO.

## Tiêu chí hoàn tất

- Mỗi target table có template, exact columns/keys/grants/rollback/fixture; không sửa lịch sử migration baseline.
- T01 contracts và schema tương thích; không còn pending four-ledger partition để đẩy cho migration coder tự đoán.
- Có migration manifest và acceptance matrix đủ cụ thể để T03 triển khai; chọn fixtures retained và old/new binary compatibility.
- Docs/DDL/schema static checks thực sự có đạt; native copy/DB test vẫn NOT_RUN.
- Đối chiếu **toàn D3-01**, chỉ đánh gate đạt1/6 nếu cả contract/capability/table/backfill/rollback đã đầy đủ.

Handoff ghi exact schema/manifest versions và danh sách file migrations dự kiến/chưa áp dụng. Local2/17. Dừng sau T02.
