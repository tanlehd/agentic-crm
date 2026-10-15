# Dashboard và Reports — đặc tả để review

PLAN-027 · CHG-20261014-04 · Codex · 2026-10-14 · Version 1.0.

**Trạng thái hiện tại: đã được người dùng yêu cầu triển khai sau review.** PLAN-027A/SRC-071 hoàn tất executable input contract, schema4/backend; SRC-072 triển khai UI local/native theo [runbook](../development/dashboard-workspace.md) và [evidence](../tracking/details/SRC-072.md). Các mục so sánh source bên dưới mô tả baseline trước thay đổi. Phạm vi rộng hơn và coverage chưa chạy được ghi riêng trong acceptance.

## 1. Bộ tài liệu và thứ tự đọc

| Tài liệu | Quyết định chứa trong đó |
|---|---|
| Tài liệu này | Khái niệm, ranh giới tính năng, luồng nghiệp vụ và thứ tự thực hiện |
| [Màn hình và component](../ux/dashboard-workspace.md) | Dashboard home, template gallery, canvas, report picker, report library, report editor |
| [Data và table design](../data/dashboard-workspace.md) | Aggregate, quan hệ, version/snapshot, layout, templates và compatibility |
| [API và invariants](../contracts/dashboard-workspace.md) | Commands/queries, quyền, validation, atomic create, concurrency, lỗi |
| [Acceptance](../quality/dashboard-workspace-acceptance.md) | Traceability feature → component → data → kiểm thử |

Nguồn nền: [Reporting module](../modules/reporting.md), [owning service](../services/reporting.md), [semantic catalog](../data/reporting-semantic-model.md), [private report storage](../contracts/reporting-persistence.md), [builder hiện tại](../contracts/reporting-authoring.md), [dashboard demo](../contracts/inbox-demo-dashboards.md), [guidelines](../ux/guidelines.md). Bốn ảnh HubSpot do người dùng cung cấp là reference về bố cục và hành trình, không phải contract API/quyền/số liệu của CRM.

## 2. Vấn đề đã xác nhận từ source

| Hiện trạng | Hệ quả | Thiết kế thay thế |
|---|---|---|
| `workspace.tsx` chỉ có menu Report Builder cho cả hai loại nội dung | Không có điểm đến để xem và quản lý dashboard | Dashboard và Reports là hai menu ngang hàng trong nhóm PHÂN TÍCH |
| `reporting.tsx` mở thư viện bằng một details và trộn report/dashboard | Tên màn hình và thao tác không phản ánh đối tượng đang quản lý | Mỗi loại có home riêng; builder chỉ mở khi tạo/sửa report |
| Widget v1 nhúng toàn bộ report definition + generation | Không có report đã lưu độc lập để chọn, quản lý hoặc truy ngược | Widget mới bắt buộc tham chiếu `report_id + report_version`; giữ snapshot riêng |
| Thêm widget đưa người dùng về datasource/model/metric editor | Dashboard biến thành một report builder thứ hai | Add content mở thư viện reports; tạo report mới là luồng riêng |
| Hai dashboard demo là hai draft đặc biệt, chưa có template flow | Không có chọn mẫu → xem trước → chọn report → tạo dashboard | Gallery template, preview và cấu hình tạo với transaction có idempotency |
| Grid v1 suy độ rộng từ chart type | KPI/table bị trải rộng; không có layout rõ do người dùng chọn | Layout 12 cột có size presets, reorder/resize, mobile xếp theo thứ tự |

Source đối chiếu: [workspace](../../apps/web/app/crm/workspace.tsx), [builder](../../apps/web/app/crm/reporting.tsx), [dashboard v1](../../apps/web/app/crm/reporting-dashboard.tsx), [v1 document shape](../../apps/web/app/crm/reporting-dashboard-model.ts), [storage head/version](../../services/reporting/src/storage.ts). List API hiện tại chỉ có head metadata, chưa có kind filter/search/usage. Không thể hứa report picker đúng loại bằng cách lọc tên hoặc tải im lặng từng definition trên browser.

## 3. Khái niệm chuẩn

