# RPT-01…04 — Report Builder và Dashboard

PLAN-0272026-10-14: [New Dashboard/Reports screen and component specification](dashboard-workspace.md) refines the navigation/home/template/saved-report-widget/viewer/editor flows for user review. It supersedes the mixed builder/dashboard entry in the proposed redesign; no runtime code changes. Global parameter mapping/comparison/cross-filter/sharing below remain broader future scope, not part of this bounded redesign.

**2026-10-12 / CHG-20261012-06:** User accepted early API-backed UI. [PLAN-022H](../contracts/reporting-authoring.md) scopes source/model/fields/axes/flat filters/chart/pivot/private draft/CSV over delivered APIs. SRC-064 is the sole active source task; SRC-059 requeued READY, incomplete scope/evidence preserved. Full SRC-060 follows SRC-059 and SRC-064; no publish/dashboard/drilldown completion claim. No database changes.

PLAN-022A · CHG-20261010-01 · Codex · 2026-10-10 · v1. **Product UX specification; chưa mock/browser review, chưa Ready implementation.** [Module plan](../planning/report-builder.md), [semantic catalog](../data/reporting-semantic-model.md), [acceptance](../quality/report-builder-acceptance.md). Theo [screen template](../templates/ux-screen.md); dùng [app shell](app-shell.md) và [guidelines](guidelines.md).

## 1. Mục tiêu và phạm vi

Viewer xem report/dashboard được chia sẻ bằng quyền của mình; analyst có report.design dựng và lưu report; publisher publish template/dashboard; exporter phải có quyền export riêng. Owner Human/AI là dimension trong báo cáo; AI principal không tự được quyền thiết kế hoặc đọc dữ liệu.

Entry: business navigation **Reporting** → Reports, Dashboards, Templates, Data catalog. RPT-01 Report library, RPT-02 Builder, RPT-03 Dashboard, RPT-04 Catalog inspector. Exit sang record detail/Inbox chỉ khi drilldown có quyền. Không lặp user/tenant controls ngoài shell.

Các việc chính: khám phá nguồn/fields; chọn related objects; cấu hình KPI/time/filter/group/chart/pivot; kiểm tra số liệu và coverage; lưu/chia sẻ definition và kết hợp dashboard. Không có SQL editor, public sharing, provider credential setup hoặc scheduling ở phiên bản đầu.

## 2. Khung và anatomy

RPT-01 có title/search, Create report, tabs My/Shared/Templates/Archived; mỗi item có title, owner, version, source badge, last run/freshness và menu clone/archive. Counts/pagination server-side theo ACL; không search tên report của tenant khác.

RPT-02 desktop ≥1280px dùng 3 vùng, collapse được và không che preview:

```text
App shell
Reporting / Report name      Draft v3  [Validate] [Run preview] [Save] [Publish]
Source: Mock CRM+Marketing   Base: Acquisition session   [Manage related objects]
┌ Fields / metrics ───────┬ Configure ──────────────────┬ Preview ───────────────┐
│ Search, object, type   │ Chart type / Table / Pivot   │ Chart + Data tabs      │
│ Session / Lead / Deal  │ X: date/week                 │ Window / TZ / as_of    │
│ Campaign / Ad / Post   │ Y: sessions, converted rate  │ Grain / sample / lag   │
│ Eligible / unavailable│ Series: campaign             │ Warnings / Explain    │
│ field info + actions  │ Filters / Compare / Sort     │ Table & drilldown      │
└───────────────────────┴──────────────────────────────┴────────────────────────┘
```

Fields pane khoảng260px, config khoảng300px, preview co giãn tối thiểu400px; widths là UX target cần browser kiểm. Header và run actions sticky; panel scroll độc lập, không scroll ngang toàn page. Tablet chuyển fields sang drawer. Mobile <768px dùng bước Sources→Configure→Preview→Save; dashboard một cột; bảng/pivot có vùng scroll riêng với header labels. Zoom200% vẫn truy cập được actions; không ép thao tác drag bằng chuột.

RPT-03 toolbar có tên/version, filter chips, period/compare, refresh và Edit layout. Grid12 cột desktop, widget4/6/12 cột, mobile full width. Mỗi widget có title/metric definition, data badge/window/as_of/watermark và trạng thái riêng. Layout sửa ở draft rồi publish atomic dashboard version.

