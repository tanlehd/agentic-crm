# Kế hoạch sinh source code M1–M2

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
