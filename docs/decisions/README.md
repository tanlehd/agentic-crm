# Architecture Decision Records

## ADR-029 — Service-owned acceptance và rollout tối thiểu

Accepted 2026-10-23, CHG-20261023-19, theo yêu cầu trực tiếp người dùng. Áp dụng [service delivery scope](../governance/service-delivery-scope.md) cho toàn catalog: service nghiệm thu API/local state/producer/local consumers của mình; downstream business integration do owner nhận nghiệm thu riêng. Producer có durable publication/ACK/recovery theo transport contract không chờ consumer hoàn tất nghiệp vụ. Synchronous commands và compatibility cần cho chức năng đang phục vụ vẫn phải đúng contract.

Refines PLAN-056/057 và D3-03/05; giữ ADR-017/021/023/025/026/027/028, wire ACK semantics và migration/cutover invariants. Kafka stream chỉ dùng Kafka khi đã có thiết kế/implementation tương ứng; Chat D3 vẫn HTTP bridge. Không đổi API/event/schema, không cộng gate hoặc service từ việc thu hẹp scope.

Mỗi rollout chỉ đổi service được bàn giao và dependency unit tối thiểu đã liệt kê với lý do, pins, verification/rollback. Reuse dependency tương thích; không whole-stack rebuild/restart hoặc mở D4/consumer feature vì Chat đang extract. Tradeoff: producer/service DONE không đồng nghĩa toàn hệ thống đã có downstream business outcome; phải giữ owner backlog, pending deliveries và evidence riêng. [Chat handoff](../planning/chat-extraction/consumer-handoff.md) phân loại 16 nhóm và phần chuyển về Routing/Workflow/Sales/CRM/Reporting/Gateway/AI.

## ADR-028 — Repository boundaries before independent service deployment

Implementation note 2026-10-21 / CHG-20261021-12: R1 has relocated the baseline to `services/core-baseline` and validator to `packages/workflow-definition`; existing package names remain compatible. [Relocation evidence](../development/repository-relocation.md). The accepted decision below records the original path transition, not current paths.

Accepted technical organization 2026-10-21, PLAN-059 / CHG-20261021-11, following the user's request to clean the repository map before per-service deployment. Keep one pnpm monorepo: `apps/web` holds the shared Next.js UI, `services/<owner>` holds backend applications, `packages` holds contracts and reusable libraries. Target and current paths, source findings and rollout gates are in the [repository map](../architecture/repository-map.md).

`apps/backend` remains the baseline until a bounded relocation to `services/core-baseline`; relocation does not extract its domains. The pure `services/workflow-core` validator belongs in target `packages/workflow-definition`; Workflow runtime belongs in one `services/workflow` owner, with its editor in web. Future backend owners have separate packages/builds/config/tests and owning storage when applicable. Applications do not import another service's domain implementation; communication uses versioned APIs/events. Shared packages must not contain the baseline UoW/business database authority.

This refines source organization under ADR-017/023/027, not their data/traffic gates. It retains baseline deploy grouping while extraction is incomplete and separates API/worker processes from service ownership. One Git repo or multi-target Dockerfile is compatible with independent service releases if build/runtime dependency closure is isolated. Tradeoff: path moves touch many scripts/Compose/test fixtures, so execute bounded patches with compatibility checks before rollout, not a bulk rename or an empty scaffold for every catalog entry. No source move, new runtime or database migration is accepted as completed by this ADR.

## ADR-027 — One Workflow service for business orchestration

Accepted2026-10-21 by explicit user direction, CHG-20261021-07. Workflow is the only service/module defining configurable business flows across CRM/custom records, Ticket, Lead, Deal, Identity User/team and Chat Conversation, including routing and conversational qualification. Remove Chatflow as an independent service/module/framework. Workflow API, engine/Core, scheduler/worker and Web editor are components of one service; target schema is crm_workflow. This supersedes ADR-017's Chatflow boundary and ADR-022's separate Workflow API/Core services and crm_workflow_core schema. Kafka direction, durable versioned execution, tenant/current authorization and owning business commands remain.

Workflow owns flow definition/enrollment/run/step/wait/action receipts; owners retain business state and transaction authority. Routing supplies eligibility/capacity/allocation, Workflow decides configured business rule execution, and the resource owner commits assignment CAS. Owner safety/direct Human actions do not wait for Workflow. User object authority remains Identity; events/actions never expose credentials or automatically escalate privileges. Conversational steps use the common engine; AI Runtime remains bounded execution rather than business orchestration.

