# Base Omni CRM Human-first; AI native triển khai sau

**Scope refinement CHG-20261023-19:** [ADR-029 service-owned acceptance](../governance/service-delivery-scope.md) phân biệt base Omni CRM toàn sản phẩm với Chat extraction. Consumer phục vụ Human vẫn thuộc roadmap, nhưng nghiệp vụ Routing/Workflow/Sales/Reporting không là gate Chat. [Owner split](chat-extraction/consumer-handoff.md) áp dụng T06–T09; các candidate T04/T05 đã nghiệm thu giữ nguyên evidence.

Quyết định người dùng ngày 2026-10-19, CHG-20261019-23. Áp dụng cho SRC-109/D3 và các bước T04–T09; ưu tiên hơn yêu cầu parity AI execution trong kế hoạch cũ. Đây là điều chỉnh phạm vi nghiệm thu, không phải bằng chứng tính năng đã DONE.

## Hai lớp bàn giao

Base Omni CRM được nghiệm thu độc lập khi quản lý và vận hành Human hoàn chỉnh trong phạm vi đã chốt: Identity/session/quyền, team/agent, queue/capacity/phân công/takeover/close, messaging/workspace, CRM metadata/custom fields và các consumer nghiệp vụ phục vụ Human. Workflow không cần AI vẫn giữ phạm vi hiện có. Tenant isolation, audit, idempotency, migration, recovery và single-writer vẫn bắt buộc.

AI native là lớp sau. AI Runtime capacity/reservation, nhận việc cho AI, thực thi AI/prompt/provider và composition AI end-to-end được hoãn khỏi điều kiện DONE của base Human và D3 Human-first. Không tự mở D4 hay claim task AI trong phiên này; thiết kế/contract AI và source đã có được giữ lại, phần chưa triển khai không đánh DONE.

## Áp dụng theo bước

| Bước | Bắt buộc cho base Human | Phần AI hoãn |
|---|---|---|
| T04 | Native Human/service routing authority; Human eligibility/capacity; assignment/takeover/close/history; CRM metadata/reference reservation, custom-value/index writer; public Routing configuration và composed tests | Native AI Runtime capacity và AI assignment thành công; request AI chưa hỗ trợ tiếp tục fail-closed, không bỏ kiểm capacity để cho qua |
| T05–T06 | Messaging/workspace, Chat producer/local consumers và compatibility bắt buộc cho Human; Workflow business consumer nghiệm thu riêng; loại quyền ghi Chat từ baseline khi cutover | Nối mới AI execution/prompt/capacity; xác định từng nhánh AI-only trong consumer matrix trước khi bỏ khỏi suite |
| T07–T08 | Candidate API/worker/DB riêng chạy luồng Human khi AI Runtime không cấu hình/không khả dụng; composed Chat Human parity theo owner split, quyền, outage/recovery và required compatibility | AI end-to-end được ghi DEFERRED với lý do và đường dẫn quyết định này, không ghi PASS hoặc xóa khỏi inventory |
| T09 | Single writer, reconcile, restart, rollback/reapply sau writes và luồng app local Human có evidence | Không yêu cầu kích hoạt AI; không tuyên bố AI native hoàn tất |

## Bảo toàn và acceptance

- Không xóa AI data, owner history, pinned runs, receipts hoặc control events để đạt parity. Giữ owner/version fences và queued/in-flight semantics ở Chat; request AI chưa có boundary hợp lệ phải fail-closed.
- Inventory phải phân biệt Human-required, AI-deferred và shared safety. Nếu có AI work đang thực thi, phải có bằng chứng drain/fence hoặc recovery theo contract trước cutover; không mặc định mọi AI row là inactive, không bỏ subscriber hoặc đánh delivered giả. Đây là bảo toàn trạng thái hiện có, không yêu cầu xây xong lớp AI native.
- Ma trận nghiệm thu T08 ghi case/evidence cho Human và shared safety, ghi rõ AI-deferred. D3-03/05 đánh theo phạm vi này; vẫn đủ sáu gate D3, không tăng tiến độ chỉ vì hoãn AI.
- Khi sáu gate D3 Human-first đạt, có thể đóng SRC-109 với nhãn phạm vi Human-first và tính Chat độc lập theo evidence T09. Tình trạng toàn bộ sản phẩm base Omni CRM phải dựa trên acceptance của các chức năng Human liên quan, không suy từ riêng task extraction hoặc tỷ lệ service.

## Trạng thái và điểm tiếp tục

T01–T05 DONE; T06 IN_PROGRESS (Codex 2026-10-23), T07–T09 TODO. SRC-109 vẫn IN_PROGRESS, D3 2/6, local2/14. TLS local deferred theo [ADR-026](../contracts/local-workload-http.md); AI native tiếp tục DEFERRED. Bước tiếp theo: đối chiếu Chat relay/inbox/scanner và old-writer inventory theo owner split, không mở feature của consumer khác.
