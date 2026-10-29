# Object & Properties và Agent Workspace — PLAN-028

2026-10-16 / SRC-080: [Record detail / preview pages](record-pages.md) supersedes Forms & views tab with two independently persisted Default/team view libraries and builders. Legacy create form/list configuration remains accessible from Setup. [Exact contract](../contracts/record-pages.md).

## Layout SRC-079 — Ready 2026-10-16

CHG-20261016-02, theo ảnh tham chiếu người dùng. Phần này thay bố cục catalog/sidebar và tab mặc định bên dưới. CHG-20261029-01 chuyển điều hướng vào [Settings workspace](settings-workspace.md): Data Management gồm Objects, Fields, Custom Objects, Data Model Builder; không lồng thêm sidebar Cài đặt. Nội dung chính giữ nút Tạo đối tượng theo schema.create, khung chọn đối tượng native nhóm tiêu chuẩn/tùy chỉnh; Custom Objects chỉ liệt kê đối tượng tùy chỉnh. Dùng catalog được cấp quyền.

Tabs hiện tại (SRC-080): Thiết lập (mặc định), Thuộc tính, Liên kết, Record detail page, Record preview page, Agent Workspace. Biểu mẫu tạo & danh sách nằm trong Thiết lập. Link Xem sơ đồ dữ liệu mở ERD focus object hiện tại. Thiết lập gồm mô tả và các section với link tới các tab tương ứng; số field/relation là metadata, không phải record counts. API key/owner/schema nằm trong disclosure. Reporting/Workflow chưa kết nối chỉ hiển thị trạng thái.

Thuộc tính: tìm nhãn/API key, lọc nguồn tiêu chuẩn/tùy chỉnh và kiểu; count khớp/tổng, xóa bộ lọc và empty riêng. Bảng tên/key, kiểu, quy tắc, thao tác. Tạo field mở dialog dùng renderer hiện có; đổi nhãn giữ key/type. Quyền schema.update và extensions_supported giữ nguyên, episode Conversation theo SRC-078; form episode giải thích nhập trong Inbox.

Đổi object/tab/menu hoặc đóng dialog dirty phải xác nhận; cancel giữ input, save refresh đúng object,409 giữ draft. Tenant remount và cache hiện tại giữ nguyên. Mobile320/390: menu ngang, selector full width, tabs/bảng cuộn nội bộ. Tabs hỗ trợ Arrow/Home/End, focus visible và label đầy đủ. Empty/loading/error/retry tiếp tục theo native API.

API mapping: GET /crm/object-catalog; POST /object-types; POST/PATCH properties; descriptor/default forms/views; association-types; PUT workspace. Không sửa database/event/API/quyền, không migration. Acceptance SRC-079: overview/selector/menu, property filters/empty/create/rename, dirty cancel, ERD/form/workspace, keyboard/mobile và retained native regression. Các thao tác metadata mới/connected consumers giữ scope riêng.

2026-10-15 · Product specification cho [plan](../planning/no-code-object-platform.md); API extensions chưa implemented. UI Next.js dùng native session/tenant hiện có, theo app shell; không yêu cầu admin biết SQL/schema database.

## Luồng admin

**Settings → Object & Properties**: search, standard/custom filter, danh sách label/key/kind và trạng thái khả dụng; nút **Tạo object** và **Xem ERD**. Standard objects xuất hiện với capability thực tế, kể cả khi chỉ xem metadata. Không dùng cùng nhãn “active” cho schema và integration readiness.

Chọn object mở settings với các tabs:

| Tab | Nội dung và thao tác |
|---|---|
| Tổng quan | Name/plural/description/icon/display property; immutable API key hiển thị dưới phần kỹ thuật; count chỉ khi query được cấp quyền |
| Properties | Standard + custom fields, type/required/query capability; create wizard, label edit, field policy link và usage/dependency; core fields có lý do read-only |
| Associations | Target object, labels hai chiều, 1:1/1:N/N:N bằng ví dụ câu; list related type và domain relation read-only |
| Forms & views | Chọn/thứ tự fields, list columns, typed filters/sort và preview; thiếu required field trên create form bị chặn, field denied không hiện value |
| Agent Workspace | Bật/tắt placement, nhóm menu/thứ tự, default form/view; preview bằng quyền hiện tại, không giả danh role khác |
| Usage | Saved report/workflow/form/view references mà admin có quyền xem; impact blockers được redact nếu không có quyền consumer |

