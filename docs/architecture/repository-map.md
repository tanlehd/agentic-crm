# Repository map — một web app, backend theo service owner

PLAN-059 · CHG-20261021-11 · ADR-028 · 2026-10-21. Phạm vi: audit source và chuẩn hóa bản đồ repo trước khi đóng gói/deploy từng service. R1 đã chuyển source theo CHG-20261021-12; các service đích chưa extraction vẫn là kế hoạch. [Relocation](../development/repository-relocation.md) ghi compatibility và evidence. [Catalog](../services/README.md) giữ trách nhiệm; [tracker](../tracking/tasks.md) giữ tiến độ; [topology](../system/deployment-topology.md) giữ deployment evidence.

## Quyết định

Giữ một pnpm monorepo, một Next.js web app cho các workspace. Backend đích nằm riêng tại `services/<owner>`, mỗi service có package/build/test/runtime/config/migration ownership của mình. Thư viện tái sử dụng nằm trong `packages/`. Tách repository Git không phải điều kiện để deploy độc lập.

Frontend có thể cùng release; backend không import implementation của service khác hoặc dùng shared database/UoW sau extraction. API và worker của cùng owner là hai entrypoint có thể scale riêng, không tự trở thành hai business service. Một Workflow duy nhất theo ADR-027, editor vẫn thuộc web app.

Trong thời gian chuyển đổi, `services/core-baseline` là baseline monolith thật, đã chuyển từ `apps/backend`. Thư viện validator đã chuyển từ `services/workflow-core` sang `packages/workflow-definition`. Không còn source ở hai path cũ. Workspace names `@agentic-crm/backend` và `@agentic-crm/workflow-core` giữ nguyên để các lệnh hiện có tương thích. Việc di chuyển không biến các domain bên trong baseline thành service độc lập.

## Hiện trạng đã đọc từ source

Inventory ngày 2026-10-21: 10 workspace packages, theo `pnpm-workspace.yaml` và các `package.json`; không đếm `dist`, `.next*`, `node_modules`, `.local` hay artifacts thành source. Git working tree đã có nhiều thay đổi trước phiên này.

| Path hiện tại | Loại thực tế | Điểm cần làm rõ trước deploy |
|---|---|---|
| `apps/web` | Một Next.js application, `app/` và `components/` | Đã gom UI; nên chia feature bên trong, không tạo một app cho mỗi màn hình |
| `services/core-baseline` | Baseline NestJS API, worker và private owner endpoints | Chứa nhiều domain và kernel/UoW; Identity/Chat endpoint riêng vẫn dùng baseline image/data |
| `services/crm-connector` | Runtime package: API, worker, dispatch; own schema | Có Docker target và CI packaging check; provider synthetic không trở thành production integration |
| `services/reporting` | Runtime package: Reporting HTTP; own schema | Có Docker target và CI packaging check; BFF/producer trong backend là phần tích hợp, không phải Reporting server thứ hai |
| `services/chat` | Extraction candidate, own storage và HTTP adapters | Chỉ có build/typecheck scripts, chưa có start script, main runtime hoặc Docker target; README package được bổ sung trong phiên map; T05 còn làm dở |
| `services/marketing` | Candidate có storage/scheduler libraries | README xác nhận chưa có API/periodic worker entrypoint; không phải daemon đang chạy |
| `packages/workflow-definition` | Pure authoring validator/node catalog library | Không persistence/execute/start; `executable:false`; đã đặt đúng nhóm library, giữ package name cũ để tương thích |
| `packages/contracts` | Wire schemas/types/generated clients | Dùng chung định dạng, không chứa business implementation, ORM entity hoặc repository |
| `packages/workload-transport` | Shared workload transport library | Không sở hữu business authority/database |
| `packages/testkit` | Test support library | Test dependency, không đưa vào production runtime nếu không cần |

Reporting và Connector vẫn là hai service đã tách. Trong R1, API/worker baseline và local monitor đã được khởi động lại từ path mới; evidence/health trong relocation runbook. Số package không phải số service đang chạy. Catalog hiện có 14 owner boundaries; số 17 trong các báo cáo cũ là lịch sử.

