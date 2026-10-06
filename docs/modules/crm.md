# MOD-02 — CRM & Object Platform

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

Object list, record detail, association cards, field editor, form field order và saved view. M1 form renderer tối thiểu theo type; required/error state lấy từ cùng metadata backend. Không hiển thị field bị deny dưới dạng disabled có giá trị.

## Failure handling

Sai type/enum/required trả 422 với field path; unknown key reject. Stale version 409. Query field chưa indexed trả FIELD_NOT_QUERYABLE. Index projection transaction lỗi thì rollback cả record, không trả success với search data lệch.

## Acceptance và dependency

[AC-03, AC-04, AC-13](../quality/acceptance.md); phụ thuộc Identity và Operations. Sales/Conversation/Ticket sử dụng registry service, không tự fork object metadata.

## Mở rộng còn Draft

Formula field, computed property, unique custom field, multiselect, relationship traversal query, schema migration UI, bulk import/merge và drag-and-drop page layout.

## SRC-010 implementation boundary

Registry metadata/association HTTP và internal record/subtype/ownership ports triển khai tại `apps/backend/src/modules/crm`; exact [registry contract](../contracts/registry.md). Migration v6 có persisted field_policy, loader dùng Identity role IDs port. Chưa có production subtype adapter, record CRUD/typed index/forms hoặc public assignment; không coi synthetic subtype trong test là Contact đã triển khai. History append-only ở DB grants, source version tăng khi tạo association; HTTP commands có atomic audit/receipt. Metadata/association chưa phát workflow event; domain creation events và assignment consumers nối cùng modules tương ứng.

## SRC-011…013 M1 boundary

Property/custom/index/form/view ở SRC-011, Contact/Company/Activity và Lead core qua Sales port ở SRC-012. SRC-013 nối CRM/Admin UI, descriptor/context API và dev fixture v3. [Exact record contract](../contracts/crm-records.md), [core](../contracts/crm-core.md), [UI](../contracts/crm-ui.md). Các ghi chú “chưa có subtype/CRUD” của SRC-010 phía trên chỉ mô tả mốc lịch sử đó. Generic Deal/Ticket/Conversation và public assignment vẫn chưa mở. Gate/evidence hiện hành ở tracker.

ADR-019 target: CRM owns canonical external identity→Contact mapping and atomic ResolveContact; receives Connector profile observations without calling provider APIs or overwriting Human fields. [Contract](../contracts/contact-resolution.md). Physical source remains unchanged.

## SRC-030 scoped implementation

ContactIdentities application port owns canonical mapping reads and atomic Contact+identity creation; service-scoped durable operation receipt preserves replay result. No migration required. See [compatibility contract](../contracts/contact-resolution-local.md).
