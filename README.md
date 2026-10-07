# Agentic CRM

**Thiết kế mới ADR-021 (2026-10-07):** bỏ Keycloak khỏi target; CRM Identity tự quản lý đăng nhập/session/quyền trong MySQL. Mọi bảng ứng dụng có tenant_id, schema theo service. [DB guideline](docs/data/database-guidelines.md) · [Schema catalog](docs/data/schema-catalog.md) · [Native auth/cutover plan](docs/planning/native-identity-data-plan.md). SRC-038 đã cutover native local; [runbook](docs/development/native-auth.md). Physical schema extraction còn PLAN-007B.

Nền tảng conversational CRM dạng SaaS multi-tenant, nơi Human Agent và AI Agent cùng xử lý hội thoại, lead, cơ hội bán hàng và yêu cầu hỗ trợ.

**Kiến trúc đích:** enterprise microservices, service-owned data/API/events theo [service catalog](docs/services/README.md) và [architecture](docs/system/architecture.md). Preview đang chạy vẫn monolith; SRC-028 đã triển khai và kiểm thử independent Connector ingress theo [kế hoạch chuyển đổi](docs/planning/microservices-migration.md), chưa chuyển traffic preview.

**Trạng thái:** 25/25 source tasks M1–M2 DONE; M1 và M2 local/mock release gates PASS. CRM/Identity, Conversation/Inbox, routing/Human takeover, deterministic Agent Runtime, durable Workflow/Chatflow và Sales/Operations UI đã có. Release đã qua cold start, nâng schema8→17 giữ dữ liệu, restart và demo OIDC→CTM→Lead→Sales trên ARM64 native và AMD64 emulated. [Tracker](docs/tracking/tasks.md) · [Release/runbook](docs/development/m2-release.md). Connector Meta/AI thật và M4–M5 chưa triển khai; M3 đã bắt đầu với message envelope, normalized rich mock storage/API/inbox đã có theo tracker.