### Những chỗ đang làm repo map khó hiểu

1. R1 đã phân loại lại: `apps` chỉ còn web, baseline trong `services/core-baseline`, validator trong `packages/workflow-definition`. Candidate Chat/Marketing vẫn được ghi rõ chưa có standalone runtime.
2. `services/core-baseline/src/modules/agents` trộn Routing và AI Runtime. `channels` còn baseline Connector logic; `conversation` là nguồn Chat. Không thể move mỗi thư mục thành một owner mà không xem từng file.
3. `kernel/reliability/worker.ts` import trực tiếp Workflow, Sales, Agents, Channels và Conversation. Đây là composition của baseline; không copy cả kernel thành `packages/common` rồi để mọi service phụ thuộc vào nó.
4. `infra/docker/Dockerfile` target `backend` và `web` đi qua stage `build` chạy root `pnpm build`; target `backend-runtime`, `connector` và `reporting` đã có đường compile hẹp hơn. Stage dependency vẫn copy manifest của cả workspace; compile isolation không đồng nghĩa cache/build context đã tối ưu hoàn toàn.
5. Root `build` liệt kê package thủ công nhưng chưa gồm Chat; Chat có `build:chat` riêng. CI hiện có Connector/Reporting image checks và suite chung, chưa phải pipeline cho mọi backend owner.
6. Script kiểm thử/provision/generate có đường dẫn trực tiếp tới `services/*/dist`, `database/migrations` và backend. Move source phải kiểm cả runtime resolver, generated output và test harness; không chỉ sửa TypeScript imports.

Evidence đọc: [Dockerfile](../../infra/docker/Dockerfile), [workspace](../../pnpm-workspace.yaml), [scripts](../../package.json), [CI](../../.github/workflows/verify.yml), [local runtime map](../../scripts/local-runtime.mjs), [Workflow library](../../packages/workflow-definition/README.md), [Marketing candidate](../../services/marketing/README.md), [Chat package](../../services/chat/package.json).

## Cấu trúc đích

Đây là cây đích, không phải danh sách thư mục đã tồn tại. Chỉ tạo service khi scope được triển khai; không scaffold hàng loạt thư mục rỗng để đủ catalog.

```text
agentic-crm/
  apps/
    web/                          # một Next.js application
      app/                        # routes/layouts và page composition
      features/                   # crm, chat, sales, workflow, reporting...
      components/                 # UI primitives/composition dùng chung
      lib/                        # API clients, session/UI helpers
  services/
    core-baseline/                # baseline đã di chuyển; xóa khi hết consumers
    identity/
    crm/
    crm-connector/                # giữ tên package/path ổn định đã có
    chat/
    sales/
    routing/
    workflow/                     # authoring + engine + scheduler + workers
    ai-runtime/
    media/
    ticket/                       # chỉ khi exact scope Ready
    reporting/
    marketing/
    operations/
    gateway/                      # BFF/public adapters; không business DB
  packages/
    contracts/                    # public API/events, versioned schemas/types
    workload-transport/           # shared transport primitives
    workflow-definition/          # pure graph/catalog validation, từ workflow-core
    testkit/
  infra/                          # shared local infrastructure và deployment composition
  scripts/                        # workspace orchestration và wrappers chuyển tiếp
  docs/                           # design/contracts/data/operations/tracking
  artifacts/                      # generated verification evidence, không runtime source
```

`features/` và `lib/` là đề xuất tổ chức trong web, không thêm workspace package. Giữ App Router `app/` hiện có; refactor feature theo từng phạm vi được sửa, tránh move tất cả UI trong cùng một thay đổi backend. Chỉ tách `packages/ui` khi có application thứ hai thực sự dùng chung; hiện chưa cần.

## Map đủ 14 backend owners

Các path trong bảng dùng để xác định nguồn cần kiểm kê, không phải phép chuyển nguyên thư mục. Phần `modules/` viết tắt cho `services/core-baseline/src/modules/`. Schema/authority vẫn theo [ownership map](../data/service-ownership.md), không suy ownership từ tên file.

