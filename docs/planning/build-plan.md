# Kế hoạch sinh source code M1–M2

2026-10-17 / CHG-20261017-08: user authorized coding; PLAN-048 exact contract DONE before source, SRC-086 now DONE bounded connected conversion/goal/dashboard slice. [Evidence](../tracking/details/SRC-086.md). Reporting forward006 CHECK only, shared Reporting core and owner ports. Historical PLAN-048 TODO below superseded; broad SRC-049/SRC-075/PLAN-028B and other backlog unchanged.

2026-10-17 / PLAN-047 / CHG-20261017-07: [Conversion and operations review](conversion-operations-review.md) xác minh base lineage/context hiện có; connected Operations chưa cung cấp business funnel hoặc goal. Review-only, không đổi source/DDL. PLAN-048 TODO là đề xuất exact scoped CRM conversion/goal/drilldown gate; phối hợp PLAN-028B/SRC-075 và SRC-049, không buộc CRM funnel chờ Meta Insights. Chưa claim implementation; các backlog khác giữ nguyên.

2026-10-17 / CHG-20261017-06: PLAN-046 exact connected Operations gate Ready; SRC-085 generalizes performance into objects/properties and existing Dashboard/Report Builder. Reporting forward005 metadata pin only; generic custom-object ingestion/durable connected runs remain separate. [Contract](../contracts/operations-reporting.md).

2026-10-17 / CHG-20261017-05: user authorized PLAN-045/SRC-084. [Human routing](../contracts/human-routing.md) scoped R1 implemented/tested with screenshot acceptance; exact monolith gate completed,9new tables forward35. Broader visual/custom rule/overflow/extraction/report-builder gates remain separate; unrelated source backlog preserved.

2026-10-17 / CHG-20261017-04: PLAN-044 delivers [logical Omni-style routing ERD](../data/conversation-routing-erd.md), ownership, candidate-table review and future acceptance scenarios. Design-only; no new implementation claimed. Next routing step is exact API/DDL/permissions/cutover gate; existing source backlog priority remains unchanged.

2026-10-17 / PLAN-040: [Assignment research](../references/conversation-assignment.md) compares HubSpot/Salesforce/Intercom/respond.io/Zendesk and proposes employee skills, per-session routing, Human capacity queues and shared workflow dispatch. Research-only, not a Ready implementation gate; source dependencies and existing backlog priority unchanged.

2026-10-17 / CHG-20261017-02: PLAN-039 tổ chức [nhóm tính năng theo mục tiêu và người sử dụng](../product/capability-map.md) làm trục cho tài liệu/UX/demo/presentation. Documentation-only; không đổi source dependency, service ownership, runtime scope hoặc backlog PLAN-028E.

2026-10-17 / CHG-20261017-01: PLAN-038/SRC-083 DONE scoped [Custom Inbox builder](../contracts/custom-inbox-builder.md): saved conversation filter preview/lifecycle/share UI and additive native discovery on existing Chat storage. [Evidence](../tracking/details/SRC-083.md); no migration. Remaining full workspace release/general filters and PLAN-028E remain separate.

2026-10-16 / CHG-20261016-03: PLAN-034 exact gate DONE; SRC-080 triển khai [record detail/preview + Default/team views](../contracts/record-pages.md), forward32 chỉ thêm presentation metadata. [Runbook](../development/record-pages.md). PLAN-028E/connected consumers giữ nguyên dependency và phạm vi.

2026-10-16 / CHG-20261016-02: user ưu tiên layout Object & Properties. SRC-079 phụ thuộc SRC-074/SRC-078 DONE; [UX Ready](../ux/object-properties-workspace.md) dùng catalog/commands hiện tại, không migration. PLAN-028E và connected consumers giữ gate riêng.

**Implemented 2026-10-16 / CHG-20261016-01:** PLAN-033A exact gate DONE; SRC-078 delivers [Thread/Conversation classification, transfer and contributions](../development/thread-conversation.md) over existing stage/Lead/Deal runtime. Forward31 preserves old IDs. Ticket/connected Reporting and PLAN-028E backlog remain separately gated.

