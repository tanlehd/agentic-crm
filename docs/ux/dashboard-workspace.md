# DW / RPT — màn hình và component Dashboard / Reports

PLAN-027 · v1.0 · Codex · 2026-10-14. **Implemented SRC-072 local/native; [runtime evidence](../tracking/details/SRC-072.md).** [Feature scope](../planning/dashboard-workspace.md), [data](../data/dashboard-workspace.md), [contract](../contracts/dashboard-workspace.md), [acceptance](../quality/dashboard-workspace-acceptance.md). Theo [screen template](../templates/ux-screen.md), [shell](app-shell.md), [guidelines](guidelines.md).

## 1. Mục tiêu và navigation

Viewer mở một dashboard và hiểu report đang đo gì; designer tạo dashboard từ mẫu hoặc bố trí các report đã lưu. Header/account/tenant giữ app shell hiện có. Menu nhóm PHÂN TÍCH gồm **Dashboard** và **Reports**; mỗi mục là top-level destination ngang hàng, không đặt Dashboard trong Report Builder. Organic report hiện hữu vẫn ở entry cũ.

Routes đề xuất theo query routing hiện tại: `/?dashboards=1` home; `/?dashboards=1&dashboard=<UUID>` detail; `/?dashboards=1&create=1` gallery; `/?reporting=1` report library; `/?reporting=1&report=<UUID>` viewer; thêm `edit=1` khi edit. IDs chỉ điều hướng, không cấp quyền; không đưa filter/data/secret vào URL. Back/forward, reload và link trực tiếp phải khôi phục màn hình đã lưu. Dirty navigation guard áp dụng cả browser Back, selector, menu, template exit và logout.

## 2. Đối chiếu bốn ảnh người dùng gửi

| Ảnh | Pattern quan sát được | Áp dụng / điều chỉnh |
|---|---|---|
| 1 — Create dashboard | Search bên trái, Blank đầu trang, Suggested/All templates, card có thumbnail/name/report count | Gallery có source compatibility, preview/select reports và name step; không sao chép 21 templates chưa có nguồn |
| 2 — CRM Data Overview | Menu Dashboards riêng; dashboard title selector; actions; grid chart/KPI | Giữ header gọn và canvas là nội dung chính; bỏ Share/global filter giả khi chưa có contract |
| 3 — Contact Sources | Report viewer lớn, summary/chart/data, settings bên phải | Viewer trước, Edit mới cho thay config; controls theo chart capability thật; exact table luôn có |
| 4 — My reports | Thư viện report dạng bảng, search/filter, cột dashboard usage/owner/updated | Reports là menu riêng; counts/usage được ACL-filter, không làm giả view counts/favorites |

Ảnh là nguồn tham khảo bố cục do người dùng cung cấp, không xác nhận hành vi backend hoặc gói quyền HubSpot. Không dùng số liệu, tên người dùng hoặc labels metric trong ảnh như fixture CRM.

## 3. Anatomy và wireframes

### DW-01 — Dashboard home

```text
App shell | PHÂN TÍCH > Dashboard
Dashboard                                      [Tạo dashboard]
Theo dõi các báo cáo của bạn trong một không gian chung.
[Tìm dashboard............] [Owner: Tất cả] [Trạng thái: Hoạt động]
Tên                         Chủ sở hữu      Reports    Cập nhật       ...
Điều hành inbox · DEMO       Bạn             N          thời gian      Mở
Chuyển đổi quảng cáo · DEMO  Bạn             M          thời gian      Mở
[Tải thêm]
```

`N/M` chỉ vị trí minh họa, không phải contract số lượng; runtime lấy count từ API. Home là thư viện quản lý, không tự chọn dashboard đầu tiên hay tự chạy query. Tên mở detail. Row menu: đổi tên, duplicate, archive/restore nếu được phép. Các action dùng cùng command contract, không mutate bằng inline blur. Search theo tên trên server, debounce 300ms và cancel; owner `all|me`, archive `false|true`; sort fixed updated descending + ID. Không hiển thị tổng số toàn thư viện khi API chỉ trả một trang. Empty account khác empty filter; CTA rõ “Tạo dashboard” hoặc “Xóa bộ lọc”.