| Owner / descriptor | Nguồn hiện tại | Đích cuối | Giới hạn/công việc còn lại |
|---|---|---|---|
| [Identity](../services/identity.md) | `modules/identity`, baseline database/grants/transport | `services/identity` | Native auth có trong baseline; owner HTTP chưa chứng minh extraction |
| [CRM](../services/crm.md) | `modules/crm`, phần registry/metadata trong kernel | `services/crm` | Phân rã registry theo owner, giữ Contact/custom metadata authority |
| [Connector](../services/crm-connector.md) | `services/crm-connector` + phần baseline `modules/channels` | `services/crm-connector` | Giữ runtime đã có; rà từng connection/referral/Contact-resolution adapter, không chuyển Contact master sang Connector |
| [Chat](../services/chat.md) | `modules/conversation` + `services/chat` | `services/chat` | Tiếp tục T05–T09 có gate; chuyển writers/consumers rồi single-writer cutover |
| [Sales](../services/sales.md) | `modules/sales` + baseline registry/UoW | `services/sales` | Lead/Deal authority, schema/consumer gates trước extraction |
| [Routing](../services/routing.md) | Routing/Human capacity/config trong `modules/agents` | `services/routing` | Chọn file theo responsibility; không mang AI executions/provider config theo |
| [Workflow](../services/workflow.md) | `modules/workflow`; validator `packages/workflow-definition`; editor trong web | `services/workflow` + `packages/workflow-definition` | Runtime còn baseline; không tạo Workflow API/Core/Chatflow services riêng |
| [AI Runtime](../services/ai-runtime.md) | Execution/provider/tools trong `modules/agents` | `services/ai-runtime` | Identity principal và Routing Human capacity thuộc owner khác; native AI deferred |
| [Media](../services/media.md) | Contract/placeholders và references trong các module liên quan | `services/media` | Chưa có package độc lập; binary/scan/extraction chỉ triển khai khi Ready |
| [Ticket](../services/ticket.md) | Thiết kế và generic object references | `services/ticket` | Draft, chưa có Ticket domain runtime; không mở SLA/state machine từ cleanup |
| [Reporting](../services/reporting.md) | `services/reporting`; BFF/producer adapters trong `modules/reporting` và owners | `services/reporting` | BFF về gateway; producer/facts ở owner; không move toàn bộ Reporting consumer logic vào server |
| [Marketing](../services/marketing.md) | `services/marketing` libraries/own storage | `services/marketing` | Hoàn tất exact auth/API/worker acceptance trước gọi là deployed |
| [Operations](../services/operations.md) | `modules/operations`; local monitor trong scripts là dev tooling | `services/operations` | Chỉ projections/replay requests; không central SQL vào business services |
| [Gateway/BFF](../services/gateway.md) | Backend public route composition, `src/gateway`, BFF adapters, `modules/external-api`, web adapters | `services/gateway` | Tách route/context/composition; private-app Identity và domain logic giữ owner, không business DB |

External API facade là adapter của Gateway/owners, không owner thứ 15. `core-baseline` là nơi giữ code chưa extract, không owner thứ 16. Hạ tầng MySQL/Redis/nginx không thuộc bảng backend business owners.

## Tiêu chí tổ chức SaaS áp dụng cho repo này

