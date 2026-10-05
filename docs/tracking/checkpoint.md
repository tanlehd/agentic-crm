# Checkpoint — điểm tiếp tục

Updated 2026-10-05, S-20261005-10 (SRC-020 DONE).

## Trạng thái thực tế

**SRC-001…020 DONE (20/25), M1 gate PASS. SRC-021 READY, chưa claim; không task active.** [SRC-020 detail](details/SRC-020.md) · [tracker](tasks.md).

Chatflow graph/schema, durable session/node/turn engine, actual Workflow/Runtime ports, same-session Lead/evidence, API/generated client và inbox Human panel hoàn tất.150 MySQL tests PASS (18 Chatflow+132 regression),9 canonical verify gates PASS (66 unit/contract+7 tooling), release backend/web builds PASS. Linux ARM64 Node24.21.0/pnpm10.33.0/MySQL8.4.11.

## Preview và acceptance

User “cho phép” đã giải quyết yêu cầu authorization của automatic approval review. Preview nâng thành công schema16, giữ volumes; count/hash13 bảng cũ khớp trước/sau migration trước khi tạo browser fixture. Chrome154 real OIDC→mock intake→Workflow→Chatflow→Human takeover/consent form→qualified Lead→parent completion PASS, Human owner giữ nguyên. Bảy dịch vụ gateway/web/api/worker/mysql/redis/keycloak giữ chạy healthy; worker tail không tick failure. Không blocker hoặc quyết định chờ xử lý.

## Next action

SRC-021 Sales handoff/acceptance API và Workflow action: đọc module/contract/dictionary/acceptance, kiểm tra working tree và claim trước khi code. Chưa claim hoặc triển khai SRC-021. Full M2 gate vẫn chờ SRC-021…025.

## Workspace và evidence

Main starting HEAD f4a6c27; dirty SRC-020 source/docs/generated retained, không commit/push/production deploy. Migrations14/15/16 additive; v1–v13 unchanged,14/15 preserved after disposable tests. Mã ứng dụng không đổi trong browser retry; harness sửa chọn tenant, selector combobox và chờ queue.

Artifacts local ignored `artifacts/SRC-020/`: `integration-final-engine.log`, `verify-engine/summary.json`, build/release logs, `preview-up.log`, `upgrade-before.json`, `upgrade-after.json`, `upgrade-check.json`, `browser-e2e.mjs`, `browser-e2e.log`, `browser-facts.json`, `human-form.png`, `human-completed.png`, `services.log`, `migration-status.log`, `worker.log`, `docs-final.log`, `whitespace.log`, `working-tree.log`. Failure history và exact commands tại task detail. Synthetic test workflows/service actors đã disable, temporary roles detached; synthetic history retained. Test containers/network đã cleanup; runners kết thúc, không agent/automation. Không reset database/xóa volume. Remote CI/native AMD64/Windows/production provider NOT_RUN.
