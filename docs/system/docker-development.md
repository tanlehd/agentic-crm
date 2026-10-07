# Docker: đóng gói, môi trường và nghiệm thu

SRC-038 đã bỏ Keycloak khỏi runtime. Native MySQL auth và host development theo [runbook](../development/native-auth.md). Các mốc scaffold phía dưới là lịch sử.

Status: SRC-003 scaffold đã implement/test ngày 2026-10-03. Web/API/worker/gateway/MySQL/Redis/Keycloak và contract test runner đã chạy; SRC-004 bổ sung migrate/provision và MySQL kernel tests; SRC-005 thêm portable verify/CI adapter; SRC-009 thêm seed Identity Alpha/Beta; SRC-010 thêm migration v6 và registry fixture v2 qua migration one-shot. Xem [runbook thực tế](../development/local.md).

## Services

| Service | Trách nhiệm | Dữ liệu / expose |
|---|---|---|
| gateway | Reverse proxy cùng origin cho web, `/api`, `/auth`, `/identity` | Dev bind 127.0.0.1:8080; proxy headers do gateway overwrite |
| web | Next.js dev server hoặc standalone release | Stateless; không chứa backend secret |
| api | NestJS HTTP, auth session, tenant commands | Private network; health/readiness riêng |
| worker | NestJS job/outbox relay/recovery | Cùng image backend, command khác; không phụ thuộc frontend |
| mysql | MySQL 8.4 LTS | Named volume; app và migration user tách quyền |
| redis | BullMQ + cache | Named volume dev; phục hồi business từ MySQL, session native giữ trong MySQL |
| migrate | One-shot schema migration | Backend image; có schema lock; không seed hoặc drop data |
| seed:dev (operator script) | Native fixture/enrollment qua host operator | Không service thường trực; guard local, idempotent theo fixture IDs |
| test | Unit/integration/e2e runner | Compose project/volumes tách dev, artifact mount riêng |

DB/Redis không public port mặc định; debug port chỉ bật override local và bind loopback. Seed không tự chạy trong production-like release. Dev secrets tạo cục bộ và gitignored; `.env.example` chỉ key/placeholder.

## Startup và health

