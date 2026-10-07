# CRM native authentication và authorization

PLAN-007 / ADR-021, 2026-10-07. **Chốt kiến trúc/hành vi đích**, thay lựa chọn Keycloak/OIDC login của [contract cũ](auth.md). PLAN-007A exact physical/API contract: [implementation](native-auth-implementation.md). SRC-038 đã triển khai native auth trong monolith và cutover local; model bên dưới là logical target, physical fields theo exact contract.

## Trách nhiệm

Identity của CRM tự quản lý account, password credential, session, account recovery, membership, principal, role, team, scope và field policy trong MySQL. MySQL là nguồn chuẩn; Redis chỉ cache/queue (rate limit native hiện ở MySQL), không giữ bản quyền duy nhất. Keycloak không thuộc target dev/test/prod topology, không có OIDC issuer/client secret/JWKS/refresh token phụ thuộc provider. Native login không thay Facebook OAuth dùng kết nối Page.

Giữ thuật toán quyền đã có: active tenant/membership/principal → seat/entitlement → role grant union own/team/all trong đúng tenant → field deny thắng → business/owner/auth revision fences. Không có grant mặc định thì deny. Platform operator không được đọc dữ liệu khách hàng. AI và service actor vẫn tách Human; không dùng mật khẩu nhân viên cho service-to-service authentication.

Account là danh tính người dùng dùng chung nhiều tenant, thuộc system scope Identity theo [DB guideline](../data/database-guidelines.md). Login chỉ chứng minh account, chưa cấp quyền tenant. Chọn tenant từ active memberships; mọi request domain vẫn kiểm `X-Tenant-Id` với session và live membership. Không tự tạo membership khi đăng nhập, đăng ký hoặc trùng email. Không fork role/policy vào claim để trở thành authority thứ hai.

## Mô hình dữ liệu đích

Tất cả bảng có `tenant_id NOT NULL`, keys tenant-bound; logical fields dưới đây phải được physicalized ở PLAN-007A.

| Bảng / scope | Fields/invariants chính |
|---|---|
| account / system | id giữ nguyên, login_key normalized unique, display_name, contact_email optional, status, security_revision, timestamps; email không tự merge danh tính |
| account_credential / system | account_id, password_hash PHC gồm algorithm/salt/parameters, credential_version, changed_at, disabled_at; một active password/account; không plaintext/reversible password |
| auth_session / system | token_hash unique, account_id, credential/security revision, issued_at/last_seen_at/idle_expires_at/absolute_expires_at/revoked_at, csrf binding; account FK system scope |
| auth_token / system | token_hash unique, account_id, purpose enrollment/reset, expires_at, consumed_at, credential_version binding; one-use atomic |
| auth_attempt / system | bounded/rate bucket, hashed login/IP key, window/blocked_until; retention ngắn, không password/raw token; đủ cho fail-closed khi Redis outage |
| legacy_identity_mapping / system | issuer+subject→existing account_id, migration provenance/checksum; read-only migration evidence, không provider login runtime |
| tenant / self-root | tenant_id=id, kind business/system, key/name/status/timezone/locale/version |
| membership/principal/role/team/team_member/principal_role/service_actor/field_policy / business | Quyền/seat/scope trong tenant, revision và last-admin invariant giữ nguyên |
| system_audit_entry / system | Login/recovery/security changes sanitized; không login secret hoặc transcript |

Tenant-specific security change ghi tenant audit; global password/recovery change ghi system audit và revoke sessions account. Domain services không SELECT account_credential/auth_token; chỉ Identity credential role được đọc. Session context không chứa role list authoritative.

## Login, session và recovery

Password baseline Argon2id (OWASP floor19MiB/t2/p1); chọn/pin thư viện hoạt động Node24 Windows/macOS/Linux và benchmark concurrency trước source gate. Salt riêng mỗi password; không tự cài crypto. Mật khẩu tối thiểu15, tối đa128 ký tự, chấp nhận khoảng trắng/Unicode, không trim/normalize/truncate password, không luật composition bắt buộc. Chặn password phổ biến theo danh sách offline versioned; không gửi password sang dịch vụ ngoài. Login key normalization và Unicode collision rules chốt trong machine contract, không áp quy tắc email tùy tiện.

