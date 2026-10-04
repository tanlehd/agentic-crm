# MOD-01 — Identity & Administration

Status: OIDC SRC-006 và Identity/admin SRC-007 và local seed SRC-009 implemented/tested M1; full Admin UI tiếp tục SRC-013. Requirements: REQ-01, REQ-02, REQ-07.

## Mục tiêu và phạm vi

Quản lý tenant, OIDC account, membership, seat, role, Human/AI principal và team. Tách control plane khỏi dữ liệu CRM. Billing, SSO federation riêng từng tenant và invitation email là backlog.

## Actor và quyền

Tenant admin cấu hình membership/role/team trong tenant; platform operator bootstrap/suspend tenant nhưng không đọc hội thoại. Human có seat + role; AI có entitlement + role + agent policy. Permission theo [security](../system/security-operations.md); team access tính cả primary team và explicit record-team share.

## Use case và state machine

OIDC login → tìm account issuer/subject → liệt kê active membership → chọn tenant → tạo request context. Account đã tồn tại nhưng chưa có membership không được tự gia nhập tenant.

Membership `invited → active ↔ suspended`; M1 admin chỉ thêm account OIDC đã tồn tại trực tiếp active. Tenant `active ↔ suspended`; suspend chặn API tenant, pause enqueue run mới và invalidate credential context. Principal active/suspended theo membership hoặc AI state; reactivation không tự tiếp tục run đã cancelled.

## Entity và invariant

[Dictionary](../data/dictionary.md): account global; các membership/principal/team/role có tenant. Không xóa tenant admin cuối cùng. Đổi role/team/seat/status tăng auth_revision của principal liên quan cùng transaction; service actor role change tăng revision riêng. Role definitions có version; policy cache key chứa auth_revision, TTL tối đa 30 giây nhưng side effect đọc revision trực tiếp từ DB.

Membership mutable có version độc lập. Human principal tự sinh cùng membership; AiAgent + principal tạo atomic. Không cho client tự đặt kind/ref principal để giả làm người khác.

## API và event

[Admin APIs](../contracts/api.md); mutation config kèm Idempotency-Key/If-Match. Phát `principal.access_changed`; worker vẫn kiểm tra trực tiếp khi dispatch, không chỉ dựa invalidation event. Bootstrap role mặc định: tenant_admin, chat_agent, sales_agent, supervisor, viewer; field deny áp dụng sau role union.

## UI

Admin: bảng member (seat, role, team, trạng thái), team roster phân biệt Human/AI, role permission matrix và policy summary. Hiển thị capability thiếu do seat khác lỗi thiếu role. Disable action có lý do khi là admin cuối cùng.

## Failure handling

Session mất hiệu lực → 401; membership thiếu/disabled → 403. Tenant khác không lộ record. OIDC callback state/nonce sai reject. Không tự retry config mutation với body khác dưới cùng idempotency key.

## Acceptance và dependency

[AC-01, AC-02, AC-07](../quality/acceptance.md); phụ thuộc Audit interface và OIDC provider cấu hình khi dựng môi trường. Core quyền phải hoàn tất trước mọi module nghiệp vụ.

## Mở rộng còn Draft

Seat bundle/billing, team hierarchy, delegated admin, SCIM, tenant-specific SSO và support impersonation cần đặc tả riêng.

## Ranh giới triển khai SRC-007/008

SRC-007 chia sub-scope A (schema và lõi quyền), B (admin application/last-admin/concurrency), C (HTTP/schema contracts). CHG-20261003-06 đưa storage/transaction port audit/outbox/idempotency tối thiểu vào SRC-007 để admin mutations đủ contract; relay/inbox/leases và privilege hardening còn SRC-008. Field policy storage chờ object_type SRC-010; lõi quyền hỗ trợ explicit deny ngay từ A. AI/service thiếu entitlement đã xác minh phải deny, role không thay entitlement. Mỗi authorization snapshot gắn tenant/principal/revision; application phải đọc lại DB tại side effect và dùng cùng transaction/lock với mutation.

Sub-scope A ban đầu chỉ có migration/library; B/C đã nối admin HTTP và tenant selector. Matrix capability bước đầu chứa Identity config và Conversation; action chưa được mapping phải deny. CRM/AI/service mappings mở rộng ở đúng module với evidence, không dùng wildcard. `fieldAllowed/readableFields` là primitive sau object authorization; filter và sort đều kiểm action `filter`. Loader Human chưa load field_policy (storage SRC-010), nên không dùng loader này cho endpoint CRM trước khi nối policy port. Availability không thay active membership: unavailable vẫn có thể đọc, eligibility assignment xử lý ở SRC-017.

Exact DTO, last-admin guard và revision semantics: [Identity admin contract](../contracts/identity-admin.md).

SRC-009 Identity fixture scope và repeat/credential policy: [bootstrap contract](../contracts/bootstrap.md). Registry và dữ liệu ngành chưa thuộc seed này.
