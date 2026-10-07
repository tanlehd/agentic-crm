# Quy trình tài liệu trước implementation

Status: Ready for implementation.

## Luồng thay đổi

1. Ghi yêu cầu và tác động vào roadmap; tạo hoặc cập nhật `REQ-*`.
2. Sửa module design, data dictionary và UX liên quan. Quyết định xuyên module phải có ADR.
3. Sửa API/event/runtime contract và acceptance scenario trước code. Ghi migration/compatibility nếu thay schema hoặc contract đã được dùng.
4. Chuyển đúng phạm vi từ Draft sang Ready khi không còn quyết định nghiệp vụ chặn triển khai.
5. Implement theo contract; kiểm thử tenant isolation, permission, idempotency và lỗi thực tế liên quan.
6. Cập nhật tài liệu theo hành vi cuối cùng; chỉ ghi Implemented kèm PR/commit, test evidence và giới hạn đã biết.

Không đánh dấu toàn module Implemented nếu chỉ một capability hoàn tất. Không sinh source từ phần Draft, TODO hoặc ví dụ payload không normative.

## Database gate cho mọi tính năng mới

Trước code bảng/cột mới, dùng [schema catalog](../data/schema-catalog.md), [database guideline](../data/database-guidelines.md) và điền [table design template](../templates/database-table.md). Chỉ rõ current physical/target schema, owner, business/system scope, tenant_id NOT NULL, keys/ACL và migration/tests. Không tái sử dụng ngoại lệ account/journal legacy hoặc Keycloak target.

## Definition of Ready

- Actor, hành vi, trạng thái, quyền và phạm vi tenant được định nghĩa.
- Entity/relationship và uniqueness/transaction boundary được xác định.
- Command/event có input/output, lỗi, retry và concurrency policy.
- UI cần thiết có trạng thái empty/loading/error/forbidden và hành động chính.
- Requirement có acceptance ID, fixture và kết quả mong đợi.
- Không để business rule ẩn trong mẫu code hoặc giả định của người implement.

## Definition of Done

Ready + code/migration phù hợp + test đã chạy + rollout/rollback tương ứng + tài liệu đồng bộ. Report kết quả phải phân biệt test thực thi và test mới chỉ được thiết kế.

## Làm việc qua nhiều phiên

Tuân [AGENTS](../../AGENTS.md) và [change control](change-control.md). Đầu phiên đọc [tracker](../tracking/tasks.md)/[checkpoint](../tracking/checkpoint.md), claim task đủ dependency; cuối phiên cập nhật status, evidence, docs changed và next action trong execution log. Không cần chờ hoàn tất milestone mới ghi tài liệu.

Task source và document readiness tách biệt. `Ready for implementation` không phải code đã xong; task DONE chỉ đóng đúng AC sub-scope đã test. Thay đổi domain/API/data/permission phải cập nhật nguồn chuẩn trước khi tiếp tục implementation phụ thuộc.

## Quy ước

- Markdown UTF-8, đường dẫn chữ thường, Mermaid cho sơ đồ; link nội bộ tương đối.
- `REQ-*` yêu cầu; `MOD-*` module; `AC-*` nghiệm thu; `ADR-*` quyết định; `B-*` backlog.
- Status của file có thể chia theo capability/milestone. Bản đồ tài liệu là entrypoint, module/contract giữ chi tiết.
- Contract là nguồn chuẩn wire shape; dictionary là nguồn chuẩn persisted field. Ví dụ phải tuân contract, không tự thêm luật.
- Không ghi secret hoặc dữ liệu bệnh nhân thật vào repository. Fixtures phải dùng dữ liệu tổng hợp.
- Kiểm tra link và Mermaid khi sửa docs; schema/permission/event thay đổi cần rà lại traceability.

## PR checklist

Nêu vấn đề và hành vi sau thay đổi, link REQ/design/AC, phạm vi schema/contract, test đã chạy, migration và rủi ro còn lại. Với tài liệu thuần túy chỉ báo kiểm tra tài liệu, không tuyên bố tính năng đã hoạt động.
