# MOD-02 — CRM & Object Platform

SRC-080 adds [record detail/preview layouts and Default/team views](../contracts/record-pages.md), CRM-owned forward32 presentation metadata. Admin card builder, native CAS/audit/idempotency and viewer-team resolution use existing catalog/permissions. CRM detail/quick-preview and Inbox Contact consume layouts; old forms/list views stay under Setup. [Runbook](../development/record-pages.md) · [Evidence](../tracking/details/SRC-080.md).

PLAN-028/CHG-20261015-02: [Object Platform plan](../planning/no-code-object-platform.md), [UX](../ux/object-properties-workspace.md), [logical model](../data/no-code-entity-model.md) mở rộng metadata/admin/ERD/workspace và reuse schema trong Reporting/Workflow. M1 wire giữ compatibility; SRC-073/074 bổ sung catalog/config/ERD/Workspace và agent association discovery theo [exact contract](../contracts/object-platform-r1.md). Lifecycle/unlink cần PLAN-028E; connected adapters cần PLAN-028B/C, không tự Ready advanced builders.

> Kiến trúc đích microservice theo ADR-017: [CRM Core & Metadata](../services/crm.md). Nội dung implementation/UoW/FK dưới đây mô tả baseline monolith; không áp dụng transaction xuyên service. Service extraction chưa triển khai.
Status: Ready for implementation nền móng M1; advanced builder Draft M5. Requirements: REQ-03, REQ-04, REQ-13.

## Mục tiêu và phạm vi

Cung cấp registry, Contact/Company/Activity, custom objects/properties, association, form/view metadata và query typed. Lead/Deal/Ticket/Conversation có subtype do module nghiệp vụ sở hữu; generic API không vượt state machine.

## Actor và quyền

Tenant admin thiết kế schema; agent CRUD theo object action/scope. Field deny áp dụng đọc, ghi, filter và export. Schema.read không đồng nghĩa được đọc mọi record. Tạo association cần read cả hai đầu và update source.

## Use case và state machine

Custom object: create → active → archived (archive UI/schema đầy đủ sau M1). Record: active → archived; archive bị chặn nếu run/record nghiệp vụ active phụ thuộc. Contact lifecycle prospect → customer khi Deal thắng ở M4; M1 không cho người dùng PATCH customer.

Tenant cấu hình Appointment/ServiceOffering bằng metadata, tạo record và liên kết Contact để chứng minh extension; không cần migration tạo bảng ngành.

## Entity và invariant

[Model](../data/model.md), [dictionary](../data/dictionary.md) là nguồn chuẩn. Registry + subtype + typed index + audit/outbox ghi atomic. Association type kiểm tra hai object type và cardinality; lock hai đầu theo thứ tự ID để serialize kiểm tra giới hạn.

M1 standard Contact fields editable: display_name, normalized_phone, normalized_email, contact_preference. Phone normalize E.164 khi có country code, reject ambiguous phone nếu được dùng cho qualification phone; email trim/lowercase dùng cho lookup, không tự merge. Display name không là identity key.

Property definition type immutable; create required field trên object đã có record chỉ được khi có default hợp lệ và backfill hoàn tất trong migration có giới hạn. M1 đơn giản reject `required=true` nếu đã có record, để tránh silent invalid rows; dùng schema mới trước data.

## API và event

[Metadata/record APIs](../contracts/api.md); read/list dùng cùng evaluator. `contact.created` là event M1. Custom change chưa khởi chạy arbitrary workflow ở M2; M5 bổ sung event catalog theo schema version trước mở builder.

## UI

SRC-079: [settings layout](../ux/object-properties-workspace.md) uses a data-settings sidebar, object selector and Setup overview. Property management adds search/source/type filters and a create dialog over the existing metadata renderer. No new data owner, API or lifecycle operation.

Object list, record detail, association cards, field editor, form field order và saved view. M1 form renderer tối thiểu theo type; required/error state lấy từ cùng metadata backend. Không hiển thị field bị deny dưới dạng disabled có giá trị.

## Failure handling

Sai type/enum/required trả 422 với field path; unknown key reject. Stale version 409. Query field chưa indexed trả FIELD_NOT_QUERYABLE. Index projection transaction lỗi thì rollback cả record, không trả success với search data lệch.

