# Architecture Decision Records

Status: Accepted — baseline thiết kế ngày 2026-10-02, chưa có implementation.

## ADR-001 — Documentation-first, milestone-based

Quyết định: tài liệu/contract/acceptance trước code; đợt đầu blueprint toàn platform + chi tiết M1–M2. Lý do: platform nhiều module cần vocabulary và invariant chung. Hệ quả: Draft bị chặn implementation cho đến khi bổ sung thiết kế; không cần đặc tả mọi tính năng M5 trước M1.

## ADR-002 — Modular monolith, TypeScript và MySQL

Scope note2026-10-06: ADR-002 vẫn mô tả baseline monolith; phần shared database/registry/UoW/deployment boundary được ADR-017 thay thế cho kiến trúc đích. Không retroactively đổi implementation/evidence.

Quyết định: Next.js, NestJS, MySQL 8.4 LTS, Redis/BullMQ; API/worker riêng process dùng chung domain modules. MySQL là yêu cầu đã chốt. Lý do: thống nhất TypeScript và giữ transaction cross-module ở giai đoạn đầu. Không chọn microservices hoặc engine phân tán ngay; engine workflow có interface để thay sau bằng ADR khi tải/độ phức tạp chứng minh cần.

## ADR-003 — Shared-schema tenant isolation

Scope note2026-10-06: ADR-003 vẫn mô tả baseline monolith; phần shared database/registry/UoW/deployment boundary được ADR-017 thay thế cho kiến trúc đích. Không retroactively đổi implementation/evidence.

Quyết định: tenant_id bắt buộc, composite FK, tenant-scoped repository/cache/job và explicit authorization. Lý do: hỗ trợ SaaS nhiều doanh nghiệp từ đầu. Hệ quả: MySQL không tự bảo vệ bằng RLS; cần test negative/concurrency và control-plane boundary. Database-per-tenant chưa triển khai.

## ADR-004 — Registry chung, subtype typed và custom JSON projection

Scope note2026-10-06: ADR-004 vẫn mô tả baseline monolith; phần shared database/registry/UoW/deployment boundary được ADR-017 thay thế cho kiến trúc đích. Không retroactively đổi implementation/evidence.

Quyết định: crm_record chung identity/owner/team/version, standard table typed, custom_values JSON và typed index table. Lý do: association cùng cơ chế cho standard/custom, giữ queryable extension mà không DDL per tenant. Hệ quả: registry+subtype integrity do transaction/integration test bảo đảm; index update atomic. Không dùng EAV cho toàn bộ standard fields hoặc generated column từng tenant field.

## ADR-005 — Contact, Lead, Deal tách biệt

Quyết định: Contact là người, Lead là nhu cầu, Deal là cơ hội; Customer là lifecycle/projection từ won Deal. Không chuyển/xóa Lead để tạo Contact như conversion model khác. Hệ quả: một Contact nhiều Lead/Deal; report phải xác định grain, không count Contact như Lead.

## ADR-006 — Human/AI owner chung, service actor riêng

Quyết định: principal owner human/ai; service actor workflow/integration không làm owner. Seat là entitlement Human, role là action/scope; AI thêm policy. Owner các object độc lập; handoff cần CAS/revision/history. Hệ quả: AI có thể tự xử lý trong policy nhưng runtime không sở hữu authority; in-flight provider send không luôn hủy được.

## ADR-007 — Workflow và Chatflow riêng, durable state chung MySQL

Scope note2026-10-06: ADR-007 vẫn mô tả baseline monolith; phần shared database/registry/UoW/deployment boundary được ADR-017 thay thế cho kiến trúc đích. Không retroactively đổi implementation/evidence.

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

Scope note2026-10-06: ADR-014 vẫn mô tả baseline monolith; phần shared database/registry/UoW/deployment boundary được ADR-017 thay thế cho kiến trúc đích. Không retroactively đổi implementation/evidence.

Accepted 2026-10-03, CHG-20261003-07. SRC-008 dispatch trực tiếp qua consumer registry trong worker; source backlog và lease ở MySQL. Mỗi consumer transaction ghi side effect và inbox, publish có thể lặp sau crash. Điều này dùng cùng UoW trong modular monolith và không cần queue hop khi M1 chỉ có Identity access event. BullMQ vẫn là lựa chọn job wakeup cho workflow/runtime sau; transport adapter tương lai phải giữ tenant/event IDs, dedup và fencing, không thay durable state. Consumer handler không được external I/O; tác động ngoài DB phải qua outbox/intent riêng. Không tự đăng ký consumer cho module chưa triển khai; type/schema không hỗ trợ chuyển failed.