| Tiêu chí | Quy tắc cụ thể | Bằng chứng cần khi triển khai |
|---|---|---|
| Ownership | Một domain owner giữ code nghiệp vụ, config, migration và runbook của mình | Descriptor khớp path; người/team review được chỉ định khi có thông tin thật, không tạo CODEOWNERS giả |
| Dependency | Web/service dùng public contracts/libraries; service-to-service qua versioned API/events | AST/import guard, khai báo `workspace:*`; không relative import sang source/dist/domain của service khác |
| Build/release | Build target chỉ compile service và dependency closure cần thiết; root full build dùng kiểm tổng hợp | CI build/package độc lập, production artifact không có source backend khác/web/dev dependencies |
| Data | Schema/credentials/migrations theo owner; không cross-service SQL/FK/UoW | Tenant-negative tests, grants, migration/restore evidence; applied history giữ nguyên |
| SaaS tenant | Tenant context đi qua HTTP/jobs/events/cache; owner kiểm quyền tại effect | `tenant_id NOT NULL`, cache/key scoping, current authorization, fail-closed tenant mismatch |
| Operation | API/worker health, shutdown, config validation, bounded retry và correlation theo use case | Service runbook, logs/metrics không lộ secret/PII; rollback image/config giữ dữ liệu |
| Compatibility | Web và backend có thể ở revision khác; contract thêm phiên bản/expand-contract khi cần | Consumer contract tests, giữ IDs/cursors/receipts, không ép deploy đồng thời mọi service |
| Developer experience | Một lockfile/toolchain, entry commands dễ tìm; fixtures synthetic giữ lại | Root wrappers ổn định; test theo changed boundary và downstream consumers, không reset data |

Monorepo giúp thay đổi contracts và consumer cùng review; polyrepo phù hợp khi có team/access/release governance cần tách thực sự. Hiện không có nhu cầu được chứng minh để thêm nhiều Git repo, nhiều lockfile hoặc microfrontend. Chưa cần đưa Nx/Turborepo vào chỉ để sắp thư mục; pnpm workspace hiện tại đủ làm nền.

### Package service tối thiểu

```text
services/<owner>/
  package.json                    # build/typecheck/test/start; worker nếu có
  tsconfig.json
  README.md                       # owner, status, entrypoints, commands, dependencies
  .env.example                    # placeholder, không credential thật
  src/
    main.ts                       # composition entrypoint; worker.ts nếu cần
    domain/                       # invariant/model của owner
    application/                  # use cases và ports
    adapters/                     # HTTP/events/database/external clients
  tests/                          # focused unit/contract/integration tests
  migrations/                     # forward lineage của owner; nếu có storage
  Dockerfile                      # service release recipe khi đóng gói
```

Đây là quy ước cho code mới/refactor có chủ đích, không bắt mọi service nhỏ có đủ layer rỗng hoặc mọi service có worker/database. Existing `database/migrations` có thể giữ path; không move/renumber applied migrations để khớp mẫu. Gateway không cần migrations. Common Docker toolchain có thể tái sử dụng; một Dockerfile multi-target vẫn hợp lệ nếu từng target build/package độc lập. Mục tiêu là service owner tìm được recipe của mình, không phải số Dockerfile.

### Shared code và phần chuyển tiếp

- `contracts`: DTO/schema/client code có version; không export ORM entity, SQL repository, mutable registry hay business service class.
- `workload-transport`: transport primitives; owner vẫn tự quyết authorization/invariant. Không thêm database connection dùng chung cho các services.
- `workflow-definition`: pure validation/catalog dùng chung giữa editor/tests/runtime khi cần, không đưa engine/repository/run state vào shared package. Đây là library của Workflow, không business authority thứ hai.
- Baseline UoW, central migration history và worker composition ở baseline cho tới owner extraction; không quảng bá thành framework chung cho microservices.
- Test harness có thể import implementation phục vụ kiểm thử; đánh dấu test-only và không đưa vào dependency closure production. Đường dẫn lịch sử trong evidence vẫn giữ nguyên.

## Trình tự cleanup và điều kiện trước deploy

Chỉ một implementation workstream active. PLAN-059 đóng việc map/design, không tạo source task cạnh tranh SRC-109/T05 hoặc bỏ gate T06–T09. User đã yêu cầu thực hiện R1 như cleanup sub-scope của SRC-109; các cleanup tiếp theo vẫn theo từng phạm vi; không bắt hoàn tất cả 14 owner trước khi tiếp tục một service đã Ready.

