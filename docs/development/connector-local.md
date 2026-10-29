# Connector ingress local — SRC-107

D1 của [delivery plan](../planning/service-delivery-reset.md). Chạy normalized **mock ingress** qua Connector container → native backend API3001 → backend worker3002 → Chat message thật trong database local. Chưa bật real Messenger/provider, Human outbound mới hoặc tách database Chat. Backend schema37 giữ nguyên; image Connector hiện tại yêu cầu own schema5.

## Composition và dữ liệu

Runtime dùng sẵn `services/crm-connector`: `main.ts` compose `Store`, HTTP API và `Worker`; worker gọi binding/contact lookup/resolve/deliveries-v2/receipt qua HTTP. Không thêm domain framework, không import backend hoặc truy vấn database backend từ Connector. Operator acceptance dùng truy vấn đọc có tenant/connection/message filter để xác nhận message persisted; đây không phải quyền runtime.

Project `agentic-crm-connector-local` dùng database `connector_local`, volume riêng, API3010, worker probe3011, MySQL13307; chỉ publish loopback. `compose.connector.local.yaml` ghi đè image bằng immutable ID trong `.local/connector-local.env`. Image được build bằng target Connector độc lập, không build backend/web. Project acceptance cũ `agentic-crm-connector-retained` với schema2 và tag `agentic-crm-connector:local` được giữ nguyên, không nâng hoặc xóa volume cũ.

Tái sử dụng synthetic tenant Alpha và mock downstream binding Alpha đã được seed. Local ingress binding mới có ID/token riêng được tạo một lần rồi giữ lại. Không tạo tài khoản/quyền backend, không rotate token, không thay binding đang được các flow khác sử dụng. Fixture mismatch Beta chỉ nằm trong Connector và bị disable sau negative test. Schema5 chứa các bảng dispatch nền tảng nhưng entrypoint vẫn chỉ kích hoạt ingress/capture hiện có; không suy outbound active từ bảng tồn tại.

## Lệnh thực tế

PowerShell: `. ./scripts/dev-shell.ps1`. Docker Desktop, local backend/worker và monitor3020 cần đang chạy; existing `.env` phải là development/localhost18080/agentic_crm và có mock Alpha credential phù hợp. Không in file env.

```powershell
docker build --target connector -t agentic-crm-connector:src107 -f infra/docker/Dockerfile .
pnpm connector:rollout --apply
pnpm connector:rollout --check
pnpm connector:rollout --status
```

Apply lần đầu tạo private env; pin image ID từ tag candidate và giữ pin ở các lần sau. Không rebuild/repoint pin tự động. Preflight kiểm image manifest/checksums, registered system tenant, native binding/lookup, API/worker health và không thay process do monitor quản lý. Chạy migration/grant/provision bằng explicit admin container trước API/worker; startup không chạy DDL. Runtime chỉ có own-table DML/SELECT, không nhận migration password. Env và dữ liệu đều retained.

`--check` kiểm candidate đã được pin, không tạo env mới hoặc migrate. `--status` đọc probe3010/3011, Compose và registry mới qua observer loopback3021 ngắn hạn; observer đóng ngay, không sở hữu app con. Port3021 phải trống. Artifact ghi riêng trạng thái monitor3020 cũ. Monitor3020 khởi động trước SRC-091 vẫn báo worker `unknown (no readiness probe)`; không giả ready. Registry source mới đã có probe; áp dụng vào3020 ở lần khởi động monitor tiếp theo, không restart hiện tại vì sẽ dừng API/worker/web con. Dùng `--status` hoặc Docker health để xem worker ngay.

`.local/services/connector-api.env` và `connector-worker.env` phục vụ quan sát; bản trước rollout giữ ở `.before-src107`. Container do Compose quản lý, `owned:false`. Không bấm Start host khi container đang chạy trên cùng cổng. Khi container dừng, vẫn dùng Compose/script để khởi động đúng image đã pin.

## Nghiệm thu theo phạm vi

```powershell
pnpm test:connector:local
# Chỉ chạy lại vận hành/rollback sau khi sửa observer, không lặp outage/tenant suites:
pnpm test:connector:local --ops
```

Full acceptance kiểm journal/no-op/restricted grants, luồng thật và message hash/count, replay/conflict/tenant denial, mismatch trước forward, upstream outage, lost ACK, graceful restart, current registry, rollback/reapply. Fault proxy13112 chỉ chuyển tiếp tới actual backend3001 với binding Alpha; không giả response nghiệp vụ. Proxy được đóng và worker trở lại origin3001 sau test; không dừng shared backend/MySQL để fault-inject. Tin synthetic, receipts và volume giữ lại. Stable event kiểm replay qua nhiều lần chạy; outage/mất ACK dùng event riêng từng lần.

`--ops` kiểm lại persisted stable message, restart/readiness và rollback/reapply trên cùng pin. Evidence phải dẫn cả network run và operations run; không gọi `--ops` là full regression. Lỗi đầu tiên được giữ trong artifact, không sửa thành PASS.

## Dừng và rollback

```powershell
pnpm connector:rollout --rollback
```

Rollback dừng ingress API trước, chờ mọi queued/forwarded delivery hoàn tất, disable đúng local synthetic binding rồi dừng worker, phục hồi monitor env trước rollout. Timeout khi còn pending thì giữ worker/data và báo lỗi; xử lý queue trước khi thử lại. Không disable remote Alpha binding, không rollback backend qua pending v2 payload, không down/delete volume. Database vẫn chạy để giữ receipts và kiểm tra vận hành. Apply lại chỉ kích hoạt cùng immutable binding/image; không đổi tenant/remote mapping.

Rollback D1 trở về trạng thái trước activation: Connector không phục vụ, backend/Reporting giữ nguyên. Đây không phải downgrade schema5 về2; image2 không được chạy trên database5. Đổi image/pin tương lai cần compatibility và drain gate riêng. Artifacts ở `artifacts/connector-rollout`; private config ở `.local`, không commit/push tự động.
