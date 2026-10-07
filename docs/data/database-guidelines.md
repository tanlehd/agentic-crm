# Database design guideline — Agentic CRM

Status: Ready cho chuẩn thiết kế và review bảng mới. PLAN-007 / ADR-021, 2026-10-07. Chuẩn áp dụng schema ứng dụng do repository quản lý; không thay cấu trúc `mysql`, `information_schema`, `performance_schema`, `sys` do MySQL sở hữu. Existing migrations là lịch sử bất biến; [transition plan](../planning/native-identity-data-plan.md) quản lý chuyển đổi.

## Chọn schema trước khi viết DDL

Bắt buộc chọn [schema catalog](schema-catalog.md), service owner, aggregate và source-of-truth/projection. Điền [template table](../templates/database-table.md), cập nhật dictionary và acceptance. Không có bảng mới chỉ vì UI cần một list; ưu tiên model/domain đã có. Không cross-schema SQL, FK, view, trigger hoặc shared UoW giữa services, kể cả khi chung MySQL instance.

## Tenant ID: không có ngoại lệ bỏ cột

Mọi bảng ứng dụng đích có `tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL`: entity, child/link, config, credential, session, token, audit, cache projection, outbox/inbox/receipt, migration journal và backfill tracker. Không dùng NULL, chuỗi rỗng, zero UUID hoặc default ngầm để né tenant context. Framework/tooling tạo bảng phụ cũng phải được cấu hình tuân chuẩn hoặc không được chọn.

Hai loại scope, được khai báo theo bảng:

| Scope | Ý nghĩa | Quy tắc truy cập |
|---|---|---|
| `business` | Dữ liệu thuộc tenant khách hàng | `tenant_id` lấy từ TenantContext đã xác thực; mọi query/update/delete và key cache/job gắn tenant; cấm system tenant |
| `system` | Dữ liệu điều khiển platform/schema, không thuộc một tenant khách hàng | `tenant_id=PLATFORM_TENANT_ID` cố định của deployment, là system tenant đăng ký thật trong Identity; chỉ API/repository/operator riêng được truy cập |

System tenant không phải wildcard, không có business seat/membership và không nhận request `X-Tenant-Id` từ domain APIs. Customer admin không được tạo/chọn/sửa system tenant. Giá trị ID được bootstrap manifest cố định trước migration, không là secret, không được tái sinh mỗi lần chạy. Runtime domain repository không được fallback sang system context nếu thiếu tenant.

`tenant` là bảng root đặc biệt nhưng vẫn có cột: mỗi row `tenant_id=id`, có `kind=business|system`, CHECK equality và unique tenant key. Bootstrap tạo system root bằng operator, rồi business roots. Ngoài Identity, logical tenant reference không có FK sang `crm_identity.tenant`.

Account đăng nhập dùng chung nhiều tenant vẫn được giữ: `account`, `account_credential`, `auth_session`, `auth_token`, `auth_attempt`, `legacy_identity_mapping` thuộc system scope trong Identity. Membership/principal/role/team/field_policy thuộc business scope. Quyền luôn lấy membership của tenant được chọn, không suy ra từ `account.tenant_id`.

Membership tham chiếu account system qua reference **có chủ đích**: `account_scope_tenant_id` cố định bằng PLATFORM_TENANT_ID + `account_id`; same-schema FK tới `account(tenant_id,id)`, CHECK scope constant và unique `(tenant_id,account_id)`. Đây là platform identity link được allowlist riêng, không áp dụng cho business-to-business references. Principal→membership vẫn dùng cùng tenant. Existing account IDs được giữ để không mất quyền/history của multi-tenant user. Không merge account theo email.

`schema_migration` thuộc system scope, một journal cho một schema, unique `(tenant_id,version)`, chỉ một system tenant được CHECK/runner chấp nhận; không chạy DDL một lần cho mỗi business tenant. Nó được tạo bằng bootstrap schema operator trước Identity tenant row; không FK xuyên schema hoặc tự tạo cycle. Backfill nghiệp vụ theo tenant dùng bảng tracker business-scoped riêng. Audit/outbox dành system operations và business operations dùng các bảng riêng `system_audit_entry`/`system_outbox_event` và `audit_entry`/`outbox_event`; không trộn scope trong cùng table nếu không có contract riêng.

## Keys, relationships và isolation