RPT-04 chỉ đọc source/model/field/relation metadata và coverage; admin có registration workflow sau implementation gate. Không hiển thị internal credentials hoặc raw SQL.

## 3. Dữ liệu và tương tác

API labels dưới đây là interface dự kiến của PLAN-022, không routes đang chạy.

| Component | Data / authority | Quyền / interaction / feedback |
|---|---|---|
| Source chooser | Reporting source/model catalog + adapter capabilities | Chỉ sources được phép; `Mock` luôn hiển thị ở header/result/export; connected unavailable giải thích coverage |
| Related objects | Allowed relation graph/cardinality/optional mode | Add bằng allowlisted path; preview population “all sessions / with matching Leads”; ambiguous path phải chọn role |
| Field browser | Stable field/metric IDs, type/unit/grain, owner/time/aggregation | Search theo label; info popover có formula/denominator/version/coverage; denied fields không lộ tên/giá trị |
| Encoding slots | Query dimensions/measures và visualization capability | Drag hoặc Add-to-X/Y/Series qua menu/keyboard; incompatible drop bị chặn và nêu lý do |
| Filter builder | Typed AST + relationship/metric scope | AND/OR groups; field operators từ type; phân biệt row/cohort filter và aggregate HAVING; invalid không run |
| Time controls | Activity/cohort, timezone, date window, as_of/horizon | Window `[from,to)`; label giúp hiểu outcome maturity; tiền theo account-day/currency rules |
| Preview/Explain | Authorized query rows/totals + metadata | Grain/join path/warnings/excluded coverage; sample/truncated không giả full total |
| Save/Publish | Definition versions, ETag, idempotent commands | Save draft; publish chỉ khi validate; CAS409 mở diff/reload/clone, không overwrite người khác |
| Chart click/Table row | Scoped drill token→fresh authorized records | Drill hierarchy hoặc record drawer; breadcrumb/Back giữ filters; forbidden không lộ ID/name |
| Dashboard filters | Parameter IDs→widget field mappings | Supported/unsupported indicators; refresh affected widgets, preserve unrelated filters; clear cross-filter |
| CSV | Report version/run snapshot và export authorization | Queue/progress/cancel; masked/denied fields không xuất; expired/revoked download báo rõ |

**Chart config:** vertical bar X dimension, Y measures; horizontal bar đổi vị trí display, không đổi semantics; series/group-by optional. Line/area ưu tiên time bucket. Combo có tối đa2 Y axes với unit labels, không dùng dual-axis để chia metric khác population. Scatter X/Y measures cùng grain, entity dimension xác định point, size optional compatible metric. Heatmap X/Y dimensions + một numeric metric. Donut có1 category +1 additive nonnegative measure, top-N/Other có totals semantics. Funnel dùng cohort stage membership, click stage mở đúng population.

**Pivot config:** Rows (ordered dimensions), Columns (ordered dimensions), Values (versioned metrics), subtotal/grand-total/show empty/sort. Drag reorder và Move up/down qua keyboard. Expansion giữ group keys, không chỉ labels. Grand total tính lại distinct/ratio/p95 từ fact set; rate subtotal không là trung bình cell rates. Nếu denied/unsupported/suppressed dùng dấu “—” kèm reason hợp lệ; zero chỉ với đủ coverage. Chỉ “show empty” khi domain/bucket và completeness đã biết.

**Report changes:** chart-only change không query lại facts nếu result còn phù hợp; metric/dimension/filter/source change invalidates preview. Request có sequence/cancel token; response cũ không overwrite preview mới. Run explicit sau config changes; nếu auto-preview được bật thì debounce và budget, không tạo background schedule. Unsaved-navigation guard; saved draft bền qua reload. Tenant switch xóa result/cache UI và không phục hồi draft sang tenant khác.

## 4. Flows và states

Happy path: Create blank → select mock source/model → base session → add ad/campaign and primary Lead/Deal paths → week/campaign dimensions + sessions/session-to-won metrics → preview → switch pivot/chart → save/publish → add widget → dashboard campaign/date filters → drilldown. Compare period chọn cùng horizon/currency/time basis hoặc bị chặn.

