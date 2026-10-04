# Architecture Decision Records

Status: Accepted — baseline thiết kế ngày 2026-10-02, chưa có implementation.

## ADR-001 — Documentation-first, milestone-based

Quyết định: tài liệu/contract/acceptance trước code; đợt đầu blueprint toàn platform + chi tiết M1–M2. Lý do: platform nhiều module cần vocabulary và invariant chung. Hệ quả: Draft bị chặn implementation cho đến khi bổ sung thiết kế; không cần đặc tả mọi tính năng M5 trước M1.

## ADR-002 — Modular monolith, TypeScript và MySQL

Quyết định: Next.js, NestJS, MySQL 8.4 LTS, Redis/BullMQ; API/worker riêng process dùng chung domain modules. MySQL là yêu cầu đã chốt. Lý do: thống nhất TypeScript và giữ transaction cross-module ở giai đoạn đầu. Không chọn microservices hoặc engine phân tán ngay; engine workflow có interface để thay sau bằng ADR khi tải/độ phức tạp chứng minh cần.

## ADR-003 — Shared-schema tenant isolation

Quyết định: tenant_id bắt buộc, composite FK, tenant-scoped repository/cache/job và explicit authorization. Lý do: hỗ trợ SaaS nhiều doanh nghiệp từ đầu. Hệ quả: MySQL không tự bảo vệ bằng RLS; cần test negative/concurrency và control-plane boundary. Database-per-tenant chưa triển khai.

## ADR-004 — Registry chung, subtype typed và custom JSON projection

Quyết định: crm_record chung identity/owner/team/version, standard table typed, custom_values JSON và typed index table. Lý do: association cùng cơ chế cho standard/custom, giữ queryable extension mà không DDL per tenant. Hệ quả: registry+subtype integrity do transaction/integration test bảo đảm; index update atomic. Không dùng EAV cho toàn bộ standard fields hoặc generated column từng tenant field.

## ADR-005 — Contact, Lead, Deal tách biệt

Quyết định: Contact là người, Lead là nhu cầu, Deal là cơ hội; Customer là lifecycle/projection từ won Deal. Không chuyển/xóa Lead để tạo Contact như conversion model khác. Hệ quả: một Contact nhiều Lead/Deal; report phải xác định grain, không count Contact như Lead.

## ADR-006 — Human/AI owner chung, service actor riêng

Quyết định: principal owner human/ai; service actor workflow/integration không làm owner. Seat là entitlement Human, role là action/scope; AI thêm policy. Owner các object độc lập; handoff cần CAS/revision/history. Hệ quả: AI có thể tự xử lý trong policy nhưng runtime không sở hữu authority; in-flight provider send không luôn hủy được.

## ADR-007 — Workflow và Chatflow riêng, durable state chung MySQL

Quyết định: mỗi loại có definition/version/run hoặc session, published immutable; Workflow điều phối cross-module, Chatflow hội thoại. M2 graph acyclic và primitives hữu hạn, authoring JSON. Hệ quả: cần outbox/inbox/lease/fencing/wait reconciliation, không nhầm BullMQ queue thành workflow state machine hoàn chỉnh.

## ADR-008 — Mock-first Messenger và AI adapter

Quyết định: lát cắt đầu dùng normalized mock Messenger và deterministic Agent Runtime, không phụ thuộc credential ngoài. Interface giữ boundary để làm connector thật ở M3. Hệ quả: test mock không xác nhận compatibility API Meta hoặc hành vi LLM thật; phải có gate riêng.

## ADR-009 — Healthcare là cấu hình mở rộng

Quyết định: Appointment/ServiceOffering là custom object; không EHR/chẩn đoán. Lý do: kiểm thử khả năng no-code/low-code trên case thực tế mà core vẫn đa ngành. Hệ quả: M1 chỉ metadata/CRUD, engine lịch hẹn và doanh thu thuộc M4.

## ADR-010 — Report có grain và quyền dữ liệu

Quyết định: metric catalog với cohort/as_of/version; template/custom report cùng model, quyền áp dụng trước aggregate và cache. Hệ quả: tránh fan-out join; M2 metric fixtures, M5 query planner/builder. Không dùng raw SQL người dùng nhập làm report API.

## ADR-011 — Container-first local development và release smoke

Accepted 2026-10-02. Theo yêu cầu đóng gói bằng Docker, dùng Compose v2 cho gateway/web/api/worker/mysql/redis/keycloak và tooling migrate/seed/test. App multi-stage images; backend image dùng chung API/worker; DB migration là one-shot có lock, không chạy trong mỗi replica. Dev/test volumes tách; stop giữ dữ liệu, reset là hành động riêng. Next.js standalone cho release. Không đồng nhất Keycloak start-dev hoặc Compose demo với production deployment.

## ADR-012 — Toolchain và tracking trong repository

Accepted 2026-10-02. Dùng pnpm workspace, NestJS TypeORM/mysql2 explicit migrations, Tailwind/shadcn cho UI, JSON Schema/Ajv + OpenAPI cho contracts, Vitest/Supertest/Playwright cho tests, Keycloak làm OIDC dev provider. Lock exact versions sau compatibility check tại SRC-001. Portable verification scripts là nguồn chuẩn CI; GitHub Actions là adapter khi có remote phù hợp, không giả định remote đã được tạo.

Task tracker/checkpoint/execution log và AGENTS.md giúp tiếp tục nhiều ngày. Giới hạn một task triển khai active mặc định, DONE phải có test/doc evidence; change control phân biệt technical refinement với thay đổi nghiệp vụ cần quyết định. Không cần app task tracking bên ngoài hoặc automation nền để bắt đầu.

Thay đổi quyết định đã Accepted: thêm ADR superseding, ghi lý do và migration; không sửa lịch sử để che việc thay đổi hướng.

## ADR-013 — Toolchain compatibility và readiness scaffold

Accepted 2026-10-02. Node 24.21.0 LTS, pnpm 10.33.0, Next 16.3.8/React 19.3.0, Nest 12.1.2 ESM. TypeScript giữ 5.9.3 để phù hợp peer openapi-typescript 7.13.0; TypeORM 1.1.1 với mysql2 3.24.5, ioredis 5.8.2 phù hợp optional peer thay vì ioredis 6. Metadata exact/engines lưu infra/toolchain.json; lockfile sẽ được tạo khi install SRC-002. Không dùng host Node 25 làm runtime chuẩn. Runtime/peer compatibility phải được xác nhận bằng build/test, không chỉ metadata.

Image digest là gate SRC-003 ngay trước Compose build, không chặn source scaffold khi registry Docker timeout. Không thay baseline MySQL 8.4; tag discovery được resolve và thay bằng digest trong artifact cuối. Task refinement SRC-001 đã làm rõ contract auth và physical schema; auth/API business vẫn chưa Implemented.

## ADR-014 — M1 transactional consumer registry

Accepted 2026-10-03, CHG-20261003-07. SRC-008 dispatch trực tiếp qua consumer registry trong worker; source backlog và lease ở MySQL. Mỗi consumer transaction ghi side effect và inbox, publish có thể lặp sau crash. Điều này dùng cùng UoW trong modular monolith và không cần queue hop khi M1 chỉ có Identity access event. BullMQ vẫn là lựa chọn job wakeup cho workflow/runtime sau; transport adapter tương lai phải giữ tenant/event IDs, dedup và fencing, không thay durable state. Consumer handler không được external I/O; tác động ngoài DB phải qua outbox/intent riêng. Không tự đăng ký consumer cho module chưa triển khai; type/schema không hỗ trợ chuyển failed.
