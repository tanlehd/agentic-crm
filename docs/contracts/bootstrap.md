# Local Identity bootstrap — SRC-009

**ADR-021:** OIDC/Keycloak seed bên dưới là lịch sử trước SRC-038. Bootstrap hiện tại theo [native runbook](../development/native-auth.md) và exact contract; không chạy các lệnh provider cũ. Native bootstrap phải tạo credential/session trong CRM Identity, dùng one-use enrollment, giữ IDs/membership/password hiện có và tenant_id cho mọi table theo [native auth](native-auth.md). Không auto reset fixture khi thay auth hoặc mỗi lần test; xem [transition](../planning/native-identity-data-plan.md).

Status: Implemented/tested SRC-009, 2026-10-04. Internal operator CLI only; không public endpoint.

`pnpm seed:dev` yêu cầu APP_ENV=development, HTTP loopback APP_ORIGIN, Docker MySQL host mysql/database agentic_crm và schema journal theo manifest hiện hành (v1–v6) đúng checksum. Guard chạy trước provider/DB writes. Test dùng isolated MySQL với APP_ENV=test. Không hỗ trợ production hoặc arbitrary target.

Provision Keycloak local confidential client trước bằng auth:provision. Seed tạo synthetic users alpha_admin, beta_admin, chat_anna, sales_binh, sales_chi, read_only, credential random mỗi user trong .env mode0600 (không vào args/log). Keycloak managed user-profile attribute crm_fixture chỉ admin được view/edit, giữ nguyên profile config khác. Provider user mang fixture marker; đụng username không có marker thì reject. Existing user không reset password/profile/status; provider tạo thành công nhưng DB fail có thể rerun. OIDC subject do provider cấp, account map đúng issuer+subject; không match email.

Một transaction MySQL tạo hai tenant clinic_alpha/clinic_beta, accounts, memberships/Human principals, roles, intake/sales teams, immutable deny-all AI policy, mock intake_ai principal và ctm_service actor. Alias map UUID ổn định; sales_binh UUID trước sales_chi. Advisory lock serialize concurrent bootstrap; DB failure rollback cả hai tenant và audit/outbox. Existing complete fixture là no-op, không rewrite status/seat/role/revision/credentials; thiếu entity/mapping bị đổi thì fail closed để operator kiểm tra, không tự repair/regrant.

Alpha có alpha_admin, chat_anna, sales_binh, sales_chi, read_only. Beta có beta_admin và cùng account read_only để kiểm tra tenant selector; admin mỗi tenant không thuộc tenant kia. Team label Intake/Sales và role keys giống nhau ở hai tenant. Roles tenant_admin/chat_agent/sales_agent/supervisor/viewer theo Identity/healthcare; intake_ai và ctm_automation tách riêng. Tenant admin có Identity read/create/update all; role CRM là fixture cấu hình, capability chưa implement vẫn deny. AI policy tools/actions rỗng tới SRC-018; service role không có schema/admin grants, không mint token và không làm owner.

Bootstrap ghi system audit + principal.access_changed v1 qua reliability application port trong cùng transaction. Rerun không thêm audit/event. SRC-010 bổ sung registry bằng `pnpm seed:registry` ([contract](registry.md)); seed Identity v1 này vẫn không tạo registry/connection/CRM/workflow/field policy và không reset ACL. Không schema migration mới; additive CLI/config không đổi public API.

## Channels fixture — SRC-015

`pnpm env:init` giữ credential cũ và chỉ thêm MOCK_ALPHA_TOKEN/MOCK_BETA_TOKEN ngẫu nhiên64hex trong .env mode0600. `pnpm seed:channels` sau schema v10 và Identity/registry fixture; tokens qua stdin (loại khỏi child env), database chỉ SHA256. Tạo mỗi tenant một channel mock, role mock_ingress + service actor mock_messenger_ingress riêng với integration.deliver/all, integration_operator read/retry all gắn tenant admin fixture; bump principal auth revision/event. Ctm_service/ctm_automation cũ không mở rộng quyền.

Hai tenant chung transaction, tenant locks theo Alpha→Beta. Repeat không regrant role assignment/permissions, không reset connection status/token; mapping/hash khác hoặc fixture thiếu fail closed. Không HTTP provision/rotate token. Connector thật vẫn Draft.

SRC-016 `pnpm seed:inbox` adds local `inbox_operator` role (conversation read/reply/note/update/assign all) to Alpha/Beta admins, once. Repeat preserves role permissions and revoked membership. Requires prior Identity/M1/channel seed; does not assign live conversations. Browser-only ownership fixture restricted to `src016-synthetic-` identities; uses registry assignment with audit/outbox and cancellation hook, no public API.

SRC-017 `pnpm seed:routing` adds routing_operator (conversation read/assign/takeover all) for Alpha/Beta admins once; does not change inbox_operator or restore revoked existing permissions. Requires Identity/inbox fixtures; no AI policy enabled implicitly.
