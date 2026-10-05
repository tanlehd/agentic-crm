# Chạy bộ khung local

Updated: 2026-10-04. Foundation preview có OIDC, Identity admin, outbox/inbox worker và seed Identity Alpha/Beta. Chưa có CRM nghiệp vụ hoặc seed ngành xuyên luồng.

## Khởi động

Docker Desktop phải đang chạy. Node host chỉ dùng tạo env; app chạy trong Node 24.21.0 image. Build trực tiếp trên host dùng Node 24.x và pnpm 10.33.0.

```sh
node scripts/env-init.mjs
docker compose up --build --detach --wait --wait-timeout 240
```

Mở [foundation preview](http://localhost:8080). Chỉ gateway bind loopback; DB/Redis/API/worker không publish cổng host. `env-init` giữ credential `.env` đã có, bổ sung migration/auth credential khi thiếu; secret mới random, mode 0600, không in ra log.

Development hot reload:

```sh
docker compose -f compose.yaml -f compose.dev.yaml up --build --detach --wait --wait-timeout 240
```

Source backend và web app mount read-only; generated files/node_modules nằm trong container. Đổi dependency/config thì rebuild. Release preview không hot reload: rebuild rồi reload browser.

## Kiểm tra và dừng

```sh
docker compose ps
curl -fsSL http://localhost:8080/api/v1/health/ready
docker compose down
```

`down` giữ named volumes; không thêm `--volumes` để giữ dữ liệu. `stage=scaffold` vẫn chưa chứng minh nghiệp vụ; readiness kiểm journal/schema version Account/Tenant từ SRC-004. Xem [migration runbook](migrations.md).

Worker xử lý outbox/inbox Identity từ MySQL (SRC-008); workflow engine tiếp tục M2. Keycloak dev có CRM client/user/login sau khi chạy auth:provision (SRC-006). Không dùng local stack làm production.

## Verification đã có

```sh
pnpm install --frozen-lockfile
pnpm verify:container
pnpm contracts:check
pnpm docs:check
pnpm build
pnpm typecheck
pnpm test
pnpm test:smoke-api
pnpm test:container
```

`test:smoke-api` mở cổng tạm 38081 và tự dừng process. `test:container` chạy contract tests trong Compose project riêng, không dùng DB dev. `pnpm db:migrate`, `pnpm db:status` và `pnpm test:integration` đã có ở SRC-004; [verify/CI](verification.md) đã có ở SRC-005; các test scaffold không đóng AC nghiệp vụ.

## Source và bước tiếp theo

[Web page](../../apps/web/app/page.tsx), [API health](../../apps/backend/src/health.ts), [Dockerfile](../../infra/docker/Dockerfile), [Compose](../../compose.yaml), [generated OpenAPI](../../packages/contracts/openapi.json).

OpenAPI hiện có health, auth và Identity admin endpoints. Sửa JSON schema rồi generate, không sửa generated TS bằng tay. Xem [tracker](../tracking/tasks.md) và [checkpoint](../tracking/checkpoint.md) để xem task tiếp theo.

## Đăng nhập local — SRC-006

Sau khi stack healthy:

```sh
pnpm auth:provision
pnpm test:auth
```

`auth:provision` idempotent cấu hình client confidential, exact callback, PKCE S256 và synthetic user `auth_demo`; không tạo tenant/membership. Mật khẩu nằm trong `AUTH_DEMO_PASSWORD` của `.env` private, không in/copy vào log hoặc evidence. Mở trang chủ → Đăng nhập → Keycloak; đăng xuất qua nút trên trang chủ. Lần đăng nhập đầu chỉ tạo Account issuer+subject, không tự gia nhập tổ chức. Provision dùng admin local, từ chối origin không loopback hoặc APP_ENV ngoài development/test. Keycloak realm import không tự cập nhật realm đã có, nên cần lệnh provision sau lần nâng cấp này.

API cần `APP_ORIGIN`, `OIDC_CLIENT_SECRET`, `SESSION_ENCRYPTION_KEY`; Docker thêm private `OIDC_BACKCHANNEL`. Key mã hóa 32 bytes hex; đổi key làm session đang có hết hiệu lực. API có MYSQL_HOST phải cấu hình auth hợp lệ, lỗi cấu hình chặn startup; worker không mount auth hoặc nhận auth secret. Chế độ smoke không cấu hình DB chỉ có health.

Session HttpOnly/SameSite=Lax; Secure=false chỉ local HTTP loopback. Browser không giữ access/refresh token. Redis session mã hóa, idle 8 giờ/absolute 24 giờ; mất Redis session cần login lại. Nginx không access-log auth/identity; không bật request-body/token debug logging. Local logout xóa session trước khi revoke IdP; login mới yêu cầu nhập lại credential, không phải single logout toàn bộ IdP.

`test:auth` chạy trên release preview (base compose), cần Chrome cài sẵn, pnpm dependencies và Docker. Test dùng synthetic auth_demo, MySQL/Redis thật; tạo/xóa đúng account thử nghiệm có subject ngẫu nhiên, không reset volume. Có kiểm tra Redis gián đoạn bằng pause/unpause ngắn trong finally; chạy khi local stack không có công việc khác. Không lưu browser traces/cookie jar. Screenshots chỉ chụp UI tổng hợp; logs sanitized ở artifacts/SRC-006. Browser driver phiên này dùng Node host v25.9.0; app/tests canonical vẫn Node 24.21.0 Linux ARM64, không coi host 25 là supported app runtime.

## Identity admin SRC-007

`pnpm preview:up` rebuild và migrate additive v2/v3/v4; không reset volume. `pnpm test:identity` dùng Chrome + auth_demo/Keycloak local, tạo hai tenant tổng hợp qua test harness, kiểm selector/CSRF/last-admin/replay/revocation rồi dọn fixture trong finally. Chỉ chạy local development, không kết nối production. Fixture test này tách biệt seed demo thường trực SRC-009. Nếu dừng cưỡng bức giữa test, kiểm tenant prefix SRC007 E2E trước khi dọn bằng fixture IDs; không xóa tenant khác.

Admin HTTP có tại `/api/v1/admin/{memberships,teams,roles,ai-agents}` và PATCH principals. Xem [exact contract](../contracts/identity-admin.md). Outbox được ghi và xử lý bền vững qua SRC-008. Full Admin CRUD UI còn SRC-013.

SRC-008: preview startup thêm `db-grants` sau migration; worker xử lý durable outbox/inbox từ MySQL. `pnpm db:migrate` áp dụng lại table grants. Audit runtime chỉ append/read; synthetic browser fixture cleanup chạy local migration one-shot, không cấp quyền DELETE audit cho API.

## Seed Alpha/Beta — SRC-009

Trên preview healthy có backend image mới:

```sh
pnpm env:init
pnpm auth:provision
pnpm seed:dev
pnpm seed:dev
pnpm test:seed
```

Lần đầu tạo hai tenant; lần sau báo `0 tenants created, 2 preserved`. Lệnh không chạy tự động khi app khởi động, không reset volume. Seed đọc cấu hình development/HTTP loopback và MySQL local cố định, kiểm schema trước ghi. [Bootstrap contract](../contracts/bootstrap.md) ghi scope/transaction/idempotency. Credentials random riêng từng user ở `.env` mode0600: `SEED_ALPHA_ADMIN_PASSWORD`, `SEED_BETA_ADMIN_PASSWORD`, `SEED_CHAT_ANNA_PASSWORD`, `SEED_SALES_BINH_PASSWORD`, `SEED_SALES_CHI_PASSWORD`, `SEED_READ_ONLY_PASSWORD`; xem bằng editor local, không đưa vào log/evidence.

Đăng nhập `alpha_admin` chọn Clinic Alpha hoặc `beta_admin` chọn Clinic Beta; admin không có membership tenant kia. `read_only` có cả hai tenant, selector hoạt động nhưng Identity admin API bị 403 đúng role. `chat_anna`, `sales_binh`, `sales_chi` thuộc Alpha. Intake/Sales team labels và role keys giống nhau giữa tenant; cả hai có AI mock policy deny-all và ctm_service không có admin/schema grant. Chưa có CRM records hoặc AI runtime thật.

Keycloak marker là managed attribute chỉ admin được view/edit; seed không nhận tài khoản trùng username không marker, không reset mật khẩu/status của user đã tồn tại. Nếu mất `.env` credential hoặc realm bị tạo lại trong khi DB còn dữ liệu, seed dừng khi collision/mapping mismatch: operator kiểm tra và phục hồi đúng credential/realm backup, không tự gộp account hoặc regrant quyền. Nếu lỗi sau provider nhưng trước DB commit, có thể rerun; DB rollback atomic, các provider users đã tạo được giữ. Thiếu entity fixture thì dừng kiểm tra, không tự tạo lại quyền đã thu hồi.

`test:seed` dùng sáu user đã seed, Chrome headless, screenshots UI tổng hợp và negative mutation không thay đổi Beta; không reset fixture. APP_ENV=test chỉ cho integration isolated database seed_test, không là cách chạy seed trên môi trường thật.

## Registry foundation SRC-010

Sau `pnpm preview:up` (migration v6 và runtime grants), chạy `pnpm seed:registry` để tạo 7 standard object types mỗi tenant. Chạy lại giữ nguyên metadata và ACL; thiếu fixture sau completion marker thì fail closed. Không tạo Contact/custom records trước SRC-011/012. Không reset volumes.

Registry CLI không gán thêm quyền: admin fixtures hiện chỉ có Identity grants. Dùng Identity role API để tạo/gán role `schema.read/create/update` scope all cho Human admin muốn quản lý metadata; association cần `association.read/create` all và read hai đầu/update source. Không cấp schema role cho viewer hoặc service mặc định. Endpoint shapes và source If-Match tại [registry contract](../contracts/registry.md). Không có registry UI ở task này.

`pnpm test:registry` kiểm OIDC thật cho Alpha/Beta admin và viewer, session/tenant guards, metadata denied khi fixture không có schema grant. Positive metadata/association HTTP và concurrency được kiểm bằng MySQL integration cô lập.

## CRM M1 (SRC-011…013)

Sau khi schema và Identity/registry seed đã sẵn sàng: `pnpm seed:m1`. Fixture v3 thêm role riêng và metadata Appointment/ServiceOffering cho Alpha/Beta; chạy lại giữ nguyên chỉnh sửa/revocation, không sửa seed v1/v2 và không reset volume. Account passwords vẫn nằm trong `.env` local, không ghi vào tài liệu.

Đăng nhập Alpha/Beta admin → chọn tổ chức → CRM để tạo Contact/Company/Activity/custom record hoặc Lead. Lead cần Contact, lưu nháp rồi ghi nhận consent thủ công và xác nhận qualification. Tab Quản trị dùng Identity APIs; Cấu hình dữ liệu cho property/form/view/association types. Admin seat vẫn cần role grant; object mới chưa có quyền record cho tới khi role được cấu hình.

`pnpm test:m1` chạy Chrome real OIDC và tạo dữ liệu có prefix Synthetic; không dùng dữ liệu khách hàng thật. Screenshot/facts/log trong artifacts/SRC-013. `node scripts/m1-cold-smoke.mjs` tạo project riêng trên cổng18080 với tmpfs, private env trong temp, chạy cold migration+seed+browser rồi dọn containers; không dùng preview volumes. `node scripts/m1-warm-check.mjs` kiểm facts của browser test sau restart preview. Không chạy warm-check trước test:m1 có facts.

M1 chưa có Messenger/Chatflow/Sales handoff hay Customer transition. Domain outbox events được giữ bền vững; consumers reporting/automation còn task sau, không đăng ký consumer giả để ACK. UI lỗi409 yêu cầu tải bản mới; API receipt giữ idempotency key cho retry cùng payload.

## Conversation backend — SRC-014

Preview sau rebuild có `/api/v1/conversations`, message timeline/send intent, note và transition ([contract](../contracts/conversation.md)). Worker poll MySQL mỗi giây dispatch mock queued, sending quá60s thành unknown, không resend tự động. Reconcile/retry chỉ internal port, chưa operations UI. Chưa seed channel/identity hoặc public intake, nên queue rỗng ở fixture M1 là đúng; SRC-015 bổ sung intake, SRC-016 inbox UI. Chạy regression `pnpm test:integration`, `pnpm verify:container`.

## Mock Messenger intake — SRC-015

Sau `pnpm preview:up` (schema v10), chạy `pnpm env:init`, `pnpm seed:channels`, `pnpm test:intake`. Seed yêu cầu Identity/registry/M1 fixture đã có; rerun không reset credentials/quyền. Token riêng Alpha/Beta nằm trong .env private, không paste vào chat/log; script gửi qua stdin.

`test:intake` dùng HTTP local + worker thật kiểm ACK/replay/conflict/duplicate message/missing referral và tenant credential scope. Chỉ synthetic, giữ records phục vụ inbox task sau; IDs trong artifacts/SRC-015/e2e-facts.json, không chứa credential/content. `/integrations/deliveries/{id}` trả state/refs sanitized; manual retry cần Human admin và integration.read/retry all. Public endpoint không nhận cookie/Origin/X-Tenant-Id với mock bearer. [Contract](../contracts/mock-intake.md).

Worker claim25/tick1s, lease60s/fencing; crash reclaim, DB transient delay1/5/30/120/600s/max6 attempts; terminal failure chờ operator. Chưa có operations UI hoặc inbox UI.

## Inbox SRC-016

Sau seed M1 và Channels, chạy `pnpm seed:inbox` để cấp role local cho Alpha/Beta admin (repeat no-op, không khôi phục quyền đã thu hồi). Rebuild `pnpm preview:up`, đăng nhập `alpha_admin`, chọn tenant rồi tab **Chat**. Inbound synthetic từ `pnpm test:intake` hiển thị unassigned; có thể ghi chú, chưa gửi khi chưa owner. Public assignment/takeover thuộc SRC-017.

`pnpm test:inbox` chạy Chrome/OIDC với Alpha/Beta/read_only, tạo inbound qua HTTP/worker và dùng harness ownership chỉ cho identity `src016-synthetic-`; giữ synthetic records. Harness không phải API nghiệp vụ. Test mất ACK kiểm đúng một message khi retry cùng key; 403/unknown bổ sung bằng browser fault injection. Artifact `artifacts/SRC-016/`. Không lưu credential hoặc transcript thật.

## SRC-017 — Phân công và tiếp quản

Sau `pnpm preview:up`, chạy `pnpm seed:routing` (cần các seed Identity/CRM/channels/inbox trước). Role routing_operator bổ sung conversation read/assign/takeover cho Alpha/Beta admins, repeat không khôi phục quyền đã thu hồi. Không bật AI policy mặc định.

Tab Chat → chọn Conversation → **Phân công & lịch sử**: chọn owner đủ điều kiện hoặc để hàng chờ, lưu bằng version hiện tại; **Tiếp quản hội thoại** gán caller. Khi dữ liệu đổi, xem lại phân công; nếu mất ACK, **Kiểm tra lại phân công** dùng đúng payload/version/key cũ. Reply composer vẫn yêu cầu xem owner revision mới trước khi gửi. `pnpm test:routing` chạy Chrome/OIDC với synthetic intake, không cần Meta/LLM token thật. Internal round-robin/capacity phục vụ Workflow/Runtime SRC-018/019; chưa tự route inbound qua workflow chưa có.