### DW-02/03 — Gallery và template preview

```text
[Thoát]                 Tạo dashboard
Search/category | [ + Dashboard trống                         ]
                | Mẫu đề xuất
                | [mini grid | Điều hành inbox | N reports    ]
                | [mini grid | Chất lượng quảng cáo | N reports]
                | Tất cả mẫu (theo search/category)

Chọn template → Preview
[Quay lại]  Điều hành inbox                      [Tiếp tục]
Mô tả + DEMO + các source/model cần có
[x] Report A     KPI preview schematic      [Xem cấu hình]
[x] Report B     Trend preview schematic
...
Tên dashboard [..................]  Mô tả [..................]
Nguồn cho slot inbox [binding được cấp quyền...]  Quyền: Riêng tư
[Tạo dashboard với N reports]
```

Thumbnail là sơ đồ chart/layout không số liệu; caption “Minh họa bố cục”. Preview query dữ liệu thật chỉ sau explicit action và quyền run; không cần chạy để đọc mẫu. Report selection 1..12; source auto-select chỉ khi duy nhất một compatible source và vẫn hiện cho người dùng. Không đủ quyền/source/field/model thì disable Create với lý do. Create chặn double submit, giữ command key khi retry. Kết quả thành công mở dashboard đã lưu và có link “N reports vừa tạo”; không báo thành công khi chỉ lưu được một phần.

### DW-04 — Dashboard detail

```text
[Về Dashboard]  [Điều hành inbox v]                 [Khám phá Reports]
Mô tả                Riêng tư · Chủ sở hữu · Đã lưu
[Làm mới]                       [Chỉnh bố cục] [+ Thêm report] [Actions]
DEMO · Mỗi widget hiển thị kỳ dữ liệu và thời điểm riêng
┌ KPI /6 cột ────────────────┐ ┌ Trend /6 cột ──────────────┐
│ Tên report        ...      │ │ Tên report          ...    │
│ Kỳ | snapshot | trạng thái │ │ Filter/kỳ/snapshot         │
│ value hoặc skeleton/error │ │ chart + xem bảng           │
└───────────────────────────┘ └────────────────────────────┘
┌ Table /12 cột ───────────────────────────────────────────┐
│ Tên report | filter chips | note | table accessible      │
└─────────────────────────────────────────────────────────┘
```

View và edit layout là hai mode. Edit hiển thị `[Hủy] [Lưu dashboard]`, resize/move/remove/title override; xem chart không biến thành source config. Lần đầu vào canvas tự load metadata, chưa chạy query cho đến Refresh; sau Add report có thể Run widget riêng. Overall refresh indicator N/M và partial state; không spinner che toàn canvas. Có toast success + persistent saved/version line, không tự lưu từng drag.

12 cột desktop >=1200px, gutter16px, card min-height240px; size small4/medium6/wide12, h theo grid rows 80px (min3, max10), y>=0. Table có inner scroll, không toàn-page scroll ngang. 768–1199px render hai cột hoặc full width theo preset, <768px một cột; thứ tự theo y,x,ID, không ghi layout desktop lại khi resize viewport. Card quá chật dùng legend wrap và exact table; không scale text chart xuống dưới12px. Header/actions wrap; overlay mobile full screen; zoom200% dùng cùng reflow.

### DW-05 — Add reports drawer

```text
Thêm report đã lưu                                      [Đóng]
[Tìm report......................] [Owner] [Model] [Chart]
□ Tên                    Model / chart        Updated / version
□ Thời gian phản hồi     inbox / table        v3 · Xem trước
□ Nguồn phiên            inbox / bar          v2 · Xem trước
Report không khả dụng: lý do an toàn, không lộ metadata bị deny
[Tải thêm]                  Đã chọn N/slots còn lại
[Hủy]                             [Thêm N report vào bản nháp]
```

Chỉ reports, không dashboards/templates, không archived. Checkbox multi-select ổn định qua paging; reset khi đổi tenant/quyền. Selected items không biến mất khi search, có clear selection; count chỉ những item được chọn/đọc, không tổng toàn hệ thống. Revalidation tại Add và Save phát hiện version mới/archived/revoked; không lấy latest khác version đã preview. Thêm thành công đóng drawer, focus widget đầu vừa thêm, dirty badge; chưa ghi DB tới Save dashboard. Có “Tạo report mới” ở empty/footer, chuyển builder riêng với draft-return context. Không dựng báo cáo trực tiếp trong drawer.

