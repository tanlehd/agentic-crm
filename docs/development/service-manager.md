# Local service manager — ENV-003

SRC-038: native MySQL authentication đã cutover; Keycloak đã bỏ khỏi registry. [Setup/upgrade/recovery](native-auth.md).

Status: Ready for implementation, 2026-10-07. Scope: developer tooling, không phải Operations production service.

## Contract và acceptance

- Infrastructure dùng Docker Compose hiện có, giữ nguyên project `agentic-crm` và named volumes. Override chỉ publish MySQL/Redis trên loopback. Start/stop từng infra service không kéo theo app, migration, seed hoặc reset.
- Node24/pnpm10 chạy application source trên Windows/macOS/Linux. Registry chỉ gồm deploy units đã có: API, worker, web, Connector API/worker; không biến module monolith thành microservice giả.
- Mỗi unit đọc `.local/services/<id>.env`; file không được gửi lên UI/log. Các DB/Redis ports và remote origins cấu hình được. `KAFKA_BROKERS` là reserved configuration, chưa có producer/consumer; ADR-017 broker gate giữ nguyên.
- Monitor độc lập trên loopback, xem trạng thái khi DB/app chết. GET status trả id, env path, process ownership và readiness; POST start/stop chỉ dùng allowlist, same-origin và token phiên. Không nhận arbitrary command/path. Stop chỉ process manager đã tạo; process ngoài manager chỉ quan sát. Khi đóng manager, dừng app con; infra vẫn tồn tại.
- Health endpoint đọc port từ env; Connector worker chỉ báo process running (không có readiness HTTP), không gọi đó là healthy. Lỗi probe/config/action hiển thị sanitized. Không expose secret/raw stderr.
- Startup không migrate. Schema23 nâng riêng bằng operator runbook native; startup không tự migrate. Production Linux dùng container/supervisor ở deployment gate riêng, không publish monitor local lên mạng.
- Test/manual QA dùng tenant/user synthetic riêng, dữ liệu có thể giữ và dùng lại; không reset MySQL/Redis mặc định. Legacy regression yêu cầu DB trống vẫn là explicit isolated command, không được trỏ vào persistent dev DB hoặc tự đổi assertion thành PASS. Không flush shared Redis.

## Sử dụng

Node24.21 và pnpm10.33; Windows chạy `. ./scripts/dev-shell.ps1`. macOS/Linux dùng cùng Node/pnpm và Docker Compose v2. Chạy `pnpm install --frozen-lockfile`, `pnpm env:init`, `pnpm local:init`, `pnpm build` lần đầu. Init giữ file env đã có, không rotate credentials.

`pnpm infra:start` / `pnpm infra:stop` bật/tắt MySQL, Redis; thêm tên service để thao tác riêng, ví dụ `pnpm infra:stop redis`. `pnpm infra:status` xem trạng thái. Giữ volume và dữ liệu Redis AOF. Docker Desktop phải sẵn sàng trên Windows/macOS; Linux dùng Docker Engine.

`pnpm local:monitor`, mở http://127.0.0.1:3020. Start ứng dụng từ UI; hoặc `pnpm local:run api` (thay bằng worker/web/connector-api/connector-worker). API/worker dùng tsx; web dùng Next dev; Connector dùng built dist, rebuild sau sửa source. Các process foreground nhận Ctrl+C. Monitor không tự start toàn bộ ứng dụng.

Đổi connection/port trong env rồi stop/start unit. Cổng infra mặc định 13306/16379; đổi LOCAL_MYSQL_PORT/LOCAL_REDIS_PORT trong `.env` trước init, hoặc cập nhật cả host env và infra override tương ứng. File env riêng chứa APP_ENV, PORT, MYSQL_*, REDIS_*, KAFKA_BROKERS và endpoint phụ thuộc. Connector env ban đầu chưa có credentials/binding: cấu hình theo runbook Connector trước start.

Host web origin giữ APP_ORIGIN từ `.env` (máy này http://localhost:18080), API http://127.0.0.1:3001; web proxy `/api` và `/auth` tới API. Khi chuyển từ Docker preview, dừng API/worker container cũ để tránh hai worker, giữ account IDs/quyền cũ; nếu đổi origin phải đồng bộ `.env`, env API/web và restart ứng dụng. Không chạy đồng thời hai bộ writer trên schema đang upgrade.

Reusable QA: dùng Alpha/Beta synthetic users từ `seed:dev` và seed idempotent hiện có; giữ record cũ, tạo run-specific IDs khi test cần data mới. Không sử dụng tenant khách hàng. `test:integration` là legacy isolated regression trên tmpfs, vẫn cần DB trống và không phải lệnh khởi động/dev test thường ngày. Chuyển toàn bộ regression sang fixture tenant-scoped persistent là công việc riêng, chưa claim đã hoàn tất.

Windows Stop dùng taskkill cho cây process do manager tạo; Linux/macOS gửi SIGTERM process group và cưỡng chế sau5s nếu không dừng. Đây là công cụ dev; production cần supervisor/graceful shutdown đã kiểm chứng riêng. Monitor không giữ quyền quản lý PID qua lần restart/crash; process ngoài manager được quan sát, không bị stop.
