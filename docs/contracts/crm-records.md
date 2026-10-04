# CRM metadata và custom records — SRC-011

Status: Ready for implementation trong M1. Bổ sung [API](api.md), [CRM](../modules/crm.md), [dictionary](../data/dictionary.md).

## Wire contract

Property GET collection `/object-types/{key}/properties` cần schema.read; POST cần schema.update + schema.read, If-Match là object type version. PATCH property cần If-Match property version, chỉ `{label}`. Output property: id, key, label, type, required, default_value (null nếu không có), options (enum array hoặc null), indexed, sensitive, version. POST tăng object version/schema_version; PATCH label tăng property và object version/schema_version. Required property bị reject nếu object có bất kỳ record nào, gồm archived. Key không được trùng standard field hoặc registry envelope.

Types: string tối đa255, text4000, integer JSON safe integer, decimal string (tối đa14 chữ số phần nguyên +6 thập phân), boolean JSON boolean, date YYYY-MM-DD hợp lệ, datetime RFC3339 UTC dạng Z (millisecond precision), enum string trong options (1–100 unique strings, mỗi string1–255). indexed text không hợp lệ. required/indexed/sensitive phải là boolean. default_value phải khớp type, required không cho null; optional null nghĩa không có default. Enum options bắt buộc; type khác không có options.

Generic record input `{fields:{},custom_values:{...},team_id?}`; custom fields phải rỗng. PATCH merge custom_values, null xóa optional. Output `{id,tenant_id,object_key,version,owner_revision,owner_principal_id,team_id,archived,fields,custom_values}`. M1 generic create chỉ custom trước SRC-012. GET detail trả ETag. POST create cần create và read trên record mới để trả response. Update/archive cần read và action tương ứng. Replay kiểm lại record read và toàn bộ key đã có trong response theo field policy hiện hành; nếu bị deny trả403 thay vì lộ receipt cũ. Defaults cũng chịu write policy. Archive `{reason}` nonblank≤1000; audit chỉ tên field, không lưu reason tự do. Archive dependency guard do composition đăng ký, không query bảng module khác.

GET records nhận `limit,cursor,filter,sort`. filter là JSON array ≤10 predicate `{field,op,value}`, sort JSON `{field,direction:"asc"|"desc"}`. Fields custom dùng key trực tiếp, không traversal. Op eq/in/gte/lte; in1–50, value non-null đúng type. Chỉ indexed properties; không JSON scan. Sort một indexed field, NULL trước khi asc/sau khi desc, ID tie-breaker. Không sort thì created_at,id. Signed cursor bind account/tenant/object/filter/sort; pagination trên tập authorized, không hidden count. Query/saved-view filter/sort kiểm field filter policy (bao gồm deny read).

GET/PUT forms/{formKey}: `{fields:[property keys]}`; views/{viewKey}: `{columns:[keys],filter:[predicates],sort:object|null}`. Output input cùng id/key/version. Keys unique, tối đa100, phải có definition. GET schema.read; PUT schema.update+read. Create PUT không If-Match; update bắt buộc version, stale409; create kèm version trả409. GET metadata bỏ denied read fields; saved query chứa field nay bị deny trả403. Có form/view không cấp quyền record.

## Persistence và compatibility

Migration v7 additive tạo property_definition, custom_record, property_index_value, form_definition, view_definition. Giữ checksum v1–v6. Typed index đúng một value column theo type; null không có row; cập nhật JSON/index/registry/history/audit/receipt cùng UoW. String/enum so sánh binary để phân biệt case/accent. Bật index chỉ tại create; backfill/đổi type ngoài M1. Không custom workflow events. Metadata mutations serialize tenant lock với Identity/config/record writes.

## Acceptance

AC-04/M1+AC-13/M1: Appointment/ServiceOffering custom CRUD, typed filter/sort, invalid/unknown/required/immutable field, rollback projection failure, stale CAS, two tenants, own/team/viewer/field deny, replay quyền hiện hành, form/view references và signed cursor. Association kiểm tiếp bằng registry API; không engine lịch hẹn M4.