| Bước | Thay đổi có giới hạn | Điều kiện hoàn tất |
|---|---|---|
| R0 — map/design | Bản đồ hiện trạng/đích, ADR, nguồn tham khảo, links và tracker | Map đủ 14 owner + 10 packages; docs check và source/config unchanged; phạm vi phiên này |
| R1 — phân loại/path | Đã chuyển Workflow validator và backend baseline; cập nhật workspace/lock/build/test/Docker/Compose/scripts/docs links | [CHG-20261021-12](../development/repository-relocation.md); giữ package names/commands, nguồn/frozen evidence/migrations và domain authority |
| R2 — build boundaries | Service-targeted builds; root aggregate gồm candidate cần kiểm; image closure và CI theo dependencies | Build/typecheck affected packages và consumers; image smoke cho path/recipe thay đổi; sửa shared package phải kiểm mọi downstream consumer liên quan |
| R3 — domain extraction | Tiếp tục từng owner có exact Ready scope, trước mắt Chat theo T05–T09 | Source không import implementation owner khác; owner storage/API/consumer/operational parity đạt; single writer và rollback có evidence |
| R4 — đóng gói/rollout | Image/config/runbook theo service đã qua gates | Migration/grants/recovery, tenant/current-auth checks, health, end-to-end outcome và traffic switch theo kế hoạch của service |

R1/R2 là cleanup kỹ thuật có thể làm trước rollout, không thay R3. Không chuyển tất cả domain code sang `services/*` rồi tiếp tục import qua lại để gọi là đã tách. Đối với module chưa có independent scope, giữ baseline và map rõ owner cho tới extraction.

Compatibility khi move: giữ public URL/payloads/package API/env semantics/ports/DB names/IDs và migration history; dùng wrapper tạm cho root commands nếu cần. Đường dẫn build và operational scripts phải được cập nhật trước khi thử start/restart. Nếu build/reference chưa khép kín, giữ path cũ; không dùng symlink hoặc duplicate source để tạo hai canonical implementations.

## Acceptance của PLAN-059

- RM-01: kiểm kê 10 workspace packages, phân biệt runtime/library/candidate và điểm build coupling bằng source thực tế.
- RM-02: map đủ 14 catalog owners về current/target paths; Workflow một service, UI một app; Draft ghi rõ.
- RM-03: quy tắc dependencies/data/build/test/ops và trình tự cleanup; giữ deployment/extraction gates và migration compatibility.
- RM-04: nguồn tham khảo chính thức, ADR/catalog/index/build plan/tracker/log/checkpoint đồng bộ; docs/whitespace checks và fingerprint xác nhận không thay code/config.

Evidence và trạng thái checks ở [execution log](../tracking/log.md); artifacts trong `artifacts/repository-map/`. Không claim source relocation, image build, runtime test hoặc deployment từ acceptance tài liệu.

## Tham khảo và cách áp dụng

Đọc ngày 2026-10-21. Đây là cơ sở cho quyết định của repo, không phải tiêu chuẩn bắt buộc một cấu trúc thư mục duy nhất cho mọi SaaS.

- [Turborepo — Package types](https://turborepo.dev/docs/core-concepts/package-types): phân biệt application deployable và library, application thường là điểm cuối dependency graph. Áp dụng vào việc tách `services` với `packages`; không suy phải cài Turborepo.
- [Microsoft — Domain analysis](https://learn.microsoft.com/en-us/azure/architecture/microservices/model/domain-analysis): ranh giới theo domain/bounded context. Áp dụng owner map thay vì chia backend theo màn hình hoặc loại controller/repository toàn hệ thống.
- [Microsoft — Data sovereignty per microservice](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/architect-microservice-container-applications/data-sovereignty-per-microservice): service giữ data/logic và truy cập qua API/messages. Áp dụng own schema/credentials và loại bỏ cross-service SQL/UoW trước claim extraction.
- [AWS — Identity and isolation](https://docs.aws.amazon.com/whitepapers/latest/saas-tenant-isolation-strategies/identity-and-isolation.html): tenant context phải đi xuyên các interaction tới nơi truy cập resource. Áp dụng cho cả HTTP, worker và database boundaries, không dừng ở web login.
