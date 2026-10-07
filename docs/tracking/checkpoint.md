# Checkpoint — điểm tiếp tục

Updated2026-10-07, S-20261007-04. SRC-038 DONE: native MySQL authentication, tenant-column retrofit và local Keycloak cutover. PLAN-007/007A DONE; SRC-034 backend pending regression closed DONE. [Evidence](details/SRC-038.md), [native runbook](../development/native-auth.md), [schema catalog](../data/schema-catalog.md), [DB guideline](../data/database-guidelines.md).

## Runtime và dữ liệu

Monitor http://127.0.0.1:3020 PID50204; CRM http://localhost:18080. MySQL13306/Redis16379 Docker healthy, host API3001/worker3002/web18080 ready và monitor-owned. Connector API/worker chưa cấu hình, không chạy. Keycloak container stopped, volume giữ nguyên; không còn trong registry/Compose/proxy. Session và quyền do MySQL quản lý, không fallback provider. Private env đã có auth DB user riêng; không in credentials.

Dev DB migration23. Backup trước21→23,71 bảng cột gốc giữ nguyên,6 account IDs/memberships/roles và password fixtures được enroll một lần. Repeat upgrade/seed áp dụng0 và preserve6 credentials/81 tables. SQL backup và SHA256 trong ignored artifacts/SRC-038/local-upgrade.json + timestamped repeats; không commit hoặc gửi backup. MySQL/Redis không reset/flush. Test dùng native_identity_test/native_seed_test/native_connector_test persistent; legacy regression tmpfs project riêng đã cleanup.

## Checks

222/222 full MySQL regression final PASS,16 native MySQL checks PASS,104 unit/10 tooling/24 strict schemas PASS, build/typecheck/lint/contracts/docs/API smoke PASS. Native Chrome login, Alpha/Beta selection/permission denial, domain write+idempotent replay, CSRF/logout/redirect, no provider traffic và actual API restart session retention PASS. DB grant negative checks và Compose host/dev/test config PASS. Argon2 Windows và Linux binary hash/verify PASS; macOS runtime và production Linux deployment NOT_RUN. Evidence files trong artifacts/SRC-038; exact commands/results ở task detail.

## Scope còn lại

Physical DB hiện vẫn agentic_crm;13 target schema ownership là design chuẩn, chưa extraction. PLAN-007B cần contracts/manifests loại cross-module UoW/FK trước tách schema; không move bảng bằng rename tùy tiện. Recovery email/general onboarding/MFA chưa triển khai; operator one-use reset có sẵn. Historical OIDC E2E/release scripts chưa port, không chạy như native acceptance. SRC-035…037 còn backlog; SRC-034 chỉ DONE backend UX-CHAT-18/20/22, không claim Chat UI/release.

## Workspace / tiếp tục

S-20261007-05: user yêu cầu commit/push toàn bộ ENV-003/PLAN-007/SRC-038 trên main, parent134c9cb. Delivery reference là commit chứa entry này; remote origin/main, kết quả push kiểm riêng sau commit. Private env/.local/artifacts/backups không đưa vào Git. Không deploy hoặc đổi runtime trong phiên Git sync. Không agents hay lịch nền, không task active. Nếu tiếp tục kiến trúc DB: PLAN-007B scoped design; nếu tiếp tục Chat: SRC-035 sau khi đọc module/contracts. Không tự bắt đầu cả hai. Đọc native runbook trước lifecycle/seed; stop app writers trước migration, giữ volume và private env.