**Next priority2026-10-15 / CHG-20261015-02:** [PLAN-028](no-code-object-platform.md) lập kế hoạch mở rộng M1 metadata thành no-code CRM: Object & Properties/ERD/Workspace → connected custom-object Reporting → custom-object Workflow. PLAN-028A…D exact gates và SRC-073…077 tuần tự; SRC-059/PLAN-024B…E còn prerequisites, không đổi DONE/evidence của task cũ. SRC-073/074 bounded model/workspace implemented; [runbook](../development/object-platform.md), [evidence](../tracking/details/SRC-074.md). No active source task; PLAN-028E preserves remaining R1, R2/R3 pending.

**Current 2026-10-14 / CHG-20261014-05:** User authorized implementation after PLAN-027 review. Dashboard/Reports local slice is implemented: Reporting-owned schema4 (six new tenant-scoped tables;13 prior business tables preserved), native APIs, atomic templates and separate UI. [Runbook](../development/dashboard-workspace.md) · [Backend evidence](../tracking/details/SRC-071.md) · [UI evidence](../tracking/details/SRC-072.md). Earlier design-only/phase statements below are historical; broad Reporting milestones remain in tracker.

**2026-10-14 / CHG-20261014-04 / PLAN-027:** [Dashboard/Reports redesign](dashboard-workspace.md) là bộ đặc tả để review trước code theo lựa chọn người dùng. Menu riêng, dashboard home/template creation/saved-report widgets và Report Library/viewer/editor. Proposed sequence PLAN-027A executable contract gate → SRC-071 own-service backend/storage → SRC-072 frontend/native acceptance; chưa claim source task. SRC-059/060/061/062 và SRC-064 giữ scope/status trong tracker; không tính design vào tính năng đã chạy.

CHG-20261013-04: SRC-067 DONE scoped, Codex 2026-10-13, follows completed SRC-066 with a [visual canvas](../contracts/workflow-visual-builder.md). [Evidence](../tracking/details/SRC-067.md): real browser graph editing/save/reopen, desktop/mobile and332unit PASS. Existing M2 APIs, Alpha permissions and distributed Kafka/API/Core gates remain unchanged; no active source task.

**2026-10-13 / CHG-20261013-02:** User requested Workflow implementation. SRC-064 requeued READY, progress/Alpha gate retained. PLAN-024A/SRC-065 delivered [native canonical catalog and typed Core draft validator](../development/workflow-foundation.md); exact Kafka/change-image design PLAN-024B is next. Runtime/persistence/CMS not completed by this slice. No source task currently active.

**2026-10-13 / PLAN-024 / ADR-022:** [Workflow Web/API/Core architecture và design sequence](workflow-platform.md), Kafka CRM object change, canonical CRM Base metadata, multi-node data/routing/communication follow-up. Kiến trúc thiết kế trước, chưa claim source/SRC-042 hoặc đóng PLAN-009. Gates A metadata → B Kafka/enrollment → C API/Core/DDL → D actions → E CMS UX/cutover. SRC-064 giữ implementation IN_PROGRESS; không task triển khai song song.

**2026-10-12 / CHG-20261012-06:** User accepted early API-backed UI. [PLAN-022H](../contracts/reporting-authoring.md) scopes source/model/fields/axes/flat filters/chart/pivot/private draft/CSV over delivered APIs. SRC-064 is the sole active source task; SRC-059 requeued READY, incomplete scope/evidence preserved. Full SRC-060 follows SRC-059 and SRC-064; no publish/dashboard/drilldown completion claim. No database changes.

**2026-10-12 / CHG-20261012-05:** PLAN-022G [durable run contract/table designs](../contracts/reporting-runs.md) implemented as SRC-059 lifecycle slice: owner/current native ACL,lease attempts,cancel,pinned snapshot/result persistence in own schema3. [Evidence](../tracking/details/SRC-059.md). No automatic worker; exact drilldown design next. SRC-059 remains sole active source task, SRC-060 UI unclaimed.

**2026-10-12 / CHG-20261012-04:** PLAN-022F adds [native mock query/CSV contract](../contracts/reporting-query-api.md), implemented as SRC-059 second phase with explicit complete-source grants and live result-delivery checks. [Evidence](../tracking/details/SRC-059.md). SRC-059 remains the sole active source task; exact durable run/drilldown design is next. No connected ACL/UI completion claim.