| Thành phần | Định nghĩa | Sở hữu / không sở hữu |
|---|---|---|
| Report | Một phân tích được lưu, có model/metrics/dimensions/filter/time và visualization; sửa tạo immutable edit version mới | Sở hữu câu hỏi phân tích và chart; không sở hữu vị trí trong dashboard |
| Report Builder | Công cụ tạo/sửa một Report | Data/config/preview/save; không tạo layout dashboard |
| Report Library | Danh sách report người hiện tại được đọc | Search/filter/open/add-to-dashboard; không chạy tất cả reports khi vào list |
| Dashboard | Bộ report được bố trí cho một mục đích theo dõi | Tên, mô tả, owner, phiên bản layout và các widget refs; không có query definition riêng |
| Dashboard Widget | Một lần đặt một report version lên dashboard | ID ổn định, title override, note, layout, generation pin; không sửa report nguồn |
| Dashboard Template | Blueprint bất biến để tạo dashboard mới và các report riêng của người tạo | Mô tả/category/preview/report recipes/layout/source requirements; không có kết quả hay ACL người tạo mẫu |
| Template Report Recipe | Một report definition có các source slots phải được bind, version/hash riêng trong template | Dùng cùng compiler/catalog với report thường; không là report giả đã lưu trong tenant |
| Snapshot generation | Bản dữ liệu immutable của một source binding | Khác report edit version và dashboard version; đổi report không tự đổi snapshot |

Saved report ở đợt này là **private saved draft có immutable edit versions**, không phải published report. Chọn được trong picker khi version đó được server kiểm tra tương thích và quyền hiện tại; storage label `unvalidated` của API cũ không được đổi thành `published`.

## 4. Feature scope đề xuất

| ID | Feature trong đợt redesign | Quy tắc chính |
|---|---|---|
| DW-F01 | Menu Dashboard riêng và dashboard home | Vào menu mở danh sách; mở một dashboard bằng ID; Reports có menu riêng |
| DW-F02 | Tạo dashboard trống | Tên bắt buộc, mô tả tùy chọn, private mặc định; thành công mở canvas rỗng |
| DW-F03 | Tạo từ template | Gallery/search/category → preview/select reports → source bindings → Create; dashboard và reports tạo atomically |
| DW-F04 | Dashboard viewer | Header tên, selector dashboard, Explore reports, Add report, Edit layout, Refresh; trạng thái độc lập từng widget |
| DW-F05 | Add existing reports | Search/filter/multi-select trong picker; server revalidate khi save; không có datasource editor trong picker |
| DW-F06 | Chỉnh layout | 12 cột, small/medium/wide, move/resize bằng pointer và keyboard; Save/Cancel ở cấp dashboard |
| DW-F07 | Report Library | Reports riêng, tên/model/chart/owner/update/usage; mở viewer rồi Edit report |
| DW-F08 | Report viewer/editor | Preview lớn, cấu hình bên phải, data/source riêng; saved report có Save/Save as copy và link trở về dashboard |
| DW-F09 | Version và lifecycle | Report sửa không tự thay widget; explicit Update version có preview; remove widget không xóa report; archive dashboard có restore |
| DW-F10 | Tương thích hai dashboard demo | Explicit convert, tạo report cho từng widget và dashboard mới, giữ nguyên legacy snapshot/notes/totals; không reseed inbox |

Scope đầu chỉ private ownership theo quyền hiện có. Sharing/team/public links, favorites, default dashboard theo user, schedule, email export, arbitrary text/image widget và publish template trong UI chưa nằm trong đợt này. Không hiển thị nút giả cho chúng. Sau này thêm theo contract riêng, không suy quyền chia sẻ từ việc đã đọc dashboard.

**Bộ lọc dashboard:** filter report đang áp dụng phải hiện trên widget/viewer. Global Date/Owner/advanced filters, period comparison và cross-filter nằm trong SRC-061 còn lại, vì cần field mapping/grain/time compatibility và permission rules riêng. Đợt này không cho chọn bộ lọc toàn dashboard rồi âm thầm bỏ qua widget không tương thích. Chỉ filter/search trên danh sách dashboard/reports thuộc scope này.

## 5. Luồng chính

