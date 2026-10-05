# Agentic CRM

Nền tảng conversational CRM dạng SaaS multi-tenant, nơi Human Agent và AI Agent cùng xử lý hội thoại, lead, cơ hội bán hàng và yêu cầu hỗ trợ.

**Trạng thái:** Base CRM M1 có OIDC, tenant isolation, Identity Admin UI, Contact/Company/Activity, Lead draft/consent/qualification và custom object CRUD. Metadata/property/form/view, typed query/index, association, audit/idempotency/outbox đã có; migration source v1–v17 và seed Alpha/Beta; Conversation backend/notes/outbound mock SRC-014 và mock intake/identity/CTM SRC-015 và inbox UI SRC-016; routing/assignment/takeover SRC-017 và private deterministic Agent Runtime SRC-018 và durable Workflow engine/API SRC-019. SRC-020 Chatflow/session/Human completion và SRC-021 Sales handoff/acceptance backend DONE; preview schema16 đã qua Chrome Human completion, runtime theo checkpoint. Trạng thái nghiệm thu và evidence xem [task tracker](docs/tracking/tasks.md).

Mở [ứng dụng local](http://localhost:8080) sau khi khởi động theo [hướng dẫn chạy](docs/development/local.md).

## Bắt đầu đọc

1. [Tầm nhìn và phạm vi sản phẩm](docs/product/vision.md).
2. [Bản đồ tài liệu và mức sẵn sàng](docs/index.md).
3. [Kiến trúc hệ thống](docs/system/architecture.md) và [data model](docs/data/model.md).
4. [Case healthcare](docs/business/healthcare.md) và [lát cắt Messenger → Lead → Sale](docs/business/first-slice.md).
5. [Roadmap](docs/product/roadmap.md), [ma trận nghiệm thu](docs/quality/acceptance.md) và [quy trình phát triển](docs/governance/development.md).
6. [Kế hoạch sinh source](docs/planning/build-plan.md), [task tracker](docs/tracking/tasks.md) và [checkpoint để tiếp tục](docs/tracking/checkpoint.md).

## Bắt đầu build

Đợt đầu gồm 25 task M1–M2; trạng thái hiện tại ở tracker. [Docker Compose](compose.yaml) đã có web/API/worker, MySQL, Redis, Keycloak dev; test runner tách project. Migration/kernel ở SRC-004; portable verify/CI adapter ở SRC-005, seed Identity idempotent ở SRC-009; registry foundation ở SRC-010; properties/custom CRUD ở SRC-011, CRM core ở SRC-012 và Admin/CRM UI ở SRC-013.

Mỗi phiên cập nhật tracker, evidence và checkpoint; thay đổi thiết kế theo [change control](docs/governance/change-control.md). [AGENTS.md](AGENTS.md) hướng dẫn các phiên triển khai sau đọc đúng tài liệu và ghi lại tiến độ.

## Các quyết định nền tảng

- Next.js + TypeScript; NestJS modular monolith và worker; MySQL 8.4 LTS; Redis/BullMQ. AI Runtime đi qua adapter.
- Shared database, dữ liệu và cấu hình cô lập bằng tenant; quyền được kiểm tra ở backend.
- Contact là danh tính; Lead là nhu cầu; Deal là cơ hội; Customer là trạng thái của Contact sau một Deal thắng.
- Conversation, Lead, Deal, Ticket có owner là Human hoặc AI; Team tổ chức hàng chờ và phạm vi quyền.
- Standard object và custom object chia sẻ registry/metadata/association; không tạo bảng riêng cho từng tenant.
- Tài liệu, contract và acceptance scenario phải đi trước implementation.

## Phạm vi đợt khởi tạo

Blueprint toàn platform; đặc tả chi tiết nền móng và case Facebook Messenger CTM giả lập → nhận diện Contact → Conversation → phân công → qualify Lead → bàn giao Sale. Connector thật, AI thật, builder nâng cao, Google Ads và custom report đầy đủ nằm ở milestone sau.

Tài liệu bằng tiếng Việt; tên entity, API, event, field và requirement ID bằng tiếng Anh. CRM M1 đã có source và kiểm thử; Conversation/message domain và outbound mock SRC-014 đã có; mock Messenger intake SRC-015 đã có; inbox UI SRC-016 đã có; routing/assignment/takeover SRC-017 đã có; private mock runtime SRC-018 đã có; Workflow engine SRC-019 đã có; Chatflow/Sales handoff backend SRC-020/021 đã có; Sale UI và M2 gate tiếp tục SRC-022…025.
