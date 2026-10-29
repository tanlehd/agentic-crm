# Object & Properties và Agent Workspace

SRC-080 supersedes the combined Forms/list tab with [Record detail page and Record preview page](record-pages.md), including Default and team views. Existing create-form/list-view configuration now lives under **Thiết lập → Biểu mẫu tạo & danh sách**; old storage/API remain compatible. Forward32 adds only tenant-scoped presentation metadata. The SRC-079 description below records the previous layout iteration.

2026-10-16 / SRC-079: [layout mới](../ux/object-properties-workspace.md) theo ảnh tham chiếu. Mở màn hình → chọn đối tượng ở đầu trang → Thiết lập. Các link dẫn tới Thuộc tính, Liên kết, Biểu mẫu & danh sách và Agent Workspace; Xem sơ đồ dữ liệu mở ERD. Menu Thuộc tính giữ object hiện tại. Bảng tìm theo nhãn/key, lọc nguồn/kiểu và có nút Tạo thuộc tính mở dialog. Tất cả dùng native catalog/API hiện có, không migration. Conversation episode nhập fields trong Inbox; các giới hạn SRC-078 được giữ. [Evidence SRC-079](../tracking/details/SRC-079.md).

2026-10-15 · SRC-073/074 bounded implementation. [Contract](../contracts/object-platform-r1.md) · [Evidence](../tracking/details/SRC-074.md) · [Full plan](../planning/no-code-object-platform.md).

Mở [Object & Properties local](http://localhost:18080/?screen=schema) bằng tài khoản có quyền schema. Chọn standard/custom object; Properties hiển thị field theo canonical metadata, Associations tạo loại liên kết, Forms & views cấu hình biểu mẫu và saved view, Agent Workspace lưu tên menu/thứ tự/thuộc tính hiển thị. Nút Xem ERD mở sơ đồ association có filter, focus, zoom và bảng quan hệ. ERD là association catalog, không phải mọi foreign reference của Sales/Chat/Ticket.

1. Tạo custom object với tên và API key bất biến.
2. Thêm field: string/text/integer/decimal/boolean/date/datetime/enum qua renderer M1. `status`, `name`, `id`, `owner` là key hệ thống reserved; ví dụ dùng `title`, `request_status`.
3. Tạo association với object nguồn/đích và cardinality. 1:N nghĩa một record đích có tối đa một nguồn trong loại association đó; N:N cho phép nhiều ở hai phía.
4. Lưu default form, chọn display property kiểu string/enum, bật Hiển thị trong Agent Workspace và lưu.
5. Mở menu object để tạo/sửa/lọc record và thêm liên kết. Agent cần quyền record và association; bật menu không cấp quyền. Agent có thể khám phá loại association được phép mà không cần quyền schema.

Alpha giữ fixture `nocode_service_request_demo`: menu Yêu cầu dịch vụ, field title/request_status, một request, Contact DEMO và một liên kết. Rerun tái sử dụng data. Local schema30 thêm một bảng cấu hình CRM; upgrade giữ nguyên95bảng cũ, backup private trong ignored artifacts. Không reset DB/Redis. API/worker được reload qua monitor sở hữu process. Không tự chạy script upgrade trên môi trường khác.

## Kiểm thử

Windows PowerShell, Node24.21.0; prepend `.local/node-v24.21.0-win-x64` vào PATH hoặc gọi executable trực tiếp. Build contracts/backend trước native test dùng dist. Không hiển thị nội dung `.env`/test fixture credentials.

```powershell
node node_modules/typescript/bin/tsc -p packages/contracts/tsconfig.json
node node_modules/typescript/bin/tsc -p services/core-baseline/tsconfig.json
node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit
node node_modules/vitest/vitest.mjs run --exclude '**/*.integration.test.ts'
node scripts/generate-object-platform-contracts.mjs --check
node scripts/check-schemas.mjs
node scripts/object-platform-native-test.mjs
node scripts/object-platform-browser.mjs
node scripts/check-docs.mjs
node scripts/lint.mjs
git diff --check
```

Native test dùng retained `native_identity_test`, `.local/native-auth-test.env` và `.local/reporting-native-fixture.json`; temporary rights khôi phục trong finally. Browser dùng native Alpha session và API thật trên localhost18080, không route mocks/cấp quyền; tạo dữ liệu DEMO nếu thiếu. Chạy tuần tự các tests sửa cùng fixture. Production Next build đặt `NEXT_BUILD_DIR=.next-object-platform-build`; giữ/restores original bytes của tsconfig/next-env để không ảnh hưởng dev server.

## Phần còn lại

Reporting hiện chưa có connected datasource cho object mới; Workflow có canonical catalog nhưng chưa có custom-object trigger/runtime. UI công bố rõ hai trạng thái này. PLAN-028B/SRC-075 và PLAN-028C/SRC-076 giữ dependency SRC-059 và distributed runtime gates. Không chuyển mock reports sang dữ liệu thật ngầm định.

Unlink, reverse-label editing và compatibility/index/backfill theo thao tác cụ thể còn PLAN-028E; không yêu cầu lifecycle deprecation/archive mặc định. Standard custom values chỉ hỗ trợ Contact/Company/Activity/Lead; Deal/Conversation/Ticket hiển thị giới hạn và từ chối write. Required/index/type changes giữ rejection guards M1. Saved view apply trong Records vẫn yêu cầu schema.read; mở cho ordinary agents cần read contract riêng. Related list hiện hiển thị endpoint IDs; chưa có enriched related-record navigation. Full OP-01…19/release/capacity chưa hoàn tất.