This reduces duplicated engines, authoring models, deployment/schema boundaries and install/reconcile protocols. API/worker processes can scale separately within Workflow. Existing legacy source/graphs/tables/receipts and Routing starters require inventory, versioned mapping/drain and one effect path per flow before removal/cutover. No immediate destructive source/DB deletion or runtime migration is claimed. [Service](../services/workflow.md), [contract](../contracts/workflow-orchestration.md), [plan](../planning/workflow-platform.md), [legacy compatibility](../contracts/legacy-chatflow.md).


## ADR-026 — Defer TLS in local Human CRM deployment

Accepted 2026-10-19 by explicit user decision, CHG-20261019-25. [Local HTTP contract](../contracts/local-workload-http.md) supersedes the mandatory TLS transport clause of ADR-025 for local development/retained tests. Explicit `http-local` uses private service keys and current Identity tenant admission; optional TLS keeps its original validation. No automatic downgrade, production rollout, schema change or weakening of Human session/permission, owner proofs, capacity and revoke drains. HTTP relies on a trusted local network and loopback published ports. TLS can be integrated later without changing business contracts.

## ADR-025 — Non-send admission drain and durable HTTP event bridge for Chat

Accepted technical decision2026-10-18, SRC-109/T01/CHG-20261018-29 within the explicitly requested contract scope. [Exact owner protocol](../contracts/chat-owner-v1.md) binds each non-send command to native Identity admission and local owner CAS. Revoke first closes new admission, then drains committed/aborted owner proofs before reporting completion. SQL transactions end before network I/O. Crash/timeout never becomes proof of abort; durable terminal tombstones prevent late resurrection. This deliberately sacrifices revoke completion availability during owner outage to preserve tenant-lock observable ordering; it does not use permission TTLs or reuse D2 send grants.

Routing capacity, Contact/reference retirement, Sales outcome and note/context effects use explicit reservation/terminal-proof sagas. Assignment fences queued AI/Chatflow work locally and reconciles remote capacity/control afterward. Current public IDs/receipt keys/graphs and business rights are preserved. Reads use exact current field admission; composite Reporting validates Chat watermark around the remaining baseline-local snapshot.

Choose existing HTTPS/mTLS with per-owner MySQL outbox delivery/inbox ACK/replay for this D3 extraction. Supersedes only the unimplemented JetStream transport proposal in chat-control-v1; its payload/control semantics stay unchanged. No broker installation, Redis-only receipt, generic Kafka object-change stream or new provider is implied. ADR-022 Kafka design and ADR-024 D2 dispatch remain intact. Physical templates/migrations/recovery-runtime evidence are T02 onward; this ADR approves protocol design, not an extracted service.

## ADR-024 — Independent dispatch admission and conservative unknown recovery

Accepted technical protocol decision2026-10-18, PLAN-006F/CHG-20261018-08, within user-authorized staged extraction. [Dispatch v1](../contracts/chat-dispatch-v1.md) retains native Identity as policy authority, Chat as record/owner authority and Connector as transport/binding authority. Identity issuance is an opaque prepared reference, not cached permission; consume is serialized with current revoke. Chat claim and Connector start each have their own local CAS. Effects admitted before a later local revoke/takeover may still complete; no global atomicity or recall promise.

Choose a conservative one-attempt v1: only the winning live Connector handler may invoke after first consume response and local binding/fence/deadline checks. Lost ACK/crash clears volatile invocation permission; historical receipts cannot rearm sending. Persisted admitting/started becomes unknown on recovery, including crash-before-I/O. Resolve unknown only from known sent evidence. This sacrifices automatic retry/liveness in ambiguous cases to avoid duplicate customer messages. Existing monolith retry behavior is unchanged until an explicit adapter/cutover gate.

Workload authentication uses mTLS/current registry, not Human credentials or custom bearer grants. Machine schemas and reference scenarios are implemented in SRC-093; actual TLS/DB/concurrency/provider evidence and physical migration remain pending. No acceptance of a permission-cache revocation window is implied by issuance TTL or transport timeout.

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

