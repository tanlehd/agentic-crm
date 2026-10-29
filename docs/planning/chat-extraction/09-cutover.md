# T09 — Chuyển traffic local và đạt 3/14

**Scope CHG-20261023-19 / ADR-029:** [Nghiệm thu theo owner và rollout tối thiểu](../../governance/service-delivery-scope.md). Cutover Chat và đúng các unit route/adapter/old-writer fence cần thay đổi đã liệt kê trong T08. Mỗi unit có lý do, pins, lệnh tác động, smoke và rollback. Dùng dependency đang tương thích; không rollout toàn stack hoặc triển khai thêm nghiệp vụ consumer để đóng Chat.

**Phạm vi hiện hành CHG-20261019-23:** [Human-first](../human-first-omni-crm.md). Có thể đóng SRC-109 sau đủ 6 gate cho Human mà không triển khai AI native. Full parity theo phạm vi đã phân loại T08; writer fences, dữ liệu/receipts/control AI hiện có và recovery không được bỏ. Chỉ báo DONE cho D3 Human-first; AI native vẫn hoãn.

Thuộc SRC-109 / PLAN-057. Dependency **T08 DONE và D3-01…05 đạt**. [Quy tắc chung](../chat-extraction-execution.md), [tracker](../../tracking/tasks.md), [handoff](../../tracking/chat-extraction-handoff.md). Prompt của bước này yêu cầu thực hiện local cutover; không suy quyền production/commit/push từ kế hoạch.

## Phạm vi và đầu ra

CHG-20261026-01: theo yêu cầu người dùng, trạng thái cuối phải xóa job/worker và đường ghi Chat cũ đã được thay thế khỏi source, registration, launch configuration và tài liệu hiện hành. Stop/drain chỉ là bước chuyển dữ liệu tạm thời, không giữ hai implementation bằng feature flag. Shared worker chỉ giữ công việc thuộc owner còn dùng; adapter tương thích gọi Chat qua contract. Không xóa dữ liệu/receipts hoặc sửa migration lịch sử. Inventory từng đường ghi phải ghi replacement/removal và bằng chứng không còn caller trước khi xóa.

1. Đọc release candidate/runbook/evidence T08, kiểm source/image/schema/config còn khớp, environment là local, backup/recovery artifacts còn dùng được, TLS/cert và dependencies hiện tại. Input thay đổi làm evidence cũ không còn đúng thì chạy lại phần liên quan trước switch.
2. Thực hiện explicit old-writer stop/fence/drain theo toàn writer inventory: public/generic routes, ingress/outbound, retry/timers, consumers, Workflow/AI/Sales callbacks và admin/bootstrap jobs. Không dừng monitor một cách gián tiếp rồi làm mất mọi child process.
3. Final consistent copy/catch-up/reconcile: tenant/count/hash/UUID/version/custom fields/history, pending/unknown sends, receipts/events/watermarks và remote logical refs. Unresolved executable row hoặc writer chưa fence là NO_GO.
4. Enable đúng một Chat writer, chuyển app local routes và workers tới own Chat DB/endpoint. Baseline retained copies chỉ theo strategy T02, không fallback tự ghi lại khi Chat outage.
5. Nghiệm thu main local representative flows trên synthetic retained data: ingress→takeover→send/status, workspace/session và Chat publication/inbox checks và compatibility checks trực tiếp liên quan switch theo bảng owner T08; không bắt downstream business E2E. Verify grants không cho runtime cross-DB; status/image/schema đúng candidate.
6. Thực hiện restart và freeze + forward recovery/reapply bằng strategy T02 đã rehearsal, **có writes sau switch**. Đối soát không mất dữ liệu/duplicate effect, giữ downstream refs/receipts và cùng Chat database; không quay lại baseline stale. Nếu fail, giữ task chưa DONE; không reset DB/volume để khôi phục nhanh.
7. Đồng bộ sơ đồ hiện trạng/đích, service descriptors, README, build plan, catalog/ownership, runbook, tracker/log/checkpoint/handoff. Báo services/process đang chạy, image/schema refs và thao tác operator còn lại nếu có.

## Tiêu chí hoàn tất

- Main app thực sự dùng independent Chat API/worker/DB/grants, Chat-owned parity và required compatibility đã đạt trên candidate cùng phiên bản và smoke main switch đạt.
- Single writer, reconciliation, restart, post-write rollback/reapply có evidence; data/receipt/unknown semantics giữ đúng.
- Không tuyên bố production hoặc real-provider activation; không biến baseline Identity/Core/Workflow thành service đã tách chỉ vì có owner endpoints.
- D3-06 đạt; kiểm cả6gates trước khi đánh SRC-109 DONE. Chỉ lúc đó cập nhật **packages/local3/14** theo rule hiện hành.

Kết thúc bằng tổng kết ngắn: capability chạy thật,6/6gates và3/14, validation chính, giới hạn, runbook/link evidence. Không tự mở D4 trong thread này.