1. Menu Dashboard → home → mở dashboard có quyền → manual Refresh → chọn widget để mở report viewer → Edit report → save version mới → trở lại dashboard, thấy cảnh báo có version mới → chọn Update version → preview → Save dashboard. Canvas vẫn dùng version cũ cho đến khi lưu.
2. Home → Create dashboard → Template gallery → chọn mẫu → xem các report/chart/nguồn cần có → chọn reports (ít nhất một) → đặt tên + bind source → Create → mở dashboard với tất cả report refs đã lưu. Không yêu cầu tạo dataset giả hoặc seed business data.
3. Home → Create dashboard → Blank → đặt tên → Create → Add report → chọn report đã tồn tại → Add selected vào local draft → bố trí → Save. Có thể thêm một report hai lần, mỗi widget có ID/layout/title độc lập.
4. Reports → Create report → chọn source/model → config/preview → Save → quay về thư viện; Add to dashboard mở chọn dashboard có design permission rồi đưa widget vào draft cần Save. Không tự thêm vào dashboard khác chỉ vì report vừa được sửa.

Khi chưa có report, picker có giải thích và link Create report; giữ draft dashboard trong workspace memory cùng tenant, quay lại đúng dashboard. Reload cảnh báo dirty, không hứa recovery sau crash. Đổi tenant phải hủy request, xóa data và draft cũ; không dùng localStorage cho nội dung CRM.

## 6. Template catalog ban đầu

Catalog là release artifact dạng declarative, version/hash bất biến, served bởi Reporting, không chứa tenant/principal/binding IDs cố định và không phải dữ liệu application table. Nếu sau này lưu system templates vào DB, phải có registered system tenant và table contract mới. UI không hardcode mock totals hoặc tự sinh template từ tên report.

| Template key | Tên | Recipes / nguồn |
|---|---|---|
| `inbox_operations_v1` | Điều hành inbox | Tái sử dụng đúng các query/chart/notes của dashboard điều hành SRC-070; requirements từ manifest `inbox_operations`, `inbox_activity`, `agent_workload` |
| `ad_inbox_quality_v1` | Chất lượng chuyển đổi quảng cáo | Tái sử dụng đúng dashboard chất lượng SRC-070; model `ad_inbox_quality`, giữ ngữ nghĩa accepted/queued, spend mô phỏng |

Số report trên card lấy từ manifest thực tế, không gõ tay theo ảnh HubSpot. Các mẫu Sales/Service/Marketing của HubSpot không trở thành mẫu hoạt động khi chưa có data/model/metrics tương ứng. Category chỉ hiện loại đã có manifest. Mẫu không đủ nguồn vẫn xem metadata nhưng CTA nêu lý do không tạo được. Hai mẫu đầu phải ghi rõ DEMO; source chính là binding hiện tại được cấp quyền, không tự kết nối live CRM/Meta.

## 7. Thực hiện sau review, tuần tự

| Gate / task đề xuất | Dependency | Deliverable / điểm dừng |
|---|---|---|
| PLAN-027 | SRC-070 DONE | Bộ đặc tả này để review; design-only |
| PLAN-027A | PLAN-027 + phản hồi review | Khóa OpenAPI/JSON Schema executable, migration/table contract, private signed operation shapes và template manifests; Ready trước source |
| SRC-071 | PLAN-027A; SRC-057/058/063/070 DONE | Reporting dashboard persistence/API/template atomic create/legacy conversion, negative và migration evidence |
| SRC-072 | SRC-071 DONE | Menu/home/gallery/canvas/report picker/library/editor, native browser evidence và preservation |

Đây là follow-up cho bounded dashboard experience, không đánh DONE SRC-059/060/061/062 hoặc broad PLAN-022. Sau SRC-072, SRC-061 vẫn còn global parameters, sharing, comparison/cross-filter và các gate cũ. SRC-064/SRC-051 giữ trạng thái trước phiên. Không claim source task trong phiên review tài liệu.

## 8. Điều cần review

Review tập trung vào: hai menu và entry page; template gallery → preview → create; widget chọn saved report; pin version/snapshot và explicit update; canvas 12 cột; quyền private của đợt đầu. Không có câu hỏi blocker nào ngăn việc hoàn thiện bộ tài liệu này. Code, DDL/migration thực thi, API mới và browser nghiệm thu đều NOT_RUN/NOT_IMPLEMENTED trong phiên PLAN-027.