### RPT-05/06 — Report Library và viewer/editor

```text
Reports                                            [Tạo report]
[Tìm report...........] [Owner] [Model] [Chart] [Trạng thái]
Tên                   Model        Chart       Dashboards*   Cập nhật
Thời gian phản hồi     inbox        KPI         2             ...

Mở report → viewer
[Quay lại] Tên report        [Sửa report] [Thêm vào dashboard] [CSV]
Nguồn/kỳ/filter chips · report version · snapshot · DEMO
Summary (chỉ metrics đã chọn)
Chart canvas lớn
[Dữ liệu tổng hợp] [Thông tin chỉ số & nguồn]

Edit mode
[Hủy] Tên report                           [Preview] [Lưu] [Lưu bản sao]
[Dữ liệu | Cấu hình]   Preview chart (flex)    Settings (320–360px)
source/relations      Exact table dưới chart Chart type / measures
fields/typed filters                          X / series / pivot / time
```

`Dashboards*` là số **distinct dashboard active mà viewer được đọc**, không số widget. Không có quyền dashboard nào thì hiện0 hoặc “Không có dashboard trong phạm vi của bạn”; không ám chỉ chưa được dùng nơi khác. Usage list có pagination và quyền riêng. Không đưa raw/unsummarized records tab từ HubSpot vào UI khi chưa có drilldown contract. Editing gọi cùng semantic validator/metrics/visualization capability hiện có; chỉ mười chart supported, không fake gauge/combo. Không chạy query lại vì rename/title-only. CSV luôn recheck export/source quyền, không export bản kết quả stale sau đổi filter.

## 4. Component specification

Component props mô tả contract UI, không buộc tên file/class. Remote state đi qua controller/API adapter; component hiển thị không gọi DB và không import Reporting service implementation.

| ID / component | Inputs và local state | Events / trách nhiệm | States / accessibility |
|---|---|---|---|
| C01 AnalyticsNavigation | effective capabilities, active route | navigate Dashboard/Reports, dirty guard | aria-current, mobile menu/keyboard |
| C02 DashboardHome | paged DashboardSummary, query, cursor | search/filter/open/create/duplicate/archive/restore | loading/empty/filter-empty/error; real button/link |
| C03 DashboardSelector | current ID, ACL-filtered summaries | switch after dirty guard; load more | combobox keyboard; không render tên unauthorized |
| C04 TemplateGallery | template summaries, category/search | blank/select template | schematic thumb alt, unavailable reason, card button |
| C05 TemplatePreview | pinned templateVersion, recipes, slots, selected keys | select/preview/continue/create, retry same key | count, required fields, pending, source changed |
| C06 DashboardHeader | name, owner label, revision, dirty, actions | refresh/edit/add/save/cancel, open library | action visibility từ server capabilities |
| C07 DashboardCanvas | immutable saved layout + local draft | reorder/resize/size preset/drop/remove | no overlap; keyboard “Lên/Xuống/Kích thước”; mobile stack |
| C08 ReportWidget | reportRef, layout/title/note, resolved metadata, runtime state | run/retry/open report/update version/remove | skeleton/no-data/error/denied/stale; heading and exact table |
| C09 ExistingReportPicker | paged ReportSummary, selection map, remaining slots | filter/select/preview/add/create new | focus trap/Escape/return; no query editor |
| C10 ReportLibrary | summaries/filter/cursor/usage | create/open/edit/add-to-dashboard/archive | semantic table; narrow cards; scope-labelled counts |
| C11 ReportViewer | version definition, catalog, generation, result | preview/edit/export/back | large chart + accessible data, source unavailable |
| C12 ReportSettings | draft + supported visualizations/model/metric descriptors | typed patch config, invalidate result | field labels/errors; no incompatible option |
| C13 VersionUpgradePreview | old/new refs, config difference, sources | explicit accept or keep current | denied dependency clears preview; dirty only after accept |
| C14 QueryStateBoundary | document/authority epoch, widget IDs, concurrency=2 | cancel stale, clear on auth change, collect partial | live region concise N/M, no zero for failed widget |
| C15 SaveConflictPanel | local draft, server revision, original revision | reload/discard or save as copy | không ghi đè tự động; giữ draft khi network failure |