## ADR-015 — M1 UI metadata và tenant cache

Accepted 2026-10-04, CHG-20261004-05. Giữ Next.js/React, Tailwind4, local shadcn-style CVA button primitive, React Hook Form cho record renderer và TanStack Query cho server state. Descriptor endpoint trả readable fields/writable flags và form order cho record readers mà không cấp schema admin; authorization cuối cùng vẫn backend. QueryClient riêng theo tenant, unmount cancel/clear cache, record selection/form state keyed theo tenant/object/version. Mutation retry giữ key theo route/body/version; explicit stale reload. Dependency versions pin trong toolchain/lockfile, compatibility bằng container verify và browser gate.

## ADR-016 — AI provider platform, CRM Connector và message envelope

Accepted direction 2026-10-06 theo user, CHG-20261006-03; production contracts Draft. AI Agent cấu hình provider riêng với messaging connection; Meta Business Agent là case study platform đầy đủ. Giữ hai mode CRM-managed và provider-managed thay vì bắt mọi provider dùng synchronous execute/cancel mock. Phân biệt CRM principal ownership với provider application/thread control. Common message envelope giữ rich payload theo platform, renderer có version/capability và fallback.

Lý do: hosted agent có lifecycle/knowledge/tools/test và tự trả lời qua channel; mock protocol M2 không mô tả đủ. Hệ quả: cần durable control operations/reconciliation, external reply ingestion/dedup và callback authorization; mode hosted không có cùng cancellation guarantee với local runner. Bổ sung contract/migration version sau design gate, không sửa schema/event/API M2 hoặc lịch sử migration. [Plan](../planning/m3-provider-plan.md), [message draft](../contracts/messaging-platforms.md), [verified sources và gaps](../references/meta/README.md).

ADR-016 refinement 2026-10-06 / CHG-20261006-04: provider design pins Graph v26.0, Agent config X-API-Version2.0.0 và Thread Control1.0.0 theo [evidence](../references/meta/graph-version-observation.md). Không chạy legacy v12.0 sample. Budget authority theo Business Manager; live control/mutable tool scope chỉ Ready khi [G-04/05/08](../references/meta/capability-matrix.md) được giải quyết; đây là implementation gate, không đổi hướng provider do user đã chốt.

## ADR-017 — Enterprise microservices và service-owned data

Accepted architectural direction2026-10-06 theo explicit user instruction, CHG-20261006-07 / PLAN-005. Giữ Next.js/NestJS/TypeScript/MySQL, tenant isolation, Human/AI ownership, durable versioned workflows. Thay deployment/data-boundary định hướng ở ADR-002/003/004/007/014: independent service release/scale, private database credentials/migrations, local transaction, async outbox/inbox/saga và versioned RPC/events. Tenant shared-schema vẫn được phép **bên trong từng service**, không shared business schema giữa services. Source hiện tại chưa chuyển đổi.

Chat/Sales/Ticket và CRM-owned records là authority owner/version của resource mình; CRM external registry trở thành projection, không cross-service owner database. Identity owns principals/authorization; AI Runtime owns provider platform configuration/execution; Routing proposes assignment qua owner CAS. Connector owns webhook/transport/provider control; Chat owns conversation/message/intent; Media owns binary/extraction. Không gộp provider thread control vào CRM owner.

Technical baseline đề xuất cho first-slice transport là NATS JetStream với DB outbox/inbox, REST/OpenAPI commands/queries; chưa pin version/provision broker. JetStream durable retention/quorum/consumer ordering/ACL/replay phải chốt và test PLAN-006 trước implementation. Không tự đưa Kubernetes/Kafka/service mesh vào dependency bắt buộc. Redis vẫn cache/session/ephemeral fan-out/local jobs, không saga source of truth.

Tradeoffs: thêm network failure/latency, eventual consistency, distributed auth fence và vận hành nhiều deploy units. Đổi transaction cross-module thành saga/receipt có pending/unknown; không tự suy exactly-once hoặc instantaneous revoke. Per-service docs và migration gates là bắt buộc để tránh chỉ đổi folder/container mà vẫn chung database. Không big-bang rewrite; preserve IDs/migrations/evidence và single-writer cutover.

