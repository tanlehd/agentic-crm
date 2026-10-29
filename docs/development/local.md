# Chạy CRM local

Luồng main sau T09: [Chat runtime/runbook](chat-main-local-runtime.md). MySQL/Redis, API/shared worker và owner adapters chạy Docker; web18080 chạy Node host qua TCP entry13001. Native setup/upgrade dành cho đúng môi trường mới hoặc retained test; không chạy lại generator/writer cũ lên main đã cutover. Keycloak đã gỡ khỏi runtime. Không xóa DB/volume/Redis khi khởi động hoặc test thường ngày.

Windows tại repository: `. ./scripts/dev-shell.ps1`; toolchain Node24.21.0/pnpm10.33.0 phải được cài trước. Checkout mới có thể dùng Node chính thức cùng phiên bản; private tooling không được commit.

Ứng dụng máy hiện tại: http://localhost:18080. Monitor: http://127.0.0.1:3020. Đăng nhập bằng fixture Alpha/Beta trong private env; mọi API domain kiểm tenant và quyền trong MySQL. Native runbook là nguồn lệnh khởi tạo mới, thay quy trình provision IdP trước đây.

Docker app preview vẫn là lựa chọn riêng qua `pnpm preview:up`; không chạy đồng thời host và container writers. Preview mới phải được build cùng native source/env, cần seed operator như native runbook; không suy ra production readiness từ local preview.

[Migration](migrations.md) · [Facebook setup](facebook-configuration.md) · [Independent Connector](../../services/crm-connector/README.md) · [Verification](verification.md) · [Tracker](../tracking/tasks.md). Các seed CRM/channel bổ sung vẫn giữ dữ liệu và dùng role/tenant đã tạo; các browser E2E OIDC lịch sử chưa port không thuộc native acceptance.