**2026-10-12 / CHG-20261012-03:** PLAN-022E scopes the [internal mock query core](../contracts/reporting-query.md); SRC-059 IN_PROGRESS now delivers executable26metrics/group/pivot/authorization ports/cache/CSV. [Evidence](../tracking/details/SRC-059.md). Remaining exact native query/source policy and run/drilldown gates precede their implementation; no UI completion claim, no second active source task.

**2026-10-12 / CHG-20261012-02:** PLAN-022D/SRC-058 add [typed synthetic adapter and durable projection generations](../contracts/reporting-projections.md),own schema2; G1 dataset and replay/checkpoint/tombstone/activation isolation tested. Next exact query/native source ACL gate before SRC-059, no UI/runtime KPI completion claim. [Evidence](../tracking/details/SRC-058.md).

**2026-10-12 / CHG-20261012-01:** PLAN-022C scopes [private draft persistence/native ACL](../contracts/reporting-persistence.md); SRC-057 implements own Reporting MySQL schema/API and native BFF. Broader PLAN-022 remains the projection/query/publish/UI gate. Next complete exact synthetic datasource/projection contract before SRC-058; one source task at a time. [Evidence](../tracking/details/SRC-057.md).

**2026-10-10 / PLAN-022A:** [Report Builder plan](report-builder.md) bổ sung mock-first sequence PLAN-022 → SRC-057…062, sau đó SRC-049 connected integration (còn cần SRC-051/053/055). Datasource/model/attribute/relation/metric catalog dùng chung cho chart/pivot/dashboard và templates. Đây là product planning, không mở source task thứ hai; SRC-051 hiện vẫn IN_PROGRESS. Exact API/DDL/producer/ACL gates phải Ready trước source.

**Implementation override CHG-20261010-02:** user requests sequential implementation; SRC-051 requeued READY, progress retained. PLAN-022B/SRC-063 delivers first scoped semantic catalog/validator kernel, then remaining PLAN-022 gates → persisted foundation SRC-057. No parallel source work, DB reset or scope completion claim for Marketing.

**Current priority CHG-20261007-14:** Lead/Deal → organic Conversation→Lead→Deal won with value → organic Page report/release (SRC-045/046/052/050); then Marketing sync/campaign reports (SRC-051/049). Ticket/receipts follow separately. CHG-20261007-15: marketing reports measure conversion performance for resource, content/message and audience strategy; won value is a funnel outcome, receipts are independent. Exact scoped design: [organic Sales base](../contracts/organic-sales-base.md).


Ưu tiên hiện hành CHG-20261007-14: [CRM base outcomes](crm-base-outcomes.md), scoped organic release → PLAN-011 Marketing exact design → SRC-051/049; Ticket/receipts và frameworks theo sau. M1–M2 dưới đây giữ nguyên evidence lịch sử. Lead từ Conversation có immutable system attribution, khác nguồn khai báo agent chọn.

ADR-021/PLAN-007 supersedes Keycloak as future auth design: [native auth + schema plan](native-identity-data-plan.md). Các W0–W6/gates OIDC dưới đây ghi baseline lịch sử; task mới dùng CRM-owned MySQL authentication và [DB guideline](../data/database-guidelines.md).

Status: Ready for implementation theo từng task và design gate. Baseline kế hoạch: 2026-10-02; scaffold/Docker SRC-001…003 đã có ngày 2026-10-03, trạng thái thực thi theo tracker.

## Mục tiêu và chiến lược

Sinh source theo từng phần nhỏ, mỗi phần có thể kiểm thử và tiếp tục ở phiên khác. Đợt đầu đi đến M2 mock vertical slice; M3–M5 giữ trên roadmap, chỉ được triển khai sau khi thiết kế tương ứng được nâng Ready. Không đặt một ngày hoàn tất giả định cho toàn platform.

Task tracker là [nguồn trạng thái duy nhất](../tracking/tasks.md); [checkpoint](../tracking/checkpoint.md) cho biết bắt đầu từ đâu. Mỗi task hướng tới 1–2 phiên làm việc tập trung; nếu quá lớn, chia subtask trước khi claim. Đây là kích thước công việc, không phải cam kết thời gian của người hoặc agent.

## Stack và cấu trúc source dự kiến

