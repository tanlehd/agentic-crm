# Kế hoạch sinh source code M1–M2

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
| Auth local | Keycloak OIDC dev realm; NestJS giữ session/token server-side, trình duyệt chỉ có session cookie |
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
