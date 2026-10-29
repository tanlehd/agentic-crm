# T07 — Chat API/worker và image độc lập

DONE, Codex 2026-10-25; dependency T06 DONE. [Runtime acceptance](../../quality/t07-chat-runtime-acceptance.md) closes D3-04. Subsequent [T08 acceptance](../../quality/t08-chat-parity-acceptance.md) is DONE; current D3 5/6, local2/14. Main routing unchanged; T09 remains.

**Phạm vi CHG-20261023-19:** [ADR-029](../../governance/service-delivery-scope.md) chỉ yêu cầu đóng gói/chạy Chat và compatibility cần thiết. Runbook liệt kê API/worker Chat, mỗi dependency unit thực sự cần thay đổi và lý do/pins/checks/rollback. Reuse compatible owner endpoints đang chạy; không rebuild/restart/deploy Routing/Workflow/Sales/Reporting hoặc toàn stack để nghiệm thu Chat.

Thuộc SRC-109 / PLAN-057. Dependency **T06 DONE và D3-03 đạt**. [Quy tắc chung](../chat-extraction-execution.md), [tracker](../../tracking/tasks.md), [handoff](../../tracking/chat-extraction-handoff.md).

Đọc [Chat target layout](../../services/chat.md), contracts T01, exact schema/grants T02/T03 và [D3 gates](../../contracts/chat-extraction-runtime.md). `services/chat` là target; xác minh file/package thực tế trước lệnh. Không dùng backend image chứa toàn monolith để tuyên bố independent Chat.

## Phạm vi và đầu ra

1. Hoàn chỉnh module/package layout: domain/application/ports, own persistence, owner HTTP/events adapters, composition roots. Shared library chỉ chứa hạ tầng/protocol/value helpers, không chuyển implementation của service khác vào shared để né boundary.
2. Tạo API/worker entrypoints dùng cùng Chat DB, credentials theo vai trò, migration command riêng, config validation và dependency-aware readiness. Liveness phản ánh process; metrics tối thiểu queue/backlog/lease/error/retry, redacted logs.
3. Docker image/build/context độc lập, Compose candidate, explicit networks/service URLs, non-root/resource/log bounds và graceful shutdown/drain. Reuse existing workload transport/trust; không rotate/reset existing config mặc định.
4. Start candidate bằng isolated retained fixtures/config. Kiểm own DB access, startup nếu thiếu dependency fail rõ ràng, restart/lease recovery. Không route main app vào candidate trong bước này.
5. Viết runbook build/start/status/stop/migrate và danh sách commands đã thực sự tồn tại; ghi image digest và source fingerprint. Build lại khi source thay, không rebuild cùng candidate chỉ để đổi thread.

## Tiêu chí hoàn tất

- Image API/worker khởi động không import backend/other-domain implementation; runtime credentials bị chặn DB khác.
- Actual HTTP/readiness và ít nhất một composed ingress/send smoke qua candidate hoạt động, provider synthetic được ghi rõ. Smoke không thay full parity T08.
- Package/type/import checks, image/startup/health/graceful restart scope đạt. Main D1/D2 vẫn giữ đường vận hành cũ.
- D3-04 đạt khi độc lập runtime thực sự, lũy kế4/6. Theo quy tắc D3 hiện hành chỉ công bố service count3/14 sau T09; có thể ghi riêng candidate image đã build.

Handoff ghi image pins, schemas/grants refs, ports/network, fixture/env paths không secret, processes đang chạy và smoke artifacts. Tiếp tục tuần tự theo execution override qua T09 đã chốt.