| Thành phần | Lựa chọn |
|---|---|
| Workspace | pnpm workspace, TypeScript strict; không cần orchestration framework monorepo riêng ở M1 |
| Frontend | Next.js App Router; Tailwind CSS + shadcn/ui; TanStack Query cho server state; React Hook Form cho form |
| Backend | NestJS, TypeORM + mysql2; application services và tenant-scoped repositories |
| Contracts | JSON Schema cho request/event/graph/runtime; Ajv validation; OpenAPI 3.1 cùng schema; generated TS/client kiểm tra diff trong CI |
| Auth local | CRM native Identity: credential/session/quyền trong MySQL, trình duyệt chỉ có opaque cookie; SRC-038 |
| Jobs | BullMQ; workflow/session/business state ở MySQL; Redis chỉ queue/cache/session ephemeral |
| Tests | Vitest unit/integration, Supertest HTTP, Playwright browser E2E; MySQL thật cho constraint/transaction |
| Container | Docker Compose v2; multi-stage images; API/worker cùng backend image khác command |
| CI | Script portable trong repository; GitHub Actions adapter được chuẩn bị nhưng chỉ có remote CI thật khi repo được nối GitHub |

TypeORM là lựa chọn implementation trên [tích hợp NestJS chính thức](https://docs.nestjs.com/techniques/database). Không dùng `synchronize`; viết/review migration rõ FK/index/check và transaction boundary. Dependency exact version được khóa ở SRC-001; image digest được khóa ở SRC-003 trước container build theo supported stable releases tại thời điểm scaffold; không dùng `latest` hoặc floating tag làm baseline reproducible.

```text
apps/
  web/                       Next.js workspaces
  backend/                   NestJS API + worker entrypoints
    src/modules/             identity, crm, channels, conversation, sales,
                             agents, workflow, chatflow, operations
    src/kernel/              tenant context, auth interfaces, unit of work
packages/
  contracts/                 JSON Schema, OpenAPI, generated types/client
  testkit/                   synthetic fixture aliases, deterministic clocks
infra/
  docker/                    image definitions, gateway, dev IdP configuration
scripts/                     dev, migration, verification commands
tests/                       integration, contract, e2e, fault scenarios
docs/                        design, contracts, task tracking và evidence
```

Tree chỉ mô tả đích, chưa là file đã tạo. Backend module chia domain/application/infrastructure/http; domain không import Nest controller hoặc frontend. Không xây module rỗng Ticket/Report để giả chức năng M4–M5.

## Các đợt triển khai

| Đợt | Tasks | Kết quả kiểm chứng |
|---|---|---|
| W0 — Chuẩn bị contract | SRC-001 | Version manifest; gap review vật lý/auth/session; API/schema mapping rõ trước scaffold |
| W1 — Khung và Docker | SRC-002…005 | Web/API/worker build; compose healthy; migration chạy riêng; script CI dùng được local |
| W2 — Identity và reliability | SRC-006…009 | Login thật qua Keycloak local, tenant context, seat/role/team, transactional audit/outbox/inbox |
| W3 — CRM foundation | SRC-010…013 | Registry, custom object/index, Contact/Company/Activity, Lead domain cơ bản, Admin UI; M1 gate |
| W4 — Inbound và hội thoại | SRC-014…017 | Mock intake, inbox, outbound intent, Human/AI assignment/handoff |
| W5 — Agent và automation | SRC-018…021 | Mock runtime, durable Workflow/Chatflow, Lead qualification/handoff/acceptance APIs |
| W6 — Demo và độ bền | SRC-022…025 | Sale UI, fixture đủ luồng, chaos/retry/race tests, build release và M2 gate |

W2–W5 vẫn cập nhật UI theo khả năng backend đã có; không dựng tất cả màn hình bằng dữ liệu giả rồi gọi đó là end-to-end. Seed/sample data chỉ cho dev/test, có tên môi trường rõ.

## Design refinement bắt buộc ở SRC-001

Baseline đã chốt nghiệp vụ nhưng dictionary chưa phải migration đầy đủ. Trước source cần bổ sung, trong các tài liệu gốc:

- Physical schema: độ dài/type/default/check, index/key namespace, FK order cho cycles và deletion/archive policy của bảng M1; lịch migration M2 riêng. Không tạo toàn bộ bảng Draft M4/M5.
- Auth transport: login/callback/logout/session/CSRF routes, session TTL 8 giờ idle/24 giờ absolute, state/nonce one-use 10 phút, issuer và redirect URI, refresh/logout behavior. Redis mất thì session hết hiệu lực và yêu cầu login lại; không mất dữ liệu CRM.
- Credential policy: bootstrap tạo credential local ngẫu nhiên ngoài Git, tenant service actor mappings, account fixture idempotency; schema cho auth/session thêm vào dictionary nếu persist ngoài Redis.
- OpenAPI/schema coverage: exact DTO/response cho endpoint đang xây, errors và ETag; binding schema cho primitive graphs; partial PATCH/required field rules không tự suy ra từ ORM entity.
- Quy tắc kiểm thử: Vitest transaction fixtures không dùng SQLite thay MySQL; lựa chọn Node runtime LTS được kiểm chứng compatibility, không dựa vào Node v25.9.0 đang có trên host.

Ghi CHANGE entry và ADR khi cần, nâng phần bổ sung Ready; không dùng implementation gap để thay đổi business rule đã chốt. Không cần phê duyệt lặp lại lựa chọn kỹ thuật không đổi scope; thay đổi nghiệp vụ lớn phải đưa ra người dùng quyết định.

## Release gate

**M1:** Compose cold start + migration + seed hai tenant; login/tenant switching; permission negative tests; standard/custom record, association, typed index; audit/idempotency/outbox; foundation UI. Chỉ đánh dấu các phần M1 của AC-03/04/13, không đóng phần M4/M5 của cùng ID.

**M2:** fixture CTM→Lead→Sale accepted; Human takeover; duplicate delivery; crash/retry; lease fencing; out-of-order signal; Redis outage/recovery; unknown outbound; metrics đúng fixture. Build release images và khởi động từ volume trống lẫn volume có dữ liệu M1; không cần Meta/LLM credential thật.

Mỗi gate ghi test evidence và manual demo steps. Code mới chưa có test phù hợp phải ở VERIFYING; gate không được pass chỉ vì Docker build thành công.

## Phương pháp làm việc nhiều ngày

Mỗi phiên đọc checkpoint → claim một READY task → cập nhật spec nếu cần → code/test → cập nhật tracker/log/checkpoint. Một task bị block có owner, blocker, điều kiện unblock và next action; có thể chuyển sang task độc lập đã sẵn sàng. Không hứa tự chạy tiếp nhiều ngày hoặc tự gửi update ngoài phiên nếu chưa cấu hình lịch riêng.

Task cuối phiên không cần DONE: checkpoint phải đủ chi tiết để tiếp tục mà không dựa vào lịch sử chat. Xem [change control](../governance/change-control.md) và [task template](../templates/task.md).

CHG-20261003-06: phần transaction storage audit/idempotency/outbox tối thiểu chuyển vào SRC-007 vì admin API yêu cầu atomic receipt/events. SRC-008 vẫn phụ thuộc SRC-007 và chịu trách nhiệm consumer inbox/relay/leases, replay hardening và audit privilege hardening; không triển khai task song song.

## Sau release M2 — hướng M3 đã cập nhật

Theo CHG-20261006-03, [M3 provider plan](m3-provider-plan.md) mở AI Agent setup theo provider (Meta Business Agent case study), CRM Connectors với provider routing, và message envelope/render đa nền tảng. PLAN-002 ghi định hướng và snapshot nguồn; PLAN-003 hoàn thiện dossier/capability matrix; PLAN-004 chốt contract/data/UX/AC và source backlog. Production integration chưa Ready. SRC-026 là task M3 đầu tiên theo gate độc lập PLAN-004A.


M3 foundation: PLAN-004A chốt [legacy envelope projection](../contracts/message-envelope-v2.md), SRC-026 triển khai additive read API. PLAN-004 phần còn lại tiếp tục design gate; không tính source M3 vào 25 task M1–M2.


PLAN-004B chốt normalized rich storage/passive renderer; SRC-027 sau SRC-026. Media resolver và live provider giữ gate riêng.

## ADR-017 — Microservices target sau SRC-027

User đã yêu cầu enterprise microservices. [PLAN-005 blueprint/extraction roadmap](microservices-migration.md) thay định hướng monolith tương lai; không đổi bằng chứng M1–M2 hoặc source hiện tại. PLAN-006 exact distributed contracts/data/auth/dispatch/saga và broker gate đi trước extraction source. Pending PLAN-004 media/provider design phải align service boundaries; không code thêm cross-module shared transaction cho service đích. Source task IDs chỉ tạo sau scoped design Ready.


SRC-028 after SRC-027 + PLAN-006A design Ready: independent Connector ingress/API/worker/private schema1 and HTTP compatibility bridge. ADR-018, remaining broker/delegation/domain extraction gate unchanged.

SRC-028: first independent Connector ingress implementation and opt-in image/Compose at [service runbook](../../services/crm-connector/README.md). PLAN-006A exact scoped design DONE; remaining PLAN-006 distributed authority/broker/cutover work is separate.

M3 local continuation: PLAN-004C scoped signed Messenger capture before SRC-029; [contract](../contracts/messenger-ingress.md). Separate capture does not depend on Chat cutover and cannot forward to mock intake.

PLAN-006B design-only: [contact resolution responsibilities](../contracts/contact-resolution.md) accepted; source gate still needs exact DTO/auth/DDL/provider adapter and tests. No source task ID/READY implied by responsibility design.

## SRC-030 local contact-resolution slice

Scoped cache-aside compatibility is implemented and verified; [evidence](../tracking/details/SRC-030.md). CRM DB owns identity mapping; Connector uses remote lookup/resolve and Chat uses baseline CRM application port. Remaining PLAN-006 provider ingestion/event gates still precede full Messenger delivery and M3 completion.

SRC-031 delivers Facebook OAuth/Page setup and channel-aware Inbox under [scoped contract](../contracts/facebook-configuration.md); evidence and remaining messaging gates in [task detail](../tracking/details/SRC-031.md). This does not close full M3 or live provider acceptance.

## UX-002 — Agent Chat product rebuild

Theo CHG-20261006-19 và chỉ đạo mở rộng thiết kế từ sample, [workspace build plan](agent-chat-workspace.md) có SRC-032…037 tuần tự: unread/metrics/query → inbox/tags/snippets → snooze/activity → CRM context → UI → regression/release. Product/API/data design Ready, source TODO; exact machine schemas/migrations là deliverable từng task trước code phụ thuộc. Không phụ thuộc live Meta để hoàn thiện nội bộ Chat, không đóng M3 provider acceptance hoặc chạy song song mặc định.

## ENV-003 — local infrastructure and host applications

User-directed local tooling now separates persistent Docker infrastructure from Windows/macOS/Linux host application processes. [Runbook](../development/service-manager.md), [evidence](../tracking/details/ENV-003.md). Lifecycle does not migrate or reset data; normal synthetic QA can reuse tenant/user records. Source extraction and production Linux deployment gates remain unchanged.

UX-003 bổ sung [app shell và Inbox redesign](../ux/README.md), UX guidelines và template mỗi màn. SRC-036 kế thừa layout mới cùng UX-002 contracts sau SRC-035; mock không phải source release. Deal/Marketing/Reporting và global CRM record search giữ design gate riêng.

CHG-20261007-13: CRM base chain adds SRC-051 Marketing hierarchy sync after SRC-048 and before SRC-049. Marketing owns crm_marketing and Facebook Ad Account→Campaign→Ad Set→Ad; report consumes scoped API/events. Exact source gate remains PLAN-011; live verification separate from local release.

SRC-053 DONE scoped local2026-10-08: [session evidence](../tracking/details/SRC-053.md), schema26 and session-based Lead/Deal lineage. PLAN-011B closes only session design; next remaining PLAN-011 Marketing exact sync design → SRC-051 → SRC-049.

PLAN-019 / CHG-20261008-05: [Meta-native Marketing operations](../contracts/marketing-operating-flow.md). Remove CRM strategic taxonomy from active scope. PLAN-011 must define the metadata+Insights ingestion/report delivery sequence; SRC-051 metadata alone cannot close joined Insights reporting.

PLAN-021 / CHG-20261008-07 supersedes fixed-report interpretation: Marketing provides [source datasets/storage/field descriptions](../data/marketing-source-catalog.md); Reporting owns the [builder and reusable templates](../planning/report-builder-data-model.md). The three PLAN-020 families are examples, not a limit or separate Marketing report engines. Source ingestion acceptance and Reporting template/query acceptance are separate. PLAN-011 is the Marketing data gate; PLAN-022 is the Reporting implementation gate.

PLAN-023 / CHG-20261008-09: [Shared account and Page tenant admission](../contracts/marketing-tenant-admission.md). All tables retain tenant_id NOT NULL. The same external Ad Account may have independent tenant-local replicas/bindings. Ads/related metadata/Insights are admitted only when Creative Page resolves to the sync tenant; foreign Ads skip, unresolved defer. Parent configuration can be shared; children and ad-level Insights remain tenant-filtered. No cross-tenant payload/history persistence or campaign/account aggregate metric substitution.

## Marketing data first — CHG-20261008-10

User prioritizes database implementation before periodic backend. PLAN-011D closes the scoped database gate; SRC-054 creates own schema/migrations/grants. Next PLAN-011 completes auth/API/Page validation/cadence/retention, then SRC-051 periodic metadata and SRC-055 periodic base/age/region Insights. Reporting PLAN-022 → SRC-049 consumes their data contracts. Database completion does not close live synchronization or reporting acceptance.

PLAN-011E metadata design now specifies [authority → worker sequence](marketing-backend.md). Add SRC-056 for Channels account credential/Page admission prerequisite; SRC-051 depends on it and scoped PLAN-011E. SRC-055 remains gated by remaining Insights design. Do not close broad PLAN-011 from metadata design alone.

## Common visualization extension — 2026-10-12

CHG-20261012-08: [Ready scoped contract](../contracts/reporting-visualizations.md) adds horizontal bar, stacked bar, area, pie/donut and descriptor-driven quick-start presets to SRC-064. Trend uses temporal line/area, composition requires additive measures and complete nonnegative partitions, exact table remains available. Existing definitions stay compatible; no database migration. Published reusable templates/dashboard/period comparison remain separate.

SRC-0682026-10-13: [Ready Customer360/session contract](../contracts/customer-360-session.md) defines forward28 session_touchpoint (Chat), sales_session_context and lead_merge (Sales), immutable origin versus actual context, active-session referral continuity and separate duplicate consolidation. Implemented and verified in SRC-068: 333unit,11 persistent MySQL,6 focused healthcare and8 native/browser groups; no stage/milestone/report completion claim. Existing physical monolith retains application ports; no external FK.

PLAN-025 / SRC-069: [Ready session progress contract](../contracts/session-progress.md) defines six Chat-owned tables in forward29, pinned process/stage, need-scoped manual evidence/corrections and a connected behavioral session funnel. Current monolith application producer + pure Reporting reducer; no cross-service SQL or mock-builder permission activation. SP-01…07 implemented and verified in SRC-069 (345unit,13persistent MySQL,8native/browser,6healthcare); see task evidence.

SRC-070 DONE2026-10-14: [50-inbox dashboards](../contracts/inbox-demo-dashboards.md), user-confirmed30accepted/20queued. CHG-20261014-03 [tenant super admin](../contracts/tenant-super-admin.md) implemented; actual Alpha activation/native browser PASS without added role. 356unit,22native and5actual Alpha browser groups PASS; backend/Next builds, workspace types/static checks PASS. Full SRC-061 remains separate.

2026-10-16 / CHG-20261016-04: User authorized per-need AI enrichment and follow-up workflow; SRC-082 restores canonical conversation_id per CHG-20261016-05. PLAN-035/SRC-081 DONE; [runtime evidence](../tracking/details/SRC-081.md). See [contract](../contracts/need-follow-up.md). Forward34 renames four physical relationship columns; compatibility preserves immutable v1/graphs/receipts; real adapter configured explicitly; no invented provider result.

SRC-082 / CHG-20261016-05: [Conversation identity alignment](../contracts/conversation-identity.md) makes conversation_id canonical and preserves session_id episode semantics. Forward34 renames session_contribution/need_assessment/need_follow_up/sales_need_outcome.thread_id without changing IDs, grants, tenant ownership or cross-service boundaries. New need.assessed/classification events use v2; v1 artifacts stay readable. CI-01…03 validation tracked separately from SRC-081 history.
