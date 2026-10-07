# CRM database patterns — research notes

Reviewed2026-10-07 for PLAN-007. Nguồn chính thức được đọc qua web; không phải chứng nhận một CRM template sẵn có đáp ứng tenant/security của dự án. Branch develop/master bên dưới mutable, chỉ là reference tại ngày đọc; không import upstream source hoặc copy toàn schema/licensed implementation.

| Nguồn | Pattern quan sát | Áp dụng / không sao chép |
|---|---|---|
| [MySQL8.4 glossary](https://dev.mysql.com/doc/refman/8.4/en/glossary.html) | Schema là database trong MySQL | Catalog dùng database-per-service; không mô tả namespace lồng kiểu PostgreSQL |
| [Frappe CRM Contact](https://docs.frappe.io/crm/contact), [Deal](https://docs.frappe.io/crm/deal), [Organization](https://docs.frappe.io/crm/organization) | Tách người, tổ chức và opportunity; một Deal có nhiều Contact | Giữ Contact/Company canonical, relations rõ; không ép Contact thành một Lead duy nhất |
| [Frappe CRM Deal DocType source](https://raw.githubusercontent.com/frappe/crm/develop/crm/fcrm/doctype/crm_deal/crm_deal.json) | Metadata định nghĩa typed fields, links, child contacts/products, owner/status và lịch sử | Học cách mô tả field/relation; không copy denormalized fields hoặc Frappe DocType engine vào NestJS |
| [EspoCRM entityDefs](https://docs.espocrm.com/development/metadata/entity-defs/), [Contact entity source](https://raw.githubusercontent.com/espocrm/espocrm/master/application/Espo/Modules/Crm/Resources/metadata/entityDefs/Contact.json) | Entity metadata tách fields, links và indexes | Dictionary/table template phải ghi cả quan hệ và access patterns; không dùng rebuild/schema auto-sync của framework khác |
| [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) | Password dùng slow password hashing, ưu tiên Argon2id | Hash/salt/parameters, benchmark/pin library; không lưu password mã hóa có thể giải ngược |
| [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) | Session token/cookie/rotation/expiry là security boundary | Opaque token, cookie security, revocation và server authority; MySQL authority là lựa chọn riêng dự án |

## Chuẩn được chọn cho Agentic CRM

Không chọn một dump CRM tổng quát làm chuẩn áp dụng nguyên trạng. Chuẩn nội bộ là [schema catalog](../data/schema-catalog.md) + [DB guideline](../data/database-guidelines.md) + [table template](../templates/database-table.md), dựa trên service ownership hiện có và requirement người dùng.

Contact là người, Company là tổ chức; Lead là nhu cầu và Deal là cơ hội bán theo nghiệp vụ hiện có. Customer là trạng thái Contact sau Deal thắng. Pattern generic upstream không được thay những định nghĩa này. Standard fields typed, custom fields metadata/versioned typed projections. Các trang tham khảo không chứng minh sẵn shared-schema multi-tenancy hoặc distributed transaction isolation; tenant_id everywhere, same-tenant FK và database-per-service là quyết định của dự án, cần kiểm thử riêng.

Research chỉ đóng input cho design; không tạo source/schema mới, không nâng Draft Deal/Reporting/Ticket thành Ready implementation.
