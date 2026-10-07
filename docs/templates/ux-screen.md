# SCREEN-ID — Tên màn hình

Status: Draft / Ready UX / Ready implementation / Implemented (ghi sub-scope). Owner, ngày, version, task và CHG. Không bỏ mục; nếu N/A phải có lý do.

## 1. Mục tiêu và phạm vi

Vai trò/seat, 3–5 công việc chính, entry/exit, điều kiện trước, ngoài phạm vi. Liên kết module/service/contract/data ownership và source task. Phân biệt thiết kế mới với chức năng đã chạy.

## 2. Khung và anatomy

App shell dùng chung; page title, sections, hierarchy, kích thước/min-width/scroll/sticky; desktop/tablet/mobile/zoom. Wireframe có nhãn; không nhúng user/tenant controls lặp.

## 3. Dữ liệu và tương tác

Bảng component → field → authority/API → permission/capability → action/feedback. Search/filter/sort/pagination/count semantics. Validation, draft, submit/idempotency, version conflict, focus, keyboard, loading/cancel.

## 4. Flows và states

Main flow + alternate/error; initial loading, no selection, empty data, empty filter, offline, partial failure, 401/403/404, field-denied, stale, pending, success. Dangerous actions, owner Human/AI, tenant switch và response trễ. Không dùng mock data làm trạng thái production.

## 5. Mock thiết kế

Link mock source có version/date và sample synthetic; default + failure + narrow view; file screenshot; danh sách interaction hoạt động và phần chỉ minh họa. Không secret/dữ liệu khách thật/remote avatar.

## 6. Acceptance

IDs gắn scenario → expected → evidence. Áp UX-G và UX-APP phù hợp. Kiểm keyboard/contrast/reflow, permission, race/retry/data preservation; usability mục tiêu và kết quả tách riêng.

## 7. Delivery / log

Task dependencies DONE, gap còn Draft, compatibility/migration note, files changed, exact commands/results/environment/artifacts, reviewers và unresolved items. Cập nhật screen registry, tasks, log, checkpoint trong cùng phiên. Design DONE không là runtime DONE.