Mở [ứng dụng local](http://localhost:8080) sau khi khởi động theo [hướng dẫn chạy](docs/development/local.md).

Host development Windows/macOS/Linux: [hướng dẫn hạ tầng và service monitor](docs/development/service-manager.md). `pnpm infra:start`, `pnpm local:init`, `pnpm local:monitor`; start/stop từng ứng dụng và giữ dữ liệu MySQL/Redis. DB local đã migration23, native login và readiness đạt.

## Bắt đầu đọc

1. [Tầm nhìn và phạm vi sản phẩm](docs/product/vision.md).
2. [Bản đồ tài liệu và mức sẵn sàng](docs/index.md), [phạm vi/kiến trúc/data từng service](docs/services/README.md).
3. [Kiến trúc hệ thống](docs/system/architecture.md) và [data model](docs/data/model.md).
4. [Case healthcare](docs/business/healthcare.md) và [lát cắt Messenger → Lead → Sale](docs/business/first-slice.md).
5. [Roadmap](docs/product/roadmap.md), [ma trận nghiệm thu](docs/quality/acceptance.md) và [quy trình phát triển](docs/governance/development.md).
6. [Kế hoạch sinh source](docs/planning/build-plan.md), [task tracker](docs/tracking/tasks.md) và [checkpoint để tiếp tục](docs/tracking/checkpoint.md).

## Bắt đầu build

Đợt đầu gồm 25 task M1–M2; trạng thái hiện tại ở tracker. [Docker Compose](compose.yaml) đã có web/API/worker, MySQL, Redis và native MySQL auth; test runner tách project. Migration/kernel ở SRC-004; portable verify/CI adapter ở SRC-005, seed Identity idempotent ở SRC-009; registry foundation ở SRC-010; properties/custom CRUD ở SRC-011, CRM core ở SRC-012 và Admin/CRM UI ở SRC-013.

Mỗi phiên cập nhật tracker, evidence và checkpoint; thay đổi thiết kế theo [change control](docs/governance/change-control.md). [AGENTS.md](AGENTS.md) hướng dẫn các phiên triển khai sau đọc đúng tài liệu và ghi lại tiến độ.

## Các quyết định nền tảng

- Next.js + TypeScript; NestJS modular monolith và worker; MySQL 8.4 LTS; Redis/BullMQ. AI Runtime đi qua adapter.
- Target database-per-service theo schema catalog; mọi application table có tenant_id và quyền do CRM kiểm tra ở backend. Shared database hiện tại là baseline chuyển đổi.
- Contact là danh tính; Lead là nhu cầu; Deal là cơ hội; Customer là trạng thái của Contact sau một Deal thắng.
- Conversation, Lead, Deal, Ticket có owner là Human hoặc AI; Team tổ chức hàng chờ và phạm vi quyền.
- Standard object và custom object chia sẻ registry/metadata/association; không tạo bảng riêng cho từng tenant.
- Tài liệu, contract và acceptance scenario phải đi trước implementation.

## Phạm vi đợt khởi tạo

Blueprint toàn platform; đặc tả chi tiết nền móng và case Facebook Messenger CTM giả lập → nhận diện Contact → Conversation → phân công → qualify Lead → bàn giao Sale. Connector thật, AI thật, builder nâng cao, Google Ads và custom report đầy đủ nằm ở milestone sau.

Tài liệu bằng tiếng Việt; tên entity, API, event, field và requirement ID bằng tiếng Anh. CRM M1 đã có source và kiểm thử; Conversation/message domain và outbound mock SRC-014 đã có; mock Messenger intake SRC-015 đã có; inbox UI SRC-016 đã có; routing/assignment/takeover SRC-017 đã có; private mock runtime SRC-018 đã có; Workflow engine SRC-019 đã có; Chatflow/Sales handoff backend SRC-020/021 đã có; Sale/Operations UI SRC-022 đã có; healthcare fixture và metric queries SRC-023 đã có; fault/regression suite SRC-024 đạt180 integration tests; release M2 gate SRC-025 đã PASS (local/mock).

Healthcare M2 fixture/query walkthrough: [test:healthcare](docs/development/healthcare-demo.md), chạy độc lập trong MySQL test trống.

Hướng M3 đã chốt: AI Agent setup chọn provider (Meta Business Agent case study), CRM Connector/routing và message đa nền tảng. [Design plan](docs/planning/m3-provider-plan.md) · [Meta source snapshots](docs/references/meta/README.md). Production design vẫn Draft; PLAN-003 đã hoàn tất nghiên cứu, PLAN-004A/B chốt message foundation. Provider setup/routing/media resolver tiếp tục PLAN-004 theo capability/gap matrix.

SRC-028 adds an independent [CRM Connector durable ingress](services/crm-connector/README.md), private MySQL schema/API/worker/image and mock HTTP bridge to the existing monolith. It does not switch preview traffic or implement Facebook raw webhooks. Current evidence/status remains in the tracker.

SRC-029 implements optional signed Messenger webhook capture with own schema2 and atomic Page/tenant dedup; tested locally with synthetic HMAC, MySQL and release-image restart. Captured events are not yet delivered to Chat. M3 local and live release remain incomplete; [evidence](docs/tracking/details/SRC-029.md).

SRC-031 adds Admin→Channels→Facebook OAuth/Page configuration with encrypted credentials, manual verified token replacement and channel/Page filters in Inbox. [Setup/runbook](docs/development/facebook-configuration.md). Local synthetic tests pass; live OAuth needs Meta App configuration, and real message ingestion/send remains pending. Preview is not automatically upgraded.

Agent Chat rebuild: [workspace plan](docs/planning/agent-chat-workspace.md) và [UX](docs/ux/agent-chat-workspace.md). SRC-032 backend unread/query/metrics foundation DONE với203 MySQL tests và9 canonical gates; SRC-033 catalogs DONE với209 MySQL regression,13 final workspace cases và102 unit tests. UI rebuild và full workspace local release chưa hoàn tất; không đồng nghĩa đã nâng schema preview hoặc hoàn thành live provider integration.

SRC-034 snooze/activity backend and schema22 source are implemented; SRC-038 regression now passes222 MySQL cases and local DB is23. Full workspace UI/release remains pending; task disposition is recorded in the tracker. [Evidence](docs/tracking/details/SRC-034.md).
