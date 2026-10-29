# Vận hành theo từng service — SRC-091

**SRC-107 D1 completed:** [Native Connector runbook](connector-local.md), [5/5 evidence](../tracking/details/SRC-107.md). Connector serves local mock traffic to actual Chat, own schema5; Reporting + Connector local2/17. Schema2 receiver acceptance below remains historical. Next D2 Human outbound composition.

**Current next rollout PLAN-056:** [D1/SRC-107 scope](../planning/service-delivery-reset.md) chuyển Connector mock ingress tới actual local backend với synthetic binding, own DB, retained delivery/restart/dedup và rollback. Chưa thực hiện rollout trong phiên review. Existing protocols/compatibility giữ nguyên; outbound dispatch/real providers vẫn không được suy là active.

[Contract RO-01…06](../contracts/phased-service-rollout.md), [kiến trúc và sơ đồ](../system/deployment-topology.md), [evidence](../tracking/details/SRC-091.md). Giữ CRM metadata và Identity policy làm nguồn chuẩn; triển khai theo thứ tự Reporting → Connector/Chat → Workflow/AI. CRM/Sales còn chung API/worker tới khi hoàn tất các gate transaction/registry/saga.

## Reporting local trên container

Prerequisites: Windows Docker Desktop, MySQL local13306 healthy, image Reporting từ SRC-090 đã kiểm thử, schema7 hiện có; API3001/web18080/monitor3020 đang chạy. Dùng Node24/pnpm10 pinned (`. ./scripts/dev-shell.ps1`). Script đọc cấu hình private hiện có và đăng nhập bằng tài khoản synthetic alpha_admin; không tạo account, cấp quyền hay chạy migration. Chỉ hỗ trợ origin development http://localhost:18080 và Reporting3004 trong lần rollout này.

```powershell
pnpm reporting:rollout --check
pnpm reporting:rollout --apply
```

`--check` xác nhận image/config/key và đọc native baseline. `--apply` chỉ dừng Reporting do monitor quản lý, chạy project agentic-crm-reporting tại cùng cổng3004, rồi so sánh hash các definition heads, danh sách dashboard (trang đầu50) và query snapshot synthetic. Giữ nguyên API/BFF URL, runtime grants, admission key và database. Script sinh `.local/reporting-container.env` runtime-only; `.local/services/reporting.env` giữ để rollback. Không in env/token hoặc raw business data. Kết quả hash/count lưu trong artifacts/reporting-rollout; phiên đăng nhập tạm được logout.

Monitor quan sát Reporting `ready`, `owned:false`; quản lý container bằng Compose, không bấm Start host trên cổng đã dùng:

```powershell
docker compose --env-file .local/reporting-container.env -p agentic-crm-reporting -f compose.reporting.yaml ps
docker compose --env-file .local/reporting-container.env -p agentic-crm-reporting -f compose.reporting.yaml logs --tail 100 reporting
docker compose --env-file .local/reporting-container.env -p agentic-crm-reporting -f compose.reporting.yaml stop reporting
```

Rollback có kiểm tra native dữ liệu:

```powershell
pnpm reporting:rollout --rollback
```

Rollback dừng container rồi start host qua monitor. Apply thất bại sau khi dừng host sẽ tự thử khôi phục host và trả lỗi; xem artifact `restored` và readiness thực tế, không suy thành công nếu DB/monitor bị lỗi. Không chạy đồng thời hai Reporting trên3004. Trước đổi image/config, giữ digest đã nghiệm thu; thay đổi schema tương lai cần compatibility gate riêng. Chi tiết giới hạn package tại [Reporting container](reporting-container.md).

## Connector image và retained acceptance

```powershell
pnpm image:connector
pnpm test:connector:operations
```

Build chỉ compile contracts + Connector; dùng workspace lockfile, runtime chỉ có dist/production dependencies. CI connector-package build/import HTTP/worker/health; CI remote không được coi đã chạy từ evidence local.

Test tạo một lần `.local/connector-operations-test.env` và `.local/connector-operations-fixture.json`, rồi dùng lại. Project agentic-crm-connector-retained có MySQL/volume riêng; API13110, worker probe13111, HTTP receiver synthetic13112. Operator đọc registration system tenant từ MySQL local trước provision; runtime chỉ có quyền DB riêng. Explicit migrate/grant/provision, migrate lặp lại0; không down -v/reset. Cuối test stop cả3container, giữ volume và receipts. Không sửa/xóa fixture/env khi muốn chạy lại. Không dùng môi trường production.

Receiver chỉ mô phỏng authenticated binding/contact lookup/resolve/deliveries-v2/status. Evidence bao gồm outage retry, dedup/conflict, restart cùng receipt, own-DB outage/recovery, revoked binding và restricted grants (SELECT mysql.user bị từ chối, SHOW GRANTS không có DDL). Đây chưa phải native Chat hoặc live Meta acceptance. Main Connector vẫn chưa được cấu hình/cutover; hướng dẫn binding thực tại [Connector README](../../services/crm-connector/README.md).

## Health và shutdown

Worker GET `/connector/v1/health/live` trả200 khi process còn phục vụ; `/connector/v1/health/ready` trả200 sau schema-check + tick thành công trong45s, trả503 khi khởi động/chưa thành công, lỗi, stale hoặc draining. Chỉ status/role; không lộ tenant/payload/upstream error. Probe không query DB. Downstream HTTP outage vẫn cho phép xử lý durable retry nên không đồng nghĩa worker unready; own DB outage làm unready. Theo dõi riêng deliveries queued/blocked/attention, chưa có production metrics/SLO gate.

Host mặc định127.0.0.1:3011, `CONNECTOR_WORKER_PORT` ưu tiên hơn `PORT`; khi dùng local monitor giữ cùng giá trị PORT để probe đúng. Compose bind0.0.0.0 bên trong, không publish worker probe mặc định. SIGTERM worker đánh draining ngay, chờ tick, đóng server/pool; deadline40s, Docker grace45s; API grace20s. Non-root/read-only/tmpfs16MiB/512MiB/128PIDs/cap-drop/no-new-privileges/log10MiB×3. Unhealthy không tự khiến Compose restart; xử lý nguyên nhân DB/network trước.

Local manager source đã thêm worker readiness. Monitor đang chạy không hot reload; registry mới áp dụng khi khởi động monitor phiên sau. Không restart cả monitor chỉ để cập nhật vì có thể dừng app con. Binary worker cũ không có health endpoint: rollback image + Compose/registry tương thích cùng nhau, giữ schema/volume/queued deliveries. Backup/restore, load, production alerts và physical Chat extraction còn gate riêng.