C08/C11 dùng chung chart renderer/formatting/table từ Report Builder; không có hai bộ định nghĩa metric. C07 chỉ thay layout; C12 chỉ thay report. C09 trả refs đã chọn, không sao chép report definition vào widget.

## 5. Data/actions/API/permission mapping

| User action | Data | Contract endpoint (đề xuất) | Permission / feedback |
|---|---|---|---|
| Mở home | DashboardSummary | GET dashboards | read/own hoặc all; trả allowedActions |
| Mở canvas | DashboardVersion + authorized widget summaries | GET dashboards/:id | current dashboard read; report metadata kiểm độc lập |
| Tạo template | templateVersion + recipe keys + sourceBindings | POST dashboards/from-template | design + source read/run validation; atomic ACK |
| Chọn report | ReportSummary → exact ReportVersion | GET reports; GET definitions/:id/versions/:version | report read + compatible source; errors không tiết lộ foreign ID |
| Lưu layout/widgets | Dashboard draft + revision | PATCH dashboards/:id | design + CSRF + If-Match + command ID |
| Refresh widget | dashboardVersion + widget ID | POST dashboards/:id/widgets/:widgetId/query | report + source read/run hiện tại; fail closed |
| Sửa report | ReportDefinition + revision | PATCH definitions/:id | quyền hiện có; tạo version mới |
| Archive/restore | archived flag | POST dashboards/:id/archive | owner design/all; receipt và current revision |

Chi tiết limits/filter/pagination/error trong [contract](../contracts/dashboard-workspace.md). Không sử dụng list Reports hiện có như thể API đã hỗ trợ search/kind/usage.

## 6. States và edge cases bắt buộc

| State | UI / recovery |
|---|---|
| Initial/loading | skeleton đúng layout; không demo number tự hiện |
| No dashboards / no reports | giải thích + Create; viewer không có design thì chỉ guidance |
| No match | giữ search/filter và Clear; không gọi là chưa có dữ liệu |
| Archived report | widget báo “Report đã lưu trữ”; không auto-replace, giữ layout; designer chọn report khác |
| Report unavailable/foreign | placeholder chung “Report không khả dụng”; không tên/owner/version/config bị deny |
| Empty query result | “Không có dữ liệu trong kỳ này”; chỉ hiển thị0 khi semantic result cho phép |
| Snapshot missing/stale | hiện kỳ/snapshot hiện tại và lý do; không tự dùng generation mới |
| Partial query failure | mỗi ô có Retry; overall N/M; các ô thành công giữ nhãn generation |
| 401/session hoặc auth revision change | cancel requests, clear tất cả sensitive results/metadata, login/reload permissions |
| Network/save timeout | giữ draft + retry cùng command; không tạo dashboard/report thứ hai |
| Concurrent edit | VERSION_CONFLICT; giữ draft, reload hoặc Save as copy; không last-write-wins |
| Template/source revision change | create fail atomic, giữ lựa chọn, yêu cầu reload compatibility/preview |
| Unsaved exit | guard chung; Cancel giữ draft/selection, không tạo hidden persisted artifacts |

Keyboard phải hoàn thành create→picker→layout→save không cần drag. Modal/drawer dùng Dialog chuẩn, trap focus, Escape (có dirty guard nếu cần), trả focus về trigger. Outline focus visible; chart luôn có table/caption; color không là tín hiệu duy nhất. Contrast theo token cũ vẫn phải đo trên UI thực, không tuyên bố WCAG đạt từ wireframe.

## 7. Mock và delivery

Wireframes trên là low-fidelity specification, không phải ảnh UI mới đã render. Chưa có interactive mock, screenshot mới, contrast/screen-reader/usability evidence. Browser implementation phải kiểm default/failure/mobile320px và zoom200% trước DONE theo [DW acceptance](../quality/dashboard-workspace-acceptance.md). User đã chọn review tài liệu trước code; source/CSS/layout hiện hữu giữ nguyên.
