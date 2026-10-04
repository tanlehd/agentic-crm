# M1 UI context — SRC-013

Status: Ready for implementation. Bổ sung [workspaces](../ux/workspaces.md), [CRM core](crm-core.md).

GET `/crm/context` cần session+tenant active; trả principal_id, capabilities, grants (của caller), object list có read grant hoặc schema.read; chỉ id/key/label/kind/version. Có grant không thay scoped backend authorization. UI dùng seat+grant để ẩn action chắc chắn không có; backend kiểm record scope ở mỗi command.

GET `/objects/{key}/descriptor` cần read capability+object read grant hoặc schema.read. Trả standard fields (key,label,type,required,options,indexed,writable), custom properties field-redacted, và form default field order nếu đã cấu hình. Không trả default cho field denied read. writable dựa field write policy, không chứa record value. Read denied field bị bỏ khỏi descriptor hoàn toàn. Không cấp schema write theo descriptor. Form/view editor vẫn cần schema permissions. Đây là additive endpoint cho renderer, không thay metadata APIs.

UI: authenticated shell gồm tenant selector, CRM record list/detail và Admin. Tenant component keyed theo tenant, query cache riêng; unmount abort fetch, không giữ record/form từ tenant cũ. Contact/Company/Activity/custom renderer theo descriptor; Lead create/draft/qualify explicit forms, không tự ghi consent. Archive có reason trong form; conflict409 hiển thị stale banner và explicit reload. API mutations CSRF+idempotency, retry cùng payload/version giữ key; chỉ reset key sau success hoặc input đổi.

Admin: membership seat/roles/teams, role permission rows, team roster và AI policy summary; edit qua Identity APIs đã có. Object/property editor, form ordered field list, saved view columns/filter/sort. Association create với type/source/target và source version. Có loading/empty/403/422/409; không hiển thị values denied disabled. Standard read-only fields hiển thị tách khỏi inputs.

Dev fixture extension v3 M1: local-only operator command/idempotent marker; thêm role riêng m1_crm_admin/m1_crm_viewer vào fixture principals Alpha/Beta đã tồn tại, không sửa Identity role permissions hay người dùng ngoài fixture. Admin role grants metadata+CRM; viewer role chỉ read (seat vẫn chặn writes). Seed metadata Appointment/ServiceOffering, properties, association types, default forms/views; record samples tạo qua authenticated browser/API fixture riêng và luôn synthetic. Existing metadata giữ nguyên khi repeat; không reset volume. M1 browser test kiểm real OIDC cả tenants, permission negative và standard/custom CRUD+association+form/view.

M1 gate: current Node24 release images, migration cold/repeat+v6→v8 preserved data, local auth+browser CRUD, regression backend, stop/start giữ records, docs/evidence. Không đóng M2 intake/Chatflow, không production deployment.
