# Native Identity và chuyển đổi schema

PLAN-007 / ADR-021. User-authorized2026-10-07; [guideline](../data/database-guidelines.md), [schema catalog](../data/schema-catalog.md), [native auth](../contracts/native-auth.md). PLAN-007 đóng thiết kế chuẩn và nghiên cứu; không đóng implementation của auth/schema extraction.

## Phạm vi đã quyết định

Loại Keycloak khỏi thiết kế đích dev/test/prod. CRM Identity quản lý credential/session/permission trong MySQL. Mọi application table có tenant_id NOT NULL, kể cả system tables theo explicit system tenant. Domain schemas có owner riêng; không database-per-tenant, không cross-service SQL/FK/UoW. Giữ Human/AI ownership, shared account/multi-tenant membership, durable versions và persistent test data.

## Thứ tự chuyển đổi

| Gate | Deliverable | Dependency / trạng thái |
|---|---|---|
| PLAN-007A | Exact native-auth DTO/JSON schemas, login UX, password library+parameters, enrollment/reset delivery, MySQL DDL/grants, journal bootstrap upgrade và cutover test plan | PLAN-007; DONE, exact implementation contract Ready |
| Native auth source slice | Additive credential/session/recovery tables, native UI/API, preserve account IDs/memberships/principals, permission regression, password enrollment | SRC-038 implemented; evidence trong tracking/details/SRC-038.md |
| Native auth cutover | Quiesce/auth maintenance, revoke OIDC sessions, validate native login, remove Keycloak service/realm/provision/health dependency/env routes khỏi Compose/monitor/build/tests | SRC-038 local cutover đạt; Keycloak stopped, volume giữ nguyên |
| Tenant-column retrofit | Inventory all source-created tables including journals/account/tenant; additive mapping/backfill/index/check; new journal runner compatible; same-tenant negative tests | Exact DDL/runner gate; không sửa applied migration history |
| PLAN-007B | Per-schema extraction manifests: table/row ownership, API/saga replacements, local metadata partition, single-writer cutover, counts/checksums/rollback/grants | PLAN-007 + PLAN-006 contracts scoped cần thiết; TODO |
| Schema extraction source | Chuyển lần lượt owning services vào database catalog sau khi loại cross-module transactions tương ứng | PLAN-007B scoped gates và dependencies DONE; không di chuyển tất cả bằng rename SQL |

Native auth có thể triển khai additive trong monolith trước physical Identity extraction; target_schema vẫn crm_identity. Không bắt auth replacement phải chờ toàn bộ microservices. SRC-034 disposition theo tracker; không tự đánh DONE, không tiếp tục SRC-035 trước gate của nó. Bảng mới từ bây giờ phải khai báo target schema và chuẩn tenant; legacy debt có migration task riêng.

## Account/credential migration không mất dữ liệu

1. Chụp restricted backup và inventory account IDs/issuer+subject/membership/principal/role/team references; không đưa secrets vào evidence.
2. Giữ account IDs và quyền hiện có. Tạo mapping read-only legacy issuer+subject→account_id có tenant system; không gộp theo email và không cấp thêm membership.
3. Không giả định có thể lấy plaintext/import mọi password hash từ Keycloak. Accounts cũ ở `credential enrollment required`; verified one-use enrollment hoặc reset quy trình đã kiểm chứng. Synthetic users được provision native idempotent, không rotate credential mỗi test.
4. Native sessions bắt đầu sạch vì đổi protocol, nhưng không FLUSH Redis chung và không xóa dữ liệu CRM; native runtime từ chối toàn bộ cookie OIDC cũ vì không có record MySQL tương ứng; Redis cũ chờ expiry, không đọc làm fallback. Người dùng đăng nhập lại có chủ đích.
5. Cutover single auth authority; không bật fallback sang Keycloak khi native auth lỗi. Rollback trước writes mới bằng deployment restore đã test; sau password/permission changes phải reconcile trước rollback, không tái cho phép session cũ.

## Schema/table migration

Inventory từ migrations source là chuẩn, không chỉ information_schema của DB hiện tại vì inventory phải khớp manifest source23. Mỗi bảng/link/journal ghi current DB, target DB, scope, owner, transaction coupling, row split và migration/backfill mapping. `crm_record`/ownership/share, `ai_agent`/agent_policy, audit/outbox/inbox phải chia theo authority, không chuyển cả bảng sang một schema rồi grant mọi service.

Backfill tenant_id: existing business rows theo tenant ref có chứng cứ; account/session/schema journal dùng registered system tenant; tenant row self-root. Orphan/ambiguous mapping chặn cutover, không dùng tenant bất kỳ. NOT NULL/CHECK/composite indexes được enforce sau validation; code cũ có thể không compatible với required column, phải deploy compatible writer/runner trước contract phase.

Migration journals giữ version/name/checksum/state cũ; thêm scope bằng forward bootstrap upgrade idempotent có lock và compatibility version. DDL schema-wide chỉ chạy một lần; tenant backfill tracker riêng. Không tạo journal mới rồi coi dữ liệu cũ chưa migrate, không tái chạy history.

Sau extract: runtime credential own schema only; FK trong schema, logical cross-service refs; application ports cũ bị disable cho ownership đã chuyển. Dùng API/event reconciliation, watermark và counts/hashes/permission comparison; không dual-write thủ công. Test cold install riêng, warm upgrade và persistent tenant reuse đều bắt buộc.

## Tình trạng hiện tại

SRC-038 DONE native auth + tenant retrofit + local cutover. Keycloak container đã dừng, volume giữ nguyên; Compose/proxy/monitor chỉ dùng native MySQL auth. DB local23;71 bảng gốc và6 accounts giữ qua upgrade,81 bảng giữ qua repeat. Source monolith hiện tại chưa tách13 schema; PLAN-007B và production Linux deployment/MFA/HA vẫn gate riêng.