Scope update2026-10-13: ADR-022 supersedes the JetStream proposal in ADR-017 only for CRM object-change → Workflow Core with Kafka, explicitly requested by user. Other event streams retain their own PLAN-006 design gates; no broker deployment implied.

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

## ADR-023 — Shared CRM platform and phased runtime separation

Accepted2026-10-18 by user following Salesforce/Dataverse/HubSpot comparison, CHG-20261018-06/PLAN-055. Refines deployment sequencing of ADR-017, retains service-owned data/API/events and ADR-021 native Identity. CRM owns canonical object/property/association/layout metadata; Identity owns current policy; domain modules own business lifecycle. Consumers use versioned metadata/owner ports, never a second metadata authority or arbitrary SQL into another service.

Deploy groups follow proven independent scale/release/failure needs. Current core platform remains monolith API+worker while Reporting and Connector are independent packages. Prioritize Reporting→Connector/Chat→Workflow/AI; Marketing remains an independent gated backlog. CRM/Sales separation requires transaction/registry/saga proof; do not create one container per product screen or per object. Shared platform does not authorize shared DB writers between independently extracted services. Service catalog is responsibility map; physical databases are created only at scoped extraction.

RO-01…06 in [rollout contract](../contracts/phased-service-rollout.md) is first implementation gate: local Reporting container activation, Connector operational readiness and retained synthetic tests. Chat ownership transfer, workflow execution split, Kafka, production and live provider actions retain exact gates. No change to metadata/domain semantics or existing IDs/permissions/migrations. Public comparison sources: [Salesforce platform](https://architect.salesforce.com/docs/architect/fundamentals/guide/platform-multitenant-architecture.html), [Hyperforce cells](https://engineering.salesforce.com/architectural-principles-for-high-availability-on-hyperforce/), [Dataverse](https://learn.microsoft.com/en-us/power-apps/maker/data-platform/data-platform-intro), [HubSpot object infrastructure](https://product.hubspot.com/blog/hbase-share-resources). These establish principles, not a claim our topology copies their internal deployment.

## ADR-022 — Workflow Web/API/Core, Kafka và shared CRM metadata

Service/schema split superseded by ADR-027 on2026-10-21. The text below is historical rationale; current development uses one Workflow service.

Accepted architectural direction2026-10-13 theo yêu cầu trực tiếp user; PLAN-024 / CHG-20261013-01. [Architecture](../system/workflow-architecture.md), [design gates](../planning/workflow-platform.md). Đây là thiết kế, không implementation/deployment acceptance.

Tách Workflow Web (Next.js CMS stateless), Workflow API (NestJS authoring/control, crm_workflow) và Workflow Core (NestJS engine/consumer/scheduler/worker, crm_workflow_core). Hai backend service không share schema/credentials/SQL/UoW; API publish immutable artifacts và activation saga qua Core APIs, Core owns effective deployment generation và durable execution. Giữ version pinning, tenant isolation/native Identity/Human-AI ownership và engine semantics M2.

Chọn Kafka cho owning-service transactional object-change outbox → Core inbox/enrollment theo yêu cầu user, thay proposal JetStream ADR-017 trong phạm vi này. Broker ACK/offset không thay MySQL receipt; at-least-once, stable event/action identity, ordered per-record change evaluation, immutable change-image refs và live authorization. Exact version/topology/ACL/retention/producer schemas cần PLAN-024B. Không chuyển transport các luồng khác hoặc cài broker ở phiên này.

Object/property/association models dùng chung canonical CRM Base metadata. Workflow chỉ owns graph/binding/versioned manifest; Sales/Chat/CRM giữ business authority. Data actions qua owning APIs, communication qua adapters (Chat/Connector cho messages; email/notification/task capabilities phải chốt ownership trước source). Không fork metadata hoặc dùng Reporting mock models làm authority.

Tradeoff: thêm activation saga, immutable artifact replica, database và reconciliation vận hành để CMS và engine scale/release riêng. Reuse primitives/tests M2, không đổi wire graph cũ; legacy runs drain ở monolith và chỉ một starter per definition sau cutover. Exclusive branching + durable delay/data/routing/follow-up là scope thiết kế; parallel/loop/nested/arbitrary code deferred. Source tasks/physical table templates/DDL/migration/security và runtime acceptance vẫn gated; no DB changes/reset/automatic permission grants.
