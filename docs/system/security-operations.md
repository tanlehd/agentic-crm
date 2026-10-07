# Tenant isolation, quyền và vận hành

Status: Ready for implementation cho M1–M2.

## Tenant context

Target ADR-021: Human đăng nhập native CRM; Identity sở hữu password hash Argon2id, durable session và quyền trong MySQL theo [native auth](../contracts/native-auth.md). Browser dùng opaque session cookie HttpOnly/Secure/SameSite=Lax; mutation kiểm CSRF/Origin, live session/revisions. Keycloak/OIDC chỉ còn baseline chờ cutover; không gộp account bằng email.

Ngoại lệ chỉ cho local development/test qua HTTP loopback: cookie có thể Secure=false; staging/production bắt buộc HTTPS và Secure=true. Trong baseline OIDC chưa cutover vẫn giữ issuer validation; target native không có issuer/private backchannel dependency. Xem [Docker plan](docker-development.md); exact auth routes/session contract được bổ sung ở SRC-001 trước code.

Tenant được chọn qua `X-Tenant-Id`; backend xác thực membership active từ session, không tin header độc lập. Service actor/token bị khóa vào một tenant. Webhook thật về sau ánh xạ tenant từ connection đã xác minh; mock endpoint chỉ nhận credential integration mock đã provision.

Mọi repository method cần explicit TenantContext hoặc SystemContext ở control-plane allowlist; mọi table có tenant_id NOT NULL theo [guideline](../data/database-guidelines.md), account/tenant/journal không còn ngoại lệ bỏ cột trong target. MySQL không được giả định có row-level security tự động; query wrapper + composite FK + integration test là các lớp kiểm soát. Cache key, job, event và cursor đều phải có tenant. Không tải record theo ID rồi mới lọc tenant ở frontend.

## Thuật toán quyền

1. Session/service credential hợp lệ; tenant và membership/principal active.
2. Human có seat chứa capability; AI/service có entitlement tương ứng. Seat không cấp role.
3. Role cho phép `resource.action` với scope; nhiều grant kết hợp bằng union. Không có grant thì deny.
4. `own`: record.owner là caller principal; `team`: record.team hoặc một `record_team_access` nằm trong các team caller đang active; `all`: trong tenant. Record unassigned không thuộc scope own. Team share không tự cấp action chưa có trong role.
5. Field-level deny/redaction thắng object grant. Filter, sort, export và report không được dùng field bị cấm để suy luận dữ liệu.
6. Kiểm tra business guard, agent policy và revision; audit command được chấp nhận hoặc từ chối nhạy cảm.

Đọc association đòi quyền đọc cả hai đầu; không lộ existence/label/count của đầu bị ẩn. Có quyền Conversation không tự có toàn bộ Contact: API trả `contact_id` chỉ khi có quyền Contact, nếu không trả `contact: null` và conversation-local display label. Các fixture cùng intake team bảo đảm chat agent có Contact scope team.

Related record chỉ hiển thị sau khi kiểm tra riêng. Với lead bàn giao, team của Lead chuyển sang Sales; Contact cần được chia sẻ có chủ đích bằng grant `record_team_access` cho Sales, không chuyển owner Contact ngầm.

Tenant admin là role dữ liệu trong tenant. Platform operator chỉ quản lý trạng thái tenant/hạ tầng, không có quyền đọc message/CRM mặc định. Truy cập hỗ trợ dữ liệu thật cần cơ chế time-bound được thiết kế trước production, ngoài M2.

## Seat mặc định

| Seat | Capability |
|---|---|
| viewer | Đọc record/dashboard được role cho phép |
| chat | Viewer + xử lý conversation/qualification |
| sales | Viewer + xử lý lead/deal/task |
| service | Viewer + xử lý ticket |
| admin | Cấu hình tenant và mọi workspace, vẫn cần role |

Một membership có một seat trong M1; người cần nhiều workspace dùng admin entitlement nhưng có thể mang role hạn chế. Combo seat/billing là Draft. AI không tiêu thụ human seat; giới hạn concurrency/cost do AI entitlement và policy quản lý.

## Dữ liệu và vận hành

- Fixtures tổng hợp; không lưu chẩn đoán/bệnh án trong case healthcare. Có consent/contact preference; không coi click quảng cáo là đồng ý mọi mục đích marketing.
- Secret integration mã hóa bằng secret manager/reference; không có plaintext trong audit, event, runtime context hay log.
- Application log chỉ ghi IDs, trạng thái, latency/error code; nội dung message/PII không vào log mặc định. Audit lưu field name và giá trị đã redact với field nhạy cảm.
- M2 có soft-delete/archive cho record; không xóa cứng object/field đã được version tham chiếu. Production retention/erasure/backup retention cần policy được duyệt ở M3; không tuyên bố đạt chứng nhận pháp lý.
- Propagate `correlation_id`, `event_id`, `run_id`, `step_id`, `delivery_id`; dashboard vận hành theo tenant nhưng quyền xem hạn chế.
- Theo dõi inbound lag, oldest outbox age, failed jobs, handoff queue age, stale owner rejection, runtime timeout và duplicate suppression. Đặt cảnh báo dev/staging: outbox tồn >60 giây, job failed sau retry, handoff pending >15 phút.
- Business health dựa trên DB + khả năng enqueue; readiness API fail khi DB không truy cập được. Redis lỗi: intake vẫn nhận nếu persist thành công, hiển thị trạng thái xử lý chậm; outbox relay phục hồi sau.

## Cạnh tranh và thu hồi quyền

Mutation record dùng `If-Match` row version; assignment còn tăng `owner_revision`. Worker kiểm tra owner/policy tại lúc nhận job, ngay trước tool side effect và lúc commit. Disable actor hoặc handoff làm các turn AI cũ stale.

Outbound đang `queued` bị hủy khi owner thay đổi. Nếu request provider đã thực sự bắt đầu, không thể thu hồi chắc chắn: lưu `sending/unknown`, reconcile, hiển thị lịch sử; không gửi lại mù. UI không được tuyên bố đã ngăn mọi message đang in-flight.

## UX-002 — Workspace permission extension

[Workspace authorization matrix](../contracts/agent-chat-workspace.md) bổ sung chat_inbox.manage/share, conversation_tag.manage, chat_snippet.read/manage và conversation.tags field policy. Read marker chỉ Human principal của session; admin entitlement có chat capability vẫn phải có grants. Own chat_inbox nghĩa creator; share grant chỉ definition, không Conversation/Contact/run access. Metrics/filter/sort/tags/search đều apply viewer ACL trước query; không lộ count global. Snooze/update không tự cấp reply/ownership; notes/run sources authorize độc lập khi hydrate activity. Role fixture grants phải explicit ở implementation, không auto-grant toàn bộ tenant roles.