Create object wizard: tên → fields/display property → associations tùy chọn → preview. Create metadata rồi cấu hình workspace là hai bước rõ; request thành công phải refresh context ngay để object mới xuất hiện. Chỉ bật workspace sau form/view hợp lệ và record capability usable; report/workflow có trạng thái “Chưa sẵn sàng” kèm lý do adapter nếu chưa delivered. Không tạo permission grants khi bật menu.

Field wizard: label/key/type → options/required/default/queryable → preview ảnh hưởng → save. Tám types đúng backend; indexed text không selectable. Object có data không cho required field mới tới khi backfill contract Ready. Save conflict giữ form input, cho reload/diff; không silent overwrite metadata.

## ERD

Mở từ toàn catalog hoặc object hiện tại; lần đầu focus object + neighbors, có search/standard/custom filter, zoom/pan/fit, legend. Node hiển thị object name/type và fields được quyền nhìn; cạnh có labels hai chiều, 1/N và optionality đã xác định. Click node mở settings; click edge mở detail; **Tạo association** mở wizard kiểm tra backend. R1 không drag-to-create/schema edit trực tiếp trên canvas.

Relationship list dạng bảng song song hỗ trợ keyboard/screen reader/mobile. Canvas chỉ tải giới hạn theo catalog capability, overflow yêu cầu filter, không lặng lẽ cắt khiến người dùng tưởng ERD đầy đủ. Không record values/counts nhạy cảm trên node; không tiết lộ object/edge bị deny. Layout hiển thị không thay đổi schema.

## Agent Workspace

Object được expose nằm trong navigation **CRM → [Object label]**, sắp theo config và quyền read; menu cập nhật sau publish/reload. List có saved view, filter/sort theo index/capability, create button theo quyền. Detail gồm Properties, Related records và hoạt động được owner hỗ trợ; không dựng activity history giả. Create/edit dùng một descriptor renderer cho standard/custom, field errors đúng path, decimal/date input nhất quán.

Related list có Add existing, Create related nếu owner cho phép và Unlink sau backend gate. Lookup search chỉ trên records được phép đọc, cursor sau ACL, empty không tiết lộ hidden records. Create related có thể partial giữa services: hiển thị record đã tạo/link chưa xong và retry operation, không tạo lại record. Direct URL vẫn backend authorization; ẩn menu không archive data.

## Report Builder và Workflow

Report source picker hiển thị object, source mode connected/mock, coverage/as-of/readiness. Chọn related path có one/many, with/without/exists semantics và root grain nhìn thấy trước preview. Field picker cùng labels/types; measure chọn theo semantic capability. Saved report dùng Dashboard widget picker hiện có; không tạo dashboard editor khác.

Flow root picker dùng cùng object/fields/association. Start: create/update + changed fields + criteria + re-entry policy; canvas inspector hiển thị root/related scalar/collection. Decision có default branch, delay có timezone/due semantics; data mutation chọn command và field thực sự writable. Unsupported actions disable có lý do. Save draft khác Validate/Publish/Enable; debug preview không side effect và runtime inspector có error/fault/retry status đã sanitize.

## Trạng thái bắt buộc

Loading/skeleton, empty có next action, validation422, permission403/not-found404 theo contract, stale409, offline/retry, adapter unavailable, index building, stale catalog, metadata archived và partial result. Tenant switch abort pending requests, clear caches/forms; late responses không vào tenant/object mới. Dialog focus trap/return, keyboard labels, narrow layouts 320/390px và desktop; destructive metadata action luôn show dependency impact, không hard-delete dữ liệu từ settings.