Theo [Docker Compose startup order](https://docs.docker.com/compose/how-tos/startup-order), dùng `service_healthy` cho dependency cần sẵn sàng và `service_completed_successfully` cho migration. Container được tạo không đồng nghĩa ứng dụng đã healthy.

MySQL healthy → db-provision success → migrate success → API/worker. Redis healthy trước worker readiness. Web/gateway phải chạy được trang unavailable khi backend chưa ready; không tạo vòng chờ gateway↔API readiness. Gateway liveness độc lập với upstream. Native auth kiểm tra login qua gateway sau khi đã lên, không đặt dependency cycle.

API liveness kiểm tra process; readiness kiểm tra DB + schema compatibility. Redis outage: native session vẫn đọc MySQL, không tự logout, mock credential intake vẫn nhận nếu persist được; worker health phản ánh degraded và retry. Shutdown ngừng claim job, chờ in-flight bounded, lease/recovery xử lý phần còn lại.

## Native auth và cookie

APP_ORIGIN phải cùng origin với web/gateway. Native login không phụ thuộc issuer/discovery/backchannel; callback cũ trả410. MySQL auth credential riêng chỉ cấp API và operator db-grants, worker không nhận. Cookie HttpOnly/SameSite=Lax, Secure cho HTTPS; HTTP chỉ cho local development/test. Xem [native runbook](../development/native-auth.md).

## Compose và image strategy

- `compose.yaml`: topology/services và release image targets; `compose.dev.yaml`: watch/bind source, dev command; `compose.test.yaml`: test runner và volume/project isolation. Tạo ở SRC-003, không cần Kubernetes M1–M2.
- Web multi-stage build với [Next.js standalone output](https://nextjs.org/docs/app/getting-started/deploying); backend multi-stage build shared API/worker/migrate artifact. Install bằng frozen lockfile, runtime non-root, healthcheck, exec-form command để nhận SIGTERM.
- Pin version/digest ở manifest, lưu build ID/commit nếu có; dev host ARM64 và CI AMD64 dùng base images hỗ trợ hai kiến trúc. Verify local architecture ở M1, multi-arch smoke trước M2 release; không tuyên bố image đã cross-tested nếu chỉ build native.
- Code/secret không copy toàn bộ repo vào runtime; Docker build context loại `.env`, `.git`, artifact và node_modules host.
- Migration MySQL DDL có implicit commit; không giả định rollback transaction toàn bộ migration. Migration one-shot có lock, journal, preflight và forward repair cho partial failure; test bằng crash injection phù hợp.

## Lệnh giao diện dự kiến

| Lệnh wrapper sẽ tạo | Hành vi |
|---|---|
| `pnpm env:init` | Tạo local env/secret nếu chưa có, không overwrite; kiểm tra Docker/Compose |
| `pnpm dev:up` | Build/start dev stack, health wait và migration; không reseed/reset tự động |
| `pnpm seed:dev` | Explicit seed hai tenant và dev users; chạy lại không nhân bản |
| `pnpm dev:status` / `pnpm dev:logs` | Xem health/log redacted |
| `pnpm dev:down` | Stop stack, giữ named volumes |
| `pnpm db:migrate` / `pnpm db:status` | One-shot migration/status |
| `pnpm verify` | Lint, typecheck, unit, docs/contracts checks và build |
| `pnpm test:integration` / `pnpm test:e2e` | Compose test project riêng, không kết nối DB dev |
| `pnpm release:smoke` | Build release target, cold/warm start và smoke trong test project |

Volume reset là lệnh riêng có explicit confirmation/flag và environment guard, không alias dev:down. Không tự xóa volume để làm test pass. Backup/restore production, registry deployment, domain/TLS thực tế cần milestone deployment riêng.

## Acceptance Docker

SRC-003/004: compose config hợp lệ, secrets không hard-code, containers health và stop/start giữ dữ liệu, migration rerun no-op. SRC-006: browser login và callback end-to-end. SRC-025: cold start, upgrade data từ M1, worker restart, release image smoke và ghi rõ kiến trúc đã test. Daemon/Compose và images đã kiểm chứng ARM64 ở SRC-003; test evidence trong tracker. Canonical runtime Node 24.21.0. Evidence migration ở SRC-004; auth local có evidence SRC-006; multi-arch vẫn ở task sau.

## Trạng thái command scaffold

Đã có env:init, dev:up/status/logs/down, preview:up, test:container, db:migrate/status test:integration và verify/verify:container. seed:dev và test:seed đã có SRC-009; release:smoke đã có SRC-025; test:e2e umbrella xuyên CRM chưa có (các script E2E riêng đã có). [Verification runbook](../development/verification.md). Migration gate/readiness và local privilege provisioning xem [runbook](../development/migrations.md).

SRC-038: Compose API nhận MYSQL_AUTH_USER/PASSWORD và SESSION_ENCRYPTION_KEY; worker không nhận. auth:provision/seed:dev dùng host native operator, không IdP. Historical SRC-006 evidence giữ trong tracker.

SRC-025 release gate PASS: [release runbook](../development/m2-release.md) · [evidence](../tracking/details/SRC-025.md). `pnpm release:smoke` builds isolated app tags and tests historical M1→M2 plus cold/restart/browser flows. ARM64 native and AMD64 emulated app images tested; no native AMD64/production claim. Existing preview tags/volumes are not changed. Test containers/network cleanup retains named volumes with an explicit inventory. Current M2 worker polls MySQL durable backlog directly; Redis provides cache/readiness; native sessions now live in MySQL, no BullMQ transport is claimed.