Login bảo vệ Origin và one-use preauth CSRF challenge. Giới hạn theo login key và IP; baseline5 lần sai/key trong15 phút,30 lần/IP trong15 phút, backoff có TTL; không permanent account lock do người lạ gây ra. Unknown account chạy dummy password verification có chi phí tương đương và trả cùng thông báo. Rate limit/auth dependency lỗi fail closed, không bypass khi Redis chết; MySQL limiter fallback phải kiểm thử race/load.

Sau login, random opaque session token32 bytes, chỉ hash trong MySQL; HttpOnly/SameSite=Lax/Secure cookie (ngoại lệ HTTP loopback dev/test). Rotate session sau login và privilege-sensitive reauth. TTL idle8h/absolute24h như baseline, authority trong DB; Redis cache miss không làm mất session durable. Mỗi authenticated request phải xác nhận session còn hiệu lực và current security_revision; credential reset/revoke không phụ thuộc TTL cache. Mutation kiểm Origin+CSRF. Token/cookie/password không xuất hiện trong URL, log/audit hoặc browser storage.

Password change cần current password hoặc hợp lệ recovery grant, không chỉ cookie cũ. Reset/enrollment token32 bytes, hash persisted, TTL15 phút, một lần; concurrent consume chỉ một thắng. Commit password version/security_revision + consume token + revoke old sessions atomic trong Identity. Không auto-login sau recovery. Không gửi email thật khi chưa có email adapter và phê duyệt tác vụ tương ứng; local operator cấp one-use enrollment qua kênh local bảo mật, không ghi ra tracker/log.

Account không active, session revoke/expiry →401 generic. Tenant/membership thiếu hoặc bị khóa →403, không lộ record. MySQL auth unavailable →503; không fail open. Redis mất thì quyền/session trong MySQL vẫn authoritative, cache được rebuild. Rate-limit fallback chưa chứng minh được thì từ chối login tạm thời thay bypass.

## Route compatibility proposal cho PLAN-007A

| Route đích | Hành vi bắt buộc |
|---|---|
| GET `/auth/login` | Redirect tới trang `/login` cùng origin, không external provider; return_to vẫn phải validated |
| GET `/auth/login-challenge` | One-use browser-bound preauth CSRF, no-store, bounded expiry |
| POST `/auth/login` | Native login_key/password/challenge; rotate cookie, generic401/429/503, không token trong response body |
| GET `/auth/session`, GET `/auth/csrf` | Giữ shape compatible hiện tại nếu có thể; không expose credential/provider claims |
| POST `/auth/logout` | Atomic local revoke+clear cookie, CSRF/Origin; không gọi provider |
| POST `/auth/password/change` | Current-password reauth, version checks, revoke sessions |
| POST `/auth/password/reset-request` | Response generic không tiết lộ account; chỉ deliver qua adapter đã được cấu hình |
| POST `/auth/password/reset-complete` | One-use token + new password; fail closed, không auto-login |

GET `/auth/callback` cũ không tạo session sau cutover; trả410 sanitized. Public enrollment/self-registration, MFA/passkeys/enterprise SSO và impersonation chưa thuộc native first slice. Trước production phải threat review và chốt MFA/admin recovery policy ở deployment gate. External integration và service workload credentials giữ contracts riêng.

## Acceptance bắt buộc trước bỏ Keycloak runtime

NATIVE-01 login/logout/session expiry/restart từ MySQL; wrong password/user response indistinguishable. NATIVE-02 CSRF/login CSRF/return_to fixation và reset replay/concurrent consume. NATIVE-03 shared account ở Alpha/Beta giữ principal/seat/own-team-all/field deny và last-admin CAS. NATIVE-04 revoke/password reset/account disable hiệu lực ngay request tiếp theo, including stale Redis cache. NATIVE-05 DB down fail closed; Redis down không bypass limiter hoặc permission. NATIVE-06 browser native login + tenant switch + domain write; không request tới Keycloak/JWKS/OIDC callback. NATIVE-07 rerun bootstrap giữ credential/quyền/dữ liệu cũ; recovery chưa configured không gửi giả. NATIVE-08 no secrets in request logs/errors/audit/snapshots.

SRC-038 local scoped acceptance PASS:16 native MySQL tests,222 domain regression cases, native browser tenant ACL/write/replay/CSRF/logout/API restart, restricted grants. [Evidence](../tracking/details/SRC-038.md). No email adapter/general onboarding/production acceptance; historical OIDC tests không thay native evidence.
