# Reporting — đóng gói, kiểm thử và vận hành độc lập

SRC-090 / [SP-01…06 contract](../contracts/service-packaging.md) / [topology](../system/deployment-topology.md). Image `agentic-crm-reporting:local`, Docker target `reporting`, [Compose riêng](../../compose.reporting.yaml). Local development/test package; production rollout/HA/TLS/backup/PITR/load gates chưa nghiệm thu. CRM BFF vẫn kiểm tra quyền hiện hành và ký request; không expose private Reporting API cho browser.

## Chuẩn bị và build

Docker Engine/Desktop, Node24/pnpm10 pinned; Windows dùng `. ./scripts/dev-shell.ps1`. MySQL local hiện có phải healthy. Nếu chưa provision schema hoặc cần nâng version, chạy riêng quy trình [Reporting storage](reporting-storage.md): `node scripts/reporting-db.mjs` / `node scripts/reporting-db.mjs --test`. Lệnh này kiểm system tenant, backup và preservation; không chạy tự động cùng container. Migrations đã dùng không được sửa. Không reset DB/Redis/volume.

```powershell
pnpm image:reporting
pnpm test:reporting:container
```

Test yêu cầu `.local/reporting-test.env` đã provision và cổng13004 trống, topology Docker Desktop→host.docker.internal:13306; Windows/Docker Desktop là môi trường đã nghiệm thu. Chỉ test_crm_reporting/rpt_test_runtime; không đụng live BFF. Tạo fixture một lần tại `.local/reporting-container-fixture.json`, dùng lại mỗi lần chạy. Kiểm image, signed create/read/replay, auth/tenant/grant negatives, stop/restart persistence. Cuối test container được stop, fixture và database giữ nguyên. Artifact sanitized `artifacts/service-packaging/reporting-container.json`; failure trả nonzero, không coi các group chưa chạy là PASS. Dừng package development dùng cổng13004 trước khi chạy test, nếu đã bật. Linux host networking cần gate riêng, không được claim từ kết quả Windows này.

Build dùng lockfile/pinned Node, chỉ compile Reporting; dependency install vẫn dùng workspace lockfile chung. Runtime copy `dist` + production dependencies qua pnpm deploy; không mang backend/web/source/migration operator. CI `reporting-package` build/import entrypoint độc lập; retained-DB HTTP test là local acceptance riêng, không claim remote CI đã chạy.

## Chạy package local

Compose chỉ lấy runtime DB credential + admission key từ provision file, không inject operator password. Có thể dùng [env sample](../../infra/docker/reporting.env.example) để tạo file runtime-only trong `.local`; không commit hoặc in env đã resolve bằng `compose config` không có `--quiet`.

```powershell
docker compose --env-file .local/reporting.env -f compose.reporting.yaml config --quiet
docker compose --env-file .local/reporting.env -f compose.reporting.yaml up -d --no-build --wait
docker compose --env-file .local/reporting.env -f compose.reporting.yaml ps
docker compose --env-file .local/reporting.env -f compose.reporting.yaml logs --tail 100 reporting
docker compose --env-file .local/reporting.env -f compose.reporting.yaml restart reporting
docker compose --env-file .local/reporting.env -f compose.reporting.yaml stop reporting
```

Container listens3004; opt-in package default host bind is127.0.0.1:13004. `REPORTING_CONTAINER_PORT` changes host port; `REPORTING_CONTAINER_DB_HOST` changes private DB hostname, `REPORTING_DB_PORT` its port. Docker Desktop uses host.docker.internal:13306. Linux host-gateway does not necessarily reach MySQL published only on127.0.0.1: use an operator-approved private Docker network/DB endpoint; do not publish DB publicly as a workaround. SRC-091 activated the main local container at3004 with the host process stopped; use its private env/project below for lifecycle operations.

Readiness `/internal/v1/reporting/health/ready` checks DB connectivity. Green health alone does not validate schema/grants/Identity/native end-to-end. Non-root, read-only root, /tmp16MiB,512MiB memory,128PIDs, init,20s graceful stop, no-new-privileges/capabilities dropped; logs rotated10MiB×3. Tune limits only with measured workload. `unless-stopped` restarts on process failure/daemon restart; Compose does not restart solely for unhealthy status. Operator investigates DB/network/credentials/schema first; no restart loops as schema repair.

## Switch và rollback

SRC-091 uses the same local3004 port to preserve BFF configuration and avoid an API restart. Run `pnpm reporting:rollout --check`, then `pnpm reporting:rollout --apply` for the manager-owned host→container transition. It compares native reads/query and restores host on apply failure. Active project agentic-crm-reporting uses `.local/reporting-container.env`. Exact prerequisites and lifecycle commands: [phased rollout](phased-service-rollout.md). No role/grant changes. A Docker BFF must follow existing HTTPS policy for remote service DNS; plain `http://reporting:3004` is not an approved bypass.

Rollback: `pnpm reporting:rollout --rollback` stops the managed container, starts the prior host via monitor and compares native reads on the same3004 URL. Same compatible schema/data/receipts retained, no down -v or SQL rollback. Future forward DDL needs its own compatibility plan. Startup is not migration, and this package introduces no automatic query worker.

For outage: inspect bounded logs without sharing secrets, runtime status and own DB availability. Admission/authorization errors go through the BFF; never fabricate wider permission to make a test pass. Deploy digest, process status, migration version, signed smoke, restart and DB restoration evidence must be recorded separately for production.
