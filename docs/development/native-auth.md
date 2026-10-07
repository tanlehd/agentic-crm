# Native Identity local — SRC-038

CRM đăng nhập và giữ session trong MySQL; quyền tiếp tục lấy từ membership/seat/role/team/field policy. Keycloak không còn trong Compose, monitor, proxy hoặc API runtime. MySQL và Redis vẫn chạy Docker với volume lâu dài. Source app chạy Node24.21/pnpm10.33 trên host; Windows đã kiểm chứng, macOS chưa chạy thử. Linux regression/container build đạt, chưa phải production deployment.

## Máy mới

1. Cài Node24.21.0, pnpm10.33.0, Docker Compose v2; `pnpm install --frozen-lockfile`, `pnpm env:init`, `pnpm local:init`, `pnpm build`.
2. Chỉnh APP_ORIGIN trong `.env` và env API/web nếu cần đổi port. Trên máy hiện tại là http://localhost:18080. Private env không đưa lên Git hoặc gửi vào chat.
3. `pnpm infra:start` bật MySQL/Redis. Tạo migration DB user bằng `docker compose -f compose.yaml -f compose.host.yaml run --rm --build db-provision` khi API/worker chưa chạy.
4. Mở terminal riêng chạy `pnpm local:monitor`. Không start app trước upgrade/seed.
5. `pnpm seed:dev` chạy host operator: backup, kiểm writers đã dừng, migration, fixture Alpha/Beta và enrollment native, DB grants. `pnpm auth:provision` là alias cùng thao tác. Cần backend dist, Docker CLI, monitor3020 và migration credential local. Lặp lại giữ mật khẩu/quyền đã thay đổi; không reset DB/Redis. Backup ở ignored `artifacts/SRC-038/pre-native-*.sql`, chỉ giữ cục bộ, có thể chứa credentials đã hash và dữ liệu CRM.
6. Start API/web/worker qua monitor http://127.0.0.1:3020. Đăng nhập `alpha_admin`, mật khẩu lấy từ `SEED_ALPHA_ADMIN_PASSWORD` trong private `.env`. `read_only` có hai membership Alpha/Beta; không có quyền quản trị.

Ngày thường chỉ start/stop infra hoặc từng app qua monitor; không chạy provision/migration/seed trong startup. Env từng unit: `.local/services/<id>.env`; `local:init` giữ file đã có. API cần MYSQL_AUTH_USER/PASSWORD riêng, SESSION_ENCRYPTION_KEY, APP_ORIGIN và DB/Redis endpoints. Worker không nhận auth credential. Kafka chưa tích hợp; KAFKA_BROKERS là cấu hình dự phòng.

## Nâng DB cũ và khôi phục tài khoản

`pnpm auth:upgrade`: dừng API/web/worker trong monitor và mọi container API/worker trước. Script từ chối writer còn chạy, backup, áp dụng forward migration22/23, backfill workspace/activity rồi đối chiếu toàn bộ cột dữ liệu gốc. Journal checksum cũ giữ nguyên. Enrollment chỉ nhận account liên kết đúng fixture membership IDs; không dò/ghép email. Các tài khoản khác cần enrollment do operator xác minh, không tự cấp quyền khi login.

`pnpm auth:recovery` nhận **account UUID trên stdin**, tạo mã một lần và ghi vào `.local/recovery/<uuid>.txt` (mode0600 trên hệ điều hành hỗ trợ; Windows theo ACL workspace). Không truyền mật khẩu/token qua command arguments. Operator chuyển mã riêng cho người dùng rồi xóa file token đó. Trang `/login` → “Tôi có mã thiết lập / khôi phục” cho nhập mã và mật khẩu mới. Mã hết hạn15 phút, chỉ dùng một lần; đổi/reset mật khẩu hủy mọi session của account. Chưa có email adapter, reset-request trả503 trung tính; chưa có public signup.

Sau cutover phải login lại. Cookie OIDC cũ không tồn tại trong MySQL session mới; Redis/provider không được đọc lại hoặc dùng làm fallback. Không FLUSH Redis hoặc xóa volume Keycloak; provider cũ đã dừng, dữ liệu còn để đối chiếu. Sau thay đổi password/quyền chỉ forward repair, không tự rollback về provider cũ.

## Kiểm chứng

- `pnpm test:auth:setup`, `pnpm test:auth:mysql`: database test lâu dài riêng, IDs mới theo run; có native seed và Connector journal checks. Backend/Connector cần build trước. Không dọn dữ liệu sau test.
- `pnpm test:auth`: Chrome có sẵn, app đang chạy; native login/tenant permissions/CSRF/logout, chụp login không có mật khẩu.
- `node scripts/native-grants-test.mjs`: kiểm app không đọc credential và auth role không đọc membership/sửa status/xóa audit.
- `pnpm test:integration`: hồi quy monolith trong Docker project tmpfs riêng; không trỏ persistent dev DB. Unit/build/typecheck/schema/contracts/docs/script gates theo package scripts.

Các file OIDC E2E/provision cũ giữ làm lịch sử (SRC-006…025), không dùng cho native runtime. `test:identity`, `test:seed`, các browser E2E nghiệp vụ cũ và `release:smoke` chưa port sang native; không xem chúng là release acceptance hiện tại. Chạy mới dùng native checks ở trên và MySQL regression. [Evidence](../tracking/details/SRC-038.md).

81 bảng application/journal local đã có tenant_id NOT NULL. Physical DB vẫn `agentic_crm`; [13-schema catalog](../data/schema-catalog.md) là đích ownership. PLAN-007B phải loại coupling transaction/FK trước khi tách từng schema. Không tự rename/move bảng để giả microservices.