| State | Hiển thị và recovery |
|---|---|
| Initial loading / no selection | Skeleton; lời dẫn chọn model; không có demo KPI xuất hiện tự động |
| Empty source / empty filter | Phân biệt chưa có data và0 records sau filter; Clear filters hoặc source coverage details |
| Invalid relationship/grain/unit | Slot có lỗi, Explain path, giữ draft; cho chọn compatible metric/dimension |
| Missing Page/Post/Media mapping | Unknown bucket có coverage; không thay bằng0 hoặc latest guessed metadata |
| Offline / source unavailable / timeout | Giữ draft; retry có request key; không publish stale result thành fresh |
| Partial/stale source | Badge trên report/widget; derived ratio requiring complete inputs unavailable; không đổi null thành0 |
| 401/403/404 / denied field | Login/permission/not-found theo chuẩn; không trả metadata của report inaccessible |
| Pending run/export | Progress/state, cancel, không tạo duplicate job khi double click |
| Version conflict/field archived | Diff hoặc migration panel; pinned published report báo dependency unavailable, không silently bỏ field/filter |
| Dashboard partial error | Error widget riêng; widget thành công giữ snapshot labels; overall banner nếu snapshots lệch |
| Publish/save success | Version và saved time rõ; accessible live region; focus trả tới action hợp lý |

Archive definition là reversible với quyền; dashboard đang tham chiếu version được cảnh báo và giữ historical reference theo retention contract. Delete/purge destructive nằm ngoài UI v1. View-as-another-user không thuộc scope; dashboard không mặc định chạy as owner.

## 5. Mock thiết kế

Phiên lập plan chỉ có wireframe text phía trên, chưa HTML mock/screenshot/visual QA. Không ghi Ready UX hoàn chỉnh. PLAN-022 hoàn tất interactive design review với synthetic defaults, invalid-grain state, field-denied state, pivot overflow, mobile/zoom và version conflict trước SRC-060. Mọi mock fixture tách môi trường và không có transcript/customer data/remote avatars.

Các thao tác cần minh họa: chọn sources/related path, add metric to axis bằng keyboard, reorder pivot, switch chart, time/cohort explanation, save dirty draft, dashboard filter mapping/clear. Mock trình bày không thay browser tests của engine/API thật.

## 6. Acceptance

RB-01…RB-17 trong [matrix](../quality/report-builder-acceptance.md), cộng UX-G/UX-APP của bộ guidelines: keyboard hoàn thành flow không drag, focus visible, escape drawer, labels/contrast và thông tin không chỉ bằng màu, reflow320px và zoom200%, chart có accessible table fallback. Test tenant switch/late response/version conflict/data preservation và report không đủ quyền.

Mục tiêu usability: analyst tạo report session→won theo campaign mà không cần SQL, hiểu session denominator và data freshness từ UI. Chưa có user study hoặc time-to-complete measurement, không coi là đã đạt.

## 7. Delivery / log

PLAN-022A là design-only. SRC-057…062 và SRC-049 là delivery gates; exact API/DDL/producer contracts PLAN-022 còn TODO. Không migration/source/service nào được triển khai bởi spec này. Compatibility: giữ organic report hiện hữu, module mới qua feature flag; saved versions không tự đổi nghĩa khi source mở rộng. Evidence docs/checks ở [PLAN-022A](../tracking/details/PLAN-022A.md); runtime/browser/accessibility tests NOT_RUN.

## Field summaries extension — 2026-10-12

CHG-20261012-07: [bounded Ready contract](../contracts/reporting-measures.md) adds field/aggregation authoring and registered COUNT/AVG/MIN/MAX on existing numeric populations. Distinct, missing-data policy, formula dependencies and recomputed totals are explicit. Existing26 descriptors remain unchanged; no schema migration, freeform formula editor or new source grain.

## Common visualization extension — 2026-10-12

CHG-20261012-08: [Ready scoped contract](../contracts/reporting-visualizations.md) adds horizontal bar, stacked bar, area, pie/donut and descriptor-driven quick-start presets to SRC-064. Trend uses temporal line/area, composition requires additive measures and complete nonnegative partitions, exact table remains available. Existing definitions stay compatible; no database migration. Published reusable templates/dashboard/period comparison remain separate.
