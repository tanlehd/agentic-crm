# Auth transport contract

Status: Implemented SRC-006 cho Keycloak local, session/CSRF và auth-only UI; [evidence](../tracking/details/SRC-006.md). Membership/tenant authorization ở SRC-007.

## Endpoints

Auth routes nằm ngoài `/api/v1`, cùng origin gateway. OIDC là Authorization Code + PKCE S256, confidential server client; browser không nhận access/refresh token.

| Route | Request | Response |
|---|---|---|
| GET `/auth/login` | `return_to` optional, default `/`; chỉ path cùng origin, cấm `//`, absolute URL và control characters | 302 tới authorization endpoint; state/nonce/verifier lưu server-side một lần, hết hạn 10 phút |
| GET `/auth/callback` | `code,state` hoặc provider error | Validate state+browser login cookie, consume atomic; đổi code qua private backchannel; validate issuer/audience/signature/nonce/exp; rotate session, 303 tới return_to |
| GET `/auth/session` | Cookie session | 200 `{data:{account_id,display_name,expires_at},meta:{correlation_id}}`; không session 401 theo error envelope |
| GET `/auth/csrf` | Session hợp lệ | 200 `{data:{csrf_token},meta:{correlation_id}}`, Cache-Control no-store |
| POST `/auth/logout` | Cookie + `X-CSRF-Token` + Origin | Revoke local session trước; clear cookie; 204 ngay cả khi IdP revocation lỗi; không tự đăng nhập lại |

Auth routes không cần X-Tenant-Id; tenant authorization chỉ tại domain APIs. Logout là session protocol, không yêu cầu Idempotency-Key/If-Match của business command. Login failed trả error page/message không chứa code/token/provider raw error; token exchange lỗi thì không tạo session.

## Session và cookie

- Opaque session ID ngẫu nhiên 32 bytes, rotate sau callback; lưu Redis bằng hash ID, không log cookie. Cookie `crm_session`, Path=/, HttpOnly, SameSite=Lax; Secure=true trừ local HTTP loopback development/test.
- Redis payload: account_id, created_at, last_seen_at, absolute_expires_at, csrf token hash, access/refresh/id token mã hóa bằng server session encryption key; không lưu quyền tenant như authority cố định.
- TTL idle 8 giờ, absolute 24 giờ; sliding TTL không vượt absolute. Session query thành công có thể refresh idle; CSRF/invalid request không kéo dài phiên.
- Token refresh trước access expiry 60 giây bằng per-session lock; refresh bị revoke/invalid_grant thì invalidate session và trả 401. Network/IdP transient trả 503, không bypass identity validation.
- Callback login cookie `crm_login` ràng buộc browser flow, Max-Age=600, HttpOnly/SameSite=Lax; one-use Redis state dùng atomic consume. State replay/mismatch/expiry → 400 AUTH_CALLBACK_INVALID.
- CSRF là random token ràng buộc session, so constant-time hash; mutation kiểm tra Origin đúng APP_ORIGIN và token. Không chấp nhận bearer token từ browser thay session trong M1.
- Redis outage fail closed cho human auth: 503 lúc không truy cập session store, 401 khi store phục hồi nhưng session đã mất; không ảnh hưởng durable CRM state.
- Logout backend cố revoke refresh token, không redirect top-level browser sang arbitrary URL. Single logout toàn bộ IdP sessions chưa thuộc M1.

## Identity và môi trường

OIDC subject unique `(issuer,subject)`; lần đăng nhập đầu tạo Account nếu chưa có, không tự thêm Membership. Bootstrap riêng gắn account fixture đã tồn tại. Public dev issuer `http://localhost:8080/identity/realms/agentic-crm-dev`, callback `http://localhost:8080/auth/callback`; APP_ORIGIN port đổi thì realm redirect URI/issuer phải đổi tương ứng.

Backchannel token/JWKS endpoint nội bộ được cấu hình allowlist từ cùng realm; không dùng token `iss` làm URL fetch tùy ý. Discovery/JWKS TLS validation luôn bật ở staging/production. Test state/nonce/CSRF/session expiry/revocation và public/private hostname ở SRC-006.

Account lifecycle authorization theo [Identity](../modules/identity.md); payload/error envelope theo [API](api.md). Bootstrap credential tạo ngẫu nhiên local, không commit secret. Phạm vi này không đóng membership/tenant authorization.

## SRC-006 implementation detail

CSRF token ổn định trong một session, dẫn xuất HMAC-SHA256 từ opaque session ID bằng key riêng dẫn xuất từ encryption key; Redis giữ hash để so constant-time. Session payload mã hóa AES-256-GCM (bao gồm token); Redis key chỉ chứa SHA-256 ID. Session update compare-and-set không tạo lại session đã logout; refresh lock có token và compare-delete, request khác nhận 503 retryable khi đang refresh. Cookie expiry theo absolute deadline, Redis kiểm idle authoritative.

Callback consume chỉ thành công khi state và hash browser cookie khớp; mismatch không phá flow hợp lệ. Login dùng prompt=login để sau logout local không tự tái đăng nhập từ IdP SSO cookie. return_to cấm backslash và encoded control/backslash/slash prefix có thể thành external redirect. Auth response có no-store, no-referrer; gateway không access-log /auth/ hoặc /identity/ để tránh code/state trong URL.

Local provision tạo confidential client agentic-crm-web (S256 bắt buộc, exact callback URI) và synthetic user auth_demo; credential ngẫu nhiên trong .env không log. Chỉ auth fixture, không seed tenant/membership SRC-009. Không sửa migration v1. JWT verifier dùng jose, RS256 allowlist, configured public issuer/audience, required exp/iat/sub và nonce. Provider/token/JWKS request bounded timeout, không follow redirects; private backchannel chỉ realm cấu hình.