- Entity mới: `PRIMARY KEY (tenant_id,id)` mặc định; UUID v7 compatible với current CHAR36, không đổi applied ID encoding. Bảng legacy có PK(id) + unique(tenant_id,id) tiếp tục tới migration được kiểm chứng.
- Child/link: PK chứa tenant và natural relationship keys; không bắt buộc thêm surrogate id nếu không cần. Mọi FK nghiệp vụ same-schema chứa tenant ở cả hai đầu và trỏ unique/primary key tương ứng. Không dùng ID-only FK cho business reference.
- Natural business uniqueness bao gồm tenant, ví dụ `(tenant_id,external_namespace,external_id)`. Account login key system scope unique `(tenant_id,login_key)`; đó là account registry toàn platform, không phải role global. Security/routing invariants có thể cần thêm global unique được ghi rõ: một Facebook App/Page không được bind hai tenant, token digest không được trùng credential. Không bỏ `UNIQUE(app_id,page_id)` hiện có chỉ để thêm tenant vào mọi index; tenant column vẫn bắt buộc, collision response không lộ tenant khác. Ngoại lệ global uniqueness cần threat model/contract và reviewer, không là quyền đọc toàn bảng.
- Service reference lưu `tenant_id`, resource ID, source service/kind khi cần phân biệt; xác minh bằng API/events, phân biệt missing/forbidden/unavailable, không ngầm tạo lại canonical data khi remote lỗi.
- MySQL không tự cung cấp tenant row policy cho app này: bắt buộc TenantContext tại repository, SQL predicate, authorization, negative integration tests; không chỉ dựa FK hoặc frontend.
- Bulk, export, aggregates/count, cursor, background jobs, retry và dead-letter đều áp tenant/ACL. Worker quét nhiều tenant dùng dispatcher riêng, tạo context từng job; không biến scan thành quyền mutate xuyên tenant.

## Shape, naming và indexes

Lowercase snake_case, tên theo domain đơn số, link `<entity>_<relation>`; không tạo bảng/cột theo tenant. Tên FK/index có table prefix, không trùng constraint trong schema. Mọi bảng có COMMENT mô tả owner/purpose; column nhạy cảm, units và reference semantics ghi trong dictionary.

Mutable entity có `version BIGINT UNSIGNED`, created/updated UTC `DATETIME(6)`; version CAS trên mutation. Owner có revision riêng khi contract cần fencing. Append-only events có timestamp/sequence/fence riêng; không thêm updated_at giả. Soft-delete/archive chỉ theo domain retention; không blanket cascade xóa audit, membership history hoặc durable receipts.

Text utf8mb4/utf8mb4_0900_as_cs như baseline; identifiers/hash dùng ASCII binary hoặc VARBINARY. Quy tắc case/normalization của login/external key phải explicit. Tiền DECIMAL + currency; API decimal string; không FLOAT cho tiền. Boolean CHECK, bounded VARCHAR, enum dùng validation + CHECK/lookup versioned. Không mặc định làm nullable để né lifecycle chưa rõ.

Typed columns cho core state, relationship và dữ liệu hay query. JSON chỉ cho metadata/custom values/versioned provider payload có schema/size bound; không giấu relational ID hoặc quyền trong JSON tùy ý. Custom object/field dùng metadata + typed index theo baseline, không ALTER TABLE theo mỗi tenant; primary business fields không bị custom field ghi đè.

Indexes từ access pattern và EXPLAIN: thường bắt đầu tenant, rồi equality fields, range/order và stable id tie-breaker. Unique natural key tenant-bound; queue dispatcher được dùng index `(status,due_at,tenant_id,id)` khi có thiết kế bounded cross-tenant scan. Không tự thêm index mọi field; tính write/storage cost và pagination không OFFSET sâu.

## Credentials, quyền và grants

CRM Identity là authority authentication/authorization trong MySQL; [native auth](../contracts/native-auth.md). Hash mật khẩu bằng Argon2id, không reversible encryption/plaintext. Provider secret cần dùng để gọi API thì mã hóa và giữ key ngoài DB; không nhầm với password hash. Chỉ lưu hash opaque session/reset token; không log token/password/transcript.

Runtime DB account chỉ DML cần thiết trên own tables; audit append-only và credential tables chỉ Identity auth role được đọc. Migration/provision account riêng, không cho schema auto-sync hoặc runtime DDL. Reporting/Operations không được SELECT grant vào DB service khác. Mỗi service env có DB host/port/name/user/secret, Redis namespace và service URLs; schema owner không thay đổi theo connection host.

## Migration, dữ liệu cũ và review gate

Forward-only, không sửa checksum/history; expand→backfill có checkpoint→validate→switch writer→contract ở release sau. Thêm tenant_id legacy phải mapping có chứng cứ, backfill rồi enforce NOT NULL/index/FK; không default mọi dòng về tenant đầu tiên. Journal migration bootstrap phải upgrade runner trước khi đổi table layout. Không reset DB/Redis để làm test xanh.

Giữ fixture tenant/user test riêng; idempotent seed không đổi password/quyền/dữ liệu cũ. Test dùng run IDs hoặc baseline deltas thay giả định DB trống. Cold-install/disposable regression được chạy explicit ở môi trường riêng; không trỏ vào persistent QA và không dọn tenant khác.

Review bắt buộc: schema/owner + scope, DDL dictionary, tenant keys/FKs, authorization, retention/PII, transaction vs API/saga, query/index evidence, compatibility/backfill/rollback, tenant-negative/retry/concurrency tests. Thiếu mục nào thì table task chưa Ready. CI inventory/linter thực thi chuẩn là follow-up, không coi guideline này là test đã chạy trên mọi bảng.