[Architecture](../system/architecture.md) · [Service catalog](../services/README.md) · [Data ownership](../data/service-ownership.md) · [Contract rules](../contracts/service-boundaries.md) · [Extraction plan](../planning/microservices-migration.md). Exact schema/auth/dispatch grant/wire protocols còn PLAN-006; acceptance distributed NOT_RUN. User đã chốt hướng, không cần hỏi lại chỉ để viết design/technical contracts trong scope.

## ADR-018 — First Connector extraction uses durable HTTP bridge

Accepted technical refinement2026-10-06, CHG-20261006-08. [Exact bridge](../contracts/connector-bridge.md) allows independent ingress DB/API/worker to forward normalized mock commands to monolith compatibility receiver with existing stable provider event key. REST + own durable delivery ledger provides retry/receipt; no broker installed or falsely claimed. Verify remote tenant/connection via authenticated binding API before payload transmission. No Human delegation/outbound control/Chat ownership transfer. Remaining ADR-017 JetStream/dispatch/saga gates remain PLAN-006; first source task is functional independent ingress, not full Connector extraction. No preview data cutover.

## ADR-019 — Connector enrichment/cache, CRM identity authority, Chat Contact context

Accepted responsibility design2026-10-06, explicit user instruction / CHG-20261006-10 / PLAN-006B. Connector calls provider profile APIs for name/avatar when permitted, caches profile and confirmed CRM identity resolution. CRM Core owns canonical external-identity→Contact mapping, atomically resolves/creates Contact and receives provenance-aware profile updates. Chat receives and emits new versioned inbound/outbound message contracts with required crm_contact_id (customer), separately from actor principal.

Supersedes PLAN-005 target ownership placing canonical contact_identity at Connector. Connector retains provider observations and reconstructible cache, never a second mapping master. [Contract](../contracts/contact-resolution.md) defines cache failure/invalidation, profile fallback and Human field preservation, tenant/identity validation, echo customer semantics and new-version compatibility. Existing source/strict schemas/monolith1–18/Connector1–2 unchanged. Exact machine auth/DDL/provider capability/dispatch remain implementation gates; no production Ready or runtime acceptance claim.

ADR-019 refinement / PLAN-006C / CHG-20261006-11: user specifies DB-backed cache-aside for Chat and Connector. Read existing CRM mapping on cache miss; invoke CRM Core resolve/create only after confirmed absence; hydrate on confirmed DB/receipt. Supersedes per-message synchronous mapping validation in PLAN-006B. CRM remains SoT and only canonical writer, dispatch authorization remains separate. Baseline module read port and target CRM read API preserve ADR-017; direct cross-service SQL not introduced. Exact invalidation/fences remain gates.

## ADR-020 — Portable host development and local service manager
Accepted2026-10-07, CHG-20261007-01. Node24 applications run on Windows/macOS/Linux; Docker owns persistent local infrastructure. Per-unit env drives connection and health probes; loopback developer manager controls only allowlisted local units. No startup migration/reset. Production Linux supervision and distributed broker contracts remain separate gates. See [runbook](../development/service-manager.md).

## ADR-021 — Native Identity, explicit tenant scope và schema ownership

Accepted2026-10-07, CHG-20261007-02, yêu cầu trực tiếp của user. Keycloak/OIDC provider không còn trong thiết kế target; CRM Identity sở hữu authentication, credential/session và authorization trong MySQL. Quyền tenant/own-team-all/field deny và multi-membership giữ semantics, không biến account thành Contact.

Mọi application table có tenant_id NOT NULL. Business data dùng tenant xác thực; account/session/journal system data dùng registered system tenant ở control-plane allowlist, không wildcard quyền. Tenant root tự tenant_id=id. Ngoại lệ bỏ cột account/tenant/journal trước đây bị supersede cho target; không sửa applied migration history.

MySQL schema=database: catalog13 bounded-context schemas, không database-per-tenant; gateway stateless. Mỗi schema service writer/credentials/migrations riêng, không cross-service SQL/FK/UoW. Baseline monolith dùng transaction ports hiện có tới scoped extraction DONE. [Catalog](../data/schema-catalog.md), [guideline](../data/database-guidelines.md), [native auth](../contracts/native-auth.md), [research](../references/crm-database-patterns.md), [transition](../planning/native-identity-data-plan.md).

Supersedes OIDC/no-password-store target in security/auth and provider choice of ADR-011/012/020; retains baseline evidence and ADR-017 service boundaries. PLAN-007 design-only; runtime vẫn Keycloak đến native source/cutover acceptance. Không xóa volume hoặc reset account credentials để thực hiện quyết định.
