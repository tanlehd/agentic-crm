# Thay đổi trong lúc build và đồng bộ tài liệu

Status: Ready for implementation. Áp dụng cho mọi task sinh source.

## Nguồn chuẩn và thời điểm cập nhật

Module design định nghĩa hành vi; data dictionary định nghĩa persisted state; contract định nghĩa wire shape; ADR định nghĩa quyết định xuyên module; tracker định nghĩa trạng thái công việc. Code phải hội tụ về thiết kế cuối cùng được ghi lại, không để “chỉ biết trong chat”.

Khi phát hiện mismatch: ghi change trong execution log, xác định affected docs/tasks, sửa thiết kế liên quan trước khi tiếp tục code phụ thuộc. Thay đổi nhỏ trong cùng phiên có thể đi cùng patch; không hoãn docs đến cuối milestone. Nếu code đã làm lộ vấn đề thiết kế, cập nhật spec + test trước khi hoàn tất task.

## Phân loại

| Loại | Ví dụ | Cách xử lý |
|---|---|---|
| C1 — implementation detail | Tách class, tối ưu index không đổi hành vi, pin package | Tự xử lý, ghi task/evidence; cập nhật technical doc nếu người sau cần biết; ADR chỉ khi ảnh hưởng kiến trúc |
| C2 — thiết kế/contract tương thích | Thêm optional field, điều chỉnh timeout có lý do, bổ sung physical constraint | CHANGE entry, cập nhật contract/model/AC trước code; ghi migration và compatibility; không xin lại quyết định đã nằm trong scope |
| C3 — thay đổi nghiệp vụ/phá vỡ | Đổi Customer semantics, owner types, tenant model, bỏ permission, API breaking | Ghi đề xuất/impact, đưa lựa chọn cho người dùng; task phụ thuộc WAITING_DECISION, tiếp tục task độc lập nếu có |
| Defect | Code không tuân contract đã chốt | Sửa code + regression test; không đổi spec chỉ để hợp thức hóa bug |

Không phải mọi ADR đều cần phê duyệt riêng. Chỉ dừng phần công việc phụ thuộc nếu thay đổi cần quyết định nghiệp vụ thật sự; không chặn toàn bộ dự án khi còn việc độc lập.

## Checklist theo loại thay đổi

| Thay đổi | Tài liệu phải rà |
|---|---|
| Object/field/FK/index | dictionary, ERD/model, module, migration note, API nếu exposed, AC |
| API/event/tool | contracts, consumer/module, schema/generated client, idempotency/version compatibility, AC |
| Quyền/seat/team/AI policy | security, identity/agents, role fixtures, field filter/export, negative tests |
| State machine/timeout | module, workflow/chatflow graph, events, UX, fixtures/KPI, recovery tests |
| UI hành vi | workspace spec, API mapping, loading/error/permission states, browser tests |
| Docker/runtime/config | Docker doc, architecture/ADR, env example, health/migration scripts, CI và runbook |
| Scope/milestone/dependency | build plan, roadmap, task dependencies, checkpoint; không tự đánh DONE task bị bỏ |

## Task states

`TODO → READY → IN_PROGRESS → VERIFYING → DONE`. `BLOCKED` cho dependency/hạ tầng; `WAITING_DECISION` cho quyết định người dùng; `CANCELLED` phải có reason/replacement. Khi đổi kế hoạch từ DONE, tạo follow-up/defect task thay vì xóa evidence lịch sử.

READY cần dependency DONE và spec Ready. DONE cần deliverable, test evidence, docs sync và cập nhật checkpoint. AC trải nhiều milestone phải ghi sub-scope (`AC-03/M1`), không đóng toàn ID từ một test nhỏ. Owner dùng `unassigned` đến khi có người/agent thật claim.

## Checkpoint nhiều ngày

Đầu phiên: đọc checkpoint và tracker; kiểm tra files/branch/runtime thực tế, coi checkpoint là gợi ý đã ghi chứ không thay fresh inspection. Không chạy lại lệnh phá hủy từ log.

Cuối phiên: ghi task, worktree/commit thật nếu có, file đã đổi, test pass/fail/not-run, services đang chạy, blockers, change IDs và đúng một next action rõ. Không tính thời gian chờ người dùng thành công việc đã hoàn tất. Không tự tạo reminder/automation chỉ vì task kéo dài nhiều ngày.

## CHANGE entry tối thiểu

ID `CHG-YYYYMMDD-NN`, task, vấn đề/bằng chứng, classification, quyết định, tài liệu ảnh hưởng, migration/compatibility, tests và trạng thái resolved/pending. Lưu trong [execution log](../tracking/log.md); ADR mới khi đổi lựa chọn xuyên module. Không cần tạo một hệ thống ticket bên ngoài để bắt đầu.
