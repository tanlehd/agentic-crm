# Migration và kernel SRC-004

Scope: v1 Account/Tenant; v2 Identity; v3 admin transaction storage; v4 positive outbox versions; v5 consumer inbox/receipt expiry/lease index; v6 registry/association/history/shares/field policy. Không có CRM business data. TypeORM 1.1.1 + mysql2 theo toolchain; synchronize=false, migrationsRun=false. SQL migration explicit và immutable sau khi áp dụng.

## Local start / status

```sh
pnpm env:init
pnpm dev:up
pnpm db:status
pnpm db:migrate
pnpm test:integration
```

`env:init` giữ credential hiện hữu, chỉ thêm migration user/password nếu thiếu; .env mode 0600. `db-provision` là one-shot local development/test với root, tách khỏi app và migrate. Nó bảo toàn dữ liệu, thiết lập lại grants cho hai user được cấu hình. API/worker chỉ nhận app password; db-grants sau migration cấp DML theo bảng (audit và ownership_history chỉ SELECT/INSERT, schema journal chỉ SELECT); migration user có DDL CREATE/ALTER/INDEX/REFERENCES, không DROP. Mỗi task schema sau cần rà grants (không cấp database-wide runtime DML). Không dùng provision local này cho production.

Startup MySQL → db-provision → migrate → db-grants → API/worker; Node runtime non-root. Backend release image do db-provision build, API/worker/migrate reuse; dev API có image development riêng. Thay migration source phải rebuild backend image trước `db:migrate` (`pnpm dev:up` thực hiện việc này).

`db:status` kiểm checksum/name/version/state toàn manifest, nonzero nếu thiếu/drift/partial. Health mysql=up chỉ khi schema cùng manifest đã applied. Giữ stage=scaffold và wire shape health vì chưa có API nghiệp vụ. Charset handshake dùng utf8mb4 (mã protocol phù hợp mysql2), bảng vẫn utf8mb4_0900_as_cs.

## Partial DDL / process crash

Không chạy lại để bỏ qua lỗi, không xóa journal hoặc volume. Runner từ chối mọi state started/failed, missing/out-of-order/unknown migration hoặc checksum khác. Advisory lock được giữ trên connection chạy DDL; disconnect/process death sẽ nhả lock nhưng journal started còn nguyên.

1. Dừng rollout và mutation của ứng dụng; giữ log sanitized, backup/snapshot database.
2. Operator dùng quyền database nội bộ kiểm `SELECT version,name,checksum,state,started_at,applied_at,error_code FROM schema_migration ORDER BY version` và `SHOW CREATE TABLE` cho từng bảng trong migration. Đối chiếu ordered SQL trong source đã deploy; không sửa lịch sử source.
3. Viết repair SQL riêng, review phần đã chạy/chưa chạy, constraints/index/collation và dữ liệu. Kiểm thử repair trên bản sao database. Chỉ chạy các bước còn thiếu hoặc corrective DDL; không dùng IF NOT EXISTS để che schema sai.
4. Sau khi toàn postcondition của migration được xác minh, operator ghi nhận repair evidence và chuyển đúng journal row sang applied với timestamp (giữ checksum source gốc). Nếu corrective schema vượt baseline, thêm migration mới cho các DB khác hội tụ.
5. `db:status`, rerun no-op, readiness và test dữ liệu phải đạt trước khi mở lại ứng dụng. Không có command auto-repair ở SRC-004; operator không được đánh applied khi chưa xác minh.

## Test và kernel boundary

`test:integration` tạo project tên riêng, MySQL tmpfs không mount volume dev, tự down containers/network khi kết thúc. Test inject invalid second DDL kiểm tra bảng đầu còn tồn tại và journal failed; mô phỏng journal started kiểm tra crash recovery gate. Đây không phải OS-kill test. Forward migration giữ synthetic tenant data; table test chỉ tồn tại trong database test.

UnitOfWork truyền một scope cho application ports, rollback cùng transaction khi callback lỗi. TenantRepository có tenant predicate, allowlist fields, composite FK và optimistic version; scope hết hạn sau callback/commit. Đây là hạ tầng cho auth/application services tương lai, chưa chứng minh đầy đủ AC-01/02. Không tạo TenantContext trực tiếp từ header/body ở transport; auth adapter phải xác thực membership khi triển khai SRC-006/007.

SRC-008: `db:migrate` chạy chain migrate + db-grants để bảng mới có quyền runtime. `db-grants` là one-shot local operator với root, không đưa root vào API/worker. Browser synthetic fixture chạy bằng migration user riêng để cleanup audit/inbox đúng FK; runtime không được nâng quyền xóa audit. Worker tick 1s, claim100, lease60s; failed event giữ nguyên key. Operations retry UI/API còn SRC-022, không có tự retry terminal event.

SRC-011/012 thêm v7 crm_properties và v8 crm_core; v1–v6 immutable. V7 typed projection/custom/form/view, v8 Contact/Company/Activity/Lead; M2 refs CHECK NULL tới migration có FK thật. Đã áp dụng preview v8 trong SRC-013; không chỉnh lại v7/v8 sau đây. Upgrade fingerprint kiểm 13 bảng cũ trước/sau, không dữ liệu/secrets trong output ngoài count/hash. Seed M1 v3 là command riêng sau migration, repeat giữ existing metadata và grants đã thay đổi.

SRC-014 thêm v9 conversation_text: channel_connection/contact_identity, Conversation subtype, Message/outbound intent và mock receipt. V1–v8 giữ checksum; kiểm thử cold+v8 upgrade/rerun với MySQL thật. Chạy `pnpm preview:up` để rebuild/migrate/grants; không reset volume. Lead M2 FK chưa mở. Runtime grants hiện tự enumerate bảng đã migrate, giữ audit/history append-only.

SRC-015 v10 mock_messenger_intake additive: nullable channel credential/service actor, identity label, inbound_delivery/touchpoint. V1–v9 giữ checksum, existing unconfigured connections không tự nhận token. Preview upgrade fingerprint27 bảng M1 count/hash exact trước seed. Sau apply v10 không sửa lịch sử; rollback ứng dụng phải tương thích schema, không drop bảng/volume.

SRC-017 adds v11 routing_capacity: cursor, capacity reservation ledger and routing attention. V1–v10 immutable. `pnpm preview:up` rebuilds, migrates and grants before API/worker start; existing owners/records preserved. `pnpm seed:routing` is a separate additive local command. Runtime may not release/drop slot history to reuse execution IDs; SRC-018 links reservations to actual running executions. No down/reset required.