## Acceptance và dependency

[AC-03, AC-04, AC-13](../quality/acceptance.md); phụ thuộc Identity và Operations. Sales/Conversation/Ticket sử dụng registry service, không tự fork object metadata.

## Mở rộng còn Draft

PLAN-024A/B thiết kế [shared metadata/capability](../data/workflow-metadata.md) và Kafka object-change producers cho Workflow. Relationship traversal và generic change-image/enrollment giữ implementation gate; không sửa giới hạn M1 dưới đây thành tính năng đã chạy.

Formula field, computed property, unique custom field, multiselect, relationship traversal query, schema migration UI, bulk import/merge và drag-and-drop page layout.

## SRC-010 implementation boundary

Registry metadata/association HTTP và internal record/subtype/ownership ports triển khai tại `apps/backend/src/modules/crm`; exact [registry contract](../contracts/registry.md). Migration v6 có persisted field_policy, loader dùng Identity role IDs port. Chưa có production subtype adapter, record CRUD/typed index/forms hoặc public assignment; không coi synthetic subtype trong test là Contact đã triển khai. History append-only ở DB grants, source version tăng khi tạo association; HTTP commands có atomic audit/receipt. Metadata/association chưa phát workflow event; domain creation events và assignment consumers nối cùng modules tương ứng.

## SRC-011…013 M1 boundary

Property/custom/index/form/view ở SRC-011, Contact/Company/Activity và Lead core qua Sales port ở SRC-012. SRC-013 nối CRM/Admin UI, descriptor/context API và dev fixture v3. [Exact record contract](../contracts/crm-records.md), [core](../contracts/crm-core.md), [UI](../contracts/crm-ui.md). Các ghi chú “chưa có subtype/CRUD” của SRC-010 phía trên chỉ mô tả mốc lịch sử đó. Generic Deal/Ticket/Conversation và public assignment vẫn chưa mở. Gate/evidence hiện hành ở tracker.

ADR-019 target: CRM owns canonical external identity→Contact mapping and atomic ResolveContact; receives Connector profile observations without calling provider APIs or overwriting Human fields. [Contract](../contracts/contact-resolution.md). Physical source remains unchanged.

## SRC-030 scoped implementation

ContactIdentities application port owns canonical mapping reads and atomic Contact+identity creation; service-scoped durable operation receipt preserves replay result. No migration required. See [compatibility contract](../contracts/contact-resolution-local.md).

## UX-002 — Agent Contact drawer extension

Contact drawer dùng optional address/preferred_language properties và channel-identities theo [workspace contract](../contracts/agent-chat-workspace.md); cùng field read/write ACL, If-Match và Human-edit precedence. Contact channel click chỉ tìm/navigate Conversation có quyền; không tạo/send/merge identity ngầm. CRM note commits phát notification để Chat activity projection hydrate body có quyền; không đổi Note thành outbound. Thiết kế Ready, chưa có API/seed mới.


## SRC-034 implementation

SRC-034 adds CRM-owned note create/update/archive notifications in the note transaction and authorized reference/history/read ports. Note content is never copied into Chat activity. Verification status and limitations: [task evidence](../tracking/details/SRC-034.md).

## CRM base outcome scope — PLAN-010

CRM base trong [kế hoạch mới](../planning/crm-base-outcomes.md) là scope sản phẩm xuyên CRM/Sales/Ticket/Reporting; không chuyển ownership Lead/Deal/Ticket về generic CRM. System attribution fields là reserved/read-only và không được custom property shadow; generic PATCH/import không được bypass business command. Declared source là thuộc tính chọn/sửa có quyền tách khỏi system channel/Page/ad. Exact catalog/ACL/DTO thuộc PLAN-011; runtime baseline chưa thay đổi.

## External API private apps — SRC-088
[Exact contract and filled table design](../contracts/external-api.md): Identity owns external_app configuration, explicit object/property/team grants, token verifier/expiry and durable quota; target crm_identity, baseline monolith forward37. CRM/Sales own record reads through authorized application ports. No Human impersonation, record ownership change or cross-service SQL/FK. [Developer guide](../developer/README.md) and [evidence](../tracking/details/SRC-088.md).
